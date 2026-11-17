import { ROLE_LABEL } from '../../data/access';
import { departmentById } from '../../data/sample';
import type { Snapshot } from '../../data/source';
import { useSignOut, viewAs } from '../../state/serverData';

/**
 * Who is using the app, in the header. With the sample (no database) there is
 * no sign-in, so this picks which manager or director to view as.
 */
export function ViewerControl({ snap }: { snap: Snapshot }) {
  const signOut = useSignOut();
  const { viewer, team } = snap;
  if (!viewer) return null;
  const me = team.employees.find((e) => e.id === viewer.id);
  const where = (deptId: keyof typeof departmentById) => departmentById[deptId].name;

  const switchTo = viewAs;
  if (switchTo) {
    const accounts = team.employees.filter((e) => e.access);
    return (
      <label className="viewer">
        <span className="sub">View as</span>
        <select value={viewer.id} onChange={(e) => switchTo(e.target.value)}>
          {accounts.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {e.access === 'director' ? ROLE_LABEL.director : `${ROLE_LABEL.manager}, ${where(e.departmentId)}`}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="viewer">
      <span>
        <b>{me?.name ?? viewer.id}</b>
        <span className="sub">
          {ROLE_LABEL[viewer.role]}
          {viewer.role === 'manager' && `, ${where(viewer.departmentId)}`}
        </span>
      </span>
      <button className="btn" type="button" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
        Sign out
      </button>
    </div>
  );
}
