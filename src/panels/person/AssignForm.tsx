import { useState, type FormEvent } from 'react';
import type { Employee } from '../../data/types';
import { dueDateOptions } from '../../lib/dates';
import { useAction, useSnapshot } from '../../state/serverData';

/** One-line form to give someone a new task, or add a to-do for yourself. */
export function AssignForm({ person, onDone }: { person: Employee; onDone: (message: string) => void }) {
  const { team, viewer } = useSnapshot();
  const today = team.today;
  const forMe = viewer?.id === person.id;
  const action = useAction();
  const options = dueDateOptions(today);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(options[1]?.value ?? today);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle('');
    action.mutate(
      { type: 'assign', assigneeId: person.id, title: trimmed, dueDate: due },
      {
        onSuccess: () => onDone(forMe ? `Added “${trimmed}” to your to-dos.` : `Assigned to ${person.name}.`),
        onError: (err) => {
          setTitle(trimmed);
          onDone(`Couldn't assign “${trimmed}”: ${err.message}`);
        },
      },
    );
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
        {forMe ? 'Add' : 'Assign'}
      </button>
    </form>
  );
}
