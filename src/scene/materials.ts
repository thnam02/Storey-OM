import * as THREE from 'three';

/*
 * The prototype ran on three r128, which had no colour management: hex colours
 * went to the screen as written. Turn it off before any colour is created so
 * the palette below renders the same. <Canvas legacy> sets the same flag.
 */
THREE.ColorManagement.enabled = false;

/* ---------- shared geometry (one instance per size) ---------- */

const geometries = new Map<string, THREE.BufferGeometry>();
function cached<G extends THREE.BufferGeometry>(key: string, make: () => G): G {
  let g = geometries.get(key);
  if (!g) {
    g = make();
    geometries.set(key, g);
  }
  return g as G;
}

export const boxGeometry = (w: number, h: number, d: number) =>
  cached(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));

export const cylinderGeometry = (rTop: number, rBottom: number, h: number, segments = 12) =>
  cached(`c${rTop}_${rBottom}_${h}_${segments}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, segments));

export const sphereGeometry = (r: number) => cached(`s${r}`, () => new THREE.SphereGeometry(r, 14, 10));

export const icosahedronGeometry = (r: number) => cached(`i${r}`, () => new THREE.IcosahedronGeometry(r, 0));

export const planeGeometry = (w: number, h: number) => cached(`p${w}_${h}`, () => new THREE.PlaneGeometry(w, h));

/* ---------- shared materials ---------- */

const materials = new Map<string, THREE.MeshStandardMaterial>();

/** Matte standard material, cached by colour and options. */
export function mat(
  color: THREE.ColorRepresentation,
  opts: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  const key = `${String(color)}${JSON.stringify(opts)}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, ...opts });
    materials.set(key, m);
  }
  return m;
}

/** Mix a colour towards white; t = 0 keeps it, t = 1 is white. */
export const tint = (color: THREE.ColorRepresentation, t: number) =>
  new THREE.Color(color).lerp(new THREE.Color(0xffffff), t).getHex();

export const M = {
  slab: mat(0xeceae5),
  wall: mat(0xf7f5f0),
  column: mat(0xdcd9d2),
  roof: mat(0xe3e1db),
  glass: new THREE.MeshStandardMaterial({ color: 0xbad6e4, transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.2 }),
  desk: mat(0xe9dcc4),
  leg: mat(0x5a646d),
  screen: mat(0x253038, { roughness: 0.4 }),
  chair: mat(0x3c4750),
  pants: mat(0x33404b),
  concrete: mat(0xc8c6c0),
  grass: mat(0xc8d4bd),
  paving: mat(0xe3e1da),
  road: mat(0x5b6168),
  line: mat(0xf3f0e6),
  rack: mat(0x2f5f8c),
  beam: mat(0xe07a2e),
  pallet: mat(0xb88c5a),
  white: mat(0xf8f8f6),
  dark: mat(0x22292f, { roughness: 0.5 }),
  tyre: mat(0x1e2226),
  pot: mat(0x8d6c53),
  leaf: mat(0x6a9c5b, { flatShading: true }),
  leaf2: mat(0x58885a, { flatShading: true }),
  trunk: mat(0x7b5c43),
  yellow: mat(0xf0b323),
  sofa: mat(0x55687a),
  walnut: mat(0x8a6a50, { roughness: 0.6 }),
  walnutMatte: mat(0x8a6a50),
  cabinet: mat(0x9aa4ad),
  hvac: mat(0xb9bec2),
  fascia: mat(0xa3b4c0),
  truss: mat(0x6f7c86),
  safetyLine: mat(0xe8c13a),
  cabGlass: mat(0x2a343c, { roughness: 0.3 }),
  windscreen: mat(0x1a2228, { roughness: 0.2 }),
  truckCab: mat(0x2c6a86, { roughness: 0.5 }),
} as const;

export const CARTONS = [mat(0xc9a06c), mat(0xbd935f), mat(0xd3ae7d)] as const;
export const carton = (i: number) => CARTONS[i % CARTONS.length] as THREE.MeshStandardMaterial;

/** Invisible but still clickable: used for the floor and warehouse hit areas. */
export const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
