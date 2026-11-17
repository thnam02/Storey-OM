import type { CSSProperties } from 'react';
import { presenceLabel } from '../data/people';
import { departmentById } from '../data/sample';
import type { Employee, TeamData } from '../data/types';
import { WORKLOAD_STATE, workloadOf } from '../data/workload';
import { useUiStore } from '../state/uiStore';

const presenceTone = (e: Employee) =>
  e.presence === 'off_shift' || e.presence === 'away' ? 'muted' : e.presence === 'in_meeting' ? 'info' : 'ok';

/**
 * Header and task counts for the selected person. Placeholder for step 3,
 * which adds the task list, assigning and delegating.
 */
export function PersonSummary({ person, team }: { person: Employee; team: TeamData }) {
  const { selectDept } = useUiStore.getState();
  const d = departmentById[person.departmentId];
  const w = workloadOf(
    team.tasks.filter((t) => t.assigneeId === person.id),
    team.today,
    team.weekStart,
  );
  const state = WORKLOAD_STATE[w.state];
  const kpis: [string, number, boolean][] = [
    ['In progress', w.doing, false],
    ['To do', w.todo, false],
    ['Overdue', w.late, w.late > 0],
    ['Done this week', w.doneThisWeek, false],
  ];

  return (
    <>
      <div className="ph" style={{ '--c': d.color } as CSSProperties}>
        <div className="crumbs">
          <button type="button" onClick={() => selectDept(null)}>
            Company HQ
          </button>
          <span aria-hidden="true">›</span>
          <button type="button" onClick={() => selectDept(d.id)}>
            {d.name}
          </button>
          <span aria-hidden="true">›</span>
          <span>{person.name}</span>
        </div>
        <h2>
          <span className="swatch" />
          {person.name}
        </h2>
        <div className="role">
          {person.role} · {d.name}
        </div>
        <div className="status">
          <span className={`chip ${presenceTone(person)}`}>{presenceLabel(person)}</span>
          <span className={`chip ${state.tone}`}>{state.label}</span>
        </div>
      </div>
      <div className="pb">
        <div className="kpis four">
          {kpis.map(([k, v, late]) => (
            <div className="kpi" key={k}>
              <div className="k">{k}</div>
              <div className={`v${late ? ' late' : ''}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="note">
          {person.name.split(' ')[0]}'s task list, assigning and delegating come in the next step. The seating is generated, not your real office layout.
        </div>
      </div>
    </>
  );
}
