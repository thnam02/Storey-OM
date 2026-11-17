import { createSampleSource } from './sampleSource';
import { createSupabaseSource } from './supabaseSource';
import type { DataSource } from './types';

/**
 * Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set (see
 * .env.example), otherwise the built-in sample company in memory.
 */
export function createDataSource(env: Record<string, string | undefined> = import.meta.env): DataSource {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_KEY?.trim();
  return url && key ? createSupabaseSource(url, key) : createSampleSource();
}

/** Whether the configured Supabase runs on this machine (its emails go to a local test inbox). */
export const supabaseIsLocal = (() => {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(import.meta.env.VITE_SUPABASE_URL ?? '').hostname);
  } catch {
    return false;
  }
})();

export type { Account, Action, DataSource, Snapshot } from './types';
