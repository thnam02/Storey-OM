import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { labelAnchors } from './labelAnchors';

const v = new THREE.Vector3();
/** How far past the stage edge (px) a label may sit before it is hidden. */
const MARGIN_X = 60;
const MARGIN_Y = 30;

/** Projects every registered label's 3D anchor to screen pixels each frame. */
export function LabelProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame(() => {
    const { width: w, height: h } = size;
    labelAnchors.forEach(({ el, position, align }) => {
      v.set(...position).project(camera);
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      const off = x < -MARGIN_X || x > w + MARGIN_X || y < -MARGIN_Y || y > h + MARGIN_Y;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${align === 'left' ? 'translate(-100%, -50%)' : 'translate(-50%, -100%)'}`;
    });
  });

  return null;
}
