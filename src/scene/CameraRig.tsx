import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import * as THREE from 'three';
import { departmentById } from '../data/sample';
import type { DepartmentId } from '../data/types';
import { useUiStore } from '../state/uiStore';
import { buildingView, CAMERA, type Vec3 } from './constants';

type Controls = ComponentRef<typeof OrbitControls>;

interface CameraView {
  target: Vec3;
  offset: Vec3;
  zoom: number;
}

/** Where the camera should be for the overview or an open department. */
function viewFor(id: DepartmentId | null): CameraView {
  if (!id) return CAMERA.home;
  const v = buildingView(id, departmentById[id].level);
  return { target: v.plan, offset: CAMERA.planOffset, zoom: v.planZoom };
}

interface Tween {
  t0: number;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromOffset: THREE.Vector3;
  toOffset: THREE.Vector3;
  fromZoom: number;
  toZoom: number;
}

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const scratch = new THREE.Vector3();

/**
 * Orthographic camera with orbit controls. Flies to the open department (or
 * back to the whole site) whenever the selection changes; jumps instead of
 * flying when the user prefers reduced motion.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  // Held in state so the controls are only created once this camera exists;
  // otherwise drei builds them for the default camera first and then rebuilds them.
  const [camera, setCamera] = useState<THREE.OrthographicCamera | null>(null);
  const [controls, setControls] = useState<Controls | null>(null);
  const tween = useRef<Tween | null>(null);
  const placed = useRef(false);
  const size = useThree((s) => s.size);

  const selected = useUiStore((s) => s.selectedDeptId);
  const autoRotate = useUiStore((s) => s.autoRotate);
  const resetTick = useUiStore((s) => s.cameraResetTick);

  // Keep a fixed visible height in world units, whatever the stage size.
  useLayoutEffect(() => {
    if (!camera || !size.width || !size.height) return;
    const aspect = size.width / size.height;
    const vh = CAMERA.viewHeight(aspect);
    camera.left = (-vh * aspect) / 2;
    camera.right = (vh * aspect) / 2;
    camera.top = vh / 2;
    camera.bottom = -vh / 2;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  // Fly (or jump) whenever the selection changes or a reset is requested.
  // The first placement is always a jump, so a deep link opens straight on its floor.
  useEffect(() => {
    if (!camera || !controls) return;
    const view = viewFor(selected);
    const toTarget = new THREE.Vector3(...view.target);
    const toOffset = new THREE.Vector3(...view.offset);
    if (!placed.current || reducedMotion) {
      placed.current = true;
      tween.current = null;
      controls.target.copy(toTarget);
      camera.position.copy(toTarget).add(toOffset);
      camera.zoom = view.zoom;
      camera.updateProjectionMatrix();
      controls.update();
      return;
    }
    tween.current = {
      t0: performance.now(),
      fromTarget: controls.target.clone(),
      toTarget,
      fromOffset: camera.position.clone().sub(controls.target),
      toOffset,
      fromZoom: camera.zoom,
      toZoom: view.zoom,
    };
  }, [camera, controls, selected, resetTick, reducedMotion]);

  // Runs before OrbitControls' own update (priority -1), like the prototype's frame loop.
  useFrame(() => {
    const t = tween.current;
    if (!t || !camera || !controls) return;
    const k = Math.min(1, (performance.now() - t.t0) / CAMERA.tweenMs);
    const e = easeInOutCubic(k);
    controls.target.lerpVectors(t.fromTarget, t.toTarget, e);
    camera.position.copy(controls.target).add(scratch.lerpVectors(t.fromOffset, t.toOffset, e));
    camera.zoom = t.fromZoom + (t.toZoom - t.fromZoom) * e;
    camera.updateProjectionMatrix();
    if (k >= 1) tween.current = null;
  }, -2);

  return (
    <>
      <OrthographicCamera ref={setCamera} makeDefault manual near={-200} far={400} />
      {camera && (
        <OrbitControls
          ref={setControls}
          camera={camera}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minZoom={CAMERA.minZoom}
          maxZoom={CAMERA.maxZoom}
          minPolarAngle={CAMERA.minPolarAngle}
          maxPolarAngle={CAMERA.maxPolarAngle}
          screenSpacePanning
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
        />
      )}
    </>
  );
}
