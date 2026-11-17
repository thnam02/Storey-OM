import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';
import { visibleDepartments } from '../data/access';
import { applyAction } from '../data/source/applyAction';
import { createDataSource, type Action, type Snapshot } from '../data/source';
import { nowOnDay } from '../lib/zonedTime';
import { useUiStore } from './uiStore';
import { applyInitialHash } from './useHashSync';

/**
 * Server data through TanStack Query: the signed-in account, one snapshot of
 * what that person can see, and one mutation for every change. Changes show
 * at once (optimistic) and are replaced by what the database returns; a
 * refused change rolls back.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const source = createDataSource();
export const dataSourceKind = source.kind;
const ACCOUNT = ['account'] as const;
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
  // After the hash, so a link to a department the viewer can't open shows the locked notice.
  useUiStore.getState().setOpenable(visibleDepartments(snap.viewer));
  return snap;
}

/** The signed-in account (null: show the sign-in screen). Follows sign-in and sign-out. */
export function useAccountQuery() {
  const qc = useQueryClient();
  useEffect(
    () =>
      // Refetch in place, so switching who to view as in the sample keeps the 3D view.
      source.onAccountChange(() => {
        void qc.invalidateQueries({ queryKey: ACCOUNT });
        void qc.invalidateQueries({ queryKey: SNAPSHOT });
      }),
    [qc],
  );
  return useQuery({
    queryKey: ACCOUNT,
    queryFn: async () => {
      const account = await source.account();
      // Signed out: forget what the last person could see.
      if (!account) qc.removeQueries({ queryKey: SNAPSHOT });
      return account;
    },
    staleTime: Infinity,
  });
}

export const useSnapshotQuery = (enabled = true) => useQuery({ queryKey: SNAPSHOT, queryFn: loadSnapshot, enabled });

/**
 * The snapshot App is showing, passed down by context so panels always agree
 * with App, even while sign-out clears the cache.
 */
export const SnapshotContext = createContext<Snapshot | null>(null);

/** The loaded snapshot. Only for components rendered inside SnapshotContext. */
export function useSnapshot(): Snapshot {
  const snap = useContext(SnapshotContext);
  if (!snap) throw new Error('useSnapshot() used outside the loaded company view');
  return snap;
}

/** Email a sign-in link. */
export const useSignIn = () => useMutation({ mutationFn: (email: string) => source.signIn(email) });

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => source.signOut(),
    onSuccess: () => {
      // Signed out first, so the app swaps to the sign-in screen before the data goes.
      qc.setQueryData(ACCOUNT, null);
      qc.removeQueries({ queryKey: SNAPSHOT });
      useUiStore.getState().selectDept(null);
    },
  });
}

/** Sample only: use the app as another manager or director. */
export const viewAs = source.viewAs?.bind(source);

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
