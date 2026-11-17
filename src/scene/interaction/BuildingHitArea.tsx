import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { DepartmentId } from '../../data/types';
import { useUiStore } from '../../state/uiStore';
import type { Vec3 } from '../constants';
import { boxGeometry, hitMaterial } from '../materials';

/** Pointer travel (px) above which a press counts as a drag, not a click. */
const CLICK_TOLERANCE = 6;

interface Props {
  id: DepartmentId;
  color: string;
  /** Invisible clickable box. */
  hitSize: Vec3;
  /** Coloured glow box shown on hover, slightly larger than the building. */
  glowSize: Vec3;
  center: Vec3;
}

/**
 * Hover and click target for one floor or the warehouse. Emits hover and
 * selection through the UI store; the glow eases towards its target opacity.
 */
export function BuildingHitArea({ id, color, hitSize, glowSize, center }: Props) {
  const gl = useThree((s) => s.gl);
  const glow = useRef<THREE.Mesh>(null);
  const glowMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
    [color],
  );

  useFrame((_, dt) => {
    const mesh = glow.current;
    if (!mesh) return;
    const { hoveredDeptId, selectedDeptId } = useUiStore.getState();
    const hovered = hoveredDeptId === id && selectedDeptId !== id;
    const target = hovered ? (selectedDeptId ? 0.1 : 0.12) : 0;
    glowMaterial.opacity += (target - glowMaterial.opacity) * Math.min(1, dt * 10);
    mesh.visible = glowMaterial.opacity > 0.004;
  });

  const setCursor = (c: string) => {
    gl.domElement.style.cursor = c;
  };

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // only the nearest building reacts
    const { selectedDeptId, hoverDept } = useUiStore.getState();
    const selectable = selectedDeptId !== id;
    hoverDept(selectable ? id : null);
    setCursor(selectable ? 'pointer' : 'grab');
  };

  const onOut = () => {
    const { hoveredDeptId, hoverDept } = useUiStore.getState();
    if (hoveredDeptId === id) hoverDept(null);
    setCursor('grab');
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE) return; // that was a drag to orbit
    const { selectedDeptId, selectDept, hoverDept } = useUiStore.getState();
    if (selectedDeptId === id) return;
    hoverDept(null);
    selectDept(id);
  };

  return (
    <group position={center}>
      <mesh geometry={boxGeometry(...hitSize)} material={hitMaterial} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick} />
      <mesh ref={glow} geometry={boxGeometry(...glowSize)} material={glowMaterial} visible={false} />
    </group>
  );
}
