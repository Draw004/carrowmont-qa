import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES = [
  { path:'/retirement-savings-by-age.html', title:'Retirement Savings by Age: 30, 40, 50 and 60 | Carrowmont', heading:'How much should you have saved for retirement by 30, 40, 50 and 60?', cta:'/retirement-calculator/' },
  { path:'/retirement-monthly-income-needed.html', title:'Monthly Income Needed in Retirement | Carrowmont', heading:'How much monthly income will you need in retirement?', cta:'/retirement-calculator/' },
  { path:'/retirement-expenses.html', title:'How retirement expenses may change | Carrowmont', heading:"Retirement spending is not simply today's budget plus inflation.", cta:'/retirement-calculator/' },
  { path:'/inflation-and-retirement-planning.html', title:'Inflation and Retirement Planning | Carrowmont', heading:'How does inflation change the retirement amount you need?', cta:'/retirement-calculator/' },
  { path:'/how-long-will-retirement-savings-last.html', title:'How long could your retirement savings last? | Carrowmont', heading:'How long could your retirement savings last?', cta:'/retirement-calculator/' },
  { path:'/4-percent-rule-retirement.html', title:'The 4% Rule in Retirement: Meaning and Limits | Carrowmont', heading:'What is the 4% rule in retirement, and what are its limits?', cta:'/4-percent-rule-stress-test.html' },
  { path:'/sequence-of-returns-risk.html', title:'Sequence-of-Returns Risk in Retirement | Carrowmont', heading:'What is sequence-of-returns risk in retirement?', cta:'/4-percent-rule-stress-test.html' },
  { path:'/longevity-risk-retirement.html', title:'Longevity Risk in Retirement: Why Time Matters | Carrowmont', heading:'What is longevity risk and why does retirement length matter?', cta:'/financial-independence/' }
];

function staticMetaDescription(source) {
  const tag = source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0] || '';
  return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() || '';
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency}) => window.CarrowmontLocale.setLocale(region,currency), {region,currency});
}

test.describe('LEARN3D-1 retirement readiness, income and withdrawal risk', () => {
  test('[AUTO] eight guides keep stable search identities, direct answers, worked examples and review checklists', async ({ page }) => {
    for (const item of PAGES) {
      const response = await page.request.get(item.path);
      expect(response.ok(), `raw HTML should load for ${item.path}`).toBeTruthy();
      const source = await response.text();
      expect(source).toContain(`<title>${item.title}</title>`);
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
      await expect(page.locator('article [data-cm-learn3d1="1"]')).toHaveCount(1);
      await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1);
      await expect(page.locator('article [data-cm-learn3d1="1"] h2').filter({hasText:'Worked example:'})).toHaveCount(1);
      await expect(page.locator('article [data-cm-learn3d1="1"] h2').filter({hasText:'Checklist:'})).toHaveCount(1);
      expect(await page.locator('article .guide-table-wrap').count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] older Tool-to-Learn and withdrawal journeys remain intact', async ({ page }) => {
    for (const path of ['/retirement-expenses.html','/how-long-will-retirement-savings-last.html','/inflation-and-retirement-planning.html']) {
      await gotoClean(page,path);
      await expect(page.locator('.guide-action-first a[href="/retirement-calculator/"]')).toBeVisible();
      await expect(page.locator('.learn-tool-return a[href="/retirement-calculator/"]')).toBeVisible();
    }
    await gotoClean(page,'/longevity-risk-retirement.html');
    await expect(page.locator('.guide-action-first a[href="/financial-independence/"]')).toBeVisible();
    await expect(page.locator('.learn-tool-return a[href="/financial-independence/"]')).toBeVisible();

    await gotoClean(page,'/4-percent-rule-retirement.html');
    await expect(page.locator('.guide-action-first a[href="/4-percent-rule-stress-test.html"]')).toBeVisible();
    await expect(page.locator('a[href="/retirement-calculator/withdrawal-calculator.html"]').first()).toBeVisible();

    await gotoClean(page,'/sequence-of-returns-risk.html');
    await expect(page.locator('.guide-action-first a[href="/4-percent-rule-stress-test.html"]')).toBeVisible();
    await expect(page.locator('a[href="/retirement-calculator/withdrawal-calculator.html"]').first()).toBeVisible();
  });

  test('[AUTO] key retirement lessons remain distinct and avoid promise language', async ({ page }) => {
    await gotoClean(page,'/retirement-savings-by-age.html');
    await expect(page.getByRole('heading',{name:/benchmark can point one way/i})).toBeVisible();
    await expect(page.getByText(/checkpoints, not pass\/fail/i).first()).toBeVisible();

    await gotoClean(page,'/retirement-monthly-income-needed.html');
    await expect(page.getByRole('heading',{name:/Build the monthly need from the bottom up/i})).toBeVisible();

    await gotoClean(page,'/inflation-and-retirement-planning.html');
    await expect(page.getByRole('heading',{name:/Inflation acts before and after retirement/i})).toBeVisible();
    await expect(page.getByRole('heading',{name:/Nominal return and real return answer different questions/i})).toBeVisible();

    await gotoClean(page,'/4-percent-rule-retirement.html');
    await expect(page.getByText(/would not simply recalculate 4%/i)).toBeVisible();

    await gotoClean(page,'/sequence-of-returns-risk.html');
    await expect(page.getByRole('heading',{name:/same five returns, reversed/i})).toBeVisible();

    await gotoClean(page,'/longevity-risk-retirement.html');
    await expect(page.getByText(/not a retirement target/i)).toBeVisible();
  });

  test('[AUTO] representative money examples localize coherently without leaking INR-only wording', async ({ page }) => {
    await gotoClean(page,'/retirement-monthly-income-needed.html');
    const monthly=page.locator('[data-cm-money-inr="120000"]').first();
    await setLocale(page,'IN','INR'); await expect(monthly).toContainText('₹');
    await setLocale(page,'US','USD'); await expect(monthly).toContainText('$');
    await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/);

    await gotoClean(page,'/4-percent-rule-retirement.html');
    const portfolio=page.locator('[data-cm-money-inr="10000000"]').first();
    await setLocale(page,'IN','INR'); await expect(portfolio).toContainText('₹');
    await setLocale(page,'GB','GBP'); await expect(portfolio).toContainText('£');
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
