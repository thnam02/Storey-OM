/*
 * Light values are the prototype's (three r128) scaled up. Newer three divides
 * diffuse light by π and takes a little more away for energy conservation;
 * the extra 3.5% was measured against prototype screenshots.
 */
const LEGACY = Math.PI * 1.035;

export function Lights() {
  return (
    <>
      <hemisphereLight args={[0xf5f8fb, 0xb8b2a6, 0.82 * LEGACY]} />
      <directionalLight
        position={[26, 44, 30]}
        intensity={0.72 * LEGACY}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
    </>
  );
}
