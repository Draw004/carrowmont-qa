import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const SEARCH = '/search.html';

async function runSearch(page, query) {
  const input = page.locator('[data-cm-search-input]').first();
  await input.fill(query);
  await input.press('Enter');
  await expect(page.locator('[data-cm-search-root]').first()).not.toHaveAttribute('data-search-state', 'loading');
  return page.locator('[data-search-result-link]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({ region, currency }) => window.CarrowmontLocale.setLocale(region, currency), { region, currency });
  await expect.poll(() => page.evaluate(() => ({
    region: window.CarrowmontLocale.getRegion(),
    currency: window.CarrowmontLocale.getCurrency()
  }))).toEqual({ region, currency });
}

test.describe('SEARCH1 global site search', () => {
  test('[AUTO] search utility page is private, noindex and backed by one reviewed local index', async ({ page, request }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, SEARCH);

    await expect(page).toHaveTitle('Search Carrowmont | Tools & Financial Guides');
    await expect(page.locator('h1')).toHaveText('Search Carrowmont');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com/search.html');
    await expect(page.locator('[data-cm-search-input]')).toHaveCount(1);
    await expect(page.locator('[data-cm-search-status]')).toHaveAttribute('aria-live', 'polite');

    const indexResponse = await request.get('/data/carrowmont-search-index.json');
    expect(indexResponse.ok()).toBeTruthy();
    const index = await indexResponse.json();
    expect(index.schema_version).toBe(1);
    expect(index.entries.length).toBe(113);
    expect(new Set(index.entries.map(entry => entry.url)).size).toBe(index.entries.length);
    for (const entry of index.entries) {
      expect(entry.url).toMatch(/^\//);
      expect(entry.title).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(['tool', 'guide', 'carrowmont']).toContain(entry.type);
      expect(entry.category).toBeTruthy();
    }

    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toContain('https://carrowmont.com/search.html');
    expect(errors).toEqual([]);
  });

  test('[AUTO] deterministic aliases find tools and guides without aggressive fuzzy matching', async ({ page }) => {
    await gotoClean(page, SEARCH);

    await setLocale(page, 'IN', 'INR');
    expect((await runSearch(page, 'sip'))[0]).toBe('/sip-calculator/');
    expect((await runSearch(page, 'emi'))[0]).toBe('/loan-calculator/');
    expect((await runSearch(page, 'swp'))[0]).toBe('/retirement-calculator/withdrawal-calculator.html');

    const homeLoan = await runSearch(page, 'home loan');
    expect(homeLoan).toContain('/mortgage-payoff-calculator/');
    expect(homeLoan).toContain('/home-affordability-calculator.html');

    await setLocale(page, 'GB', 'GBP');
    expect((await runSearch(page, 'remortgage'))[0]).toBe('/mortgage-payoff-calculator/refinance-break-even.html');

    await setLocale(page, 'US', 'USD');
    expect((await runSearch(page, 'how to make a budget'))[0]).toBe('/budget-cash-flow-planner/');
    expect((await runSearch(page, 'etf'))[0]).toBe('/physical-gold-vs-gold-etf.html');

    const nonsense = await runSearch(page, 'zzzzxyqnotatopic');
    expect(nonsense).toEqual([]);
    await expect(page.locator('.cm-search-empty')).toContainText('We could not find a close match.');
  });

  test('[AUTO] typed financial concerns never enter URL, browser storage, cookies or network requests', async ({ page }) => {
    const observedRequests = [];
    page.on('request', request => observedRequests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData() || ''
    }));

    await gotoClean(page, SEARCH);
    const secretQuery = 'private-budget-question-9876543';
    await runSearch(page, secretQuery);
    await page.waitForTimeout(250);

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe(SEARCH);
    expect(currentUrl.search).toBe('');
    expect(currentUrl.hash).toBe('');
    const browserState = await page.evaluate(() => ({
      local: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
      session: Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])),
      cookies: document.cookie
    }));
    const serializedState = JSON.stringify(browserState).toLowerCase();
    expect(serializedState).not.toContain(secretQuery.toLowerCase());
    const serializedRequests = JSON.stringify(observedRequests).toLowerCase();
    expect(serializedRequests).not.toContain(secretQuery.toLowerCase());
    expect(serializedRequests).not.toContain(encodeURIComponent(secretQuery).toLowerCase());
  });

  test('[AUTO] Learn and Tools keep their browse structure while offering the same search', async ({ page }) => {
    for (const [path, inputId, preservedSelector] of [
      ['/learn.html', '#learnSearchInput', '.planning-categories .category-box'],
      ['/tools.html', '#toolsSearchInput', '.directory-tool-card']
    ]) {
      await gotoClean(page, path);
      await expect(page.locator(inputId)).toBeVisible();
      await expect(page.locator(preservedSelector).first()).toBeVisible();
      await page.locator(inputId).fill('retirement');
      await page.locator(inputId).press('Enter');
      await expect(page.locator('[data-search-result-link]').first()).toBeVisible();
      await expect(page.locator('[data-cm-search-status]')).toContainText(/results? found/i);
    }
  });

  test('[AUTO] main-site navigation exposes one clear search entry and Escape clears a query', async ({ page }) => {
    for (const path of ['/', '/learn.html', '/tools.html', '/privacy.html', SEARCH]) {
      await gotoClean(page, path);
      await expect(page.locator('.desktop-nav a[href="/search.html"]')).toHaveCount(1);
      await expect(page.locator('.mobile-nav a[href="/search.html"]')).toHaveCount(1);
    }

    await gotoClean(page, SEARCH);
    const input = page.locator('[data-cm-search-input]');
    await input.fill('mortgage');
    await input.press('Enter');
    await expect(page.locator('[data-search-result-link]').first()).toBeVisible();
    await input.press('Escape');
    await expect(input).toHaveValue('');
    await expect(page.locator('[data-search-result-link]')).toHaveCount(0);
    await expect(page.locator('[data-cm-search-status]')).toHaveText('Start with a topic or money question.');
  });

  test('[AUTO] search layouts are overflow-safe at 1280, 390 and 360 px', async ({ page }) => {
    for (const width of [1280, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [SEARCH, '/learn.html', '/tools.html']) {
        await gotoClean(page, path);
        await assertNoHorizontalOverflow(page, `${width}px ${path}`);
        await expect(page.locator('[data-cm-search-input]').first()).toBeVisible();
      }
    }
  });
});
