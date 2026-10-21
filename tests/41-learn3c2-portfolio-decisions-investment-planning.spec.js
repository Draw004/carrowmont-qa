import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES = [
  { path:'/lump-sum-vs-monthly-investing.html', title:'Lump Sum vs Monthly Investing | Carrowmont', heading:'Lump sum vs monthly investing: How does timing change the maths?', cta:'/sip-calculator/' },
  { path:'/compounding-and-time.html', title:'Compounding &amp; time | Carrowmont', heading:'Compounding makes time an important part of every long-term projection.', cta:'/compound-interest-calculator/' },
  { path:'/asset-allocation-explained.html', title:'What Is Asset Allocation? How It Works | Carrowmont', heading:'What is asset allocation, and why does it matter?', cta:'/retirement-calculator/' },
  { path:'/diversification-across-asset-classes.html', title:'Diversification Across Asset Classes | Carrowmont', heading:'What does diversification across asset classes actually mean?', cta:'/financial-independence/' },
  { path:'/stocks-vs-bonds.html', title:'Stocks vs bonds: What is the difference? | Carrowmont', heading:'Stocks vs bonds: What is the difference?', cta:'/retirement-calculator/' },
  { path:'/how-much-should-i-invest-each-month.html', title:'How Much Should You Invest Each Month? | Carrowmont', heading:'How much should you invest each month to reach a financial goal?', cta:'/goal-planner/' }
];

function staticMetaDescription(source) {
  const tag = source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0] || '';
  return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() || '';
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency}) => window.CarrowmontLocale.setLocale(region,currency), {region,currency});
}

test.describe('LEARN3C-2 portfolio decisions and investment planning', () => {
  test('[AUTO] six guides keep stable search identities, established tool journeys and useful editorial depth', async ({ page }) => {
    for (const item of PAGES) {
      const sourceResponse = await page.request.get(item.path);
      expect(sourceResponse.ok(), `raw HTML should load for ${item.path}`).toBeTruthy();
      const source = await sourceResponse.text();
      expect(source).toContain(`<title>${item.title}</title>`);
      const desc = staticMetaDescription(source);
      expect(desc.length, `${item.path} static description too short`).toBeGreaterThanOrEqual(110);
      expect(desc.length, `${item.path} static description too long`).toBeLessThanOrEqual(160);

      const errors = monitorPageErrors(page);
      await gotoClean(page,item.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(item.heading);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toHaveCount(1);
      await expect(page.locator(`.guide-action-first a[href="${item.cta}"]`)).toBeVisible();
      await expect(page.locator('.article-meta a[href="/editorial-policy.html"]')).toBeVisible();
      await expect(page.locator('article [data-cm-learn3c2="1"]')).toBeVisible();
      await expect(page.locator('article h2').filter({hasText:'Checklist:'})).toHaveCount(1);
      expect(await page.locator('article .guide-table-wrap').count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] page-specific lessons stay distinct and preserve older protected Carrowmont journeys', async ({ page }) => {
    await gotoClean(page,'/lump-sum-vs-monthly-investing.html');
    await expect(page.getByText(/cash already exists/i).first()).toBeVisible();
    await expect(page.getByText(/uninvested cash/i).first()).toBeVisible();
    await expect(page.getByRole('link',{name:/investing for beginners/i}).first()).toBeVisible();

    await gotoClean(page,'/compounding-and-time.html');
    await expect(page.getByRole('heading',{name:/Fees compound too/i})).toBeVisible();
    await expect(page.getByRole('heading',{name:/Inflation compounds/i})).toBeVisible();
    await expect(page.locator('.guide-action-first a[href="/compound-interest-calculator/"]')).toBeVisible();

    await gotoClean(page,'/asset-allocation-explained.html');
    await expect(page.getByRole('heading',{name:/Risk tolerance and risk capacity are not the same/i})).toBeVisible();
    await expect(page.getByRole('heading',{name:/Rebalancing is maintenance, not a market forecast/i})).toBeVisible();

    await gotoClean(page,'/diversification-across-asset-classes.html');
    await expect(page.getByRole('heading',{name:/number of holdings can be misleading/i})).toBeVisible();
    await expect(page.getByRole('link',{name:'Asset allocation',exact:true}).first()).toBeVisible();
    await expect(page.locator('.guide-action-first a[href="/financial-independence/"]')).toBeVisible();

    await gotoClean(page,'/stocks-vs-bonds.html');
    await expect(page.getByRole('heading',{name:/Duration is a useful measure/i})).toBeVisible();
    await expect(page.locator('a[href="/why-do-stocks-fall-when-bond-yields-rise.html"]').first()).toBeVisible();

    await gotoClean(page,'/how-much-should-i-invest-each-month.html');
    await expect(page.getByText(/monthly amount is an output/i).first()).toBeVisible();
    await expect(page.locator('.guide-action-first a[href="/goal-planner/"]')).toBeVisible();
    await expect(page.getByRole('heading',{name:/Three levers solve most funding gaps/i})).toBeVisible();
  });

  test('[AUTO] localized worked examples remain coherent without changing the universal lesson', async ({ page }) => {
    await gotoClean(page,'/lump-sum-vs-monthly-investing.html');
    const lumpAmount=page.locator('[data-cm-money-inr="1200000"]').first();
    await setLocale(page,'IN','INR'); await expect(lumpAmount).toContainText('₹');
    await setLocale(page,'US','USD'); await expect(lumpAmount).toContainText('$');
    await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/);

    await gotoClean(page,'/how-much-should-i-invest-each-month.html');
    const target=page.locator('[data-cm-money-inr="2500000"]').first();
    await setLocale(page,'IN','INR'); await expect(target).toContainText('₹');
    await setLocale(page,'AU','AUD'); await expect(target).toContainText('$');
    await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/);
  });

  test('[AUTO] six rewritten guides remain overflow-safe at 1280, 390 and 360px', async ({ page }) => {
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
