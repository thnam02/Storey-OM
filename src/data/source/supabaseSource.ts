import type { SupabaseClient } from '@supabase/supabase-js';
import { RELATIONS, toSnapshot, type DbRows } from './rows';
import type { Action, DataSource } from './types';

/**
 * Reads the company from Supabase and saves changes through the database
 * functions (assign_task, delegate_task, complete_task, reopen_task,
 * decide_approval), which also write the activity log.
 */
export function createSupabaseSource(url: string, key: string): DataSource {
  let client: Promise<SupabaseClient> | null = null;
  const getClient = () =>
    (client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, { auth: { persistSession: false } })));
  // Employee slug → database id, from the last load.
  let employeeIds = new Map<string, string>();

  const read = async <K extends keyof DbRows>(db: SupabaseClient, name: K): Promise<DbRows[K]> => {
    const spec = RELATIONS[name];
    let q = db.from(name).select('*');
    for (const [column, ascending] of spec.order ?? []) q = q.order(column, { ascending, nullsFirst: false });
    if (spec.limit) q = q.limit(spec.limit);
    const { data, error } = await q;
    if (error) throw new Error(`Could not load ${name}: ${error.message}`);
    return data as DbRows[K];
  };

  const employee = (slug: string) => {
    const id = employeeIds.get(slug);
    if (!id) throw new Error(`Unknown person: ${slug}`);
    return id;
  };

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await (await getClient()).rpc(fn, args);
    if (error) throw new Error(error.message);
  };

  return {
    kind: 'supabase',
    load: async () => {
      const db = await getClient();
      const names = Object.keys(RELATIONS) as (keyof DbRows)[];
      const results = await Promise.all(names.map((name) => read(db, name)));
      const rows = Object.fromEntries(names.map((name, i) => [name, results[i]])) as unknown as DbRows;
      employeeIds = new Map(rows.employees.map((e) => [e.slug, e.id]));
      return toSnapshot(rows);
    },
    perform: async (action: Action) => {
      switch (action.type) {
        case 'assign':
          return rpc('assign_task', { p_assignee: employee(action.assigneeId), p_title: action.title, p_due: action.dueDate });
        case 'delegate':
          return rpc('delegate_task', { p_task: action.taskId, p_to: employee(action.toId) });
        case 'complete':
          return rpc('complete_task', { p_task: action.taskId });
        case 'reopen':
          return rpc('reopen_task', { p_task: action.taskId });
        case 'decide':
          return rpc('decide_approval', { p_approval: action.approvalId, p_state: action.state });
      }
    },
  };
}
