import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';
import { search1ExpectedPublicPages } from '../qa.config.js';

const PAGES = [
  {
    path: '/how-to-make-a-budget.html',
    title: 'How to Make a Budget That Works | Carrowmont',
    h1: 'How to make a budget that fits your real life',
    tool: '/budget-cash-flow-planner/'
  },
  {
    path: '/investing-for-beginners.html',
    title: 'Investing for Beginners: Simple Guide | Carrowmont',
    h1: 'Investing for beginners: Understand the basics before choosing a product',
    tool: '/sip-calculator/'
  },
  {
    path: '/what-is-an-etf.html',
    title: 'What Is an ETF? Exchange-Traded Funds Explained | Carrowmont',
    h1: 'What is an ETF, and how does it work?',
    tool: '/sip-calculator/'
  },
  {
    path: '/index-funds-explained.html',
    title: 'Index Funds Explained: Passive Investing | Carrowmont',
    h1: 'What is an index fund, and what does it actually track?',
    tool: '/compound-interest-calculator/'
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

test.describe('LEARN2A-1 evergreen money and investing foundations', () => {
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

  test('[AUTO] Learn hub, sitemap and SEARCH1 discover all four guides with correct topic ownership', async ({ page, request }) => {
    await gotoClean(page, '/learn.html');
    await expect(page.locator('[data-category="budget"] a[href="/how-to-make-a-budget.html"]')).toHaveCount(1);
    for (const path of ['/investing-for-beginners.html', '/what-is-an-etf.html', '/index-funds-explained.html']) {
      await expect(page.locator(`[data-category="assets"] a[href="${path}"]`)).toHaveCount(1);
    }

    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const item of PAGES) {
      expect(sitemap).toContain(`<loc>https://carrowmont.com${item.path}</loc>`);
      const escapedPath = item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(sitemap).toMatch(new RegExp(`<loc>https://carrowmont\\.com${escapedPath}</loc>\\s*<lastmod>2026-10-20</lastmod>`));
    }

    const index = await (await request.get('/data/carrowmont-search-index.json')).json();
    expect(index.entries).toHaveLength(search1ExpectedPublicPages);
    for (const item of PAGES) expect(index.entries.filter(entry => entry.url === item.path)).toHaveLength(1);

    await gotoClean(page, '/search.html');
    for (const [query, expected] of [
      ['how to make a budget', '/how-to-make-a-budget.html'],
      ['investing for beginners', '/investing-for-beginners.html'],
      ['etf', '/what-is-an-etf.html'],
      ['index fund', '/index-funds-explained.html']
    ]) {
      const input = page.locator('[data-cm-search-input]');
      await input.fill(query);
      await input.press('Enter');
      await expect(page.locator('[data-search-result-link]').first()).toHaveAttribute('href', expected);
    }
  });

  test('[AUTO] country-aware examples and terminology change without changing the universal lesson', async ({ page }) => {
    await gotoClean(page, '/how-to-make-a-budget.html');
    await setLocale(page, 'IN', 'INR');
    const income = page.locator('[data-cm-money-inr="100000"]').first();
    await expect(income).toContainText('₹');
    await setLocale(page, 'US', 'USD');
    await expect(income).toContainText('$');
    await expect(income).toContainText('5,000');
    await expect(page.locator('.guide-answer')).toContainText('A useful budget');

    await gotoClean(page, '/investing-for-beginners.html');
    await setLocale(page, 'IN', 'INR');
    await expect(page.locator('[data-cm-term="sip-calculator"]').first()).toHaveText('SIP Calculator');
    await setLocale(page, 'GB', 'GBP');
    await expect(page.locator('[data-cm-term="sip-calculator"]').first()).toHaveText('Recurring Investment Calculator');
    await expect(page.locator('.guide-answer')).toContainText('Investing means accepting uncertainty');
  });

  test('[AUTO] each new guide has at least three contextual inbound pages beyond the Learn hub', async ({ request }) => {
    const existingPages = [
      '/50-30-20-budget-rule.html', '/zero-based-budgeting.html', '/budgeting-with-irregular-income.html', '/how-much-should-i-save-each-month.html',
      '/asset-allocation-explained.html', '/diversification-across-asset-classes.html', '/stocks-vs-bonds.html', '/starting-investing-earlier.html', '/physical-gold-vs-gold-etf.html'
    ];
    const bodies = await Promise.all(existingPages.map(async path => ({ path, body: await (await request.get(path)).text() })));
    for (const item of PAGES) {
      const inbound = bodies.filter(record => record.body.includes(`href="${item.path}"`)).map(record => record.path);
      expect(inbound.length, `${item.path} inbound pages: ${inbound.join(', ')}`).toBeGreaterThanOrEqual(3);
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
