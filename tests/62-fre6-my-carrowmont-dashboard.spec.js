import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PATH='/my-carrowmont.html';

async function openEditor(page){await page.locator('#mycmEditAll').click();await expect(page.locator('#mycmEditDialog')).toBeVisible();}
async function setDashboardField(page,path,value){const input=page.locator(`[data-mycm-path="${path}"]`);await expect(input).toBeVisible();await input.fill(String(value));}
async function setAskValue(page,name,value){const input=page.locator(`#askQuestionFields input[name="${name}"]`);await expect(input).toBeVisible();await input.fill(String(value));}

test.describe('FRE6 My Carrowmont guest/local dashboard',()=>{
  test('[AUTO] dashboard is guest-first, session-only by default, and summarizes deterministic cash-flow/emergency facts',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,PATH);
    await expect(page.getByRole('heading',{name:'See what matters without tracking every transaction.'})).toBeVisible();
    await expect(page.locator('#mycmRemember')).not.toBeChecked();
    await openEditor(page);
    await setDashboardField(page,'cashFlow.takeHomeIncome',6000);
    await setDashboardField(page,'cashFlow.essentialExpenses',2500);
    await setDashboardField(page,'cashFlow.flexibleExpenses',800);
    await setDashboardField(page,'resilience.emergencySavings',12000);
    await setDashboardField(page,'resilience.targetMonths',3);
    await page.locator('#mycmEditForm button[type="submit"]').click();
    await expect(page.locator('#mycmCashFlowCard')).toContainText('2,700');
    await expect(page.locator('#mycmEmergencyCard')).toContainText('4.8 months');
    const storage=await page.evaluate(()=>({session:sessionStorage.getItem('carrowmont_guest_dashboard_session_v1'),local:localStorage.getItem('carrowmont_guest_dashboard_local_v1')}));
    expect(storage.session).toContain('cashFlow.takeHomeIncome');
    expect(storage.local).toBeNull();
    expect(errors).toEqual([]);
  });

  test('[AUTO] Remember on this device is explicit and switching back removes persistent financial data',async({page})=>{
    await gotoClean(page,PATH);
    await openEditor(page); await setDashboardField(page,'cashFlow.takeHomeIncome',5000); await setDashboardField(page,'cashFlow.essentialExpenses',2000); await page.locator('#mycmEditForm button[type="submit"]').click();
    await page.locator('#mycmRemember').check();
    let storage=await page.evaluate(()=>({session:sessionStorage.getItem('carrowmont_guest_dashboard_session_v1'),local:localStorage.getItem('carrowmont_guest_dashboard_local_v1')}));
    expect(storage.session).toBeNull(); expect(storage.local).toContain('5000');
    await page.locator('#mycmRemember').uncheck();
    storage=await page.evaluate(()=>({session:sessionStorage.getItem('carrowmont_guest_dashboard_session_v1'),local:localStorage.getItem('carrowmont_guest_dashboard_local_v1')}));
    expect(storage.session).toContain('5000'); expect(storage.local).toBeNull();
  });

  test('[AUTO] What Carrowmont knows lets the user ignore and remove individual values',async({page})=>{
    await gotoClean(page,PATH);
    await openEditor(page); await setDashboardField(page,'cashFlow.takeHomeIncome',5000); await setDashboardField(page,'cashFlow.essentialExpenses',2000); await page.locator('#mycmEditForm button[type="submit"]').click();
    const row=page.locator('.mycm-fact').filter({hasText:'Monthly take-home income'});
    await expect(row).toBeVisible();
    await row.locator('[data-mycm-influence]').uncheck();
    await expect(page.locator('#mycmCashFlowCard')).toContainText('Add take-home income');
    await row.locator('[data-mycm-influence]').check();
    await expect(page.locator('#mycmCashFlowCard')).toContainText('/ month');
    await row.locator('[data-mycm-remove]').click();
    await expect(page.locator('.mycm-fact').filter({hasText:'Monthly take-home income'})).toHaveCount(0);
  });

  test('[AUTO] Ask Carrowmont never saves automatically and explicit My Carrowmont capture carries compatible facts only',async({page})=>{
    await gotoClean(page,'/ask-carrowmont.html');
    await page.locator('[data-ask-intent="emergency-runway"]').click();
    await setAskValue(page,'essentialExpenses',3000); await setAskValue(page,'emergencySavings',18000);
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('carrowmont_guest_dashboard_session_v1'))).toBeNull();
    await page.locator('#askDashboardSaveBtn').click();
    await expect(page.locator('#askDashboardSaveStatus')).toContainText('Saved to this browser');
    const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carrowmont_guest_dashboard_session_v1')));
    expect(stored.facts['cashFlow.essentialExpenses'].value).toBe(3000);
    expect(stored.facts['resilience.emergencySavings'].value).toBe(18000);
    await page.locator('#askDashboardSaveStatus a').click();
    await expect(page).toHaveURL(/my-carrowmont\.html/);
    await expect(page.locator('#mycmEmergencyCard')).toContainText('6 months');
  });

  test('[AUTO] dashboard is mobile-safe and remains a summary rather than a transaction tracker',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,PATH);
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('[data-mobile1-bottom-nav]')).toBeVisible();
    await expect(page.locator('[data-mobile1-nav="my"]')).toHaveAttribute('href','/my-carrowmont.html');
    await expect(page.locator('[data-mobile1-nav="my"]')).toHaveAttribute('aria-current','page');
    await page.locator('[data-mobile1-nav="more"]').click();
    await expect(page.locator('#mobile1MoreDialog')).toContainText('Learn');
    await expect(page.locator('#mobile1MoreDialog')).toContainText('About');
    await expect(page.getByText('No bank connection')).toBeVisible();
    await expect(page.getByText('not a transaction tracker',{exact:false})).toBeVisible();
  });
});
