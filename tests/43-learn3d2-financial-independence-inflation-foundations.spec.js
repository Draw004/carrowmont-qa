import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES = [
  { path:'/financial-independence-number.html', title:'What is your financial independence number? | Carrowmont', heading:'What is your financial independence number?', cta:'/financial-independence-number-by-spending.html' },
  { path:'/when-can-i-reach-financial-independence.html', title:'When could you reach financial independence? | Carrowmont', heading:'When could you reach financial independence?', cta:'/financial-independence/' },
  { path:'/coast-fire-explained.html', title:'Coast FIRE Explained | Carrowmont', heading:'What is Coast FIRE and how is it different from full financial independence?', cta:'/financial-independence/' },
  { path:'/inflation-value-of-money-over-time.html', title:'Future Value of Money After Inflation | Carrowmont', heading:'What will your money be worth in 10, 20 and 30 years?', cta:'/inflation-calculator/' },
  { path:'/future-cost-of-expenses.html', title:'Future Cost of Monthly Expenses | Carrowmont', heading:'How much will today’s monthly expenses cost in 10, 20 and 30 years?', cta:'/inflation-calculator/' },
  { path:'/inflation-purchasing-power-savings.html', title:'How Inflation Reduces Purchasing Power | Carrowmont', heading:'How much purchasing power can inflation take from your savings?', cta:'/inflation-calculator/' },
  { path:'/inflation-purchasing-power.html', title:'Inflation & purchasing power | Carrowmont', heading:'Inflation changes both future prices and what money can buy.', cta:'/inflation-calculator/' },
  { path:'/todays-money-vs-future-money.html', title:"Today's money vs future money | Carrowmont", heading:"Today's money and future money answer different questions.", cta:'/inflation-calculator/' }
];

function staticTitle(source) {
  return (source.match(/<title>([^<]*)<\/title>/i)?.[1] || '').replace(/&amp;/g,'&').trim();
}

function staticMetaDescription(source) {
  const tag = source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0] || '';
  const match = tag.match(/\bcontent=(["'])(.*?)\1/i);
  return match?.[2]?.trim() || '';
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency}) => window.CarrowmontLocale.setLocale(region,currency), {region,currency});
}

test.describe('LEARN3D-2 financial independence and inflation foundations', () => {
  test('[AUTO] eight guides keep stable identities and add one distinct LEARN3D-2 worked-example and checklist module', async ({ page }) => {
    for (const item of PAGES) {
      const response = await page.request.get(item.path);
      expect(response.ok(), `raw HTML should load for ${item.path}`).toBeTruthy();
      const source = await response.text();
      expect(staticTitle(source)).toBe(item.title);
      const desc = staticMetaDescription(source);
      expect(desc.length, `${item.path} static description too short`).toBeGreaterThanOrEqual(110);
      expect(desc.length, `${item.path} static description too long`).toBeLessThanOrEqual(160);
      expect(source).toContain('"dateModified":"2026-10-21"');

      const errors = monitorPageErrors(page);
      await gotoClean(page,item.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(item.heading);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toHaveCount(1);
      await expect(page.locator(`.guide-action-first a[href="${item.cta}"]`)).toBeVisible();
      await expect(page.locator('article [data-cm-learn3d2="1"]')).toHaveCount(1);
      await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1);
      await expect(page.locator('article [data-cm-learn3d2="1"] h2').filter({hasText:'Worked example:'})).toHaveCount(1);
      await expect(page.locator('article [data-cm-learn3d2="1"] h2').filter({hasText:'Checklist:'})).toHaveCount(1);
      expect(await page.locator('article .guide-table-wrap').count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] older Financial Independence and Inflation Tool-to-Learn journeys remain authoritative', async ({ page }) => {
    for (const path of ['/when-can-i-reach-financial-independence.html','/coast-fire-explained.html']) {
      await gotoClean(page,path);
      await expect(page.locator('.guide-action-first a[href="/financial-independence/"]')).toBeVisible();
      await expect(page.locator('.learn-tool-return a[href="/financial-independence/"]')).toBeVisible();
    }
    for (const path of ['/inflation-value-of-money-over-time.html','/future-cost-of-expenses.html','/inflation-purchasing-power-savings.html','/inflation-purchasing-power.html','/todays-money-vs-future-money.html']) {
      await gotoClean(page,path);
      await expect(page.locator('.guide-action-first a[href="/inflation-calculator/"]')).toBeVisible();
      await expect(page.locator('.learn-tool-return a[href="/inflation-calculator/"]')).toBeVisible();
    }
    await gotoClean(page,'/financial-independence-number.html');
    await expect(page.locator('.guide-action-first a[href="/financial-independence-number-by-spending.html"]')).toBeVisible();
    await expect(page.locator('.learn-tool-return a[href="/financial-independence-number-by-spending.html"]')).toBeVisible();
  });

  test('[AUTO] page-specific lessons stay distinct and avoid false precision', async ({ page }) => {
    await gotoClean(page,'/financial-independence-number.html');
    await expect(page.getByRole('heading',{name:/Separate lifestyle spending from portfolio-funded spending/i})).toBeVisible();
    await expect(page.getByText(/does not identify the date/i).first()).toBeVisible();

    await gotoClean(page,'/when-can-i-reach-financial-independence.html');
    await expect(page.getByRole('heading',{name:/modeled FI date can move/i})).toBeVisible();
    await expect(page.getByText(/planning milestone, not a promised date/i)).toBeVisible();

    await gotoClean(page,'/coast-fire-explained.html');
    await expect(page.getByRole('heading',{name:/present value of a future target/i})).toBeVisible();

    await gotoClean(page,'/inflation-purchasing-power-savings.html');
    await expect(page.getByRole('heading',{name:/balance can rise while its real purchasing power falls/i})).toBeVisible();

    await gotoClean(page,'/todays-money-vs-future-money.html');
    await expect(page.getByText(/error is to mix them/i)).toBeVisible();
  });

  test('[AUTO] representative LEARN3D-2 money examples localize coherently without India-only leakage', async ({ page }) => {
    await gotoClean(page,'/financial-independence-number.html');
    const fiTarget=page.locator('[data-cm-money-inr="30000000"]').first();
    await setLocale(page,'IN','INR'); await expect(fiTarget).toContainText('₹');
    await setLocale(page,'US','USD'); await expect(fiTarget).toContainText('$');
    await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/);

    await gotoClean(page,'/future-cost-of-expenses.html');
    const monthly=page.locator('[data-cm-money-inr="100000"]').first();
    await setLocale(page,'IN','INR'); await expect(monthly).toContainText('₹');
    await setLocale(page,'GB','GBP'); await expect(monthly).toContainText('£');
    await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/);
  });

  test('[AUTO] eight rewritten guides remain overflow-safe at 1280, 390 and 360px', async ({ page }) => {
    for (const width of [1280,390,360]) {
      await page.setViewportSize({width,height:900});
      for (const item of PAGES) {
        await gotoClean(page,item.path);
        await assertNoHorizontalOverflow(page,`${width}px ${item.path}`);
        const wraps=page.locator('.guide-table-wrap');
        if (await wraps.count()) {
          const safe=await wraps.evaluateAll(nodes => nodes.every(n => getComputedStyle(n).overflowX === 'auto' && n.scrollWidth >= n.clientWidth));
          expect(safe).toBeTruthy();
        }
      }
    }
  });
});
