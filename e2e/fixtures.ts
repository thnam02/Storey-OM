import { test as base, expect, type Locator, type Page } from '@playwright/test';

/** Fails a test if the page throws (a crashed panel, for example). */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (e) => errors.push(e));
      await use(errors);
      expect(errors.map((e) => e.message), 'errors thrown in the page').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export const panel = (page: Page) => page.locator('aside.panel');
export const header = (page: Page) => page.locator('header.top');

/** A task card in the panel, found by its title. */
export const taskCard = (page: Page, title: string): Locator => panel(page).locator('.task', { hasText: title });

/** The panel's flash message after a change. */
export const flash = (page: Page) => panel(page).getByRole('status').filter({ hasText: /\S/ });

/** Wait for the 3D site and the panel (department labels only show while no department is open). */
export async function openSite(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(panel(page).getByRole('heading', { level: 2 })).toBeVisible();
}
