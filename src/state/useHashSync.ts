import { useEffect } from 'react';
import { deptFromHash, useUiStore } from './uiStore';

/** Keeps the selected department in the URL hash (#sales), like the prototype. */
export function useHashSync() {
  useEffect(() => {
    const onHash = () => useUiStore.getState().selectDept(deptFromHash());
    window.addEventListener('hashchange', onHash);

    const unsubscribe = useUiStore.subscribe((s, prev) => {
      if (s.selectedDeptId === prev.selectedDeptId) return;
      const next = s.selectedDeptId ?? 'overview';
      if (window.location.hash.slice(1) !== next) window.location.hash = next;
    });

    return () => {
      window.removeEventListener('hashchange', onHash);
      unsubscribe();
    };
  }, []);
}
