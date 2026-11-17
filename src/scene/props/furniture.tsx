import { useMemo } from 'react';
import { createRandom } from '../../lib/seededRandom';
import { FLOOR_Y } from '../constants';
import { carton, cylinderGeometry, icosahedronGeometry, M, mat, sphereGeometry, tint } from '../materials';
import { Box, Part } from './primitives';

/** Desk with monitor and chair. The chair faces +z before rotation. */
export function Desk({ x, z, ry = 0 }: { x: number; z: number; ry?: number }) {
  return (
    <group position={[x, FLOOR_Y, z]} rotation-y={ry}>
      <Box s={[1.5, 0.06, 0.75]} m={M.desk} p={[0, 0.74, 0]} />
      <Box s={[0.06, 0.71, 0.68]} m={M.leg} p={[-0.68, 0.36, 0]} cast={false} />
      <Box s={[0.06, 0.71, 0.68]} m={M.leg} p={[0.68, 0.36, 0]} cast={false} />
      <Box s={[0.62, 0.38, 0.04]} m={M.screen} p={[0, 0.98, -0.22]} />
      <Box s={[0.48, 0.08, 0.48]} m={M.chair} p={[0, 0.47, 0.64]} />
      <Box s={[0.48, 0.52, 0.07]} m={M.chair} p={[0, 0.76, 0.88]} />
      <Box s={[0.07, 0.42, 0.07]} m={M.leg} p={[0, 0.22, 0.64]} cast={false} />
    </group>
  );
}

export function Plant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <>
      <Part g={cylinderGeometry(0.22 * s, 0.17 * s, 0.4 * s)} m={M.pot} p={[x, FLOOR_Y + 0.2 * s, z]} />
      <Part g={icosahedronGeometry(0.42 * s)} m={M.leaf} p={[x, FLOOR_Y + 0.72 * s, z]} scale={[1, 1.25, 1]} />
    </>
  );
}

export function RoundTable({ x, z, chairs }: { x: number; z: number; chairs: number }) {
  return (
    <>
      <Part g={cylinderGeometry(0.6, 0.6, 0.06, 20)} m={M.desk} p={[x, FLOOR_Y + 0.74, z]} />
      <Part g={cylinderGeometry(0.06, 0.06, 0.72)} m={M.leg} p={[x, FLOOR_Y + 0.37, z]} cast={false} />
      {Array.from({ length: chairs }, (_, i) => {
        const a = (i / chairs) * Math.PI * 2;
        return <Box key={i} s={[0.42, 0.08, 0.42]} m={M.chair} p={[x + Math.cos(a) * 0.95, FLOOR_Y + 0.46, z + Math.sin(a) * 0.95]} />;
      })}
    </>
  );
}

/** Boardroom table, long side along z. Chairs are drawn at the layout's meeting seats. */
export function BoardroomTable({ x, z, length, seats }: { x: number; z: number; length: number; seats: { x: number; z: number }[] }) {
  return (
    <>
      <Box s={[1.8, 0.08, length]} m={M.walnut} p={[x, FLOOR_Y + 0.76, z]} />
      <Box s={[1.2, 0.72, length - 0.4]} m={M.dark} p={[x, FLOOR_Y + 0.36, z]} />
      {seats.map((s, i) => (
        <Box key={i} s={[0.48, 0.08, 0.48]} m={M.chair} p={[s.x, FLOOR_Y + 0.47, s.z]} />
      ))}
    </>
  );
}

/** A slightly messy stack of cartons. `seed` keeps the mess the same on every load. */
export function CartonStack({ x, z, n, base = FLOOR_Y, seed }: { x: number; z: number; n: number; base?: number; seed: number }) {
  const boxes = useMemo(() => {
    const r = createRandom(seed);
    return Array.from({ length: n }, (_, i) => {
      const s = 0.5 + r() * 0.2;
      return {
        s,
        x: x + (r() - 0.5) * 0.1,
        y: base + s * 0.4 + i * (s * 0.8),
        z: z + (r() - 0.5) * 0.1,
        ry: (r() - 0.5) * 0.4,
      };
    });
  }, [x, z, n, base, seed]);
  return (
    <>
      {boxes.map((b, i) => (
        <Box key={i} s={[b.s, b.s * 0.8, b.s]} m={carton(i)} p={[b.x, b.y, b.z]} ry={b.ry} />
      ))}
    </>
  );
}

/** Simple standing figure, used for the forklift driver. People proper arrive in step 2. */
export function StandingFigure({ shirt, skin = 0xd9a477 }: { shirt: string; skin?: number }) {
  return (
    <>
      <Part g={cylinderGeometry(0.15, 0.14, 0.72)} m={M.pants} p={[0, 0.36, 0]} />
      <Part g={cylinderGeometry(0.2, 0.17, 0.62)} m={mat(tint(shirt, 0.1))} p={[0, 1.03, 0]} />
      <Part g={sphereGeometry(0.17)} m={mat(skin)} p={[0, 1.52, 0]} />
    </>
  );
}
