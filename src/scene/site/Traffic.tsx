import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { departmentById } from '../../data/sample';
import { Car, Truck } from '../props/vehicles';

const WRAP = 70;
/** Speeds in units per second; negative drives right to left on the far lane. */
const SPEEDS = [5.5, -7, 6.5];

/** A truck and two cars driving along the road, wrapping at the edges. */
export function Traffic({ animate }: { animate: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, rawDt) => {
    if (!animate) return;
    const dt = Math.min(0.05, rawDt);
    refs.current.forEach((v, i) => {
      if (!v) return;
      v.position.x += (SPEEDS[i] ?? 0) * dt;
      if (v.position.x > WRAP) v.position.x = -WRAP;
      if (v.position.x < -WRAP) v.position.x = WRAP;
    });
  });

  return (
    <>
      <Truck ref={(g) => { refs.current[0] = g; }} stripe={departmentById['import-export'].color} p={[-40, 0.06, 17.6]} />
      <Car ref={(g) => { refs.current[1] = g; }} color={0xd9773a} p={[30, 0.06, 14.6]} ry={Math.PI} />
      <Car ref={(g) => { refs.current[2] = g; }} color={0x6b5bb5} p={[-10, 0.06, 17.6]} />
    </>
  );
}
