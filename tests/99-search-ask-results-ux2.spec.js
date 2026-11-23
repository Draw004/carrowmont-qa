import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

async function search(page, query){
  const input=page.locator('#carrowmontSearchInput');
  await input.fill(query);
  await page.locator('[data-cm-search-submit]').click();
  await expect(page.locator('[data-cm-search-root]')).toHaveAttribute('data-search-state','results');
}

async function expectDesktopGroupsSideBySide(tool, learn){
  await expect(tool).toBeVisible();
  await expect(learn).toBeVisible();
  await expect.poll(async()=>{
    const [tb,lb]=await Promise.all([tool.boundingBox(),learn.boundingBox()]);
    return Boolean(tb&&lb&&tb.x<lb.x);
  },{message:'Tools should remain visibly left of Learn on desktop'}).toBe(true);
}

test.describe('Search + Ask Results UX2',()=>{
  test('[AUTO] desktop Search shows Tools left and Learn right with independent right-edge scrollers',async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    await gotoClean(page,'/search.html');
    await search(page,'budget');
    const tool=page.locator('[data-search-result-group="tool"]');
    const learn=page.locator('[data-search-result-group="guide"]');
    await expectDesktopGroupsSideBySide(tool,learn);
    for(const grid of [tool.locator('.cm-search-result-group-grid'),learn.locator('.cm-search-result-group-grid')]){
      await expect.poll(async()=>grid.evaluate(el=>({overflow:getComputedStyle(el).overflowY,dir:getComputedStyle(el).direction,scroll:el.scrollHeight>el.clientHeight}))).toEqual({overflow:'auto',dir:'ltr',scroll:true});
    }
    await assertNoHorizontalOverflow(page);
  });

  test('[AUTO] Search CTA text itself and the whole card are real links to the same destination',async({page})=>{
    await page.setViewportSize({width:1280,height:850});
    await gotoClean(page,'/search.html');
    await search(page,'budget');
    const card=page.locator('[data-search-result-group="tool"] [data-search-result-link]').first();
    const href=await card.getAttribute('href');
    await expect(card).toHaveAttribute('href',href||'');
    await expect(card.locator('[data-search-result-action]')).toContainText('Open tool');
    await card.focus(); await expect(card).toBeFocused();
    await Promise.all([page.waitForURL(url=>url.pathname===(href||'')),card.locator('[data-search-result-action]').click()]);
  });

  test('[AUTO] exact Learn ownership remains Best Match even though Tools stay visually left on desktop',async({page})=>{
    await page.setViewportSize({width:1366,height:850});
    await gotoClean(page,'/search.html');
    await search(page,'how to make a budget');
    const first=page.locator('[data-search-result-link]').first();
    await expect(first).toHaveAttribute('href','/how-to-make-a-budget.html');
    await expect(first.locator('.cm-search-result-best-match')).toHaveText('Best match');
    const tool=page.locator('[data-search-result-group="tool"]');
    const learn=page.locator('[data-search-result-group="guide"]');
    await expectDesktopGroupsSideBySide(tool,learn);
  });

  test('[AUTO] mobile Search uses Tools and Learn tabs with normal page scrolling',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/search.html');
    await search(page,'budget');
    const tabs=page.locator('.cm-search-result-tabs'); await expect(tabs).toBeVisible();
    const toolTab=page.locator('[data-search-result-tab="tool"]');
    const learnTab=page.locator('[data-search-result-tab="guide"]');
    await expect(toolTab).toHaveAttribute('aria-selected','true');
    await expect(page.locator('[data-search-result-group="tool"]')).toBeVisible();
    await expect(page.locator('[data-search-result-group="guide"]')).not.toBeVisible();
    await learnTab.click();
    await expect(learnTab).toHaveAttribute('aria-selected','true');
    await expect(page.locator('[data-search-result-group="guide"]')).toBeVisible();
    await expect(page.locator('[data-search-result-group="tool"]')).not.toBeVisible();
    const overflow=await page.locator('[data-search-result-group="guide"] .cm-search-result-group-grid').evaluate(el=>getComputedStyle(el).overflowY);
    expect(overflow).toBe('visible');
    await assertNoHorizontalOverflow(page);
  });

  test('[AUTO] mobile exact-guide search opens the Learn tab by default',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/search.html');
    await search(page,'how to make a budget');
    await expect(page.locator('[data-search-result-tab="guide"]')).toHaveAttribute('aria-selected','true');
    await expect(page.locator('[data-search-result-group="guide"]')).toBeVisible();
    await expect(page.locator('[data-search-result-link]').first()).toHaveAttribute('href','/how-to-make-a-budget.html');
  });

  test('[AUTO] Ask fallback cards and visible CTA areas share one real destination',async({page})=>{
    await gotoClean(page,'/ask-carrowmont.html');
    await page.locator('#askQuestion').fill('How to start investing?');
    await page.locator('#askStartBtn').click();
    const card=page.locator('#askUnsupported [data-ask-route-result-link]').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.ask-route-best-match')).toHaveText('Best match');
    const href=await card.getAttribute('href');
    await expect(card.locator('[data-ask-route-action]')).toContainText(/Read article|Open tool|View result/);
    await card.focus(); await expect(card).toBeFocused();
    await Promise.all([page.waitForURL(url=>url.pathname===(href||'')),card.locator('[data-ask-route-action]').click()]);
  });
});
