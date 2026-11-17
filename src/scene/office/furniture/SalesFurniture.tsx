import type { PipelineStage } from '../../../data/types';
import { Plant, Pod, RoundTable } from '../../props/furniture';
import { Sign } from '../../props/primitives';
import { chartTexture } from '../../textures';
import { WALL_SCREEN_Z } from '../FloorShell';

/** Level 2: two large pods, a meeting table and the live pipeline screen. */
export function SalesFurniture({ color, stages }: { color: string; stages: PipelineStage[] }) {
  return (
    <>
      <Pod cx={-3.2} cz={-2.7} cols={4} />
      <Pod cx={-3.2} cz={0.7} cols={4} />
      <Sign w={2.6} h={1.42} p={[2.6, 1.95, WALL_SCREEN_Z]} map={chartTexture(stages.map((s) => s.value), color)} />
      <RoundTable x={4.6} z={-1.4} chairs={4} />
      <Plant x={6.0} z={1.9} />
      <Plant x={-6.1} z={2.2} />
    </>
  );
}
