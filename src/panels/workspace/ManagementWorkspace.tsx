import { peopleIn, q4Revenue, revenueThisYear, teamWorkload, totals } from '../../data/metrics';
import { DEPARTMENTS } from '../../data/sample';
import type { ApprovalState } from '../../data/types';
import { departmentStatus } from '../../data/status';
import { formatDay } from '../../lib/dates';
import { formatMoney, formatShortMoney } from '../../lib/format';
import { useAction, useSnapshot } from '../../state/serverData';
import { useUiStore } from '../../state/uiStore';
import { Chip, DeptLink, Kpi, Section } from '../ui';

/** Approvals queue, company goals and an overview of every team. */
export function ManagementWorkspace() {
  const data = useSnapshot().company;
  const team = useSnapshot().team;
  const viewerId = useSnapshot().viewerId;
  const action = useAction();
  const setApproval = (approvalId: string, state: ApprovalState) => action.mutate({ type: 'decide', approvalId, state });
  const G = data.management;
  const load = teamWorkload(team);

  const q4 = q4Revenue(data.finance);
  const goals = [{ name: `Q4 revenue of A$${(G.q4Target / 1000).toFixed(1)}M (A$${q4}K so far)`, pct: Math.round((q4 / G.q4Target) * 100) }, ...G.goals];

  return (
    <>
      <div className="kpis">
        <Kpi k="Revenue this year" v={formatShortMoney(revenueThisYear(data.finance))} s={`Jan to ${formatDay(team.today)}`} />
        <Kpi k="Gross margin" v={`${G.margin}%`} s="this year" />
        <Kpi k="People" v={team.employees.length} s={`${DEPARTMENTS.length} teams`} />
      </div>
      <Section title="Waiting for your approval">
        {action.isError && <div className="note msg" role="alert">Couldn't save that decision: {action.error.message}</div>}
        <div className="list">
          {G.approvals.map((a) => (
            <div className="item" key={a.id}>
              <span>{a.what}</span>
              <span className="sub">
                From <DeptLink id={a.from} />
                {a.amt ? ` · ${formatMoney(a.amt)}` : ''}
              </span>
              <div className="acts">
                {viewerId === null ? (
                  <Chip tone={a.state === 'approved' ? 'ok' : a.state === 'declined' ? 'muted' : 'warn'}>
                    {a.state === 'approved' ? 'Approved' : a.state === 'declined' ? 'Declined' : 'Waiting'}
                  </Chip>
                ) : a.state === 'waiting' ? (
                  <>
                    <button className="btn sm primary" type="button" onClick={() => setApproval(a.id, 'approved')}>
                      Approve
                    </button>
                    <button className="btn sm" type="button" onClick={() => setApproval(a.id, 'declined')}>
                      Decline
                    </button>
                  </>
                ) : (
                  <>
                    <Chip tone={a.state === 'approved' ? 'ok' : 'muted'}>{a.state === 'approved' ? 'Approved' : 'Declined'}</Chip>
                    <button className="link" type="button" onClick={() => setApproval(a.id, 'waiting')}>
                      Undo
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Q4 goals">
        <div className="rows">
          {goals.map((g) => (
            <div className="prog" key={g.name}>
              <div className="top">
                <span>{g.name}</span>
                <span className="num">{g.pct}%</span>
              </div>
              <span className="bar">
                <i style={{ width: `${Math.min(100, g.pct)}%` }} />
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Teams">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th className="num">People</th>
                <th className="num">Overdue tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((d) => {
                const people = peopleIn(team, d.id);
                const late = totals(people, load).late;
                const st = departmentStatus(d.id, data);
                return (
                  <tr key={d.id}>
                    <td>
                      <button className="link" type="button" onClick={() => useUiStore.getState().selectDept(d.id)}>
                        {d.name}
                      </button>
                    </td>
                    <td className="num">{people.length}</td>
                    <td className="num">{late ? <span style={{ color: 'var(--late)' }}>{late}</span> : 0}</td>
                    <td>
                      <Chip tone={st.tone}>{st.chip}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
