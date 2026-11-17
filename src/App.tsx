import type { CSSProperties } from 'react';
import type { Employee } from './data/types';
import { WORKLOAD_STATE } from './data/workload';
import { PanelShell } from './panels/PanelShell';
import { SiteCanvas } from './scene/SiteCanvas';
import { useSnapshotQuery } from './state/serverData';
import { useHashSync } from './state/useHashSync';
import { useUiStore } from './state/uiStore';

const NO_EMPLOYEES: Employee[] = [];

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <path d="M15 3 27 9.5v11L15 27 3 20.5v-11Z" fill="#2c6a86" />
      <path d="M15 3 27 9.5 15 16 3 9.5Z" fill="#5fa0bd" />
      <path d="M15 16v11l12-6.5v-11Z" fill="#1f4e63" />
    </svg>
  );
}

export default function App() {
  const selected = useUiStore((s) => s.selectedDeptId);
  const autoRotate = useUiStore((s) => s.autoRotate);
  const { selectDept, resetCamera, toggleAutoRotate } = useUiStore.getState();
  const snapshot = useSnapshotQuery();
  const snap = snapshot.data;
  useHashSync(snap?.team.employees ?? NO_EMPLOYEES);

  return (
    <>
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>Company HQ</h1>
            <p>Storey · Manager view</p>
          </div>
        </div>
        {snap?.isSample && <span className="pill">Sample data</span>}
        <span className="spacer" />
        <button className="btn" type="button" onClick={() => selectDept(null)}>
          Whole building
        </button>
        <button className="btn" type="button" onClick={resetCamera}>
          Reset view
        </button>
        <button className="btn" type="button" aria-pressed={autoRotate} onClick={toggleAutoRotate}>
          Auto-rotate
        </button>
      </header>
      {snap ? (
        <main>
          <div className="stage">
            <SiteCanvas data={snap.company} team={snap.team} />
            <div className="hint">
              {selected
                ? 'Click a person to see their tasks · Drag to rotate · Scroll to zoom'
                : 'Drag to rotate · Right-drag to pan · Scroll to zoom · Click a floor or the warehouse'}
            </div>
            {selected && (
              <div className="legend" aria-hidden="true">
                {(['ok', 'busy', 'late'] as const).map((k) => (
                  <span key={k}>
                    <i style={{ '--w': WORKLOAD_STATE[k].color } as CSSProperties} />
                    {k === 'late' ? 'Overdue tasks' : WORKLOAD_STATE[k].label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <PanelShell />
        </main>
      ) : (
        <main>
          <div className="stage">
            <div className="fail" role={snapshot.isError ? 'alert' : 'status'}>
              {snapshot.isError ? (
                <div>
                  <p>The company data could not load: {snapshot.error.message}</p>
                  <button className="btn" type="button" onClick={() => snapshot.refetch()}>
                    Try again
                  </button>
                </div>
              ) : (
                'Loading the company…'
              )}
            </div>
          </div>
          <aside className="panel" />
        </main>
      )}
    </>
  );
}
