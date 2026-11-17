import { nowOnDay } from '../../lib/zonedTime';
import { scopeSnapshot, viewerOf } from '../access';
import { SAMPLE_DATA } from '../sample';
import { SAMPLE_TEAM, SAMPLE_VIEWER_ID, sampleEmail } from '../sampleTeam';
import { applyAction } from './applyAction';
import type { DataSource, Snapshot } from './types';

export const SAMPLE_TIMEZONE = 'Australia/Sydney';

/**
 * The built-in sample company, kept in memory. Used when no database is
 * configured; changes last until the page is reloaded. There is no sign-in:
 * the app is used as one manager or director at a time (viewAs), and sees
 * what the database would show them.
 */
export function createSampleSource(): DataSource {
  // The whole company; load() returns the viewer's part of it.
  let full: Snapshot = {
    company: SAMPLE_DATA,
    team: SAMPLE_TEAM,
    viewer: viewerOf(SAMPLE_TEAM.employees, SAMPLE_VIEWER_ID),
    isSample: true,
    timezone: SAMPLE_TIMEZONE,
    activity: [],
  };
  let seq = 0;
  const listeners = new Set<() => void>();

  return {
    kind: 'sample',
    account: async () => (full.viewer ? { email: sampleEmail(full.viewer.id) } : null),
    onAccountChange: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    signIn: async () => {
      throw new Error('The sample has no sign-in. Pick who to view as instead.');
    },
    signOut: async () => {},
    viewAs: (employeeId) => {
      const viewer = viewerOf(full.team.employees, employeeId);
      if (!viewer) throw new Error(`${employeeId} has no access to the app`);
      full = { ...full, viewer };
      listeners.forEach((l) => l());
    },
    load: async () => scopeSnapshot(full),
    perform: async (action) => {
      full = applyAction(full, action, { at: nowOnDay(full.team.today, full.timezone), entryId: `a${++seq}` });
    },
  };
}
