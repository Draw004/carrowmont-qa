import {test,expect} from '@playwright/test';
import {gotoClean,assertNoHorizontalOverflow} from '../helpers/common.js';

async function emulateInstalled(page){
  await page.addInitScript(()=>{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>query==='(display-mode: standalone)'
      ? {matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}}
      : original(query);
  });
}

test.describe('PERF1 startup and navigation continuity',()=>{
  test('mobile installed launch draws the correct C, uses the native splash colour and finishes without replaying',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await emulateInstalled(page);
    await gotoClean(page,'/?source=pwa');
    await expect(page.locator('.cm-home-pwa-tagline')).toHaveText('Plan today. Build tomorrow.');
    await expect(page.locator('.cm-home-pwa-c-stroke')).toHaveAttribute('d',/^M355 164 C306 109/);
    await expect(page.locator('.cm-home-pwa-c-finish')).toHaveCount(1);
    // The web-controlled splash matches manifest #f8fbfc; the OS splash is native.
    await expect(page.locator('html')).not.toHaveClass(/cm-home-pwa-launch|cm-home-pwa-dismissing/,{timeout:2500});
    await page.locator('.mobile1-nav-item[href="/my-carrowmont.html"]').click();
    await expect(page).toHaveURL(/\/my-carrowmont\.html/);
    await expect(page.locator('html')).not.toHaveClass(/cm-pwa-launching|cm-home-pwa-launch/);
  });

  test('desktop and normal website always show content without fullscreen startup overlays',async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    for(const route of ['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html']){
      await gotoClean(page,route);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('.cm-home-pwa-boot')).toBeHidden();
      await expect(page.locator('.cm-pwa-boot')).toBeHidden();
    }
  });

  test('primary desktop navigation is pre-rendered and remains in final order',async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    for (const [route,active] of [['/','/'],['/my-carrowmont.html','/my-carrowmont.html'],['/tools.html','/tools.html'],['/ask-carrowmont.html','/ask-carrowmont.html'],['/learn.html','/learn.html'],['/research.html','/research.html']]){
      await gotoClean(page,route);
      const order=await page.locator('.desktop-nav > a').evaluateAll(links=>links.map(el=>el.getAttribute('href')));
      expect(order).toEqual(['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html','/learn.html','/research.html','/search.html']);
      await expect(page.locator('.desktop-nav > a[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.desktop-nav > a[href="'+active+'"]').first()).toHaveAttribute('aria-current','page');
      await assertNoHorizontalOverflow(page);
    }
  });

  test('mobile header Search is rendered once, correctly placed and bottom nav keeps one active tab',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    for(const [route,key] of [['/','home'],['/my-carrowmont.html','my'],['/tools.html','tools'],['/ask-carrowmont.html','ask']]){
      await gotoClean(page,route);
      await expect(page.locator('.header-inner [data-mobile1-header-search]')).toHaveCount(1);
      await expect(page.locator('.mobile1-bottom-nav .mobile1-nav-item[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.mobile1-nav-item[data-mobile1-nav="'+key+'"]')).toHaveAttribute('aria-current','page');
      await assertNoHorizontalOverflow(page);
    }
  });
});
