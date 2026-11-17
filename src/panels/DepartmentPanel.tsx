import type { KeyboardEvent } from 'react';
import { peopleIn } from '../data/metrics';
import { departmentStatus } from '../data/status';
import type { Department } from '../data/types';
import { useSnapshot } from '../state/serverData';
import { useUiStore, type DeptTab } from '../state/uiStore';
import { TeamTab } from './TeamTab';
import { accent, Chip, Crumbs } from './ui';
import { WORKSPACES } from './workspace';

/** Header with status and the Team / Workspace tabs for one department. */
export function DepartmentPanel({ dept }: { dept: Department }) {
  const data = useSnapshot().company;
  const team = useSnapshot().team;
  const tab = useUiStore((s) => s.deptTab);
  const { selectDept, setDeptTab } = useUiStore.getState();
  const st = departmentStatus(dept.id, data);
  const tabs: [DeptTab, string][] = [
    ['team', `Team (${peopleIn(team, dept.id).length})`],
    ['workspace', dept.id === 'management' ? 'Company' : 'Workspace'],
  ];
  const Workspace = WORKSPACES[dept.id];

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = tabs.findIndex(([id]) => id === tab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]![0];
    setDeptTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <>
      <div className="ph" style={accent(dept.color)}>
        <Crumbs parts={[{ label: 'Company HQ', onClick: () => selectDept(null) }, { label: dept.level ? `Level ${dept.level} · ${dept.name}` : dept.name }]} />
        <h2>
          <span className="swatch" />
          {dept.name}
        </h2>
        <div className="status">
          <Chip tone={st.tone}>{st.chip}</Chip>
          <span className="sub">{st.text}</span>
        </div>
        <div className="tabs" role="tablist" aria-label={`${dept.name} views`} onKeyDown={onKeyDown}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="dept-tabpanel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setDeptTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="pb" id="dept-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} style={accent(dept.color)}>
        {tab === 'team' ? <TeamTab dept={dept} /> : <Workspace dept={dept} />}
      </div>
    </>
  );
}
