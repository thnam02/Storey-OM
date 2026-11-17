import { FLOOR_Y, OFFICE } from '../../constants';
import { M, mat, sphereGeometry } from '../../materials';
import { Pod, RoundTable } from '../../props/furniture';
import { Box, Part, Sign } from '../../props/primitives';
import { textTexture } from '../../textures';
import { WALL_SCREEN_Z } from '../FloorShell';

const STICKY_NOTES = ['#f6d55c', '#ed8f8f', '#8fd0ed', '#a6e39b', '#f6d55c', '#c7a6ef'];
const WALL_X = -OFFICE.W / 2;

/** Level 3: pods, two meeting tables, a whiteboard with sticky notes, bean bags and the leads screen. */
export function MarketingFurniture({ leads }: { leads: number }) {
  return (
    <>
      <Pod cx={-3.6} cz={-2.7} cols={3} />
      <Pod cx={-3.6} cz={0.7} cols={2} />
      <RoundTable x={3.3} z={-2.6} chairs={5} />
      <RoundTable x={3.3} z={0.8} chairs={4} />
      <Box s={[0.05, 1.2, 2.8]} m={M.white} p={[WALL_X + 0.28, 1.9, 1.2]} cast={false} />
      {STICKY_NOTES.map((c, k) => (
        <Box key={k} s={[0.03, 0.22, 0.22]} m={mat(c)} p={[WALL_X + 0.31, 2.2 - (k % 2) * 0.35, 0.3 + Math.floor(k / 2) * 0.6]} cast={false} />
      ))}
      <Part g={sphereGeometry(0.45)} m={mat(0xe6a13c)} p={[5.6, FLOOR_Y + 0.3, 2.0]} scale={[1, 0.65, 1]} />
      <Part g={sphereGeometry(0.45)} m={mat(0x4e8fb3)} p={[6.0, FLOOR_Y + 0.3, 1.1]} scale={[1, 0.65, 1]} />
      <Sign w={2.4} h={1.3} p={[2.6, 1.95, WALL_SCREEN_Z]} map={textTexture(`${leads} LEADS`, { bg: '#1f2a33', fg: '#f2b6df', w: 512, h: 256 })} />
    </>
  );
}
