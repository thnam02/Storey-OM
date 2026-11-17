import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyAction } from '../data/source/applyAction';
import { createDataSource, type Action, type Snapshot } from '../data/source';
import { nowOnDay } from '../lib/zonedTime';
import { applyInitialHash } from './useHashSync';

/**
 * Server data through TanStack Query: one snapshot of the company, and one
 * mutation for every change. Changes show at once (optimistic) and are
 * replaced by what the database returns; a refused change rolls back.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const source = createDataSource();
export const dataSourceKind = source.kind;
const SNAPSHOT = ['snapshot'] as const;

let hashApplied = false;
async function loadSnapshot(): Promise<Snapshot> {
  const snap = await source.load();
  // Open the department or person in the URL before the first render, so a
  // deep link does not fly the camera in.
  if (!hashApplied) {
    applyInitialHash(snap.team.employees);
    hashApplied = true;
  }
  return snap;
}

export const useSnapshotQuery = () => useQuery({ queryKey: SNAPSHOT, queryFn: loadSnapshot });

/** The loaded snapshot. Only for components rendered after it has loaded. */
export function useSnapshot(): Snapshot {
  const { data } = useSnapshotQuery();
  if (!data) throw new Error('useSnapshot() used before the company data loaded');
  return data;
}

let pendingSeq = 0;

/** Save a change: assign, delegate, mark done, reopen, or decide an approval. */
export function useAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: Action) => source.perform(action),
    onMutate: async (action) => {
      await qc.cancelQueries({ queryKey: SNAPSHOT });
      const prev = qc.getQueryData<Snapshot>(SNAPSHOT);
      if (prev) {
        try {
          const ctx = { at: nowOnDay(prev.team.today, prev.timezone), entryId: `pending-${++pendingSeq}` };
          qc.setQueryData(SNAPSHOT, applyAction(prev, action, ctx));
        } catch {
          // The source will refuse it too and report why.
        }
      }
      return { prev };
    },
    onError: (_err, _action, ctx) => {
      if (ctx?.prev) qc.setQueryData(SNAPSHOT, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SNAPSHOT }),
  });
}
