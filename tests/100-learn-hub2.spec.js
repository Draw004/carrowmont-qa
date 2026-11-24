import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

async function waitForHub(page){
  await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
  await expect(page.locator('#learn2Results [data-learn-result]').first()).toBeVisible();
}

test.describe('Learn Hub 2.0',()=>{
  test('[AUTO] desktop Learn starts with guided situations, topic counts and a contained right-edge result scroller',async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    await gotoClean(page,'/learn.html');
    await waitForHub(page);
    await expect(page.locator('[data-learn-situation]')).toHaveCount(6);
    await expect(page.locator('#learn2TopicRow [data-learn-topic]')).toHaveCount(12);
    await expect(page.locator('#learn2Results [data-learn-result]')).toHaveCount(12);
    await expect(page.locator('.planning-categories')).not.toBeVisible();
    const scroll=page.locator('.learn2-results-scroll');
    await expect.poll(async()=>scroll.evaluate(el=>({overflow:getComputedStyle(el).overflowY,dir:getComputedStyle(el).direction||'ltr',scroll:el.scrollHeight>el.clientHeight}))).toEqual({overflow:'auto',dir:'ltr',scroll:true});
    await assertNoHorizontalOverflow(page);
  });

  test('[AUTO] Learn search is guide-only, typo tolerant and does not surface calculator/search result cards',async({page})=>{
    await gotoClean(page,'/learn.html');
    await waitForHub(page);
    const input=page.locator('#learn2SearchInput');
    await input.fill('retirment');
    await page.locator('#learn2SearchForm button[type="submit"]').click();
    await expect(page.locator('#learn2Correction')).toBeVisible();
    await expect(page.locator('#learn2Results')).toContainText(/retire|retirement/i);
    await expect(page.locator('#learn2Results .cm-search-result-card-tool')).toHaveCount(0);
    await expect(page.locator('#learn2Results [data-learn-result]')).not.toHaveCount(0);
  });

  test('[AUTO] selecting a topic narrows the library and exposes that topic related calculator',async({page})=>{
    await gotoClean(page,'/learn.html');
    await waitForHub(page);
    await page.locator('[data-learn-topic="home"]').click();
    await expect(page.locator('#learn2ResultsTitle')).toContainText(/Home Loan|Mortgage/i);
    await expect(page.locator('#learn2RelatedTool')).toBeVisible();
    await expect(page.locator('#learn2RelatedTool a')).toHaveAttribute('href','/mortgage-payoff-calculator/decision-centre.html');
    await expect(page.locator('#learn2Results a[href="/how-much-home-can-i-afford.html"]')).toBeVisible();
  });


  test('[AUTO] legacy Learn topic hashes and shared topic banner activate the enhanced hub instead of hidden source sections',async({page})=>{
    await gotoClean(page,'/learn.html#home-loans');
    await waitForHub(page);
    await expect(page.locator('[data-learn-topic="home"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#learn2RelatedTool a')).toHaveAttribute('href','/mortgage-payoff-calculator/decision-centre.html');
    await page.locator('[data-cm-learn-topic-nav] [data-cm-learn-topic="retirement"]').click();
    await expect(page).toHaveURL(/#topic-retirement$/);
    await expect(page.locator('[data-learn-topic="retirement"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#learn2ResultsTitle')).toContainText('Retirement');
  });

  test('[AUTO] situation and learning-style controls change discovery without creating a second global Search',async({page})=>{
    await gotoClean(page,'/learn.html');
    await waitForHub(page);
    await page.locator('[data-learn-situation="invest"]').click();
    await expect(page.locator('[data-learn-situation="invest"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#learn2ResultsTitle')).toContainText('Start here: Start or improve investing');
    await expect(page.locator('#learn2Results')).toContainText(/invest|fund|ETF/i);
    await page.locator('[data-learn-intent="compare"]').click();
    await expect(page.locator('[data-learn-intent="compare"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#learn2Results .learn2-card-kind').first()).toContainText(/Compare|Plan|Explain|Start here/);
    await expect(page.locator('a.learn2-search-all')).toHaveAttribute('href','/search.html');
  });

  test('[AUTO] mobile Learn uses normal page scrolling with horizontally browsable situation/topic controls',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/learn.html');
    await waitForHub(page);
    const overflow=await page.locator('.learn2-results-scroll').evaluate(el=>getComputedStyle(el).overflowY);
    expect(overflow).toBe('visible');
    const situationOverflow=await page.locator('.learn2-situations').evaluate(el=>getComputedStyle(el).overflowX);
    const topicOverflow=await page.locator('#learn2TopicRow').evaluate(el=>getComputedStyle(el).overflowX);
    expect(['auto','scroll']).toContain(situationOverflow);
    expect(['auto','scroll']).toContain(topicOverflow);
    await assertNoHorizontalOverflow(page);
  });
});
