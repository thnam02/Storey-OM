import { useMemo } from 'react';
import { createRandom } from '../../lib/seededRandom';
import { seedFor } from '../../layout/floorLayout';
import { cylinderGeometry, M, mat, sphereGeometry, tint } from '../materials';
import { Part } from '../props/primitives';

const SKINS = [0xf1c9a5, 0xd9a477, 0xa8754f, 0x7a5132, 0xe8b98f];

/** Seeded per person, so everyone keeps their look between loads. */
function useLook(personId: string, shirt: string) {
  return useMemo(() => {
    const r = createRandom(seedFor(personId));
    return {
      skin: mat(SKINS[Math.floor(r() * SKINS.length)] ?? SKINS[0]!),
      shirt: mat(tint(shirt, r() * 0.25)),
    };
  }, [personId, shirt]);
}

/** Head and torso above a chair. Origin is the seat's floor point. */
export function SittingFigure({ personId, shirt }: { personId: string; shirt: string }) {
  const look = useLook(personId, shirt);
  return (
    <>
      <Part g={cylinderGeometry(0.2, 0.17, 0.56)} m={look.shirt} p={[0, 0.8, 0]} />
      <Part g={sphereGeometry(0.16)} m={look.skin} p={[0, 1.25, 0]} />
    </>
  );
}

/** Standing person. Origin is between the feet. */
export function StandingFigure({ personId, shirt }: { personId: string; shirt: string }) {
  const look = useLook(personId, shirt);
  return (
    <>
      <Part g={cylinderGeometry(0.15, 0.14, 0.72)} m={M.pants} p={[0, 0.36, 0]} />
      <Part g={cylinderGeometry(0.2, 0.17, 0.62)} m={look.shirt} p={[0, 1.03, 0]} />
      <Part g={sphereGeometry(0.17)} m={look.skin} p={[0, 1.52, 0]} />
    </>
  );
}

/** Head heights for name tags. */
export const ANCHOR_Y = { sitting: 1.55, standing: 1.85, forklift: 2.4 } as const;
/** Hi-vis shirts in the warehouse. */
export const HI_VIS = '#f08a24';
