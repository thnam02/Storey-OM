import { useCallback, type CSSProperties } from 'react';
import type { Department } from '../../data/types';
import { useUiStore } from '../../state/uiStore';
import { buildingView } from '../constants';
import { labelAnchors } from './labelAnchors';

interface Props {
  dept: Department;
  /** Shows the yellow "!" when the department needs attention. */
  flagged: boolean;
  /** The viewer can't open it; clicking explains why. */
  locked: boolean;
}

/**
 * Pill label beside a floor or above the warehouse. It is a real DOM button
 * (keyboard reachable); LabelProjector keeps it pinned to its 3D anchor.
 * Hidden while a department is open.
 */
export function DeptLabel({ dept, flagged, locked }: Props) {
  const selected = useUiStore((s) => s.selectedDeptId);
  const hovered = useUiStore((s) => s.hoveredDeptId === dept.id);
  const { selectDept, hoverDept } = useUiStore.getState();

  const register = useCallback(
    (el: HTMLButtonElement | null) => {
      if (!el) return;
      const view = buildingView(dept.id, dept.level);
      el.style.visibility = 'hidden'; // until the first projection
      const [x, y, z] = view.labelAnchor;
      labelAnchors.set(`dept:${dept.id}`, { el, align: view.labelAlign, resolve: (out) => (out.set(x, y, z), true) });
      return () => {
        labelAnchors.delete(`dept:${dept.id}`);
      };
    },
    [dept.id, dept.level],
  );

  if (selected) return null;

  return (
    <button
      ref={register}
      type="button"
      className={`tag${hovered ? ' hot' : ''}${locked ? ' locked' : ''}`}
      style={{ '--c': dept.color } as CSSProperties}
      onClick={() => {
        hoverDept(null);
        selectDept(dept.id);
      }}
      onPointerEnter={() => hoverDept(dept.id)}
      onPointerLeave={() => hoverDept(null)}
      onFocus={() => hoverDept(dept.id)}
      onBlur={() => hoverDept(null)}
      aria-label={`${locked ? '' : 'Open '}${dept.name}${dept.level ? `, level ${dept.level}` : ''}${flagged ? ', needs attention' : ''}${locked ? ', no access' : ''}`}
    >
      <span className="dot" />
      <span>{dept.name}</span>
      {dept.level > 0 && <span className="lvl">L{dept.level}</span>}
      {locked && (
        <svg className="lock" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
          <rect x="1" y="5" width="9" height="6.5" rx="1.5" fill="currentColor" />
          <path d="M3 5V3.6a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {flagged && (
        <span className="flag" aria-hidden="true">
          !
        </span>
      )}
    </button>
  );
}
