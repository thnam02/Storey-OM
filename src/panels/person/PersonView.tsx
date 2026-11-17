import { useMemo, useState } from 'react';
import { involves } from '../../data/activity';
import { loadOf, teamWorkload } from '../../data/metrics';
import { firstName, presenceLabel, presenceTone } from '../../data/people';
import { departmentById } from '../../data/sample';
import { delegateTargets } from '../../data/taskOps';
import type { Employee, Task } from '../../data/types';
import { isOverdue, WORKLOAD_STATE } from '../../data/workload';
import { useAction, useSnapshot } from '../../state/serverData';
import { useUiStore } from '../../state/uiStore';
import { ActivityFeed } from '../ActivityFeed';
import { accent, Chip, Crumbs, Kpi, Section } from '../ui';
import { AssignForm } from './AssignForm';
import { TaskCard } from './TaskCard';

/**
 * One person: presence, workload, their tasks by status, a form to assign new
 * work, delegation to teammates, marking done, and recent activity. Mount
 * with key={person.id} so messages and the delegate picker reset between people.
 */
export function PersonView({ person }: { person: Employee }) {
  const { team, viewerId, activity } = useSnapshot();
  const action = useAction();
  const { selectDept } = useUiStore.getState();
  const [msgOpen, setMsgOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [delegating, setDelegating] = useState<string | null>(null);
  const canEdit = viewerId !== null;

  const d = departmentById[person.departmentId];
  const load = teamWorkload(team);
  const w = loadOf(load, person.id);
  const state = WORKLOAD_STATE[w.state];
  const first = firstName(person.name);

  const names = useMemo(() => new Map(team.employees.map((e) => [e.id, e.name])), [team.employees]);
  const nameOf = (id: string) => names.get(id) ?? 'someone';

  const mine = team.tasks.filter((t) => t.assigneeId === person.id);
  const byDue = (a: Task, b: Task) => Number(isOverdue(b, team.today)) - Number(isOverdue(a, team.today)) || a.dueDate.localeCompare(b.dueDate);
  const doing = mine.filter((t) => t.status === 'doing').sort(byDue);
  const todo = mine.filter((t) => t.status === 'todo').sort(byDue);
  const done = mine.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt ?? b.dueDate).localeCompare(a.doneAt ?? a.dueDate));
  const total = Math.max(1, w.open + done.length);

  /** Save a change and report how it went. */
  const run = (a: Parameters<typeof action.mutate>[0], ok: string, failed: string) =>
    action.mutate(a, { onSuccess: () => setFlash(ok), onError: (err) => setFlash(`${failed}: ${err.message}`) });

  const card = (t: Task) => (
    <TaskCard
      key={t.id}
      task={t}
      today={team.today}
      viewerId={viewerId}
      canEdit={canEdit}
      nameOf={nameOf}
      targets={delegateTargets(team, t).map((p) => ({ person: p, workload: loadOf(load, p.id) }))}
      delegating={delegating === t.id}
      onStartDelegate={() => {
        setDelegating(t.id);
        setFlash(null);
      }}
      onCancelDelegate={() => setDelegating(null)}
      onDelegate={(toId) => {
        setDelegating(null);
        run({ type: 'delegate', taskId: t.id, toId }, `“${t.title}” is now with ${nameOf(toId)}.`, `Couldn't delegate “${t.title}”`);
      }}
      onComplete={() => run({ type: 'complete', taskId: t.id }, `Marked “${t.title}” done.`, `Couldn't mark “${t.title}” done`)}
      onReopen={() => run({ type: 'reopen', taskId: t.id }, `Reopened “${t.title}”.`, `Couldn't reopen “${t.title}”`)}
    />
  );
  const group = (title: string, list: Task[], empty: string) => (
    <Section title={title} small={list.length}>
      <div className="list">{list.length ? list.map(card) : <div className="sub">{empty}</div>}</div>
    </Section>
  );

  return (
    <>
      <div className="ph" style={accent(d.color)}>
        <Crumbs
          parts={[
            { label: 'Company HQ', onClick: () => selectDept(null) },
            { label: d.name, onClick: () => selectDept(d.id) },
            { label: person.name },
          ]}
        />
        <div className="row1">
          <div>
            <h2>
              <span className="swatch" />
              {person.name}
            </h2>
            <div className="role">
              {person.role} · {d.name}
            </div>
          </div>
          <div className="acts">
            <button className="btn sm" type="button" aria-expanded={msgOpen} onClick={() => setMsgOpen((o) => !o)}>
              Message
            </button>
          </div>
        </div>
        <div className="status">
          <Chip tone={presenceTone(person)}>{presenceLabel(person)}</Chip>
          <Chip tone={state.tone}>{state.label}</Chip>
        </div>
      </div>
      <div className="pb" style={accent(d.color)}>
        {msgOpen && (
          <div className="note msg">
            Messaging isn't connected yet. In the full app, this button opens a chat with {first} in your company's chat tool, such as Slack,
            Microsoft Teams or Zalo.
          </div>
        )}
        <div role="status" className={flash ? 'note msg' : undefined} hidden={!flash}>
          {flash}
        </div>
        <div className="kpis four">
          <Kpi k="In progress" v={w.doing} />
          <Kpi k="To do" v={w.todo} />
          <Kpi k="Overdue" v={w.late} late={w.late > 0} />
          <Kpi k="Done this week" v={w.doneThisWeek} />
        </div>
        <div className="load" title="Task mix: in progress, to do, done">
          <i style={{ width: `${(w.doing / total) * 100}%`, background: d.color }} />
          <i style={{ width: `${(w.todo / total) * 100}%`, background: '#c7d1d7' }} />
          <i style={{ width: `${((total - w.open) / total) * 100}%`, background: '#e3e9ec' }} />
        </div>
        {canEdit ? (
          <Section title={`Assign a task to ${first}`}>
            <AssignForm
              person={person}
              onDone={(message) => {
                setDelegating(null);
                setFlash(message);
              }}
            />
          </Section>
        ) : (
          <div className="note">Sign in to assign, delegate or complete tasks.</div>
        )}
        {group('In progress', doing, 'Nothing in progress.')}
        {group('To do', todo, 'Nothing waiting.')}
        {group('Done', done, 'Nothing finished yet.')}
        <ActivityFeed entries={activity.filter((e) => involves(e, person.id))} limit={5} />
      </div>
    </>
  );
}
