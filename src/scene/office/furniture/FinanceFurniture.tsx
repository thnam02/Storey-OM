import { FLOOR_Y } from '../../constants';
import { M } from '../../materials';
import { Desk, Plant } from '../../props/furniture';
import { Box } from '../../props/primitives';

const ROWS = [-3.3, -1.1, 1.1];
const COLS = [-4.6, -2.9, -1.2, 0.5];
const CABINETS = [2.6, 3.6, 4.6, 5.6];

/** Level 4: rows of desks facing one way, filing cabinets and a safe. */
export function FinanceFurniture() {
  return (
    <>
      {ROWS.flatMap((z) => COLS.map((x) => <Desk key={`${x}${z}`} x={x} z={z} />))}
      {CABINETS.map((x) => (
        <Box key={x} s={[0.85, 1.3, 0.6]} m={M.cabinet} p={[x, FLOOR_Y + 0.65, -4.4]} />
      ))}
      <Box s={[1.0, 1.1, 0.9]} m={M.dark} p={[5.6, FLOOR_Y + 0.55, -1.6]} />
      <Plant x={6.0} z={1.9} />
      <Plant x={2.4} z={1.9} s={0.8} />
    </>
  );
}
