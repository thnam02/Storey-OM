/**
 * Figures derived from company and team data for the panels. Nothing here is
 * stored; it is recomputed from the records.
 */
import { sum } from '../lib/format';
import type { DepartmentId, Employee, FinanceData, LinkedType, Shipment, StockItem, TeamData, WarehouseData } from './types';
import { workloadByEmployee, type Workload } from './workload';

const loadCache = new WeakMap<TeamData, Map<string, Workload>>();

/** Workload for everyone in the team, cached per team snapshot. */
export function teamWorkload(team: TeamData): Map<string, Workload> {
  let load = loadCache.get(team);
  if (!load) {
    load = workloadByEmployee(team.employees, team.tasks, team.today, team.weekStart);
    loadCache.set(team, load);
  }
  return load;
}

const EMPTY: Workload = { open: 0, late: 0, doing: 0, todo: 0, doneThisWeek: 0, state: 'ok' };
export const loadOf = (load: Map<string, Workload>, id: string) => load.get(id) ?? EMPTY;

export const peopleIn = (team: TeamData, id: DepartmentId) => team.employees.filter((e) => e.departmentId === id);

export function totals(people: readonly Employee[], load: Map<string, Workload>) {
  return {
    open: sum(people, (p) => loadOf(load, p.id).open),
    late: sum(people, (p) => loadOf(load, p.id).late),
    doneThisWeek: sum(people, (p) => loadOf(load, p.id).doneThisWeek),
  };
}

/** Most overdue first, then most open tasks. Stable, so ties keep list order. */
export function byUrgency(people: readonly Employee[], load: Map<string, Workload>): Employee[] {
  return [...people].sort((a, b) => {
    const wa = loadOf(load, a.id), wb = loadOf(load, b.id);
    return wb.late - wa.late || wb.open - wa.open;
  });
}

/** Revenue (A$) from January up to this month. Monthly figures are in A$ thousands. */
export function revenueThisYear(f: FinanceData): number {
  const jan = f.months.lastIndexOf('Jan');
  return sum(f.revenue.slice(Math.max(0, jan)), (v) => v) * 1000;
}

/** Revenue (A$ thousands) for this year's October to December so far. */
export function q4Revenue(f: FinanceData): number {
  const jan = Math.max(0, f.months.lastIndexOf('Jan'));
  return sum(
    f.months.map((m, i) => (i >= jan && ['Oct', 'Nov', 'Dec'].includes(m) ? (f.revenue[i] ?? 0) : 0)),
    (v) => v,
  );
}

export const isLowStock = (s: StockItem) => s.onHand < s.reorder;
export const lowStock = (w: WarehouseData) => w.stock.filter(isLowStock);
export const rackSpaceUsed = (w: WarehouseData) => Math.round(sum(w.zones, (z) => z.fill) / Math.max(1, w.zones.length));

/** The import on its way that restocks this product, if any. */
export const incomingFor = (sku: string, shipments: readonly Shipment[]) =>
  shipments.find((s) => s.dir === 'Import' && s.status !== 'Delivered' && s.skus.includes(sku));

/** Department whose workspace holds each kind of linked record. */
export const LINKED_HOME: Record<LinkedType, DepartmentId> = {
  deal: 'sales',
  campaign: 'marketing',
  invoice: 'finance',
  bill: 'finance',
  approval: 'management',
  shipment: 'import-export',
  product: 'warehouse',
  order: 'warehouse',
};
