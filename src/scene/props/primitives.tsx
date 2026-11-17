import type * as THREE from 'three';
import { DoubleSide, FrontSide } from 'three';
import { boxGeometry, planeGeometry } from '../materials';
import type { Vec3 } from '../constants';

/*
 * Small building blocks. Prop names are short because scenery files use
 * hundreds of them: s = size, m = material, p = position, ry = rotation Y.
 * Like the prototype, everything casts and receives shadows unless told not to.
 */

interface BoxProps {
  s: Vec3;
  m: THREE.Material;
  p: Vec3;
  ry?: number;
  cast?: boolean;
  receive?: boolean;
}

export function Box({ s, m, p, ry = 0, cast = true, receive = true }: BoxProps) {
  return <mesh geometry={boxGeometry(...s)} material={m} position={p} rotation-y={ry} castShadow={cast} receiveShadow={receive} />;
}

interface PartProps {
  g: THREE.BufferGeometry;
  m: THREE.Material;
  p: Vec3;
  rot?: Vec3;
  scale?: Vec3;
  cast?: boolean;
}

/** Any other shape. Always receives shadows. */
export function Part({ g, m, p, rot, scale, cast = true }: PartProps) {
  return <mesh geometry={g} material={m} position={p} rotation={rot} scale={scale} castShadow={cast} receiveShadow />;
}

interface SignProps {
  w: number;
  h: number;
  map: THREE.Texture;
  p: Vec3;
  rot?: Vec3;
  transparent?: boolean;
  doubleSided?: boolean;
}

/** Unlit textured plane: wall signs, screens, floor markings. */
export function Sign({ w, h, map, p, rot, transparent = false, doubleSided = false }: SignProps) {
  return (
    <mesh geometry={planeGeometry(w, h)} position={p} rotation={rot}>
      <meshBasicMaterial map={map} transparent={transparent} side={doubleSided ? DoubleSide : FrontSide} />
    </mesh>
  );
}
