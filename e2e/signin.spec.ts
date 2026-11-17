/**
 * The sign-in screen when Supabase is configured. The auth API is mocked
 * here; supabase.spec.ts signs in for real against a local Supabase.
 */
import { expect, test } from './fixtures';

test('asks for a work email and sends a sign-in link', async ({ page }) => {
  let sentTo = '';
  await page.route('**/auth/v1/otp**', async (route) => {
    sentTo = route.request().postDataJSON().email;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in to Storey' })).toBeVisible();
  // Nothing about the company shows before sign-in.
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('header.top').getByRole('button')).toHaveCount(0);

  await page.getByLabel('Work email').fill('  rachel.tan@storey.example ');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('rachel.tan@storey.example');
  expect(sentTo).toBe('rachel.tan@storey.example');

  await page.getByRole('button', { name: 'Use another email' }).click();
  await expect(page.getByLabel('Work email')).toBeVisible();
});

test('says so when the sign-in server cannot be reached', async ({ page }) => {
  await page.route('**/auth/v1/otp**', (route) => route.abort('connectionrefused'));
  await page.goto('/');
  await page.getByLabel('Work email').fill('rachel.tan@storey.example');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('alert')).toHaveText(/Couldn't send the link: the sign-in server can't be reached/);
});
