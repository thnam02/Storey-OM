/**
 * SAMPLE DATA. People and tasks copied from prototype/index.html, generated with
 * the same seeded random sequence so the workload states match the prototype.
 * Replace with real queries once the database exists (build order step 4).
 */
import { createRandom } from '../lib/seededRandom';
import { SAMPLE_DATA } from './sample';
import type { AppRole, DepartmentId, Employee, LinkedRecord, LinkedType, Presence, Task, TaskStatus, TeamData } from './types';

/** "Today" and the start of this week in the sample data. */
export const SAMPLE_TODAY = '2026-11-17';
export const SAMPLE_WEEK_START = '2026-11-16';

interface StaffConfig {
  /** The last `walk` people on the list are away from their desk (on the floor in the warehouse). */
  walk: number;
  meet: string[];
  driver?: string;
  list: [name: string, role: string][];
  offShift?: [name: string, role: string][];
}

// Order matters: it drives the random sequence that generates tasks.
const STAFF: [DepartmentId, StaffConfig][] = [
  ['sales', { walk: 2, meet: ['Sarah Patel', 'Huong Le'], list: [
    ['Daniel Reid', 'Head of Sales'], ['Linh Nguyen', 'Senior account manager'], ['Minh Tran', 'Account manager'], ['James Kelly', 'Account manager'],
    ['Sarah Patel', 'Account executive'], ['Huong Le', 'Account executive'], ['Quang Vo', 'Account executive'], ['Ben Carter', 'Account executive'],
    ['Priya Shah', 'Sales operations'], ['Mai Do', 'Sales coordinator'], ['Tom Becker', 'Sales development rep'], ['An Pham', 'Sales development rep'],
    ['Chloe Wright', 'Sales development rep'], ['Thu Hoang', 'Sales development rep']] }],
  ['marketing', { walk: 2, meet: ['Grace Kim', 'Vy Ngo'], list: [
    ['Emma Lawson', 'Head of Marketing'], ['Khoa Bui', 'Performance marketer'], ['Grace Kim', 'Content lead'], ['Vy Ngo', 'Designer'],
    ['Nhi Dang', 'Social media, Vietnam'], ['Lucas Moreau', 'Events manager'], ['Oliver Hunt', 'Marketing analyst']] }],
  ['finance', { walk: 2, meet: [], list: [
    ['Rachel Tan', 'Finance manager'], ['Hannah Brooks', 'Accounts receivable'], ['Lan Phan', 'Accounts payable'], ['Duc Nguyen', 'Accountant'],
    ['Trang Vu', 'Financial analyst'], ["Sam O'Brien", 'Payroll officer']] }],
  ['management', { walk: 1, meet: ['Thao Nguyen', 'Andrew Walsh'], list: [
    ['Michael Chen', 'Managing director'], ['Kim Ly', 'Head of People'], ['Thao Nguyen', 'Operations director'], ['Andrew Walsh', 'Finance director'],
    ['Jess Morgan', 'Executive assistant']] }],
  ['import-export', { walk: 3, meet: [], list: [
    ['Tuan Ho', 'Logistics manager'], ['Ngoc Truong', 'Import coordinator'], ['Bich Lam', 'Export coordinator'], ['Jack Turner', 'Freight booking'],
    ['Phuong Dinh', 'Trade documents'], ['Mia Russo', 'Receptionist'], ['Ella Grant', 'Customs compliance'], ['Ryan Fitzgerald', 'Forwarder liaison'],
    ['Hieu Mai', 'Supplier relations, Vietnam']] }],
  ['warehouse', { walk: 8, meet: [], driver: 'Dave Murphy', list: [
    ['Steve Collins', 'Warehouse manager'], ['Dave Murphy', 'Forklift driver'], ['Long Nguyen', 'Shift supervisor'], ['Yen Luu', 'Inventory controller'],
    ['Nathan Ward', 'Receiving'], ['Khanh Ta', 'Picker'], ['Liam Scott', 'Picker'], ['Hoa Trinh', 'Packer']],
    offShift: [['Matt Green', 'Night shift supervisor'], ['Josh Bell', 'Forklift driver'], ['Son Tran', 'Forklift driver'], ['Tam Nguyen', 'Picker'], ['Kyle Adams', 'Picker'],
      ['Ruby Evans', 'Picker'], ['Cuong Do', 'Picker'], ['Linh Vo', 'Picker'], ['Ha Pham', 'Packer'], ['Ethan Price', 'Packer'], ['Aiden Hall', 'Packer'],
      ['Thanh Bui', 'Packer'], ['Dung Le', 'Receiving'], ['Zoe Mitchell', 'Dispatch'], ['Isla Cooper', 'Dispatch']] }],
];

/** Tasks tied to real records in the sample CRM data: [title, record, status, day]. Days count from 1 Nov; 31 = 1 Dec. */
const SPECIFIC: Record<string, [string, string | null, TaskStatus, number][]> = {
  'Linh Nguyen': [['Contract review with Harbourline Retail', 'Deal · Harbourline', 'doing', 17], ['Demo call with Sapa Coffee Co.', 'Deal · Sapa Coffee', 'done', 17], ['Send final pricing to Harbourline Retail', 'Deal · Harbourline', 'todo', 19], ['Proposal for Sapa Coffee Co. (22 stores)', 'Deal · Sapa Coffee', 'todo', 24]],
  'Minh Tran': [['Send proposal to Pacific Medical Supplies', 'Deal · Pacific Medical', 'doing', 14], ['Site visit at Pacific Medical Supplies', 'Deal · Pacific Medical', 'todo', 17]],
  'James Kelly': [['Negotiate volume discount with Mekong Fresh Foods', 'Deal · Mekong Fresh', 'doing', 20]],
  'Sarah Patel': [['Qualify label printer needs at Bondi Outfitters', 'Deal · Bondi', 'todo', 21]],
  'Daniel Reid': [['Review November pipeline forecast', null, 'doing', 19], ['Coach SDRs on Tết campaign leads', null, 'todo', 20]],
  'Emma Lawson': [['Approve Black Friday email copy', null, 'doing', 20], ['Ask Michael to approve +A$5,000 ad budget', 'Approval a2', 'done', 16]],
  'Khoa Bui': [['Lower Google Ads cost per lead below A$25', 'Spring Sale', 'doing', 21]],
  'Nhi Dang': [['Schedule Tết 2027 Facebook posts', 'Tết 2027', 'doing', 19], ['Translate promo landing page to Vietnamese', null, 'todo', 28]],
  'Grace Kim': [['Write Harbourline Retail case study', null, 'doing', 25]],
  'Rachel Tan': [['Month-end close for October', null, 'done', 13], ['Review A$96K overdue receivables with Sales', null, 'todo', 18]],
  'Hannah Brooks': [['Chase payment from Harbourline Retail', 'INV-2041', 'doing', 10], ['Chase payment from Mekong Fresh Foods', 'INV-2047', 'todo', 15], ['Send reminder to Pacific Medical Supplies', 'INV-2052', 'todo', 18]],
  'Lan Phan': [['Pay deposit to Haiphong supplier', 'PO-879', 'todo', 20], ['Pay sea freight for IMP-1182', 'IMP-1182', 'todo', 21]],
  'Michael Chen': [['Decide on PO-883 (A$64,000)', 'Approval a1', 'todo', 18], ['Board update for November', null, 'doing', 27]],
  'Thao Nguyen': [['Plan for faster deliveries (under 5 days)', null, 'doing', 30]],
  'Kim Ly': [['Job ad: warehouse shift supervisor', 'Approval a3', 'todo', 19]],
  'Tuan Ho': [['Get IMP-1185 released from customs', 'IMP-1185', 'doing', 18]],
  'Ngoc Truong': [['Send certificate of origin to customs', 'IMP-1185', 'doing', 16], ['Confirm ETA for IMP-1179', 'IMP-1179', 'todo', 19]],
  'Bich Lam': [['Finish commercial invoice', 'EXP-0736', 'todo', 18], ['Confirm delivery in Auckland', 'EXP-0734', 'todo', 18]],
  'Jack Turner': [['Book container truck for 20 Nov pickup', 'IMP-1182', 'todo', 18]],
  'Steve Collins': [['Reorder plan for 3 low-stock products', null, 'doing', 18], ['Make space in Zone A for IMP-1182', 'IMP-1182', 'todo', 19]],
  'Yen Luu': [['Count barcode scanners on hand', 'SKU-3105', 'done', 16]],
  'Nathan Ward': [['Receive thermal paper delivery', 'IMP-1179', 'todo', 22], ['Put away 2 pallets of SKU-2210', 'SKU-2210', 'done', 17]],
};

export const SAMPLE_CUSTOMERS = ['Harbourline Retail', 'Mekong Fresh Foods', 'Pacific Medical Supplies', 'Sapa Coffee Co.', 'Bondi Outfitters', 'Northside Pharmacy', 'Bay Street Bakery', 'Lotus Grocers', 'Coastal Hardware', 'Parramatta Books', 'Hanoi Kitchen', 'Glebe Cycles'];
const TEMPLATES: Record<DepartmentId, string[]> = {
  sales: ['Follow up with {co} after the demo', 'Send updated quote to {co}', 'Prepare demo for {co}', 'Log call notes for {co}', 'Call back new lead: {co}', 'Renewal check-in with {co}', 'Book a site visit with {co}', 'Update deal stage for {co}'],
  marketing: ['Write social posts for {camp}', 'Review ad results for {camp}', 'Design banner for {camp}', 'Send new leads from {camp} to Sales', 'Draft blog post: POS tips for cafés', 'Plan photos for the case study', 'Update the product brochure'],
  finance: ['Reconcile October bank statement', 'Enter supplier invoices', 'Check expense claims', 'Prepare GST figures for the BAS', 'Update cash flow forecast', 'Run payroll for this fortnight', 'Check credit terms for {co}'],
  management: ['Review {dept} monthly numbers', '1:1 with {dept} lead', 'Approve leave requests', 'Review hiring plan for {dept}', 'Prepare notes for the leadership meeting'],
  'import-export': ['Track {ship} with the forwarder', 'Update ETA for {ship}', 'Get sea freight quote to {port}', 'File export documents for {ship}', 'Confirm supplier ready date in Haiphong', 'Check HS codes for new products'],
  warehouse: ['Pick order SO-{so} for {co}', 'Pack and label SO-{so}', 'Cycle count Zone {zone}', 'Put away pallets in Zone {zone}', 'Load truck for {co}', 'Check returns in Zone C', 'Charge and inspect forklift'],
};
const PORTS = ['Auckland', 'Singapore', 'Ho Chi Minh City', 'Osaka', 'Los Angeles'];

/** Sample app access: department heads manage their department; the managing, operations and finance directors see everything. */
const DIRECTORS = ['Thao Nguyen', 'Andrew Walsh'];
function accessOf(dept: DepartmentId, name: string, isHead: boolean): AppRole | null {
  if (isHead) return dept === 'management' ? 'director' : 'manager';
  return DIRECTORS.includes(name) ? 'director' : null;
}

/** Sample work email for a person, e.g. sam.o.brien@storey.example (a reserved domain, so nothing is ever delivered). */
export const sampleEmail = (personId: string) => `${personId.replace(/-/g, '.')}@storey.example`;

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Day number (1 = 1 Nov 2026, 31 = 1 Dec) to an ISO date. */
export function sampleDay(d: number): string {
  const [month, day] = d > 30 ? [12, d - 30] : [11, d];
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Turn the prototype's free-text record reference into a typed link. */
export function parseLinked(ref: string | null): LinkedRecord | null {
  if (!ref) return null;
  const rules: [RegExp, LinkedType][] = [
    [/^Deal · /, 'deal'], [/^Approval /, 'approval'], [/^INV-/, 'invoice'], [/^PO-/, 'bill'],
    [/^(IMP|EXP)-/, 'shipment'], [/^SKU-/, 'product'], [/^SO-/, 'order'],
  ];
  const hit = rules.find(([re]) => re.test(ref));
  if (!hit) return { type: 'campaign', id: slug(ref), label: ref };
  const [re, type] = hit;
  const id = type === 'deal' || type === 'approval' ? slug(ref.replace(re, '')) : ref;
  return { type, id, label: ref };
}

function buildTeam() {
  const rnd = createRandom(1711);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)] as T;

  const fillTemplate = (tpl: string) => {
    let ref: string | null = null;
    const title = tpl.replace(/\{(\w+)\}/g, (m, k: string) => {
      switch (k) {
        case 'co': return pick(SAMPLE_CUSTOMERS);
        case 'camp': { const c = pick(SAMPLE_DATA.marketing.campaigns.slice(0, 4)); ref = c.name.split(',')[0] ?? c.name; return c.name; }
        case 'ship': { const s = pick(SAMPLE_DATA.importExport.shipments.slice(0, 5)); ref = s.id; return s.id; }
        case 'port': return pick(PORTS);
        case 'so': { const n = 'SO-' + (9930 + Math.floor(rnd() * 60)); ref = n; return n.slice(3); }
        case 'zone': return pick(['A', 'B', 'C']);
        case 'dept': return pick(['Sales', 'Marketing', 'Finance', 'Import & Export', 'Warehouse']);
        default: return m;
      }
    });
    return { title, ref };
  };

  const employees: Employee[] = [];
  STAFF.forEach(([dept, cfg]) => {
    const n = cfg.list.length;
    cfg.list.forEach(([name, role], i) => {
      let presence: Presence = 'at_desk';
      let activity: Employee['activity'];
      if (cfg.driver === name) { presence = 'on_floor'; activity = 'forklift'; }
      else if (cfg.meet.includes(name)) presence = 'in_meeting';
      else if (i >= n - cfg.walk) presence = dept === 'warehouse' ? 'on_floor' : 'away';
      employees.push({ id: slug(name), departmentId: dept, name, role, presence, isManager: i === 0, access: accessOf(dept, name, i === 0), ...(activity ? { activity } : {}) });
    });
    (cfg.offShift ?? []).forEach(([name, role]) =>
      employees.push({ id: slug(name), departmentId: dept, name, role, presence: 'off_shift', isManager: false, access: null }),
    );
  });

  const tasks: Task[] = [];
  let seq = 1;
  const add = (e: Employee, title: string, ref: string | null, status: TaskStatus, day: number) => {
    const due = sampleDay(day);
    tasks.push({
      id: 't' + seq++, title, status, dueDate: due, doneAt: status === 'done' ? due : null,
      assigneeId: e.id, createdById: null, delegatedFromId: null, linked: parseLinked(ref),
    });
  };

  employees.forEach((e) => {
    const mine: string[] = [];
    (SPECIFIC[e.name] ?? []).forEach(([t, ref, s, d]) => { add(e, t, ref, s, d); mine.push(t); });
    const onSite = e.presence !== 'off_shift';
    const target = onSite ? 3 + Math.floor(rnd() * 5) : 1 + Math.floor(rnd() * 2);
    let guard = 0;
    while (mine.length < target && guard++ < 30) {
      const { title, ref } = fillTemplate(pick(TEMPLATES[e.departmentId]));
      if (mine.includes(title)) continue;
      const r = rnd();
      let s: TaskStatus, d: number;
      if (r < 0.3) { s = 'done'; d = 13 + Math.floor(rnd() * 5); }
      else if (r < 0.6) { s = 'doing'; d = rnd() < 0.1 ? 13 + Math.floor(rnd() * 4) : 17 + Math.floor(rnd() * 8); }
      else { s = 'todo'; d = rnd() < 0.06 ? 14 + Math.floor(rnd() * 3) : 18 + Math.floor(rnd() * 14); }
      add(e, title, ref, s, d);
      mine.push(title);
    }
  });

  return { employees, tasks };
}

const built = buildTeam();
export const SAMPLE_EMPLOYEES: Employee[] = built.employees;
export const SAMPLE_TASKS: Task[] = built.tasks;

export const SAMPLE_TEAM: TeamData = {
  employees: SAMPLE_EMPLOYEES,
  tasks: SAMPLE_TASKS,
  today: SAMPLE_TODAY,
  weekStart: SAMPLE_WEEK_START,
};

/** Who uses the app in the sample until someone else is picked: Michael Chen, managing director. */
export const SAMPLE_VIEWER_ID = 'michael-chen';
