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

export type { Action, DataSource, Snapshot } from './types';
