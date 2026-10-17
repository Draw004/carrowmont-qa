import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const CONSENT_KEY = 'carrowmont_analytics_consent_v1';
const GA_URL = 'https://www.googletagmanager.com/**';

async function stubGoogleAnalytics(page, requests) {
  await page.route(GA_URL, async route => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: '/* Google Analytics disabled during Carrowmont privacy QA. */'
    });
  });
}

async function dataLayerRows(page) {
  return page.evaluate(() => (window.dataLayer || []).map(row => Array.from(row)));
}

test.describe('Privacy & Analytics Trust V2', () => {
  test('[AUTO] first visit keeps Google Analytics off and presents a compact privacy-first choice', async ({ page }) => {
    const gaRequests = [];
    await stubGoogleAnalytics(page, gaRequests);
    await gotoClean(page, '/loan-calculator/');

    const banner = page.locator('#carrowmontAnalyticsConsent');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Your calculator numbers stay private from analytics');
    await expect(banner).toContainText('Financial values you enter in Carrowmont calculators are not included in analytics.');
    await expect(page.getByRole('button', { name: 'Continue without Google Analytics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Allow Google Analytics' })).toBeVisible();
    await expect(page.locator('script[data-carrowmont-ga4="true"]')).toHaveCount(0);
    expect(gaRequests).toEqual([]);

    await page.getByRole('button', { name: 'Continue without Google Analytics' }).click();
    await expect(banner).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), CONSENT_KEY)).toBe('denied');
    await expect(page.locator('script[data-carrowmont-ga4="true"]')).toHaveCount(0);
    expect(gaRequests).toEqual([]);
  });

  test('[AUTO] allowed Google Analytics receives path-only page location and approved non-financial event fields', async ({ page }) => {
    const gaRequests = [];
    await stubGoogleAnalytics(page, gaRequests);
    await gotoClean(page, '/loan-calculator/?loanAmount=987654&income=123456');
    await page.getByRole('button', { name: 'Allow Google Analytics' }).click();

    await expect.poll(() => gaRequests.length, { timeout: 5000 }).toBe(1);
    const rows = await dataLayerRows(page);
    const config = rows.find(row => row[0] === 'config' && row[1] === 'G-C3D0G5C7F0');
    expect(config).toBeTruthy();
    expect(config[2].page_location).toMatch(/\/loan-calculator\/$/);
    expect(config[2].page_location).not.toContain('?');
    expect(config[2].page_location).not.toContain('987654');

    const before = rows.length;
    await page.evaluate(() => {
      window.CarrowmontAnalytics.track('country_change', {
        selected_region: 'US',
        selected_currency: 'USD',
        loan_amount: '987654',
        income: '123456'
      });
      window.CarrowmontAnalytics.track('financial_value', { amount: '987654' });
    });
    const afterRows = await dataLayerRows(page);
    expect(afterRows.length).toBe(before + 1);
    const event = afterRows.at(-1);
    expect(event[0]).toBe('event');
    expect(event[1]).toBe('country_change');
    expect(event[2]).toEqual({
      tool_id: 'loan-calculator',
      selected_region: 'US',
      selected_currency: 'USD'
    });
  });

  test('[AUTO] privacy policy separates analytics from calculator data and future account choices', async ({ page }) => {
    await gotoClean(page, '/privacy.html');
    await expect(page.getByRole('heading', { name: 'Analytics and your financial data' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accounts and saved financial information' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Financial values you enter into calculators are kept separate from website analytics.');
    await expect(page.locator('main')).toContainText('Allowing Google Analytics will not, by itself, give permission to upload calculator inputs or use saved financial information as analytics data.');
    await expect(page.locator('main')).not.toContainText('does not intentionally send');

    await page.getByRole('button', { name: 'Continue without Google Analytics' }).click();
    await page.getByRole('button', { name: 'Analytics settings' }).click();
    await expect(page.locator('#carrowmontAnalyticsConsent')).toBeVisible();
  });

  test('[AUTO] legacy FI query handoff is consumed and scrubbed before analytics initializes', async ({ page }) => {
    await gotoClean(page, '/financial-independence/?cm_handoff=fi_spending_v1&spendingMonthly=125000&withdrawalRate=3.5&inflation=6&region=US&currency=USD');
    await expect.poll(() => page.url(), { timeout: 5000 }).not.toContain('spendingMonthly');
    const url = new URL(page.url());
    expect(url.search).toBe('');
    await expect(page.locator('#monthlySpending')).toHaveValue('125000');
    await expect(page.locator('#withdrawalRate')).toHaveValue('3.5');
    await expect(page.locator('#inflation')).toHaveValue('6');
    await expect(page.locator('#seo3bHandoffNotice')).toBeVisible();
  });

  test('[AUTO] privacy choice remains usable without page-level overflow at 360px and 390px', async ({ page }) => {
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await gotoClean(page, '/loan-calculator/');
      await expect(page.locator('#carrowmontAnalyticsConsent')).toBeVisible();
      await assertNoHorizontalOverflow(page, `privacy banner ${width}px`);
      await expect(page.getByRole('button', { name: 'Continue without Google Analytics' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Allow Google Analytics' })).toBeVisible();
    }
  });
});
