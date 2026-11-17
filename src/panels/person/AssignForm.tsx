import { useState, type FormEvent } from 'react';
import type { Employee, Task } from '../../data/types';
import { dueDateOptions } from '../../lib/dates';
import { useDataStore } from '../../state/dataStore';

/** One-line form to give someone a new task. */
export function AssignForm({ person, onAssigned }: { person: Employee; onAssigned: (task: Task) => void }) {
  const today = useDataStore((s) => s.team.today);
  const assign = useDataStore((s) => s.assign);
  const options = dueDateOptions(today);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(options[1]?.value ?? today);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const task = assign(person.id, title, due);
    if (!task) return;
    setTitle('');
    onAssigned(task);
  };

  return (
    <form className="assign" onSubmit={submit}>
      <input name="title" type="text" placeholder="What needs doing?" aria-label="Task" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <select name="due" aria-label="Due date" value={due} onChange={(e) => setDue(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button className="btn primary" type="submit">
        Assign
      </button>
    </form>
  );
}
