import { useMemo } from 'react';
import * as THREE from 'three';
import { departmentById } from '../../data/sample';
import type { WarehouseData } from '../../data/types';
import { useUiStore } from '../../state/uiStore';
import { SEEDS, WAREHOUSE } from '../constants';
import { BuildingHitArea } from '../interaction/BuildingHitArea';
import { M, mat } from '../materials';
import { CartonStack } from '../props/furniture';
import { Box, Sign } from '../props/primitives';
import { Truck } from '../props/vehicles';
import { corrugatedTexture, textTexture } from '../textures';
import { Forklift } from './Forklift';
import { Racks } from './Racks';

const { W, D, H } = WAREHOUSE;
const dept = departmentById.warehouse;

const FRONT_COLUMNS = [-W / 2 + 0.2, -2.8, 2.8, W / 2 - 0.2];
const SIDE_COLUMNS = [-D / 2 + 0.2, -2.2, 2.2];
const TRUSS_Z = Array.from({ length: Math.ceil((D - 1.8) / 2.6) }, (_, i) => -D / 2 + 1.8 + i * 2.6).filter((z) => z < D / 2);
const FLOOR_PALLETS: [number, number][] = [[-6.6, 4.8], [-5.4, 4.8], [-6.0, 3.6], [6.2, 4.6]];

/**
 * Separate warehouse building: corrugated back and side walls, open front,
 * racking by zone, a forklift and the loading dock with a truck.
 * The fascia and roof trusses hide while the warehouse is open.
 */
export function Warehouse({ data, animate }: { data: WarehouseData; animate: boolean }) {
  const open = useUiStore((s) => s.selectedDeptId === 'warehouse');
  const walls = useMemo(
    () => ({
      back: new THREE.MeshStandardMaterial({ map: corrugatedTexture(W * 1.2), roughness: 0.8 }),
      side: new THREE.MeshStandardMaterial({ map: corrugatedTexture(D * 1.2), roughness: 0.8 }),
    }),
    [],
  );
  const band = mat(dept.color, { roughness: 0.6 });

  return (
    <>
      <group position={[WAREHOUSE.x, 0, WAREHOUSE.z]}>
        <Box s={[W, 0.3, D]} m={M.concrete} p={[0, 0.15, 0]} cast={false} />
        <Box s={[W - 0.8, 0.02, 0.1]} m={M.safetyLine} p={[0, 0.31, 0.15]} cast={false} receive={false} />
        <Box s={[W, H, 0.3]} m={walls.back} p={[0, H / 2, -D / 2 + 0.15]} />
        <Box s={[0.3, H, D]} m={walls.side} p={[-W / 2 + 0.15, H / 2, 0]} />
        <Box s={[W + 0.02, 0.3, 0.1]} m={band} p={[0, 0.15, D / 2 + 0.05]} cast={false} receive={false} />
        <Box s={[0.1, 0.3, D + 0.02]} m={band} p={[W / 2 + 0.05, 0.15, 0]} cast={false} receive={false} />
        {FRONT_COLUMNS.map((x) => (
          <Box key={x} s={[0.3, H - 1.2, 0.3]} m={M.column} p={[x, (H - 1.2) / 2, D / 2 - 0.15]} />
        ))}
        {SIDE_COLUMNS.map((z) => (
          <Box key={z} s={[0.3, H - 1.2, 0.3]} m={M.column} p={[W / 2 - 0.15, (H - 1.2) / 2, z]} />
        ))}

        <group visible={!open}>
          <Box s={[W, 1.2, 0.3]} m={M.fascia} p={[0, H - 0.6, D / 2 - 0.15]} cast={false} />
          <Box s={[0.3, 1.2, D]} m={M.fascia} p={[W / 2 - 0.15, H - 0.6, 0]} cast={false} />
          {TRUSS_Z.map((z) => (
            <Box key={z} s={[W - 0.4, 0.16, 0.16]} m={M.truss} p={[0, H - 0.15, z]} cast={false} receive={false} />
          ))}
          <Sign w={6.4} h={0.95} p={[-3.6, H - 0.6, D / 2 + 0.01]} map={textTexture('WAREHOUSE', { bg: dept.color, w: 640, h: 96 })} />
        </group>

        <Racks zones={data.zones} />
        {FLOOR_PALLETS.map(([x, z], i) => (
          <group key={i}>
            <Box s={[1.0, 0.12, 1.0]} m={M.pallet} p={[x, 0.36, z]} cast={false} />
            <CartonStack x={x} z={z} n={2 + (i % 2)} base={0.42} seed={SEEDS.cartons + i} />
          </group>
        ))}
        <Forklift animate={animate} />

        <BuildingHitArea
          id="warehouse"
          color={dept.color}
          center={[0, H / 2, 0]}
          hitSize={[W + 0.4, H, D + 0.4]}
          glowSize={[W + 0.6, H + 0.1, D + 0.6]}
        />
      </group>

      {/* loading dock */}
      <Truck stripe={dept.color} p={[WAREHOUSE.x + 4.2, 0.06, WAREHOUSE.z + D / 2 + 3.8]} ry={-Math.PI / 2} />
      <Box s={[4.4, 0.06, 8.6]} m={M.paving} p={[WAREHOUSE.x + 4.2, 0.07, WAREHOUSE.z + D / 2 + 4.3]} cast={false} />
    </>
  );
}
