import { monthName } from '../../lib/dates';
import { formatShortMoney, sum } from '../../lib/format';
import { useDataStore } from '../../state/dataStore';
import { BarRow, Chip, Feed, Kpi, Section, type Tone } from '../ui';

const STAGE_TONE: Record<string, Tone> = { Negotiation: 'info', Proposal: 'muted', Qualified: 'muted' };

/** Pipeline by stage, biggest open deals and today's activities. */
export function SalesWorkspace() {
  const X = useDataStore((s) => s.company.sales);
  const today = useDataStore((s) => s.team.today);
  const max = Math.max(1, ...X.stages.map((s) => s.value));

  return (
    <>
      <div className="kpis">
        <Kpi k="Open pipeline" v={formatShortMoney(sum(X.stages, (s) => s.value))} s={`${sum(X.stages, (s) => s.count)} deals`} />
        <Kpi k={`Won in ${monthName(today)}`} v={formatShortMoney(X.won.value)} s={`${X.won.count} deals`} />
        <Kpi k="Win rate" v={`${X.winRate}%`} s="last 90 days" />
      </div>
      <Section title="Pipeline by stage" small="Deal value">
        <div className="rows">
          {X.stages.map((s) => (
            <BarRow
              key={s.name}
              label={
                <>
                  {s.name} <span className="sub">{s.count}</span>
                </>
              }
              pct={(s.value / max) * 100}
              value={formatShortMoney(s.value)}
            />
          ))}
        </div>
      </Section>
      <Section title="Biggest open deals">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Stage</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {X.deals.map((x) => (
                <tr key={x.co}>
                  <td>
                    <b>{x.co}</b>
                    <div className="sub">
                      {x.what} · {x.owner}
                    </div>
                  </td>
                  <td>
                    <Chip tone={STAGE_TONE[x.stage] ?? 'muted'}>{x.stage}</Chip>
                    <div className="sub">Close {x.close}</div>
                  </td>
                  <td className="num">{formatShortMoney(x.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Today">
        <Feed
          items={X.today.map((t) => ({
            t: t.t,
            body: (
              <>
                {t.what} · {t.co} <span className="sub">{t.who}</span>
              </>
            ),
          }))}
        />
      </Section>
    </>
  );
}
