import { create } from 'zustand';
import { SAMPLE_DATA } from '../data/sample';
import { SAMPLE_TEAM, SAMPLE_VIEWER_ID } from '../data/sampleTeam';
import { assignTask, delegateTask, setApprovalState } from '../data/taskOps';
import type { ApprovalState, CompanyData, Task, TeamData } from '../data/types';

/**
 * Company and team data, held in memory. Stand-in for the server until the
 * database exists (build order steps 4 and 5): changes last until reload.
 */
export interface DataState {
  company: CompanyData;
  team: TeamData;
  /** The signed-in manager. Sample until auth exists (step 6). */
  viewerId: string;

  assign: (assigneeId: string, title: string, dueDate: string) => Task | null;
  delegate: (taskId: string, toId: string) => Task | null;
  setApproval: (id: string, state: ApprovalState) => void;
}

export const useDataStore = create<DataState>()((set, get) => ({
  company: SAMPLE_DATA,
  team: SAMPLE_TEAM,
  viewerId: SAMPLE_VIEWER_ID,

  assign: (assigneeId, title, dueDate) => {
    const { team, task } = assignTask(get().team, { assigneeId, title, dueDate, createdById: get().viewerId });
    if (task) set({ team });
    return task;
  },
  delegate: (taskId, toId) => {
    const { team, task } = delegateTask(get().team, taskId, toId);
    if (task) set({ team });
    return task;
  },
  setApproval: (id, state) => set((s) => ({ company: setApprovalState(s.company, id, state) })),
}));
