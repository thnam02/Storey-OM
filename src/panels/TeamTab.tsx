import type { CSSProperties } from 'react';
import { byUrgency, loadOf, peopleIn, teamWorkload, totals } from '../data/metrics';
import { firstName, presenceLabel } from '../data/people';
import type { Department, Employee } from '../data/types';
import { WORKLOAD_STATE, type Workload } from '../data/workload';
import { formatWeekdayDay } from '../lib/dates';
import { useDataStore } from '../state/dataStore';
import { useUiStore } from '../state/uiStore';
import { Kpi, Section } from './ui';

function PersonRow({ person, workload }: { person: Employee; workload: Workload }) {
  const hot = useUiStore((s) => s.hoveredEmployeeId === person.id);
  const { selectEmployee, hoverEmployee } = useUiStore.getState();
  const state = WORKLOAD_STATE[workload.state];
  return (
    <button
      type="button"
      className={`person${hot ? ' hot' : ''}`}
      style={{ '--w': state.color } as CSSProperties}
      aria-label={`${person.name}, ${person.role}. ${state.label}. ${workload.open} open${workload.late ? `, ${workload.late} overdue` : ''}`}
      onClick={() => {
        hoverEmployee(null);
        selectEmployee(person.id, person.departmentId);
      }}
      onPointerEnter={() => hoverEmployee(person.id)}
      onPointerLeave={() => hoverEmployee(null)}
    >
      <span className="ring" />
      <b>{person.name}</b>
      <span className="counts">
        {workload.open} open
        <br />
        {workload.late ? <span className="l">{workload.late} overdue</span> : `${workload.doneThisWeek} done this week`}
      </span>
      <span className="sub">
        {person.role} · {presenceLabel(person)}
      </span>
    </button>
  );
}

/** Everyone in the department with their task counts, overdue first. */
export function TeamTab({ dept }: { dept: Department }) {
  const team = useDataStore((s) => s.team);
  const load = teamWorkload(team);
  const people = byUrgency(peopleIn(team, dept.id), load);
  const onSite = people.filter((p) => p.presence !== 'off_shift');
  const offShift = people.filter((p) => p.presence === 'off_shift');
  const sum = totals(people, load);
  const lateNames = people.filter((p) => loadOf(load, p.id).late).map((p) => firstName(p.name));
  const row = (p: Employee) => <PersonRow key={p.id} person={p} workload={loadOf(load, p.id)} />;

  return (
    <>
      <div className="kpis">
        <Kpi k="Open tasks" v={sum.open} s={`${people.length} people`} />
        <Kpi k="Overdue" v={sum.late} s={lateNames.length ? lateNames.slice(0, 3).join(', ') : 'none'} late={sum.late > 0} />
        <Kpi k="Done this week" v={sum.doneThisWeek} s={`since ${formatWeekdayDay(team.weekStart)}`} />
      </div>
      <Section title={dept.building === 'warehouse' ? 'On shift now' : 'People'} small="Overdue first">
        <div className="list">{onSite.map(row)}</div>
      </Section>
      {offShift.length > 0 && (
        <Section title="Off shift" small={`${offShift.length} people`}>
          <div className="list">{offShift.map(row)}</div>
        </Section>
      )}
      <div className="note">
        Click a person here or on the floor plan to see their tasks, assign new work or delegate. The seating is generated, not your real
        office layout.
      </div>
    </>
  );
}
