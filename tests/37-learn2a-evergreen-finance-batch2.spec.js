import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES = [
  {
    path: '/credit-score-explained.html',
    title: 'Credit Score Explained: What Affects It | Carrowmont',
    h1: 'What is a credit score, and what can affect it?',
    tool: '/loan-calculator/'
  },
  {
    path: '/debt-consolidation-explained.html',
    title: 'Debt Consolidation Explained | Carrowmont',
    h1: 'What is debt consolidation, and can a lower payment cost more?',
    tool: '/loan-calculator/'
  },
  {
    path: '/how-credit-card-interest-works.html',
    title: 'How Credit-Card Interest Works | Carrowmont',
    h1: 'How does credit-card interest build up?',
    tool: '/loan-calculator/'
  },
  {
    path: '/apr-vs-interest-rate.html',
    title: 'APR vs Interest Rate: The Difference | Carrowmont',
    h1: 'APR vs interest rate: Why the cheaper-looking loan may not be cheaper',
    tool: '/loan-calculator/'
  }
];

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({ region, currency }) => window.CarrowmontLocale.setLocale(region, currency), { region, currency });
  await expect.poll(() => page.evaluate(() => ({
    region: window.CarrowmontLocale.getRegion(),
    currency: window.CarrowmontLocale.getCurrency()
  }))).toEqual({ region, currency });
}

async function runSearch(page, query) {
  const input = page.locator('[data-cm-search-input]').first();
  await input.fill(query);
  await input.press('Enter');
  await expect(page.locator('[data-cm-search-root]').first()).not.toHaveAttribute('data-search-state', 'loading');
  return page.locator('[data-search-result-link]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
}

test.describe('LEARN2A-2 evergreen credit and borrowing foundations', () => {
  test('[AUTO] four guides have unique indexable identities, direct answers, trust signals and useful depth', async ({ page }) => {
    for (const item of PAGES) {
      const errors = monitorPageErrors(page);
      await gotoClean(page, item.path);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(item.h1);
      const metaDescription = (await page.locator('meta[name="description"]').getAttribute('content') || '').trim();
      expect(metaDescription.length).toBeGreaterThanOrEqual(110);
      expect(metaDescription.length).toBeLessThanOrEqual(160);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toBeVisible();
      await expect(page.locator('.guide-action-first a[href="' + item.tool + '"]')).toBeVisible();
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThan(2);
      await expect(page.locator('.article-meta a[href="/editorial-policy.html"]')).toBeVisible();
      await expect(page.locator('.guide-table-wrap').first()).toBeVisible();
      const visibleWords = await page.locator('main').innerText().then(text => text.trim().split(/\s+/).filter(Boolean).length);
      expect(visibleWords).toBeGreaterThan(1000);
      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => {
        try {
          const parsed = JSON.parse(node.textContent || '{}');
          return Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
        } catch { return []; }
      }));
      expect(schemas.some(node => node['@type'] === 'Article' && node.mainEntityOfPage === `https://carrowmont.com${item.path}`)).toBeTruthy();
      expect(schemas.some(node => node['@type'] === 'BreadcrumbList')).toBeTruthy();
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] Learn hub, sitemap and SEARCH1 discover all four credit and borrowing guides', async ({ page, request }) => {
    await gotoClean(page, '/learn.html');
    for (const item of PAGES) {
      await expect(page.locator(`[data-category="loans"] a[href="${item.path}"]`)).toHaveCount(1);
    }

    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const item of PAGES) {
      expect(sitemap).toContain(`<loc>https://carrowmont.com${item.path}</loc>`);
      const escapedPath = item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(sitemap).toMatch(new RegExp(`<loc>https://carrowmont\\.com${escapedPath}</loc>\\s*<lastmod>2026-10-20</lastmod>`));
    }

    const index = await (await request.get('/data/carrowmont-search-index.json')).json();
    expect(index.entries).toHaveLength(121);
    for (const item of PAGES) expect(index.entries.filter(entry => entry.url === item.path)).toHaveLength(1);

    await gotoClean(page, '/search.html');
    for (const [query, expected] of [
      ['credit score', '/credit-score-explained.html'],
      ['credit rating', '/credit-score-explained.html'],
      ['debt consolidation', '/debt-consolidation-explained.html'],
      ['credit card interest', '/how-credit-card-interest-works.html'],
      ['apr vs interest rate', '/apr-vs-interest-rate.html']
    ]) {
      expect((await runSearch(page, query))[0]).toBe(expected);
    }
  });

  test('[AUTO] country-aware money examples change while the universal credit lesson stays intact', async ({ page }) => {
    await gotoClean(page, '/debt-consolidation-explained.html');
    await setLocale(page, 'IN', 'INR');
    const debt = page.locator('[data-cm-money-inr="250000"]').first();
    await expect(debt).toContainText('₹');
    await setLocale(page, 'US', 'USD');
    await expect(debt).toContainText('$');
    await expect(page.locator('.guide-answer')).toContainText('Debt consolidation means replacing');

    await gotoClean(page, '/credit-score-explained.html');
    await setLocale(page, 'AU', 'AUD');
    await expect(page.locator('#localeCountryLabel')).toHaveText('Australia');
    await expect(page.locator('#localeCurrencyLabel')).toHaveText('AUD');
    await expect(page.locator('.guide-answer')).toContainText('A credit score is a model-based prediction');
    await expect(page.locator('.guide-locale-context')).toContainText('differ by country');
  });

  test('[AUTO] each new guide has at least four contextual inbound pages beyond the Learn hub', async ({ request }) => {
    const existingPages = [
      '/debt-snowball-vs-avalanche.html', '/how-is-loan-emi-calculated.html', '/loan-interest-rate-vs-term.html',
      '/cash-flow-vs-income.html', '/mortgage-refinance-break-even.html', '/mortgage-affordability-vs-lender-approval.html',
      '/how-much-home-can-i-afford.html', '/budgeting-with-irregular-income.html'
    ];
    const bodies = await Promise.all(existingPages.map(async path => ({ path, body: await (await request.get(path)).text() })));
    for (const item of PAGES) {
      const inbound = bodies.filter(record => record.body.includes(`href="${item.path}"`)).map(record => record.path);
      expect(inbound.length, `${item.path} inbound pages: ${inbound.join(', ')}`).toBeGreaterThanOrEqual(4);
    }
  });

  test('[AUTO] all four guides remain overflow-safe at 1280, 390 and 360 px and tables scroll inside their wrappers', async ({ page }) => {
    for (const width of [1280, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const item of PAGES) {
        await gotoClean(page, item.path);
        await assertNoHorizontalOverflow(page, `${width}px ${item.path}`);
        await expect(page.locator('.guide-table-wrap').first()).toBeVisible();
        const safe = await page.locator('.guide-table-wrap').evaluateAll(wrappers => wrappers.every(wrapper => wrapper.scrollWidth >= wrapper.clientWidth && getComputedStyle(wrapper).overflowX === 'auto'));
        expect(safe).toBeTruthy();
      }
    }
  });
});
