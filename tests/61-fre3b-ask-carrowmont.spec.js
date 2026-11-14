import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';
import { search1ExpectedPublicPages } from '../qa.config.js';

const PATH='/ask-carrowmont.html';

async function setValue(page,name,value){
  const input=page.locator(`#askQuestionFields input[name="${name}"]`);
  await expect(input).toBeVisible();
  await input.fill(String(value));
}

test.describe('FRE3B Ask Carrowmont public MVP',()=>{
  test('[AUTO] emergency-fund journey resolves through the deterministic engine and explains the trace',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,PATH);
    await expect(page.getByRole('heading',{name:'What are you trying to figure out?'})).toBeVisible();
    await page.locator('[data-ask-intent="emergency-runway"]').click();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(2);
    await setValue(page,'essentialExpenses',3000);
    await setValue(page,'emergencySavings',18000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askRecommendationHeadline')).toContainText('meets the target');
    await expect(page.locator('#askConfidence')).toContainText('Confidence: high');
    await expect(page.locator('#askWhatCouldChange li')).toHaveCount(3);
    await expect(page.locator('#askDiagnosis')).toContainText('reserve');
    await expect(page.locator('#askEngineTrace')).toContainText('Emergency fund runway');
    await expect(page.locator('#askMetrics .ask-metric')).not.toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('[AUTO] unsupported ordinary-language questions route to useful Carrowmont content without exposing the backlog',async({page})=>{
    await gotoClean(page,PATH);
    const query='How to start investing?';
    await page.locator('#askQuestion').fill(query);
    await page.locator('#askStartBtn').click();
    const fallback=page.locator('#askUnsupported');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('Best Carrowmont matches');
    await expect(fallback).toContainText('Start here');
    await expect(fallback.locator('.ask-route-result').first()).toContainText('Investing for Beginners');
    await expect(fallback).not.toContainText(/not available yet|has not been built yet|still growing/i);
    await expect(fallback.getByRole('link',{name:'See all search results'})).toHaveAttribute('href','/search.html');
    await expect(fallback.getByRole('link',{name:'Browse Tools'})).toHaveAttribute('href','/tools.html');
    await expect(fallback.getByRole('link',{name:'Explore Learn'})).toHaveAttribute('href','/learn.html');
    await Promise.all([page.waitForURL(/\/search\.html$/),fallback.getByRole('link',{name:'See all search results'}).click()]);
    await expect(page.locator('[data-cm-search-input]')).toHaveValue(query);
    await expect(page.locator('[data-cm-search-results-heading]')).toContainText('Results for');
    expect(new URL(page.url()).search).toBe('');
    expect(await page.evaluate(()=>sessionStorage.getItem('carrowmont_search_handoff_v1'))).toBeNull();
  });

  test('[AUTO] blank Ask input shows validation instead of failing silently',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('#askStartBtn').click();
    await expect(page.locator('#askStartMessage')).toContainText('Tell Carrowmont what you are trying to solve');
    await expect(page.locator('#askUnsupported')).toBeHidden();
  });

  test('[AUTO] ordinary-language cash-shortfall journey asks no more than three facts and financial inputs are not persisted',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('#askQuestion').fill('I keep running out of money before payday');
    await page.locator('#askStartBtn').click();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(3);
    await setValue(page,'monthlyIncome',4000);
    await setValue(page,'essentialExpenses',3000);
    await setValue(page,'flexibleExpenses',1500);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askRecommendationHeadline')).toContainText('deficit');
    await expect(page.locator('#askDiagnosis')).toContainText('higher than');
    const stored=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
    const serialized=JSON.stringify(stored);
    expect(serialized).not.toContain('1500');
    expect(serialized).not.toContain('4000');
    expect(serialized).not.toContain('3000');
  });

  test('[AUTO] car journey uses progressive groups of at most three questions',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="car-affordability"]').click();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(3);
    await setValue(page,'vehiclePrice',25000);
    await setValue(page,'takeHomeMonthlyIncome',5500);
    await setValue(page,'essentialMonthlyExpenses',2500);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(3);
    await setValue(page,'annualRate',7);
    await setValue(page,'termMonths',60);
    await setValue(page,'monthlyRunningCosts',350);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(1);
    await setValue(page,'emergencySavings',12000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askRecommendationHeadline')).not.toBeEmpty();
    await expect(page.locator('#askWhatCouldChange li')).toHaveCount(3);
    await expect(page.locator('#askEngineTrace')).toContainText('Car affordability');
  });

  test('[AUTO] Ask car-affordability handoff carries the exact entered scenario into the full tool and is consumed once',async({page})=>{
    await gotoClean(page,PATH);
    await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
    await page.evaluate(()=>window.CarrowmontLocale.setLocale('NZ','NZD'));
    await page.locator('[data-ask-intent="car-affordability"]').click();
    await setValue(page,'vehiclePrice',25000); await setValue(page,'takeHomeMonthlyIncome',5500); await setValue(page,'essentialMonthlyExpenses',2500);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await setValue(page,'annualRate',7); await setValue(page,'termMonths',60); await setValue(page,'monthlyRunningCosts',350);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await setValue(page,'emergencySavings',12000); await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    const link=page.locator('#askDetailLinkWrap a[data-ask-car-affordability-handoff="1"]'); await expect(link).toBeVisible();
    await Promise.all([page.waitForURL(/car-affordability-auto-decision-calculator\.html/),link.click()]);
    await expect(page.locator('#vehiclePrice')).toHaveValue('25000'); await expect(page.locator('#takeHomeMonthlyIncome')).toHaveValue('5500'); await expect(page.locator('#essentialMonthlyExpenses')).toHaveValue('2500'); await expect(page.locator('#annualRate')).toHaveValue('7'); await expect(page.locator('#termMonths')).toHaveValue('60'); await expect(page.locator('#monthlyRunningCosts')).toHaveValue('350'); await expect(page.locator('#emergencySavings')).toHaveValue('12000');
    await expect(page.locator('#actionMessage')).toContainText('Values carried over from Ask Carrowmont');
    expect(await page.evaluate(()=>sessionStorage.getItem('carrowmont_handoff_car_affordability_v1'))).toBeNull();
    expect(await page.evaluate(()=>({region:window.CarrowmontLocale.getRegion(),currency:window.CarrowmontLocale.getCurrency()}))).toEqual({region:'NZ',currency:'NZD'});
  });


  test('[AUTO] Batch 5 Money Priorities returns three explainable moves in deterministic stage order',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="money-priorities"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 1 of 5');
    await setValue(page,'monthlyIncome',6000);
    await setValue(page,'essentialExpenses',2500);
    await setValue(page,'flexibleExpenses',1000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await setValue(page,'monthlyDebtPayments',400);
    await setValue(page,'emergencySavings',1000);
    await setValue(page,'emergencyTargetMonths',3);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await setValue(page,'debtBalance',5000);
    await setValue(page,'highestDebtAprPct',18);
    await setValue(page,'assumedLongTermReturnPct',5);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await setValue(page,'retirementSavings',10000);
    await setValue(page,'retirementMonthlyContribution',0);
    await setValue(page,'goalTargetAmount',12000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 5 of 5');
    await setValue(page,'goalCurrentSavings',2000);
    await setValue(page,'goalYearsAway',2);
    await setValue(page,'goalMonthlyContribution',200);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askRecommendationHeadline')).toHaveText('Your first priority: Protect');
    await expect(page.locator('#askAlternativesHeading')).toHaveText('Your next three moves');
    await expect(page.locator('.ask-priority-move')).toHaveCount(3);
    const titles=await page.locator('.ask-priority-move h4').allTextContents();
    expect(titles[0]).toContain('Protect');
    expect(titles[1]).toContain('Reduce');
    expect(titles[2]).toContain('Build');
    await expect(page.locator('.ask-priority-numbers')).toHaveCount(3);
    await expect(page.locator('#askEngineTrace')).toContainText('Budget cash flow');
    await expect(page.locator('#askEngineTrace')).toContainText('Emergency fund runway');
    await expect(page.locator('#askEngineTrace')).toContainText('Goal planner');
  });

  test('[AUTO] Batch 4 guided GUI shows progress, collapsed Why we ask, and explicit I-dont-know handling only for assumptions',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="mortgage-prepay-vs-invest"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 1 of 2');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(3);
    await expect(page.locator('#askQuestionFields .ask-why')).toHaveCount(3);
    await expect(page.locator('#askQuestionFields .ask-why[open]')).toHaveCount(0);
    await expect(page.locator('[data-ask-unknown]')).toHaveCount(0);
    await setValue(page,'mortgageBalance',200000);
    await setValue(page,'mortgageRatePct',6);
    await setValue(page,'remainingYears',15);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 2 of 2');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(2);
    await expect(page.locator('[data-ask-unknown="assumedInvestmentReturnPct"]')).toBeVisible();
    await setValue(page,'extraAmount',10000);
    await page.locator('[data-ask-unknown="assumedInvestmentReturnPct"]').click();
    await expect(page.locator('input[name="assumedInvestmentReturnPct"]')).toHaveValue('5');
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askAssumptions')).toContainText('Illustrative default used because you selected “I don’t know”');
  });


  test('[AUTO] Batch 4 closeout lets users go back, correct answers, and keeps prior values',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="car-affordability"]').click();
    await setValue(page,'vehiclePrice',25000);
    await setValue(page,'takeHomeMonthlyIncome',5500);
    await setValue(page,'essentialMonthlyExpenses',2500);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 2');
    await expect(page.locator('#askBackBtn')).toBeVisible();
    await page.locator('#askBackBtn').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 1');
    await expect(page.locator('input[name="vehiclePrice"]')).toHaveValue('25000');
    await expect(page.locator('input[name="takeHomeMonthlyIncome"]')).toHaveValue('5500');
    await setValue(page,'vehiclePrice',24000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 2');
  });

  test('[AUTO] Batch 4 closeout validation preserves good answers and focuses the exact invalid field',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="emergency-runway"]').click();
    await setValue(page,'essentialExpenses',3000);
    await page.locator('input[name="emergencySavings"]').fill('-1');
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('input[name="essentialExpenses"]')).toHaveValue('3000');
    await expect(page.locator('input[name="emergencySavings"]')).toHaveAttribute('aria-invalid','true');
    await expect(page.locator('.ask-field-invalid')).toHaveCount(1);
    const active=await page.evaluate(()=>document.activeElement?.getAttribute('name'));
    expect(active).toBe('emergencySavings');
    await page.locator('input[name="emergencySavings"]').fill('18000');
    await expect(page.locator('input[name="emergencySavings"]')).not.toHaveAttribute('aria-invalid','true');
  });

  test('[AUTO] Batch 4 closeout smart focus and result review remain keyboard-accessible',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="emergency-runway"]').click();
    expect(await page.evaluate(()=>document.activeElement?.getAttribute('name'))).toBe('essentialExpenses');
    await setValue(page,'essentialExpenses',3000);
    await setValue(page,'emergencySavings',18000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askReviewAnswers')).toBeVisible();
    await page.locator('#askReviewAnswers').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#askQuestionsStage')).toBeVisible();
    await expect(page.locator('input[name="essentialExpenses"]')).toHaveValue('3000');
  });

  test('[AUTO] Batch 4 validation names the field that needs attention',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('[data-ask-intent="emergency-runway"]').click();
    await page.locator('input[name="essentialExpenses"]').fill('-1');
    await setValue(page,'emergencySavings',1000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askQuestionMessage')).toContainText('essential monthly expenses');
  });

  test('[AUTO] sitemap Search inventory and product boundaries remain controlled',async({page,request})=>{
    const xml=await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('<loc>https://carrowmont.com/ask-carrowmont.html</loc>');
    const inventory=await (await request.get('/data/carrowmont-search-pages.json')).json();
    expect(inventory.entries).toHaveLength(search1ExpectedPublicPages);
    expect(inventory.entries.some(entry=>entry.url===PATH)).toBe(true);
    await gotoClean(page,'/tools.html');
    await expect(page.locator('.directory-tool-card')).toHaveCount(23);
    await gotoClean(page,'/');
    await expect(page.locator('[data-homepage-core-grid] [data-tool-id]')).toHaveCount(9);
    await expect(page.locator('[data-home-ask-entry]')).toHaveAttribute('href',PATH);
    await expect(page.locator('.desktop-nav a[href="/ask-carrowmont.html"]')).toHaveCount(1);
  });

  test('[AUTO] Ask is discoverable from shared navigation and the homepage while remaining outside the 23-tool directory',async({page})=>{
    await gotoClean(page,'/');
    await expect(page.locator('[data-home-ask-entry]')).toBeVisible();
    await expect(page.locator('.desktop-nav a[href="/ask-carrowmont.html"]')).toHaveCount(1);
    await gotoClean(page,'/tools.html');
    await expect(page.locator('.directory-tool-card')).toHaveCount(23);
    await expect(page.locator('.desktop-nav a[href="/ask-carrowmont.html"]')).toHaveCount(1);
    await gotoClean(page,PATH);
    await expect(page.locator('.ask-side-card')).toHaveCount(0);
    await expect(page.locator('#askQuestion')).toBeVisible();
    const box=await page.locator('#askQuestion').boundingBox();
    expect(box && box.y).toBeLessThan(650);
  });


  test('[AUTO] mobile navigation keeps Ask first-level and visually distinct from Search',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/');
    const nav=page.locator('[data-mobile1-bottom-nav]');
    await expect(nav).toBeVisible();
    const items=nav.locator('[data-mobile1-nav]');
    await expect(items).toHaveCount(5);
    await expect(items.nth(2)).toHaveAttribute('data-mobile1-nav','ask');
    await expect(items.nth(2)).toHaveAttribute('href',PATH);
    await expect(page.locator('[data-mobile1-header-search]')).toHaveAttribute('href','/search.html');
    await page.locator('[data-mobile1-nav="more"]').click();
    const more=page.locator('#mobile1MoreDialog');
    await expect(more.getByText('Research',{exact:true})).toBeVisible();
    await expect(more.getByText('Ask Carrowmont',{exact:true})).toHaveCount(0);
  });

  test('[AUTO] responsive guided interface has no horizontal overflow at [1280,768,412,390,360]',async({page})=>{
    for(const width of [1280,768,412,390,360]){
      await page.setViewportSize({width,height:900});
      await gotoClean(page,PATH);
      await assertNoHorizontalOverflow(page);
      await expect(page.locator('#askWorkspace')).toBeVisible();
    }
  });
});
