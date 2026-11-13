import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

test.describe('FRE8F UX simplification routing and performance cleanup',()=>{
  test('[AUTO] homepage is simpler and hero is high priority',async({page})=>{
    await gotoClean(page,'/');
    await expect(page.getByText('Explore freely.',{exact:true})).toHaveCount(0);
    await expect(page.locator('.cm-product-journey')).toBeVisible();
    const hero=page.locator('.hero-visual img');
    await expect(hero).toHaveAttribute('fetchpriority','high');
    await expect(hero).toHaveAttribute('loading','eager');
  });

  test('[AUTO] submitted Learn search brings results into a short laptop viewport',async({page})=>{
    await page.setViewportSize({width:1366,height:640});
    await gotoClean(page,'/learn.html');
    const input=page.locator('#learnSearchInput');
    await input.fill('how to start investing');
    await page.locator('[data-cm-search-submit]').click();
    const heading=page.locator('[data-cm-search-results-heading]');
    await expect(heading).toContainText('Results for');
    await expect(page.locator('[data-search-result-link]').first()).toContainText('Investing for Beginners');
    await expect.poll(async()=>{const box=await heading.boundingBox();return box?box.y:9999;}).toBeLessThan(180);
  });

  test('[AUTO] Ask routes unsupported guided questions into Carrowmont content and private Search handoff',async({page})=>{
    await gotoClean(page,'/ask-carrowmont.html');
    const query='How to start investing?';
    await page.locator('#askQuestion').fill(query);
    await page.locator('#askStartBtn').click();
    const fallback=page.locator('#askUnsupported');
    await expect(fallback.locator('.ask-route-result').first()).toContainText('Investing for Beginners');
    await expect(fallback).not.toContainText(/not available yet|has not been built yet|still growing/i);
    await Promise.all([page.waitForURL(/\/search\.html$/),page.locator('#askSearchAll').click()]);
    await expect(page.locator('[data-cm-search-input]')).toHaveValue(query);
    await expect(page.locator('[data-cm-search-results-heading]')).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  });

  test('[AUTO] Research frames the library globally but keeps study scope honest',async({page})=>{
    await gotoClean(page,'/research.html');
    await expect(page.locator('.research-dek')).toContainText('Each study clearly shows the country or market it covers');
    await expect(page.locator('.research-study-card>.research-kicker')).toHaveCount(3);
    for(const badge of await page.locator('.research-study-card>.research-kicker').all()) await expect(badge).toHaveText('UNITED STATES');
    await expect(page.locator('main')).not.toContainText('LIVE · UNITED STATES');
  });

  test('[AUTO] Privacy is scannable and detailed processing remains available on demand',async({page})=>{
    await gotoClean(page,'/privacy.html');
    await expect(page.locator('.privacy-summary-grid article')).toHaveCount(4);
    const details=page.locator('.privacy-technical');
    await expect(details).not.toHaveAttribute('open','');
    await details.locator('summary').click();
    await expect(details).toContainText('Row Level Security');
    await expect(details).toContainText('Brevo processes the authentication email delivery');
  });

  test('[AUTO] mobile keeps My Money and affected pages remain overflow-safe',async({page})=>{
    for(const width of [412,390,360]){
      await page.setViewportSize({width,height:850});
      await gotoClean(page,'/');
      await expect(page.locator('[data-mobile1-bottom-nav] [data-mobile1-nav="my"]')).toContainText('My Money');
      await assertNoHorizontalOverflow(page,`${width}px home`);
      for(const path of ['/learn.html','/ask-carrowmont.html','/research.html','/privacy.html']){await gotoClean(page,path);await assertNoHorizontalOverflow(page,`${width}px ${path}`);}
    }
  });
});
