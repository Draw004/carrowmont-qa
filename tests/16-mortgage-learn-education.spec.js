import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const TOOL='/mortgage-payoff-calculator/';
const GUIDES=[
  '/one-extra-mortgage-payment-a-year.html',
  '/monthly-extra-vs-annual-lump-sum-mortgage.html',
  '/biweekly-fortnightly-mortgage-payments.html',
  '/extra-mortgage-payments-early-vs-late.html',
  '/pay-off-mortgage-five-years-early.html'
];
async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}

test.describe('Mortgage Learn & Education Integration V1',()=>{
  test('[AUTO] Mortgage tool exposes a visible two-way education path and country-aware FAQ',async({page})=>{
    await gotoClean(page,TOOL);
    await expect(page.locator('.learn-bridge-card')).toBeVisible();
    await expect(page.locator('.learn-bridge-card a[href="/one-extra-mortgage-payment-a-year.html"]')).toBeVisible();
    await expect(page.locator('.learn-bridge-card a[href="/learn.html#home-loans"]')).toBeVisible();
    await expect(page.locator('#resultLearnLink')).toHaveAttribute('href','/extra-mortgage-payments-early-vs-late.html');

    await setLocale(page,'IN','INR');
    await expect(page.locator('#countryFaqQuestion')).toContainText('foreclosure');
    await setLocale(page,'GB','GBP');
    await expect(page.locator('#countryFaqQuestion')).toContainText('overpayment');
    await setLocale(page,'US','USD');
    await expect(page.locator('#countryFaqQuestion')).toContainText('United States');
    await expect(page.locator('#countryFaqQuestion')).not.toContainText('India');
    await expect(page.locator('#countryFaqQuestion')).not.toContainText('UK');
  });

  test('[AUTO] result education link changes with the scenario being explored',async({page})=>{
    await gotoClean(page,TOOL);
    await page.locator('.mode-btn[data-mode="lump"]').click();
    await expect(page.locator('#resultLearnLink')).toHaveAttribute('href','/monthly-extra-vs-annual-lump-sum-mortgage.html');
    await page.locator('.mode-btn[data-mode="target"]').click();
    await expect(page.locator('#resultLearnLink')).toHaveAttribute('href','/pay-off-mortgage-five-years-early.html');
    await page.locator('#paymentFrequency').selectOption('biweekly');
    await expect(page.locator('#resultLearnLink')).toHaveAttribute('href','/biweekly-fortnightly-mortgage-payments.html');
  });

  test('[AUTO] all five mortgage Learn guides link to the tool at the top and through the shared bottom CTA',async({page})=>{
    for(const path of GUIDES){
      await gotoClean(page,path);
      await expect(page.locator('.guide-section > div')).toHaveCount(1);
      await expect(page.locator('.guide-answer')).toHaveCount(1);
      await expect(page.locator('.guide-action-first a[href="/mortgage-payoff-calculator/"]')).toBeVisible();
      await expect(page.locator('.learn-tool-return a[href="/mortgage-payoff-calculator/"]')).toBeVisible();
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(3);
    }
  });

  test('[AUTO] Mortgage Learn terminology follows the selected country without changing article URLs',async({page})=>{
    await gotoClean(page,GUIDES[0]);
    await setLocale(page,'IN','INR');
    await expect(page.locator('#articleKicker')).toContainText('HOME LOAN');
    await expect(page.locator('.guide-action-first [data-cm-mortgage-term="calculator"]')).toContainText('Home Loan');
    await setLocale(page,'GB','GBP');
    await expect(page.locator('#articleKicker')).toContainText('MORTGAGE OVERPAYMENT');
    await expect(page.locator('.guide-action-first [data-cm-mortgage-term="calculator"]')).toContainText('Mortgage Overpayment');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/one-extra-mortgage-payment-a-year.html');
  });

  test('[AUTO] Learn hub exposes the five-guide Home Loans & Mortgages cluster and mobile stays overflow-safe',async({page})=>{
    await gotoClean(page,'/learn.html');
    const cluster=page.locator('#home-loans');
    await expect(cluster).toBeVisible();
    for(const path of GUIDES) await expect(cluster.locator(`a[href="${path}"]`)).toBeVisible();
    for(const width of [390,360]){
      await page.setViewportSize({width,height:900});
      await gotoClean(page,GUIDES[0]);
      await assertNoHorizontalOverflow(page,`${width}px mortgage learn article`);
      await gotoClean(page,TOOL);
      await assertNoHorizontalOverflow(page,`${width}px mortgage tool learn bridge`);
    }
  });
});
