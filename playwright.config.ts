import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * Key flows in a real browser, against the dev server.
 *
 *   sample    the built-in sample company (no database); always runs
 *   sign-in   the sign-in screen, with the Supabase auth API mocked; always runs
 *   supabase  real sign-in against a running local Supabase (`npx supabase start`);
 *             runs only with E2E_SUPABASE=1, since it needs Docker
 *
 * Uses the Chrome installed on this machine (channel: 'chrome'), with
 * software WebGL so the 3D view renders headless.
 */
const withSupabase = process.env.E2E_SUPABASE === '1';

/** The local Supabase API URL and publishable key, from `supabase status`. */
function localSupabase() {
  const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  return { url: status.API_URL as string, key: (status.PUBLISHABLE_KEY ?? status.ANON_KEY) as string };
}

const server = (port: number, env: Record<string, string>) => ({
  command: `npx vite --port ${port} --strictPort`,
  url: `http://localhost:${port}`,
  // Vite gives variables already in the environment priority over .env files.
  env,
  reuseExistingServer: false,
  timeout: 60_000,
});

const sb = withSupabase ? localSupabase() : null;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    viewport: { width: 1400, height: 1000 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'sample', testMatch: /(sample|employee)\.spec\.ts/, use: { baseURL: 'http://localhost:5180' } },
    { name: 'sign-in', testMatch: /signin\.spec\.ts/, use: { baseURL: 'http://localhost:5181' } },
    ...(sb ? [{ name: 'supabase', testMatch: /supabase\.spec\.ts/, use: { baseURL: 'http://localhost:5173' } }] : []),
  ],
  webServer: [
    server(5180, { VITE_SUPABASE_URL: '', VITE_SUPABASE_KEY: '' }),
    // Nothing listens here; the tests mock the auth API.
    server(5181, { VITE_SUPABASE_URL: 'http://127.0.0.1:54399', VITE_SUPABASE_KEY: 'test-key' }),
    // Supabase only redirects sign-in links to the address in supabase/config.toml.
    ...(sb ? [server(5173, { VITE_SUPABASE_URL: sb.url, VITE_SUPABASE_KEY: sb.key })] : []),
  ],
});
