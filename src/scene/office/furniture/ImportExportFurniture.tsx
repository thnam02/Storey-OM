import { FLOOR_Y, OFFICE } from '../../constants';
import { M, mat } from '../../materials';
import { CartonStack, Plant, Pod } from '../../props/furniture';
import { Box, Sign } from '../../props/primitives';
import { textTexture } from '../../textures';
import { WALL_SCREEN_Z } from '../FloorShell';

/** Level 1: desk pods, reception desk with entrance canopy, incoming cartons, shipments screen. */
export function ImportExportFurniture({ color }: { color: string }) {
  const band = mat(color, { roughness: 0.6 });
  return (
    <>
      <Pod cx={-3.4} cz={-2.7} cols={3} />
      <Pod cx={-3.4} cz={0.7} cols={2} />
      {/* reception */}
      <Box s={[3.2, 1.0, 0.7]} m={band} p={[3.6, FLOOR_Y + 0.5, 1.6]} />
      <Box s={[3.3, 0.06, 0.8]} m={M.white} p={[3.6, FLOOR_Y + 1.03, 1.6]} />
      <Box s={[0.48, 0.08, 0.48]} m={M.chair} p={[3.6, FLOOR_Y + 0.47, 0.9]} />
      <CartonStack x={5.5} z={-3.8} n={3} seed={101} />
      <CartonStack x={4.8} z={-3.9} n={2} seed={102} />
      <CartonStack x={5.6} z={-2.9} n={2} seed={103} />
      <Sign w={2.4} h={1.3} p={[2.4, 1.95, WALL_SCREEN_Z]} map={textTexture('IN 4  ·  OUT 2', { bg: '#1f2a33', fg: '#9fe0d6', w: 512, h: 256 })} />
      <Plant x={-6.1} z={2.2} />
      {/* entrance canopy */}
      <Box s={[4.6, 0.16, 1.8]} m={M.white} p={[3.6, OFFICE.H - 0.4, OFFICE.D / 2 + 0.85]} />
      <Box s={[4.6, 0.12, 0.08]} m={band} p={[3.6, OFFICE.H - 0.4, OFFICE.D / 2 + 1.76]} cast={false} />
    </>
  );
}
