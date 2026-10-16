import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors, setInput } from '../helpers/common.js';

const TOOL='/mortgage-payoff-calculator/rent-vs-buy-calculator.html';
const LEARN='/rent-vs-buy-home.html';
const TOOLS='/tools.html';
const HOME='/';
const CENTRE='/mortgage-payoff-calculator/decision-centre.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}
async function result(page){ return page.evaluate(()=>window.CarrowmontRentVsBuyApp?.getLastResult()); }

const moneyText=x=>Number(String(x||'').replace(/[^0-9.-]/g,''));

test.describe('RENT1 Rent vs Buy Calculator',()=>{
  test('[AUTO] deterministic core fixtures pass 30 of 30',async({page})=>{
    await gotoClean(page,TOOL);
    const fixtures=await page.evaluate(()=>window.CarrowmontRentVsBuyCore.runFixtures());
    expect(fixtures).toHaveLength(30);
    expect(fixtures.filter(x=>!x.ok),JSON.stringify(fixtures,null,2)).toEqual([]);
  });

  test('[AUTO] canonical identity, structured data, privacy boundary and plain-language core inputs load cleanly',async({page})=>{
    const errors=monitorPageErrors(page); await gotoClean(page,TOOL);
    await expect(page).toHaveTitle('Rent vs Buy Calculator | Compare Renting and Buying | Carrowmont');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-payoff-calculator/rent-vs-buy-calculator.html');
    const ld=await page.locator('script[type="application/ld+json"]').textContent(); const parsed=JSON.parse(ld); const types=parsed['@graph'].map(x=>x['@type']); expect(types).toContain('WebApplication'); expect(types).toContain('BreadcrumbList');
    await expect(page.getByText('Price of the home')).toBeVisible(); await expect(page.getByText('Monthly rent for a similar home')).toBeVisible(); await expect(page.getByText('How long do you expect to stay?')).toBeVisible();
    await expect(page.getByText(/does not save or overwrite your Mortgage \/ Home Loan Decision Centre profile/i)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('[AUTO] country and currency catalogue loads; India, US, UK and Australia use appropriate wording without changing math',async({page})=>{
    await gotoClean(page,TOOL);
    const regionCount=await page.locator('#regionSelect option').count(); const currencyCount=await page.locator('#currencySelect option').count(); expect(regionCount).toBeGreaterThanOrEqual(30); expect(currencyCount).toBeGreaterThanOrEqual(30);
    const baseline=(await result(page)).comparison.wealthDifference;
    await setLocale(page,'IN','INR'); await expect(page.locator('#loanRateLabel')).toHaveText('Home loan interest rate'); await expect(page.locator('#startLoanPaymentLabel')).toHaveText('Starting EMI / home-loan payment'); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
    await setLocale(page,'US','USD'); await expect(page.locator('#loanRateLabel')).toHaveText('Mortgage interest rate'); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
    await setLocale(page,'CA','CAD'); await expect(page.locator('#loanRateLabel')).toHaveText('Mortgage interest rate'); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
    await setLocale(page,'GB','GBP'); await expect(page.locator('#buyingCostHelp')).toContainText(/purchase tax where applicable.*conveyancing/i); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
    await setLocale(page,'IE','EUR'); await expect(page.locator('#buyingCostHelp')).toContainText(/purchase tax where applicable.*conveyancing/i); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
    await setLocale(page,'AU','AUD'); await expect(page.locator('#loanRateLabel')).toHaveText('Home loan interest rate'); await expect(page.locator('#startLoanPaymentLabel')).toHaveText('Starting home-loan repayment'); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
    await setLocale(page,'NZ','NZD'); await expect(page.locator('#loanRateLabel')).toHaveText('Home loan interest rate'); await expect(page.locator('#startLoanPaymentLabel')).toHaveText('Starting home-loan repayment'); expect((await result(page)).comparison.wealthDifference).toBeCloseTo(baseline,6);
  });

  test('[AUTO] amount and percentage modes reconcile for down payment and upfront buying costs',async({page})=>{
    await gotoClean(page,TOOL);
    const before=await result(page);
    await page.locator('#downModePercent').click(); await expect(page.locator('#downPaymentPct')).toHaveValue('20.00');
    await page.locator('#buyCostModePercent').click(); await expect(page.locator('#upfrontBuyingCostsPct')).toHaveValue('5.00');
    const after=await result(page); expect(after.input.downPayment).toBeCloseTo(before.input.downPayment,6); expect(after.input.upfrontBuyingCosts).toBeCloseTo(before.input.upfrontBuyingCosts,6);
  });

  test('[AUTO] cash purchase works and a horizon beyond the loan term lets the buyer invest later savings',async({page})=>{
    await gotoClean(page,TOOL);
    await setInput(page,'#downPayment',8000000); await setInput(page,'#stayYears',10); let r=await result(page); expect(r.loan.principal).toBe(0); expect(r.loan.scheduledPayment).toBe(0);
    await page.locator('#resetBtn').click(); await setInput(page,'#loanTermYears',30); await setInput(page,'#stayYears',5); r=await result(page); expect(r.loan.remainingBalance).toBeGreaterThan(0);
    await page.locator('#resetBtn').click(); await setInput(page,'#loanTermYears',5); await setInput(page,'#stayYears',10); await setInput(page,'#monthlyRent',80000); r=await result(page); expect(r.loan.remainingBalance).toBe(0); expect(r.monthly.buyerMonthlyInvested).toBeGreaterThan(0);
  });

  test('[AUTO] renter deposit is returned, selling cost reduces buy wealth and negative home growth remains valid',async({page})=>{
    await gotoClean(page,TOOL); await setInput(page,'#rentalDeposit',123456); await setInput(page,'#homeGrowth',-3); const r=await result(page);
    expect(r.renting.depositReturned).toBe(123456); expect(r.buying.projectedHomeValue).toBeLessThan(r.input.homePrice); expect(r.buying.sellingCost).toBeGreaterThan(0); expect(Number.isFinite(r.buying.endWealth)).toBeTruthy();
  });

  test('[AUTO] equal-resource rules are visible and match the result object',async({page})=>{
    await gotoClean(page,TOOL); const r=await result(page);
    expect(r.upfront.startingHousingCash).toBeCloseTo(Math.max(r.upfront.buyerUpfront,r.upfront.renterUpfront),6);
    for(const p of r.comparison.series.slice(0,24)) expect(p.sharedMonthlyHousingBudget).toBeCloseTo(Math.max(p.buyerHousingOutflow,p.renterHousingOutflow),6);
    await expect(page.locator('#methodology')).toContainText('same available housing cash');
    await expect(page.locator('#methodology')).toContainText(/cheaper path invests the difference/i);
  });

  test('[AUTO] stable crossover logic refuses a fake single break-even when paths reverse',async({page})=>{
    await gotoClean(page,TOOL);
    const states=await page.evaluate(()=>({stable:window.CarrowmontRentVsBuyCore.classifyStableCrossover([{month:1,difference:-10},{month:2,difference:5},{month:3,difference:9}],.01),multi:window.CarrowmontRentVsBuyCore.classifyStableCrossover([{month:1,difference:-10},{month:2,difference:5},{month:3,difference:-2},{month:4,difference:7},{month:5,difference:-1}],.01)}));
    expect(states.stable.state).toBe('stable-crossover'); expect(states.stable.month).toBe(2); expect(states.multi.state).toBe('no-single-stable-break-even');
  });

  test('[AUTO] Copy Summary uses the same result object and exact report is three pages',async({page})=>{
    await gotoClean(page,TOOL); const summary=await page.evaluate(()=>window.CarrowmontRentVsBuyApp.summaryText()); expect(summary).toContain('Buying projected wealth:'); expect(summary).toContain('Renting + investing projected wealth:'); expect(summary).toContain('Buy cash needed upfront:'); expect(summary).toContain('Starting buy housing cost:'); expect(summary).toContain('Stable crossover:');
    await page.locator('#copyBtn').click(); await expect(page.locator('#actionStatus')).toHaveText(/^(Summary copied\.|Could not copy automatically\.)/);
    const d=page.waitForEvent('download',{timeout:90000}); await page.locator('#reportBtn').click(); const download=await d; expect(download.suggestedFilename()).toBe('carrowmont-rent-vs-buy-report.pdf'); const path=await download.path(); const bytes=fs.readFileSync(path); expect(bytes.subarray(0,4).toString('ascii')).toBe('%PDF'); const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true}); expect(pdf.getPageCount()).toBe(3); expect(bytes.length).toBeGreaterThan(100000);
  });

  test('[AUTO] Tool, Learn, Tools Hub and sitemap form the intended discovery path',async({page})=>{
    await gotoClean(page,TOOL); expect(await page.locator('a[href="/rent-vs-buy-home.html"]').count()).toBeGreaterThanOrEqual(1);
    await gotoClean(page,LEARN); await expect(page.locator('.guide-action-first a[href="/mortgage-payoff-calculator/rent-vs-buy-calculator.html"]')).toBeVisible(); await expect(page.locator('.guide-action-first a[href="/goal-planner/"]')).toContainText('Use Goal Planner separately');
    await gotoClean(page,TOOLS); await expect(page.locator('[data-secondary-tool="rent-vs-buy"] a')).toHaveAttribute('href','/mortgage-payoff-calculator/rent-vs-buy-calculator.html'); await expect(page.locator('.directory-tool-card')).toHaveCount(16);
    const xml=await page.evaluate(async()=>fetch('/sitemap.xml').then(r=>r.text())); expect(xml).toContain('https://carrowmont.com/mortgage-payoff-calculator/rent-vs-buy-calculator.html'); expect(xml).toContain('<lastmod>2026-10-15</lastmod>');
  });

  test('[AUTO] year-by-year table includes home value, loan balance and both wealth paths; related planning links are explicit',async({page})=>{
    await gotoClean(page,TOOL); const r=await result(page);
    await expect(page.locator('#checkpointRows tr')).toHaveCount(r.input.stayYears);
    await expect(page.locator('.rent1-table thead')).toContainText('Projected home value'); await expect(page.locator('.rent1-table thead')).toContainText('Remaining loan');
    await expect(page.locator('.rent1-links a[href="/goal-planner/"]')).toBeVisible(); await expect(page.locator('.rent1-links a[href="/budget-cash-flow-planner/"]')).toBeVisible();
    await expect(page.locator('.rent1-links a[href="/mortgage-payoff-calculator/"]')).toBeVisible(); await expect(page.locator('.rent1-links a[href="/mortgage-payoff-calculator/rate-rise-stress-test.html"]')).toBeVisible();
  });

  test('[AUTO] Learn article retains Article schema and no longer calls the comparison calculator future work',async({page})=>{
    await gotoClean(page,LEARN); const ld=JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent()); expect(ld['@graph'].map(x=>x['@type'])).toContain('Article'); const text=await page.locator('.guide-action-first').innerText(); expect(text).not.toContain('will use a dedicated Rent vs Buy Calculator'); expect(text).toContain('Open the Rent vs Buy Calculator');
  });

  test('[AUTO] eight-core homepage and four-module Mortgage / Home Loan Decision Centre remain unchanged',async({page})=>{
    await gotoClean(page,HOME); await expect(page.locator('[data-homepage-core-grid] [data-tool-id]')).toHaveCount(8); await expect(page.locator('[data-tool-id="rent-vs-buy"]')).toHaveCount(0);
    await gotoClean(page,CENTRE); await expect(page.locator('.decision-card')).toHaveCount(4); await expect(page.getByText('Rent vs Buy Calculator',{exact:true})).toHaveCount(0);
  });

  test('[AUTO] RENT1 does not silently write Mortgage Decision Profile or shared housing-plan state',async({page})=>{
    await gotoClean(page,TOOL); await setInput(page,'#homePrice',9876543); await setInput(page,'#monthlyRent',32123); const storage=await page.evaluate(()=>JSON.stringify(localStorage)); expect(storage).not.toContain('9876543'); expect(storage).not.toContain('32123'); expect(storage).not.toMatch(/mortgage_decision_profile/i); expect(storage).not.toMatch(/housingLoan.*9876543/i);
  });

  test('[AUTO] primary fields, results, CTAs and methodology stay in plain language',async({page})=>{
    await gotoClean(page,TOOL); const text=await page.locator('main').innerText();
    expect(text).toContain('Cash needed upfront to buy'); expect(text).toContain('Projected wealth if you rent + invest'); expect(text).toContain('Starting monthly housing cost — Buy'); expect(text).toContain('Starting monthly housing cost — Rent'); expect(text).toContain('Generate Rent vs Buy Report');
    expect(text).not.toMatch(/terminal wealth differential|residual principal|housing consumption stream|utility-adjusted return|capital allocation/i);
  });

  test('[AUTO] desktop and 390/360 mobile layouts have no horizontal page overflow',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:900}); await gotoClean(page,TOOL); await assertNoHorizontalOverflow(page,`${width}px Rent vs Buy tool`); await expect(page.locator('#headline')).toBeVisible(); await expect(page.locator('#wealthChart')).toBeVisible();}
  });
});
