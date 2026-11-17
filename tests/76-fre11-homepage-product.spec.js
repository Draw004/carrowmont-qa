import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const HANDOFF='carrowmont_home_ask_handoff_v1';

function before(a,b){
  return Boolean(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
}

test.describe('FRE11 Homepage & Product Transformation',()=>{
  test('[AUTO] homepage leads with problem-first Ask and keeps the direct-tools alternative',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/');
    const form=page.locator('[data-home-decision-entry]');
    await expect(form).toBeVisible();
    await expect(page.locator('#homeDecisionQuestion')).toBeVisible();
    await expect(form.getByRole('button',{name:/Ask Carrowmont/i})).toBeVisible();
    await expect(page.locator('[data-home-ask-entry]')).toHaveAttribute('href','/ask-carrowmont.html');
    const fallback=page.locator('[data-home-tools-fallback]');
    await expect(fallback).toHaveAttribute('href','/tools.html');
    await expect(fallback).toContainText('Prefer to calculate yourself?');
    await expect(form.locator('.home-decision-suggestions a')).toHaveCount(6);
    await expect(page.locator('[data-homepage-core-grid] [data-tool-id]')).toHaveCount(9);
    expect(errors).toEqual([]);
  });

  test('[AUTO] free-text homepage question reaches Ask without a URL query and the one-time handoff is consumed',async({page})=>{
    const question='I have some extra money. Should I pay down debt or invest it?';
    await gotoClean(page,'/');
    await page.locator('#homeDecisionQuestion').fill(question);
    await page.locator('[data-home-decision-entry]').getByRole('button',{name:/Ask Carrowmont/i}).click();
    await page.waitForURL(url=>url.pathname==='/ask-carrowmont.html');
    const url=new URL(page.url());
    expect(url.pathname).toBe('/ask-carrowmont.html');
    expect(url.search).toBe('');
    await expect(page.locator('#askQuestion')).toHaveValue(question);
    await expect(page.locator('#askQuestionsStage')).toBeVisible();
    await expect.poll(()=>page.evaluate(key=>sessionStorage.getItem(key),HANDOFF)).toBeNull();
  });

  test('[AUTO] guided homepage decisions enter the existing controlled Ask journey',async({page})=>{
    await gotoClean(page,'/');
    const link=page.locator('.home-decision-suggestions a[href="/ask-carrowmont.html?decision=emergency-runway"]');
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/ask-carrowmont\.html\?decision=emergency-runway/);
    await expect(page.locator('#askQuestionsStage')).toBeVisible();
    await expect(page.locator('#askQuestionsTitle')).toContainText(/emergency/i);
  });

  test('[AUTO] product story and My Carrowmont outcome precede the core tool grid',async({page})=>{
    await gotoClean(page,'/');
    const order=await page.evaluate(()=>{
      const story=document.querySelector('.cm-product-story');
      const preview=document.querySelector('.cm-product-preview-section');
      const tools=document.querySelector('.planning-section');
      const follows=(a,b)=>Boolean(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));
      return {storyBeforePreview:follows(story,preview),previewBeforeTools:follows(preview,tools)};
    });
    expect(order).toEqual({storyBeforePreview:true,previewBeforeTools:true});
    await expect(page.locator('.cm-product-preview-section')).toContainText('Illustrative example');
    await expect(page.locator('.planning-section')).toContainText('Prefer to work with the numbers yourself?');
  });

  test('[AUTO] empty homepage question stays local and explains what to do',async({page})=>{
    await gotoClean(page,'/');
    await page.locator('[data-home-decision-entry]').getByRole('button',{name:/Ask Carrowmont/i}).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-home-decision-status]')).toContainText('Tell Carrowmont what you are trying to solve');
    await expect(page.locator('#homeDecisionQuestion')).toBeFocused();
    expect(await page.evaluate(key=>sessionStorage.getItem(key),HANDOFF)).toBeNull();
  });

  test('[AUTO] 390px homepage keeps the problem-first entry usable without horizontal overflow',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/');
    await expect(page.locator('[data-home-decision-entry]')).toBeVisible();
    await expect(page.locator('[data-home-tools-fallback]')).toBeVisible();
    await expect(page.locator('[data-mobile1-quick-tools]')).toBeVisible();
    await expect(page.locator('[data-homepage-core-grid]')).toBeHidden();
    await expect(page.locator('.cm-product-preview-section')).toBeVisible();
    await assertNoHorizontalOverflow(page,'390px FRE11 homepage');
  });
});
