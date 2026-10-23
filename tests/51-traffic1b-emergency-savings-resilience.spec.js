import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const STUDY='/research/emergency-savings-resilience.html';

test.describe('TRAFFIC1B Emergency Savings & Income-Loss Resilience Report',()=>{
  test('[AUTO] Research hub exposes the resilience report with stable indexable identity',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,'/research.html'); expect(errors).toEqual([]);
    const reportLinks=page.locator(`a[href="${STUDY}"]`); expect(await reportLinks.count()).toBeGreaterThan(0); await expect(reportLinks.first()).toBeVisible();
    await gotoClean(page,STUDY); expect(errors).toEqual([]);
    await expect(page.locator('h1')).toHaveText('Emergency Savings & Income-Loss Resilience Report');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/research/emergency-savings-resilience.html');
    await expect(page.locator('a[href="/data/research/emergency-savings-resilience.csv"]')).toBeVisible();
    await expect(page.locator('a[href="/assets/research/emergency-savings-resilience-runway.png"]')).toBeVisible();
  });

  test('[AUTO] official SHED metrics and Carrowmont runway headline remain separated and correct',async({page})=>{
    await gotoClean(page,STUDY);
    const finding=page.locator('.research-finding');
    await expect(finding).toContainText('55% of U.S. adults');
    await expect(finding).toContainText('30% said they could not cover three months');
    const cards=page.locator('.metric-card');
    await expect(cards.filter({hasText:'$400 with cash/equivalent'})).toContainText('63%');
    await expect(cards.filter({hasText:'Major unexpected expense'})).toContainText('59%');
    await expect(page.locator('img[src*="emergency-savings-resilience-runway.png"]')).toBeVisible();
  });

  test('[AUTO] research data parse and deterministic runway matrix matches arithmetic',async({request})=>{
    const jsonRes=await request.get('/data/research/emergency-savings-resilience.json'); expect(jsonRes.ok()).toBeTruthy();
    const data=await jsonRes.json();
    expect(data.official_metrics.three_month_fund_pct).toBe(55);
    expect(data.official_metrics.three_month_unable_pct).toBe(30);
    expect(data.official_metrics.cash_equiv_400_pct).toBe(63);
    expect(data.official_metrics.major_unexpected_expense_pct).toBe(59);
    expect(data.carrowmont_runway_matrix.length).toBe(16);
    const tenK=data.carrowmont_runway_matrix.find(x=>x.reserve_usd===10000 && x.monthly_cash_shortfall_usd===2500);
    expect(tenK.months_runway).toBe(4);
    const fifty=data.carrowmont_income_loss_example.scenarios.find(x=>x.income_reduction_pct===50);
    expect(fifty.monthly_cash_shortfall_usd).toBe(1800);
    expect(fifty.months_runway_on_20000_reserve).toBeCloseTo(11.11,2);
    const csvRes=await request.get('/data/research/emergency-savings-resilience.csv'); expect(csvRes.ok()).toBeTruthy();
    const csv=await csvRes.text(); expect(csv).toContain('runway_matrix'); expect(csv).toContain('three_month_fund_pct');
  });

  test('[AUTO] research intent stays distinct from emergency-fund guidance and links back to planning action',async({page})=>{
    await gotoClean(page,STUDY);
    const budgetLinks=page.locator('a[href="/budget-cash-flow-planner/"]'); expect(await budgetLinks.count()).toBeGreaterThan(0); await expect(budgetLinks.first()).toBeVisible();
    const guideLinks=page.locator('a[href="/emergency-fund-how-much.html"]'); expect(await guideLinks.count()).toBeGreaterThan(0); await expect(guideLinks.first()).toBeVisible();
    await gotoClean(page,'/emergency-fund-how-much.html');
    const researchLinks=page.locator(`a[href="${STUDY}"]`); expect(await researchLinks.count()).toBeGreaterThan(0); await expect(researchLinks.first()).toBeVisible();
  });

  test('[AUTO] [1440,1280,390,360] resilience Research page remains overflow-safe and charts are editorial-size',async({page})=>{
    for(const width of [1440,1280,390,360]){
      await page.setViewportSize({width,height:1000}); await gotoClean(page,STUDY); await assertNoHorizontalOverflow(page,`${width}px ${STUDY}`);
    }
    const charts=page.locator('.research-chart img'); expect(await charts.count()).toBeGreaterThanOrEqual(4);
    for(let i=0;i<await charts.count();i++) expect(await charts.nth(i).evaluate(img=>img.naturalWidth)).toBeGreaterThanOrEqual(1200);
  });
});
