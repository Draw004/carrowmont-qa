import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

async function setStandalone(page) {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === '(display-mode: standalone)'
      ? {matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}}
      : nativeMatchMedia(query);
  });
}

test.describe('Installed app and normal website behaviour contract', () => {
  test('mobile installed app opens Home with complete approved Draw the C and exact tagline', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await setStandalone(page);
    await gotoClean(page,'/?source=pwa');
    await expect(page).toHaveURL(/\/\?source=pwa$/);
    await expect(page.locator('.cm-home-pwa-tagline')).toHaveText('Plan today. Build tomorrow.');
    await expect(page.locator('.cm-home-pwa-c-stroke')).toHaveAttribute('d',/^M355 164 C306 109/);
    await expect(page.locator('.cm-home-pwa-c-finish')).toHaveCount(1);
    await expect(page.locator('html')).not.toHaveClass(/cm-home-pwa-launch/,{timeout:2500});
    await expect(page.locator('main')).toBeVisible();
    await page.locator('.mobile1-nav-item[href="/my-carrowmont.html"]').click();
    await expect(page).toHaveURL(/\/my-carrowmont\.html(?:[?#]|$)/);
    await expect(page.locator('.cm-pwa-boot')).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/cm-pwa-launching/);
    await assertNoHorizontalOverflow(page);
  });

  test('legacy installed icon URL is redirected to Home; normal My Carrowmont visits are not', async ({page}) => {
    await page.setViewportSize({width:390,height:844}); await setStandalone(page);
    await gotoClean(page,'/my-carrowmont.html?source=pwa');
    await expect(page).toHaveURL(/\/\?source=pwa$/);
    await gotoClean(page,'/my-carrowmont.html');
    await expect(page).toHaveURL(/\/my-carrowmont\.html$/);
    await expect(page.locator('.cm-pwa-boot')).toBeHidden();
  });

  test('desktop installed app shows Home immediately and never a full-screen overlay', async ({page}) => {
    await page.setViewportSize({width:1440,height:900}); await setStandalone(page);
    await gotoClean(page,'/?source=pwa');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.cm-home-pwa-boot')).toBeHidden();
    await page.locator('.desktop-nav a[href="/my-carrowmont.html"]').click();
    await expect(page).toHaveURL(/\/my-carrowmont\.html(?:[?#]|$)/);
    await expect(page.locator('.cm-pwa-boot')).toBeHidden();
    await expect(page.locator('[data-cm-pwa-card]')).toBeHidden();
  });

  test('desktop browser Home, Ask, Tools and My Carrowmont have exactly one active tab', async ({page}) => {
    await page.setViewportSize({width:1440,height:900});
    for (const [url,active] of [['/','/'],['/ask-carrowmont.html','/ask-carrowmont.html'],['/tools.html','/tools.html'],['/my-carrowmont.html','/my-carrowmont.html']]) {
      await gotoClean(page,url);
      const links=page.locator('.desktop-nav a[aria-current="page"]');
      await expect(links).toHaveCount(1);
      await expect(page.locator('.desktop-nav a[href="'+active+'"]')).toHaveAttribute('aria-current','page');
      if(active!=='/ask-carrowmont.html'){
        await expect(page.locator('.desktop-nav .site-ask-link')).not.toHaveAttribute('aria-current','page');
        const askColor=await page.locator('.desktop-nav .site-ask-link').evaluate(el=>getComputedStyle(el).color);
        const currentColor=await page.locator('.desktop-nav a[aria-current="page"]').evaluate(el=>getComputedStyle(el).color);
        expect(askColor).not.toBe(currentColor);
      }
    }
    await gotoClean(page,'/my-carrowmont.html');
    await expect(page.locator('[data-cm-pwa-card]')).toBeVisible();
  });

  test('mobile bottom tab has a single active route; Search is distinct', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    for(const [url,key] of [['/','home'],['/my-carrowmont.html','my'],['/ask-carrowmont.html','ask'],['/tools.html','tools'],['/learn.html','more']]){
      await gotoClean(page,url);
      await expect(page.locator('.mobile1-bottom-nav .mobile1-nav-item[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.mobile1-nav-item[data-mobile1-nav="'+key+'"]')).toHaveAttribute('aria-current','page');
    }
    await gotoClean(page,'/search.html');
    await expect(page.locator('.mobile1-bottom-nav .mobile1-nav-item[aria-current="page"]')).toHaveCount(0);
    await expect(page.locator('.mobile1-header-search[aria-current="page"]')).toHaveCount(1);
  });
});
