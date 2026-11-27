import { test, expect } from '@playwright/test';
import { gotoClean } from '../helpers/common.js';

const ASK = '/ask-carrowmont.html';
const DRAW = '/retirement-calculator/withdrawal-calculator.html';

function observeRequests(page) {
  const requests = [];
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData() || ''
    });
  });
  return requests;
}

async function browserSurface(page) {
  return page.evaluate(() => ({
    url: location.href,
    cookies: document.cookie,
    local: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)]))
  }));
}

function assertAbsentFromSurfaces(values, requests, surface, options = {}) {
  const requestText = JSON.stringify(requests).toLowerCase();
  const surfaceText = JSON.stringify(surface).toLowerCase();
  for (const raw of values) {
    const value = String(raw).toLowerCase();
    const encoded = encodeURIComponent(value).toLowerCase();
    expect(requestText, `financial value ${value} appeared in outgoing request URL/body`).not.toContain(value);
    expect(requestText, `encoded financial value ${value} appeared in outgoing request URL/body`).not.toContain(encoded);
    if (!options.allowOneTimeSessionTransfer) {
      expect(surfaceText, `financial value ${value} appeared in URL, cookies or browser storage`).not.toContain(value);
    }
  }
}

test.describe('SECOPS4 guest financial data egress and handoff', () => {
  test('[AUTO] guided Ask income and spending remain in the current page only, not requests or persisted browser state', async ({ page }) => {
    const requests = observeRequests(page);
    await gotoClean(page, ASK);
    await page.locator('#askQuestion').fill('I keep running out of money before payday');
    await page.locator('#askStartBtn').click();
    const inputs = page.locator('#askQuestionFields input');
    await expect(inputs).toHaveCount(3);
    const values = { monthlyIncome: 94713, essentialExpenses: 65129, flexibleExpenses: 49187 };
    for (const [name, value] of Object.entries(values)) {
      const input = page.locator(`#askQuestionFields input[name="${name}"]`);
      await expect(input).toBeVisible();
      await input.fill(String(value));
    }
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    await page.waitForTimeout(200);
    assertAbsentFromSurfaces(Object.values(values), requests, await browserSurface(page));
  });

  test('[AUTO] explicit INR corpus uses a one-time review; it never goes in a URL or outgoing request', async ({ page }) => {
    const requests = observeRequests(page);
    await gotoClean(page, ASK);
    await page.evaluate(() => {
      if (!window.CarrowmontLocale?.setLocale) throw new Error('Locale API unavailable');
      window.CarrowmontLocale.setLocale('IN', 'INR');
    });
    await expect.poll(() => page.evaluate(() => window.CarrowmontLocale.getCurrency())).toBe('INR');
    await page.locator('#askQuestion').fill('i have 1.5 crore how long will it last');
    await expect(page.locator('#askStartBtn')).toContainText('Open Drawdown Calculator');
    await Promise.all([
      page.waitForURL(url => url.pathname === DRAW),
      page.locator('#askStartBtn').click()
    ]);
    await expect(page.locator('#retirementImportPanel')).toBeVisible();
    await expect(page.locator('#startingBalance')).toHaveValue('10000000');
    const beforeAcceptance = await browserSurface(page);
    const currentUrl = new URL(beforeAcceptance.url);
    expect(currentUrl.search).toBe('');
    expect(currentUrl.hash).toBe('');
    expect(beforeAcceptance.local).not.toHaveProperty('carrowmont_retirement_withdrawal_handoff_v1');
    expect(beforeAcceptance.session).not.toHaveProperty('carrowmont_retirement_withdrawal_handoff_v1');
    assertAbsentFromSurfaces(['15000000', '1.5%20crore'], requests, { url: beforeAcceptance.url, cookies: beforeAcceptance.cookies });
    await page.locator('#useProjectedImport').click();
    await expect(page.locator('#startingBalance')).toHaveValue('15000000');
    // User-approved application is allowed; no query string, network upload or automatic account save.
    expect(new URL(page.url()).search).toBe('');
    assertAbsentFromSurfaces(['15000000'], requests, { url: page.url(), cookies: (await browserSurface(page)).cookies });
  });
});
