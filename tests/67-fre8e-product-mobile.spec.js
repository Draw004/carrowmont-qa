import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';

test.describe('FRE8E product story and mobile-first foundation',()=>{
  test('[AUTO] homepage explains product journey before the core tool grid',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/');
    const story=page.locator('.cm-product-story');const tools=page.locator('.planning-section');
    await expect(story).toBeVisible();await expect(story).toContainText('Plan');await expect(story).toContainText('Keep');await expect(story).toContainText('Track');await expect(story).toContainText('Understand');await expect(story.locator('.cm-product-journey')).toBeVisible();await expect(story.locator('.cm-product-stage')).toHaveCount(4);await expect(story.locator('.cm-journey-node svg')).toHaveCount(4);await expect(story.locator('.cm-product-step')).toHaveCount(0);
    const order=await page.evaluate(()=>{const a=document.querySelector('.cm-product-story'),b=document.querySelector('.planning-section');return !!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));});expect(order).toBeTruthy();expect(errors).toEqual([]);
  });
  test('[AUTO] homepage keeps one My Carrowmont showcase and a separate newsletter',async({page})=>{
    await gotoClean(page,'/');const newsletter=page.locator('[data-cm-newsletter-context="home"]');const preview=page.locator('.cm-product-preview-section');const authority=page.locator('.authority-tools-section');await expect(newsletter).toBeVisible();await expect(preview).toBeVisible();await expect(page.locator('[data-cm-home-mycarrowmont]')).toHaveCount(0);await expect(page.locator('.trust-strip')).toHaveCount(0);await expect(page.locator('.about-preview .approach-item')).toHaveCount(3);
    const order=await page.evaluate(()=>{const preview=document.querySelector('.cm-product-preview-section'),newsletter=document.querySelector('[data-cm-newsletter-context="home"]'),authority=document.querySelector('.authority-tools-section');return !!(preview&&newsletter&&authority&&(preview.compareDocumentPosition(newsletter)&Node.DOCUMENT_POSITION_FOLLOWING)&&(newsletter.compareDocumentPosition(authority)&Node.DOCUMENT_POSITION_FOLLOWING));});expect(order).toBeTruthy();
  });
  test('[AUTO] homepage product story and preview are mobile safe',async({page})=>{
    await page.setViewportSize({width:390,height:844});await gotoClean(page,'/');await expect(page.locator('.cm-product-story')).toBeVisible();await expect(page.locator('.cm-product-preview-section')).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(2);
  });
  test('[AUTO] My Carrowmont reuses the canonical country and currency control',async({page})=>{
    await gotoClean(page,'/');const homeSummary=page.locator('.locale-summary').first();const homeMarkup=await homeSummary.evaluate(el=>el.innerHTML.replace(/\s+/g,' ').trim());const homeText=await homeSummary.innerText();
    await gotoClean(page,'/my-carrowmont.html');const summary=page.locator('.locale-summary').first();const myMarkup=await summary.evaluate(el=>el.innerHTML.replace(/\s+/g,' ').trim());expect(myMarkup).toBe(homeMarkup);await expect(summary.locator('.locale-icon svg')).toHaveCount(1);await expect(summary.locator('.chevron svg')).toHaveCount(1);const myText=await summary.innerText();expect(myText.replace(/\s+/g,' ').trim()).toBe(homeText.replace(/\s+/g,' ').trim());expect(myText).toMatch(/\S.+\s*·\s*[A-Z]{3}/);
  });
  test('[AUTO] My Carrowmont exposes phone install guidance and manifest',async({page})=>{
    await page.setViewportSize({width:390,height:844});await gotoClean(page,'/my-carrowmont.html');await expect(page.locator('[data-cm-pwa-card]')).toBeVisible();await expect(page.locator('#cmPwaInstallHint')).toContainText(/Add to Home Screen|Install App|Install Carrowmont/);const href=await page.locator('link[rel="manifest"]').getAttribute('href');expect(href).toBe('/carrowmont.webmanifest');const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(2);
  });
});
