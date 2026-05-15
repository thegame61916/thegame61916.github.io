import { test, expect } from '@playwright/test';
import { navRoutes, site, publications, projects, students, teaching, talks, news, firstPublication, firstProject } from './fixtures.js';
import { capturePageErrors, expectHealthyLayout, navigateHash } from './helpers.js';

const routeContent = {
  home: site.name,
  about: 'Biography',
  research: 'Research Overview',
  projects: 'Projects',
  publications: 'Publications',
  people: 'Collaborators',
  teaching: 'Teaching',
  talks: 'Talks & Presentations',
  gallery: 'Gallery',
  news: 'News / Updates',
  contact: 'Contact'
};

test.describe('navigation and rendering', () => {
  test.beforeEach(async ({ page }) => {
    page.assertNoErrors = await capturePageErrors(page);
  });

  for (const [route, label] of navRoutes) {
    test(`renders #${route}`, async ({ page }) => {
      await navigateHash(page, route);
      await expect(page.locator('.brand')).toContainText(site.name);
      await expect(page).toHaveURL(new RegExp(`#${route}$`));
      await expect(page.locator('main')).toContainText(routeContent[route] || label);
      await expectHealthyLayout(page);
      await page.assertNoErrors();
    });
  }

  test('home renders profile, stats, recent publications and news', async ({ page }) => {
    await navigateHash(page, 'home');
    await expect(page.locator('h1')).toHaveText(site.name);
    await expect(page.locator('main')).toContainText(site.tagline);
    await expect(page.locator('.home-pub-card')).toHaveCount(Math.min(4, publications.length));
    await expect(page.locator('.news-card.compact')).toHaveCount(Math.min(5, news.length));
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('victor student profile shows the updated program and current position', async ({ page }) => {
    await navigateHash(page, 'people');
    await expect(page.getByRole('heading', { name: 'Victor Persson' })).toBeVisible();
    await expect(page.getByText('M.Sc. Media Technology & Engineering')).toBeVisible();
    await expect(page.getByText('Application Engineer at Image Systems Motion Analysis')).toBeVisible();
  });

  test('publication detail page renders preview, materials and BibTeX', async ({ page }) => {
    await navigateHash(page, `publication:${firstPublication.id}`);
    await expect(page.getByRole('heading', { name: firstPublication.title })).toBeVisible();
    await expect(page.getByText(firstPublication.authorText)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Preview' })).toBeVisible();
    await page.getByRole('tab', { name: 'Materials' }).click();
    await expect(page.getByText(/PDF, supplementary material/i)).toBeVisible();
    await page.getByRole('tab', { name: 'BibTeX' }).click();
    await expect(page.locator('.bibtex')).toContainText('@');
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('publication preview defaults to the main publication file with clear labels', async ({ page }) => {
    const posterPublication = publications.find(pub => pub.type?.toLowerCase().includes('poster'));

    await navigateHash(page, `publication:${firstPublication.id}`);
    const paperPreviewSelect = page.locator('.preview-toolbar select');
    await expect(paperPreviewSelect).toHaveValue('paper');
    await expect(paperPreviewSelect.locator('option').first()).toHaveText('Paper');
    await expect(paperPreviewSelect).not.toContainText('Paper PDF');

    await navigateHash(page, `publication:${posterPublication.id}`);
    const posterPreviewSelect = page.locator('.preview-toolbar select');
    await expect(posterPreviewSelect).toHaveValue('paper');
    await expect(posterPreviewSelect.locator('option').first()).toHaveText('Extended Abstract');
  });

  test('opening a publication card resets scroll to the top of the detail page', async ({ page }) => {
    await navigateHash(page, 'home');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

    await page.locator('.home-pub-card').first().click();
    await expect(page).toHaveURL(/#publication:/);
    await expect(page.locator('.publication-detail-head')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(20);
  });

  test('award badges render one normalized label per awarded publication', async ({ page }) => {
    await navigateHash(page, 'publications');
    const badgeTexts = await page.locator('.pub-card .award-badge').evaluateAll(nodes => nodes.map(node => node.textContent.trim()));

    expect(badgeTexts).toContain('Honorable Mention');
    expect(badgeTexts).toContain('Best Poster');
    expect(badgeTexts).not.toContain('Honorable Mention Certificate');
    expect(badgeTexts).not.toContain('Best Poster Award');
  });

  test('project detail page renders related publications and collaborators', async ({ page }) => {
    await navigateHash(page, `project:${firstProject.id}`);
    await expect(page.getByRole('heading', { name: firstProject.title })).toBeVisible();
    await expect(page.getByText(firstProject.short)).toBeVisible();
    if (firstProject.publications?.length) await expect(page.getByText('Related publications')).toBeVisible();
    if (firstProject.collaborators?.length) await expect(page.locator('.people-strip .person-chip').first()).toBeVisible();
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('people, teaching, talks and news render expected content counts', async ({ page }) => {
    await navigateHash(page, 'people');
    await expect(page.locator('.person-card').first()).toBeVisible();
    await expect(page.locator('.student-card')).toHaveCount(students.length);

    await navigateHash(page, 'teaching');
    await expect(page.locator('.card').filter({ hasText: teaching[0].course }).first()).toBeVisible();

    await navigateHash(page, 'talks');
    await expect(page.locator('.card').filter({ hasText: talks[0].title }).first()).toBeVisible();

    await navigateHash(page, 'news');
    await expect(page.locator('.news-card')).toHaveCount(news.length);
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });

  test('unknown routes fall back to home without crashing', async ({ page }) => {
    await navigateHash(page, 'missing-route');
    await expect(page.locator('h1')).toHaveText(site.name);
    await expectHealthyLayout(page);
    await page.assertNoErrors();
  });
});
