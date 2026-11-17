import { useMemo } from 'react';
import type { Employee } from '../../data/types';
import type { Workload } from '../../data/workload';
import { WORKLOAD_STATE } from '../../data/workload';
import { seedFor, type Rect } from '../../layout/floorLayout';
import { createRandom } from '../../lib/seededRandom';
import { ANCHOR_Y, HI_VIS, StandingFigure } from './Figures';
import { PersonNode } from './PersonNode';
import { Walker } from './Walker';

/** Warehouse-local areas (see warehouse/Warehouse.tsx): the aisle behind the front racks, and the open front floor. */
const AISLE: Rect = { x0: -7.5, x1: 7.5, z0: -1.95, z1: -1.75 };
const FRONT: Rect = { x0: -4.2, x1: 5.2, z0: 3.4, z1: 5.9 };
const AISLE_SPEED: [number, number] = [0.7, 1.1];
const FRONT_SPEED: [number, number] = [0.8, 1.2];
const FLOOR_TOP = 0.3;

interface Props {
  team: Employee[];
  load: Map<string, Workload>;
  open: boolean;
  animate: boolean;
}

/** On-shift warehouse staff walking the floor. Off-shift staff aren't drawn; the forklift driver rides the forklift. */
export function WarehousePeople({ team, load, open, animate }: Props) {
  const walkers = useMemo(
    () =>
      team
        .filter((p) => p.presence === 'on_floor' && p.activity !== 'forklift')
        .map((p) => ({ p, inAisle: createRandom(seedFor(`aisle:${p.id}`))() < 0.4 })),
    [team],
  );
  return (
    <>
      {walkers.map(({ p, inAisle }) => (
        <Walker key={p.id} personId={p.id} area={inAisle ? AISLE : FRONT} speed={inAisle ? AISLE_SPEED : FRONT_SPEED} y={FLOOR_TOP} animate={animate}>
          <PersonNode person={p} ringColor={WORKLOAD_STATE[load.get(p.id)?.state ?? 'ok'].color} open={open} animate={animate} anchorY={ANCHOR_Y.standing}>
            <StandingFigure personId={p.id} shirt={HI_VIS} />
          </PersonNode>
        </Walker>
      ))}
    </>
  );
}
