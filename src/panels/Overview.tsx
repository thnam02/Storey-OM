import { DEPARTMENTS } from '../data/sample';
import { peopleIn, revenueThisYear, teamWorkload, totals } from '../data/metrics';
import { departmentStatus } from '../data/status';
import type { Department } from '../data/types';
import { formatDay, formatLongDay } from '../lib/dates';
import { formatShortMoney } from '../lib/format';
import { useDataStore } from '../state/dataStore';
import { useUiStore } from '../state/uiStore';
import { accent, Chip, Crumbs, Kpi, Section } from './ui';

const where = (d: Department) => (d.level ? `Level ${d.level}` : 'Warehouse building');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Whole-company view: headline numbers and every department's health. */
export function Overview() {
  const data = useDataStore((s) => s.company);
  const team = useDataStore((s) => s.team);
  const hovered = useUiStore((s) => s.hoveredDeptId);
  const { selectDept, hoverDept } = useUiStore.getState();
  const load = teamWorkload(team);
  const all = totals(team.employees, load);

  return (
    <>
      <div className="ph">
        <Crumbs parts={[{ label: `Company HQ · ${formatLongDay(team.today)}` }]} />
        <h2>Company overview</h2>
        <div className="status">
          <span className="sub">{team.employees.length} people across 5 office departments and the warehouse</span>
        </div>
      </div>
      <div className="pb">
        <div className="kpis">
          <Kpi k="Revenue this year" v={formatShortMoney(revenueThisYear(data.finance))} s={`Jan to ${formatDay(team.today)}`} />
          <Kpi k="Open tasks" v={all.open} s="across all teams" />
          <Kpi k="Overdue tasks" v={all.late} s="need follow-up" late={all.late > 0} />
        </div>
        <Section title="Departments" small="Click to open the floor">
          <div className="list">
            {DEPARTMENTS.map((d) => {
              const st = departmentStatus(d.id, data);
              const people = peopleIn(team, d.id);
              const late = totals(people, load).late;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`ditem${hovered === d.id ? ' hot' : ''}`}
                  style={accent(d.color)}
                  onClick={() => {
                    hoverDept(null);
                    selectDept(d.id);
                  }}
                  onPointerEnter={() => hoverDept(d.id)}
                  onPointerLeave={() => hoverDept(null)}
                >
                  <span className="swatch" />
                  <b>{d.name}</b>
                  <Chip tone={st.tone}>{st.chip}</Chip>
                  <span className="sub">
                    {where(d)} · {people.length} people · {st.text}
                    {late > 0 && ` · ${plural(late, 'overdue task')}`}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
        <div className="note">
          Sample data. Click a floor to open its floor plan and team, then click a person to see their tasks. Assign, delegate and approve only
          change this page until the database is connected.
        </div>
      </div>
    </>
  );
}
