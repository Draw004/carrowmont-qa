import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES=[
  ['/why-do-stocks-fall-when-bond-yields-rise.html','Why do stocks fall when bond yields rise?','event=yields-rise&cause=inflation&target=broad-stocks'],
  ['/what-happens-to-gold-when-interest-rates-rise.html','What happens to gold when interest rates rise?','event=policy-rate-rise&cause=inflation&target=gold'],
  ['/what-happens-to-gold-when-dollar-rises.html','What happens to gold when the U.S. dollar rises?','event=dollar-strengthens&cause=higher-us-rates&target=gold']
];

test.describe('MCR1 Batch 2 bond yields, equities and gold search cluster',()=>{
  // Protect seven-core homepage while expanding authority content.
  test('[AUTO] three focused pages are substantive canonical Learn articles with reviewed Explorer states',async({page})=>{
    for(const [path,h1,state] of PAGES){
      const errors=monitorPageErrors(page);await gotoClean(page,path);expect(errors).toEqual([]);
      await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toHaveText(h1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com'+path);
      await expect(page.locator('.guide-answer')).toHaveCount(1);await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1);
      await expect(page.locator('text=Frequently asked questions')).toBeVisible();await expect(page.locator('.reference-note')).toHaveCount(1);
      await expect(page.locator(`.guide-action-first a[href="/market-chain-reaction-explorer.html#${state}"]`)).toBeVisible();
      await expect(page.locator('.learn-tool-return')).toHaveCount(1);
      const text=(await page.locator('main').innerText()).replace(/\s+/g,' ');
      expect(text).toMatch(/chain breaker/i);expect(text).not.toMatch(/₹|\blakhs?\b|\bcrores?\b/i);
      expect(text.split(' ').length).toBeGreaterThan(1000);
      expect(text).not.toMatch(/\b(?:buy now|sell now|will definitely|guaranteed return)\b/i);
    }
  });

  test('[AUTO] focused intent ownership is distinct and avoids mechanical market claims',async({page})=>{
    await gotoClean(page,PAGES[0][0]);let text=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    expect(text).toMatch(/mechanical inverse price\/yield relationship/i);expect(text).toMatch(/do not automatically/i);expect(text).toMatch(/reason.*yield|cause.*yield/i);
    await gotoClean(page,PAGES[1][0]);text=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    expect(text).toMatch(/real yields/i);expect(text).toMatch(/policy rate/i);expect(text).toMatch(/opportunity cost/i);
    await gotoClean(page,PAGES[2][0]);text=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    expect(text).toMatch(/local-currency/i);expect(text).toMatch(/not mechanical/i);expect(text).toMatch(/rise together/i);
  });

  test('[AUTO] Learn hub, Explorer and authority pages expose Batch-2 links without changing homepage core tools',async({page})=>{
    await gotoClean(page,'/learn.html');for(const [path] of PAGES)await expect(page.locator(`[data-category="macro"] a[href="${path}"]`)).toHaveCount(1);
    await gotoClean(page,'/market-chain-reaction-explorer.html');for(const [path] of PAGES)await expect(page.locator(`#related-learning a[href="${path}"]`)).toHaveCount(1);
    await gotoClean(page,'/what-happens-when-bond-yields-rise.html');await expect(page.locator('a[href="/why-do-stocks-fall-when-bond-yields-rise.html"]')).toBeVisible();await expect(page.locator('a[href="/what-happens-to-gold-when-interest-rates-rise.html"]')).toBeVisible();
    await gotoClean(page,'/what-happens-when-dollar-strengthens.html');await expect(page.locator('a[href="/what-happens-to-gold-when-dollar-rises.html"]')).toBeVisible();
    await gotoClean(page,'/gold-macro-stress-explorer.html');await expect(page.locator('a[href="/what-happens-to-gold-when-interest-rates-rise.html"]')).toBeVisible();await expect(page.locator('a[href="/what-happens-to-gold-when-dollar-rises.html"]')).toBeVisible();
    await gotoClean(page,'/stocks-vs-bonds.html');await expect(page.locator('a[href="/why-do-stocks-fall-when-bond-yields-rise.html"]')).toBeVisible();
    await gotoClean(page,'/gold-as-an-investment.html');await expect(page.locator('a[href="/what-happens-to-gold-when-interest-rates-rise.html"]')).toBeVisible();
    await gotoClean(page,'/');await expect(page.locator('[data-core-tool-count="7"]')).toHaveCount(1);await expect(page.locator('[data-tool-id="market-chain-reaction"]')).toHaveCount(0);
  });

  test('[AUTO] sitemap publishes exactly the canonical Batch-2 URLs with current release freshness',async({request})=>{
    const xml=await (await request.get('/sitemap.xml')).text();
    for(const [path] of PAGES){expect(xml).toContain(`<loc>https://carrowmont.com${path}</loc><lastmod>2026-10-15</lastmod>`);expect((xml.match(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length).toBe(1);}
    expect(xml).not.toMatch(/<loc>[^<]*#event=/);
  });

  test('[AUTO] Batch-2 pages remain mobile safe at 1280px, 390px and 360px',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:1000});for(const [path] of PAGES){await gotoClean(page,path);await assertNoHorizontalOverflow(page,`${width}px ${path}`);await expect(page.locator('.guide-action-first')).toBeVisible();}}
  });
});
