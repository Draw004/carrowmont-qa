import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const SPACING_PAGES=[
  '/retirement-monthly-income-needed.html','/how-to-make-a-budget.html','/50-30-20-budget-rule.html',
  '/mortgage-affordability-vs-lender-approval.html','/emergency-savings.html','/cash-flow-vs-income.html'
];

test.describe('LEARN presentation polish',()=>{
  test('[AUTO] macro 30-second answer keeps body text normal and only targeted emphasis bold',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/what-makes-a-global-reserve-currency.html');expect(errors).toEqual([]);
    const answer=page.locator('.guide-answer');await expect(answer).toBeVisible();
    const p=answer.locator('p');
    const bodyWeight=Number(await p.evaluate(n=>getComputedStyle(n).fontWeight));
    expect(bodyWeight).toBeLessThan(700);
    const label=answer.locator(':scope > strong');await expect(label).toHaveCount(1);
    expect(await label.evaluate(n=>getComputedStyle(n).display)).toBe('block');
    const inline=p.locator('strong');await expect(inline).toHaveCount(1);
    expect(await inline.evaluate(n=>getComputedStyle(n).display)).toBe('inline');
    expect(Number(await inline.evaluate(n=>getComputedStyle(n).fontWeight))).toBeGreaterThanOrEqual(700);
  });

  test('[AUTO] colon capitalization is visible in authored prose',async({page})=>{
    await gotoClean(page,'/mortgage-affordability-vs-lender-approval.html');
    const text=await page.locator('main').innerText();
    expect(text).toContain('“Approved” means “affordable”: Approval means');
    expect(text).toContain('A low payment means low cost: A longer term');
    await gotoClean(page,'/retirement-savings-by-age.html');
    expect(await page.locator('main').innerText()).toMatch(/Better question:\s+Instead of asking/);
  });

  test('[AUTO] checklist and question cards use compact spacing with aligned single-column flow',async({page})=>{
    for(const path of SPACING_PAGES){
      await gotoClean(page,path);
      const lists=page.locator('.guide-steps');
      if(await lists.count()===0) continue;
      const list=lists.first();
      const cs=await list.evaluate(n=>({gap:parseFloat(getComputedStyle(n).rowGap)||0,paddingLeft:parseFloat(getComputedStyle(n).paddingLeft)||0}));
      expect(cs.gap).toBeLessThanOrEqual(10);expect(cs.paddingLeft).toBe(0);
      const rows=list.locator('li');expect(await rows.count()).toBeGreaterThan(0);
      const vals=await rows.evaluateAll(ns=>ns.map(n=>({display:getComputedStyle(n).display,mt:parseFloat(getComputedStyle(n).marginTop)||0,mb:parseFloat(getComputedStyle(n).marginBottom)||0})));
      for(const row of vals){expect(row.display).toBe('block');expect(row.mt).toBe(0);expect(row.mb).toBe(0);}
      await assertNoHorizontalOverflow(page,`${path} compact cards`);
    }
  });

  test('[AUTO] retirement runway data table is structurally aligned and visually grouped',async({page})=>{
    await gotoClean(page,'/how-long-will-retirement-savings-last.html');
    const table=page.locator('.guide-table').first();await expect(table).toBeVisible();
    expect(await table.locator('thead th').count()).toBe(2);
    const cells=await table.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.cells.length));
    expect(cells.every(n=>n===2)).toBeTruthy();
    await expect(table.locator('.guide-table-note')).toContainText('sequence matters');
  });

  test('[AUTO] contact email action is pulled into the first desktop viewport',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await gotoClean(page,'/contact.html');
    await expect(page.locator('body')).toHaveClass(/contact-page/);
    const hero=await page.locator('.page-hero-inner').evaluate(n=>({pt:parseFloat(getComputedStyle(n).paddingTop),pb:parseFloat(getComputedStyle(n).paddingBottom)}));
    expect(hero.pt).toBeLessThanOrEqual(44);expect(hero.pb).toBeLessThanOrEqual(40);
    const card=page.locator('.contact-card');await expect(card).toBeVisible();
    const box=await card.boundingBox();expect(box).not.toBeNull();expect(box.y).toBeLessThan(760);
    await expect(page.locator('a[href="mailto:contact@carrowmont.com"]')).toBeVisible();
  });

  test('[AUTO] [1280,390,360] presentation samples remain overflow-safe',async({page})=>{
    for(const width of [1280,390,360]){
      await page.setViewportSize({width,height:1000});
      for(const path of ['/what-makes-a-global-reserve-currency.html','/how-to-make-a-budget.html','/mortgage-affordability-vs-lender-approval.html','/contact.html']){
        await gotoClean(page,path);await assertNoHorizontalOverflow(page,`${width}px ${path}`);
      }
    }
  });
});
