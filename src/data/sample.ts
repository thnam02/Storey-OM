/**
 * SAMPLE DATA. Made-up company copied from prototype/index.html.
 * Replace with real queries once the database exists (build order step 4).
 */
import type { CompanyData, Department, DepartmentId } from './types';

export const IS_SAMPLE_DATA = true;

/** "Today" in the sample data: Tuesday 17 November 2026. */
export const SAMPLE_TODAY_LABEL = 'Tuesday 17 Nov';

export const DEPARTMENTS: Department[] = [
  { id: 'import-export', name: 'Import & Export', color: '#2f8f83', building: 'office', level: 1 },
  { id: 'sales', name: 'Sales', color: '#d9773a', building: 'office', level: 2 },
  { id: 'marketing', name: 'Marketing', color: '#b5579a', building: 'office', level: 3 },
  { id: 'finance', name: 'Finance', color: '#3f7fbf', building: 'office', level: 4 },
  { id: 'management', name: 'Management', color: '#6b5bb5', building: 'office', level: 5 },
  { id: 'warehouse', name: 'Warehouse', color: '#c2952c', building: 'warehouse', level: 0 },
];

export const departmentById = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d])) as Record<
  DepartmentId,
  Department
>;

export const isDepartmentId = (id: string | null | undefined): id is DepartmentId =>
  !!id && id in departmentById;

export const OFFICE_FLOORS = DEPARTMENTS.filter((d) => d.building === 'office').sort(
  (a, b) => a.level - b.level,
);

export const SAMPLE_DATA: CompanyData = {
  sales: {
    stages: [
      { name: 'Lead', count: 18, value: 420000 },
      { name: 'Qualified', count: 11, value: 510000 },
      { name: 'Proposal', count: 7, value: 468000 },
      { name: 'Negotiation', count: 6, value: 442000 },
    ],
    won: { count: 9, value: 312000 },
    winRate: 31,
    deals: [
      { co: 'Pacific Medical Supplies', what: 'POS rollout, 14 clinics', value: 210000, stage: 'Proposal', owner: 'Minh T.', close: '5 Dec' },
      { co: 'Harbourline Retail', what: '2,000 POS terminals', value: 186000, stage: 'Negotiation', owner: 'Linh N.', close: '28 Nov' },
      { co: 'Mekong Fresh Foods', what: 'Scanners and label printers', value: 142000, stage: 'Negotiation', owner: 'James K.', close: '2 Dec' },
      { co: 'Sapa Coffee Co.', what: 'Café POS bundle, 22 stores', value: 94000, stage: 'Proposal', owner: 'Linh N.', close: '12 Dec' },
      { co: 'Bondi Outfitters', what: 'Label printers', value: 58000, stage: 'Qualified', owner: 'Sarah P.', close: '19 Dec' },
    ],
    today: [
      { t: '10:30', what: 'Demo call', co: 'Sapa Coffee Co.', who: 'Linh N.' },
      { t: '14:00', what: 'Contract review', co: 'Harbourline Retail', who: 'Linh N.' },
      { t: '16:15', what: 'Site visit', co: 'Pacific Medical Supplies', who: 'Minh T.' },
    ],
  },
  marketing: {
    budget: 25000,
    campaigns: [
      { name: 'Spring Sale, Sydney', channel: 'Google Ads', leads: 142, cpl: 28, status: 'Live' },
      { name: 'Tết 2027 wholesale (Vietnam)', channel: 'Facebook', leads: 96, cpl: 14, status: 'Live' },
      { name: 'November newsletter', channel: 'Email', leads: 118, cpl: 3, status: 'Live' },
      { name: 'B2B importers', channel: 'LinkedIn', leads: 66, cpl: 52, status: 'Live' },
      { name: 'Melbourne Retail Expo', channel: 'Event', leads: 64, cpl: 85, status: 'Ended' },
    ],
    conversion: 4.8,
    upcoming: [
      { when: '24 Nov', what: 'Black Friday email to 3,400 retail customers' },
      { when: '2 Dec', what: 'Case study launch: Harbourline Retail' },
      { when: '9 Jan', what: 'Tết promo landing page (Vietnamese)' },
    ],
  },
  finance: {
    cash: 1260000,
    receivables: 428000,
    months: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    revenue: [520, 470, 498, 560, 590, 575, 610, 640, 602, 655, 701, 684],
    invoices: [
      { no: 'INV-2041', co: 'Harbourline Retail', amt: 48200, due: '3 Nov', status: 'Overdue' },
      { no: 'INV-2047', co: 'Mekong Fresh Foods', amt: 31500, due: '10 Nov', status: 'Overdue' },
      { no: 'INV-2052', co: 'Pacific Medical Supplies', amt: 16300, due: '15 Nov', status: 'Overdue' },
      { no: 'INV-2058', co: 'Bondi Outfitters', amt: 22900, due: '30 Nov', status: 'Open' },
      { no: 'INV-2060', co: 'Sapa Coffee Co.', amt: 12400, due: '5 Dec', status: 'Open' },
    ],
    bills: [
      { what: 'Deposit, Haiphong supplier (PO-879)', amt: 19200, due: '20 Nov' },
      { what: 'Sea freight, IMP-1182', amt: 7850, due: '21 Nov' },
      { what: 'Warehouse lease, December', amt: 24000, due: '1 Dec' },
    ],
  },
  management: {
    margin: 34,
    q4Target: 2100,
    goals: [
      { name: 'Open Melbourne showroom', pct: 40 },
      { name: 'Average delivery time under 5 days', pct: 70 },
    ],
    approvals: [
      { id: 'a1', what: 'Purchase order PO-883: 1,200 cartons from Haiphong supplier', amt: 64000, from: 'import-export', state: 'waiting' },
      { id: 'a2', what: 'Raise December ad budget by A$5,000', amt: 5000, from: 'marketing', state: 'waiting' },
      { id: 'a3', what: 'Hire a warehouse shift supervisor', amt: null, from: 'warehouse', state: 'waiting' },
    ],
  },
  importExport: {
    shipments: [
      { id: 'IMP-1185', dir: 'Import', route: 'Ho Chi Minh City → Sydney', mode: 'Sea', load: '1 × 40ft', eta: '19 Nov', status: 'At customs', goods: 'Barcode scanners S8', skus: ['SKU-3105'] },
      { id: 'EXP-0734', dir: 'Export', route: 'Sydney → Auckland', mode: 'Air', load: '18 pallets', eta: '18 Nov', status: 'In transit', goods: 'Receipt printers for Auckland reseller', skus: [] },
      { id: 'IMP-1182', dir: 'Import', route: 'Haiphong → Sydney', mode: 'Sea', load: '2 × 40ft', eta: '20 Nov', status: 'In transit', goods: 'POS terminals T2, cash drawers', skus: ['SKU-1042', 'SKU-4410'] },
      { id: 'IMP-1179', dir: 'Import', route: 'Shenzhen → Sydney', mode: 'Sea', load: '1 × 20ft', eta: '22 Nov', status: 'In transit', goods: 'Thermal paper rolls', skus: ['SKU-2210'] },
      { id: 'EXP-0736', dir: 'Export', route: 'Sydney → Ho Chi Minh City', mode: 'Air', load: '6 pallets', eta: '24 Nov', status: 'Booked', goods: 'Label printers, demo stock', skus: [] },
      { id: 'EXP-0731', dir: 'Export', route: 'Sydney → Singapore', mode: 'Sea', load: '1 × 20ft', eta: '14 Nov', status: 'Delivered', goods: 'POS terminals for Singapore distributor', skus: [] },
    ],
    paperwork: [
      { id: 'IMP-1185', what: 'Customs asked for the certificate of origin' },
      { id: 'EXP-0736', what: 'Commercial invoice still in draft' },
      { id: 'IMP-1182', what: 'Book a container truck for 20 Nov pickup' },
    ],
  },
  warehouse: {
    zones: [
      { name: 'A', label: 'Fast movers', fill: 92 },
      { name: 'B', label: 'Bulk stock', fill: 74 },
      { name: 'C', label: 'Returns and overflow', fill: 68 },
    ],
    inboundTrucks: 3,
    outboundOrders: 162,
    stock: [
      { sku: 'SKU-1042', name: 'POS terminal T2', onHand: 38, reorder: 50 },
      { sku: 'SKU-2210', name: 'Thermal paper rolls (×50)', onHand: 1240, reorder: 400 },
      { sku: 'SKU-3105', name: 'Barcode scanner S8', onHand: 12, reorder: 40 },
      { sku: 'SKU-3302', name: 'Receipt printer RP-80', onHand: 64, reorder: 30 },
      { sku: 'SKU-4410', name: 'Cash drawer CD-4', onHand: 9, reorder: 25 },
      { sku: 'SKU-5120', name: 'Label printer LP-2', onHand: 140, reorder: 60 },
    ],
    moves: [
      { t: '12:40', what: 'Received 2 pallets of SKU-2210 into Zone B' },
      { t: '12:25', what: 'Picked order SO-9921 for Harbourline Retail' },
      { t: '11:58', what: 'Truck left for Bondi Outfitters, 14 cartons' },
      { t: '11:20', what: 'Moved 6 returned scanners to Zone C' },
    ],
  },
};
