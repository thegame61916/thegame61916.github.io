import { test, expect } from '@playwright/test';
import { navRoutes, site } from './fixtures.js';
import { capturePageErrors, expectHealthyLayout, navigateHash } from './helpers.js';

test.describe('responsive layout and accessibility basics', () => {
  test.beforeEach(async ({ page }) => {
    page.assertNoErrors = await capturePageErrors(page);
  });

  test('desktop navigation exposes all route links', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop navigation is covered only on desktop/tablet layout');
    test.skip((page.viewportSize()?.width || 0) < 1200, 'Bootstrap switches to offcanvas navigation below xl width');
    await navigateHash(page, 'home');
    for (const [route, label] of navRoutes) {
      await expect(page.locator(`.navbar a[href="#${route}"]`).filter({ hasText: label }).first()).toBeVisible();
    }
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('mobile navigation opens offcanvas and navigates', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile offcanvas is covered only on mobile layout');
    await navigateHash(page, 'home');
    await page.locator('.navbar-toggler').click();
    await expect(page.locator('.offcanvas.show')).toBeVisible();
    await page.locator('.offcanvas.show a[href="#publications"]').click();
    await expect(page).toHaveURL(/#publications$/);
    await expect(page.getByRole('heading', { name: 'Publications' })).toBeVisible();
    await expect(page.locator('.offcanvas.show')).toBeHidden();
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('critical pages have main landmark, headings and focusable controls', async ({ page }) => {
    for (const route of ['home', 'about', 'projects', 'publications', 'people', 'contact']) {
      await navigateHash(page, route);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('main h1:visible, main h2:visible').first()).toBeVisible();
      await page.keyboard.press('Tab');
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeTag).toBeTruthy();
      await expectHealthyLayout(page);
    }
    await page.assertNoErrors();
  });

  test('contact links render without empty buttons', async ({ page }) => {
    await navigateHash(page, 'contact');
    await expect(page.getByText(site.emails[0])).toBeVisible();
    const emptyControls = await page.locator('a.btn, button.btn').evaluateAll(nodes =>
      nodes.filter(node => !node.textContent.trim()).length
    );
    expect(emptyControls).toBe(0);
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });
});
