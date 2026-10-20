import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES = [
  {
    path: '/50-30-20-budget-rule.html',
    title: '50/30/20 Budget Rule: How It Works | Carrowmont',
    h1: 'What is the 50/30/20 budget rule, and when should you adjust it?'
  },
  {
    path: '/budgeting-by-pay-frequency.html',
    title: 'Budgeting by Pay Frequency: Weekly to Monthly | Carrowmont',
    h1: 'How do weekly, biweekly, fortnightly and monthly pay cycles change budgeting?'
  },
  {
    path: '/budgeting-with-irregular-income.html',
    title: 'How to Budget With Irregular Income | Carrowmont',
    h1: 'How do you budget when your income changes every month?'
  },
  {
    path: '/cash-flow-vs-income.html',
    title: 'Cash Flow vs Income: Why the Difference Matters | Carrowmont',
    h1: 'Cash flow vs income: Why earning more does not always mean saving more'
  },
  {
    path: '/zero-based-budgeting.html',
    title: 'Zero-Based Budgeting: How It Works | Carrowmont',
    h1: 'What is zero-based budgeting and how does it work?'
  },
  {
    path: '/pay-yourself-first-budgeting.html',
    title: 'Pay Yourself First: What It Means in a Budget | Carrowmont',
    h1: 'What does pay yourself first mean in a budget?'
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

test.describe('LEARN3B-1 budget systems, pay cycles and cash flow', () => {
  test('[AUTO] six rewritten guides retain stable identities and add direct answers, examples, checklists, trust signals and useful depth', async ({ page }) => {
    for (const item of PAGES) {
      const errors = monitorPageErrors(page);
      await gotoClean(page, item.path);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(item.h1);
      const description = (await page.locator('meta[name="description"]').getAttribute('content') || '').trim();
      expect(description.length).toBeGreaterThanOrEqual(110);
      expect(description.length).toBeLessThanOrEqual(160);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toBeVisible();
      await expect(page.locator('.guide-action-first a[href="/budget-cash-flow-planner/"]')).toBeVisible();
      await expect(page.locator('.article-meta a[href="/editorial-policy.html"]')).toBeVisible();
      await expect(page.locator('article h2').filter({ hasText: 'Checklist:' })).toHaveCount(1);
      expect(await page.locator('article .guide-table-wrap').count()).toBeGreaterThanOrEqual(2);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      expect(await page.locator('[data-cm-money-inr]').count()).toBeGreaterThanOrEqual(8);
      const visibleWords = await page.locator('main').innerText().then(text => text.trim().split(/\s+/).filter(Boolean).length);
      expect(visibleWords).toBeGreaterThan(1100);
      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => {
        try {
          const parsed = JSON.parse(node.textContent || '{}');
          return Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
        } catch { return []; }
      }));
      expect(schemas.some(node => node['@type'] === 'Article' && node.mainEntityOfPage === `https://carrowmont.com${item.path}` && node.datePublished === '2026-09-27' && node.dateModified === '2026-10-20')).toBeTruthy();
      expect(schemas.some(node => node['@type'] === 'BreadcrumbList')).toBeTruthy();
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] sitemap and SEARCH1 preserve 121 public pages while giving the six guides clear query ownership', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const index = await (await request.get('/data/carrowmont-search-index.json')).json();
    expect(index.entries).toHaveLength(121);
    for (const item of PAGES) {
      const escapedPath = item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(sitemap).toMatch(new RegExp(`<loc>https://carrowmont\\.com${escapedPath}</loc>\\s*<lastmod>2026-10-20</lastmod>`));
      expect(index.entries.filter(entry => entry.url === item.path)).toHaveLength(1);
    }

    await gotoClean(page, '/search.html');
    for (const [query, expected] of [
      ['50 30 20 budget', '/50-30-20-budget-rule.html'],
      ['payday budget', '/budgeting-by-pay-frequency.html'],
      ['variable income budget', '/budgeting-with-irregular-income.html'],
      ['cash flow vs income', '/cash-flow-vs-income.html'],
      ['every dollar budget', '/zero-based-budgeting.html'],
      ['pay yourself first', '/pay-yourself-first-budgeting.html']
    ]) {
      expect((await runSearch(page, query))[0]).toBe(expected);
    }
  });

  test('[AUTO] country-aware money, payday and recurring-investment language adapt without changing the universal lesson', async ({ page }) => {
    await gotoClean(page, '/50-30-20-budget-rule.html');
    const income = page.locator('[data-cm-money-inr="100000"]').first();
    await setLocale(page, 'IN', 'INR');
    await expect(income).toContainText('₹');
    await setLocale(page, 'US', 'USD');
    await expect(income).toContainText('$');
    await expect(income).toContainText('5,000');
    await expect(page.locator('.guide-answer')).toContainText('starting framework');

    await gotoClean(page, '/budgeting-by-pay-frequency.html');
    const twoWeek = page.locator('[data-cm-term="two-week-pay-label"]').first();
    await setLocale(page, 'US', 'USD');
    await expect(twoWeek).toHaveText('Biweekly');
    await setLocale(page, 'GB', 'GBP');
    await expect(twoWeek).toHaveText('Fortnightly');
    await setLocale(page, 'OTHER', 'EUR');
    await expect(twoWeek).toHaveText('Every two weeks');

    await gotoClean(page, '/pay-yourself-first-budgeting.html');
    const sip = page.locator('[data-cm-term="sip-calculator"]').first();
    await setLocale(page, 'IN', 'INR');
    await expect(sip).toHaveText('SIP Calculator');
    await setLocale(page, 'AU', 'AUD');
    await expect(sip).toHaveText('Recurring Investment Calculator');
  });

  test('[AUTO] each rewritten guide keeps the approved internal journey instead of link dumping', async ({ page }) => {
    const expectedLinks = {
      '/50-30-20-budget-rule.html': ['/how-to-make-a-budget.html', '/zero-based-budgeting.html', '/pay-yourself-first-budgeting.html', '/cash-flow-vs-income.html'],
      '/budgeting-by-pay-frequency.html': ['/how-to-make-a-budget.html', '/budgeting-with-irregular-income.html', '/cash-flow-vs-income.html', '/sinking-fund-vs-emergency-fund.html'],
      '/budgeting-with-irregular-income.html': ['/how-to-make-a-budget.html', '/budgeting-by-pay-frequency.html', '/emergency-savings.html', '/sinking-fund-vs-emergency-fund.html'],
      '/cash-flow-vs-income.html': ['/how-to-make-a-budget.html', '/budgeting-by-pay-frequency.html', '/budgeting-with-irregular-income.html', '/lifestyle-inflation.html'],
      '/zero-based-budgeting.html': ['/how-to-make-a-budget.html', '/50-30-20-budget-rule.html', '/pay-yourself-first-budgeting.html', '/sinking-fund-vs-emergency-fund.html'],
      '/pay-yourself-first-budgeting.html': ['/how-much-should-i-save-each-month.html', '/50-30-20-budget-rule.html', '/zero-based-budgeting.html', '/emergency-savings.html']
    };
    for (const [path, links] of Object.entries(expectedLinks)) {
      await gotoClean(page, path);
      for (const href of links) await expect(page.locator(`article a[href="${href}"]`)).toHaveCount(1);
    }
  });

  test('[AUTO] six rewritten guides remain overflow-safe at 1280, 390 and 360 px and tables scroll inside their wrappers', async ({ page }) => {
    for (const width of [1280, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const item of PAGES) {
        await gotoClean(page, item.path);
        await assertNoHorizontalOverflow(page, `${width}px ${item.path}`);
        const safe = await page.locator('.guide-table-wrap').evaluateAll(wrappers => wrappers.every(wrapper => wrapper.scrollWidth >= wrapper.clientWidth && getComputedStyle(wrapper).overflowX === 'auto'));
        expect(safe).toBeTruthy();
      }
    }
  });
});
