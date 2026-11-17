import { OFFICE_FLOORS } from '../../data/sample';
import type { Employee } from '../../data/types';
import {
  FLOOR_SPECS,
  floorDemand,
  generateFloorLayout,
  seatPeople,
  seedFor,
  type FloorLayout,
  type OfficeDepartmentId,
  type Placement,
} from '../../layout/floorLayout';

export interface FloorPlan {
  layout: FloorLayout;
  /** Where each on-site person on this floor is, by employee id. */
  placements: Map<string, Placement>;
}

/** Generated layout and seating for every office floor, from the people on it. */
export function buildFloorPlans(employees: readonly Employee[]): Map<OfficeDepartmentId, FloorPlan> {
  return new Map(
    OFFICE_FLOORS.map((d) => {
      const id = d.id as OfficeDepartmentId;
      const team = employees.filter((e) => e.departmentId === id);
      const spec = FLOOR_SPECS[id];
      const layout = generateFloorLayout(spec, floorDemand(team, spec));
      return [id, { layout, placements: seatPeople(team, layout, seedFor(id)) }];
    }),
  );
}
