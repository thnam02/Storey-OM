import type * as THREE from 'three';

/**
 * 3D object for each person currently drawn, so their DOM name tag can follow
 * them (walkers and the forklift move every frame). Not React state on purpose.
 */
export const figureRegistry = new Map<string, { object: THREE.Object3D; anchorY: number }>();
