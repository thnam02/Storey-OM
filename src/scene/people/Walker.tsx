import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import type * as THREE from 'three';
import { seedFor, type Rect } from '../../layout/floorLayout';
import { createRandom } from '../../lib/seededRandom';

const DEFAULT_SPEED: [number, number] = [0.9, 1.4];

interface Props {
  personId: string;
  area: Rect;
  /** Floor height the walker stands on. */
  y: number;
  speed?: [min: number, max: number];
  animate: boolean;
  children: ReactNode;
}

/**
 * Someone wandering inside `area`: walk to a random point, pause, repeat.
 * Starts at a seeded spot; stands still under reduced motion.
 */
export function Walker({ personId, area, y, speed = DEFAULT_SPEED, animate, children }: Props) {
  const ref = useRef<THREE.Group>(null);
  const state = useMemo(() => {
    const r = createRandom(seedFor(`walk:${personId}`));
    const at = () => [area.x0 + r() * (area.x1 - area.x0), area.z0 + r() * (area.z1 - area.z0)] as const;
    const [x, z] = at();
    return { r, at, x, z, tx: x, tz: z, wait: r() * 2, speed: speed[0] + r() * (speed[1] - speed[0]), phase: r() * 6 };
  }, [personId, area, speed]);

  useFrame(({ clock }, rawDt) => {
    const g = ref.current;
    if (!g || !animate) return;
    const dt = Math.min(0.05, rawDt);
    const p = g.position;
    if (state.wait > 0) {
      state.wait -= dt;
      p.y = y;
      return;
    }
    const dx = state.tx - p.x, dz = state.tz - p.z, dist = Math.hypot(dx, dz);
    if (dist < 0.05) {
      [state.tx, state.tz] = state.at();
      state.wait = 0.8 + state.r() * 2.6;
      return;
    }
    const step = Math.min(dist, state.speed * dt);
    p.x += (dx / dist) * step;
    p.z += (dz / dist) * step;
    g.rotation.y = Math.atan2(dx, dz);
    p.y = y + Math.abs(Math.sin(clock.elapsedTime * 9 + state.phase)) * 0.05;
  });

  return (
    <group ref={ref} position={[state.x, y, state.z]}>
      {children}
    </group>
  );
}
