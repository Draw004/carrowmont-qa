import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

async function observeAnalyticsNetwork(page) {
  const forbidden = [];
  page.on('request', request => {
    const url = request.url();
    if (/googletagmanager\.com|google-analytics\.com/i.test(url)) forbidden.push(url);
  });
  await page.route('https://static.cloudflareinsights.com/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: '/* Cloudflare Web Analytics stubbed during QA. */' });
  });
  return forbidden;
}

test.describe('GSEO2A privacy-first analytics boundary', () => {
  test('[AUTO] first visit has no analytics popup and never loads Google Analytics', async ({ page }) => {
    const forbidden = await observeAnalyticsNetwork(page);

    for (const path of ['/', '/loan-calculator/', '/sip-calculator/', '/retirement-calculator/withdrawal-calculator.html']) {
      await gotoClean(page, path);
      await expect(page.locator('#carrowmontAnalyticsConsent')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Google Analytics/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Analytics settings' })).toHaveCount(0);
      await expect(page.locator('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]')).toHaveCount(0);
      await expect(page.locator('script[data-carrowmont-cloudflare="true"]')).toHaveCount(1);
      await expect.poll(() => page.evaluate(() => window.CarrowmontAnalytics?.provider)).toBe('cloudflare-aggregate');
    }

    expect(forbidden).toEqual([]);
  });

  test('[AUTO] compatibility analytics calls cannot send calculator values to GA', async ({ page }) => {
    const forbidden = await observeAnalyticsNetwork(page);
    await gotoClean(page, '/loan-calculator/?loanAmount=987654&income=123456');

    const result = await page.evaluate(() => {
      const before = Array.isArray(window.dataLayer) ? window.dataLayer.length : 0;
      window.CarrowmontAnalytics?.track?.('country_change', {
        selected_region: 'US',
        selected_currency: 'USD',
        loan_amount: '987654',
        income: '123456'
      });
      window.CarrowmontAnalytics?.track?.('financial_value', { amount: '987654' });
      const after = Array.isArray(window.dataLayer) ? window.dataLayer.length : 0;
      return { before, after, provider: window.CarrowmontAnalytics?.provider };
    });

    expect(result).toEqual({ before: 0, after: 0, provider: 'cloudflare-aggregate' });
    expect(forbidden).toEqual([]);
  });

  test('[AUTO] privacy policy explains financial-data protection in simple language without a consent control', async ({ page }) => {
    await gotoClean(page, '/privacy.html');
    await expect(page.getByRole('heading', { name: 'Your financial information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Website analytics' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Carrowmont does not use those financial values for advertising, profiling or website analytics.');
    await expect(page.locator('main')).toContainText('These analytics do not include the financial values you enter into calculators.');
    await expect(page.locator('main')).toContainText('Cloudflare Web Analytics');
    await expect(page.locator('main')).not.toContainText('Google Analytics');
    await expect(page.getByRole('button', { name: 'Analytics settings' })).toHaveCount(0);
    await expect(page.locator('#carrowmontAnalyticsConsent')).toHaveCount(0);
  });

  test('[AUTO] legacy FI query handoff is consumed and financial values are scrubbed from the URL', async ({ page }) => {
    await gotoClean(page, '/financial-independence/?cm_handoff=fi_spending_v1&spendingMonthly=125000&withdrawalRate=3.5&inflation=6&region=US&currency=USD');
    await expect.poll(() => page.url(), { timeout: 5000 }).not.toContain('spendingMonthly');
    const url = new URL(page.url());
    expect(url.search).toBe('');
    await expect(page.locator('#monthlySpending')).toHaveValue('125000');
    await expect(page.locator('#withdrawalRate')).toHaveValue('3.5');
    await expect(page.locator('#inflation')).toHaveValue('6');
    await expect(page.locator('#seo3bHandoffNotice')).toBeVisible();
  });

  test('[AUTO] removing the consent popup stays mobile-safe at 360px and 390px', async ({ page }) => {
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await gotoClean(page, '/loan-calculator/');
      await expect(page.locator('#carrowmontAnalyticsConsent')).toHaveCount(0);
      await assertNoHorizontalOverflow(page, `privacy-first loan page ${width}px`);
    }
  });
});
