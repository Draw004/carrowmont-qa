import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';
import { search1ExpectedPublicPages } from '../qa.config.js';

const PAGES = [
  {
    path: '/emergency-fund-how-much.html',
    title: 'How Much Emergency Fund Should You Have? | Carrowmont',
    h1: 'How much emergency fund should you have?',
    published: '2026-09-23',
    cta: '/goal-planner/'
  },
  {
    path: '/emergency-savings.html',
    title: 'Emergency Savings: Why Liquidity Matters | Carrowmont',
    h1: 'Emergency savings has a different job from long-term investing.',
    published: '2026-09-20',
    cta: '/goal-planner/'
  },
  {
    path: '/sinking-fund-vs-emergency-fund.html',
    title: 'Sinking Fund vs Emergency Fund: Key Differences | Carrowmont',
    h1: 'Sinking fund vs emergency fund: What is the difference?',
    published: '2026-09-27',
    cta: '/budget-cash-flow-planner/'
  },
  {
    path: '/savings-goal-planning.html',
    title: 'How to Plan a Savings Goal | Carrowmont',
    h1: 'How do you plan a savings goal and work backward from the target?',
    published: '2026-09-23',
    cta: '/goal-planner/'
  },
  {
    path: '/lifestyle-inflation.html',
    title: 'Lifestyle Inflation: How Spending Rises | Carrowmont',
    h1: 'What is lifestyle inflation and how can it slow financial progress?',
    published: '2026-09-27',
    cta: '/budget-cash-flow-planner/'
  },
  {
    path: '/debt-snowball-vs-avalanche.html',
    title: 'Debt Snowball vs Avalanche: Compare Methods | Carrowmont',
    h1: 'Debt snowball vs avalanche: Which debt gets paid first?',
    published: '2026-10-14',
    cta: '/budget-cash-flow-planner/debt-payoff-calculator.html'
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

test.describe('LEARN3B-2 financial resilience, savings and debt', () => {
  test('[AUTO] six rewritten guides retain stable identities and add clear answers, examples, checklists, trust and useful depth', async ({ page }) => {
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
      await expect(page.locator(`.guide-action-first a[href="${item.cta}"]`)).toBeVisible();
      await expect(page.locator('.article-meta a[href="/editorial-policy.html"]')).toBeVisible();
      await expect(page.locator('article h2').filter({ hasText: 'Checklist:' })).toHaveCount(1);
      expect(await page.locator('article .guide-table-wrap').count()).toBeGreaterThanOrEqual(2);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      expect(await page.locator('[data-cm-money-inr]').count()).toBeGreaterThanOrEqual(6);
      const visibleWords = await page.locator('main').innerText().then(text => text.trim().split(/\s+/).filter(Boolean).length);
      expect(visibleWords).toBeGreaterThan(1050);
      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => {
        try {
          const parsed = JSON.parse(node.textContent || '{}');
          return Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
        } catch { return []; }
      }));
      expect(schemas.some(node => node['@type'] === 'Article' && node.mainEntityOfPage === `https://carrowmont.com${item.path}` && node.datePublished === item.published && node.dateModified === '2026-10-20')).toBeTruthy();
      expect(schemas.some(node => node['@type'] === 'BreadcrumbList')).toBeTruthy();
      expect(errors).toEqual([]);
    }
  });

  test(`[AUTO] sitemap and SEARCH1 preserve ${search1ExpectedPublicPages} public pages while giving the six guides clear query ownership`, async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const index = await (await request.get('/data/carrowmont-search-index.json')).json();
    expect(index.entries).toHaveLength(search1ExpectedPublicPages);
    for (const item of PAGES) {
      const escapedPath = item.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(sitemap).toMatch(new RegExp(`<loc>https://carrowmont\\.com${escapedPath}</loc>\\s*<lastmod>2026-10-20</lastmod>`));
      expect(index.entries.filter(entry => entry.url === item.path)).toHaveLength(1);
    }

    await gotoClean(page, '/search.html');
    for (const [query, expected] of [
      ['how much emergency fund', '/emergency-fund-how-much.html'],
      ['emergency liquidity', '/emergency-savings.html'],
      ['sinking fund', '/sinking-fund-vs-emergency-fund.html'],
      ['savings goal', '/savings-goal-planning.html'],
      ['lifestyle creep', '/lifestyle-inflation.html'],
      ['debt snowball vs avalanche', '/debt-snowball-vs-avalanche.html']
    ]) {
      expect((await runSearch(page, query))[0]).toBe(expected);
    }
  });

  test('[AUTO] country-aware money and debt terminology adapt without changing the universal lesson', async ({ page }) => {
    await gotoClean(page, '/emergency-fund-how-much.html');
    const essential = page.locator('[data-cm-money-inr="60000"]').first();
    await setLocale(page, 'IN', 'INR');
    await expect(essential).toContainText('₹');
    await setLocale(page, 'US', 'USD');
    await expect(essential).toContainText('$');
    await expect(page.locator('.guide-answer')).toContainText('no universal emergency-fund amount');

    await gotoClean(page, '/debt-snowball-vs-avalanche.html');
    const phrase = page.locator('[data-cm-term="debt-payment-phrase"]').first();
    await setLocale(page, 'IN', 'INR');
    await expect(phrase).toHaveText('debt EMI / repayment');
    await setLocale(page, 'GB', 'GBP');
    await expect(phrase).toHaveText('debt repayment');
    await setLocale(page, 'US', 'USD');
    await expect(phrase).toHaveText('debt payment');
  });

  test('[AUTO] worked debt example remains aligned with the production debt-payoff engine across localization', async ({ page }) => {
    await gotoClean(page, '/debt-snowball-vs-avalanche.html');
    const snowInterest = page.locator('[data-cm-money-inr="44176"]');
    const avalancheInterest = page.locator('[data-cm-money-inr="40751"]');
    const difference = page.locator('[data-cm-money-inr="3425"]');
    const monthlyBudget = page.locator('[data-cm-money-inr="14000"]').last();

    await setLocale(page, 'IN', 'INR');
    await expect(page.locator('article')).toContainText('Month 5');
    await expect(page.locator('article')).toContainText('Month 12');
    await expect(page.locator('article')).toContainText('Month 26');
    await expect(snowInterest).toHaveText('₹44,176');
    await expect(avalancheInterest).toHaveText('₹40,751');
    await expect(difference).toHaveText('₹3,425');
    await expect(monthlyBudget).toHaveText('₹14,000');

    await setLocale(page, 'US', 'USD');
    await expect(snowInterest).toHaveText('$4,417.6');
    await expect(avalancheInterest).toHaveText('$4,075.1');
    await expect(difference).toHaveText('$342.5');
    await expect(monthlyBudget).toHaveText('$1,400');
    await expect(page.locator('[data-cm-money-inr="1500"]')).toHaveText('$150');
    await expect(page.locator('[data-cm-money-inr="30000"]')).toHaveText('$3,000');
  });

  test('[AUTO] each rewritten guide keeps the approved internal journey instead of link dumping', async ({ page }) => {
    const expectedLinks = {
      '/emergency-fund-how-much.html': ['/emergency-savings.html', '/sinking-fund-vs-emergency-fund.html', '/savings-goal-planning.html', '/how-to-make-a-budget.html'],
      '/emergency-savings.html': ['/emergency-fund-how-much.html', '/sinking-fund-vs-emergency-fund.html', '/investing-for-beginners.html', '/how-to-make-a-budget.html'],
      '/sinking-fund-vs-emergency-fund.html': ['/emergency-fund-how-much.html', '/emergency-savings.html', '/savings-goal-planning.html', '/budgeting-with-irregular-income.html'],
      '/savings-goal-planning.html': ['/future-cost-of-expenses.html', '/how-much-should-i-invest-each-month.html', '/sinking-fund-vs-emergency-fund.html', '/how-to-make-a-budget.html'],
      '/lifestyle-inflation.html': ['/cash-flow-vs-income.html', '/financial-independence-number.html', '/50-30-20-budget-rule.html', '/pay-yourself-first-budgeting.html'],
      '/debt-snowball-vs-avalanche.html': ['/debt-consolidation-explained.html', '/how-credit-card-interest-works.html', '/apr-vs-interest-rate.html', '/emergency-savings.html', '/budget-cash-flow-planner/']
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
