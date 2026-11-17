import { FLOOR_Y } from '../../constants';
import { M } from '../../materials';
import { Plant } from '../../props/furniture';
import { Box } from '../../props/primitives';

const CABINETS = [2.6, 3.6, 4.6, 5.6];

/** Level 4 fixed features: filing cabinets, a safe and plants. */
export function FinanceDecor() {
  return (
    <>
      {CABINETS.map((x) => (
        <Box key={x} s={[0.85, 1.3, 0.6]} m={M.cabinet} p={[x, FLOOR_Y + 0.65, -4.4]} />
      ))}
      <Box s={[1.0, 1.1, 0.9]} m={M.dark} p={[5.6, FLOOR_Y + 0.55, -1.6]} />
      <Plant x={6.0} z={1.9} />
      <Plant x={2.4} z={1.9} s={0.8} />
    </>
  );
}
