import { FLOOR_Y } from '../../constants';
import { M } from '../../materials';
import { Plant } from '../../props/furniture';
import { Box } from '../../props/primitives';
import { WALL_SCREEN_Z } from '../FloorShell';

/** Level 5 fixed features: boardroom screen, lounge and plants. The boardroom table itself is generated. */
export function ManagementDecor() {
  return (
    <>
      <Box s={[2.2, 1.2, 0.05]} m={M.screen} p={[4.4, 1.8, WALL_SCREEN_Z]} cast={false} />
      {/* lounge */}
      <Box s={[2.6, 0.42, 0.9]} m={M.sofa} p={[4.2, FLOOR_Y + 0.21, 2.3]} />
      <Box s={[2.6, 0.5, 0.22]} m={M.sofa} p={[4.2, FLOOR_Y + 0.6, 2.65]} />
      <Box s={[1.2, 0.36, 0.6]} m={M.walnutMatte} p={[4.2, FLOOR_Y + 0.18, 1.3]} />
      <Plant x={6.2} z={0.9} />
      <Plant x={-6.35} z={3.4} s={1.1} />
    </>
  );
}
