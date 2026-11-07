import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, setInput, validatePdfDownload, saveReferenceScreenshot } from '../helpers/common.js';

const PATH='/emergency-fund-runway-calculator.html';
const LEARN=['/emergency-fund-how-much.html','/emergency-savings.html','/sinking-fund-vs-emergency-fund.html','/how-to-make-a-budget.html','/budgeting-with-irregular-income.html'];
const BASE={essentialExpenses:60000,debtPayments:10000,otherCommitments:5000,emergencySavings:300000,otherLiquidCash:50000,includeOtherLiquidCash:false,targetMonths:6,monthlyContribution:15000,disruptionIncome:0,shockCost:50000};

async function calculate(page,input){return page.evaluate(input=>window.CarrowmontEmergencyFundCore.calculate(input),input);}
async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>({region:window.CarrowmontLocale.getRegion(),currency:window.CarrowmontLocale.getCurrency()}))).toEqual({region,currency});
}

test.describe('FRE2A Emergency Fund & Financial Runway',()=>{
  test('[AUTO] canonical identity controls transparency and default result are complete',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,PATH);
    await expect(page).toHaveTitle('Emergency Fund & Financial Runway Calculator | Carrowmont');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('How long could your essential spending keep going if income changed suddenly?');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/emergency-fund-runway-calculator.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
    for(const id of ['essentialExpenses','debtPayments','otherCommitments','emergencySavings','otherLiquidCash','includeOtherLiquidCash','targetMonths','monthlyContribution','shockCost','disruptionIncome','calculateBtn','copySummaryBtn','downloadCsvBtn','generateReportBtn']) await expect(page.locator(`#${id}`),id).toHaveCount(1);
    await expect(page.locator('.ef-reference')).toContainText('Reference point, not a rule');
    await expect(page.locator('.ef-reference')).toContainText('context only');
    await expect(page.locator('#statusHeadline')).toContainText('4 months');
    await expect(page.locator('#targetGapValue')).not.toHaveText('-');
    expect(errors).toEqual([]);
  });

  test('[AUTO] deterministic engine preserves runway target stress and edge-case semantics',async({page})=>{
    await gotoClean(page,PATH);
    const base=await calculate(page,BASE);
    expect(base.ok).toBe(true);expect(base.monthlyNeed).toBe(75000);expect(base.reserve).toBe(300000);expect(base.fullLossRunwayMonths).toBe(4);expect(base.targetAmount).toBe(450000);expect(base.targetGap).toBe(150000);expect(base.monthsToTarget).toBe(10);expect(base.postShockReserve).toBe(250000);expect(base.stressMonthlyBurn).toBe(75000);expect(base.stressedRunwayMonths).toBeCloseTo(3.333333,6);expect(base.classification).toBe('BUILDING');
    const excluded=await calculate(page,{...BASE,otherLiquidCash:90000,includeOtherLiquidCash:false});const included=await calculate(page,{...BASE,otherLiquidCash:90000,includeOtherLiquidCash:true});expect(excluded.reserve).toBe(300000);expect(included.reserve).toBe(390000);
    const noNeed=await calculate(page,{});expect(noNeed.ok).toBe(false);expect(noNeed.fullLossRunwayMonths).toBeNull();
    const covered=await calculate(page,{essentialExpenses:50000,emergencySavings:400000,targetMonths:6});expect(covered.classification).toBe('TARGET_COVERED');expect(covered.targetGap).toBe(0);
    const incomeCovered=await calculate(page,{essentialExpenses:50000,emergencySavings:200000,targetMonths:6,disruptionIncome:60000,shockCost:10000});expect(incomeCovered.stressMonthlyBurn).toBe(0);expect(incomeCovered.stressedRunwayMonths).toBeNull();
    expect(base.referenceRangeMonths).toEqual({low:3,high:6});
  });

  test('[AUTO] user interaction updates reserve target stress and currency presentation without changing math',async({page})=>{
    await gotoClean(page,PATH);
    await setInput(page,'#emergencySavings',375000);await setInput(page,'#targetMonths',8);await setInput(page,'#shockCost',75000);await setInput(page,'#disruptionIncome',30000);
    await expect(page.locator('#statusHeadline')).toContainText('5 months');
    await expect(page.locator('#targetGapNote')).toContainText('8-month target');
    await expect(page.locator('#stressRunwayText')).toContainText('modeled monthly shortfall');
    const before=await calculate(page,{...BASE,emergencySavings:375000,targetMonths:8,shockCost:75000,disruptionIncome:30000});
    await setLocale(page,'US','USD');await expect(page.locator('#reserveValue')).toContainText('$');
    const after=await calculate(page,{...BASE,emergencySavings:375000,targetMonths:8,shockCost:75000,disruptionIncome:30000});
    expect(after.monthlyNeed).toBe(before.monthlyNeed);expect(after.fullLossRunwayMonths).toBe(before.fullLossRunwayMonths);expect(after.targetGap).toBe(before.targetGap);
    await setLocale(page,'PK','PKR');await expect(page.locator('#reserveValue')).not.toHaveText('-');
  });

  test('[AUTO] financial inputs remain local and never enter URL storage or external requests',async({page})=>{
    const requests=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push({url:r.url(),body:r.postData()||''});});
    await gotoClean(page,PATH);await setInput(page,'#essentialExpenses',9876543);await setInput(page,'#emergencySavings',7654321);await page.locator('#calculateBtn').click();
    expect(page.url()).not.toMatch(/9876543|7654321/);
    const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));expect(storage).not.toContain('9876543');expect(storage).not.toContain('7654321');
    for(const request of requests){const payload=`${request.url}\n${request.body}`;expect(payload).not.toMatch(/9876543|7654321/);}
    const origin=new URL(page.url()).origin;const unexpectedExternal=requests.map(r=>r.url).filter(u=>!u.startsWith(origin)&&!/^https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum(?:[/?#]|$)/i.test(u));expect(unexpectedExternal).toEqual([]);
  });

  test('[AUTO] Copy Summary CSV and exact three-page PDF use the current result',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);await gotoClean(page,PATH);await setLocale(page,'US','USD');await setInput(page,'#emergencySavings',450000);await setInput(page,'#targetMonths',8);await page.locator('#calculateBtn').click();
    await page.locator('#copySummaryBtn').click();const clip=await page.evaluate(()=>navigator.clipboard.readText());expect(clip).toContain('Carrowmont Emergency Fund & Financial Runway result');expect(clip).toContain('reference point, not an individualized recommendation');expect(clip).toContain('Methodology version: emergency-fund-runway-v1.0');
    const csvWait=page.waitForEvent('download');await page.locator('#downloadCsvBtn').click();const csv=await csvWait;const csvText=fs.readFileSync(await csv.path(),'utf8');expect(csv.suggestedFilename()).toBe('carrowmont-emergency-fund-runway.csv');expect(csvText).toContain('Methodology version,emergency-fund-runway-v1.0');expect(csvText).toContain('Reference only,Not an individualized recommendation');
    const pdfWait=page.waitForEvent('download',{timeout:30000});await page.locator('#generateReportBtn').click();const pdf=await pdfWait;const info=await validatePdfDownload(pdf,3);expect(info.pages).toBe(3);expect(pdf.suggestedFilename()).toBe('carrowmont-emergency-fund-runway-report.pdf');await expect(page.locator('#actionMessage')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] Tools Search sitemap and Learn journeys expose the tool without changing the nine-core homepage',async({page,request})=>{
    await gotoClean(page,'/tools.html');await expect(page.locator('.directory-tool-card')).toHaveCount(23);const card=page.locator('[data-secondary-tool="emergency-fund-runway"]');await expect(card).toHaveCount(1);await expect(card.locator('a')).toHaveAttribute('href',PATH);
    await gotoClean(page,'/');await expect(page.locator('[data-homepage-core-grid] [data-tool-id]')).toHaveCount(9);await expect(page.locator('[data-tool-id="emergency-fund-runway"]')).toHaveCount(0);
    for(const path of LEARN){await gotoClean(page,path);await expect(page.locator(`a[href="${PATH}"]`).first()).toBeVisible();}
    const xml=await (await request.get('/sitemap.xml')).text();expect(xml).toContain(`<loc>https://carrowmont.com${PATH}</loc>`);
    const inventory=await (await request.get('/data/carrowmont-search-pages.json')).json();expect(inventory.entries).toHaveLength(136);expect(inventory.entries.some(entry=>entry.url===PATH)).toBe(true);
  });

  test('[AUTO] 1280 768 412 390 and 360 layouts are overflow-safe with primary action visible',async({page})=>{
    for(const width of [1280,768,412,390,360]){await page.setViewportSize({width,height:900});await gotoClean(page,PATH);await assertNoHorizontalOverflow(page,`${width}px FRE2A`);await expect(page.locator('#calculateBtn')).toBeVisible();await expect(page.locator('#generateReportBtn')).toBeVisible();if(width<=412){await expect(page.locator('.mobile-nav')).toBeHidden();}}
  });

  test('[VISUAL] capture FRE2A desktop and mobile reference states',async({page},testInfo)=>{
    await gotoClean(page,PATH);await saveReferenceScreenshot(page,testInfo.project.name,'fre2a-emergency-runway','full');if(testInfo.project.name==='chrome-desktop'){for(const width of [412,390,360]){await page.setViewportSize({width,height:900});await gotoClean(page,PATH);await saveReferenceScreenshot(page,testInfo.project.name,'fre2a-emergency-runway',String(width));}}
  });
});
