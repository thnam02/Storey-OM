import { M, planeGeometry } from '../materials';
import { Box } from '../props/primitives';
import { Car } from '../props/vehicles';

const ROAD_DASHES = Array.from({ length: 32 }, (_, i) => -78 + i * 5);
const PARKING_LINES = [0, 1, 2, 3, 4, 5].map((k) => -15.6 + k * 2.6);
const PARKED_CARS: [number, number][] = [
  [-14.3, 0xd9dde0],
  [-11.7, 0x2c6a86],
  [-6.5, 0xb64a3c],
  [-3.9, 0x3d4650],
];
const GROUND_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Grass, site paving, the road with lane dashes, and the car park in front of the office. */
export function Ground() {
  return (
    <>
      <mesh geometry={planeGeometry(160, 160)} material={M.grass} rotation={GROUND_ROT} receiveShadow />
      <Box s={[54, 0.06, 30]} m={M.paving} p={[2, 0.03, -1.5]} cast={false} />
      <Box s={[160, 0.06, 6.4]} m={M.road} p={[0, 0.05, 16.2]} cast={false} />
      <Box s={[160, 0.14, 1.6]} m={M.paving} p={[0, 0.07, 12.2]} cast={false} />
      {ROAD_DASHES.map((x) => (
        <Box key={x} s={[2.4, 0.02, 0.18]} m={M.line} p={[x, 0.09, 16.2]} cast={false} receive={false} />
      ))}
      {PARKING_LINES.map((x) => (
        <Box key={x} s={[0.12, 0.02, 3.4]} m={M.line} p={[x, 0.08, 7.3]} cast={false} receive={false} />
      ))}
      {PARKED_CARS.map(([x, color]) => (
        <Car key={x} color={color} p={[x, 0.06, 7.3]} ry={Math.PI / 2} />
      ))}
    </>
  );
}
