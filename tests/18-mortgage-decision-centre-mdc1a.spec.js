import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import { gotoClean, assertNoHorizontalOverflow, setInput } from '../helpers/common.js';

const HUB='/mortgage-payoff-calculator/decision-centre.html';
const TOOL='/mortgage-payoff-calculator/prepayment-vs-investing.html';
const PAYOFF='/mortgage-payoff-calculator/';
const LEARN='/mortgage-prepayment-vs-investing.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}


async function gotoCleanForCrossPageState(page,targetPath){
  await page.route('https://cloudflareinsights.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/cdn-cgi/rum**',route=>route.fulfill({status:204,body:''}));
  await page.route('https://static.cloudflareinsights.com/**',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:'/* Cloudflare analytics disabled during Carrowmont QA. */'}));
  const first=await page.goto(targetPath,{waitUntil:'domcontentloaded'});
  expect(first,`No navigation response for ${targetPath}`).not.toBeNull();
  expect(first.status(),`${targetPath} returned HTTP ${first.status()}`).toBeLessThan(400);
  await page.evaluate(()=>{try{localStorage.clear();sessionStorage.clear();}catch(_){}});
  const response=await page.reload({waitUntil:'domcontentloaded'});
  expect(response,`No reload response for ${targetPath}`).not.toBeNull();
  expect(response.status(),`${targetPath} reload returned HTTP ${response.status()}`).toBeLessThan(400);
  await page.waitForLoadState('networkidle').catch(()=>{});
}

async function enterStandardScenario(page){
  await setLocale(page,'US','USD');
  await setInput(page,'#balance',300000);
  await setInput(page,'#annualRate',6);
  await setInput(page,'#remainingYears',30);
  await setInput(page,'#remainingMonths',0);
  await page.locator('#paymentFrequency').selectOption('monthly');
  await setInput(page,'#extraAmount',25000);
  await setInput(page,'#lumpSumPeriod',1);
  await setInput(page,'#prepaymentCharge',0);
  await setInput(page,'#assumedReturn',7);
  await expect(page.locator('#breakEvenValue')).toContainText('%');
}

test.describe('MDC1A Mortgage Decision Centre - Prepayment vs Investing',()=>{
  test('[AUTO] Decision Centre exposes two live decisions and two non-link planned decisions',async({page})=>{
    await gotoClean(page,HUB);
    await expect(page.getByRole('heading',{name:'What are you trying to decide?'})).toBeVisible();
    await expect(page.locator('.decision-card')).toHaveCount(4);
    await expect(page.locator('.decision-card .decision-status',{hasText:'Live'})).toHaveCount(2);
    await expect(page.locator('.decision-card.planned')).toHaveCount(2);
    await expect(page.locator('.decision-card.planned a')).toHaveCount(0);
    await expect(page.locator(`a[href="/mortgage-payoff-calculator/"]`).first()).toBeVisible();
    await expect(page.locator('.decision-card:not(.planned) a[href="prepayment-vs-investing.html"]')).toBeVisible();
  });

  test('[AUTO] zero extra stays comparison-not-applicable while blank assumed return still calculates break-even',async({page})=>{
    await gotoClean(page,TOOL);
    await setLocale(page,'US','USD');
    await setInput(page,'#extraAmount',0);
    await expect(page.locator('#validationMessage')).toContainText('greater than zero');
    await expect(page.locator('#breakEvenValue')).toHaveText('—');
    await setInput(page,'#extraAmount',25000);
    await page.locator('#assumedReturn').fill('');
    await page.locator('#assumedReturn').dispatchEvent('input');
    await expect(page.locator('#breakEvenValue')).toContainText('%');
    await expect(page.locator('#assumedOutcome')).toHaveText('Enter a return');
  });

  test('[AUTO] standard lump-sum comparison renders deterministic mortgage and common-horizon outputs',async({page})=>{
    await gotoClean(page,TOOL);
    await enterStandardScenario(page);
    const be=Number((await page.locator('#breakEvenValue').textContent()).replace('%',''));
    expect(be).toBeGreaterThan(6.1);
    expect(be).toBeLessThan(6.3);
    await expect(page.locator('#interestAvoided')).not.toHaveText('—');
    await expect(page.locator('#timeSaved')).not.toHaveText('—');
    await expect(page.locator('#commonHorizon')).not.toHaveText('—');
    await expect(page.locator('#assumedOutcome')).toContainText('Invest path');
    await expect(page.locator('#endingValueNote')).toContainText('deterministic assumption, not a forecast');
  });

  test('[AUTO] representative country terminology is localized without changing canonical URL',async({page})=>{
    await gotoClean(page,TOOL);
    const cases=[
      ['IN','INR','Home Loan','foreclosure'],
      ['US','USD','Mortgage','Prepayment'],
      ['GB','GBP','Mortgage','overpayment'],
      ['AU','AUD','Home Loan','repayment']
    ];
    for(const [region,currency,productWord,fieldWord] of cases){
      await setLocale(page,region,currency);
      await expect(page.locator('#productLabel')).toContainText(productWord);
      const combined=((await page.locator('#prepaymentChargeLabel').textContent())+' '+(await page.locator('#extraAmountLabel').textContent())).toLowerCase();
      expect(combined).toContain(fieldWord.toLowerCase());
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html');
    }
  });

  test('[AUTO] payoff continuation stages mortgage facts but MDC1A applies them only after explicit confirmation',async({page})=>{
    await gotoCleanForCrossPageState(page,PAYOFF);
    await setInput(page,'#balance',6543210);
    await setInput(page,'#annualRate',7.75);
    await setInput(page,'#remainingYears',17);
    await page.locator('#compareInvestBtn').click();
    await page.waitForURL(/prepayment-vs-investing\.html$/);
    await expect(page.locator('#profileBanner')).toBeVisible();
    await expect(page.locator('#profileSummary')).toContainText('7.75%');
    expect(Number(await page.locator('#balance').inputValue())).not.toBe(6543210);
    await page.locator('#applyProfileBtn').click();
    await expect(page.locator('#balance')).toHaveValue('6543210');
    await expect(page.locator('#annualRate')).toHaveValue('7.75');
    await expect(page.locator('#remainingYears')).toHaveValue('17');
  });

  test('[AUTO] clearing mortgage profile does not clear country/currency preferences',async({page})=>{
    await gotoClean(page,TOOL);
    await setLocale(page,'GB','GBP');
    await enterStandardScenario(page);
    await setLocale(page,'GB','GBP');
    await page.locator('#saveProfileBtn').click();
    await page.locator('#clearProfileBtn').click();
    await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe('GB');
    await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getCurrency())).toBe('GBP');
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('carrowmontMortgageDecisionV1'))).toBeNull();
  });

  test('[AUTO] Copy Summary and the exact three-page PDF consume the current result object',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await gotoClean(page,TOOL);
    await enterStandardScenario(page);
    await page.locator('#copyBtn').click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    expect(copied).toContain('Mortgage Prepayment vs Investing');
    expect(copied).toContain('Break-even effective annual investment return');
    expect(copied).toContain('Common horizon');
    expect(copied).toContain('7.00%');

    const downloadPromise=page.waitForEvent('download',{timeout:90000});
    await page.locator('#reportBtn').click();
    const download=await downloadPromise;
    const filePath=await download.path();
    expect(filePath).toBeTruthy();
    const bytes=fs.readFileSync(filePath);
    expect(bytes.subarray(0,4).toString('ascii')).toBe('%PDF');
    const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true});
    expect(pdf.getPageCount()).toBe(3);
    expect(download.suggestedFilename()).toBe('carrowmont-prepayment-vs-investing-decision-report.pdf');
    await expect(page.locator('#reportDownloadStatus')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] Tool and primary Learn guide are bidirectional and the shared bottom CTA targets MDC1A',async({page})=>{
    await gotoClean(page,TOOL);
    await expect(page.locator('.methodology-card a[href="/mortgage-prepayment-vs-investing.html"]')).toBeVisible();
    await gotoClean(page,LEARN);
    await expect(page.locator('.guide-section > div')).toHaveCount(1);
    await expect(page.locator('.guide-answer')).toHaveCount(1);
    await expect(page.locator('.guide-action-first a[href="/mortgage-payoff-calculator/prepayment-vs-investing.html"]')).toBeVisible();
    await expect(page.locator('.learn-tool-return a[href="/mortgage-payoff-calculator/prepayment-vs-investing.html"]')).toBeVisible();
    expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(3);
  });

  test('[AUTO] desktop and 390/360 layouts do not overflow for hub, calculator and Learn guide',async({page})=>{
    const targets=[HUB,TOOL,LEARN];
    for(const width of [1280,390,360]){
      await page.setViewportSize({width,height:900});
      for(const target of targets){
        await gotoClean(page,target);
        await assertNoHorizontalOverflow(page,`${width}px ${target}`);
      }
    }
  });
});
