import type { PipelineStage } from '../../../data/types';
import { Plant } from '../../props/furniture';
import { Sign } from '../../props/primitives';
import { chartTexture } from '../../textures';
import { WALL_SCREEN_Z } from '../FloorShell';

/** Level 2 fixed features: the live pipeline screen and plants. */
export function SalesDecor({ color, stages }: { color: string; stages: PipelineStage[] }) {
  return (
    <>
      <Sign w={2.6} h={1.42} p={[2.6, 1.95, WALL_SCREEN_Z]} map={chartTexture(stages.map((s) => s.value), color)} />
      <Plant x={6.0} z={1.9} />
      <Plant x={-6.35} z={3.4} />
    </>
  );
}
