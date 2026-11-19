import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

const PAGE = '/budget-cash-flow-planner/credit-card-payoff-calculator.html';
const MULTI = '/budget-cash-flow-planner/debt-payoff-calculator.html';

test.describe('FRE12B-1 Credit Card Decisions UX consolidation', () => {
  test('[AUTO] the first transfer link click selects and scrolls to visible inputs', async ({page}) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PAGE);
    await expect(page.locator('#tab-payoff')).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#balance-transfer')).toBeHidden();
    await page.locator('.bt-intro-link a').click();
    await expect(page).toHaveURL(/#balance-transfer$/);
    await expect(page.locator('#tab-transfer')).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#btForm')).toBeVisible();
    await expect(page.locator('#payoff')).toBeHidden();
    await expect.poll(async () => page.locator('#btInputHeading').evaluate(el => {
      const box=el.getBoundingClientRect(); return box.top >= 0 && box.top < innerHeight;
    })).toBe(true);
    expect(errors).toEqual([]);
  });

  test('[AUTO] direct transfer link, reload, Back and mode tabs keep one visible comparison', async ({page}) => {
    await gotoClean(page, PAGE+'#balance-transfer');
    await expect(page.locator('#btSummary')).toContainText('transferring costs less');
    await page.reload();
    await expect(page.locator('#tab-transfer')).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#payoff')).toBeHidden();
    await page.locator('#tab-payoff').click();
    await expect(page.locator('#payoff')).toBeVisible();
    await expect(page.locator('#balance-transfer')).toBeHidden();
    await page.goBack();
    await expect(page.locator('#btForm')).toBeVisible();
    await expect(page.locator('#tab-transfer')).toHaveAttribute('aria-selected','true');
  });

  test('[AUTO] common balance APR and monthly payment follow the selected mode without saving what-if values', async ({page}) => {
    await gotoClean(page, PAGE);
    await page.locator('#balance').fill('7000');
    await page.locator('#apr').fill('19');
    await page.locator('#planned').fill('350');
    await page.locator('#tab-transfer').click();
    await expect(page.locator('#btBalance')).toHaveValue('7000');
    await expect(page.locator('#btCurrentApr')).toHaveValue('19');
    await expect(page.locator('#btPayment')).toHaveValue('350');
    await page.locator('#btPayment').fill('450');
    await page.locator('#tab-payoff').click();
    await expect(page.locator('#planned')).toHaveValue('450');
  });

  test('[AUTO] canonical country selector, unique IDs and methodology work in both modes', async ({page}) => {
    await gotoClean(page, PAGE);
    await expect(page.locator('#localeSummary .locale-globe svg')).toBeVisible();
    await expect(page.locator('#localeSummary .locale-chevron svg')).toBeVisible();
    await expect(page.locator('#localeSummary')).toHaveAttribute('aria-label','Choose country and currency');
    const duplicateIds = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map(x=>x.id);
      return ids.filter((id,i)=>ids.indexOf(id)!==i);
    });
    expect(duplicateIds).toEqual([]);
    await page.locator('.top-nav a[href="#methodology"]').click();
    await expect(page.locator('#methodology details')).toHaveAttribute('open','');
    await expect(page.locator('#payoff-methodology')).toBeVisible();
    await page.locator('#tab-transfer').click();
    await expect(page.locator('#transfer-methodology')).toBeVisible();
    await expect(page.locator('#payoff-methodology')).toBeHidden();
  });

  test('[AUTO] multiple-debts navigation supplies a reliable return route', async ({page}) => {
    await gotoClean(page, PAGE);
    await page.locator('a[href="/budget-cash-flow-planner/debt-payoff-calculator.html?from=credit-card"]').click();
    await expect(page).toHaveURL(/debt-payoff-calculator\.html\?from=credit-card/);
    await expect(page.locator('#creditCardReturnLink')).toBeVisible();
    await page.locator('#creditCardReturnLink').click();
    await expect(page).toHaveURL(/credit-card-payoff-calculator\.html#payoff/);
    await expect(page.locator('#payoff')).toBeVisible();
  });

  test('[AUTO] selected comparison only is printable; 360px mobile has no horizontal overflow', async ({page}) => {
    await page.setViewportSize({width:360,height:780});
    await gotoClean(page, PAGE+'#balance-transfer');
    await assertNoHorizontalOverflow(page, 'credit-card decisions mobile');
    await page.emulateMedia({media:'print'});
    const printStyle = await page.evaluate(() => ({
      inactive:getComputedStyle(document.getElementById('payoff')).display,
      active:getComputedStyle(document.getElementById('balance-transfer')).display,
      header:getComputedStyle(document.querySelector('.site-header')).display
    }));
    expect(printStyle.inactive).toBe('none');
    expect(printStyle.active).not.toBe('none');
    expect(printStyle.header).toBe('none');
  });
});
