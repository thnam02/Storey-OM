/**
 * The key flows with the built-in sample company (no database): open a floor,
 * open a person, assign, delegate, mark done; and what each role can open.
 * Changes live in memory, so every test starts from the same sample.
 */
import type { Page } from '@playwright/test';
import { expect, flash, header, openSite, panel, taskCard, test } from './fixtures';

/** Pick who to use the sample as, from the header's View as menu. */
async function viewAs(page: Page, name: RegExp) {
  const select = header(page).getByRole('combobox');
  const label = await select.locator('option').filter({ hasText: name }).first().textContent();
  await select.selectOption({ label: label! });
}

test('open a floor, open a person, assign, delegate, mark done and reopen', async ({ page }) => {
  await openSite(page);
  await expect(panel(page).getByRole('heading', { name: 'Company overview' })).toBeVisible();

  // Building → floor plan: the Sales label beside level 2.
  await page.getByRole('button', { name: /^Open Sales, level 2/ }).click();
  await expect(page).toHaveURL(/#sales$/);
  await expect(panel(page).getByRole('heading', { name: 'Sales' })).toBeVisible();
  await expect(panel(page).getByRole('tab', { name: /Team \(14\)/ })).toHaveAttribute('aria-selected', 'true');

  // Floor plan → person: from the team list, and the name tag on the floor is there too.
  await expect(page.locator('.labels .etag', { hasText: 'Huong L.' })).toBeAttached();
  await panel(page).getByRole('button', { name: /Huong Le/ }).click();
  await expect(page).toHaveURL(/#p-huong-le$/);
  await expect(panel(page).getByRole('heading', { name: 'Huong Le' })).toBeVisible();

  // Assign.
  const title = 'Call Lotus Grocers about the café bundle';
  await panel(page).getByRole('textbox', { name: 'Task' }).fill(title);
  await panel(page).getByRole('button', { name: 'Assign' }).click();
  await expect(flash(page)).toHaveText('Assigned to Huong Le.');
  await expect(taskCard(page, title)).toContainText('Assigned by you');

  // Delegate to a teammate in Sales.
  await taskCard(page, title).getByRole('button', { name: 'Delegate' }).click();
  const to = taskCard(page, title).getByLabel('Delegate to');
  const minh = await to.locator('option', { hasText: 'Minh Tran' }).textContent();
  await to.selectOption({ label: minh! });
  await taskCard(page, title).getByRole('button', { name: 'Delegate' }).click();
  await expect(flash(page)).toHaveText(`“${title}” is now with Minh Tran.`);
  await expect(taskCard(page, title)).toHaveCount(0);

  // It is on Minh's list now, delegated from Huong; mark it done, then reopen it.
  await page.goto('/#p-minh-tran');
  await expect(panel(page).getByRole('heading', { name: 'Minh Tran' })).toBeVisible();
  await expect(taskCard(page, title)).toContainText('Delegated from Huong Le');
  await taskCard(page, title).getByRole('button', { name: 'Mark done' }).click();
  await expect(flash(page)).toHaveText(`Marked “${title}” done.`);
  await expect(panel(page).locator('.task.done', { hasText: title })).toBeVisible();
  await taskCard(page, title).getByRole('button', { name: 'Reopen' }).click();
  await expect(flash(page)).toHaveText(`Reopened “${title}”.`);
  await expect(taskCard(page, title).getByRole('button', { name: 'Mark done' })).toBeVisible();
});

test('the activity log follows every change', async ({ page }) => {
  await openSite(page, '/#p-hannah-brooks');
  const overdue = 'Chase payment from Harbourline Retail';
  await taskCard(page, overdue).getByRole('button', { name: 'Mark done' }).click();
  await expect(flash(page)).toHaveText(`Marked “${overdue}” done.`);
  await expect(panel(page).locator('.feed')).toContainText(`You marked “${overdue}” done for Hannah Brooks.`);

  // The overview shows it too, and the overdue count dropped from 19 to 18.
  await header(page).getByRole('button', { name: 'Whole building' }).click();
  await expect(panel(page).locator('.feed')).toContainText(`You marked “${overdue}” done for Hannah Brooks.`);
  await expect(panel(page).locator('.kpi', { hasText: 'Overdue tasks' })).toContainText('18');
});

test('a manager opens only their own department', async ({ page }) => {
  await openSite(page);
  await viewAs(page, /^Rachel Tan/);
  await expect(panel(page).locator('.kpi', { hasText: 'Open tasks' })).toContainText('in Finance');
  await expect(panel(page).locator('.ditem.locked')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Sales, level 2, no access' })).toBeAttached();

  // Clicking a locked floor explains instead of opening it.
  await page.getByRole('button', { name: 'Sales, level 2, no access' }).click();
  await expect(panel(page).getByText('No access')).toBeVisible();
  await expect(page).toHaveURL(/#sales$/);
  await panel(page).getByRole('button', { name: 'Open Finance' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Finance' })).toBeVisible();
  await expect(panel(page).getByRole('tab', { name: /Team/ })).toBeVisible();

  // A link to someone in another department lands on the notice too.
  await page.goto('/#p-huong-le');
  await expect(panel(page).getByRole('heading', { name: 'Sales' })).toBeVisible();
  await expect(panel(page).getByText(/Only directors can open other departments/)).toBeVisible();
});

test('only directors decide approvals', async ({ page }) => {
  await openSite(page, '/#management');
  await panel(page).getByRole('tab', { name: 'Company' }).click();
  const request = panel(page).locator('.item', { hasText: 'Raise December ad budget' });
  await request.getByRole('button', { name: 'Approve' }).click();
  await expect(request).toContainText('Approved');
  await request.getByRole('button', { name: 'Undo' }).click();
  await expect(request.getByRole('button', { name: 'Approve' })).toBeVisible();

  // Marketing's manager can't open Management at all.
  await viewAs(page, /^Emma Lawson/);
  await expect(panel(page).getByText('No access')).toBeVisible();
});

test('switching who to view as keeps the 3D view and changes what is shown', async ({ page }) => {
  await openSite(page, '/#finance');
  const canvas = await page.locator('canvas').elementHandle();
  await viewAs(page, /^Daniel Reid/);
  await expect(panel(page).getByText('No access')).toBeVisible();
  await viewAs(page, /^Michael Chen/);
  // Access is back, so Finance opens again.
  await expect(panel(page).getByRole('heading', { name: 'Finance' })).toBeVisible();
  expect(await canvas!.evaluate((c) => c.isConnected)).toBe(true);
});
