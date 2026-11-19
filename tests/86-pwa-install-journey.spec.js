import { test, expect } from '@playwright/test';
import { gotoClean } from '../helpers/common.js';

test.describe('PWA install journey v6', () => {
  test('first website visit offers a nonblocking install entry and does not repeatedly nag', async ({page}) => {
    // New Playwright contexts already have clean storage. Do not use gotoClean here:
    // its persistent init script clears localStorage on every reload, invalidating this test.
    await page.goto('/', {waitUntil:'domcontentloaded'});
    const offer = page.locator('#cmPwaInstallOffer');
    await expect(offer).toBeVisible();
    await expect(offer).toContainText('No account required');
    await offer.getByRole('button', {name:'Dismiss app installation invitation'}).click();
    await expect(offer).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cm-pwa-install-offer-seen-v1'))).toBe('1');
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#cmPwaInstallOffer')).toHaveCount(0);
  });

  test('native install action is called directly from a user click when the event exists', async ({page}) => {
    await gotoClean(page, '/');
    await page.evaluate(() => {
      window.__cmTestInstallCalls = 0;
      const event = new Event('beforeinstallprompt', {cancelable:true});
      Object.defineProperty(event,'prompt', {value: () => {
        window.__cmTestInstallCalls += 1;
        return Promise.resolve();
      }});
      Object.defineProperty(event,'userChoice', {value: Promise.resolve({outcome:'accepted'})});
      window.dispatchEvent(event);
    });
    await expect(page.locator('#cmPwaOfferButton')).toHaveText('Install Carrowmont');
    await page.locator('#cmPwaOfferButton').click();
    await expect.poll(() => page.evaluate(() => window.__cmTestInstallCalls)).toBe(1);
    await expect(page.locator('#cmPwaInstallOffer')).toHaveCount(0);
  });

  test('My Carrowmont keeps instructions available even without a native prompt', async ({page}) => {
    await gotoClean(page, '/my-carrowmont.html');
    await expect(page.locator('#cmPwaInstallCard')).toBeVisible();
    const button=page.locator('#cmPwaInstallButton');
    await expect(button).toHaveText('How to install');
    await button.click();
    await expect(page.locator('#cmPwaInstallHint')).toContainText(/Chrome|Safari|Edge|browser/i);
  });

  test('detected installed PWA hides the website installation prompt', async ({page}) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator,'getInstalledRelatedApps', {
        configurable:true,
        value: () => Promise.resolve([{platform:'webapp',id:'https://carrowmont.com/my-carrowmont.html'}])
      });
    });
    await gotoClean(page, '/my-carrowmont.html');
    await expect(page.locator('#cmPwaInstallCard')).toBeHidden();
    await gotoClean(page, '/');
    await expect(page.locator('#cmPwaInstallOffer')).toHaveCount(0);
  });

  test('standalone app does not request installation', async ({page}) => {
    await page.addInitScript(() => {
      const original=window.matchMedia.bind(window);
      window.matchMedia=(query) => query==='(display-mode: standalone)' ? {matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}} : original(query);
    });
    await gotoClean(page, '/my-carrowmont.html');
    await expect(page.locator('#cmPwaInstallCard')).toBeHidden();
    await expect(page.locator('#cmPwaInstallShortcut')).toBeHidden();
  });
});
