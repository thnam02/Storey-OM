import { FLOOR_Y, OFFICE } from '../../constants';
import { M } from '../../materials';
import { Desk, Plant } from '../../props/furniture';
import { Box } from '../../props/primitives';

const BOARD_CHAIRS = [0, 1, 2, 3].map((k) => -4.05 + k * 1.1);

/** Level 5: boardroom table with a screen, two executive desks and a lounge. */
export function ManagementFurniture() {
  return (
    <>
      <Box s={[4.6, 0.08, 1.8]} m={M.walnut} p={[-2.4, FLOOR_Y + 0.76, -1.6]} />
      <Box s={[4.2, 0.72, 1.2]} m={M.dark} p={[-2.4, FLOOR_Y + 0.36, -1.6]} />
      {BOARD_CHAIRS.flatMap((x) => [
        <Box key={`${x}a`} s={[0.48, 0.08, 0.48]} m={M.chair} p={[x, FLOOR_Y + 0.47, -0.4]} />,
        <Box key={`${x}b`} s={[0.48, 0.08, 0.48]} m={M.chair} p={[x, FLOOR_Y + 0.47, -2.8]} />,
      ])}
      <Box s={[0.05, 1.2, 2.2]} m={M.screen} p={[-OFFICE.W / 2 + 0.28, 1.8, -1.6]} cast={false} />
      <Desk x={3.4} z={-3.4} />
      <Desk x={5.4} z={-3.4} />
      {/* lounge */}
      <Box s={[2.6, 0.42, 0.9]} m={M.sofa} p={[3.6, FLOOR_Y + 0.21, 2.0]} />
      <Box s={[2.6, 0.5, 0.22]} m={M.sofa} p={[3.6, FLOOR_Y + 0.6, 2.35]} />
      <Box s={[1.2, 0.36, 0.6]} m={M.walnutMatte} p={[3.6, FLOOR_Y + 0.18, 0.9]} />
      <Plant x={6.0} z={0.6} />
      <Plant x={-6.1} z={2.2} s={1.1} />
    </>
  );
}
