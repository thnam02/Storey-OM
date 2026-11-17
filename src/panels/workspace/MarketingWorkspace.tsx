import { monthName } from '../../lib/dates';
import { formatShortMoney, sum } from '../../lib/format';
import { useDataStore } from '../../state/dataStore';
import { BarRow, Chip, Feed, Kpi, Section } from '../ui';

/** Campaigns, leads by channel, and spend against budget. */
export function MarketingWorkspace() {
  const X = useDataStore((s) => s.company.marketing);
  const today = useDataStore((s) => s.team.today);
  const leads = sum(X.campaigns, (c) => c.leads);
  const spend = sum(X.campaigns, (c) => c.leads * c.cpl);

  const byChannel = new Map<string, number>();
  for (const c of X.campaigns) byChannel.set(c.channel, (byChannel.get(c.channel) ?? 0) + c.leads);
  const channels = [...byChannel].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, channels[0]?.[1] ?? 1);

  return (
    <>
      <div className="kpis">
        <Kpi k={`Leads in ${monthName(today)}`} v={leads} s={`from ${X.campaigns.length} campaigns`} />
        <Kpi k="Lead to customer" v={`${X.conversion}%`} s="last 90 days" />
        <Kpi k="Spend so far" v={formatShortMoney(spend)} s={`of ${formatShortMoney(X.budget)} budget`} late={spend > X.budget} />
      </div>
      <Section title="Leads by channel">
        <div className="rows">
          {channels.map(([k, v]) => (
            <BarRow key={k} label={k} pct={(v / max) * 100} value={`${v} leads`} />
          ))}
        </div>
      </Section>
      <Section title="Campaigns" small="Cost per lead">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th className="num">Leads</th>
                <th className="num">CPL</th>
              </tr>
            </thead>
            <tbody>
              {X.campaigns.map((c) => (
                <tr key={c.name}>
                  <td>
                    <b>{c.name}</b>
                    <div className="sub">{c.channel}</div>
                  </td>
                  <td>
                    <Chip tone={c.status === 'Live' ? 'ok' : 'muted'}>{c.status}</Chip>
                  </td>
                  <td className="num">{c.leads}</td>
                  <td className="num">A${c.cpl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Coming up">
        <Feed items={X.upcoming.map((u) => ({ t: u.when, body: u.what }))} />
      </Section>
    </>
  );
}
