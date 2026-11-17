/** Activity log entries (who did what) and how they read in the panels. */

export type ActivityAction = 'assign' | 'delegate' | 'complete' | 'reopen' | 'approve' | 'decline' | 'undo_decision';

export interface ActivityEntry {
  id: string;
  /** Local wall time in the company's time zone, "YYYY-MM-DDTHH:MM". */
  at: string;
  /** Employee who acted (slug), if known. */
  actorId: string | null;
  action: ActivityAction;
  entity: 'task' | 'approval';
  entityId: string;
  /** Task or approval title at the time. */
  title: string;
  /** People involved (slugs): who has the task, and for delegation who it moved from and to. */
  assigneeId: string | null;
  fromId: string | null;
  toId: string | null;
}

/** "You delegated “Chase payment” from Hannah Brooks to Lan Phan." */
export function describeActivity(e: ActivityEntry, nameOf: (id: string) => string, viewerId: string | null): string {
  const who = e.actorId === null ? 'Someone' : e.actorId === viewerId ? 'You' : nameOf(e.actorId);
  const what = `“${e.title}”`;
  const forWhom = e.assigneeId && e.assigneeId !== e.actorId ? ` for ${nameOf(e.assigneeId)}` : '';
  switch (e.action) {
    case 'assign':
      return `${who} assigned ${what} to ${e.assigneeId ? nameOf(e.assigneeId) : 'someone'}.`;
    case 'delegate':
      return `${who} delegated ${what} from ${e.fromId ? nameOf(e.fromId) : 'someone'} to ${e.toId ? nameOf(e.toId) : 'someone'}.`;
    case 'complete':
      return `${who} marked ${what} done${forWhom}.`;
    case 'reopen':
      return `${who} reopened ${what}${forWhom}.`;
    case 'approve':
      return `${who} approved ${what}.`;
    case 'decline':
      return `${who} declined ${what}.`;
    case 'undo_decision':
      return `${who} put ${what} back in the approval queue.`;
  }
}

/** Entries that involve a person: their tasks, or tasks moved to or from them. */
export const involves = (e: ActivityEntry, personId: string) =>
  e.assigneeId === personId || e.fromId === personId || e.toId === personId;
