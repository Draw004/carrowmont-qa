import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const STUDY='/research/mortgage-affordability-monitor.html';

test.describe('TRAFFIC1A Research foundation and Mortgage Affordability Monitor',()=>{
  test('[AUTO] Research hub and study expose distinct indexable identities and data downloads',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,'/research.html'); expect(errors).toEqual([]);
    await expect(page.locator('h1')).toContainText('Data-led research');
    await expect(page.locator(`a[href="${STUDY}"]`)).toBeVisible();
    await gotoClean(page,STUDY); expect(errors).toEqual([]);
    await expect(page.locator('h1')).toHaveText('Mortgage Affordability Monitor');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/research/mortgage-affordability-monitor.html');
    await expect(page.locator('a[href="/data/research/mortgage-affordability-monitor.csv"]')).toBeVisible();
    await expect(page.locator('a[href="/assets/research/mortgage-affordability-monitor-payment-pressure.png"]')).toBeVisible();
  });

  test('[AUTO] headline values agree with deterministic payment math',async({page})=>{
    await gotoClean(page,STUDY);
    const finding=page.locator('.research-finding');
    await expect(finding).toContainText('7.32%');
    await expect(finding).toContainText('$400,000 mortgage');
    await expect(finding).toContainText('$2,748/month');
    await expect(finding).toContainText('$300 more per month');
    const metric=page.locator('.metric-card').filter({hasText:'P&I / median gross income'});
    await expect(metric).toContainText('29.7%');
    await expect(metric).toContainText('not lender DTI');
  });

  test('[AUTO] research data files parse and sensitivity rows match visible values',async({request})=>{
    const jsonRes=await request.get('/data/research/mortgage-affordability-monitor.json'); expect(jsonRes.ok()).toBeTruthy();
    const data=await jsonRes.json();
    expect(data.headline_metrics.current_30yr_fixed_pct).toBe(7.32);
    expect(data.headline_metrics.reference_400k_current_monthly_pi_usd).toBeCloseTo(2747.72,2);
    expect(data.headline_metrics.pi_share_of_gross_median_monthly_income_pct).toBeCloseTo(29.69,2);
    expect(data.rate_snapshots.length).toBe(13);
    expect(data.median_new_home_prices.length).toBe(12);
    expect(data.payment_sensitivity.length).toBe(15);
    const csvRes=await request.get('/data/research/mortgage-affordability-monitor.csv'); expect(csvRes.ok()).toBeTruthy();
    const csv=await csvRes.text(); expect(csv).toContain('payment_sensitivity'); expect(csv).toContain('2747.72');
  });

  test('[AUTO] research links preserve calculator intent and connect back to action',async({page})=>{
    await gotoClean(page,STUDY);
    const affordabilityLinks=page.locator('a[href="/home-affordability-calculator.html"]');
    expect(await affordabilityLinks.count()).toBeGreaterThan(0);
    await expect(affordabilityLinks.first()).toBeVisible();
    const refinanceLinks=page.locator('a[href="/mortgage-payoff-calculator/refinance-break-even.html"]');
    expect(await refinanceLinks.count()).toBeGreaterThan(0);
    await expect(refinanceLinks.first()).toBeVisible();
    await gotoClean(page,'/home-affordability-calculator.html');
    const studyLinks=page.locator(`a[href="${STUDY}"]`);
    expect(await studyLinks.count()).toBeGreaterThan(0);
    await expect(studyLinks.first()).toBeVisible();
  });

  test('[AUTO] [1440,1280,390,360] Research pages remain overflow-safe and primary chart is visible',async({page})=>{
    for(const width of [1440,1280,390,360]){
      await page.setViewportSize({width,height:1000});
      for(const path of ['/research.html',STUDY]){
        await gotoClean(page,path); await assertNoHorizontalOverflow(page,`${width}px ${path}`);
      }
      await gotoClean(page,STUDY); await expect(page.locator('img[src*="payment-pressure.png"]')).toBeVisible();
    }
  });
});
