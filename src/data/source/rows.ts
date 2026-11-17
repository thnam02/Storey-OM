/**
 * Turns rows from the database into the snapshot the app shows. Pure, so it
 * runs the same on rows from Supabase and from PGlite in tests.
 */
import { addDays, formatDay, weekday } from '../../lib/dates';
import { wallTime, zonedParts } from '../../lib/zonedTime';
import type { ActivityAction, ActivityEntry } from '../activity';
import type {
  Approval, ApprovalState, Campaign, CompanyData, DepartmentId, Employee, LinkedType, Presence, Shipment, ShipmentStatus, Task, TaskStatus,
} from '../types';
import { shortName } from '../workload';
import type { Snapshot } from './types';

type Num = number | string;
type Day = string;

export interface DbRows {
  app_settings: { key: string; value: string }[];
  employees: { id: string; slug: string; department_id: DepartmentId; name: string; role: string; presence: Presence; activity: string | null; is_manager: boolean }[];
  task_list: {
    id: string; title: string; status: TaskStatus; due_date: Day; done_at: string | null;
    assignee_slug: string; created_by_slug: string | null; delegated_from_slug: string | null;
    linked_type: LinkedType | null; linked_id: string | null; linked_label: string | null;
  }[];
  deal_list: { stage: string; value: Num; close_date: Day | null; closed_on: Day | null; title: string; customer_name: string; owner_name: string | null }[];
  sales_activity_list: { kind: string; starts_at: string; customer_name: string; owner_name: string | null }[];
  campaigns: { name: string; channel: string; status: 'planned' | 'live' | 'ended'; leads: number; spend: Num }[];
  marketing_calendar: { happens_on: Day; description: string }[];
  company_figures: { key: string; period: Day; value: Num }[];
  open_invoices: { number: string; customer_name: string; amount: Num; due_date: Day; is_overdue: boolean }[];
  bills: { description: string; amount: Num; due_date: Day; status: 'open' | 'paid' }[];
  approvals: { id: string; title: string; amount: Num | null; requested_by_department: DepartmentId; state: ApprovalState }[];
  goals: { period: string; name: string; metric: string | null; target_amount: Num | null; progress_pct: number | null; sort: number }[];
  shipment_list: { code: string; direction: 'import' | 'export'; origin: string; destination: string; mode: 'sea' | 'air' | 'road'; load_description: string; goods: string; eta: Day; status: string; skus: string[] }[];
  paperwork_list: { shipment_code: string; description: string; done_at: string | null }[];
  warehouse_zones: { code: string; label: string; slots: number; slots_used: number }[];
  products: { sku: string; name: string; on_hand: number; reorder_at: number }[];
  stock_movements: { description: string; happened_at: string }[];
  activity_feed: {
    id: Num; created_at: string; action: ActivityAction; entity_type: 'task' | 'approval'; entity_id: string; actor_slug: string | null;
    title: string | null; assignee_slug: string | null; from_slug: string | null; to_slug: string | null;
  }[];
}

/** How each relation is read: [column, ascending] ordering and an optional row limit. */
export const RELATIONS: { [K in keyof DbRows]: { order?: [string, boolean][]; limit?: number } } = {
  app_settings: {},
  employees: { order: [['list_order', true], ['name', true]] },
  task_list: { order: [['created_at', true], ['title', true]] },
  deal_list: {},
  sales_activity_list: { order: [['starts_at', true]] },
  campaigns: {},
  marketing_calendar: { order: [['happens_on', true]] },
  company_figures: {},
  open_invoices: {},
  bills: { order: [['due_date', true]] },
  approvals: { order: [['created_at', true]] },
  goals: { order: [['sort', true]] },
  shipment_list: {},
  paperwork_list: {},
  warehouse_zones: { order: [['code', true]] },
  products: { order: [['sku', true]] },
  stock_movements: { order: [['happened_at', false]], limit: 20 },
  activity_feed: { order: [['id', false]], limit: 100 },
};

const OPEN_STAGES = ['lead', 'qualified', 'proposal', 'negotiation'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHIPMENT_STATUS: Record<string, ShipmentStatus> = { booked: 'Booked', in_transit: 'In transit', at_customs: 'At customs', delivered: 'Delivered' };
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const n = (v: Num | null | undefined) => (v === null || v === undefined ? 0 : Number(v));
const sumOf = <T,>(items: readonly T[], f: (x: T) => number) => items.reduce((a, x) => a + f(x), 0);
const dayOf = (v: string) => v.slice(0, 10);

export function toSnapshot(rows: DbRows): Snapshot {
  const setting = (key: string) => rows.app_settings.find((s) => s.key === key)?.value ?? null;
  const timezone = setting('timezone') ?? 'Australia/Sydney';
  const today = setting('today') ?? zonedParts(new Date(), timezone).date;
  const weekStart = addDays(today, -((weekday(today) + 6) % 7));
  const monthStart = `${today.slice(0, 8)}01`;
  const local = (moment: string) => zonedParts(moment, timezone);

  /* ---------- people and tasks ---------- */
  const employees: Employee[] = rows.employees.map((e) => ({
    id: e.slug,
    departmentId: e.department_id,
    name: e.name,
    role: e.role,
    presence: e.presence,
    isManager: e.is_manager,
    ...(e.activity === 'forklift' ? { activity: 'forklift' as const } : {}),
  }));
  const tasks: Task[] = rows.task_list.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: dayOf(t.due_date),
    doneAt: t.done_at ? local(t.done_at).date : null,
    assigneeId: t.assignee_slug,
    createdById: t.created_by_slug,
    delegatedFromId: t.delegated_from_slug,
    linked: t.linked_type && t.linked_id ? { type: t.linked_type, id: t.linked_id, label: t.linked_label ?? capitalise(t.linked_type) } : null,
  }));

  /* ---------- figures from other systems ---------- */
  const figures = (key: string) => rows.company_figures.filter((f) => f.key === key).map((f) => ({ period: dayOf(f.period), value: n(f.value) }));
  const latest = (key: string, upTo = today) =>
    figures(key).filter((f) => f.period <= upTo).sort((a, b) => b.period.localeCompare(a.period))[0]?.value ?? 0;
  const onDay = (key: string, day = today) => figures(key).find((f) => f.period === day)?.value ?? 0;

  /* ---------- sales ---------- */
  const deals = rows.deal_list.map((d) => ({ ...d, value: n(d.value) }));
  const open = deals.filter((d) => OPEN_STAGES.includes(d.stage));
  const wonThisMonth = deals.filter((d) => d.stage === 'won' && d.closed_on && dayOf(d.closed_on) >= monthStart && dayOf(d.closed_on) <= today);
  const ninetyDays = addDays(today, -90);
  const closedRecently = deals.filter((d) => (d.stage === 'won' || d.stage === 'lost') && d.closed_on && dayOf(d.closed_on) > ninetyDays && dayOf(d.closed_on) <= today);
  const wonRecently = closedRecently.filter((d) => d.stage === 'won').length;

  /* ---------- finance ---------- */
  const revenue = figures('revenue')
    .filter((f) => f.period <= today)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-12);
  const invoices = rows.open_invoices
    .map((i) => ({ ...i, amount: n(i.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  /* ---------- management ---------- */
  const quarter = `${today.slice(0, 4)}-Q${Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1}`;
  const goals = rows.goals.filter((g) => g.period === quarter);
  const approvals: Approval[] = rows.approvals.map((a) => ({
    id: a.id,
    what: a.title,
    amt: a.amount === null ? null : n(a.amount),
    from: a.requested_by_department,
    state: a.state,
  }));

  /* ---------- import, export, warehouse ---------- */
  const shipments: Shipment[] = [...rows.shipment_list]
    .sort((a, b) => Number(a.status === 'delivered') - Number(b.status === 'delivered') || a.eta.localeCompare(b.eta))
    .map((s) => ({
      id: s.code,
      dir: s.direction === 'import' ? 'Import' : 'Export',
      route: `${s.origin} → ${s.destination}`,
      mode: capitalise(s.mode) as Shipment['mode'],
      load: s.load_description,
      eta: formatDay(dayOf(s.eta)),
      status: SHIPMENT_STATUS[s.status] ?? 'Booked',
      goods: s.goods,
      skus: s.skus ?? [],
    }));
  const campaigns: Campaign[] = [...rows.campaigns]
    .sort((a, b) => Number(a.status !== 'live') - Number(b.status !== 'live') || b.leads - a.leads)
    .map((c) => ({
      name: c.name,
      channel: c.channel,
      leads: c.leads,
      cpl: c.leads ? Math.round(n(c.spend) / c.leads) : 0,
      status: c.status === 'live' ? 'Live' : c.status === 'planned' ? 'Planned' : 'Ended',
    }));

  const company: CompanyData = {
    sales: {
      stages: OPEN_STAGES.map((stage) => {
        const inStage = open.filter((d) => d.stage === stage);
        return { name: capitalise(stage), count: inStage.length, value: sumOf(inStage, (d) => d.value) };
      }),
      won: { count: wonThisMonth.length, value: sumOf(wonThisMonth, (d) => d.value) },
      winRate: closedRecently.length ? Math.round((wonRecently / closedRecently.length) * 100) : 0,
      deals: [...open]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((d) => ({
          co: d.customer_name,
          what: d.title,
          value: d.value,
          stage: capitalise(d.stage),
          owner: d.owner_name ? shortName(d.owner_name) : 'Unassigned',
          close: d.close_date ? formatDay(dayOf(d.close_date)) : '',
        })),
      today: rows.sales_activity_list
        .filter((a) => local(a.starts_at).date === today)
        .map((a) => ({ t: local(a.starts_at).time, what: a.kind, co: a.customer_name, who: a.owner_name ? shortName(a.owner_name) : '' })),
    },
    marketing: {
      budget: onDay('marketing_budget', monthStart),
      campaigns,
      conversion: latest('lead_conversion_pct'),
      upcoming: rows.marketing_calendar
        .filter((u) => dayOf(u.happens_on) >= today)
        .map((u) => ({ when: formatDay(dayOf(u.happens_on)), what: u.description })),
    },
    finance: {
      cash: latest('cash_balance'),
      receivables: sumOf(rows.open_invoices, (i) => n(i.amount)),
      months: revenue.map((r) => MONTHS[Number(r.period.slice(5, 7)) - 1]!),
      revenue: revenue.map((r) => Math.round(r.value / 1000)),
      invoices: invoices.map((i) => ({ no: i.number, co: i.customer_name, amt: i.amount, due: formatDay(dayOf(i.due_date)), status: i.is_overdue ? 'Overdue' : 'Open' })),
      bills: rows.bills.filter((b) => b.status === 'open').map((b) => ({ what: b.description, amt: n(b.amount), due: formatDay(dayOf(b.due_date)) })),
    },
    management: {
      margin: latest('gross_margin_pct'),
      q4Target: Math.round(n(goals.find((g) => g.metric === 'revenue')?.target_amount) / 1000),
      goals: goals.filter((g) => g.metric === null).map((g) => ({ name: g.name, pct: g.progress_pct ?? 0 })),
      approvals,
    },
    importExport: {
      shipments,
      paperwork: rows.paperwork_list.filter((p) => !p.done_at).map((p) => ({ id: p.shipment_code, what: p.description })),
    },
    warehouse: {
      zones: rows.warehouse_zones.map((z) => ({ name: z.code, label: z.label, fill: Math.round((z.slots_used / z.slots) * 100) })),
      inboundTrucks: onDay('inbound_trucks'),
      outboundOrders: onDay('outbound_orders'),
      stock: rows.products.map((p) => ({ sku: p.sku, name: p.name, onHand: p.on_hand, reorder: p.reorder_at })),
      moves: rows.stock_movements.slice(0, 4).map((m) => ({ t: local(m.happened_at).time, what: m.description })),
    },
  };

  const activity: ActivityEntry[] = rows.activity_feed.map((a) => ({
    id: String(a.id),
    at: wallTime(a.created_at, timezone),
    actorId: a.actor_slug,
    action: a.action,
    entity: a.entity_type,
    entityId: a.entity_id,
    title: a.title ?? '',
    assigneeId: a.assignee_slug,
    fromId: a.from_slug,
    toId: a.to_slug,
  }));

  return {
    company,
    team: { employees, tasks, today, weekStart },
    viewerId: setting('viewer'),
    isSample: setting('dataset') === 'sample',
    timezone,
    activity,
  };
}
