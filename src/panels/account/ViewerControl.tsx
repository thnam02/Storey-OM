import { ROLE_LABEL } from '../../data/access';
import { DEPARTMENTS, departmentById } from '../../data/sample';
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
    const people = team.employees.filter((e) => e.access);
    const groups: [string, typeof people][] = [
      ['Directors', people.filter((e) => e.access === 'director')],
      ['Managers', people.filter((e) => e.access === 'manager')],
      ...DEPARTMENTS.map((d): [string, typeof people] => [`Staff · ${d.name}`, people.filter((e) => e.access === 'employee' && e.departmentId === d.id)]),
    ];
    return (
      <label className="viewer">
        <span className="sub">View as</span>
        <select value={viewer.id} onChange={(e) => switchTo(e.target.value)}>
          {groups
            .filter(([, list]) => list.length)
            .map(([label, list]) => (
              <optgroup key={label} label={label}>
                {list.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.access === 'director' ? ROLE_LABEL.director : e.access === 'manager' ? `${ROLE_LABEL.manager}, ${where(e.departmentId)}` : e.role}
                  </option>
                ))}
              </optgroup>
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
          {viewer.role !== 'director' && `, ${where(viewer.departmentId)}`}
        </span>
      </span>
      <button className="btn" type="button" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
        Sign out
      </button>
    </div>
  );
}
