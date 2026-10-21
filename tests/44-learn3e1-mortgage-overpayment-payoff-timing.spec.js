import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const TOOL='/mortgage-payoff-calculator/';
const PAGES=[
  { path:'/biweekly-fortnightly-mortgage-payments.html', title:'Biweekly vs Monthly Mortgage Payments | Carrowmont', lesson:'Worked example: A 25-year every-two-weeks comparison', checklist:'Checklist: Confirm what the lender will actually do' },
  { path:'/extra-mortgage-payments-early-vs-late.html', title:'Extra Mortgage Payments: Early vs Late | Carrowmont', lesson:'Worked example: Same five extra payments, different years', checklist:'Checklist: Before moving extra cash earlier' },
  { path:'/monthly-extra-vs-annual-lump-sum-mortgage.html', title:'Monthly Extra vs Annual Lump Sum Mortgage | Carrowmont', lesson:'Worked example: Same extra cash, different timing', checklist:'Checklist: Keep the comparison fair' },
  { path:'/one-extra-mortgage-payment-a-year.html', title:'One Extra Mortgage Payment a Year | Carrowmont', lesson:'Worked example: One extra payment at the end of each year', checklist:'Checklist: Make sure the payment is genuinely extra principal' },
  { path:'/pay-off-mortgage-five-years-early.html', title:'Pay Off a Mortgage 5 Years Earlier | Carrowmont', lesson:'Worked example: Shorten a 25-year loan to 20 years', checklist:'Checklist: Test affordability before committing to the target' }
];

function staticTitle(source){
  return (source.match(/<title>([^<]*)<\/title>/i)?.[1]||'').replace(/&amp;/g,'&').trim();
}
function staticMetaDescription(source){
  const tag=source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0]||'';
  return tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2]?.trim()||'';
}
function monthlyPayment(balance,annualPct,years){
  const r=annualPct/1200;
  const n=Math.round(years*12);
  if(!r)return balance/n;
  return balance*r/(1-Math.pow(1+r,-n));
}
function amortize({balance,annualPct,years,monthlyExtra=0,annualExtra=0,annualExtraMonth=12,extraMonths=[]}){
  const r=annualPct/1200;
  const scheduled=monthlyPayment(balance,annualPct,years);
  const extras=new Set(extraMonths);
  let month=0,interest=0,principal=balance;
  while(principal>1e-8 && month<1200){
    month+=1;
    const charge=principal*r;
    interest+=charge;
    let principalPaid=Math.max(0,scheduled-charge)+monthlyExtra;
    if(annualExtra && ((month-1)%12)+1===annualExtraMonth) principalPaid+=annualExtra;
    if(extras.has(month)) principalPaid+=scheduled;
    principal=Math.max(0,principal-principalPaid);
  }
  return {months:month,interest,scheduled};
}
async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale && window.CarrowmontLearnLocalization?.apply))).toBe(true);
  await page.evaluate(({region,currency})=>{window.CarrowmontLocale.setLocale(region,currency);window.CarrowmontLearnLocalization.apply();},{region,currency});
}

// These arithmetic checks intentionally recalculate the article relationships rather than trusting printed values.
test('[AUTO] LEARN3E-1 mortgage worked examples recalculate from the stated assumptions',async()=>{
  expect(monthlyPayment(1_000_000,4,25)).toBeCloseTo(5278.37,2);
  expect(monthlyPayment(1_000_000,6,25)).toBeCloseTo(6443.01,2);
  expect(monthlyPayment(1_000_000,8,25)).toBeCloseTo(7718.16,2);
  expect(monthlyPayment(1_000_000,4,20)).toBeCloseTo(6059.80,2);
  expect(monthlyPayment(1_000_000,6,20)).toBeCloseTo(7164.31,2);
  expect(monthlyPayment(1_000_000,8,20)).toBeCloseTo(8364.40,2);

  const base=amortize({balance:1_000_000,annualPct:6,years:25});
  const yearly=base.scheduled;
  const monthly=amortize({balance:1_000_000,annualPct:6,years:25,monthlyExtra:yearly/12});
  const yearEnd=amortize({balance:1_000_000,annualPct:6,years:25,annualExtra:yearly,annualExtraMonth:12});
  const yearStart=amortize({balance:1_000_000,annualPct:6,years:25,annualExtra:yearly,annualExtraMonth:1});
  expect(monthly.months).toBe(253);
  expect(yearEnd.months).toBe(254);
  expect(yearStart.months).toBe(252);
  expect(base.interest-monthly.interest).toBeCloseTo(169596.17,2);
  expect(base.interest-yearEnd.interest).toBeCloseTo(162188.10,2);
  expect(base.interest-yearStart.interest).toBeCloseTo(177085.83,2);

  const early=amortize({balance:1_000_000,annualPct:6,years:25,extraMonths:[12,24,36,48,60]});
  const late=amortize({balance:1_000_000,annualPct:6,years:25,extraMonths:[132,144,156,168,180]});
  expect(base.interest-early.interest).toBeCloseTo(83384.81,2);
  expect(base.interest-late.interest).toBeCloseTo(32598.13,2);
  expect((base.interest-early.interest)-(base.interest-late.interest)).toBeCloseTo(50786.67,2);
});

test.describe('LEARN3E-1 mortgage overpayment and payoff timing',()=>{
  test('[AUTO] five established guides keep stable identities and exactly one LEARN3E-1 enhancement marker',async({page})=>{
    for(const item of PAGES){
      const response=await page.request.get(item.path);
      expect(response.ok(),`raw HTML should load for ${item.path}`).toBeTruthy();
      const source=await response.text();
      expect(staticTitle(source)).toBe(item.title);
      const desc=staticMetaDescription(source);
      expect(desc.length,`${item.path} static description too short`).toBeGreaterThanOrEqual(110);
      expect(desc.length,`${item.path} static description too long`).toBeLessThanOrEqual(160);
      expect(source).toContain('"dateModified":"2026-10-21"');

      const errors=monitorPageErrors(page);
      await gotoClean(page,item.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toHaveCount(1);
      await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1);
      await expect(page.locator('[data-cm-rich="1"]')).toHaveCount(1);
      await expect(page.locator('article [data-cm-learn3e1="1"]')).toHaveCount(1);
      await expect(page.getByRole('heading',{name:item.lesson,exact:true})).toHaveCount(1);
      await expect(page.getByRole('heading',{name:item.checklist,exact:true})).toHaveCount(1);
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] older Mortgage Tool-to-Learn journey remains authoritative at both top and shared bottom CTA',async({page})=>{
    for(const item of PAGES){
      await gotoClean(page,item.path);
      await expect(page.locator(`.guide-action-first a[href="${TOOL}"]`)).toBeVisible();
      await expect(page.locator(`.learn-tool-return a[href="${TOOL}"]`)).toBeVisible();
    }
  });

  test('[AUTO] page-specific lessons preserve the intended mortgage decision boundaries',async({page})=>{
    await gotoClean(page,'/biweekly-fortnightly-mortgage-payments.html');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('26 half-payments');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('24');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('principal-only');

    await gotoClean(page,'/extra-mortgage-payments-early-vs-late.html');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('same total extra cash');
    await expect(page.locator('article [data-cm-learn3e1="1"] a[href="/mortgage-prepayment-vs-investing.html"]')).toBeVisible();

    await gotoClean(page,'/monthly-extra-vs-annual-lump-sum-mortgage.html');
    await expect(page.getByRole('cell',{name:'One beginning-of-year lump sum',exact:true})).toBeVisible();
    await expect(page.locator('[data-cm-money-inr="177085.83"]')).toHaveCount(2);

    await gotoClean(page,'/one-extra-mortgage-payment-a-year.html');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('genuinely extra principal');
    await expect(page.locator('article [data-cm-learn3e1="1"] a[href="/monthly-extra-vs-annual-lump-sum-mortgage.html"]')).toBeVisible();

    await gotoClean(page,'/pay-off-mortgage-five-years-early.html');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('planning target, not a requirement');
    await expect(page.locator('article [data-cm-learn3e1="1"]')).toContainText('higher-cost debts');
  });

  test('[AUTO] runtime-localized mortgage Learn H1s keep the capitalization-after-colon rule',async({page})=>{
    const pages=[
      '/mortgage-prepayment-vs-investing.html',
      '/one-extra-mortgage-payment-a-year.html',
      '/monthly-extra-vs-annual-lump-sum-mortgage.html',
      '/biweekly-fortnightly-mortgage-payments.html'
    ];
    for(const path of pages){
      await gotoClean(page,path);
      for(const [region,currency] of [['US','USD'],['IN','INR'],['GB','GBP'],['AU','AUD']]){
        await setLocale(page,region,currency);
        const h1=(await page.locator('h1').innerText()).trim();
        const match=h1.match(/:([^A-Za-z]*)([A-Za-z])/);
        if(match) expect(match[2],`${path} ${region} H1 after colon: ${h1}`).toBe(match[2].toUpperCase());
      }
    }
  });

  test('[AUTO] representative mortgage education remains country-aware without changing the universal maths',async({page})=>{
    await gotoClean(page,'/one-extra-mortgage-payment-a-year.html');
    await setLocale(page,'IN','INR');
    await expect(page.locator('#articleKicker')).toContainText('HOME LOAN');
    await expect(page.locator('main')).toContainText(/home loan/i);
    await expect(page.locator('[data-cm-money-inr="1000000"]').first()).toContainText('₹');

    await setLocale(page,'GB','GBP');
    await expect(page.locator('#articleKicker')).toContainText('MORTGAGE OVERPAYMENT');
    await expect(page.locator('[data-cm-money-inr="1000000"]').first()).toContainText('£');

    await gotoClean(page,'/monthly-extra-vs-annual-lump-sum-mortgage.html');
    await setLocale(page,'AU','AUD');
    await expect(page.locator('[data-cm-money-inr="177085.83"]').first()).toContainText('$');
    await expect(page.locator('main')).not.toContainText(/\blakh\b|\bcrore\b/i);
  });

  test('[AUTO] five rewritten guides remain overflow-safe at 1280, 390 and 360px',async({page})=>{
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
