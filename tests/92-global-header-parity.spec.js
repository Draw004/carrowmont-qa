import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';
const TOOL='/budget-cash-flow-planner/credit-card-payoff-calculator.html';
const primary=['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html','/learn.html','/research.html','/search.html'];

test.describe('Canonical global header across site and decision tools', () => {
  test('[AUTO] main site and credit card decision share all seven global destinations in the same order', async ({ page }) => {
    await gotoClean(page,'/');
    const main=await page.locator('header .desktop-nav > a').evaluateAll(els => els.map(a=>a.getAttribute('href')));
    expect(main).toEqual(primary);
    await gotoClean(page,TOOL);
    const tool=await page.locator('.cm-global-nav > a').evaluateAll(els => els.map(a=>a.getAttribute('href')));
    expect(tool).toEqual(main);
    await expect(page.locator('.cm-global-nav a[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('.cm-global-nav a[aria-current="page"]')).toHaveAttribute('href','/tools.html');
    await expect(page.locator('.cm-global-nav a[href="/search.html"]')).toBeVisible();
    await expect(page.locator('#localeSummary')).toBeVisible();
  });
  test('[AUTO] mobile tool header mirrors Home / My Money / Ask / Tools / More, one active Tools state', async ({ page }) => {
    await page.setViewportSize({width:360,height:780});
    await gotoClean(page,TOOL);
    await expect(page.locator('.cm-global-mobile-search')).toBeVisible();
    await expect(page.locator('.cm-global-nav')).toBeHidden();
    await expect(page.locator('.cm-global-bottom-nav')).toBeVisible();
    await expect(page.locator('.cm-global-bottom-nav a[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('.cm-global-bottom-nav a[aria-current="page"]')).toHaveAttribute('href','/tools.html');
    await assertNoHorizontalOverflow(page,'credit card global header at 360px');
    await page.locator('.cm-global-more summary').click();
    await expect(page.locator('.cm-global-more-panel a[href="/learn.html"]')).toBeVisible();
  });
  test('[AUTO] header has no layout jump, locale label remains current and methodology opens', async ({ page }) => {
    await gotoClean(page,TOOL);
    const h=await page.locator('header.cm-global-header').evaluate(el=>el.getBoundingClientRect().height);
    await expect(page.locator('#localeCurrent')).not.toBeEmpty();
    await page.locator('.cm-tool-context-method').click();
    await expect(page.locator('#methodology details')).toHaveAttribute('open','');
    const after=await page.locator('header.cm-global-header').evaluate(el=>el.getBoundingClientRect().height);
    expect(Math.abs(h-after)).toBeLessThan(1);
    await expect(page.locator('#payoff-methodology')).toBeVisible();
  });
});
