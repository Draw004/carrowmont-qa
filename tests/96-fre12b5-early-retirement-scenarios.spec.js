import { test, expect } from '@playwright/test';
import { gotoClean, setInput, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';
const FI='/financial-independence/';
const GUIDE='/early-retirement-planning.html';

async function seedMainPlan(page){
  await setInput(page,'#currentAge',35);
  await setInput(page,'#targetAge',50);
  await setInput(page,'#monthlySpending',80000);
  await setInput(page,'#currentAssets',1000000);
  await setInput(page,'#monthlyContribution',20000);
}

test.describe('FRE12B-5 Early-retirement scenarios',()=>{
  test('[AUTO] live FI planner shows a clear empty state and then exposes the anchored four-path scenario comparison',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,FI);
    await expect(page.locator('#early-retirement-scenarios')).toBeVisible();
    await setInput(page,'#monthlySpending',0);await setInput(page,'#monthlyIncome',0);await setInput(page,'#currentAssets',0);await setInput(page,'#monthlyContribution',0);
    await expect(page.locator('#earlyRetirementGrid .early-retirement-empty')).toContainText('Add your FI details above');
    await seedMainPlan(page);
    await expect(page.locator('#earlyRetirementGrid .early-retirement-card')).toHaveCount(4);
    await expect(page.getByRole('heading',{name:'What changes if you leave full-time work earlier?'})).toBeVisible();
    expect(errors).toEqual([]);
  });
  test('[AUTO] age 50 plan compares age 45, 50 and 51 using the same main assumptions',async({page})=>{
    await gotoClean(page,FI);await seedMainPlan(page);
    const cards=page.locator('#earlyRetirementGrid .early-retirement-card');
    await expect(cards.nth(0).getByRole('heading')).toHaveText('Age 45');
    await expect(cards.nth(1).getByRole('heading')).toHaveText('Age 50');
    await expect(cards.nth(2).getByRole('heading')).toHaveText('Age 51');
    await expect(page.locator('#earlyOneMoreSummary')).toContainText('arithmetic, not a recommendation');
  });
  test('[AUTO] user bridge income and spending assumptions change only the adjusted scenario',async({page})=>{
    await gotoClean(page,FI);await seedMainPlan(page);
    const cards=page.locator('#earlyRetirementGrid .early-retirement-card');
    const before=await cards.nth(0).textContent();
    await setInput(page,'#earlyBridgeIncome',20000);await setInput(page,'#earlyScenarioSpendingPct',90);
    const after=await cards.nth(0).textContent();
    expect(after).toBe(before);
    await expect(cards.nth(3)).toContainText('20,000');
    await expect(cards.nth(3)).toContainText("90% of today's spending");
  });
  test('[AUTO] guide routes directly into the live scenario module',async({page})=>{
    await gotoClean(page,GUIDE);
    const link=page.getByRole('link',{name:'Compare early-retirement scenarios',exact:true});
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/financial-independence\/#early-retirement-scenarios$/);
    await expect(page.locator('#early-retirement-scenarios')).toBeVisible();
    await expect(page.locator('#earlyRetirementGrid')).toBeVisible();
  });
  test('[AUTO] desktop and mobile views avoid horizontal overflow',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:900});for(const target of [FI,GUIDE]){await gotoClean(page,target);await assertNoHorizontalOverflow(page,`${width}px ${target}`);}}
  });
});
