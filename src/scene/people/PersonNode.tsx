import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Employee } from '../../data/types';
import { useUiStore } from '../../state/uiStore';
import { figureRegistry } from './figureRegistry';

const RING_GEOMETRY = new THREE.RingGeometry(0.34, 0.5, 32);
const RING_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];
const CLICK_TOLERANCE = 6;

interface Props {
  person: Employee;
  /** Workload colour for the status ring. */
  ringColor: string;
  /** True while the person's department is open: shows the ring and makes them clickable. */
  open: boolean;
  /** Pulse the ring of the selected person (off under reduced motion). */
  animate: boolean;
  anchorY: number;
  ringScale?: number;
  children: ReactNode;
}

/**
 * A person in the scene: their figure, a status ring on the floor, hover and
 * click. Registers itself so the DOM name tag can follow it.
 */
export function PersonNode({ person, ringColor, open, animate, anchorY, ringScale = 1, children }: Props) {
  const gl = useThree((s) => s.gl);
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false }),
    [],
  );

  useEffect(() => {
    ringMaterial.color.set(ringColor);
  }, [ringColor, ringMaterial]);

  useEffect(() => {
    const object = group.current;
    if (!object) return;
    figureRegistry.set(person.id, { object, anchorY });
    return () => {
      if (figureRegistry.get(person.id)?.object === object) figureRegistry.delete(person.id);
    };
  }, [person.id, anchorY]);

  useFrame(({ clock }) => {
    const r = ring.current;
    if (!r || !r.visible) return;
    const { selectedEmployeeId, hoveredEmployeeId } = useUiStore.getState();
    const selected = selectedEmployeeId === person.id;
    const s = selected ? 1.35 + (animate ? Math.sin(clock.elapsedTime * 5) * 0.12 : 0) : hoveredEmployeeId === person.id ? 1.25 : 1;
    r.scale.setScalar(ringScale * s);
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useUiStore.getState().hoverEmployee(person.id);
    gl.domElement.style.cursor = 'pointer';
  };
  const onOut = () => {
    const { hoveredEmployeeId, hoverEmployee } = useUiStore.getState();
    if (hoveredEmployeeId === person.id) hoverEmployee(null);
    gl.domElement.style.cursor = 'grab';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE) return;
    useUiStore.getState().selectEmployee(person.id, person.departmentId);
  };

  return (
    <group
      ref={group}
      onPointerOver={open ? onOver : undefined}
      onPointerOut={open ? onOut : undefined}
      onClick={open ? onClick : undefined}
    >
      {children}
      <mesh ref={ring} geometry={RING_GEOMETRY} material={ringMaterial} rotation={RING_ROT} position-y={0.03} renderOrder={2} visible={open} />
    </group>
  );
}
