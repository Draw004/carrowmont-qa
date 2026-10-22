import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, saveReferenceScreenshot } from '../helpers/common.js';

const PAGE='/market-chain-reaction-explorer.html';
const ARTICLES=[
  ['/what-happens-when-bond-yields-rise.html','What happens when bond yields rise?'],
  ['/how-oil-prices-affect-inflation.html','How do oil prices affect inflation?'],
  ['/what-happens-when-fed-cuts-interest-rates.html','What happens when the Fed cuts interest rates?'],
  ['/what-happens-when-dollar-strengthens.html','What happens when the U.S. dollar strengthens?']
];

async function waitReady(page){
  await expect(page.locator('html')).toHaveAttribute('data-mcr-ready','1');
  await expect(page.locator('#mcrVerdict')).not.toHaveText('—');
}

async function choose(page,event,cause,target){
  await page.locator('#mcrEvent').selectOption(event);
  await page.locator('#mcrCause').selectOption(cause);
  await page.locator('#mcrTarget').selectOption(target);
  await page.locator('#mcrExplain').click();
}

test.describe('MCR1 Market Chain Reaction Explorer',()=>{
  test('[AUTO] Explorer loads cleanly with one H1, fixed global context and substantial static education',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,PAGE);await waitReady(page);
    expect(errors).toEqual([]);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toHaveText('What Happens When Markets Change?');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/market-chain-reaction-explorer.html');
    await expect(page.locator('#mcrEvent option')).toHaveCount(12);await expect(page.locator('.mcr-fixed-context')).toContainText('Global Macro');await expect(page.locator('.mcr-fixed-context')).toContainText('Markets');await expect(page.locator('#regionSelect,#currencySelect')).toHaveCount(0);
    const text=(await page.locator('main').innerText()).replace(/\s+/g,' ');expect(text).toContain('Finance terms without the unnecessary fog');expect(text).toContain('Chain Breaker');expect(text).toContain('why did the move happen?');
  });

  test('[AUTO] reviewed JSON library covers every exposed event-target pair with controlled language, evidence and Chain Breakers',async({page})=>{
    await gotoClean(page,PAGE);await waitReady(page);
    const result=await page.evaluate(async()=>{
      const [events,relations,sources]=await Promise.all(['data/market-chain-events.json','data/market-chain-relations.json','data/market-chain-sources.json'].map(x=>fetch(x,{cache:'no-store'}).then(r=>r.json())));
      return {events,relations,sources,validation:window.CarrowmontMarketChainCore.validate(events,relations,sources)};
    });
    expect(result.events.events).toHaveLength(12);expect(result.relations.relationships).toHaveLength(73);expect(result.sources.sources.length).toBeGreaterThanOrEqual(10);expect(result.validation.ok).toBe(true);expect(result.validation.errors).toEqual([]);
    const verdicts=new Set(result.relations.relationships.map(x=>x.verdict));expect([...verdicts].sort()).toEqual([...result.relations.allowedVerdicts].sort());
    for(const relation of result.relations.relationships){expect(relation.chainBreaker.length).toBeGreaterThan(25);expect(relation.mechanismSteps.length).toBeGreaterThanOrEqual(2);expect(relation.sourceIds.length).toBeGreaterThanOrEqual(1);expect(relation.directAnswer).not.toMatch(/\b(?:will definitely|guaranteed|buy now|sell now)\b/i);}
  });

  test('[AUTO] yield rise explanation changes with cause and keeps bond mechanics separate from stock tendencies',async({page})=>{
    await gotoClean(page,PAGE);await waitReady(page);await choose(page,'yields-rise','inflation','broad-stocks');
    let r=await page.evaluate(()=>window.__carrowmontMarketChainLastResult);expect(r.verdict).toBe('Usually a headwind');expect(r.relationshipType).not.toBe('Mechanical relationship');expect(r.causeId).toBe('inflation');expect(r.directAnswer).toMatch(/valuation|borrowing|stocks/i);await expect(page.locator('#mcrBreaker')).not.toBeEmpty();
    await page.locator('#mcrCause').selectOption('growth');r=await page.evaluate(()=>window.__carrowmontMarketChainLastResult);expect(r.causeId).toBe('growth');expect(r.verdict).toBe('Mixed / cause-dependent');expect(r.directAnswer).toMatch(/growth|earnings|strong/i);
    await page.locator('#mcrTarget').selectOption('bond-prices');r=await page.evaluate(()=>window.__carrowmontMarketChainLastResult);expect(r.verdict).toBe('Mechanical inverse relationship');expect(r.relationshipType).toBe('Mechanical relationship');
  });

  test('[AUTO] oil supply shock and demand-driven oil rise resolve to different explanations',async({page})=>{
    await gotoClean(page,PAGE);await waitReady(page);await choose(page,'oil-rise','supply','broad-stocks');let r=await page.evaluate(()=>window.__carrowmontMarketChainLastResult);expect(r.causeId).toBe('supply');const supply=r.directAnswer;
    await page.locator('#mcrCause').selectOption('demand');r=await page.evaluate(()=>window.__carrowmontMarketChainLastResult);expect(r.causeId).toBe('demand');expect(r.directAnswer).not.toBe(supply);expect(r.directAnswer).toMatch(/demand|growth|activity/i);
  });

  test('[AUTO] Treasury default stress always displays the special uncertainty warning',async({page})=>{
    await gotoClean(page,PAGE);await waitReady(page);await choose(page,'treasury-default-stress','hypothetical','dollar');
    await expect(page.locator('#mcrScenarioWarning')).toBeVisible();const warning=await page.locator('#mcrScenarioWarning').innerText();expect(warning).toMatch(/hypothetical|uncertain|no reliable|historical/i);const r=await page.evaluate(()=>window.__carrowmontMarketChainLastResult);expect(r.scenarioWarning).toBeTruthy();
  });

  test('[AUTO] fragment state is shareable without creating a second canonical URL',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);await gotoClean(page,PAGE+'#event=dollar-strengthens&cause=higher-us-rates&target=gold');await waitReady(page);
    await expect(page.locator('#mcrEvent')).toHaveValue('dollar-strengthens');await expect(page.locator('#mcrCause')).toHaveValue('higher-us-rates');await expect(page.locator('#mcrTarget')).toHaveValue('gold');
    await page.locator('#mcrShare').click();const clip=await page.evaluate(()=>navigator.clipboard.readText());expect(clip).toContain('#event=dollar-strengthens&cause=higher-us-rates&target=gold');await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/market-chain-reaction-explorer.html');
  });

  test('[AUTO] Copy explanation contains cause, target, chain and the Chain Breaker without advice language',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);await gotoClean(page,PAGE);await waitReady(page);await choose(page,'policy-rate-cut','recession','broad-stocks');await page.locator('#mcrCopy').click();const clip=await page.evaluate(()=>navigator.clipboard.readText());expect(clip).toContain('Why:');expect(clip).toContain('Chain:');expect(clip).toContain('Chain Breaker:');expect(clip).toContain('not a forecast or investment recommendation');expect(clip).not.toMatch(/buy now|sell now|guaranteed/i);
  });

  test('[AUTO] Explorer runtime reads only same-origin reviewed static data and does not call a market API or AI service',async({page})=>{
    const requests=[];
    page.on('request',req=>{if(['fetch','xhr'].includes(req.resourceType()))requests.push(req.url());});
    await gotoClean(page,PAGE);await waitReady(page);
    const origin=new URL(page.url()).origin;
    const isIsolatedCloudflareRum=u=>/^https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum(?:[/?#]|$)/i.test(u);
    const thirdParty=requests.filter(u=>!u.startsWith(origin)&&!isIsolatedCloudflareRum(u));
    expect(thirdParty).toEqual([]);
    for(const file of ['market-chain-events.json','market-chain-relations.json','market-chain-sources.json']){
      expect(requests.some(u=>u.startsWith(origin)&&u.includes(`/data/${file}`)),`Expected same-origin reviewed data request for ${file}`).toBeTruthy();
    }
  });

  test('[AUTO] four Batch-1 Learn pages are substantive, canonical, globally neutral and link back to the Explorer',async({page})=>{
    for(const [path,h1] of ARTICLES){const errors=monitorPageErrors(page);await gotoClean(page,path);expect(errors).toEqual([]);await expect(page.locator('h1')).toHaveText(h1);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com'+path);await expect(page.locator('.guide-answer')).toHaveCount(1);await expect(page.locator('h2')).toHaveCount(9);await expect(page.locator('text=Frequently asked questions')).toBeVisible();await expect(page.locator('.guide-action-first a[href^="/market-chain-reaction-explorer.html#"]')).toBeVisible();await expect(page.locator('.learn-tool-return')).toHaveCount(1);const text=(await page.locator('main').innerText()).replace(/\s+/g,' ');expect(text).toMatch(/chain breaker/i);expect(text).not.toMatch(/₹|\blakhs?\b|\bcrores?\b/i);expect(text.split(' ').length).toBeGreaterThan(1000);}
  });

  test('[AUTO] Learn hub, Tools directory and sitemap publish the MCR1 discovery network without changing the nine-core homepage',async({page,request})=>{
    await gotoClean(page,'/learn.html');await expect(page.locator('[data-category="macro"]')).toBeVisible();await expect(page.locator('[data-category="macro"] .category-tool-link[href="/market-chain-reaction-explorer.html"]')).toBeVisible();for(const [path] of ARTICLES)await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();
    await gotoClean(page,'/tools.html');await expect(page.locator('.directory-tool-card')).toHaveCount(19);await expect(page.locator('[data-secondary-tool="market-chain-reaction"] a')).toHaveAttribute('href','/market-chain-reaction-explorer.html');
    await gotoClean(page,'/');await expect(page.locator('[data-core-tool-count="9"]')).toHaveCount(1);await expect(page.locator('[data-tool-id="market-chain-reaction"]')).toHaveCount(0);
    const xml=await (await request.get('/sitemap.xml')).text();for(const u of [PAGE,...ARTICLES.map(x=>x[0])])expect(xml).toContain(`<loc>https://carrowmont.com${u}</loc><lastmod>2026-10-15</lastmod>`);
  });

  test('[AUTO] 1280px, 390px and 360px Explorer/Learn layouts avoid page-level horizontal overflow',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:1000});await gotoClean(page,PAGE);await waitReady(page);await assertNoHorizontalOverflow(page,`${width}px Market Chain Explorer`);await expect(page.locator('#mcrExplain')).toBeVisible();await gotoClean(page,ARTICLES[0][0]);await assertNoHorizontalOverflow(page,`${width}px Market Chain Learn`);}
    await page.setViewportSize({width:390,height:1000});await gotoClean(page,PAGE);await waitReady(page);await saveReferenceScreenshot(page,'market-chain-reaction-explorer-390.png');
  });
});
