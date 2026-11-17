import type { CSSProperties, ReactNode } from 'react';
import { departmentById } from '../data/sample';
import type { DepartmentId } from '../data/types';
import { useUiStore } from '../state/uiStore';

/** Small building blocks shared by every panel, styled after the prototype. */

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

/** Sets the department accent colour (--c) for swatches, tabs and bars. */
export const accent = (color: string) => ({ '--c': color }) as CSSProperties;

export function Kpi({ k, v, s, late }: { k: string; v: ReactNode; s?: ReactNode; late?: boolean }) {
  return (
    <div className="kpi">
      <div className="k">{k}</div>
      <div className={`v${late ? ' late' : ''}`}>{v}</div>
      {s ? <div className="s">{s}</div> : null}
    </div>
  );
}

export const Chip = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`chip ${tone}`}>{children}</span>;

export function Section({ title, small, children }: { title: ReactNode; small?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h3>
        {title}
        {small !== undefined && <small>{small}</small>}
      </h3>
      {children}
    </section>
  );
}

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function Crumbs({ parts }: { parts: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {parts.map((p, i) => (
        <span key={i} className="crumb">
          {i > 0 && <span aria-hidden="true">›</span>}
          {p.onClick ? (
            <button type="button" onClick={p.onClick}>
              {p.label}
            </button>
          ) : (
            <span aria-current={i === parts.length - 1 ? 'page' : undefined}>{p.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Inline link that opens another department. */
export function DeptLink({ id, tab }: { id: DepartmentId; tab?: 'team' | 'workspace' }) {
  return (
    <button
      type="button"
      className="link"
      onClick={() => {
        const ui = useUiStore.getState();
        if (tab) ui.setDeptTab(tab);
        ui.selectDept(id);
      }}
    >
      {departmentById[id].name}
    </button>
  );
}

/** Label, bar and value in one row. */
export function BarRow({ label, pct, value, color }: { label: ReactNode; pct: number; value: ReactNode; color?: string }) {
  return (
    <div className="brow">
      <span>{label}</span>
      <span className="bar">
        <i style={{ width: `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`, ...(color ? { background: color } : {}) }} />
      </span>
      <span className="num">{value}</span>
    </div>
  );
}

/** Time (or short code) and text, one per line. */
export function Feed({ items }: { items: { t: string; body: ReactNode }[] }) {
  return (
    <div className="feed">
      {items.map((it, i) => (
        <div key={i}>
          <span className="t">{it.t}</span>
          <span>{it.body}</span>
        </div>
      ))}
    </div>
  );
}
