import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import { gotoClean, assertNoHorizontalOverflow, setInput } from '../helpers/common.js';

const HUB='/mortgage-payoff-calculator/decision-centre.html';
const TOOL='/mortgage-payoff-calculator/refinance-break-even.html';
const LEARN='/mortgage-refinance-break-even.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}

async function enterScenario(page,overrides={}){
  await setLocale(page,overrides.region||'US',overrides.currency||'USD');
  const vals={
    balance:300000,currentRate:6.5,remainingYears:20,remainingMonths:0,newRate:5.5,
    proposedYears:20,proposedMonths:0,switchingFees:5000,exitCharge:0,cashback:0,
    holdingYears:5,holdingMonths:0,...overrides
  };
  await setInput(page,'#balance',vals.balance);
  await setInput(page,'#currentRate',vals.currentRate);
  await setInput(page,'#remainingYears',vals.remainingYears);
  await setInput(page,'#remainingMonths',vals.remainingMonths);
  await page.locator('#paymentFrequency').selectOption(vals.paymentFrequency||'monthly');
  await setInput(page,'#newRate',vals.newRate);
  await setInput(page,'#proposedYears',vals.proposedYears);
  await setInput(page,'#proposedMonths',vals.proposedMonths);
  await setInput(page,'#switchingFees',vals.switchingFees);
  await setInput(page,'#exitCharge',vals.exitCharge);
  await setInput(page,'#cashback',vals.cashback);
  await page.locator('#feePaymentMode').selectOption(vals.feePaymentMode||'upfront');
  if(vals.useHoldingPeriod===false){
    if(await page.locator('#useHoldingPeriod').isChecked()) await page.locator('#useHoldingPeriod').uncheck();
  }else{
    if(!(await page.locator('#useHoldingPeriod').isChecked())) await page.locator('#useHoldingPeriod').check();
    await setInput(page,'#holdingYears',vals.holdingYears);
    await setInput(page,'#holdingMonths',vals.holdingMonths);
  }
  await expect(page.locator('#validationMessage')).toBeHidden();
}

function numericText(text){return Number(String(text||'').replace(/[^0-9.-]/g,''));}

async function gotoWithSeededProfile(page,profile){
  await page.route('https://cloudflareinsights.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/cdn-cgi/rum**',route=>route.fulfill({status:204,body:''}));
  await page.route('https://static.cloudflareinsights.com/**',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:'/* Cloudflare analytics disabled during Carrowmont QA. */'}));
  const first=await page.goto(TOOL,{waitUntil:'domcontentloaded'});
  expect(first,`No navigation response for ${TOOL}`).not.toBeNull();
  expect(first.status(),`${TOOL} returned HTTP ${first.status()}`).toBeLessThan(400);
  await page.evaluate(p=>{
    try{
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('carrowmontMortgageDecisionV1',JSON.stringify(p));
    }catch(_){}
  },profile);
  const response=await page.reload({waitUntil:'domcontentloaded'});
  expect(response,`No reload response for ${TOOL}`).not.toBeNull();
  expect(response.status(),`${TOOL} reload returned HTTP ${response.status()}`).toBeLessThan(400);
  await page.waitForLoadState('networkidle').catch(()=>{});
}

test.describe('MDC1B Refinance / Balance Transfer Break-Even',()=>{
  test('[AUTO] Decision Centre keeps the earlier mortgage decisions live after MDC1C completes the four-choice family',async({page})=>{
    await gotoClean(page,HUB);
    await expect(page.getByRole('heading',{name:'What are you trying to decide?'})).toBeVisible();
    await expect(page.locator('.decision-card')).toHaveCount(4);
    await expect(page.locator('.decision-card .decision-status',{hasText:'Live'})).toHaveCount(4);
    await expect(page.locator('.decision-card.planned')).toHaveCount(0);
    await expect(page.locator('.decision-card a[href="/mortgage-payoff-calculator/"]')).toBeVisible();
    await expect(page.locator('.decision-card a[href="prepayment-vs-investing.html"]')).toBeVisible();
    await expect(page.locator('.decision-card a[href="refinance-break-even.html"]')).toBeVisible();
    await expect(page.locator('.decision-card a[href="rate-rise-stress-test.html"]')).toBeVisible();
  });

  test('[AUTO] canonical search identity and three-payment rate-vs-term separation are present',async({page})=>{
    await gotoClean(page,TOOL);
    await expect(page).toHaveTitle('Mortgage Refinance Break-Even Calculator | Carrowmont');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',/fees, cashback and term changes/i);
    await enterScenario(page);
    await expect(page.locator('#breakEvenValue')).toHaveText('21 months');
    const current=numericText(await page.locator('#currentPaymentResult').textContent());
    const sameTerm=numericText(await page.locator('#rateOnlyPaymentResult').textContent());
    const proposed=numericText(await page.locator('#proposedPaymentResult').textContent());
    expect(current).toBeGreaterThan(sameTerm);
    expect(Math.abs(sameTerm-proposed)).toBeLessThan(0.02);
    await expect(page.locator('#tableRateOnlyPrincipal')).toContainText('300,000');
    await expect(page.locator('#chartSummary')).toContainText('Durable break-even is about 21 months.');
  });

  test('[AUTO] upfront fees, financed fees and cashback change break-even without changing the same-term isolation principal',async({page})=>{
    await gotoClean(page,TOOL);
    await enterScenario(page,{feePaymentMode:'upfront'});
    await expect(page.locator('#breakEvenValue')).toHaveText('21 months');
    const sameTermUpfront=await page.locator('#rateOnlyPaymentResult').textContent();
    await page.locator('#feePaymentMode').selectOption('financed');
    await expect(page.locator('#breakEvenValue')).toHaveText('23 months');
    await expect(page.locator('#tableProposedPrincipal')).toContainText('305,000');
    await expect(page.locator('#rateOnlyPaymentResult')).toHaveText(sameTermUpfront||'');
    await expect(page.locator('#feeModeNote')).toContainText('added to the proposed principal');
    await page.locator('#feePaymentMode').selectOption('upfront');
    await setInput(page,'#cashback',2000);
    await expect(page.locator('#breakEvenValue')).toHaveText('13 months');
  });

  test('[AUTO] longer term can create a temporary crossing, lower payment and higher lifetime cost without a false break-even',async({page})=>{
    await gotoClean(page,TOOL);
    await enterScenario(page,{proposedYears:30});
    await expect(page.locator('#breakEvenValue')).toHaveText('No durable break-even');
    await expect(page.locator('#breakEvenText')).toContainText('temporarily around month 22');
    await expect(page.locator('#termWarningTitle')).toHaveText('Lower payment, higher lifetime borrowing cost');
    await expect(page.locator('#lifetimeResult')).toContainText('additional cost');
    await expect(page.locator('#paymentChangeResult')).toContainText('lower');
  });

  test('[AUTO] shorter term can raise payment while lowering lifetime borrowing cost',async({page})=>{
    await gotoClean(page,TOOL);
    await enterScenario(page,{proposedYears:15});
    await expect(page.locator('#termWarningTitle')).toHaveText('The proposed loan finishes sooner');
    await expect(page.locator('#paymentChangeResult')).toContainText('higher');
    await expect(page.locator('#lifetimeResult')).toContainText('Modeled saving');
    await expect(page.locator('#breakEvenValue')).toHaveText('19 months');
  });

  test('[AUTO] holding-period result distinguishes an early exit from later durable break-even',async({page})=>{
    await gotoClean(page,TOOL);
    await enterScenario(page,{holdingYears:1});
    await expect(page.locator('#holdingResultLabel')).toContainText('At 1y 0m holding period');
    await expect(page.locator('#holdingResult')).toContainText('additional cost');
    await setInput(page,'#holdingYears',5);
    await expect(page.locator('#holdingResult')).toContainText('Modeled saving');
  });

  test('[AUTO] saved mortgage facts require explicit confirmation and current-payment override is ignored',async({page})=>{
    const profile={schemaVersion:1,savedAt:'2026-10-14T00:00:00.000Z',country:'US',currency:'USD',balance:654321,annualRatePct:7.75,remainingYears:17,remainingMonths:0,paymentFrequency:'monthly',useCurrentPayment:true,currentPayment:1};
    await gotoWithSeededProfile(page,profile);
    await expect(page.locator('#profileBanner')).toBeVisible();
    await expect(page.locator('#profileSummary')).toContainText('Saved current-payment overrides are not used');
    expect(Number(await page.locator('#balance').inputValue())).not.toBe(654321);
    await page.locator('#applyProfileBtn').click();
    await expect(page.locator('#balance')).toHaveValue('654321');
    await expect(page.locator('#currentRate')).toHaveValue('7.75');
    await expect(page.locator('#remainingYears')).toHaveValue('17');
    await expect(page.locator('#reportDownloadStatus')).toContainText('override was intentionally ignored');
    expect(numericText(await page.locator('#currentPaymentResult').textContent())).toBeGreaterThan(1);
  });

  test('[AUTO] representative terminology localizes without changing the canonical route',async({page})=>{
    await gotoClean(page,TOOL);
    const cases=[
      ['IN','INR','Home Loan Balance Transfer Break-Even','foreclosure'],
      ['US','USD','Mortgage Refinance Break-Even','prepayment'],
      ['GB','GBP','Remortgage / Product Switch Break-Even','Early Repayment Charge'],
      ['AU','AUD','Home Loan Refinance Break-Even','break / early repayment']
    ];
    for(const [region,currency,product,charge] of cases){
      await setLocale(page,region,currency);
      await expect(page.locator('#productLabel')).toHaveText(product);
      const chargeLabel=(await page.locator('#exitChargeLabel').textContent()||'').toLowerCase();
      expect(chargeLabel).toContain(charge.toLowerCase());
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html');
    }
  });

  test('[AUTO] Copy Summary and exact three-page PDF consume the current deterministic result',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await gotoClean(page,TOOL);
    await enterScenario(page);
    await page.locator('#copyBtn').click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    expect(copied).toContain('Mortgage Refinance Break-Even');
    expect(copied).toContain('New-rate same-term repayment');
    expect(copied).toContain('Durable break-even: 21 months');
    expect(copied).toContain('Holding-period modeled effect');

    const downloadPromise=page.waitForEvent('download',{timeout:90000});
    await page.locator('#reportBtn').click();
    const download=await downloadPromise;
    const filePath=await download.path();
    expect(filePath).toBeTruthy();
    const bytes=fs.readFileSync(filePath);
    expect(bytes.subarray(0,4).toString('ascii')).toBe('%PDF');
    const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true});
    expect(pdf.getPageCount()).toBe(3);
    expect(download.suggestedFilename()).toBe('carrowmont-refinance-break-even-decision-report.pdf');
    await expect(page.locator('#reportDownloadStatus')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] Tool and Learn guide are bidirectional and the shared bottom CTA returns to MDC1B',async({page})=>{
    await gotoClean(page,TOOL);
    await expect(page.locator('.methodology-card a[href="/mortgage-refinance-break-even.html"]')).toBeVisible();
    await gotoClean(page,LEARN);
    await expect(page.locator('.guide-section > div')).toHaveCount(1);
    await expect(page.locator('.guide-answer')).toHaveCount(1);
    await expect(page.locator('.guide-action-first a[href="/mortgage-payoff-calculator/refinance-break-even.html"]')).toBeVisible();
    await expect(page.locator('.learn-tool-return a[href="/mortgage-payoff-calculator/refinance-break-even.html"]')).toBeVisible();
    expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(5);
  });

  test('[AUTO] desktop and 390/360 layouts do not overflow for hub, MDC1B and Learn guide',async({page})=>{
    for(const width of [1280,390,360]){
      await page.setViewportSize({width,height:900});
      for(const target of [HUB,TOOL,LEARN]){
        await gotoClean(page,target);
        await assertNoHorizontalOverflow(page,`${width}px ${target}`);
      }
    }
  });
});
