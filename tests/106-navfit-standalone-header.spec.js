import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

// NAVFIT1: seven standalone calculators/explorers previously mixed contextual
// anchors with global links, causing clipped header controls at tablet widths.
// Keep actual navigations and all original contextual links covered together.
const GLOBAL = ['/', '/my-carrowmont.html', '/tools.html', '/ask-carrowmont.html', '/learn.html', '/research.html', '/search.html'];
const PAGES = [
  ['/4-percent-rule-stress-test.html', ['#assumptions', '#methodology', '/retirement-calculator/']],
  ['/financial-independence-number-by-spending.html', ['#calculator', '#methodology', '/financial-independence/']],
  ['/home-affordability-calculator.html', ['#calculator', '#how-it-works']],
  ['/us-debt-interest-cost-calculator.html', ['#calculator', '#methodology', '#sources']],
  ['/gold-macro-stress-explorer.html', ['#explorer', '#methodology', '#sources']],
  ['/silver-supply-demand-macro-stress-explorer.html', ['#explorer', '#methodology', '#sources']],
  ['/market-chain-reaction-explorer.html', ['#explorer', '#how-it-works', '#glossary']]
];

async function checkPage(page, path, contextual, width) {
  await page.setViewportSize({ width, height: 800 });
  await gotoClean(page, path);
  const nav = page.locator('header .desktop-nav');
  expect(await nav.locator(':scope > a').evaluateAll(els => els.map(x => x.getAttribute('href')))).toEqual(GLOBAL);
  const context = page.locator('nav.cm-secondary-nav');
  await expect(context).toHaveCount(1);
  expect(await context.locator('a').evaluateAll(els => els.map(x => x.getAttribute('href')))).toEqual(contextual);
  for (const anchor of contextual.filter(href => href.startsWith('#'))) {
    await expect(page.locator(anchor)).toHaveCount(1);
  }
  await assertNoHorizontalOverflow(page, `NAVFIT1 ${path} at ${width}px`);
  const locale = page.locator('header .locale-menu summary');
  // Global-market explorers intentionally have no currency selector.
  if (await locale.count()) {
    await expect(locale).toBeVisible();
    expect(await locale.evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(width + 1);
  }
  if (width > 980) {
    const desktopSearch = nav.locator('a[href="/search.html"]');
    await expect(desktopSearch).toBeVisible();
    expect(await desktopSearch.evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(width + 1);
  } else {
    await expect(page.locator('nav.mobile1-bottom-nav')).toBeVisible();
    const search = page.locator('header .mobile1-header-search[href="/search.html"]');
    await expect(search).toBeVisible();
    await page.locator('.mobile1-bottom-nav [data-mobile1-nav="more"]').click();
    await expect(page.locator('.mobile1-more-dialog a[href="/learn.html"]')).toBeVisible();
    await page.locator('.mobile1-more-dialog .mobile1-more-close').click();
  }
}

test.describe('NAVFIT1 standalone global and contextual navigation', () => {
  test('[AUTO] all seven standalone pages fit at 1024px without clipping Search or locale', async ({ page }) => {
    for (const [path, contextual] of PAGES) await checkPage(page, path, contextual, 1024);
  });

  test('[AUTO] 4-percent stress test retains all header routes for compact tablet boundaries', async ({ page }) => {
    for (const width of [981, 1024, 1100, 1180, 1181]) {
      await checkPage(page, PAGES[0][0], PAGES[0][1], width);
    }
  });

  test('[AUTO] all seven standalone pages fit at 1280px while retaining every local shortcut', async ({ page }) => {
    for (const [path, contextual] of PAGES) await checkPage(page, path, contextual, 1280);
  });

  test('[AUTO] all seven standalone pages fit at 390px with accessible mobile navigation', async ({ page }) => {
    for (const [path, contextual] of PAGES) await checkPage(page, path, contextual, 390);
  });

  test('[AUTO] 4-percent stress-test in-page and related Planner shortcuts open correct targets', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await gotoClean(page, '/4-percent-rule-stress-test.html');
    await page.locator('.cm-secondary-nav a[href="#assumptions"]').click();
    await expect(page).toHaveURL(/#assumptions$/);
    await page.locator('.cm-secondary-nav a[href="#methodology"]').click();
    await expect(page).toHaveURL(/#methodology$/);
    await expect(page.locator('.cm-secondary-nav a[href="/retirement-calculator/"]')).toHaveAttribute('href', '/retirement-calculator/');
  });
});
