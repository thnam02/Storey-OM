/**
 * Real sign-in against a local Supabase: the emailed link is read from the
 * local test inbox (Mailpit). Run with `npm run test:e2e:supabase` while
 * `npx supabase start` is running. Every change is undone, so the test can
 * run again on the same database.
 */
import type { Page } from '@playwright/test';
import { expect, flash, header, panel, taskCard, test } from './fixtures';

const INBOX = 'http://127.0.0.1:54324';

/** Ask for a sign-in link and open it from the test inbox. */
async function signIn(page: Page, email: string, { hasAccess = true } = {}) {
  const since = Date.now();
  await page.goto('/');
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  let link: string | undefined;
  await expect
    .poll(async () => {
      const found = await (await fetch(`${INBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
      const newest = found.messages?.[0];
      if (!newest || Date.parse(newest.Created) < since - 1000) return undefined;
      const message = await (await fetch(`${INBOX}/api/v1/message/${newest.ID}`)).json();
      link = String(message.HTML || message.Text).match(/https?:\/\/[^"'\s<>]*verify[^"'\s<>]*/)?.[0]?.replace(/&amp;/g, '&');
      return link;
    }, { message: `sign-in email for ${email}` })
    .toBeTruthy();
  await page.goto(link!);
  if (hasAccess) await expect(header(page).locator('.viewer')).toBeVisible();
}

async function signOut(page: Page) {
  await header(page).getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Storey' })).toBeVisible();
}

test('a manager signs in, sees their department, saves a change, and signs out', async ({ page }) => {
  await signIn(page, 'rachel.tan@storey.example');
  await expect(header(page).locator('.viewer')).toContainText('Rachel Tan');
  await expect(header(page).locator('.viewer')).toContainText('Manager, Finance');
  await expect(panel(page).locator('.ditem.locked')).toHaveCount(5);

  const title = 'Send reminder to Pacific Medical Supplies';
  await page.goto('/#p-hannah-brooks');
  await taskCard(page, title).getByRole('button', { name: 'Mark done' }).click();
  await expect(flash(page)).toHaveText(`Marked “${title}” done.`);

  // Saved in the database: still done after a reload.
  await page.reload();
  await expect(panel(page).locator('.task.done', { hasText: title })).toBeVisible();
  await taskCard(page, title).getByRole('button', { name: 'Reopen' }).click();
  await expect(flash(page)).toHaveText(`Reopened “${title}”.`);
  await page.reload();
  await expect(taskCard(page, title).getByRole('button', { name: 'Mark done' })).toBeVisible();

  // Another department is locked here too, by the database.
  await page.goto('/#p-huong-le');
  await expect(panel(page).getByText(/Only directors can open other departments/)).toBeVisible();

  await signOut(page);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('auth-token')))).toEqual([]);
});

test('a director decides approvals', async ({ page }) => {
  await signIn(page, 'michael.chen@storey.example');
  await expect(header(page).locator('.viewer')).toContainText('Director');
  await page.goto('/#management');
  await panel(page).getByRole('tab', { name: 'Company' }).click();
  const request = panel(page).locator('.item', { hasText: 'Hire a warehouse shift supervisor' });
  await request.getByRole('button', { name: 'Approve' }).click();
  await expect(request).toContainText('Approved');
  await page.reload();
  await panel(page).getByRole('tab', { name: 'Company' }).click();
  await request.getByRole('button', { name: 'Undo' }).click();
  await expect(request.getByRole('button', { name: 'Approve' })).toBeVisible();
  await signOut(page);
});

test('an account that is not a manager or director sees nothing', async ({ page }) => {
  await signIn(page, 'stranger@elsewhere.example', { hasAccess: false });
  await expect(page.getByRole('heading', { name: "This account isn't set up for Storey" })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Storey' })).toBeVisible();
});
