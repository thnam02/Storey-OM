import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import type { Employee } from '../../data/types';
import type { Vec3 } from '../constants';
import { carton, cylinderGeometry, M } from '../materials';
import { ANCHOR_Y, HI_VIS, StandingFigure } from '../people/Figures';
import { PersonNode } from '../people/PersonNode';
import { Box, Part } from '../props/primitives';

const RANGE = 6.4;
const SPEED = 1.8;
const PAUSE = 1.5;
const WHEEL_ROT: Vec3 = [Math.PI / 2, 0, 0];

interface Driver {
  person: Employee;
  ringColor: string;
  open: boolean;
}

/**
 * Forklift driving up and down the front aisle. Still when motion is reduced.
 * With a driver, the whole forklift is their click target and carries their ring.
 */
export function Forklift({ animate, driver }: { animate: boolean; driver?: Driver }) {
  const ref = useRef<THREE.Group>(null);
  const state = useRef({ dir: 1, pause: 0 });

  useFrame((_, rawDt) => {
    const f = ref.current;
    if (!f || !animate) return;
    const dt = Math.min(0.05, rawDt);
    const s = state.current;
    if (s.pause > 0) {
      s.pause -= dt;
      return;
    }
    f.position.x += s.dir * SPEED * dt;
    if (Math.abs(f.position.x) > RANGE) {
      f.position.x = Math.max(-RANGE, Math.min(RANGE, f.position.x));
      s.dir *= -1;
      s.pause = PAUSE;
    }
    f.rotation.y = s.dir > 0 ? 0 : Math.PI;
  });

  const body = (
    <>
      <Box s={[1.4, 0.55, 0.95]} m={M.yellow} p={[0, 0.6, 0]} />
      <Box s={[0.5, 0.4, 0.9]} m={M.dark} p={[-0.55, 0.95, 0]} />
      {([[-0.45, 0.42], [0.45, 0.42], [-0.45, -0.42], [0.45, -0.42]] as const).map(([x, z], i) => (
        <Box key={i} s={[0.06, 1.0, 0.06]} m={M.dark} p={[x * 0.6, 1.4, z]} cast={false} />
      ))}
      <Box s={[0.9, 0.06, 0.95]} m={M.yellow} p={[-0.05, 1.9, 0]} />
      <Box s={[0.08, 2.0, 0.08]} m={M.dark} p={[0.78, 1.25, 0.3]} />
      <Box s={[0.08, 2.0, 0.08]} m={M.dark} p={[0.78, 1.25, -0.3]} />
      <Box s={[0.9, 0.05, 0.12]} m={M.leg} p={[1.2, 0.45, 0.25]} cast={false} />
      <Box s={[0.9, 0.05, 0.12]} m={M.leg} p={[1.2, 0.45, -0.25]} cast={false} />
      <Box s={[0.9, 0.1, 0.8]} m={M.pallet} p={[1.2, 0.53, 0]} cast={false} />
      <Box s={[0.8, 0.7, 0.75]} m={carton(0)} p={[1.2, 0.93, 0]} />
      {([[-0.45, 0.5], [0.45, 0.5], [-0.45, -0.5], [0.45, -0.5]] as const).map(([x, z], i) => (
        <Part key={i} g={cylinderGeometry(0.24, 0.24, 0.16, 12)} m={M.tyre} p={[x, 0.3, z]} rot={WHEEL_ROT} />
      ))}
      <group position={[-0.2, 0.5, 0]} scale={0.8}>
        <StandingFigure personId={driver?.person.id ?? 'forklift-driver'} shirt={HI_VIS} />
      </group>
    </>
  );

  return (
    <group ref={ref} position={[-5, 0.3, 2.4]}>
      {driver ? (
        <PersonNode person={driver.person} ringColor={driver.ringColor} open={driver.open} animate={animate} anchorY={ANCHOR_Y.forklift} ringScale={2.2}>
          {body}
        </PersonNode>
      ) : (
        body
      )}
    </group>
  );
}
