import { useMemo } from 'react';
import { createRandom } from '../../lib/seededRandom';
import { SEEDS } from '../constants';
import { cylinderGeometry, icosahedronGeometry, M } from '../materials';
import { Part } from '../props/primitives';

const SPOTS: [number, number][] = [
  [-21, -9], [-22, -2], [-21.5, 5], [-19, 11], [0.6, 6.5], [0.2, -9.5],
  [23, -9], [24, -2], [23.5, 5], [-12, -10], [6, -11.5], [16, -11],
];

/** Low-poly trees around the site. Sizes and turns are seeded. */
export function Trees() {
  const trees = useMemo(() => {
    const r = createRandom(SEEDS.trees);
    return SPOTS.map(([x, z], k) => ({ x, z, s: 0.85 + r() * 0.5, turn: r() * 3, leaf: k % 2 ? M.leaf : M.leaf2 }));
  }, []);
  return (
    <>
      {trees.map(({ x, z, s, turn, leaf }) => (
        <group key={`${x}${z}`}>
          <Part g={cylinderGeometry(0.16 * s, 0.22 * s, 1.4 * s)} m={M.trunk} p={[x, 0.7 * s, z]} />
          <Part g={icosahedronGeometry(1.25 * s)} m={leaf} p={[x, 2.2 * s, z]} rot={[0, turn, 0]} scale={[1, 1.2, 1]} />
        </group>
      ))}
    </>
  );
}
