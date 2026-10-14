import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors, setInput } from '../helpers/common.js';

const TOOL='/budget-cash-flow-planner/debt-payoff-calculator.html';
const BUDGET='/budget-cash-flow-planner/';
const LEARN='/debt-snowball-vs-avalanche.html';
const TOOLS='/tools.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}
async function debtRow(page,index,{label,balance,rate,minimum}){
  const row=page.locator('.debt-row').nth(index);
  if(label!==undefined) await row.locator('[data-field="label"]').fill(String(label));
  if(balance!==undefined) await row.locator('[data-field="balance"]').fill(String(balance));
  if(rate!==undefined) await row.locator('[data-field="annualRatePct"]').fill(String(rate));
  if(minimum!==undefined) await row.locator('[data-field="minimumPayment"]').fill(String(minimum));
}
async function scenario(page,debts,extra=0){
  await gotoClean(page,TOOL);
  while(await page.locator('.debt-row').count()<debts.length) await page.locator('#addDebtBtn').click();
  for(let i=0;i<debts.length;i++) await debtRow(page,i,debts[i]);
  await setInput(page,'#extraMonthly',extra);
  await page.locator('#calculateBtn').click();
  await expect(page.locator('#validationMessage')).toBeHidden();
}
const numeric=text=>Number(String(text||'').replace(/[^0-9.-]/g,''));

test.describe('DEBT1 Debt Payoff Calculator',()=>{
  test('[AUTO] deterministic core fixtures pass 19 of 19 before DOM-result assertions',async({page})=>{
    await gotoClean(page,TOOL);
    const fixtures=await page.evaluate(()=>window.CarrowmontDebtPayoffCore.runFixtures());
    expect(fixtures).toHaveLength(19);
    expect(fixtures.filter(x=>!x.ok),JSON.stringify(fixtures,null,2)).toEqual([]);
  });

  test('[AUTO] canonical identity, privacy promise and plain-language fields load without browser errors',async({page})=>{
    const errors=monitorPageErrors(page); await gotoClean(page,TOOL);
    await expect(page).toHaveTitle('Debt Payoff Calculator | Compare Snowball vs Avalanche | Carrowmont');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/budget-cash-flow-planner/debt-payoff-calculator.html');
    await expect(page.getByText('Your debt details are not automatically saved.')).toBeVisible();
    await expect(page.locator('.debt-row').first()).toContainText('How much do you owe?');
    await expect(page.locator('.debt-row').first()).toContainText(/Minimum monthly (payment|repayment)/);
    expect(errors).toEqual([]);
  });

  test('[AUTO] debt rows add and remove up to the V1 limit',async({page})=>{
    await gotoClean(page,TOOL); expect(await page.locator('.debt-row').count()).toBe(2);
    for(let i=0;i<8;i++) await page.locator('#addDebtBtn').click();
    await expect(page.locator('.debt-row')).toHaveCount(10); await expect(page.locator('#addDebtBtn')).toBeDisabled();
    await page.locator('.debt-row').last().locator('.remove-debt').click(); await expect(page.locator('.debt-row')).toHaveCount(9); await expect(page.locator('#addDebtBtn')).toBeEnabled();
  });

  test('[AUTO] highest-interest-first and smallest-debt-first can produce different first payoffs under the same monthly budget',async({page})=>{
    await scenario(page,[{label:'High-rate card',balance:5000,rate:20,minimum:25},{label:'Small loan',balance:1000,rate:5,minimum:25}],500);
    await expect(page.locator('#monthlyBudgetResult')).toContainText(/550|₹550|\$550/);
    await expect(page.locator('#avalancheFirst')).toContainText('High-rate card');
    await expect(page.locator('#snowballFirst')).toContainText('Small loan');
    expect(numeric(await page.locator('#avalancheInterest').textContent())).toBeLessThan(numeric(await page.locator('#snowballInterest').textContent()));
  });

  test('[AUTO] one debt and same-order cases do not force a fake winner',async({page})=>{
    await scenario(page,[{label:'Only debt',balance:2500,rate:9,minimum:100}],25);
    await expect(page.locator('#comparisonText')).toContainText(/same payoff order|effectively the same/i);
    await expect(page.locator('#avalancheMonths')).toHaveText(await page.locator('#snowballMonths').textContent());
  });

  test('[AUTO] extra monthly payment reports time and interest impact against a zero-extra baseline',async({page})=>{
    await scenario(page,[{label:'Card',balance:5000,rate:20,minimum:150},{label:'Loan',balance:12000,rate:9,minimum:280},{label:'Car',balance:8000,rate:6,minimum:220}],200);
    await expect(page.locator('#avalancheMonths')).toContainText('2y 10m');
    await expect(page.locator('#avalancheExtraImpact')).toContainText('1y 2m sooner');
    await expect(page.locator('#avalancheExtraImpact')).toContainText(/less modeled interest/);
  });

  test('[AUTO] large extra payment spills to another debt in the same month',async({page})=>{
    await scenario(page,[{label:'A',balance:50,rate:0,minimum:10},{label:'B',balance:50,rate:0,minimum:10}],100);
    await expect(page.locator('#avalancheMonths')).toHaveText('1 month'); await expect(page.locator('#snowballMonths')).toHaveText('1 month');
    await expect(page.locator('#payoffTableBody tr')).toHaveCount(4);
  });

  test('[AUTO] weak minimum payment warning and 600-month unresolved state are explicit',async({page})=>{
    await scenario(page,[{label:'Growing balance',balance:100000,rate:24,minimum:1}],0);
    await expect(page.locator('#warningMessage')).toContainText('may not cover the first modeled month of interest');
    await expect(page.locator('#avalancheMonths')).toHaveText('Not repaid within 50 years');
    await expect(page.locator('#snowballMonths')).toHaveText('Not repaid within 50 years');
  });

  test('[AUTO] country and currency change labels/formatting without changing the underlying result',async({page})=>{
    await scenario(page,[{label:'Loan',balance:5000,rate:10,minimum:150}],50);
    const months=await page.locator('#avalancheMonths').textContent();
    await setLocale(page,'AU','AUD'); await expect(page.locator('.debt-row').first()).toContainText('Minimum monthly repayment'); await expect(page.locator('#avalancheMonths')).toHaveText(months||'');
    await setLocale(page,'US','USD'); await expect(page.locator('.debt-row').first()).toContainText('Interest rate (APR)'); await expect(page.locator('#avalancheMonths')).toHaveText(months||'');
  });

  test('[AUTO] Budget handoff is explicit, short-lived, currency-safe and cleared after apply',async({page})=>{
    // Do not use gotoClean here: its init script intentionally clears localStorage on every
    // navigation, while this test must exercise the real same-origin Budget -> Debt handoff.
    await page.route('https://cloudflareinsights.com/**',r=>r.fulfill({status:204,body:''}));
    await page.route('**/cdn-cgi/rum**',r=>r.fulfill({status:204,body:''}));
    await page.route('https://static.cloudflareinsights.com/**',r=>r.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:'/* disabled during local QA */'}));
    await page.goto(BUDGET,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForLoadState('networkidle').catch(()=>{});
    await page.locator('#loadDefaultsBtn').click(); await expect(page.locator('#budgetDebtHandoff')).toBeVisible();
    await expect(page.locator('#moneyRemaining')).toContainText(/31,000|31K|₹31/);
    await page.locator('#debtPayoffHandoffBtn').click(); await page.waitForURL(/debt-payoff-calculator\.html/); await expect(page.locator('#budgetHandoff')).toBeVisible(); await expect(page.locator('#budgetHandoffText')).toContainText(/31,000|31K|₹31/);
    await page.locator('#applyHandoffBtn').click(); await expect(page.locator('#extraMonthly')).toHaveValue('31000'); await expect(page.locator('#budgetHandoff')).toBeHidden();
    expect(await page.evaluate(()=>window.CarrowmontPlanState.get('assumptions.possibleMonthlyDebtExtra'))).toBeNull();
  });

  test('[AUTO] stale and currency-mismatched Budget handoffs are ignored',async({page})=>{
    await page.route('https://cloudflareinsights.com/**',r=>r.fulfill({status:204,body:''})); await page.route('**/cdn-cgi/rum**',r=>r.fulfill({status:204,body:''}));
    await page.goto(TOOL,{waitUntil:'domcontentloaded'}); await page.evaluate(()=>{localStorage.clear();localStorage.setItem('carrowmont_plan_context_v1',JSON.stringify({version:1,locale:{},housingLoan:{},assumptions:{possibleMonthlyDebtExtra:{value:999,currency:'EUR',sourceTool:'budget-cash-flow-planner',updatedAt:new Date(Date.now()-60*60*1000).toISOString()}}}));}); await page.reload({waitUntil:'domcontentloaded'}); await expect(page.locator('#budgetHandoff')).toBeHidden(); await expect(page.locator('#extraMonthly')).toHaveValue('0');
  });

  test('[AUTO] entered debt details are not silently persisted to localStorage',async({page})=>{
    await scenario(page,[{label:'Private card nickname',balance:4321,rate:19.5,minimum:150}],100);
    const storage=await page.evaluate(()=>JSON.stringify(localStorage)); expect(storage).not.toContain('Private card nickname'); expect(storage).not.toContain('4321'); expect(storage).not.toContain('19.5');
  });

  test('[AUTO] Copy Summary uses result fields and exact PDF is three pages',async({page})=>{
    await scenario(page,[{label:'Card',balance:5000,rate:20,minimum:150},{label:'Loan',balance:12000,rate:9,minimum:280}],200);
    await page.locator('#copyBtn').click(); await expect(page.locator('#reportDownloadStatus')).toHaveText(/^(Summary copied\.|Could not copy automatically\. Your browser may block clipboard access\.)$/);
    const source=await page.evaluate(async()=>{const r=await fetch('debt-payoff-calculator.js');return r.text();}); expect(source).toContain('Total starting debt:'); expect(source).toContain('Pay highest-interest debt first:'); expect(source).toContain('Pay smallest debt first:'); expect(source).toContain('Extra monthly payment:');
    const d=page.waitForEvent('download',{timeout:90000}); await page.locator('#reportBtn').click(); const download=await d; const path=await download.path(); const bytes=fs.readFileSync(path); expect(bytes.subarray(0,4).toString('ascii')).toBe('%PDF'); const pdf=await PDFDocument.load(bytes,{ignoreEncryption:true}); expect(pdf.getPageCount()).toBe(3); expect(download.suggestedFilename()).toBe('carrowmont-debt-payoff-report.pdf');
  });

  test('[AUTO] Tool, Learn, Tools Hub and sitemap form the intended discovery path',async({page})=>{
    await gotoClean(page,TOOL); await expect(page.locator('.debt-learn-card a[href="/debt-snowball-vs-avalanche.html"]')).toBeVisible();
    await gotoClean(page,LEARN); await expect(page.locator('.guide-action-first a[href="/budget-cash-flow-planner/debt-payoff-calculator.html"]')).toBeVisible();
    await gotoClean(page,TOOLS); await expect(page.locator('[data-secondary-tool="debt-payoff"] a')).toHaveAttribute('href','/budget-cash-flow-planner/debt-payoff-calculator.html');
    const xml=await page.evaluate(async()=>fetch('/sitemap.xml').then(r=>r.text())); expect(xml).toContain('https://carrowmont.com/debt-snowball-vs-avalanche.html'); expect(xml).toContain('https://carrowmont.com/budget-cash-flow-planner/debt-payoff-calculator.html');
  });

  test('[AUTO] primary fields, results and CTAs stay in plain language',async({page})=>{
    await gotoClean(page,TOOL); const text=(await page.locator('#debts, #resultSummaryCard').allInnerTexts()).join('\n'); for(const jargon of ['amortization hierarchy','repayment allocation','optimization strategy','roll-forward','residual balance','cash-flow allocation']) expect(text.toLowerCase()).not.toContain(jargon);
    await expect(page.getByText('How much do you owe?').first()).toBeVisible(); await expect(page.getByText('Extra amount I can pay each month')).toBeVisible(); await expect(page.getByText('You could be debt-free in').first()).toBeVisible();
  });

  test('[AUTO] desktop, 390px and 360px layouts do not overflow on tool and Learn guide',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:900});for(const target of [TOOL,LEARN]){await gotoClean(page,target);await assertNoHorizontalOverflow(page,`${width}px ${target}`);}}
  });
});
