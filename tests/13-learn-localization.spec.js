import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const FI_GUIDE = '/financial-independence-number.html';
const SIP_GUIDE = '/10000-sip-returns.html';
const MARKET_FALL_GUIDE = '/sip-during-market-fall.html';
const LEARN = '/learn.html';

async function dismissAnalytics(page) {
  const decline = page.locator('[data-analytics-choice="denied"]').first();
  if (await decline.count()) await decline.click().catch(() => {});
}

async function setLocale(page, region, currency) {
  await expect.poll(async () => page.evaluate(() => Boolean(
    window.CarrowmontLocale && typeof window.CarrowmontLocale.setLocale === 'function' &&
    window.CarrowmontLearnLocalization && typeof window.CarrowmontLearnLocalization.apply === 'function'
  )), { timeout: 10000 }).toBe(true);
  await page.evaluate(({ region, currency }) => {
    window.CarrowmontLocale.setLocale(region, currency);
    window.CarrowmontLearnLocalization.apply();
  }, { region, currency });
  await expect.poll(async () => page.evaluate(() => ({
    region: window.CarrowmontLocale.getRegion(),
    currency: window.CarrowmontLocale.getCurrency()
  })), { timeout: 10000 }).toEqual({ region, currency });
}

async function mainText(page) {
  return (await page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
}

async function expectedMoney(page, value) {
  const formatted = await page.evaluate(v => window.CarrowmontLocale.formatMoney(v, { maximumFractionDigits: 0 }), value);
  return formatted.replace(/\s+/g, ' ').trim();
}

async function homepageOrder(page) {
  return page.locator('[data-homepage-core-grid] > [data-tool-id]').evaluateAll(nodes => nodes.map(node => node.dataset.toolId));
}

test.describe('LEARN-LOCALE1 global Learn localization', () => {
  test('[AUTO] all supported currencies have explicit finite Learn example profiles with no fallback gap', async ({ page }) => {
    await gotoClean(page, LEARN);
    await dismissAnalytics(page);
    const result = await page.evaluate(() => {
      const locale = window.CarrowmontLocale;
      const learn = window.CarrowmontLearnLocalization;
      const currencyCodes = Object.keys(locale.currencies);
      const profileCodes = Object.keys(learn.currencyExamples);
      const rows = [];
      for (const code of currencyCodes) {
        locale.setLocale('OTHER', code);
        learn.apply();
        const state = learn.getState();
        rows.push({
          code,
          profile: learn.currencyExamples[code] || null,
          currency: state.currency,
          target: state.cfg.target,
          monthly: state.cfg.monthly,
          goal: state.cfg.goal,
          monthlyExpense: state.cfg.monthlyExpense,
          annualSpending: state.cfg.annualSpending,
          existing: state.cfg.existing
        });
      }
      return { currencyCodes, profileCodes, rows };
    });
    expect(result.currencyCodes).toHaveLength(34);
    expect(result.profileCodes.sort()).toEqual(result.currencyCodes.sort());
    for (const row of result.rows) {
      expect(row.profile, `${row.code} explicit profile`).toBeTruthy();
      expect(row.currency).toBe(row.code);
      for (const key of ['target','monthly','goal','monthlyExpense','annualSpending','existing']) {
        expect(Number.isFinite(row[key]) && row[key] > 0, `${row.code}.${key}`).toBeTruthy();
      }
    }
  });

  test('[AUTO] Financial Independence guide rich table follows country and selected currency without India leakage', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, FI_GUIDE);
    await dismissAnalytics(page);

    await setLocale(page, 'IN', 'INR');
    let text = await mainText(page);
    expect(text).toContain('₹6 lakh');
    expect(text).toContain('₹1.5 crore');

    for (const [region, currency] of [['US','USD'],['GB','GBP'],['CA','CAD'],['AU','AUD'],['DE','EUR']]) {
      await setLocale(page, region, currency);
      text = await mainText(page);
      const spending = await expectedMoney(page, 60000);
      expect(text, `${region}/${currency} annual spending`).toContain(spending);
      expect(text, `${region}/${currency} no INR symbol`).not.toContain('₹');
      expect(text, `${region}/${currency} no lakh`).not.toMatch(/\blakhs?\b/i);
      expect(text, `${region}/${currency} no crore`).not.toMatch(/\bcrores?\b/i);
    }

    await setLocale(page, 'US', 'EUR');
    const selected = await page.evaluate(() => ({ region: window.CarrowmontLocale.getRegion(), currency: window.CarrowmontLocale.getCurrency() }));
    expect(selected).toEqual({ region: 'US', currency: 'EUR' });
    text = await mainText(page);
    expect(text).toContain(await expectedMoney(page, 60000));
    expect(text).not.toContain('₹');
    expect(errors).toEqual([]);
  });

  test('[AUTO] legacy SIP guides keep India terminology but render neutral terminology and selected money elsewhere', async ({ page }) => {
    for (const path of [SIP_GUIDE, MARKET_FALL_GUIDE]) {
      await gotoClean(page, path);
      await dismissAnalytics(page);
      await setLocale(page, 'IN', 'INR');
      let text = await mainText(page);
      expect(text, `${path} India terminology`).toMatch(/\bSIP\b/);
      expect(text, `${path} India currency`).toContain('₹');

      await setLocale(page, 'US', 'USD');
      text = await mainText(page);
      expect(text, `${path} non-India SIP removal`).not.toMatch(/\bSIP(?:s)?\b/);
      expect(text, `${path} non-India INR removal`).not.toContain('₹');
      expect(text, `${path} non-India lakh removal`).not.toMatch(/\blakhs?\b/i);
      expect(text, `${path} non-India crore removal`).not.toMatch(/\bcrores?\b/i);
      expect(text, `${path} recurring terminology`).toMatch(/recurring investment plan|monthly investment|regular invest/i);
    }
  });

  test('[AUTO] representative new currency profiles localize Learn amounts without NaN undefined or USD fallback', async ({ page }) => {
    await gotoClean(page, FI_GUIDE);
    for (const [region, currency] of [['BD','BDT'],['DK','DKK'],['OM','OMR'],['PL','PLN'],['SE','SEK'],['QA','QAR'],['JP','JPY'],['VN','VND']]) {
      await setLocale(page, region, currency);
      const text = await mainText(page);
      expect(text, `${currency} no NaN`).not.toContain('NaN');
      expect(text, `${currency} no undefined`).not.toContain('undefined');
      expect(text, `${currency} no India units`).not.toMatch(/₹|\blakhs?\b|\bcrores?\b/i);
      const state = await page.evaluate(() => window.CarrowmontLearnLocalization.getState().cfg);
      const expected = await expectedMoney(page, state.annualSpending);
      expect(text, `${currency} annual spending`).toContain(expected);
    }
  });

  test('[AUTO] Learn localization does not change TOOLS-HUB homepage country ordering, visuals or gateway contract', async ({ page }) => {
    await gotoClean(page, '/');
    await dismissAnalytics(page);
    await expect.poll(async () => page.evaluate(() => Boolean(window.CarrowmontToolsHub && window.CarrowmontLocale))).toBe(true);

    await page.evaluate(() => { window.CarrowmontLocale.setLocale('IN','INR'); window.CarrowmontToolsHub.apply(); });
    await expect.poll(() => homepageOrder(page)).toEqual(['investment','retirement','budget','inflation','goals','independence']);
    await expect(page.locator('[data-tool-id="investment"] [data-cm-investment-title]')).toHaveText('SIP Calculator');
    await expect(page.locator('[data-homepage-core-grid] .tool-icon')).toHaveCount(7);
    await expect(page.locator('[data-tools-gateway]')).toBeVisible();
    await expect(page.locator('[data-homepage-core-grid] > article').last()).toHaveAttribute('data-tools-gateway', '');

    await page.evaluate(() => { window.CarrowmontLocale.setLocale('US','USD'); window.CarrowmontToolsHub.apply(); });
    await expect.poll(() => homepageOrder(page)).toEqual(['retirement','investment','budget','inflation','goals','independence']);
    await expect(page.locator('[data-tool-id="investment"] [data-cm-investment-title]')).toHaveText('Recurring Investment Calculator');
    await expect(page.locator('[data-tools-gateway]')).toBeVisible();
    await expect(page.locator('.authority-tools-grid .authority-tool-card')).toHaveCount(4);
  });

  test('[AUTO] localized Learn guides remain overflow-safe at 390px and 360px', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [FI_GUIDE, SIP_GUIDE, '/sequence-of-returns-risk.html']) {
        await gotoClean(page, path);
        await dismissAnalytics(page);
        await setLocale(page, 'US', 'USD');
        await assertNoHorizontalOverflow(page, `${width}px ${path}`);
      }
    }
  });
});
