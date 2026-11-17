import type { ReactNode } from 'react';
import { departmentById, OFFICE_FLOORS } from '../../data/sample';
import type { CompanyData, Department, DepartmentId } from '../../data/types';
import { sum } from '../../lib/format';
import { useUiStore } from '../../state/uiStore';
import { floorY, OFFICE } from '../constants';
import { BuildingHitArea } from '../interaction/BuildingHitArea';
import { FinanceFurniture } from './furniture/FinanceFurniture';
import { ImportExportFurniture } from './furniture/ImportExportFurniture';
import { ManagementFurniture } from './furniture/ManagementFurniture';
import { MarketingFurniture } from './furniture/MarketingFurniture';
import { SalesFurniture } from './furniture/SalesFurniture';
import { FloorShell } from './FloorShell';
import { Roof } from './Roof';

function furnitureFor(dept: Department, data: CompanyData): ReactNode {
  switch (dept.id) {
    case 'import-export':
      return <ImportExportFurniture color={dept.color} />;
    case 'sales':
      return <SalesFurniture color={dept.color} stages={data.sales.stages} />;
    case 'marketing':
      return <MarketingFurniture leads={sum(data.marketing.campaigns, (c) => c.leads)} />;
    case 'finance':
      return <FinanceFurniture />;
    case 'management':
      return <ManagementFurniture />;
    default:
      return null;
  }
}

/** Selected office level, or 0 when nothing (or the warehouse) is open. */
function openLevel(selected: DepartmentId | null) {
  return selected ? departmentById[selected].level : 0;
}

/**
 * Five stacked floors, one department each, plus the roof. When a floor is
 * open, the floors above it and the roof are hidden so it can be seen from above.
 */
export function OfficeBuilding({ data }: { data: CompanyData }) {
  const level = useUiStore((s) => openLevel(s.selectedDeptId));
  return (
    <>
      {OFFICE_FLOORS.map((dept) => {
        const visible = !(level && dept.level > level);
        return (
          <group key={dept.id} position={[OFFICE.x, floorY(dept.level), OFFICE.z]} visible={visible}>
            <FloorShell dept={dept} />
            {furnitureFor(dept, data)}
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
