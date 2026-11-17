import type { Department, Employee } from '../../data/types';
import type { Workload } from '../../data/workload';
import { ringColor } from '../../data/workload';
import { WALKWAY } from '../../layout/floorLayout';
import { FLOOR_Y } from '../constants';
import type { FloorPlan } from '../office/floorPlans';
import { ANCHOR_Y, SittingFigure, StandingFigure } from './Figures';
import { PersonNode } from './PersonNode';
import { Walker } from './Walker';

interface Props {
  dept: Department;
  plan: FloorPlan;
  team: Employee[];
  load: Map<string, Workload>;
  open: boolean;
  animate: boolean;
}

/** Everyone on site on one office floor: seated at their generated seat, or walking the front aisle. */
export function OfficePeople({ dept, plan, team, load, open, animate }: Props) {
  return (
    <>
      {team.map((p) => {
        const where = plan.placements.get(p.id);
        if (!where) return null;
        const ring = ringColor(load.get(p.id));
        if (where.kind === 'walking') {
          return (
            <Walker key={p.id} personId={p.id} area={WALKWAY} y={FLOOR_Y} animate={animate}>
              <PersonNode person={p} ringColor={ring} open={open} animate={animate} anchorY={ANCHOR_Y.standing}>
                <StandingFigure personId={p.id} shirt={dept.color} />
              </PersonNode>
            </Walker>
          );
        }
        return (
          <group key={p.id} position={[where.seat.x, FLOOR_Y, where.seat.z]}>
            <PersonNode person={p} ringColor={ring} open={open} animate={animate} anchorY={ANCHOR_Y.sitting}>
              <SittingFigure personId={p.id} shirt={dept.color} />
            </PersonNode>
          </group>
        );
      })}
    </>
  );
}
