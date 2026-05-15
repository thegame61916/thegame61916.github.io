import { expect } from '@playwright/test';

export async function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return () => expect(errors, `Unexpected browser errors:\n${errors.join('\n')}`).toEqual([]);
}

export async function navigateHash(page, route) {
  await page.goto(`/#${route}`);
  await page.waitForLoadState('networkidle');
}

export async function expectHealthyLayout(page) {
  await expect(page.locator('main.site-main')).toBeVisible();
  await expect(page.locator('footer.site-footer')).toBeVisible();

  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
    visibleImages: [...document.images].filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(img => ({
      src: img.currentSrc || img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    })),
    controls: [...document.querySelectorAll('button, a.btn, .nav-link')].filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).map(el => {
      const rect = el.getBoundingClientRect();
      return { text: el.textContent.trim(), width: rect.width, height: rect.height };
    })
  }));

  expect(metrics.bodyHeight).toBeGreaterThan(500);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 4);
  for (const image of metrics.visibleImages) {
    if (!image.complete) continue;
    expect(image.naturalWidth, `Broken image width: ${image.src}`).toBeGreaterThan(0);
    expect(image.naturalHeight, `Broken image height: ${image.src}`).toBeGreaterThan(0);
  }
  for (const control of metrics.controls) {
    expect(control.width, `Control is too narrow: ${control.text}`).toBeGreaterThan(0);
    expect(control.height, `Control is too short: ${control.text}`).toBeGreaterThan(0);
  }
}
