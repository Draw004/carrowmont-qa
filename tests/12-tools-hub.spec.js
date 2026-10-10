import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, saveReferenceScreenshot } from '../helpers/common.js';

const HOME = '/';
const DIRECTORY = '/tools.html';
const CORE_IDS = ['budget', 'investment', 'retirement', 'inflation', 'goals', 'independence'];
const ALL_TOOL_PATHS = [
  '/budget-cash-flow-planner/',
  '/sip-calculator/',
  '/retirement-calculator/',
  '/inflation-calculator/',
  '/goal-planner/',
  '/financial-independence/',
  '/4-percent-rule-stress-test.html',
  '/financial-independence-number-by-spending.html',
  '/us-debt-interest-cost-calculator.html',
  '/gold-macro-stress-explorer.html',
  '/silver-supply-demand-macro-stress-explorer.html'
];
const HOMEPAGE_AUTHORITY_PATHS = ALL_TOOL_PATHS.slice(6, 10);

async function dismissAnalytics(page) {
  const decline = page.locator('[data-analytics-choice="denied"]').first();
  if (await decline.count()) await decline.click().catch(() => {});
}



async function setLocaleDirect(page, region, currency) {
  await expect.poll(async () => page.evaluate(() => Boolean(
    window.CarrowmontLocale && typeof window.CarrowmontLocale.setLocale === 'function' &&
    window.CarrowmontToolsHub && typeof window.CarrowmontToolsHub.apply === 'function'
  )), { timeout: 10000 }).toBe(true);

  await page.evaluate(({ region, currency }) => {
    window.CarrowmontLocale.setLocale(region, currency);
    window.CarrowmontToolsHub.apply();
  }, { region, currency });

  await expect.poll(async () => page.evaluate(() => ({
    region: window.CarrowmontLocale.getRegion(),
    currency: window.CarrowmontLocale.getCurrency()
  })), { timeout: 10000 }).toEqual({ region, currency });
}

async function homepageOrder(page) {
  return page.locator('[data-homepage-core-grid] > [data-tool-id]').evaluateAll(nodes => nodes.map(node => node.dataset.toolId));
}

async function expectHomepageOrder(page, expected) {
  await expect.poll(() => homepageOrder(page), { timeout: 10000 }).toEqual(expected);
  await expect(page.locator('[data-homepage-core-grid]')).toHaveAttribute('data-applied-order', expected.join(','));
  await expect(page.locator('[data-homepage-core-grid] > article').last()).toHaveAttribute('data-tools-gateway', '');
}

test.describe('TOOLS-HUB1 all-tools directory and homepage discovery', () => {
  test('[AUTO] canonical tools directory exposes eleven live tools in three meaningful categories', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, DIRECTORY);
    await dismissAnalytics(page);

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Financial calculators, planners and scenario tools');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com/tools.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page.locator('#core-planning-tools .directory-tool-card')).toHaveCount(6);
    await expect(page.locator('#planning-stress-tests .directory-tool-card')).toHaveCount(2);
    await expect(page.locator('#macro-market-explorers .directory-tool-card')).toHaveCount(3);
    await expect(page.locator('.directory-tool-card')).toHaveCount(11);
    await expect(page.locator('body')).not.toContainText(/coming soon/i);

    for (const path of ALL_TOOL_PATHS) {
      await expect(page.locator(`a[href="${path}"]`).first(), `${path} should be directly linked`).toBeVisible();
    }

    const schema = await page.locator('script[type="application/ld+json"]').textContent();
    const json = JSON.parse(schema);
    expect(json['@type']).toBe('CollectionPage');
    expect(json.mainEntity?.['@type']).toBe('ItemList');
    expect(json.mainEntity?.numberOfItems).toBe(11);
    expect(json.mainEntity?.itemListElement).toHaveLength(11);
    expect(errors).toEqual([]);
  });

  test('[AUTO] homepage keeps six complete visual tool cards, a standout fixed gateway and four authority links', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, HOME);
    await dismissAnalytics(page);

    const grid = page.locator('[data-homepage-core-grid]');
    await expect(grid).toHaveCount(1);
    await expect(grid.locator('[data-tool-id]')).toHaveCount(6);
    await expect(grid.locator('[data-tools-gateway]')).toHaveCount(1);

    for (const id of CORE_IDS) {
      const card = grid.locator(`[data-tool-id="${id}"]`);
      await expect(card, `${id} card`).toBeVisible();
      await expect(card.locator('.tool-icon'), `${id} card icon`).toHaveCount(1);
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('p')).toBeVisible();
      await expect(card.locator('a[href]')).toBeVisible();
    }

    const gateway = grid.locator('[data-tools-gateway]');
    await expect(gateway.getByRole('heading', { name: 'Explore All Tools' })).toBeVisible();
    await expect(gateway.locator('.explore-tools-icon')).toHaveCount(1);
    await expect(gateway.locator('a[href="/tools.html"]')).toBeVisible();
    const gatewayStyle = await gateway.evaluate(el => {
      const css = getComputedStyle(el);
      return { backgroundImage: css.backgroundImage, color: css.color, position: [...el.parentElement.children].indexOf(el) };
    });
    expect(gatewayStyle.backgroundImage).toContain('gradient');
    expect(gatewayStyle.color).toBe('rgb(255, 255, 255)');
    expect(gatewayStyle.position).toBe(6);

    await expect(page.locator('a.text-link[href="/tools.html"]').first()).toContainText('View all tools');
    await expect(page.locator('.authority-tools-grid .authority-tool-card')).toHaveCount(4);
    for (const path of HOMEPAGE_AUTHORITY_PATHS) {
      await expect(page.locator(`.authority-tools-grid a[href="${path}"]`)).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test('[AUTO] country controls terminology and deterministic card priority while currency alone never reorders', async ({ page }) => {
    await gotoClean(page, HOME);
    await dismissAnalytics(page);

    await setLocaleDirect(page, 'IN', 'INR');
    await expectHomepageOrder(page, ['investment', 'retirement', 'budget', 'inflation', 'goals', 'independence']);
    await expect(page.locator('[data-tool-id="investment"] [data-cm-investment-title]')).toHaveText('SIP Calculator');
    await expect(page.locator('[data-tool-id="investment"] [data-cm-investment-cta]')).toContainText('Calculate SIP');

    await setLocaleDirect(page, 'US', 'USD');
    const usOrder = ['retirement', 'investment', 'budget', 'inflation', 'goals', 'independence'];
    await expectHomepageOrder(page, usOrder);
    await expect(page.locator('[data-tool-id="investment"] [data-cm-investment-title]')).toHaveText('Recurring Investment Calculator');

    await setLocaleDirect(page, 'US', 'EUR');
    await expectHomepageOrder(page, usOrder);
    await expect(page.locator('[data-homepage-core-grid]')).toHaveAttribute('data-applied-country', 'US');

    await setLocaleDirect(page, 'TR', 'TRY');
    await expectHomepageOrder(page, ['inflation', 'budget', 'investment', 'retirement', 'goals', 'independence']);
  });

  test('[AUTO] country-demand contract covers every supported country with complete unique tool orders', async ({ page }) => {
    await gotoClean(page, HOME);
    const result = await page.evaluate(() => {
      const regions = Object.keys(window.CarrowmontLocale.regions);
      const hub = window.CarrowmontToolsHub;
      return {
        regions,
        mapped: regions.filter(code => Object.hasOwn(hub.regionProfiles, code)),
        orders: Object.fromEntries(regions.map(code => [code, hub.getOrderForRegion(code)])),
        profileKeys: Object.keys(hub.profiles)
      };
    });
    expect(result.mapped.sort()).toEqual(result.regions.sort());
    expect(result.profileKeys.sort()).toEqual(['P1','P10','P11','P2','P3','P4','P5','P6','P7','P8','P9'].sort());
    for (const [country, order] of Object.entries(result.orders)) {
      expect(order, `${country} order length`).toHaveLength(6);
      expect(new Set(order).size, `${country} order uniqueness`).toBe(6);
      expect([...order].sort(), `${country} order contents`).toEqual([...CORE_IDS].sort());
    }
  });

  test('[AUTO] tools directory localizes investment terminology but keeps stable canonical links', async ({ page }) => {
    await gotoClean(page, DIRECTORY);
    await setLocaleDirect(page, 'IN', 'INR');
    await expect(page.locator('[data-directory-tool="investment"] [data-cm-investment-title]')).toHaveText('SIP Calculator');
    await expect(page.locator('[data-directory-tool="investment"] a')).toHaveAttribute('href', '/sip-calculator/');
    await setLocaleDirect(page, 'GB', 'GBP');
    await expect(page.locator('[data-directory-tool="investment"] [data-cm-investment-title]')).toHaveText('Recurring Investment Calculator');
    await expect(page.locator('[data-directory-tool="investment"] a')).toHaveAttribute('href', '/sip-calculator/');
  });

  test('[AUTO] shared site script upgrades legacy visible all-tools links without mass-editing content pages', async ({ page }) => {
    await gotoClean(page, '/about.html');
    const toolLinks = page.locator('a').filter({ hasText: /tools/i });
    const hrefs = await toolLinks.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    expect(hrefs).toContain('/tools.html');
    expect(hrefs.filter(href => href === '/#tools' || href === '#tools')).toEqual([]);
  });

  test('[AUTO] sitemap includes the canonical tools directory with release lastmod', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();
    const xml = await response.text();
    expect(xml).toContain('<loc>https://carrowmont.com/tools.html</loc>');
    expect(xml).toMatch(/<loc>https:\/\/carrowmont\.com\/tools\.html<\/loc>\s*<lastmod>2026-10-10<\/lastmod>/);
  });

  test('[AUTO] homepage and directory avoid horizontal overflow at 1440px, 390px and 360px', async ({ page }) => {
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, HOME);
      await dismissAnalytics(page);
      await assertNoHorizontalOverflow(page, `${width}px homepage tools hub`);
      await expect(page.locator('[data-tools-gateway]')).toBeVisible();
      const gatewayRect = await page.locator('[data-tools-gateway]').evaluate(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      });
      expect(gatewayRect.left).toBeGreaterThanOrEqual(0);
      expect(gatewayRect.right).toBeLessThanOrEqual(width + 1);
      expect(gatewayRect.width).toBeGreaterThan(width <= 390 ? 280 : 400);

      await gotoClean(page, DIRECTORY);
      await dismissAnalytics(page);
      await assertNoHorizontalOverflow(page, `${width}px all-tools directory`);
      await expect(page.locator('.directory-tool-card')).toHaveCount(11);
    }
  });

  test('[VISUAL] capture homepage and tools-directory discovery references', async ({ page }, testInfo) => {
    await gotoClean(page, HOME);
    await dismissAnalytics(page);
    await saveReferenceScreenshot(page, testInfo.project.name, 'tools-hub-homepage', 'full');
    await gotoClean(page, DIRECTORY);
    await dismissAnalytics(page);
    await saveReferenceScreenshot(page, testInfo.project.name, 'tools-hub-directory', 'full');
  });
});
