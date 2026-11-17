import { OFFICE } from '../constants';
import { cylinderGeometry, M } from '../materials';
import { Box, Part, Sign } from '../props/primitives';
import { textTexture } from '../textures';

const { W, D, H } = OFFICE;

/** Roof with parapet, two AC units and the company sign. Hidden while a floor is open. */
export function Roof({ visible }: { visible: boolean }) {
  return (
    <group position={[OFFICE.x, 5 * H, OFFICE.z]} visible={visible}>
      <Box s={[W, 0.4, D]} m={M.roof} p={[0, 0.2, 0]} cast={false} />
      <Box s={[W, 0.5, 0.15]} m={M.roof} p={[0, 0.65, D / 2 - 0.08]} cast={false} />
      <Box s={[0.15, 0.5, D]} m={M.roof} p={[W / 2 - 0.08, 0.65, 0]} cast={false} />
      <Box s={[W, 0.5, 0.15]} m={M.roof} p={[0, 0.65, -D / 2 + 0.08]} cast={false} />
      <Box s={[0.15, 0.5, D]} m={M.roof} p={[-W / 2 + 0.08, 0.65, 0]} cast={false} />
      {[-3.5, -1.5].map((x) => (
        <group key={x}>
          <Box s={[1.6, 0.9, 1.2]} m={M.hvac} p={[x, 0.85, -2.4]} cast={false} />
          <Part g={cylinderGeometry(0.5, 0.5, 0.25, 16)} m={M.dark} p={[x, 1.42, -2.4]} cast={false} />
        </group>
      ))}
      <Sign w={7} h={1.3} p={[2.2, 1.7, D / 2 - 0.6]} doubleSided map={textTexture('COMPANY HQ', { bg: '#2c6a86', w: 768, h: 144 })} />
      <Box s={[0.12, 1.2, 0.12]} m={M.leg} p={[-1.2, 1.0, D / 2 - 0.62]} cast={false} />
      <Box s={[0.12, 1.2, 0.12]} m={M.leg} p={[5.6, 1.0, D / 2 - 0.62]} cast={false} />
    </group>
  );
}
