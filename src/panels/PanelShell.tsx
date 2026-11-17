import type { CSSProperties } from 'react';
import { DEPARTMENTS, departmentById, SAMPLE_TODAY_LABEL } from '../data/sample';
import { departmentStatus } from '../data/status';
import type { CompanyData, Department, TeamData } from '../data/types';
import { useUiStore } from '../state/uiStore';
import { PersonSummary } from './PersonSummary';

const accent = (d: Department) => ({ '--c': d.color }) as CSSProperties;
const where = (d: Department) => (d.level ? `Level ${d.level}` : 'Warehouse building');

/**
 * Placeholder side panel: the department list, a header for the open
 * department, and a person summary. Team and Workspace tabs and the full
 * person view come in step 3.
 */
export function PanelShell({ data, team }: { data: CompanyData; team: TeamData }) {
  const headcount = (id: Department['id']) => team.employees.filter((e) => e.departmentId === id).length;
  const selected = useUiStore((s) => s.selectedDeptId);
  const selectedPerson = useUiStore((s) => s.selectedEmployeeId);
  const hovered = useUiStore((s) => s.hoveredDeptId);
  const { selectDept, hoverDept } = useUiStore.getState();

  const person = selectedPerson ? team.employees.find((e) => e.id === selectedPerson) : undefined;
  if (person) return <PersonSummary person={person} team={team} />;

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
            Click a person on the floor plan to see how they're doing. The Team and Workspace tabs for {d.name} are coming next. Or go back to the{' '}
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
          <span className="sub">{team.employees.length} people across 5 office departments and the warehouse</span>
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
                    {where(d)} · {headcount(d.id)} people · {st.text}
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
