import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, setInput, validatePdfDownload, saveReferenceScreenshot } from '../helpers/common.js';

const PATH='/home-affordability-calculator.html';
const LEARN=['/how-much-home-can-i-afford.html','/mortgage-affordability-vs-lender-approval.html','/how-deposit-and-interest-rates-affect-home-affordability.html'];

async function calculate(page,input){return page.evaluate(input=>window.CarrowmontHomeAffordabilityCore.calculate(input),input);}
async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>({region:window.CarrowmontLocale.getRegion(),currency:window.CarrowmontLocale.getCurrency()}))).toEqual({region,currency});
}
const BASE={mode:'budget',takeHomeIncome:10000,essentialSpending:3000,existingDebt:500,protectedSavings:1000,freeBuffer:1000,deposit:20000,annualRate:6,termYears:20,ownershipCosts:500,targetHomePrice:100000,higherRateEnabled:true,higherRate:8,grossAnnualIncome:120000};

function principalForPayment(payment,annualRate,months){const r=annualRate/100/12;return r===0?payment*months:payment*(1-Math.pow(1+r,-months))/r;}
function paymentForPrincipal(principal,annualRate,months){const r=annualRate/100/12;return r===0?principal/months:principal*r/(1-Math.pow(1+r,-months));}

test.describe('HOME1 Home Affordability / Mortgage Borrowing Power',()=>{
  test('[AUTO] canonical identity, search intent, disclaimer and controls are complete',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,PATH);
    await expect(page).toHaveTitle('Home Affordability Calculator | Carrowmont');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('See what home price may fit your budget without squeezing everything else.');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/home-affordability-calculator.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
    await expect(page.locator('[data-cm-search-identity]')).toContainText('mortgage affordability calculator');
    await expect(page.locator('.home1-approval-note')).toContainText('Lender approval: not estimated');
    await expect(page.locator('main')).toContainText('Affordability starts with cash flow');
    for(const id of ['takeHomeIncome','essentialSpending','existingDebt','protectedSavings','freeBuffer','deposit','annualRate','termYears','ownershipCosts','grossAnnualIncome','higherRate','copySummaryBtn','downloadCsvBtn','generateReportBtn']) await expect(page.locator(`#${id}`),id).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('[AUTO] cash-flow-first engine handles reverse affordability, target checks, 0% rate and sensitivity',async({page})=>{
    await gotoClean(page,PATH);
    const base=await calculate(page,BASE);expect(base.ok).toBe(true);
    const paymentBudget=10000-3000-500-1000-1000-500;
    expect(base.base.paymentBudget).toBeCloseTo(paymentBudget,8);
    const expectedLoan=principalForPayment(paymentBudget,6,240);
    expect(base.base.loanAmount).toBeCloseTo(expectedLoan,6);
    expect(base.base.homePrice).toBeCloseTo(expectedLoan+20000,6);
    expect(base.base.monthlyLeftover).toBeCloseTo(1000,6);
    expect(base.base.bufferDifference).toBeCloseTo(0,6);
    expect(base.lenderApproval).toBe('Not estimated by Carrowmont');

    const zero=await calculate(page,{...BASE,annualRate:0,higherRateEnabled:false,termYears:1});
    expect(zero.ok).toBe(true);expect(zero.base.loanAmount).toBeCloseTo(paymentBudget*12,8);expect(zero.base.payment).toBeCloseTo(paymentBudget,8);

    const target=await calculate(page,{...BASE,mode:'target',targetHomePrice:300000,higherRateEnabled:false});
    expect(target.ok).toBe(true);expect(target.base.loanAmount).toBe(280000);expect(target.base.payment).toBeCloseTo(paymentForPrincipal(280000,6,240),6);
    expect(target.base.bufferDifference).toBeCloseTo(target.base.monthlyLeftover-1000,8);

    const biggerDeposit=await calculate(page,{...BASE,deposit:50000,higherRateEnabled:false});
    expect(biggerDeposit.base.homePrice-base.base.homePrice).toBeCloseTo(30000,6);
    const moreSavings=await calculate(page,{...BASE,protectedSavings:1500,higherRateEnabled:false});
    expect(moreSavings.base.homePrice).toBeLessThan(base.base.homePrice);
    expect(base.higherRate.homePrice).toBeLessThan(base.base.homePrice);
    expect(base.base.annualRate).toBe(6);
    const grossOff=await calculate(page,{...BASE,grossAnnualIncome:0,higherRateEnabled:false});
    const grossOn=await calculate(page,{...BASE,grossAnnualIncome:250000,higherRateEnabled:false});
    expect(grossOn.base.loanAmount).toBeCloseTo(grossOff.base.loanAmount,8);expect(grossOn.base.incomeMultiple).not.toBeNull();
    const noCosts=await calculate(page,{...BASE,ownershipCosts:0,higherRateEnabled:false});
    expect(noCosts.warnings.join(' ')).toMatch(/not included other ownership costs/i);
    const noRoom=await calculate(page,{...BASE,essentialSpending:9000,higherRateEnabled:false});
    expect(noRoom.base.loanAmount).toBe(0);expect(noRoom.warnings.join(' ')).toMatch(/no monthly room/i);
  });

  test('[AUTO] interface switches modes and country terminology without changing static search title',async({page})=>{
    await gotoClean(page,PATH);await expect(page.locator('#headlineValue')).not.toHaveText('—');
    await page.locator('.home1-mode-toggle label').filter({hasText:'Check a home price'}).click();await expect(page.locator('input[name="home1Mode"][value="target"]')).toBeChecked();await expect(page.locator('.home1-target-field')).toBeVisible();await expect(page.locator('#home1ResultKicker')).toHaveText('TARGET HOME CHECK');
    const cases=[['IN','INR','Home Loan Affordability Calculator','Down payment available','Modeled EMI / repayment'],['US','USD','Home Affordability Calculator','Down payment available','Modeled mortgage payment'],['CA','CAD','Mortgage Affordability Calculator','Down payment available','Modeled mortgage payment'],['GB','GBP','Mortgage Affordability Calculator — How Much Can I Borrow?','Deposit available','Modeled mortgage repayment'],['AU','AUD','Home Loan Borrowing Power Calculator','Deposit available','Modeled home-loan repayment'],['NZ','NZD','Home Loan Borrowing Power Calculator','Deposit available','Modeled home-loan repayment']];
    for(const [region,currency,title,deposit,payment] of cases){await setLocale(page,region,currency);await expect(page.locator('[data-home1-product-label]')).toHaveText(title);await expect(page.locator('label[for="deposit"] [data-home1-deposit-label]')).toHaveText(deposit);await expect(page.locator('.home1-metric-grid [data-home1-payment-label]')).toHaveText(payment);await expect(page).toHaveTitle('Home Affordability Calculator | Carrowmont');}
  });

  test('[AUTO] financial inputs remain local and never enter URL or browser storage',async({page})=>{
    const requests=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());});
    await gotoClean(page,PATH);await setInput(page,'#takeHomeIncome',9876543);await setInput(page,'#deposit',7654321);await page.locator('#calculateBtn').click();
    expect(page.url()).not.toMatch(/9876543|7654321/);
    const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));expect(storage).not.toContain('9876543');expect(storage).not.toContain('7654321');
    const origin=new URL(page.url()).origin;expect(requests.filter(u=>!u.startsWith(origin))).toEqual([]);
  });

  test('[AUTO] Copy Summary, CSV and exact four-page PDF use the current result',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);await gotoClean(page,PATH);await setLocale(page,'US','USD');await setInput(page,'#takeHomeIncome',12000);await setInput(page,'#deposit',85000);await page.locator('#calculateBtn').click();
    await page.locator('#copySummaryBtn').click();const clip=await page.evaluate(()=>navigator.clipboard.readText());expect(clip).toContain('Carrowmont Home Affordability Calculator result');expect(clip).toContain('Household planning estimate, not lender approval.');
    const csvWait=page.waitForEvent('download');await page.locator('#downloadCsvBtn').click();const csv=await csvWait;const csvText=fs.readFileSync(await csv.path(),'utf8');expect(csv.suggestedFilename()).toBe('carrowmont-home-affordability.csv');expect(csvText).toContain('Methodology version,home-affordability-v1.0');expect(csvText).toContain('Higher-rate check');expect(csvText).toContain('Household planning estimate, not lender approval.');
    const pdfWait=page.waitForEvent('download',{timeout:30000});await page.locator('#generateReportBtn').click();const pdf=await pdfWait;const info=await validatePdfDownload(pdf,4);expect(info.pages).toBe(4);expect(pdf.suggestedFilename()).toBe('carrowmont-home-affordability-report.pdf');await expect(page.locator('#actionMessage')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] Tools Hub, Learn cluster, sitemap and contextual journeys expose HOME1 without changing the nine-core homepage',async({page,request})=>{
    await gotoClean(page,'/tools.html');await expect(page.locator('.directory-tool-card')).toHaveCount(19);const card=page.locator('[data-secondary-tool="home-affordability"]');await expect(card).toHaveCount(1);await expect(card.locator('a')).toHaveAttribute('href',PATH);
    await gotoClean(page,'/');await expect(page.locator('[data-homepage-core-grid] [data-tool-id]')).toHaveCount(9);await expect(page.locator('[data-tool-id="home-affordability"]')).toHaveCount(0);
    await gotoClean(page,'/learn.html');for(const path of LEARN)await expect(page.locator(`#home-loans a[href="${path}"]`)).toBeVisible();
    for(const path of LEARN){await gotoClean(page,path);await expect(page.locator('.guide-answer')).toHaveCount(1);await expect(page.locator(`.guide-action-first a[href="${PATH}"]`)).toBeVisible();await expect(page.locator(`.learn-tool-return a[href="${PATH}"]`)).toBeVisible();expect((await page.locator('article.guide-section').innerText()).split(/\s+/).length).toBeGreaterThan(1000);}
    await gotoClean(page,'/rent-vs-buy-home.html');await expect(page.locator(`a[href="${PATH}"]`).first()).toBeVisible();await gotoClean(page,'/mortgage-rate-rise-payment-stress.html');await expect(page.locator(`a[href="${PATH}"]`).first()).toBeVisible();
    const xml=await (await request.get('/sitemap.xml')).text();for(const path of [PATH,...LEARN])expect(xml).toContain(`<loc>https://carrowmont.com${path}</loc>`);
  });

  test('[AUTO] 1280px, 390px and 360px layouts are overflow-safe',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:900});await gotoClean(page,PATH);await assertNoHorizontalOverflow(page,`${width}px HOME1`);await expect(page.locator('#calculateBtn')).toBeVisible();if(width<500){for(const path of LEARN){await gotoClean(page,path);await assertNoHorizontalOverflow(page,`${width}px ${path}`);}}}
  });

  test('[VISUAL] capture HOME1 desktop and mobile reference states',async({page},testInfo)=>{
    await gotoClean(page,PATH);await saveReferenceScreenshot(page,testInfo.project.name,'home-affordability','full');if(testInfo.project.name==='chrome-desktop'){for(const width of [390,360]){await page.setViewportSize({width,height:900});await gotoClean(page,PATH);await saveReferenceScreenshot(page,testInfo.project.name,'home-affordability',String(width));}}
  });
});
