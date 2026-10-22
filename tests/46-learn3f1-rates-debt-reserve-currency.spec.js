import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES=[
  {path:'/real-yields-explained.html',title:'Real Yields Explained: Real vs Nominal Yield | Carrowmont',h1:'What is a real yield, and why does it matter?',tool:'/gold-macro-stress-explorer.html'},
  {path:'/why-us-debt-interest-costs-matter.html',title:'US Debt Interest Costs: Why They Matter | Carrowmont',h1:'Why do U.S. debt interest costs matter?',tool:'/us-debt-interest-cost-calculator.html'},
  {path:'/treasury-bills-vs-notes-vs-bonds.html',title:'Treasury Bills vs Notes vs Bonds | Carrowmont',h1:'Treasury bills vs notes vs bonds: What changes with maturity?',tool:'/market-chain-reaction-explorer.html#event=yields-rise&cause=inflation&target=broad-stocks'},
  {path:'/what-makes-a-global-reserve-currency.html',title:'What Makes a Global Reserve Currency? | Carrowmont',h1:'What makes a currency a global reserve currency?',tool:'/market-chain-reaction-explorer.html#event=dollar-strengthens&cause=higher-us-rates&target=gold'}
];
function staticTitle(source){return (source.match(/<title>([^<]*)<\/title>/i)?.[1]||'').replace(/&amp;/g,'&').trim();}
function staticMetaDescription(source){const tag=source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0]||'';return tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2]?.trim()||'';}

test('[AUTO] LEARN3F-1 worked illustrations recalculate from stated assumptions',()=>{
  const exactReal=(1.05/1.03)-1;
  expect(exactReal*100).toBeCloseTo(1.94174757,6);
  const oldInterest=10_000*.02;
  const refinanced=8_000*.02+2_000*.05;
  expect(oldInterest).toBe(200);
  expect(refinanced).toBe(260);
  expect(refinanced-oldInterest).toBe(60);
  expect(-0.8*.01*100).toBeCloseTo(-0.8,8);
  expect(-8*.01*100).toBeCloseTo(-8,8);
});

test.describe('LEARN3F-1 rates, debt and reserve-currency foundations',()=>{
  test('[AUTO] four new guides keep stable static/runtime identities and Learn structure',async({page})=>{
    for(const item of PAGES){
      const response=await page.request.get(item.path); expect(response.ok(),item.path).toBeTruthy();
      const source=await response.text();
      expect(staticTitle(source)).toBe(item.title);
      const desc=staticMetaDescription(source); expect(desc.length).toBeGreaterThanOrEqual(100); expect(desc.length).toBeLessThanOrEqual(170);
      expect(source).toContain('"datePublished":"2026-10-22"'); expect(source).toContain('"dateModified":"2026-10-22"');
      expect(source).not.toMatch(/\bfetch\s*\(/);
      const errors=monitorPageErrors(page); await gotoClean(page,item.path);
      await expect(page.locator('h1')).toHaveCount(1); await expect(page.locator('h1')).toHaveText(item.h1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toHaveCount(1); await expect(page.locator('[data-cm-rich="1"]')).toHaveCount(1); await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1); await expect(page.locator('body[data-cm-learn3f1="1"]')).toHaveCount(1);
      await expect(page.locator('.learn-tool-return a')).toHaveAttribute('href',item.tool);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      expect(errors).toEqual([]);
    }
  });
  test('[AUTO] page-specific distinctions protect the approved macro mechanics',async({page})=>{
    await gotoClean(page,'/real-yields-explained.html'); await expect(page.getByRole('heading',{level:2,name:"Market real yields are not simply nominal yield minus last year's inflation"})).toHaveCount(1); await expect(page.getByRole('heading',{level:3,name:'Does a positive real yield guarantee gold will fall?'})).toHaveCount(1);
    await gotoClean(page,'/why-us-debt-interest-costs-matter.html'); await expect(page.locator('p').filter({hasText:'weighted average rate across the debt stock'})).toHaveCount(1); await expect(page.getByRole('heading',{level:2,name:'Treasury borrowing is not the same thing as “Treasury printing money”'})).toHaveCount(1);
    await gotoClean(page,'/treasury-bills-vs-notes-vs-bonds.html'); await expect(page.getByRole('heading',{level:2,name:'Price risk vs reinvestment risk'})).toHaveCount(1); await expect(page.getByRole('heading',{level:2,name:'Same issuer does not mean same price risk'})).toHaveCount(1);
    await gotoClean(page,'/what-makes-a-global-reserve-currency.html'); await expect(page.locator('.mcr-precision-note')).toContainText('COFER excludes monetary gold'); await expect(page.getByRole('heading',{level:2,name:'Reserve currency status is more than trade invoicing'})).toHaveCount(1);
  });
  test('[AUTO] LEARN3F-1 remains overflow-safe at 1280, 390 and 360px',async({page})=>{
    for(const width of [1280,390,360]){ await page.setViewportSize({width,height:900}); for(const item of PAGES){ await gotoClean(page,item.path); await assertNoHorizontalOverflow(page,`${width}px ${item.path}`); const wraps=page.locator('.guide-table-wrap'); if(await wraps.count()){ const safe=await wraps.evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).overflowX==='auto' && n.scrollWidth>=n.clientWidth)); expect(safe).toBeTruthy(); } } }
  });
});
