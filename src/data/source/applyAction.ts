import type { ActivityEntry } from '../activity';
import { assignTask, completeTask, delegateTargets, delegateTask, reopenTask, setApprovalState } from '../taskOps';
import type { Action, Snapshot } from './types';

export interface ActionContext {
  /** Local wall time of the change, "YYYY-MM-DDTHH:MM". */
  at: string;
  /** Id for the new activity entry. */
  entryId: string;
}

/**
 * Apply a change to a snapshot, the same way the database does: the change
 * plus an activity entry. Used by the sample data source and for optimistic
 * updates while the database confirms. Throws with a readable message when
 * the change is not allowed; returns the same snapshot when there is nothing
 * to change.
 */
export function applyAction(snap: Snapshot, action: Action, ctx: ActionContext): Snapshot {
  if (!snap.viewerId) throw new Error('Sign in to make changes');
  const entry = (e: Omit<ActivityEntry, 'id' | 'at' | 'actorId'>): ActivityEntry[] => [
    { id: ctx.entryId, at: ctx.at, actorId: snap.viewerId, ...e },
    ...snap.activity,
  ];
  const { team } = snap;

  switch (action.type) {
    case 'assign': {
      if (!action.title.trim()) throw new Error('Enter what needs doing');
      const r = assignTask(team, { assigneeId: action.assigneeId, title: action.title, dueDate: action.dueDate, createdById: snap.viewerId });
      if (!r.task) throw new Error('That person is not in the company');
      return {
        ...snap,
        team: r.team,
        activity: entry({ action: 'assign', entity: 'task', entityId: r.task.id, title: r.task.title, assigneeId: r.task.assigneeId, fromId: null, toId: null }),
      };
    }
    case 'delegate': {
      const task = team.tasks.find((t) => t.id === action.taskId);
      if (!task) throw new Error('Task not found');
      if (task.status === 'done') throw new Error('Only open tasks can be delegated');
      if (task.assigneeId === action.toId) throw new Error('The task is already with that person');
      if (!delegateTargets(team, task).some((e) => e.id === action.toId)) throw new Error('Tasks can only be delegated within a department');
      const r = delegateTask(team, action.taskId, action.toId);
      return {
        ...snap,
        team: r.team,
        activity: entry({ action: 'delegate', entity: 'task', entityId: task.id, title: task.title, assigneeId: action.toId, fromId: task.assigneeId, toId: action.toId }),
      };
    }
    case 'complete':
    case 'reopen': {
      const task = team.tasks.find((t) => t.id === action.taskId);
      if (!task) throw new Error('Task not found');
      if ((task.status === 'done') === (action.type === 'complete')) return snap;
      const r = action.type === 'complete' ? completeTask(team, task.id, ctx.at.slice(0, 10)) : reopenTask(team, task.id);
      return {
        ...snap,
        team: r.team,
        activity: entry({ action: action.type, entity: 'task', entityId: task.id, title: task.title, assigneeId: task.assigneeId, fromId: null, toId: null }),
      };
    }
    case 'decide': {
      const approval = snap.company.management.approvals.find((a) => a.id === action.approvalId);
      if (!approval) throw new Error('Approval not found');
      if (approval.state === action.state) return snap;
      const verb = action.state === 'approved' ? 'approve' : action.state === 'declined' ? 'decline' : 'undo_decision';
      return {
        ...snap,
        company: setApprovalState(snap.company, approval.id, action.state),
        activity: entry({ action: verb, entity: 'approval', entityId: approval.id, title: approval.what, assigneeId: null, fromId: null, toId: null }),
      };
    }
  }
}
