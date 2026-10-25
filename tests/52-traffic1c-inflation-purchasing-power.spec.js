import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const STUDY='/research/inflation-purchasing-power-monitor.html';

test.describe('TRAFFIC1C Inflation & Purchasing-Power Monitor',()=>{
  test('[AUTO] Research hub exposes the inflation monitor with stable indexable identity and downloads',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,'/research.html'); expect(errors).toEqual([]);
    const links=page.locator(`a[href="${STUDY}"]`); expect(await links.count()).toBeGreaterThan(0); await expect(links.first()).toBeVisible();
    await gotoClean(page,STUDY); expect(errors).toEqual([]);
    await expect(page.locator('h1')).toHaveText('Inflation & Purchasing-Power Monitor');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/research/inflation-purchasing-power-monitor.html');
    await expect(page.locator('a[href="/data/research/inflation-purchasing-power-monitor.csv"]')).toBeVisible();
    await expect(page.locator('a[href="/assets/research/inflation-purchasing-power-major-groups.png"]')).toBeVisible();
  });

  test('[AUTO] official CPI metrics and purchasing-power headline remain correct and clearly separated',async({page})=>{
    await gotoClean(page,STUDY);
    const finding=page.locator('.research-finding');
    await expect(finding).toContainText('3.7%'); await expect(finding).toContainText('1.5% for medical care'); await expect(finding).toContainText('7.9% for transportation'); await expect(finding).toContainText('$139.56');
    await expect(page.locator('.metric-card').filter({hasText:'Core CPI'})).toContainText('2.6%');
    await expect(page.locator('.metric-card').filter({hasText:'Monthly CPI-U'})).toContainText('+0.6%');
  });

  test('[AUTO] research data parse and deterministic purchasing-power / basket math matches arithmetic',async({request})=>{
    const res=await request.get('/data/research/inflation-purchasing-power-monitor.json'); expect(res.ok()).toBeTruthy(); const data=await res.json();
    expect(data.official_metrics.all_items_yoy_nsa_pct).toBe(3.7); expect(data.official_metrics.core_yoy_nsa_pct).toBe(2.6); expect(data.major_groups.length).toBe(8);
    expect(data.major_groups.reduce((a,x)=>a+x.relative_importance_pct,0)).toBeCloseTo(100.001,3);
    expect(data.major_groups.find(x=>x.id==='transportation').yoy_pct).toBe(7.9); expect(data.major_groups.find(x=>x.id==='medical_care').yoy_pct).toBe(1.5);
    const ten=data.purchasing_power_anchors.find(x=>x.period==='Sep 2016'); expect(ten.dollars_in_sep_2026_needed_to_match_100_then).toBeCloseTo(139.56,2);
    const transport=data.personal_basket_presets.find(x=>x.id==='transport_heavy'); expect(transport.weighted_inflation_pct).toBeCloseTo(4.37,2);
    const csv=await (await request.get('/data/research/inflation-purchasing-power-monitor.csv')).text(); expect(csv).toContain('major_groups'); expect(csv).toContain('139.56');
  });

  test('[AUTO] personal basket runs locally, presets update deterministically and no user value enters requests or storage',async({page})=>{
    const observed=[]; page.on('request',req=>observed.push(req.url()));
    await gotoClean(page,STUDY);
    await expect(page.locator('#basket-result-rate')).toHaveText('3.75%');
    await page.locator('[data-basket-preset="transport"]').click();
    await expect(page.locator('#basket-result-rate')).toHaveText('4.37%'); await expect(page.locator('#basket-total')).toHaveText('100.0%');
    await page.locator('#basket-housing').fill('37.654321'); await page.waitForTimeout(100);
    const state=await page.evaluate(()=>({local:Object.values(localStorage),session:Object.values(sessionStorage),cookies:document.cookie}));
    expect(JSON.stringify(state)).not.toContain('37.654321'); expect(JSON.stringify(observed)).not.toContain('37.654321');
  });

  test('[AUTO] research intent stays distinct from calculator and evergreen Learn intent',async({page})=>{
    await gotoClean(page,STUDY); await expect(page.locator('a[href="/inflation-calculator/"]').first()).toBeVisible();
    await gotoClean(page,'/inflation-purchasing-power-savings.html'); await expect(page.locator(`a[href="${STUDY}"]`).first()).toBeVisible();
    await gotoClean(page,'/inflation-purchasing-power.html'); await expect(page.locator(`a[href="${STUDY}"]`).first()).toBeVisible();
  });

  test('[AUTO] [1440,1280,390,360] inflation Research page remains overflow-safe and charts are editorial-size',async({page})=>{
    for(const width of [1440,1280,390,360]){await page.setViewportSize({width,height:1000}); await gotoClean(page,STUDY); await assertNoHorizontalOverflow(page,`${width}px ${STUDY}`);}
    const charts=page.locator('.research-chart img'); expect(await charts.count()).toBeGreaterThanOrEqual(3); for(let i=0;i<await charts.count();i++) expect(await charts.nth(i).evaluate(img=>img.naturalWidth)).toBeGreaterThanOrEqual(1200);
  });
});
