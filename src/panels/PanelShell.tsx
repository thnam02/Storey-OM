import { useLayoutEffect, useRef } from 'react';
import { departmentById } from '../data/sample';
import { useSnapshot } from '../state/serverData';
import { useUiStore } from '../state/uiStore';
import { DepartmentPanel } from './DepartmentPanel';
import { LockedPanel } from './LockedPanel';
import { Overview } from './Overview';
import { PersonView } from './person/PersonView';

/**
 * The side panel beside the 3D view. Shows the company overview, an open
 * department (Team and Workspace tabs), or one person, following the selection.
 */
export function PanelShell() {
  const deptId = useUiStore((s) => s.selectedDeptId);
  const personId = useUiStore((s) => s.selectedEmployeeId);
  const tab = useUiStore((s) => s.deptTab);
  const locked = useUiStore((s) => s.lockedDeptId);
  const { team, viewer } = useSnapshot();
  const employees = team.employees;
  const person = personId ? employees.find((e) => e.id === personId) : undefined;
  const ref = useRef<HTMLElement>(null);

  // Start at the top when moving to another view; edits keep the scroll position.
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [deptId, personId, tab, locked]);

  return (
    <aside className="panel" aria-live="polite" ref={ref}>
      {person ? (
        <PersonView key={person.id} person={person} />
      ) : viewer?.role === 'employee' && !locked ? (
        // An employee's home is their own desk, whatever floor is open.
        <PersonView key={viewer.id} person={employees.find((e) => e.id === viewer.id)!} />
      ) : deptId ? (
        <DepartmentPanel dept={departmentById[deptId]} />
      ) : locked ? (
        <LockedPanel dept={departmentById[locked]} />
      ) : (
        <Overview />
      )}
    </aside>
  );
}
