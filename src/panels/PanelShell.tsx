import { useLayoutEffect, useRef } from 'react';
import { departmentById } from '../data/sample';
import { useDataStore } from '../state/dataStore';
import { useUiStore } from '../state/uiStore';
import { DepartmentPanel } from './DepartmentPanel';
import { Overview } from './Overview';
import { PersonSummary } from './PersonSummary';

/**
 * The side panel beside the 3D view. Shows the company overview, an open
 * department (Team and Workspace tabs), or one person, following the selection.
 */
export function PanelShell() {
  const deptId = useUiStore((s) => s.selectedDeptId);
  const personId = useUiStore((s) => s.selectedEmployeeId);
  const tab = useUiStore((s) => s.deptTab);
  const team = useDataStore((s) => s.team);
  const person = personId ? team.employees.find((e) => e.id === personId) : undefined;
  const ref = useRef<HTMLElement>(null);

  // Start at the top when moving to another view; edits keep the scroll position.
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [deptId, personId, tab]);

  return (
    <aside className="panel" aria-live="polite" ref={ref}>
      {person ? <PersonSummary person={person} team={team} /> : deptId ? <DepartmentPanel dept={departmentById[deptId]} /> : <Overview />}
    </aside>
  );
}
