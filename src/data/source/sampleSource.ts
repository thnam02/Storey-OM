import { nowOnDay } from '../../lib/zonedTime';
import { SAMPLE_DATA } from '../sample';
import { SAMPLE_TEAM, SAMPLE_VIEWER_ID } from '../sampleTeam';
import { applyAction } from './applyAction';
import type { DataSource, Snapshot } from './types';

export const SAMPLE_TIMEZONE = 'Australia/Sydney';

/**
 * The built-in sample company, kept in memory. Used when no database is
 * configured; changes last until the page is reloaded.
 */
export function createSampleSource(): DataSource {
  let snap: Snapshot = {
    company: SAMPLE_DATA,
    team: SAMPLE_TEAM,
    viewerId: SAMPLE_VIEWER_ID,
    isSample: true,
    timezone: SAMPLE_TIMEZONE,
    activity: [],
  };
  let seq = 0;

  return {
    kind: 'sample',
    load: async () => snap,
    perform: async (action) => {
      snap = applyAction(snap, action, { at: nowOnDay(snap.team.today, snap.timezone), entryId: `a${++seq}` });
    },
  };
}
