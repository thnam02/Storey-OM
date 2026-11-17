import { peopleIn } from '../data/metrics';
import { departmentById } from '../data/sample';
import type { Department } from '../data/types';
import { useSnapshot } from '../state/serverData';
import { useUiStore } from '../state/uiStore';
import { accent, Chip, Crumbs } from './ui';

/** Shown instead of a department the viewer can't open. */
export function LockedPanel({ dept }: { dept: Department }) {
  const { viewer, team } = useSnapshot();
  const { selectDept } = useUiStore.getState();
  const own = viewer ? departmentById[viewer.departmentId] : null;

  return (
    <>
      <div className="ph" style={accent(dept.color)}>
        <Crumbs parts={[{ label: 'Company HQ', onClick: () => selectDept(null) }, { label: dept.level ? `Level ${dept.level} · ${dept.name}` : dept.name }]} />
        <h2>
          <span className="swatch" />
          {dept.name}
        </h2>
        <div className="status">
          <Chip tone="muted">No access</Chip>
          <span className="sub">{peopleIn(team, dept.id).length} people</span>
        </div>
      </div>
      <div className="pb">
        {viewer?.role === 'employee' ? (
          <>
            <div className="note">You can see your own desk and tasks. Managers see their department's team and records.</div>
            <div>
              <button className="btn primary" type="button" onClick={() => selectDept(null)}>
                Back to my desk
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="note">
              {own ? `As a manager you can open ${own.name}. ` : ''}Only directors can open other departments' teams, tasks and records.
            </div>
            {own && (
              <div>
                <button className="btn primary" type="button" onClick={() => selectDept(own.id)}>
                  Open {own.name}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
