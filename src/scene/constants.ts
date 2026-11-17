import type { DepartmentId } from '../data/types';

export type Vec3 = [number, number, number];

/** Office building footprint. Each floor is W × D, H tall, stacked from y = 0. */
export const OFFICE = { x: -9, z: -1.5, W: 14, D: 10, H: 3.2 } as const;
/** Top of the floor slab: furniture stands on this. */
export const FLOOR_Y = 0.37;

/** Warehouse building footprint. */
export const WAREHOUSE = { x: 11.5, z: -2.5, W: 17, D: 13, H: 6.2 } as const;

/** Seeds for generated scenery. Changing one moves that scenery. */
export const SEEDS = {
  racks: 20261117,
  cartons: 1117,
  trees: 2026,
} as const;

/** Camera presets. Orthographic, so "zoom" scales the view instead of moving the camera. */
export const CAMERA = {
  home: { target: [1.5, 4.5, 2] as Vec3, offset: [46, 40, 54] as Vec3, zoom: 1 },
  planOffset: [26, 58, 34] as Vec3,
  tweenMs: 850,
  minZoom: 0.5,
  maxZoom: 5,
  minPolarAngle: 0.15,
  maxPolarAngle: 1.32,
  /** Visible height in world units for a given aspect ratio. */
  viewHeight: (aspect: number) => Math.max(36, 56 / aspect),
} as const;

export interface BuildingView {
  /** Camera target when this department is open. */
  plan: Vec3;
  planZoom: number;
  /** Where the department label sits, and which side of the point it hangs from. */
  labelAnchor: Vec3;
  labelAlign: 'left' | 'top';
}

const floorY = (level: number) => (level - 1) * OFFICE.H;

export function buildingView(id: DepartmentId, level: number): BuildingView {
  if (id === 'warehouse') {
    return {
      plan: [WAREHOUSE.x, 1.2, WAREHOUSE.z + 0.8],
      planZoom: 1.7,
      labelAnchor: [WAREHOUSE.x - 2, WAREHOUSE.H + 0.9, WAREHOUSE.z + WAREHOUSE.D / 2],
      labelAlign: 'top',
    };
  }
  const y0 = floorY(level);
  return {
    plan: [OFFICE.x + 0.4, y0 + 1.0, OFFICE.z + 0.6],
    planZoom: 2.35,
    labelAnchor: [OFFICE.x - OFFICE.W / 2 - 0.3, y0 + 1.6, OFFICE.z + OFFICE.D / 2],
    labelAlign: 'left',
  };
}

export { floorY };
