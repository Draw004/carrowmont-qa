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
    await expect(page.getByRole('heading',{name:'What’s happening with your money?'})).toBeVisible();
    await page.locator('[data-ask-intent="emergency-runway"]').click();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(2);
    await setValue(page,'essentialExpenses',3000);
    await setValue(page,'emergencySavings',9000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askDiagnosis')).toContainText('reserve');
    await expect(page.locator('#askEngineTrace')).toContainText('Emergency fund runway');
    await expect(page.locator('#askMetrics .ask-metric')).not.toHaveCount(0);
    expect(errors).toEqual([]);
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
    await expect(page.locator(`a[href="${PATH}"]`)).toHaveCount(0);
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
