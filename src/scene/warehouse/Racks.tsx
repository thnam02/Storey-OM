import { useMemo } from 'react';
import type { Zone } from '../../data/types';
import { createRandom } from '../../lib/seededRandom';
import { SEEDS } from '../constants';
import { carton, M } from '../materials';
import { Box, Sign } from '../props/primitives';
import { textTexture } from '../textures';

const ZONE_X = [-5.6, 0, 5.6];
const ROW_Z = [-5.3, -3.0, -0.7];
const SHELF_Y = [0.45, 1.6, 2.75, 3.9];
const FLOOR_LABEL_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Pallet racking, three rows per zone. How full each zone looks follows its
 * fill percentage; which slots are full is seeded per zone so it never shifts.
 */
function ZoneRacks({ zone, index }: { zone: Zone; index: number }) {
  const cx = ZONE_X[index] ?? 0;
  const loads = useMemo(() => {
    const r = createRandom(SEEDS.racks + index);
    const out: { x: number; y: number; z: number; h: number; m: number }[] = [];
    ROW_Z.forEach((rz) =>
      SHELF_Y.forEach((ly, li) => {
        for (let b = 0; b < 4; b++) {
          if (r() * 100 > zone.fill) continue;
          out.push({ x: cx - 1.575 + b * 1.05, y: ly + 0.35, z: rz, h: 0.5 + r() * 0.4, m: b + li });
        }
      }),
    );
    return out;
  }, [cx, index, zone.fill]);

  const label = textTexture(`ZONE ${zone.name}`, { bg: null, fg: '#5b4a1c', w: 512, h: 128, weight: 700 });

  return (
    <>
      {ROW_Z.map((rz) => (
        <group key={rz}>
          {[0, 1, 2, 3, 4].flatMap((k) => {
            const ux = cx - 2.1 + k * 1.05;
            return [
              <Box key={`${k}f`} s={[0.08, 4.6, 0.08]} m={M.rack} p={[ux, 2.6, rz - 0.45]} receive={false} />,
              <Box key={`${k}b`} s={[0.08, 4.6, 0.08]} m={M.rack} p={[ux, 2.6, rz + 0.45]} receive={false} />,
            ];
          })}
          {SHELF_Y.flatMap((ly) => [
            <Box key={`${ly}f`} s={[4.25, 0.1, 0.06]} m={M.beam} p={[cx, ly + 0.3, rz - 0.45]} cast={false} receive={false} />,
            <Box key={`${ly}b`} s={[4.25, 0.1, 0.06]} m={M.beam} p={[cx, ly + 0.3, rz + 0.45]} cast={false} receive={false} />,
          ])}
        </group>
      ))}
      {loads.map((l, i) => (
        <group key={i}>
          <Box s={[0.9, 0.1, 0.85]} m={M.pallet} p={[l.x, l.y + 0.05, l.z]} cast={false} receive={false} />
          <Box s={[0.82, l.h, 0.8]} m={carton(l.m)} p={[l.x, l.y + 0.1 + l.h / 2, l.z]} receive={false} />
        </group>
      ))}
      <Sign w={3.2} h={0.8} p={[cx, 0.32, 1.0]} rot={FLOOR_LABEL_ROT} map={label} transparent />
    </>
  );
}

export function Racks({ zones }: { zones: Zone[] }) {
  return (
    <>
      {zones.slice(0, ZONE_X.length).map((z, i) => (
        <ZoneRacks key={z.name} zone={z} index={i} />
      ))}
    </>
  );
}
