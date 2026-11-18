import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

test.describe('FRE11 product hierarchy after FRE12 homepage Ask rollback',()=>{
  test('[AUTO] compact Ask entry is visible and the retired embedded Ask form is absent',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/');
    const entry=page.locator('[data-home-ask-entry]');
    await expect(entry).toBeVisible();
    await expect(entry).toHaveAttribute('href','/ask-carrowmont.html');
    await expect(entry).toContainText('Not sure which tool to use?');
    await expect(entry).toContainText('Ask Carrowmont');
    await expect(page.locator('[data-home-decision-entry]')).toHaveCount(0);
    await expect(page.locator('#homeDecisionQuestion')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('[AUTO] full Ask form stays on the Ask page',async({page})=>{
    await gotoClean(page,'/ask-carrowmont.html');
    await expect(page.locator('#askQuestion')).toBeVisible();
    await expect(page.locator('#askPredictive')).toHaveCount(1);
  });

  test('[AUTO] product story and My Carrowmont outcome precede the core tool grid',async({page})=>{
    await gotoClean(page,'/');
    const order=await page.evaluate(()=>{
      const story=document.querySelector('.cm-product-story');
      const preview=document.querySelector('.cm-product-preview-section');
      const tools=document.querySelector('.planning-section');
      const before=(a,b)=>Boolean(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
      return {storyBeforePreview:before(story,preview),previewBeforeTools:before(preview,tools)};
    });
    expect(order).toEqual({storyBeforePreview:true,previewBeforeTools:true});
    await expect(page.locator('[data-homepage-core-grid] [data-tool-id]')).toHaveCount(9);
  });

  test('[AUTO] compact homepage stays mobile-safe',async({page})=>{
    await page.setViewportSize({width:390,height:844});await gotoClean(page,'/');
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('[data-home-ask-entry]')).toBeVisible();
  });
});
