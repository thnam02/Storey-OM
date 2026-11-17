/**
 * Domain types. Shaped after the planned database tables in CLAUDE.md so the
 * hard-coded sample data can be swapped for real queries later.
 */

export type DepartmentId =
  | 'import-export'
  | 'sales'
  | 'marketing'
  | 'finance'
  | 'management'
  | 'warehouse';

export interface Department {
  id: DepartmentId;
  name: string;
  /** Hex colour used for the floor band, sign, label dot and panel accent. */
  color: string;
  building: 'office' | 'warehouse';
  /** Office floor number, 1 = ground. 0 for the warehouse. */
  level: number;
}

export interface PipelineStage {
  name: string;
  count: number;
  value: number;
}

export interface Deal {
  co: string;
  what: string;
  value: number;
  stage: string;
  owner: string;
  close: string;
}

export interface SalesData {
  stages: PipelineStage[];
  won: { count: number; value: number };
  winRate: number;
  deals: Deal[];
  today: { t: string; what: string; co: string; who: string }[];
}

export interface Campaign {
  name: string;
  channel: string;
  leads: number;
  cpl: number;
  status: 'Live' | 'Planned' | 'Ended';
}

export interface MarketingData {
  budget: number;
  campaigns: Campaign[];
  conversion: number;
  upcoming: { when: string; what: string }[];
}

export interface Invoice {
  no: string;
  co: string;
  amt: number;
  due: string;
  status: 'Overdue' | 'Open' | 'Paid';
}

export interface FinanceData {
  cash: number;
  receivables: number;
  months: string[];
  /** A$ thousands; the last month is month to date. */
  revenue: number[];
  invoices: Invoice[];
  bills: { what: string; amt: number; due: string }[];
}

export type ApprovalState = 'waiting' | 'approved' | 'declined';

export interface Approval {
  id: string;
  what: string;
  amt: number | null;
  from: DepartmentId;
  state: ApprovalState;
}

export interface ManagementData {
  margin: number;
  q4Target: number;
  goals: { name: string; pct: number }[];
  approvals: Approval[];
}

export type ShipmentStatus = 'Booked' | 'In transit' | 'At customs' | 'Delivered';

export interface Shipment {
  id: string;
  dir: 'Import' | 'Export';
  route: string;
  mode: 'Sea' | 'Air' | 'Road';
  load: string;
  eta: string;
  status: ShipmentStatus;
  goods: string;
  skus: string[];
}

export interface ImportExportData {
  shipments: Shipment[];
  paperwork: { id: string; what: string }[];
}

export interface Zone {
  name: string;
  label: string;
  /** Percent of rack slots in use. */
  fill: number;
}

export interface StockItem {
  sku: string;
  name: string;
  onHand: number;
  reorder: number;
}

export interface WarehouseData {
  zones: Zone[];
  inboundTrucks: number;
  outboundOrders: number;
  stock: StockItem[];
  moves: { t: string; what: string }[];
}

export interface CompanyData {
  sales: SalesData;
  marketing: MarketingData;
  finance: FinanceData;
  management: ManagementData;
  importExport: ImportExportData;
  warehouse: WarehouseData;
}

/* ---------- people and tasks ---------- */

export type Presence = 'at_desk' | 'in_meeting' | 'away' | 'on_floor' | 'off_shift';

/** App access: a director sees every department, a manager their own, an employee their own tasks. */
export type AppRole = 'director' | 'manager' | 'employee';

export interface Employee {
  id: string;
  departmentId: DepartmentId;
  name: string;
  role: string;
  presence: Presence;
  isManager: boolean;
  /** Who can use the app, and what they see. null: no access. */
  access: AppRole | null;
  /** What they are doing on the floor, when it changes how they are drawn. */
  activity?: 'forklift';
}

export type TaskStatus = 'todo' | 'doing' | 'done';

/** CRM record a task is about. Tasks linking to records is central to the product. */
export type LinkedType = 'deal' | 'invoice' | 'bill' | 'shipment' | 'product' | 'approval' | 'campaign' | 'order';

export interface LinkedRecord {
  type: LinkedType;
  id: string;
  label: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** ISO date, YYYY-MM-DD. */
  dueDate: string;
  doneAt: string | null;
  assigneeId: string;
  createdById: string | null;
  delegatedFromId: string | null;
  linked: LinkedRecord | null;
}

/** People, their tasks, and the dates workload is measured against. */
export interface TeamData {
  employees: Employee[];
  tasks: Task[];
  today: string;
  weekStart: string;
}
