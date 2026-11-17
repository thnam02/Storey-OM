import { useMemo } from 'react';
import type { Department } from '../../data/types';
import { OFFICE } from '../constants';
import { M, mat, tint } from '../materials';
import { Box, Sign } from '../props/primitives';
import { textTexture } from '../textures';

const { W, D, H } = OFFICE;
const WALL_H = H - 0.35;
const WALL_Y = 0.35 + WALL_H / 2;

const COLUMNS: [number, number][] = [
  [W / 2 - 0.2, D / 2 - 0.2],
  [0, D / 2 - 0.2],
  [-W / 2 + 0.2, D / 2 - 0.2],
  [W / 2 - 0.2, -D / 2 + 0.2],
  [W / 2 - 0.2, 0],
];

/**
 * Slab, tinted carpet, back and left walls, columns, coloured band and wall
 * sign. Front and right sides stay open so the floor reads from the camera.
 */
export function FloorShell({ dept }: { dept: Department }) {
  const band = mat(dept.color, { roughness: 0.6 });
  const sign = useMemo(() => textTexture(dept.name.toUpperCase(), { bg: dept.color }), [dept.name, dept.color]);
  return (
    <>
      <Box s={[W, 0.35, D]} m={M.slab} p={[0, 0.175, 0]} cast={false} />
      <Box s={[W - 0.6, 0.02, D - 0.6]} m={mat(tint(dept.color, 0.82))} p={[0.15, 0.36, 0.15]} cast={false} />
      <Box s={[W, WALL_H, 0.25]} m={M.wall} p={[0, WALL_Y, -D / 2 + 0.125]} />
      <Box s={[0.25, WALL_H, D]} m={M.wall} p={[-W / 2 + 0.125, WALL_Y, 0]} />
      {COLUMNS.map(([x, z], i) => (
        <Box key={i} s={[0.3, WALL_H, 0.3]} m={M.column} p={[x, WALL_Y, z]} />
      ))}
      <Box s={[W + 0.02, 0.36, 0.1]} m={band} p={[0, 0.18, D / 2 + 0.05]} cast={false} receive={false} />
      <Box s={[0.1, 0.36, D + 0.02]} m={band} p={[W / 2 + 0.05, 0.18, 0]} cast={false} receive={false} />
      {dept.level > 1 && (
        <>
          <Box s={[W - 0.4, 0.9, 0.04]} m={M.glass} p={[0, 0.8, D / 2 - 0.06]} cast={false} receive={false} />
          <Box s={[0.04, 0.9, D - 0.4]} m={M.glass} p={[W / 2 - 0.06, 0.8, 0]} cast={false} receive={false} />
        </>
      )}
      <Sign w={4.4} h={1.1} map={sign} p={[-3.2, 2.2, -D / 2 + 0.26]} />
    </>
  );
}

/** Wall-mounted screen on the back wall, shared by several floors. */
export const WALL_SCREEN_Z = -D / 2 + 0.27;
