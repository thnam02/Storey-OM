import type { Department } from '../../data/types';
import { formatDay, monthName } from '../../lib/dates';
import { formatMoney, formatShortMoney, sum } from '../../lib/format';
import { useSnapshot } from '../../state/serverData';
import { Chip, Kpi, Section } from '../ui';
import { RevenueChart } from './RevenueChart';

/** Cash, receivables, invoices to chase, bills to pay and revenue by month. */
export function FinanceWorkspace({ dept }: { dept: Department }) {
  const F = useSnapshot().company.finance;
  const today = useSnapshot().team.today;
  const overdue = F.invoices.filter((i) => i.status === 'Overdue');
  const thisMonth = F.revenue[F.revenue.length - 1] ?? 0;

  return (
    <>
      <div className="kpis">
        <Kpi k="Cash in bank" v={formatShortMoney(F.cash)} />
        <Kpi k="Owed to us" v={formatShortMoney(F.receivables)} s={`${formatShortMoney(sum(overdue, (i) => i.amt))} overdue`} />
        <Kpi k={`${monthName(today)} revenue`} v={`A$${thisMonth}K`} s={`to ${formatDay(today)}`} />
      </div>
      <Section title="Revenue by month" small="A$ thousands">
        <RevenueChart values={F.revenue} months={F.months} year={Number(today.slice(0, 4))} color={dept.color} />
      </Section>
      <Section title="Invoices to chase" small="Largest open">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {F.invoices.map((i) => (
                <tr key={i.no}>
                  <td>
                    <span className="mono">{i.no}</span>
                    <div className="sub">{i.co}</div>
                  </td>
                  <td>
                    <Chip tone={i.status === 'Overdue' ? 'bad' : 'muted'}>{i.status}</Chip>
                    <div className="sub">Due {i.due}</div>
                  </td>
                  <td className="num">{formatMoney(i.amt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Bills to pay soon">
        <div className="tw">
          <table>
            <tbody>
              {F.bills.map((b) => (
                <tr key={b.what}>
                  <td>{b.what}</td>
                  <td className="sub">{b.due}</td>
                  <td className="num">{formatMoney(b.amt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
