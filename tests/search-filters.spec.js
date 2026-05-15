import { test, expect } from '@playwright/test';
import { firstPublication, firstProject, publications } from './fixtures.js';
import { capturePageErrors, expectHealthyLayout, navigateHash } from './helpers.js';

test.describe('search, filters and interactions', () => {
  test.beforeEach(async ({ page }) => {
    page.assertNoErrors = await capturePageErrors(page);
  });

  test('global search finds and opens a publication detail page', async ({ page }) => {
    await navigateHash(page, 'home');
    await page.getByRole('combobox').fill(firstPublication.title.split(/\s+/).slice(0, 3).join(' '));
    await expect(page.locator('.search-panel')).toBeVisible();
    await expect(page.locator('.search-panel button').first()).toContainText(firstPublication.title);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#publication:${firstPublication.id}$`));
    await expect(page.getByRole('heading', { name: firstPublication.title })).toBeVisible();
    await page.assertNoErrors();
  });

  test('global search supports keyboard navigation and escape dismissal', async ({ page }) => {
    await navigateHash(page, 'home');
    await page.getByRole('combobox').fill(firstProject.title.split(/\s+/)[0]);
    await expect(page.locator('.search-panel button').first()).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    await expect(page.locator('.search-panel')).toBeHidden();
    await page.assertNoErrors();
  });

  test('publication text search narrows list and opens details', async ({ page }) => {
    await navigateHash(page, 'publications');
    await page.getByPlaceholder('Search title, author, venue, keyword').fill(firstPublication.title);
    await expect(page.locator('.pub-card')).toHaveCount(1);
    await expect(page.locator('.pub-card')).toContainText(firstPublication.title);
    await page.locator('.pub-card').click();
    await expect(page).toHaveURL(new RegExp(`#publication:${firstPublication.id}$`));
    await page.assertNoErrors();
  });

  test('publication year, type and keyword filters remain coherent', async ({ page }) => {
    await navigateHash(page, 'publications');
    const selects = page.locator('.publication-filters select');

    const target = publications.find(pub => pub.filterKeywords?.length) || firstPublication;
    await selects.nth(0).selectOption(String(target.year));
    await expect(page.locator('.pub-card').first()).toContainText(String(target.year));

    await selects.nth(0).selectOption('All');
    await selects.nth(1).selectOption(target.type);
    await expect(page.locator('.pub-card').first()).toContainText(target.type);

    await selects.nth(1).selectOption('All');
    const keywordValue = await selects.nth(2).locator('option').nth(1).getAttribute('value');
    await selects.nth(2).selectOption(keywordValue);
    await expect(page.locator('.pub-card').first()).toBeVisible();
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('view switches do not lose content', async ({ page }) => {
    for (const route of ['research', 'projects', 'publications', 'news']) {
      await navigateHash(page, route);
      const buttons = page.locator('.btn-group button');
      await expect(buttons.first()).toBeVisible();
      await buttons.nth(1).click();
      await expect(page.locator('main')).not.toBeEmpty();
      await buttons.nth(0).click();
      await expect(page.locator('main')).not.toBeEmpty();
      await expectHealthyLayout(page);
    }
    await page.assertNoErrors();
  });
});
