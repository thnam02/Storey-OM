import { useMemo, type ReactNode } from 'react';
import { departmentById, OFFICE_FLOORS } from '../../data/sample';
import type { CompanyData, Department, DepartmentId, TeamData } from '../../data/types';
import type { OfficeDepartmentId } from '../../layout/floorLayout';
import { sum } from '../../lib/format';
import { useUiStore } from '../../state/uiStore';
import { floorY, OFFICE } from '../constants';
import { BuildingHitArea } from '../interaction/BuildingHitArea';
import { FinanceDecor } from './decor/FinanceDecor';
import { ImportExportDecor } from './decor/ImportExportDecor';
import { ManagementDecor } from './decor/ManagementDecor';
import { MarketingDecor } from './decor/MarketingDecor';
import { SalesDecor } from './decor/SalesDecor';
import { buildFloorPlans } from './floorPlans';
import { FloorShell } from './FloorShell';
import { GeneratedFurniture } from './GeneratedFurniture';
import { Roof } from './Roof';

function decorFor(dept: Department, data: CompanyData): ReactNode {
  switch (dept.id) {
    case 'import-export':
      return <ImportExportDecor color={dept.color} />;
    case 'sales':
      return <SalesDecor color={dept.color} stages={data.sales.stages} />;
    case 'marketing':
      return <MarketingDecor leads={sum(data.marketing.campaigns, (c) => c.leads)} />;
    case 'finance':
      return <FinanceDecor />;
    case 'management':
      return <ManagementDecor />;
    default:
      return null;
  }
}

/** Selected office level, or 0 when nothing (or the warehouse) is open. */
function openLevel(selected: DepartmentId | null) {
  return selected ? departmentById[selected].level : 0;
}

/**
 * Five stacked floors, one department each, plus the roof. Desks and meeting
 * furniture are generated from each floor's headcount. When a floor is open,
 * the floors above it and the roof are hidden so it can be seen from above.
 */
export function OfficeBuilding({ data, team }: { data: CompanyData; team: TeamData }) {
  const level = useUiStore((s) => openLevel(s.selectedDeptId));
  const plans = useMemo(() => buildFloorPlans(team.employees), [team.employees]);
  return (
    <>
      {OFFICE_FLOORS.map((dept) => {
        const visible = !(level && dept.level > level);
        const plan = plans.get(dept.id as OfficeDepartmentId);
        return (
          <group key={dept.id} position={[OFFICE.x, floorY(dept.level), OFFICE.z]} visible={visible}>
            <FloorShell dept={dept} />
            {decorFor(dept, data)}
            {plan && <GeneratedFurniture layout={plan.layout} />}
            {visible && (
              <BuildingHitArea
                id={dept.id}
                color={dept.color}
                center={[0, OFFICE.H / 2, 0]}
                hitSize={[OFFICE.W + 0.3, OFFICE.H, OFFICE.D + 0.3]}
                glowSize={[OFFICE.W + 0.5, OFFICE.H - 0.08, OFFICE.D + 0.5]}
              />
            )}
          </group>
        );
      })}
      <Roof visible={!level} />
    </>
  );
}
