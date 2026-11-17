import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { DEPARTMENTS } from '../data/sample';
import { departmentStatus } from '../data/status';
import type { CompanyData, TeamData } from '../data/types';
import { workloadByEmployee } from '../data/workload';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useUiStore } from '../state/uiStore';
import { CameraRig } from './CameraRig';
import { DeptLabel } from './labels/DeptLabel';
import { LabelProjector } from './labels/LabelProjector';
import { Lights } from './Lights';
import { OfficeBuilding } from './office/OfficeBuilding';
import { Ground } from './site/Ground';
import { Traffic } from './site/Traffic';
import { Trees } from './site/Trees';
import { Warehouse } from './warehouse/Warehouse';

/** Signs are drawn onto canvases with the Sora font, so wait for it (at most 1.5 s). */
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const timeout = new Promise((r) => setTimeout(r, 1500));
    Promise.race([document.fonts?.ready ?? Promise.resolve(), timeout]).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/**
 * The 3D company site. Navigation only: it reads company data and UI state,
 * and reports hover and selection through the UI store.
 */
export function SiteCanvas({ data, team }: { data: CompanyData; team: TeamData }) {
  const fontsReady = useFontsReady();
  const reducedMotion = useReducedMotion();
  const hoverDept = useUiStore((s) => s.hoverDept);
  const load = useMemo(() => workloadByEmployee(team.employees, team.tasks, team.today, team.weekStart), [team]);
  const warehouseTeam = useMemo(() => team.employees.filter((e) => e.departmentId === 'warehouse'), [team.employees]);

  if (!fontsReady) return null;

  return (
    <>
      <Canvas
        // Match three r128: no colour management, linear output, no tone mapping.
        legacy
        linear
        flat
        shadows="percentage"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ cursor: 'grab' }}
        onPointerLeave={() => hoverDept(null)}
        fallback={<div className="fail">The 3D view could not load, so only the CRM panels are available.</div>}
      >
        <CameraRig reducedMotion={reducedMotion} />
        <Lights />
        <Ground />
        <Trees />
        <Traffic animate={!reducedMotion} />
        <OfficeBuilding data={data} employees={team.employees} load={load} animate={!reducedMotion} />
        <Warehouse data={data.warehouse} team={warehouseTeam} load={load} animate={!reducedMotion} />
        <LabelProjector />
      </Canvas>
      <div className="labels">
        {DEPARTMENTS.map((d) => (
          <DeptLabel key={d.id} dept={d} flagged={departmentStatus(d.id, data).tone === 'warn'} />
        ))}
      </div>
    </>
  );
}
