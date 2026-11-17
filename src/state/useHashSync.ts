import { useEffect } from 'react';
import { isDepartmentId } from '../data/sample';
import { useUiStore } from './uiStore';

const readHash = () => {
  const h = window.location.hash.slice(1);
  return isDepartmentId(h) ? h : null;
};

/** Keeps the selected department in the URL hash (#sales), like the prototype. */
export function useHashSync() {
  useEffect(() => {
    const { selectDept } = useUiStore.getState();
    selectDept(readHash());

    const onHash = () => useUiStore.getState().selectDept(readHash());
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
