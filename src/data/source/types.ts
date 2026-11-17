import type { Viewer } from '../access';
import type { ActivityEntry } from '../activity';
import type { ApprovalState, CompanyData, TeamData } from '../types';

/** Everything the app shows, loaded in one go. */
export interface Snapshot {
  company: CompanyData;
  team: TeamData;
  /** The manager or director using the app; null when the account has no access. */
  viewer: Viewer | null;
  /** Sample data is clearly marked in the UI until real data is connected. */
  isSample: boolean;
  /** Company time zone, for showing times. */
  timezone: string;
  /** Newest first. */
  activity: ActivityEntry[];
}

/** A change a manager makes. Each one is logged. */
export type Action =
  | { type: 'assign'; assigneeId: string; title: string; dueDate: string }
  | { type: 'delegate'; taskId: string; toId: string }
  | { type: 'complete'; taskId: string }
  | { type: 'reopen'; taskId: string }
  | { type: 'decide'; approvalId: string; state: ApprovalState };

/** The signed-in account. */
export interface Account {
  email: string;
}

/** Where data comes from: the built-in sample, or Supabase. */
export interface DataSource {
  readonly kind: 'sample' | 'supabase';
  /** The signed-in account, or null. The sample is always signed in as its viewer. */
  account(): Promise<Account | null>;
  /** Calls back when someone signs in or out. Returns an unsubscribe function. */
  onAccountChange(callback: () => void): () => void;
  /** Emails a sign-in link (Supabase only). */
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Sample only: use the app as another manager or director. */
  viewAs?(employeeId: string): void;
  /** What the signed-in viewer can see. */
  load(): Promise<Snapshot>;
  /** Saves a change. Rejects with a readable message if it is refused. */
  perform(action: Action): Promise<void>;
}
