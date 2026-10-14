import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import { gotoClean, assertNoHorizontalOverflow, setInput } from '../helpers/common.js';

const HUB='/mortgage-payoff-calculator/decision-centre.html';
const TOOL='/mortgage-payoff-calculator/rate-rise-stress-test.html';
const LEARN='/mortgage-rate-rise-payment-stress.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}
function numericText(text){return Number(String(text||'').replace(/−/g,'-').replace(/[^0-9.-]/g,''));}
async function enterScenario(page,overrides={}){
  await setLocale(page,overrides.region||'US',overrides.currency||'USD');
  const v={balance:400000,currentRate:6,remainingYears:20,remainingMonths:0,paymentFrequency:'monthly',monthsUntilRateChange:0,stressedRate:7,...overrides};
  await setInput(page,'#balance',v.balance); await setInput(page,'#currentRate',v.currentRate); await setInput(page,'#remainingYears',v.remainingYears); await setInput(page,'#remainingMonths',v.remainingMonths);
  await page.locator('#paymentFrequency').selectOption(v.paymentFrequency);
  if(v.useCurrentPayment){if(!(await page.locator('#useCurrentPayment').isChecked()))await page.locator('#useCurrentPayment').check();await setInput(page,'#currentPayment',v.currentPayment);}else if(await page.locator('#useCurrentPayment').isChecked())await page.locator('#useCurrentPayment').uncheck();
  await setInput(page,'#monthsUntilRateChange',v.monthsUntilRateChange); await setInput(page,'#stressedRate',v.stressedRate);
  if(v.budget){if(!(await page.locator('#budgetEnabled').isChecked()))await page.locator('#budgetEnabled').check();await setInput(page,'#monthlyIncome',v.monthlyIncome);await setInput(page,'#monthlyExpenses',v.monthlyExpenses);}else if(await page.locator('#budgetEnabled').isChecked())await page.locator('#budgetEnabled').uncheck();
  await expect(page.locator('#validationMessage')).toBeHidden();
}
async function gotoWithSeededProfile(page,profile){
  await page.route('https://cloudflareinsights.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/cdn-cgi/rum**',route=>route.fulfill({status:204,body:''}));
  await page.route('https://static.cloudflareinsights.com/**',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:'/* disabled during QA */'}));
  const first=await page.goto(TOOL,{waitUntil:'domcontentloaded'}); expect(first).not.toBeNull(); expect(first.status()).toBeLessThan(400);
  await page.evaluate(p=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('carrowmontMortgageDecisionV1',JSON.stringify(p));},profile);
  const second=await page.reload({waitUntil:'domcontentloaded'}); expect(second).not.toBeNull(); expect(second.status()).toBeLessThan(400); await page.waitForLoadState('networkidle').catch(()=>{});
}

test.describe('MDC1C Mortgage Rate Rise & Payment Stress Test',()=>{
  test('[AUTO] Decision Centre publishes exactly four Live mortgage decisions and no Planned card',async({page})=>{
    await gotoClean(page,HUB); await expect(page.locator('.decision-card')).toHaveCount(4); await expect(page.locator('.decision-card .decision-status',{hasText:'Live'})).toHaveCount(4); await expect(page.locator('.decision-card.planned')).toHaveCount(0);
    await expect(page.locator('.decision-card a[href="rate-rise-stress-test.html"]')).toBeVisible(); await expect(page.locator('.decision-card a[href="/mortgage-rate-rise-payment-stress.html"]')).toBeVisible();
  });

  test('[AUTO] canonical search identity and immediate +1 percentage-point fixture render correctly',async({page})=>{
    await gotoClean(page,TOOL); await expect(page).toHaveTitle('Mortgage Rate Rise Calculator & Payment Stress Test | Carrowmont'); await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-payoff-calculator/rate-rise-stress-test.html');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',/payment could rise if interest rates increase/i); await enterScenario(page);
    expect(numericText(await page.locator('#paymentTodayResult').textContent())).toBeCloseTo(2865.72,2); expect(numericText(await page.locator('#stressedPaymentResult').textContent())).toBeCloseTo(3101.20,2); expect(numericText(await page.locator('#rateOnlyChangeResult').textContent())).toBeCloseTo(235.47,2); await expect(page.locator('#rateDeltaHelp')).toContainText('+1.00 percentage point');
  });

  test('[AUTO] future reset projects the balance first and holds the remaining term constant',async({page})=>{
    await gotoClean(page,TOOL); await enterScenario(page,{monthsUntilRateChange:24}); expect(numericText(await page.locator('#resetBalanceResult').textContent())).toBeCloseTo(377983,0); expect(numericText(await page.locator('#stressedPaymentResult').textContent())).toBeCloseTo(3082.46,2); expect(numericText(await page.locator('#rateOnlyChangeResult').textContent())).toBeCloseTo(216.73,2); await expect(page.locator('#resetTimingResult')).toContainText('24');
  });

  test('[AUTO] standard ladder shows five percentage-point stresses and the custom scenario remains separate',async({page})=>{
    await gotoClean(page,TOOL); await enterScenario(page); await expect(page.locator('#scenarioTableBody tr')).toHaveCount(7); for(const label of ['+0.25 pp','+0.50 pp','+1.00 pp','+2.00 pp','+3.00 pp']) await expect(page.locator('#scenarioTableBody')).toContainText(label); await expect(page.locator('#scenarioTableBody')).toContainText('Custom');
  });

  test('[AUTO] current-payment override keeps pure rate effect separate from change versus today',async({page})=>{
    await gotoClean(page,TOOL); await enterScenario(page,{balance:400000,currentRate:6,remainingYears:20,monthsUntilRateChange:24,stressedRate:7,useCurrentPayment:true,currentPayment:3000}); expect(numericText(await page.locator('#paymentTodayResult').textContent())).toBeCloseTo(3000,2); expect(numericText(await page.locator('#sameRatePaymentResult').textContent())).toBeCloseTo(2839.83,2); expect(numericText(await page.locator('#stressedPaymentResult').textContent())).toBeCloseTo(3054.61,2); expect(numericText(await page.locator('#rateOnlyChangeResult').textContent())).toBeCloseTo(214.78,2); expect(numericText(await page.locator('#todayChangeResult').textContent())).toBeCloseTo(54.61,2);
  });

  test('[AUTO] household budget is optional and zero-buffer rate is labeled as a modeled crossover, not a safe rate',async({page})=>{
    await gotoClean(page,TOOL); await enterScenario(page); await expect(page.locator('#budgetResultCard')).toBeHidden(); await enterScenario(page,{budget:true,monthlyIncome:6500,monthlyExpenses:3500}); await expect(page.locator('#budgetResultCard')).toBeVisible(); await expect(page.locator('#budgetStateTitle')).toContainText('Modeled monthly shortfall'); expect(numericText(await page.locator('#bufferStressResult').textContent())).toBeCloseTo(-101,0); expect(numericText(await page.locator('#zeroBufferRateResult').textContent())).toBeCloseTo(6.58,2); await expect(page.locator('#zeroBufferNote')).toContainText('not a recommended maximum');
  });

  test('[AUTO] every-two-weeks payments are normalized to monthly equivalents before budget comparison',async({page})=>{
    await gotoClean(page,TOOL); await enterScenario(page,{paymentFrequency:'biweekly'}); expect(numericText(await page.locator('#stressedPaymentResult').textContent())).toBeCloseTo(1430.29,2); expect(numericText(await page.locator('#monthlyEquivalentResult').textContent())).toBeCloseTo(3098.97,2);
  });

  test('[AUTO] representative terminology localizes without changing the canonical route',async({page})=>{
    await gotoClean(page,TOOL); const cases=[['IN','INR','Home Loan EMI Rate Rise Stress Test','Every 2 Weeks'],['US','USD','Mortgage Rate Rise & Payment Stress Test','Biweekly'],['CA','CAD','Mortgage Renewal Payment Stress Test','Biweekly'],['GB','GBP','Mortgage Rate Rise / Remortgage Payment Stress Test','Fortnightly'],['AU','AUD','Home Loan Rate Rise Stress Test','Fortnightly']];
    for(const [region,currency,product,cadence] of cases){await setLocale(page,region,currency);await expect(page.locator('#productLabel')).toHaveText(product);await expect(page.locator('#biweeklyOption')).toHaveText(cadence);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-payoff-calculator/rate-rise-stress-test.html');}
  });

  test('[AUTO] saved mortgage facts require explicit confirmation and household assumptions are never imported',async({page})=>{
    const profile={schemaVersion:1,savedAt:'2026-10-14T00:00:00.000Z',country:'US',currency:'USD',balance:654321,annualRatePct:7.75,remainingYears:17,remainingMonths:0,paymentFrequency:'monthly',useCurrentPayment:true,currentPayment:5100,monthlyIncome:999999,monthlyExpenses:1,stressedRate:40}; await gotoWithSeededProfile(page,profile); await expect(page.locator('#profileBanner')).toBeVisible(); expect(Number(await page.locator('#balance').inputValue())).not.toBe(654321); await page.locator('#applyProfileBtn').click(); await expect(page.locator('#balance')).toHaveValue('654321'); await expect(page.locator('#currentRate')).toHaveValue('7.75'); await expect(page.locator('#currentPayment')).toHaveValue('5100'); await expect(page.locator('#budgetEnabled')).not.toBeChecked(); await expect(page.locator('#monthlyIncome')).toHaveValue(''); await expect(page.locator('#monthlyExpenses')).toHaveValue(''); expect(Number(await page.locator('#stressedRate').inputValue())).toBeCloseTo(8.75,2);
  });

  test('[AUTO] Copy Summary and exact three-page PDF use the current deterministic result',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']); await gotoClean(page,TOOL); await enterScenario(page,{budget:true,monthlyIncome:6500,monthlyExpenses:3500}); await page.locator('#copyBtn').click(); const copied=await page.evaluate(()=>navigator.clipboard.readText()); expect(copied).toContain('Mortgage Rate Rise'); expect(copied).toContain('Rate-only payment change'); expect(copied).toContain('Change from what you pay today'); expect(copied).toContain('Modeled zero-buffer rate');
    const downloadPromise=page.waitForEvent('download',{timeout:90000}); await page.locator('#reportBtn').click(); const download=await downloadPromise; const path=await download.path(); expect(path).toBeTruthy(); const bytes=fs.readFileSync(path); expect(bytes.subarray(0,4).toString('ascii')).toBe('%PDF'); const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true}); expect(pdf.getPageCount()).toBe(3); expect(download.suggestedFilename()).toBe('carrowmont-mortgage-rate-rise-stress-report.pdf');
  });

  test('[AUTO] Tool and Learn guide are bidirectional with authoritative sources and shared bottom CTA',async({page})=>{
    await gotoClean(page,TOOL); await expect(page.locator('.methodology-card a[href="/mortgage-rate-rise-payment-stress.html"]')).toBeVisible(); await gotoClean(page,LEARN); await expect(page.locator('.guide-action-first a[href="/mortgage-payoff-calculator/rate-rise-stress-test.html"]')).toBeVisible(); await expect(page.locator('.learn-tool-return a[href="/mortgage-payoff-calculator/rate-rise-stress-test.html"]')).toBeVisible(); expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(5);
  });

  test('[AUTO] desktop and 390/360 layouts do not overflow for hub, MDC1C and Learn guide',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:900});for(const target of [HUB,TOOL,LEARN]){await gotoClean(page,target);await assertNoHorizontalOverflow(page,`${width}px ${target}`);}}
  });
});
