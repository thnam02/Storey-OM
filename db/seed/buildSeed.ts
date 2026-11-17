/**
 * Builds the database seed from the app's sample data (src/data), so the
 * database and the hard-coded prototype data never disagree.
 *
 * The prototype shows totals (42 open deals worth A$1.84M, A$428K owed) but
 * only lists the biggest records. Seeding only those would make the derived
 * figures wrong, so smaller "filler" records are generated (seeded, so the
 * output is identical every run) to make the totals come out the same.
 */
import { DEPARTMENTS, SAMPLE_DATA } from '../../src/data/sample';
import { SAMPLE_CUSTOMERS, SAMPLE_EMPLOYEES, SAMPLE_TASKS, SAMPLE_TODAY } from '../../src/data/sampleTeam';
import type { Employee, LinkedRecord } from '../../src/data/types';
import { shortName } from '../../src/data/workload';
import { addDays, parseDayMonth } from '../../src/lib/dates';
import { createRandom, pick, type Random } from '../../src/lib/seededRandom';
import { monthStart, splitTotal, stableUuid, sydneyTime } from './helpers';
import type { Row, TableRows } from './sql';

const TODAY = SAMPLE_TODAY;

/** Closed deals over the last 90 days: 9 won this month plus these, for a 31% win rate. */
export const EARLIER_WON = 18;
export const LOST_LAST_90_DAYS = 60;

const SUBURBS = ['Manly', 'Newtown', 'Cabramatta', 'Chatswood', 'Penrith', 'Surry Hills', 'Hoi An', 'Da Nang', 'Marrickville', 'Bankstown', 'Fitzroy', 'Fremantle', 'Hurstville', 'Ryde', 'Brunswick', 'Hobart'];
const KINDS = ['Pharmacy', 'Bakery', 'Grocers', 'Hardware', 'Café', 'Books', 'Florist', 'Deli', 'Pet Supplies', 'Liquor', 'Newsagency', 'Bike Shop'];
const DEAL_TITLES = ['POS terminals', 'Receipt printers', 'Barcode scanners', 'Label printers', 'Cash drawers', 'Thermal paper supply', 'POS software licences', 'Café POS bundle', 'Scanner upgrade', 'Self-checkout pilot'];
const STAGE: Record<string, 'lead' | 'qualified' | 'proposal' | 'negotiation'> = {
  Lead: 'lead', Qualified: 'qualified', Proposal: 'proposal', Negotiation: 'negotiation',
};
const ZONE_SLOTS: Record<string, number> = { A: 200, B: 300, C: 100 };
const PRODUCT_ZONE: Record<string, string> = {
  'SKU-1042': 'A', 'SKU-2210': 'B', 'SKU-3105': 'A', 'SKU-3302': 'A', 'SKU-4410': 'B', 'SKU-5120': 'B',
};

const date = (text: string) => {
  const iso = parseDayMonth(text, TODAY);
  if (!iso) throw new Error(`Cannot read the date "${text}"`);
  return iso;
};
const id = (kind: string, key: string) => stableUuid(kind, key);
const employeeId = (slug: string) => id('employee', slug);
const customerId = (name: string) => id('customer', name);

/** Sales staff by role, to own generated deals. */
function salesStaff() {
  const sales = SAMPLE_EMPLOYEES.filter((e) => e.departmentId === 'sales');
  return {
    byShortName: (s: string) => {
      const e = sales.find((x) => shortName(x.name) === s);
      if (!e) throw new Error(`No salesperson called ${s}`);
      return e;
    },
    sdrs: sales.filter((e) => e.role === 'Sales development rep'),
    accounts: sales.filter((e) => /account/i.test(e.role)),
  };
}

function customerPool(rand: Random): string[] {
  const names = new Set(SAMPLE_CUSTOMERS);
  while (names.size < SAMPLE_CUSTOMERS.length + 40) names.add(`${pick(rand, SUBURBS)} ${pick(rand, KINDS)}`);
  return [...names];
}

export interface Seed {
  tables: TableRows[];
  /** Ids of the named records, for tests. */
  ids: { employee: (slug: string) => string; task: (sampleId: string) => string };
}

export function buildSeed(): Seed {
  const rand = createRandom(4242);
  const staff = salesStaff();
  const customers = customerPool(rand);
  const S = SAMPLE_DATA;

  /* ---------- settings, departments, people ---------- */
  const appSettings: Row[] = [
    { key: 'dataset', value: 'sample' },
    { key: 'today', value: TODAY },
    { key: 'timezone', value: 'Australia/Sydney' },
    { key: 'currency', value: 'AUD' },
  ];
  const departments: Row[] = DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, color: d.color, building: d.building, level: d.level }));
  const employees: Row[] = SAMPLE_EMPLOYEES.map((e: Employee) => ({
    id: employeeId(e.id),
    slug: e.id,
    department_id: e.departmentId,
    name: e.name,
    role: e.role,
    presence: e.presence,
    activity: e.activity ?? null,
    is_manager: e.isManager,
  }));
  const customerRows: Row[] = customers.map((name) => ({ id: customerId(name), name }));

  /* ---------- deals ---------- */
  const deals: Row[] = [];
  const named = S.sales.deals;
  for (const d of named) {
    deals.push({
      id: id('deal', d.co),
      customer_id: customerId(d.co),
      title: d.what,
      stage: STAGE[d.stage]!,
      value: d.value,
      owner_id: employeeId(staff.byShortName(d.owner).id),
      close_date: date(d.close),
      closed_on: null,
    });
  }
  // Smaller open deals so each stage's count and value match the pipeline.
  const fillerCap = Math.min(...named.map((d) => d.value)) - 500;
  for (const stage of S.sales.stages) {
    const mine = named.filter((d) => d.stage === stage.name);
    const values = splitTotal(stage.value - mine.reduce((a, d) => a + d.value, 0), stage.count - mine.length, rand, { max: fillerCap });
    values.forEach((value, i) => {
      deals.push({
        id: id('deal', `open:${stage.name}:${i}`),
        customer_id: customerId(pick(rand, customers)),
        title: pick(rand, DEAL_TITLES),
        stage: STAGE[stage.name]!,
        value,
        owner_id: employeeId(pick(rand, stage.name === 'Lead' ? staff.sdrs : staff.accounts).id),
        close_date: addDays(TODAY, 7 + Math.floor(rand() * 64)),
        closed_on: null,
      });
    });
  }
  // Closed deals: won this month (matches "Won in November"), plus the
  // earlier wins and the losses that make up the 90-day win rate.
  const closed = (kind: string, stage: 'won' | 'lost', values: number[], from: string, days: number) =>
    values.forEach((value, i) =>
      deals.push({
        id: id('deal', `${kind}:${i}`),
        customer_id: customerId(pick(rand, customers)),
        title: pick(rand, DEAL_TITLES),
        stage,
        value,
        owner_id: employeeId(pick(rand, staff.accounts).id),
        close_date: null,
        closed_on: addDays(from, Math.floor(rand() * days)),
      }),
    );
  const monthFirst = monthStart(TODAY);
  const daysThisMonth = Number(TODAY.slice(8, 10));
  closed('won-this-month', 'won', splitTotal(S.sales.won.value, S.sales.won.count, rand, { max: 120000 }), monthFirst, daysThisMonth);
  const ninetyDaysAgo = addDays(TODAY, -89);
  const daysBeforeMonth = (Date.parse(monthFirst) - Date.parse(ninetyDaysAgo)) / 86400000;
  closed('won-earlier', 'won', splitTotal(620000, EARLIER_WON, rand, { max: 90000 }), ninetyDaysAgo, daysBeforeMonth);
  closed('lost', 'lost', splitTotal(1500000, LOST_LAST_90_DAYS, rand, { max: 90000 }), ninetyDaysAgo, 90);

  const dealOf = (customer: string) => {
    const d = named.find((x) => x.co === customer);
    return d ? id('deal', d.co) : null;
  };
  const salesActivities: Row[] = S.sales.today.map((a, i) => ({
    id: id('sales_activity', String(i)),
    kind: a.what,
    customer_id: customerId(a.co),
    deal_id: dealOf(a.co),
    owner_id: employeeId(staff.byShortName(a.who).id),
    starts_at: sydneyTime(TODAY, a.t),
  }));

  /* ---------- marketing ---------- */
  const campaigns: Row[] = S.marketing.campaigns.map((c) => ({
    id: id('campaign', c.name),
    name: c.name,
    channel: c.channel,
    status: c.status === 'Live' ? 'live' : 'ended',
    leads: c.leads,
    spend: c.leads * c.cpl,
  }));
  const marketingCalendar: Row[] = S.marketing.upcoming.map((u, i) => ({
    id: id('marketing_calendar', String(i)),
    happens_on: date(u.when),
    description: u.what,
  }));

  /* ---------- finance ---------- */
  const invoices: Row[] = S.finance.invoices.map((inv) => {
    const due = date(inv.due);
    return {
      id: id('invoice', inv.no),
      number: inv.no,
      customer_id: customerId(inv.co),
      amount: inv.amt,
      issued_on: addDays(due, -30),
      due_date: due,
      status: inv.status === 'Paid' ? 'paid' : 'open',
      paid_on: inv.status === 'Paid' ? due : null,
    };
  });
  // Smaller invoices, none overdue, so receivables add up to what is owed.
  const listed = S.finance.invoices.filter((i) => i.status !== 'Paid');
  const listedTotal = listed.reduce((a, i) => a + i.amt, 0);
  const smallest = Math.min(...listed.map((i) => i.amt));
  const used = new Set(S.finance.invoices.map((i) => i.no));
  let nextNumber = 2030;
  const nextInvoiceNumber = () => {
    while (used.has(`INV-${nextNumber}`)) nextNumber++;
    used.add(`INV-${nextNumber}`);
    return `INV-${nextNumber}`;
  };
  splitTotal(S.finance.receivables - listedTotal, 30, rand, { max: smallest - 400, step: 100 }).forEach((amount) => {
    const due = addDays(TODAY, 1 + Math.floor(rand() * 33));
    const number = nextInvoiceNumber();
    invoices.push({
      id: id('invoice', number),
      number,
      customer_id: customerId(pick(rand, customers)),
      amount,
      issued_on: addDays(due, -30),
      due_date: due,
      status: 'open',
      paid_on: null,
    });
  });

  /* ---------- warehouse, shipments and bills ---------- */
  const zones: Row[] = S.warehouse.zones.map((z) => {
    const slots = ZONE_SLOTS[z.name] ?? 100;
    return { code: z.name, label: z.label, slots, slots_used: Math.round((slots * z.fill) / 100) };
  });
  const products: Row[] = S.warehouse.stock.map((p) => ({
    id: id('product', p.sku),
    sku: p.sku,
    name: p.name,
    on_hand: p.onHand,
    reorder_at: p.reorder,
    zone_code: PRODUCT_ZONE[p.sku] ?? null,
  }));
  const STATUS: Record<string, string> = { Booked: 'booked', 'In transit': 'in_transit', 'At customs': 'at_customs', Delivered: 'delivered' };
  const shipments: Row[] = S.importExport.shipments.map((s) => {
    const [origin, destination] = s.route.split(' → ');
    return {
      id: id('shipment', s.id),
      code: s.id,
      direction: s.dir === 'Import' ? 'import' : 'export',
      origin: origin!,
      destination: destination!,
      mode: s.mode.toLowerCase(),
      load_description: s.load,
      goods: s.goods,
      eta: date(s.eta),
      status: STATUS[s.status]!,
    };
  });
  const shipmentItems: Row[] = S.importExport.shipments.flatMap((s) =>
    s.skus.map((sku) => ({ shipment_id: id('shipment', s.id), product_id: id('product', sku), quantity: null })),
  );
  const paperwork: Row[] = S.importExport.paperwork.map((p, i) => ({
    id: id('paperwork', String(i)),
    shipment_id: id('shipment', p.id),
    description: p.what,
    done_at: null,
  }));
  const bills: Row[] = S.finance.bills.map((b, i) => {
    const ship = /\b(IMP|EXP)-\d+\b/.exec(b.what)?.[0];
    return {
      id: id('bill', String(i)),
      description: b.what,
      reference: /\(([A-Z]+-\d+)\)/.exec(b.what)?.[1] ?? null,
      shipment_id: ship ? id('shipment', ship) : null,
      amount: b.amt,
      due_date: date(b.due),
      status: 'open',
      paid_on: null,
    };
  });

  /* ---------- orders and stock movements ---------- */
  const texts = [...SAMPLE_TASKS.map((t) => t.title), ...S.warehouse.moves.map((m) => m.what)];
  const orderNumbers = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/SO-\d+/g)) orderNumbers.add(m[0]);
  const orderCustomer = (no: string) => {
    for (const t of texts) {
      const m = new RegExp(`${no} for (.+)$`).exec(t);
      if (m) return m[1]!;
    }
    return customers[Number.parseInt(stableUuid('order', no).slice(0, 8), 16) % SAMPLE_CUSTOMERS.length]!;
  };
  const pickedOrders = new Set(S.warehouse.moves.flatMap((m) => (/^Picked order (SO-\d+)/.exec(m.what)?.slice(1) ?? [])));
  const salesOrders: Row[] = [...orderNumbers].sort().map((no) => ({
    id: id('order', no),
    number: no,
    customer_id: customerId(orderCustomer(no)),
    status: pickedOrders.has(no) ? 'picked' : 'open',
  }));
  const movements: Row[] = S.warehouse.moves.map((m, i) => {
    const kind = /^Received/.test(m.what) ? 'receive' : /^Picked/.test(m.what) ? 'pick' : /^Truck left/.test(m.what) ? 'dispatch' : 'move';
    const sku = /SKU-\d+/.exec(m.what)?.[0];
    const zone = /Zone ([A-Z])/.exec(m.what)?.[1] ?? null;
    return {
      id: id('movement', String(i)),
      kind,
      product_id: sku ? id('product', sku) : kind === 'move' && /scanner/.test(m.what) ? id('product', 'SKU-3105') : null,
      quantity: kind === 'move' ? Number(/Moved (\d+)/.exec(m.what)?.[1] ?? 0) || null : null,
      from_zone: null,
      to_zone: kind === 'receive' || kind === 'move' ? zone : null,
      reference: /SO-\d+/.exec(m.what)?.[0] ?? /for (.+?)(,|$)/.exec(m.what)?.[1] ?? null,
      description: m.what,
      happened_at: sydneyTime(TODAY, m.t),
    };
  });

  /* ---------- management ---------- */
  const managerOf = (dept: string) => SAMPLE_EMPLOYEES.find((e) => e.departmentId === dept && e.isManager)!;
  const approvals: Row[] = S.management.approvals.map((a, i) => ({
    id: id('approval', a.id),
    title: a.what,
    amount: a.amt,
    requested_by_department: a.from,
    requested_by: employeeId(managerOf(a.from).id),
    state: a.state,
    decided_by: null,
    decided_at: null,
    created_at: sydneyTime(addDays(TODAY, i - 3), '09:00'),
  }));
  const quarter = `${TODAY.slice(0, 4)}-Q${Math.floor((Number(TODAY.slice(5, 7)) - 1) / 3) + 1}`;
  const goals: Row[] = [
    { id: id('goal', 'revenue'), period: quarter, name: 'Q4 revenue', metric: 'revenue', target_amount: S.management.q4Target * 1000, progress_pct: null, sort: 0 },
    ...S.management.goals.map((g, i) => ({ id: id('goal', g.name), period: quarter, name: g.name, metric: null, target_amount: null, progress_pct: g.pct, sort: i + 1 })),
  ];
  const figure = (key: string, period: string, value: number): Row => ({ key, period, value, source: 'sample' });
  const months = S.finance.revenue.length;
  const figures: Row[] = [
    figure('cash_balance', TODAY, S.finance.cash),
    ...S.finance.revenue.map((v, i) => figure('revenue', monthStart(TODAY, i - (months - 1)), v * 1000)),
    figure('gross_margin_pct', `${TODAY.slice(0, 4)}-01-01`, S.management.margin),
    figure('marketing_budget', monthFirst, S.marketing.budget),
    figure('lead_conversion_pct', TODAY, S.marketing.conversion),
    figure('inbound_trucks', TODAY, S.warehouse.inboundTrucks),
    figure('outbound_orders', TODAY, S.warehouse.outboundOrders),
  ];

  /* ---------- tasks, linked to the records above ---------- */
  const resolveLink = (l: LinkedRecord): string => {
    switch (l.type) {
      case 'deal': {
        const d = named.find((x) => x.co.toLowerCase().replace(/[^a-z0-9]+/g, '-').startsWith(l.id));
        if (d) return id('deal', d.co);
        break;
      }
      case 'campaign': {
        const c = S.marketing.campaigns.find((x) => x.name.startsWith(l.label));
        if (c) return id('campaign', c.name);
        break;
      }
      case 'approval':
        if (S.management.approvals.some((a) => a.id === l.id)) return id('approval', l.id);
        break;
      case 'invoice':
        if (invoices.some((r) => r.number === l.id)) return id('invoice', l.id);
        break;
      case 'bill': {
        const b = bills.find((r) => r.reference === l.id);
        if (b) return b.id as string;
        break;
      }
      case 'shipment':
        if (shipments.some((r) => r.code === l.id)) return id('shipment', l.id);
        break;
      case 'product':
        if (products.some((r) => r.sku === l.id)) return id('product', l.id);
        break;
      case 'order':
        if (orderNumbers.has(l.id)) return id('order', l.id);
        break;
    }
    throw new Error(`Task link "${l.label}" (${l.type}) matches no seeded record`);
  };
  const tasks: Row[] = SAMPLE_TASKS.map((t) => ({
    id: id('task', t.id),
    title: t.title,
    status: t.status,
    due_date: t.dueDate,
    done_at: t.doneAt ? sydneyTime(t.doneAt, '17:00') : null,
    assignee_id: employeeId(t.assigneeId),
    created_by: t.createdById ? employeeId(t.createdById) : null,
    delegated_from_id: t.delegatedFromId ? employeeId(t.delegatedFromId) : null,
    linked_type: t.linked?.type ?? null,
    linked_id: t.linked ? resolveLink(t.linked) : null,
  }));

  return {
    tables: [
      { table: 'app_settings', rows: appSettings },
      { table: 'departments', rows: departments },
      { table: 'employees', rows: employees },
      { table: 'customers', rows: customerRows },
      { table: 'deals', rows: deals },
      { table: 'sales_activities', rows: salesActivities },
      { table: 'campaigns', rows: campaigns },
      { table: 'marketing_calendar', rows: marketingCalendar },
      { table: 'invoices', rows: invoices },
      { table: 'warehouse_zones', rows: zones },
      { table: 'products', rows: products },
      { table: 'shipments', rows: shipments },
      { table: 'shipment_items', rows: shipmentItems },
      { table: 'shipment_paperwork', rows: paperwork },
      { table: 'bills', rows: bills },
      { table: 'sales_orders', rows: salesOrders },
      { table: 'stock_movements', rows: movements },
      { table: 'approvals', rows: approvals },
      { table: 'goals', rows: goals },
      { table: 'company_figures', rows: figures },
      { table: 'tasks', rows: tasks },
    ],
    ids: { employee: employeeId, task: (sampleId) => id('task', sampleId) },
  };
}

export const SEED_HEADER = `-- SAMPLE DATA for Storey. Made-up company copied from prototype/index.html.
-- Generated by \`npm run db:seed\` from src/data and db/seed/buildSeed.ts; do not edit by hand.
-- Supabase loads it on \`supabase db reset\`. Remove it before connecting real data.
`;
