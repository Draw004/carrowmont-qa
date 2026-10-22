import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PAGES=[
  {path:'/why-central-banks-buy-gold.html',title:'Why Are Central Banks Buying Gold? | Carrowmont',h1:'Why are central banks buying gold?',tool:'/gold-macro-stress-explorer.html'},
  {path:'/de-dollarisation-explained.html',title:'De-Dollarisation Explained: Dollar Reserves | Carrowmont',h1:'De-dollarisation explained: Is the world moving away from the U.S. dollar?',tool:'/gold-macro-stress-explorer.html'},
  {path:'/gold-vs-government-bonds-reserve-assets.html',title:'Gold vs Government Bonds as Reserve Assets | Carrowmont',h1:'Gold vs government bonds: Why do central banks hold both?',tool:'/gold-macro-stress-explorer.html'}
];
const DOWNLOADS=[
  '/assets/learn3f2/central-bank-gold-demand-reference.png',
  '/data/learn3f2/central-bank-gold-demand-reference.csv',
  '/assets/learn3f2/cofer-reserve-shares-2026q2.png',
  '/data/learn3f2/cofer-reserve-shares-2026q2.csv',
  '/assets/learn3f2/official-reserve-composition-end-2025.png',
  '/data/learn3f2/official-reserve-composition-end-2025.csv'
];
function staticTitle(source){return (source.match(/<title>([^<]*)<\/title>/i)?.[1]||'').replace(/&amp;/g,'&').trim();}
function staticMetaDescription(source){const tag=source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0]||'';return tag.match(/\bcontent=(["'])(.*?)\1/i)?.[2]?.trim()||'';}

test.describe('LEARN3F-2 central-bank gold and reserve diversification',()=>{
  test('[AUTO] three authority guides keep stable static/runtime identities, structure and protected Gold Macro Stress journeys',async({page})=>{
    for(const item of PAGES){
      const response=await page.request.get(item.path); expect(response.ok(),item.path).toBeTruthy();
      const source=await response.text();
      expect(staticTitle(source)).toBe(item.title);
      const desc=staticMetaDescription(source); expect(desc.length).toBeGreaterThanOrEqual(110); expect(desc.length).toBeLessThanOrEqual(170);
      expect(source).toContain('"datePublished":"2026-10-22"'); expect(source).toContain('"dateModified":"2026-10-22"'); expect(source).not.toMatch(/\bfetch\s*\(/);
      const errors=monitorPageErrors(page); await gotoClean(page,item.path);
      await expect(page.locator('h1')).toHaveCount(1); await expect(page.locator('h1')).toHaveText(item.h1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','index,follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://carrowmont.com${item.path}`);
      await expect(page.locator('.guide-answer')).toHaveCount(1); await expect(page.locator('[data-cm-rich="1"]')).toHaveCount(1); await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1); await expect(page.locator('body[data-cm-learn3f2="1"]')).toHaveCount(1);
      await expect(page.locator(`.guide-action-first a[href="${item.tool}"]`)).toBeVisible();
      await expect(page.locator(`.learn-tool-return a[href="${item.tool}"]`)).toBeVisible();
      expect(await page.locator('.reference-note .source-list a').count()).toBeGreaterThanOrEqual(4);
      expect(errors).toEqual([]);
    }
  });

  test('[AUTO] flagship charts and downloadable CSV/PNG assets are present, loadable and auditable',async({page,request})=>{
    for(const asset of DOWNLOADS){ const r=await request.get(asset); expect(r.ok(),asset).toBeTruthy(); expect((await r.body()).length,asset).toBeGreaterThan(50); }
    for(const path of ['/why-central-banks-buy-gold.html','/de-dollarisation-explained.html','/gold-vs-government-bonds-reserve-assets.html']){
      await gotoClean(page,path);
      const images=page.locator('figure.research-figure img');
      expect(await images.count(),path).toBeGreaterThanOrEqual(1);
      for(let i=0;i<await images.count();i++){ await expect(images.nth(i)).toBeVisible(); expect(await images.nth(i).evaluate(img=>img.complete && img.naturalWidth>0)).toBeTruthy(); }
      const downloads=page.locator('figure.research-figure a[download]');
      expect(await downloads.count(),path).toBeGreaterThanOrEqual(2);
      for(let i=0;i<await downloads.count();i++){ const href=await downloads.nth(i).getAttribute('href'); expect(href).toMatch(/^\/(?:assets|data)\/learn3f2\/.+\.(?:png|csv)$/); }
    }
  });

  test('[AUTO] page-specific distinctions preserve demand, denominator, valuation and reserve-role boundaries',async({page})=>{
    await gotoClean(page,'/why-central-banks-buy-gold.html');
    await expect(page.getByRole('heading',{level:2,name:'What the demand data actually show'})).toHaveCount(1);
    await expect(page.getByRole('heading',{level:2,name:'Central-bank objectives are not household objectives'})).toHaveCount(1);
    await expect(page.locator('.mcr-precision-note').filter({hasText:'Denominator rule:'})).toContainText('COFER');
    await expect(page.locator('article')).toContainText('89%'); await expect(page.locator('article')).toContainText('45%');

    await gotoClean(page,'/de-dollarisation-explained.html');
    await expect(page.getByRole('heading',{level:2,name:'Valuation effects can look like active de-dollarisation'})).toHaveCount(1);
    await expect(page.getByRole('heading',{level:2,name:'What evidence would support genuine dollar displacement?'})).toHaveCount(1);
    await expect(page.locator('.mcr-precision-note')).toContainText('COFER excludes monetary gold');
    await expect(page.locator('article')).toContainText('56.70%'); await expect(page.locator('article')).toContainText('20.60%'); await expect(page.locator('article')).toContainText('2.11%'); await expect(page.locator('article')).toContainText('4.96%');
    await expect(page.locator('article')).toContainText('more than 80%');

    await gotoClean(page,'/gold-vs-government-bonds-reserve-assets.html');
    await expect(page.getByRole('heading',{level:2,name:'“Government bonds” is not one uniform asset'})).toHaveCount(1);
    await expect(page.getByRole('heading',{level:2,name:'Central-bank choices do not create a household allocation rule'})).toHaveCount(1);
    await expect(page.locator('.mcr-precision-note')).toContainText(/different denominator/i);
    const article=page.locator('article');
    for(const term of ['yield','liquidity','duration','inflation','collateral','custody']) await expect(article).toContainText(new RegExp(term,'i'));
  });

  test('[AUTO] LEARN3F-2 remains overflow-safe at 1280, 390 and 360px with scroll-safe research tables',async({page})=>{
    for(const width of [1280,390,360]){ await page.setViewportSize({width,height:900}); for(const item of PAGES){ await gotoClean(page,item.path); await assertNoHorizontalOverflow(page,`${width}px ${item.path}`); const wraps=page.locator('.guide-table-wrap'); if(await wraps.count()){ const safe=await wraps.evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).overflowX==='auto' && n.scrollWidth>=n.clientWidth)); expect(safe).toBeTruthy(); } } }
  });
});
