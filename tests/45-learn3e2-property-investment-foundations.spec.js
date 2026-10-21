import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES=[
  {path:'/rental-yield-explained.html',title:'Rental Yield: Meaning and Calculation | Carrowmont',tool:'/goal-planner/',worked:'Worked example: Gross yield versus an illustrative net operating yield',checklist:'Checklist: What to check before trusting a rental-yield figure'},
  {path:'/reit-vs-direct-property.html',title:'REIT vs Direct Property: Key Differences | Carrowmont',tool:'/goal-planner/',worked:'Worked example: Equal starting capital does not mean equal investment exposure',checklist:'Checklist: Which questions matter before choosing the structure?'},
  {path:'/what-is-a-reit.html',title:'What Is a REIT? How It Works | Carrowmont',tool:'/retirement-calculator/',worked:'Worked example: How income can move through a simplified REIT',checklist:'Checklist: What to review before buying a REIT'},
  {path:'/real-estate-vs-stocks.html',title:'Real Estate vs Stocks: Key Trade-Offs | Carrowmont',tool:'/financial-independence/',worked:'Worked example: Why leverage must be normalized before comparing returns',checklist:'Checklist: Compare the portfolio, not just the headline return'}
];

function staticTitle(source){return (source.match(/<title>([^<]*)<\/title>/i)?.[1]||'').replace(/&amp;/g,'&').trim();}
function staticMetaDescription(source){const tag=source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0]||'';return tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2]?.trim()||'';}

function rentalYield({value,rent,vacancy,management,other}){
  const net=rent-vacancy-management-other;
  return {gross:rent/value*100,netIncome:net,netYield:net/value*100};
}
function leverageIllustration({equity,assetValue,movePct}){
  const debt=assetValue-equity;
  const assetMove=assetValue*movePct;
  return {debt,assetMove,equityMovePct:assetMove/equity*100};
}
function reitFlow({revenue,operating,financing,admin,distributed}){
  const residual=revenue-operating-financing-admin;
  return {residual,retained:residual-distributed};
}

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale && window.CarrowmontLearnLocalization?.apply))).toBe(true);
  await page.evaluate(({region,currency})=>{window.CarrowmontLocale.setLocale(region,currency);window.CarrowmontLearnLocalization.apply();},{region,currency});
  await expect.poll(()=>page.evaluate(()=>({region:window.CarrowmontLocale.getRegion(),currency:window.CarrowmontLocale.getCurrency()}))).toEqual({region,currency});
}

test('[AUTO] LEARN3E-2 worked examples recalculate from the stated assumptions',()=>{
  const y=rentalYield({value:5000000,rent:300000,vacancy:15000,management:18000,other:42000});
  expect(y.gross).toBeCloseTo(6,8);
  expect(y.netIncome).toBe(225000);
  expect(y.netYield).toBeCloseTo(4.5,8);

  const direct=leverageIllustration({equity:2000000,assetValue:8000000,movePct:.05});
  expect(direct.debt).toBe(6000000);
  expect(direct.assetMove).toBe(400000);
  expect(direct.equityMovePct).toBeCloseTo(20,8);
  expect(2000000*.05).toBe(100000);

  const flow=reitFlow({revenue:5000000,operating:2000000,financing:750000,admin:250000,distributed:1500000});
  expect(flow.residual).toBe(2000000);
  expect(flow.retained).toBe(500000);
});

test.describe('LEARN3E-2 property investment foundations',()=>{
  test('[AUTO] four guides keep stable identities and exactly one LEARN3E-2 enhancement marker',async({page})=>{
    for(const item of PAGES){
      const response=await page.request.get(item.path);
      expect(response.ok(),`raw HTML should load for ${item.path}`).toBeTruthy();
      const source=await response.text();
      expect(staticTitle(source)).toBe(item.title);
      const desc=staticMetaDescription(source);
      expect(desc.length,`${item.path} static description too short`).toBeGreaterThanOrEqual(110);
      expect(desc.length,`${item.path} static description too long`).toBeLessThanOrEqual(160);
      expect(source).toContain('"dateModified":"2026-10-22"');

      const errors=monitorPageErrors(page);
      await gotoClean(page,item.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toHaveCount(1);
      await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1);
      await expect(page.locator('[data-cm-rich="1"]')).toHaveCount(1);
      await expect(page.locator('article [data-cm-learn3e2="1"]')).toHaveCount(1);
      await expect(page.locator('strong',{hasText:item.worked})).toHaveCount(1);
      await expect(page.getByRole('heading',{name:item.checklist,exact:true})).toHaveCount(1);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] older property Tool-to-Learn journeys remain authoritative at both top and shared bottom CTA',async({page})=>{
    for(const item of PAGES){
      await gotoClean(page,item.path);
      await expect(page.locator(`.guide-action-first a[href="${item.tool}"]`)).toBeVisible();
      await expect(page.locator(`.learn-tool-return a[href="${item.tool}"]`)).toBeVisible();
    }
  });

  test('[AUTO] page-specific lessons preserve yield, leverage, liquidity and REIT decision boundaries',async({page})=>{
    await gotoClean(page,'/rental-yield-explained.html');
    const rental=page.locator('article [data-cm-learn3e2="1"]');
    await expect(rental).toContainText('cash-on-cash return');
    await expect(page.locator('[data-cm-money-inr="225000"]')).toHaveCount(1);
    await expect(rental.locator('a[href="/reit-vs-direct-property.html"]')).toBeVisible();

    await gotoClean(page,'/reit-vs-direct-property.html');
    await expect(page.locator('[data-cm-money-inr="6000000"]')).toHaveCount(1);
    await expect(page.locator('article')).toContainText('household-level debt');
    await expect(page.locator('article')).toContainText('REIT itself may also carry debt inside the entity');

    await gotoClean(page,'/what-is-a-reit.html');
    await expect(page.locator('[data-cm-money-inr="1500000"]')).toHaveCount(1);
    await expect(page.locator('article [data-cm-learn3e2="1"]')).toContainText('publicly traded, non-traded or private');
    await expect(page.locator('article')).toContainText('not a guaranteed yield');

    await gotoClean(page,'/real-estate-vs-stocks.html');
    await expect(page.locator('[data-cm-money-inr="400000"]')).toHaveCount(1);
    await expect(page.locator('[data-cm-money-inr="100000"]')).toHaveCount(1);
    await expect(page.locator('article')).toContainText('The difference is leverage');
  });

  test('[AUTO] money examples localize coherently without changing the percentage maths',async({page})=>{
    for(const item of PAGES){
      await gotoClean(page,item.path);
      await setLocale(page,'IN','INR');
      await expect(page.locator('[data-cm-money-inr]').first()).toContainText('₹');
      await setLocale(page,'US','USD');
      await expect(page.locator('[data-cm-money-inr]').first()).toContainText('$');
      await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/i);
      await setLocale(page,'GB','GBP');
      await expect(page.locator('[data-cm-money-inr]').first()).toContainText('£');
      await setLocale(page,'AU','AUD');
      await expect(page.locator('[data-cm-money-inr]').first()).toContainText('$');
    }
  });

  test('[AUTO] four rewritten guides remain overflow-safe at 1280, 390 and 360px',async({page})=>{
    for(const width of [1280,390,360]){
      await page.setViewportSize({width,height:900});
      for(const item of PAGES){
        await gotoClean(page,item.path);
        await assertNoHorizontalOverflow(page,`${width}px ${item.path}`);
        const wraps=page.locator('.guide-table-wrap');
        if(await wraps.count()){
          const safe=await wraps.evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).overflowX==='auto' && n.scrollWidth>=n.clientWidth));
          expect(safe).toBeTruthy();
        }
      }
    }
  });
});
