import { IS_SAMPLE_DATA, SAMPLE_DATA } from './data/sample';
import { SAMPLE_TEAM } from './data/sampleTeam';
import { PanelShell } from './panels/PanelShell';
import { SiteCanvas } from './scene/SiteCanvas';
import { useHashSync } from './state/useHashSync';
import { useUiStore } from './state/uiStore';

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
  useHashSync();
  const selected = useUiStore((s) => s.selectedDeptId);
  const autoRotate = useUiStore((s) => s.autoRotate);
  const { selectDept, resetCamera, toggleAutoRotate } = useUiStore.getState();
  const data = SAMPLE_DATA;
  const team = SAMPLE_TEAM;

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
        {IS_SAMPLE_DATA && <span className="pill">Sample data</span>}
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
      <main>
        <div className="stage">
          <SiteCanvas data={data} team={team} />
          <div className="hint">
            {selected
              ? 'Drag to rotate · Scroll to zoom · Click another floor to switch'
              : 'Drag to rotate · Right-drag to pan · Scroll to zoom · Click a floor or the warehouse'}
          </div>
        </div>
        <aside className="panel" aria-live="polite">
          <PanelShell data={data} team={team} />
        </aside>
      </main>
    </>
  );
}
