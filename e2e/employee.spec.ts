/**
 * The employee view with the sample company: "My desk" with your own tasks,
 * your floor to find your desk, and nothing of anyone else's work.
 */
import type { Page } from '@playwright/test';
import { expect, flash, header, openSite, panel, taskCard, test } from './fixtures';

async function viewAs(page: Page, name: RegExp) {
  const select = header(page).getByRole('combobox');
  const label = await select.locator('option').filter({ hasText: name }).first().textContent();
  await select.selectOption({ label: label! });
}

test.beforeEach(async ({ page }) => {
  await openSite(page);
  await viewAs(page, /^Huong Le/);
  await expect(header(page)).toContainText('My desk');
});

test('an employee lands on their desk and manages their own to-dos', async ({ page }) => {
  await expect(panel(page).locator('.crumbs')).toHaveText('My desk');
  await expect(panel(page).getByRole('heading', { name: 'Huong Le' })).toBeVisible();
  await expect(panel(page).getByRole('button', { name: 'Message' })).toHaveCount(0);

  const todo = 'Prepare the demo kit for Lotus Grocers';
  await panel(page).getByRole('textbox', { name: 'Task' }).fill(todo);
  await panel(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(flash(page)).toHaveText(`Added “${todo}” to your to-dos.`);
  await taskCard(page, todo).getByRole('button', { name: 'Mark done' }).click();
  await expect(flash(page)).toHaveText(`Marked “${todo}” done.`);
  await expect(panel(page).locator('.feed')).toContainText(`You marked “${todo}” done.`);
  await expect(panel(page).locator('.feed')).toContainText(`You added “${todo}” to your to-dos.`);

  // Employees don't delegate.
  await expect(panel(page).getByRole('button', { name: 'Delegate' })).toHaveCount(0);
});

test("an employee opens their own floor but sees no one else's tasks", async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Finance, level 4, no access' })).toBeAttached();
  await page.getByRole('button', { name: /^Open Sales, level 2/ }).click();
  await expect(page).toHaveURL(/#sales$/);
  // Still their desk in the panel, not the team view.
  await expect(panel(page).getByRole('heading', { name: 'Huong Le' })).toBeVisible();
  await expect(panel(page).getByRole('tab')).toHaveCount(0);

  // Teammates' name tags carry no workload; their profile shows no tasks.
  const minh = page.locator('.labels .etag', { hasText: 'Minh T.' });
  await expect(minh).toHaveAttribute('aria-label', 'Minh Tran, Account manager.');
  await expect(page.locator('.labels .etag', { hasText: 'Huong L.' })).toHaveAttribute('aria-label', /^Huong Le, Account executive\. /);
  await page.goto('/#p-minh-tran');
  await expect(panel(page).getByRole('heading', { name: 'Minh Tran' })).toBeVisible();
  await expect(panel(page).getByText("Only managers and directors see other people's tasks.")).toBeVisible();
  await expect(panel(page).locator('.task')).toHaveCount(0);
  await panel(page).getByRole('button', { name: 'My desk' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Huong Le' })).toBeVisible();
});

test('another floor is locked, with a way back to the desk', async ({ page }) => {
  await page.getByRole('button', { name: 'Finance, level 4, no access' }).click();
  await expect(panel(page).getByText('You can see your own desk and tasks.')).toBeVisible();
  await panel(page).getByRole('button', { name: 'Back to my desk' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Huong Le' })).toBeVisible();
});

test("the manager sees an employee's own to-dos", async ({ page }) => {
  const todo = 'Follow up the Bondi Outfitters trial';
  await panel(page).getByRole('textbox', { name: 'Task' }).fill(todo);
  await panel(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(flash(page)).toHaveText(`Added “${todo}” to your to-dos.`);

  await viewAs(page, /^Daniel Reid/);
  await page.goto('/#p-huong-le');
  await expect(taskCard(page, todo)).toBeVisible();
  await expect(taskCard(page, todo).getByRole('button', { name: 'Delegate' })).toBeVisible();
});
