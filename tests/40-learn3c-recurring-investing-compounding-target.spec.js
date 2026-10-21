import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES = [
  { path:'/10000-sip-returns.html', title:'Monthly Investment Growth Over Time | Carrowmont', runtimeHeading:'Monthly Investment for 10, 15, 20 and 25 years: What could it grow to?', cta:'/sip-calculator/' },
  { path:'/sip-for-1-crore.html', title:'Monthly Investment for a Long-Term Target | Carrowmont', runtimeHeading:'How much Monthly Investment is needed to build', cta:'/sip-calculator/' },
  { path:'/step-up-sip-vs-regular-sip.html', title:'Increasing vs Fixed Monthly Investing | Carrowmont', runtimeHeading:'Increasing Monthly Investment vs Fixed Monthly Investment: What changes?', cta:'/sip-calculator/' },
  { path:'/compound-interest-monthly-contributions.html', title:'Compound Interest With Monthly Contributions | Carrowmont', runtimeHeading:'How does compound interest work with monthly contributions?', cta:'/sip-calculator/' },
  { path:'/investment-time-to-target.html', title:'How Long to Reach an Investment Target | Carrowmont', runtimeHeading:'How long could it take to reach your investment target?', cta:'/sip-calculator/' },
  { path:'/starting-investing-earlier.html', title:'Why Starting to Invest Earlier Matters | Carrowmont', runtimeHeading:'How much difference can starting 5 or 10 years earlier make?', cta:'/sip-calculator/' },
  { path:'/sip-during-market-fall.html', title:'Recurring Investing During a Market Fall | Carrowmont', runtimeHeading:'What happens to recurring investments when markets fall?', cta:'/sip-calculator/' }
];

function staticMetaDescription(source) {
  const tag = source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0] || '';
  return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() || '';
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency}) => window.CarrowmontLocale.setLocale(region,currency), {region,currency});
}

test.describe('LEARN3C-1 recurring investing, compounding and target timing', () => {
  test('[AUTO] seven guides keep stable identities and add useful depth, checklists and trust signals', async ({ page }) => {
    for (const item of PAGES) {
      const sourceResponse = await page.request.get(item.path);
      expect(sourceResponse.ok(), `raw HTML should load for ${item.path}`).toBeTruthy();
      const source = await sourceResponse.text();
      expect(source, `static search title should remain stable for ${item.path}`).toContain(`<title>${item.title}</title>`);
      const sourceDesc = staticMetaDescription(source);
      expect(sourceDesc.length, `static meta description should be at least 110 characters for ${item.path}; got ${sourceDesc.length}: ${sourceDesc}`).toBeGreaterThanOrEqual(110);
      expect(sourceDesc.length, `static meta description should stay within 160 characters for ${item.path}; got ${sourceDesc.length}: ${sourceDesc}`).toBeLessThanOrEqual(160);

      const errors = monitorPageErrors(page);
      await gotoClean(page, item.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(item.runtimeHeading);
      const runtimeTitle = await page.title();
      const runtimeH1 = (await page.locator('h1').textContent() || '').trim();
      expect(runtimeTitle).toContain('Carrowmont');
      expect(runtimeTitle, `runtime title colon capitalization for ${item.path}`).not.toMatch(/:\s*[a-z]/);
      expect(runtimeH1, `runtime H1 colon capitalization for ${item.path}`).not.toMatch(/:\s*[a-z]/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toBeVisible();
      await expect(page.locator(`.guide-action-first a[href="${item.cta}"]`)).toBeVisible();
      await expect(page.locator('.article-meta a[href="/editorial-policy.html"]')).toBeVisible();
      await expect(page.locator('article h2').filter({hasText:'Checklist:'})).toHaveCount(1);
      expect(await page.locator('article .guide-table-wrap').count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      await expect(page.locator('article [data-cm-learn3c1="1"]')).toBeVisible();
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] investment localization remains global while SIP stays available for India', async ({ page }) => {
    await gotoClean(page,'/10000-sip-returns.html');
    const amount=page.locator('[data-cm-money-inr="10000"]').first();
    await setLocale(page,'IN','INR'); await expect(amount).toContainText('₹');
    await setLocale(page,'US','USD'); await expect(amount).toContainText('$');

    await gotoClean(page,'/sip-during-market-fall.html');
    const term=page.locator('[data-cm-term="sip"]').first();
    await setLocale(page,'IN','INR'); await expect(term).toHaveText('SIP');
    await setLocale(page,'AU','AUD'); await expect(term).toHaveText('recurring investment plan');
  });

  test('[AUTO] seven rewritten guides remain overflow-safe at 1280, 390 and 360px', async ({ page }) => {
    for (const width of [1280,390,360]) {
      await page.setViewportSize({width,height:900});
      for (const item of PAGES) {
        await gotoClean(page,item.path);
        await assertNoHorizontalOverflow(page, `${width}px ${item.path}`);
        const safe=await page.locator('.guide-table-wrap').evaluateAll(nodes => nodes.every(n => getComputedStyle(n).overflowX === 'auto' && n.scrollWidth >= n.clientWidth));
        expect(safe).toBeTruthy();
      }
    }
  });
});
