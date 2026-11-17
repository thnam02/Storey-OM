import { useState } from 'react';
import { LINKED_HOME } from '../../data/metrics';
import { departmentById } from '../../data/sample';
import type { Employee, Task } from '../../data/types';
import { isOverdue, type Workload } from '../../data/workload';
import { formatDay } from '../../lib/dates';
import { useUiStore } from '../../state/uiStore';

interface Props {
  task: Task;
  today: string;
  viewerId: string;
  nameOf: (id: string) => string;
  /** Teammates it can be delegated to, with their workload for the picker. */
  targets: { person: Employee; workload: Workload }[];
  delegating: boolean;
  onStartDelegate: () => void;
  onCancelDelegate: () => void;
  onDelegate: (toId: string) => void;
}

function DueText({ task, today }: { task: Task; today: string }) {
  if (task.status === 'done') return <>Done {formatDay(task.doneAt ?? task.dueDate)}</>;
  if (isOverdue(task, today)) return <span className="due-late">Overdue · was due {formatDay(task.dueDate)}</span>;
  return <>{task.dueDate === today ? 'Due today' : `Due ${formatDay(task.dueDate)}`}</>;
}

/** The CRM record a task is about; opens the workspace that holds it. */
function LinkedRef({ task }: { task: Task }) {
  if (!task.linked) return null;
  const home = departmentById[LINKED_HOME[task.linked.type]];
  return (
    <button
      type="button"
      className="ref"
      title={`Open the ${home.name} workspace`}
      onClick={() => {
        const ui = useUiStore.getState();
        ui.setDeptTab('workspace');
        ui.selectDept(home.id);
      }}
    >
      {task.linked.label}
    </button>
  );
}

/** One task: title, due date, linked record, where it came from, and Delegate. */
export function TaskCard({ task, today, viewerId, nameOf, targets, delegating, onStartDelegate, onCancelDelegate, onDelegate }: Props) {
  const late = isOverdue(task, today);
  const done = task.status === 'done';
  const [to, setTo] = useState(targets[0]?.person.id ?? '');
  const selectId = `deleg-${task.id}`;

  return (
    <div className={`task${late ? ' late' : ''}${done ? ' done' : ''}`}>
      <span className="t">{task.title}</span>
      <span className="meta">
        <DueText task={task} today={today} />
        <LinkedRef task={task} />
        {task.delegatedFromId && <span>Delegated from {nameOf(task.delegatedFromId)}</span>}
        {task.createdById === viewerId && <span>Assigned by you</span>}
      </span>
      {!done && (
        <span className="acts">
          {delegating ? (
            <>
              <label className="sub" htmlFor={selectId}>
                Delegate to
              </label>
              <select id={selectId} value={to} autoFocus onChange={(e) => setTo(e.target.value)}>
                {targets.map(({ person, workload }) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({workload.open} open{person.presence === 'off_shift' ? ', off shift' : ''})
                  </option>
                ))}
              </select>
              <button className="btn sm primary" type="button" disabled={!to} onClick={() => onDelegate(to)}>
                Delegate
              </button>
              <button className="btn sm" type="button" onClick={onCancelDelegate}>
                Cancel
              </button>
            </>
          ) : (
            targets.length > 0 && (
              <button className="btn sm" type="button" onClick={onStartDelegate}>
                Delegate
              </button>
            )
          )}
        </span>
      )}
    </div>
  );
}
