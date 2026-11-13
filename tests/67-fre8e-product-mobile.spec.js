import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';

test.describe('FRE8E product story and mobile-first foundation',()=>{
  test('[AUTO] homepage explains product journey before the core tool grid',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/');
    const story=page.locator('.cm-product-story');const tools=page.locator('.planning-section');
    await expect(story).toBeVisible();await expect(story).toContainText('Plan');await expect(story).toContainText('Keep');await expect(story).toContainText('Track');await expect(story).toContainText('Understand');
    const order=await page.evaluate(()=>{const a=document.querySelector('.cm-product-story'),b=document.querySelector('.planning-section');return !!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));});expect(order).toBeTruthy();expect(errors).toEqual([]);
  });
  test('[AUTO] relationship section remains after core tools and before product preview',async({page})=>{
    await gotoClean(page,'/');const relationship=page.locator('[data-cm-newsletter-context="home"]');const preview=page.locator('.cm-product-preview-section');await expect(relationship).toBeVisible();await expect(preview).toBeVisible();
    const order=await page.evaluate(()=>{const core=document.querySelector('.planning-section'),rel=document.querySelector('[data-cm-newsletter-context="home"]'),preview=document.querySelector('.cm-product-preview-section');return !!(core&&rel&&preview&&(core.compareDocumentPosition(rel)&Node.DOCUMENT_POSITION_FOLLOWING)&&(rel.compareDocumentPosition(preview)&Node.DOCUMENT_POSITION_FOLLOWING));});expect(order).toBeTruthy();
  });
  test('[AUTO] homepage product story and preview are mobile safe',async({page})=>{
    await page.setViewportSize({width:390,height:844});await gotoClean(page,'/');await expect(page.locator('.cm-product-story')).toBeVisible();await expect(page.locator('.cm-product-preview-section')).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(2);
  });
  test('[AUTO] My Carrowmont exposes phone install guidance and manifest',async({page})=>{
    await page.setViewportSize({width:390,height:844});await gotoClean(page,'/my-carrowmont.html');await expect(page.locator('[data-cm-pwa-card]')).toBeVisible();await expect(page.locator('#cmPwaInstallHint')).toContainText(/Add to Home Screen|Install App|Install Carrowmont/);const href=await page.locator('link[rel="manifest"]').getAttribute('href');expect(href).toBe('/carrowmont.webmanifest');const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(2);
  });
});
