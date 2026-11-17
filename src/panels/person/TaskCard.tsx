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
  viewerId: string | null;
  /** False when nobody is signed in to make changes. */
  canEdit: boolean;
  nameOf: (id: string) => string;
  /** Teammates it can be delegated to, with their workload for the picker. */
  targets: { person: Employee; workload: Workload }[];
  delegating: boolean;
  onStartDelegate: () => void;
  onCancelDelegate: () => void;
  onDelegate: (toId: string) => void;
  onComplete: () => void;
  onReopen: () => void;
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

/** One task: title, due date, linked record, where it came from, and its actions. */
export function TaskCard(props: Props) {
  const { task, today, viewerId, canEdit, nameOf, targets, delegating, onStartDelegate, onCancelDelegate, onDelegate, onComplete, onReopen } = props;
  const late = isOverdue(task, today);
  const done = task.status === 'done';
  const [to, setTo] = useState(targets[0]?.person.id ?? '');
  const selectId = `deleg-${task.id}`;

  let actions = null;
  if (canEdit && done) {
    actions = (
      <button className="btn sm" type="button" onClick={onReopen}>
        Reopen
      </button>
    );
  } else if (canEdit && delegating) {
    actions = (
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
    );
  } else if (canEdit) {
    actions = (
      <>
        <button className="btn sm" type="button" onClick={onComplete}>
          Mark done
        </button>
        {targets.length > 0 && (
          <button className="btn sm" type="button" onClick={onStartDelegate}>
            Delegate
          </button>
        )}
      </>
    );
  }

  return (
    <div className={`task${late ? ' late' : ''}${done ? ' done' : ''}`}>
      <span className="t">{task.title}</span>
      <span className="meta">
        <DueText task={task} today={today} />
        <LinkedRef task={task} />
        {task.delegatedFromId && <span>Delegated from {nameOf(task.delegatedFromId)}</span>}
        {viewerId && task.createdById === viewerId && <span>Assigned by you</span>}
      </span>
      {actions && <span className="acts">{actions}</span>}
    </div>
  );
}
