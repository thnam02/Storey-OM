import type { Vec3 } from '../constants';

export type LabelAlign = 'left' | 'top';

export interface LabelAnchor {
  el: HTMLElement;
  position: Vec3;
  align: LabelAlign;
}

/**
 * DOM labels that float over the 3D scene. Overlay components register their
 * element here; LabelProjector moves them every frame. Kept outside React state
 * so 60 fps position updates never re-render anything.
 */
export const labelAnchors = new Map<string, LabelAnchor>();
