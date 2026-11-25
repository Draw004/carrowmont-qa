import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const guides=[
  ['/emergency-fund-vs-paying-off-debt.html','Emergency fund vs paying off debt'],
  ['/risk-tolerance-vs-risk-capacity.html','Risk tolerance vs risk capacity'],
  ['/portfolio-rebalancing-explained.html','Portfolio rebalancing'],
  ['/investment-fees-and-expense-ratios.html','Investment fees'],
  ['/market-timing-vs-staying-invested.html','Market timing'],
  ['/home-buying-upfront-costs.html','How much cash do you need to buy a home beyond the deposit?']
];

async function waitForHub(page){
  await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
  await expect(page.locator('#learn2Results [data-learn-result]').first()).toBeVisible();
}

test.describe('Evergreen Learn Expansion Wave 1',()=>{
  test('[AUTO] six new evergreen guides load with durable article metadata and source disclosure',async({page})=>{
    for(const [url,title] of guides){
      await gotoClean(page,url);
      await expect(page.locator('h1')).toContainText(title,{ignoreCase:true});
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${url}`);
      await expect(page.getByText('30-second answer',{exact:true})).toBeVisible();
      await expect(page.getByText('Sources and how this guide was prepared',{exact:true})).toBeVisible();
      await expect(page.getByText('Educational information only.',{exact:true})).toBeVisible();
    }
  });

  test('[AUTO] Learn Hub discovers the new decision and investing guides',async({page})=>{
    await gotoClean(page,'/learn.html');
    await waitForHub(page);
    await page.locator('#learn2SearchInput').fill('emergency fund or debt first');
    await page.locator('#learn2SearchForm button[type="submit"]').click();
    await expect(page.locator('#learn2Results a[href="/emergency-fund-vs-paying-off-debt.html"]')).toBeVisible();
    await page.locator('#learn2SearchInput').fill('risk capacity');
    await page.locator('#learn2SearchForm button[type="submit"]').click();
    await expect(page.locator('#learn2Results a[href="/risk-tolerance-vs-risk-capacity.html"]')).toBeVisible();
    await page.locator('#learn2SearchInput').fill('expense ratio fees');
    await page.locator('#learn2SearchForm button[type="submit"]').click();
    await expect(page.locator('#learn2Results a[href="/investment-fees-and-expense-ratios.html"]')).toBeVisible();
  });

  test('[AUTO] related action paths remain real links',async({page})=>{
    const actions=[
      ['/emergency-fund-vs-paying-off-debt.html','/ask-carrowmont.html?decision=money-priorities'],
      ['/home-buying-upfront-costs.html','/home-affordability-calculator.html'],
      ['/investment-fees-and-expense-ratios.html','/compound-interest-calculator/']
    ];
    for(const [url,href] of actions){
      await gotoClean(page,url);
      await expect(page.locator(`.guide-action-first a[href="${href}"]`)).toBeVisible();
      await expect(page.locator(`.learn-tool-return a[href="${href}"]`)).toBeVisible();
    }
  });

  test('[AUTO] new evergreen guides stay mobile-safe at 390 and 360 pixels',async({page})=>{
    for(const width of [390,360]){
      await page.setViewportSize({width,height:844});
      for(const [url] of guides){
        await gotoClean(page,url);
        await assertNoHorizontalOverflow(page);
      }
    }
  });
});
