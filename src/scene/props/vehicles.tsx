import type { Ref } from 'react';
import type * as THREE from 'three';
import { cylinderGeometry, M, mat } from '../materials';
import type { Vec3 } from '../constants';
import { Box, Part } from './primitives';

const WHEEL_ROT: Vec3 = [Math.PI / 2, 0, 0];

interface VehicleProps {
  p: Vec3;
  ry?: number;
  ref?: Ref<THREE.Group>;
}

export function Car({ color, p, ry = 0, ref }: VehicleProps & { color: number }) {
  return (
    <group ref={ref} position={p} rotation-y={ry}>
      <Box s={[3.6, 0.7, 1.6]} m={mat(color, { roughness: 0.5 })} p={[0, 0.6, 0]} />
      <Box s={[2.0, 0.55, 1.45]} m={M.cabGlass} p={[-0.2, 1.22, 0]} />
      {([[-1.15, 0.8], [1.15, 0.8], [-1.15, -0.8], [1.15, -0.8]] as const).map(([x, z], i) => (
        <Part key={i} g={cylinderGeometry(0.32, 0.32, 0.24, 14)} m={M.tyre} p={[x, 0.32, z]} rot={WHEEL_ROT} />
      ))}
    </group>
  );
}

export function Truck({ stripe, p, ry = 0, ref }: VehicleProps & { stripe: string }) {
  return (
    <group ref={ref} position={p} rotation-y={ry}>
      <Box s={[7, 2.6, 2.4]} m={M.white} p={[0, 1.95, 0]} />
      <Box s={[7.02, 0.32, 2.42]} m={mat(stripe, { roughness: 0.6 })} p={[0, 1.35, 0]} cast={false} />
      <Box s={[8.4, 0.3, 2.0]} m={M.dark} p={[0.6, 0.62, 0]} cast={false} />
      <Box s={[1.8, 2.2, 2.3]} m={M.truckCab} p={[4.45, 1.7, 0]} />
      <Box s={[0.06, 0.9, 2.0]} m={M.windscreen} p={[5.36, 2.15, 0]} cast={false} />
      {[-2.6, -1.5, 4.2].flatMap((x) =>
        [1.1, -1.1].map((z) => (
          <Part key={`${x}${z}`} g={cylinderGeometry(0.46, 0.46, 0.34, 14)} m={M.tyre} p={[x, 0.46, z]} rot={WHEEL_ROT} />
        )),
      )}
    </group>
  );
}
