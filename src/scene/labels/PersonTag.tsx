import { useCallback, type CSSProperties } from 'react';
import type { Employee } from '../../data/types';
import { ringColor, shortName, WORKLOAD_STATE, type Workload } from '../../data/workload';
import { useUiStore } from '../../state/uiStore';
import { figureRegistry } from '../people/figureRegistry';
import { labelAnchors } from './labelAnchors';

/**
 * Name tag above a person on the open floor: status ring colour, short name,
 * and a red count of overdue tasks. Follows the figure as it moves. Without a
 * workload (someone whose tasks the viewer can't see) the ring is neutral.
 */
export function PersonTag({ person, workload }: { person: Employee; workload: Workload | undefined }) {
  const selected = useUiStore((s) => s.selectedEmployeeId === person.id);
  const hovered = useUiStore((s) => s.hoveredEmployeeId === person.id);
  const { selectEmployee, hoverEmployee } = useUiStore.getState();

  const register = useCallback(
    (el: HTMLButtonElement | null) => {
      if (!el) return;
      el.style.visibility = 'hidden'; // until the first projection
      const key = `person:${person.id}`;
      labelAnchors.set(key, {
        el,
        align: 'top',
        resolve: (out) => {
          const fig = figureRegistry.get(person.id);
          if (!fig) return false;
          fig.object.getWorldPosition(out);
          out.y += fig.anchorY;
          return true;
        },
      });
      return () => {
        labelAnchors.delete(key);
      };
    },
    [person.id],
  );

  const state = workload ? WORKLOAD_STATE[workload.state] : null;
  const late = workload?.late ?? 0;
  return (
    <button
      ref={register}
      type="button"
      className={`etag${hovered ? ' hot' : ''}${selected ? ' active' : ''}`}
      style={{ '--w': ringColor(workload) } as CSSProperties}
      aria-label={`${person.name}, ${person.role}.${state ? ` ${state.label}${late ? `, ${late} overdue` : ''}` : ''}`}
      aria-pressed={selected}
      onClick={() => selectEmployee(person.id, person.departmentId)}
      onPointerEnter={() => hoverEmployee(person.id)}
      onPointerLeave={() => hoverEmployee(null)}
      onFocus={() => hoverEmployee(person.id)}
      onBlur={() => hoverEmployee(null)}
    >
      <span className="ring" />
      {shortName(person.name)}
      {late > 0 && <span className="late">{late}</span>}
    </button>
  );
}
