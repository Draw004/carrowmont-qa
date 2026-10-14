import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const LEARN='/learn.html';
const PREPAY='/mortgage-prepayment-vs-investing.html';
const REFI='/mortgage-refinance-break-even.html';
const STRESS='/mortgage-rate-rise-payment-stress.html';
const ONE_EXTRA='/one-extra-mortgage-payment-a-year.html';
const RENT_BUY='/rent-vs-buy-home.html';
const REAL_ESTATE='/real-estate-vs-stocks.html';
const RENTAL_YIELD='/rental-yield-explained.html';
const RETIREMENT_EXPENSES='/retirement-expenses.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale && window.CarrowmontLearnLocalization?.apply))).toBe(true);
  await page.evaluate(({region,currency})=>{window.CarrowmontLocale.setLocale(region,currency);window.CarrowmontLearnLocalization.apply();},{region,currency});
  await expect.poll(()=>page.evaluate(()=>({region:window.CarrowmontLocale.getRegion(),currency:window.CarrowmontLocale.getCurrency()}))).toEqual({region,currency});
}

async function homeClusterText(page){return (await page.locator('#home-loans').innerText()).replace(/\s+/g,' ').trim();}

async function articleH1(page,path,region,currency){
  await gotoClean(page,path);
  await setLocale(page,region,currency);
  await expect.poll(()=>page.locator('.learn-page-hero h1').innerText()).not.toBe('');
  return (await page.locator('.learn-page-hero h1').innerText()).trim();
}

async function mainTextWithoutReferences(page){
  return page.locator('main').evaluate(main=>{
    const clone=main.cloneNode(true);
    clone.querySelectorAll('.reference-note,script,style,code,pre').forEach(el=>el.remove());
    return (clone.innerText||clone.textContent||'').replace(/\s+/g,' ').trim();
  });
}

test.describe('Learn housing country-language hotfix',()=>{
  test('[AUTO] Learn hub mortgage family wording follows India, US, UK and Australia country terminology',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,LEARN);

    await setLocale(page,'IN','INR');
    await expect(page.locator('#home-loans .category-head h2')).toHaveText('Home Loans');
    await expect(page.locator('#home-loans .category-tool-link')).toHaveText('Open Home Loan Decision Centre →');
    let text=await homeClusterText(page);
    expect(text).toContain('Home loan prepayment vs investing');
    expect(text).toContain('home loan balance transfer');
    expect(text).toContain('home loan EMI / payment');
    expect(text).toContain('One extra home loan payment');
    expect(text).not.toContain('Mortgage prepayment vs investing');

    await setLocale(page,'US','USD');
    await expect(page.locator('#home-loans .category-head h2')).toHaveText('Mortgages');
    await expect(page.locator('#home-loans .category-tool-link')).toHaveText('Open Mortgage Decision Centre →');
    text=await homeClusterText(page);
    expect(text).toContain('Mortgage prepayment vs investing');
    expect(text).toContain('mortgage refinancing');
    expect(text).toContain('mortgage payment');

    await setLocale(page,'GB','GBP');
    text=await homeClusterText(page);
    expect(text).toContain('Mortgage overpayment vs investing');
    expect(text).toContain('remortgaging or switching a mortgage deal');

    await setLocale(page,'AU','AUD');
    await expect(page.locator('#home-loans .category-head h2')).toHaveText('Home Loans');
    text=await homeClusterText(page);
    expect(text).toContain('Extra home loan repayments vs investing');
    expect(text).toContain('refinancing a home loan');
    expect(text).toContain('home loan repayment');

    expect(errors).toEqual([]);
  });

  test('[AUTO] Mortgage Learn article hero, back link and footer follow the selected country while URLs stay stable',async({page})=>{
    expect(await articleH1(page,PREPAY,'IN','INR')).toContain('Home loan prepayment vs investing');
    await expect(page.locator('.learn-more-row a[href="/learn.html#home-loans"]')).toHaveText('← Back to Home Loan guides');
    await expect(page.locator('.footer-col a[href="/mortgage-payoff-calculator/"]')).toHaveText('Home Loan Payoff / Prepayment');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/mortgage-prepayment-vs-investing.html');

    expect(await articleH1(page,PREPAY,'GB','GBP')).toContain('Mortgage overpayment vs investing');
    await expect(page.locator('.learn-more-row a[href="/learn.html#home-loans"]')).toHaveText('← Back to Mortgage guides');

    expect(await articleH1(page,REFI,'IN','INR')).toBe('When does home loan balance transfer break even?');
    await expect(page.locator('#articleKicker')).toHaveText('HOME LOAN BALANCE TRANSFER GUIDE');
    expect(await articleH1(page,REFI,'GB','GBP')).toBe('When does remortgaging or switching a mortgage deal break even?');
    await expect(page.locator('#articleKicker')).toHaveText('REMORTGAGE / MORTGAGE SWITCH GUIDE');
    expect(await articleH1(page,STRESS,'IN','INR')).toContain('home loan EMI / payment');
    expect(await articleH1(page,STRESS,'AU','AUD')).toContain('home loan repayment');
    await expect(page.locator('#articleKicker')).toHaveText('HOME LOAN RATE-STRESS GUIDE');
    expect(await articleH1(page,ONE_EXTRA,'IN','INR')).toContain('One extra home loan payment a year');
  });

  test('[AUTO] housing wording is localized across Learn articles outside the mortgage cluster',async({page})=>{
    for(const path of [RENT_BUY,REAL_ESTATE,RENTAL_YIELD,RETIREMENT_EXPENSES]){
      await gotoClean(page,path);
      await setLocale(page,'IN','INR');
      let text=await mainTextWithoutReferences(page);
      expect(text,`${path} should not show hard-coded mortgage wording for India`).not.toMatch(/\bmortgages?\b/i);
      expect(text,`${path} should use home-loan wording for India`).toMatch(/home loan/i);

      await setLocale(page,'US','USD');
      text=await mainTextWithoutReferences(page);
      expect(text,`${path} should not show hard-coded home-loan wording for US`).not.toMatch(/\bhome[- ]loans?\b/i);
      expect(text,`${path} should use mortgage wording for US`).toMatch(/\bmortgages?\b/i);
    }
  });

  test('[AUTO] Rent vs Buy no longer presents Goal Planner as the comparison calculator',async({page})=>{
    await gotoClean(page,RENT_BUY);
    await setLocale(page,'IN','INR');
    const action=page.locator('.guide-action-first');
    await expect(action.locator('.action-label')).toHaveText('PLANNING A DOWN PAYMENT?');
    await expect(action.locator('a[href="/goal-planner/"] span')).toHaveText('Plan the down-payment goal only');
    await expect(action).toContainText('It does not compare renting with buying');
    await expect(action).toContainText('dedicated Rent vs Buy Calculator');
  });

  test('[AUTO] country-language localization keeps Learn hub, mortgage guide and Rent vs Buy mobile-safe',async({page})=>{
    for(const width of [390,360]){
      await page.setViewportSize({width,height:900});
      await gotoClean(page,LEARN);await setLocale(page,'IN','INR');
      await assertNoHorizontalOverflow(page,`${width}px Learn hub India housing wording`);
      await gotoClean(page,REFI);await setLocale(page,'GB','GBP');
      await assertNoHorizontalOverflow(page,`${width}px UK remortgage wording`);
      await gotoClean(page,RENT_BUY);await setLocale(page,'IN','INR');
      await assertNoHorizontalOverflow(page,`${width}px India Rent vs Buy housing wording`);
    }
  });
});
