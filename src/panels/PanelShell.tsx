import type { CSSProperties } from 'react';
import { DEPARTMENTS, departmentById, HEADCOUNT, SAMPLE_TODAY_LABEL } from '../data/sample';
import { departmentStatus } from '../data/status';
import type { CompanyData, Department } from '../data/types';
import { useUiStore } from '../state/uiStore';

const accent = (d: Department) => ({ '--c': d.color }) as CSSProperties;
const where = (d: Department) => (d.level ? `Level ${d.level}` : 'Warehouse building');

/**
 * Placeholder side panel for step 1: the department list and a header for the
 * open department. The Team and Workspace tabs and the person view come in step 3.
 */
export function PanelShell({ data }: { data: CompanyData }) {
  const selected = useUiStore((s) => s.selectedDeptId);
  const hovered = useUiStore((s) => s.hoveredDeptId);
  const { selectDept, hoverDept } = useUiStore.getState();

  if (selected) {
    const d = departmentById[selected];
    const st = departmentStatus(d.id, data);
    return (
      <>
        <div className="ph" style={accent(d)}>
          <div className="crumbs">
            <button type="button" onClick={() => selectDept(null)}>
              Company HQ
            </button>
            <span aria-hidden="true">›</span>
            <span>{d.level ? `Level ${d.level} · ${d.name}` : d.name}</span>
          </div>
          <h2>
            <span className="swatch" />
            {d.name}
          </h2>
          <div className="status">
            <span className={`chip ${st.tone}`}>{st.chip}</span>
            <span className="sub">{st.text}</span>
          </div>
        </div>
        <div className="pb">
          <div className="note">
            The Team and Workspace tabs for {d.name} are coming next. For now, use the floor view on the left, or go back to the{' '}
            <button type="button" className="link" onClick={() => selectDept(null)}>
              whole building
            </button>
            .
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ph">
        <div className="crumbs">
          <span>Company HQ · {SAMPLE_TODAY_LABEL}</span>
        </div>
        <h2>Company overview</h2>
        <div className="status">
          <span className="sub">5 office departments and the warehouse</span>
        </div>
      </div>
      <div className="pb">
        <section>
          <h3>
            Departments <small>Click to open the floor</small>
          </h3>
          <div className="list">
            {DEPARTMENTS.map((d) => {
              const st = departmentStatus(d.id, data);
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`ditem${hovered === d.id ? ' hot' : ''}`}
                  style={accent(d)}
                  onClick={() => selectDept(d.id)}
                  onPointerEnter={() => hoverDept(d.id)}
                  onPointerLeave={() => hoverDept(null)}
                >
                  <span className="swatch" />
                  <b>{d.name}</b>
                  <span className={`chip ${st.tone}`}>{st.chip}</span>
                  <span className="sub">
                    {where(d)} · {HEADCOUNT[d.id]} people · {st.text}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <div className="note">
          Sample data. Click a floor or the warehouse to open it. Team lists, tasks and each department's workspace come in the next steps.
        </div>
      </div>
    </>
  );
}
