import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

test.describe('FRE12 UX, Search and Learn expansion',()=>{
  test('[AUTO] Home uses compact Ask entry and mobile Home has only one selected bottom-nav item',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/');
    await expect(page.locator('[data-home-ask-entry]')).toBeVisible();
    await expect(page.locator('[data-home-decision-entry]')).toHaveCount(0);
    await expect(page.locator('.mobile1-nav-item[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[data-mobile1-nav="home"]')).toHaveAttribute('aria-current','page');
    await expect(page.locator('[data-mobile1-nav="ask"]')).not.toHaveAttribute('aria-current','page');
    await assertNoHorizontalOverflow(page);
  });

  test('[AUTO] My Money and Ask routes each expose exactly one active mobile destination',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/my-carrowmont.html');
    await expect(page.locator('.mobile1-nav-item[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[data-mobile1-nav="my"]')).toHaveAttribute('aria-current','page');
    await gotoClean(page,'/ask-carrowmont.html');
    await expect(page.locator('.mobile1-nav-item[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[data-mobile1-nav="ask"]')).toHaveAttribute('aria-current','page');
  });

  test('[AUTO] Search predicts retirement from a partial query and typo correction finds retirement results',async({page})=>{
    await gotoClean(page,'/search.html');
    const input=page.locator('#carrowmontSearchInput');
    await input.fill('re');
    await expect(page.locator('.cm-search-typeahead')).toBeVisible();
    await expect(page.locator('.cm-search-typeahead')).toContainText(/Retirement/i);
    await expect(page.locator('[data-cm-search-status]')).not.toContainText('No close matches found');
    await input.fill('retirment');
    await page.locator('[data-cm-search-submit]').click();
    await expect(page.locator('[data-cm-search-results]')).toContainText(/Retirement/i);
  });

  test('[AUTO] Ask offers local predictive suggestions for imperfect spelling',async({page})=>{
    await gotoClean(page,'/ask-carrowmont.html');
    const input=page.locator('#askQuestion');
    await expect(input).toHaveAttribute('autocorrect','on');
    await expect(input).toHaveAttribute('aria-autocomplete','list');
    await input.fill('retirment');
    await expect(page.locator('#askPredictive')).toBeVisible();
    await expect(page.locator('#askPredictive')).toContainText(/retirement/i);
  });

  test('[AUTO] seven FRE12 Learn guides are live in the hub and substantive pages render without overflow',async({page})=>{
    const guides=['mutual-funds-explained.html','pay-off-debt-or-invest.html','balance-transfer-credit-card.html','where-to-keep-short-term-savings.html','what-to-do-with-a-lump-sum.html','early-retirement-planning.html','how-much-save-for-retirement-each-month.html'];
    await gotoClean(page,'/learn.html');
    for(const name of guides) await expect(page.locator(`a[href="/${name}"]`).first()).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/mutual-funds-explained.html');
    await expect(page.locator('.guide-answer')).toContainText('30-second answer');
    await expect(page.locator('.source-list a')).toHaveCount(3);
    await assertNoHorizontalOverflow(page);
  });
});
