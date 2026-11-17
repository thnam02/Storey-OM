import type { CSSProperties, ReactNode } from 'react';
import type { AppRole, Employee } from './data/types';
import { WORKLOAD_STATE } from './data/workload';
import { NoAccessCard, SignInCard } from './panels/account/SignIn';
import { ViewerControl } from './panels/account/ViewerControl';
import { PanelShell } from './panels/PanelShell';
import { SiteCanvas } from './scene/SiteCanvas';
import { SnapshotContext, useAccountQuery, useSnapshotQuery } from './state/serverData';
import { useHashSync } from './state/useHashSync';
import { useUiStore } from './state/uiStore';

const NO_EMPLOYEES: Employee[] = [];
const VIEW_NAME: Record<AppRole, string> = { director: 'Director view', manager: 'Manager view', employee: 'My desk' };

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <path d="M15 3 27 9.5v11L15 27 3 20.5v-11Z" fill="#2c6a86" />
      <path d="M15 3 27 9.5 15 16 3 9.5Z" fill="#5fa0bd" />
      <path d="M15 16v11l12-6.5v-11Z" fill="#1f4e63" />
    </svg>
  );
}

/** The stage with a message or card in place of the 3D view, and an empty panel. */
function Gate({ children }: { children: ReactNode }) {
  return (
    <main>
      <div className="stage">
        <div className="fail">{children}</div>
      </div>
      <aside className="panel" />
    </main>
  );
}

function Failed({ what, error, retry }: { what: string; error: Error; retry: () => void }) {
  return (
    <div role="alert">
      <p>
        {what} could not load: {error.message}
      </p>
      <button className="btn" type="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

export default function App() {
  const selected = useUiStore((s) => s.selectedDeptId);
  const autoRotate = useUiStore((s) => s.autoRotate);
  const { selectDept, resetCamera, toggleAutoRotate } = useUiStore.getState();
  const account = useAccountQuery();
  const snapshot = useSnapshotQuery(!!account.data);
  const snap = account.data ? snapshot.data : undefined;
  // The building shows once a manager or director is signed in.
  const ready = snap?.viewer ? snap : undefined;
  useHashSync(ready?.team.employees ?? NO_EMPLOYEES);

  let gate: ReactNode = null;
  if (account.isError) gate = <Failed what="Your account" error={account.error} retry={() => account.refetch()} />;
  else if (account.isPending) gate = <div role="status">Loading…</div>;
  else if (!account.data) gate = <SignInCard />;
  else if (snapshot.isError) gate = <Failed what="The company data" error={snapshot.error} retry={() => snapshot.refetch()} />;
  else if (!snap) gate = <div role="status">Loading the company…</div>;
  else if (!snap.viewer) gate = <NoAccessCard email={account.data.email} />;

  return (
    <>
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>Company HQ</h1>
            <p>Storey · {VIEW_NAME[snap?.viewer?.role ?? 'manager']}</p>
          </div>
        </div>
        {snap?.isSample && <span className="pill">Sample data</span>}
        <span className="spacer" />
        {ready && (
          <>
            <button className="btn" type="button" onClick={() => selectDept(null)}>
              Whole building
            </button>
            <button className="btn" type="button" onClick={resetCamera}>
              Reset view
            </button>
            <button className="btn" type="button" aria-pressed={autoRotate} onClick={toggleAutoRotate}>
              Auto-rotate
            </button>
            <ViewerControl snap={ready} />
          </>
        )}
      </header>
      {ready ? (
        <SnapshotContext.Provider value={ready}>
          <main>
            <div className="stage">
              <SiteCanvas data={ready.company} team={ready.team} viewer={ready.viewer} />
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
        </SnapshotContext.Provider>
      ) : (
        <Gate>{gate}</Gate>
      )}
    </>
  );
}
