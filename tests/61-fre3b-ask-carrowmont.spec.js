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

  test('[AUTO] unsupported ordinary-language questions always receive a visible not-yet-available response',async({page})=>{
    await gotoClean(page,PATH);
    await page.locator('#askQuestion').fill('How to start investing?');
    await page.locator('#askStartBtn').click();
    const fallback=page.locator('#askUnsupported');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('guided resolution is not available yet');
    await expect(fallback).toContainText('five controlled money decisions');
    await expect(fallback.getByRole('link',{name:'Search Carrowmont'})).toHaveAttribute('href','/search.html');
    await expect(fallback.getByRole('link',{name:'Browse Tools'})).toHaveAttribute('href','/tools.html');
    await expect(fallback.getByRole('link',{name:'Explore Learn'})).toHaveAttribute('href','/learn.html');
    await expect(page.locator('#askQuestionsStage')).toBeHidden();
    await expect(page.locator('#askResultStage')).toBeHidden();
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
