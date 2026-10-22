import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const MACRO_FIXED = [
  '/what-happens-when-bond-yields-rise.html','/why-do-stocks-fall-when-bond-yields-rise.html','/what-happens-to-gold-when-interest-rates-rise.html',
  '/how-oil-prices-affect-inflation.html','/what-happens-when-fed-cuts-interest-rates.html','/what-happens-when-dollar-strengthens.html',
  '/what-happens-to-gold-when-dollar-rises.html','/real-yields-explained.html','/why-us-debt-interest-costs-matter.html',
  '/treasury-bills-vs-notes-vs-bonds.html','/what-makes-a-global-reserve-currency.html','/why-central-banks-buy-gold.html',
  '/de-dollarisation-explained.html','/gold-vs-government-bonds-reserve-assets.html'
];
const SPACING_PAGES=['/retirement-monthly-income-needed.html','/how-to-make-a-budget.html','/50-30-20-budget-rule.html','/mortgage-affordability-vs-lender-approval.html'];

test.describe('LEARN final consistency closeout',()=>{
  test('[AUTO] all Learn answer callouts use one 30-second-answer label',async({page})=>{
    await gotoClean(page,'/learn.html');
    const audit=await page.evaluate(async()=>{
      const hrefs=[...new Set([...document.querySelectorAll('a[href$=".html"]')].map(a=>a.getAttribute('href')).filter(Boolean))]
        .filter(h=>h.startsWith('/') && !h.includes('#'));
      const failures=[];
      let checked=0;
      const concurrency=12;
      let next=0;
      async function worker(){
        while(next<hrefs.length){
          const path=hrefs[next++];
          let response;
          try{response=await fetch(path,{cache:'no-store'});}catch(error){failures.push(`${path}: fetch failed: ${error}`);continue;}
          if(!response.ok){failures.push(`${path}: HTTP ${response.status}`);continue;}
          const html=await response.text();
          const doc=new DOMParser().parseFromString(html,'text/html');
          if(doc.body?.dataset?.cmLearnArticle!=='1') continue;
          checked++;
          const answers=doc.querySelectorAll('.guide-answer');
          const labels=doc.querySelectorAll('.guide-answer>strong');
          if(answers.length!==1) failures.push(`${path}: expected 1 .guide-answer, got ${answers.length}`);
          if(labels.length!==1 || labels[0].textContent.trim()!=='30-second answer') failures.push(`${path}: unexpected answer label`);
        }
      }
      await Promise.all(Array.from({length:concurrency},()=>worker()));
      return {checked,failures};
    });
    expect(audit.checked).toBeGreaterThanOrEqual(90);
    expect(audit.failures).toEqual([]);
  });

  test('[AUTO] global macro education uses fixed truthful context instead of a currency selector',async({page})=>{
    for(const path of MACRO_FIXED){
      const errors=monitorPageErrors(page);await gotoClean(page,path);expect(errors).toEqual([]);
      await expect(page.locator('.learn-fixed-context')).toHaveCount(1);
      await expect(page.locator('.locale-menu')).toHaveCount(0);
      await expect(page.locator('.mobile-nav')).toHaveCount(1);
    }
    await gotoClean(page,'/market-chain-reaction-explorer.html');
    await expect(page.locator('.mcr-fixed-context')).toContainText('Global Macro');
    await expect(page.locator('.locale-menu,#regionSelect,#currencySelect')).toHaveCount(0);
  });

  test('[AUTO] macro component styling and the Market Chain next-step CTA are actually activated',async({page})=>{
    await gotoClean(page,'/real-yields-explained.html');
    await expect(page.locator('body')).toHaveAttribute('data-cm-mcr-learn','1');
    const watch=page.locator('.mcr-watch').first();await expect(watch).toBeVisible();
    expect(await watch.evaluate(n=>getComputedStyle(n).paddingTop)).not.toBe('0px');
    await gotoClean(page,'/market-chain-reaction-explorer.html');
    const cta=page.locator('.guide-action-first');await expect(cta).toBeVisible();
    expect(await cta.locator('a').evaluate(n=>getComputedStyle(n).display)).toBe('flex');
    await expect(cta.locator('.action-label')).toContainText('UNDERSTAND RESERVE CURRENCIES');
  });

  test('[AUTO] shared step cards keep sentences together without legacy two-column grid spacing',async({page})=>{
    for(const path of SPACING_PAGES){
      await gotoClean(page,path);
      const rows=page.locator('.guide-steps li');
      expect(await rows.count()).toBeGreaterThan(0);
      const displays=await rows.evaluateAll(nodes=>nodes.map(n=>({display:getComputedStyle(n).display,grid:getComputedStyle(n).gridTemplateColumns})));
      for(const row of displays){expect(row.display).not.toBe('grid');expect(row.grid).toBe('none');}
      await assertNoHorizontalOverflow(page,`${path} step-flow`);
    }
  });

  test('[AUTO] SWP is global-first and public mortgage copy does not leak internal HOME1 naming',async({page})=>{
    await gotoClean(page,'/what-is-swp-systematic-withdrawal-plan.html');
    const swp=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    expect(swp).toMatch(/scheduled withdrawal approach|investment portfolio/i);
    expect(swp).not.toMatch(/In India, it usually means/i);
    await gotoClean(page,'/mortgage-affordability-vs-lender-approval.html');
    const mortgage=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    expect(mortgage).not.toMatch(/\bHOME1\b/);
    expect(mortgage).toContain('Home Affordability Calculator');
  });

  test('[AUTO] 1280/390/360 closeout samples remain overflow-safe',async({page})=>{
    for(const width of [1280,390,360]){
      await page.setViewportSize({width,height:1000});
      for(const path of ['/real-yields-explained.html','/retirement-monthly-income-needed.html','/what-is-swp-systematic-withdrawal-plan.html','/mortgage-affordability-vs-lender-approval.html']){
        await gotoClean(page,path);await assertNoHorizontalOverflow(page,`${width}px ${path}`);
      }
    }
  });
});
