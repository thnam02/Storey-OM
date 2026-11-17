import type * as THREE from 'three';

export type LabelAlign = 'left' | 'top';

export interface LabelAnchor {
  el: HTMLElement;
  align: LabelAlign;
  /** Writes the label's 3D point into `out`; false hides the label this frame. */
  resolve: (out: THREE.Vector3) => boolean;
}

/**
 * DOM labels that float over the 3D scene. Overlay components register their
 * element here; LabelProjector moves them every frame. Kept outside React state
 * so 60 fps position updates never re-render anything.
 */
export const labelAnchors = new Map<string, LabelAnchor>();
