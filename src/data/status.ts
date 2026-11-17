import type { CompanyData, DepartmentId } from './types';
import { formatShortMoney, sum } from '../lib/format';

export type Tone = 'ok' | 'warn' | 'bad' | 'muted';

export interface DepartmentStatus {
  tone: Tone;
  chip: string;
  text: string;
}

/** One-line health summary per department, as shown on labels and the overview. */
export function departmentStatus(id: DepartmentId, data: CompanyData): DepartmentStatus {
  switch (id) {
    case 'sales':
      return { tone: 'ok', chip: 'On track', text: `${formatShortMoney(data.sales.won.value)} won this month` };
    case 'marketing':
      return { tone: 'ok', chip: 'On track', text: `${sum(data.marketing.campaigns, (c) => c.leads)} leads this month` };
    case 'finance': {
      const overdue = data.finance.invoices.filter((i) => i.status === 'Overdue');
      return overdue.length
        ? { tone: 'warn', chip: 'Needs attention', text: `${formatShortMoney(sum(overdue, (i) => i.amt))} overdue across ${overdue.length} invoices` }
        : { tone: 'ok', chip: 'On track', text: 'No overdue invoices' };
    }
    case 'management': {
      const n = data.management.approvals.filter((a) => a.state === 'waiting').length;
      return n
        ? { tone: 'warn', chip: `${n} to approve`, text: `${n} ${n === 1 ? 'approval is' : 'approvals are'} waiting for you` }
        : { tone: 'ok', chip: 'All clear', text: 'No approvals waiting' };
    }
    case 'import-export': {
      const held = data.importExport.shipments.filter((s) => s.status === 'At customs');
      return held.length
        ? { tone: 'warn', chip: 'Needs attention', text: `${held.map((s) => s.id).join(', ')} held at customs` }
        : { tone: 'ok', chip: 'On track', text: 'No shipments held' };
    }
    case 'warehouse': {
      const low = data.warehouse.stock.filter((s) => s.onHand < s.reorder).length;
      return low
        ? { tone: 'warn', chip: 'Needs attention', text: `${low} products below reorder level` }
        : { tone: 'ok', chip: 'On track', text: 'Stock above reorder levels' };
    }
  }
}
