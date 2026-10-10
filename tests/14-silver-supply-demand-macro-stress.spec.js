import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, chartHasGeometry, saveReferenceScreenshot, validatePdfDownload } from '../helpers/common.js';

const PAGE='/silver-supply-demand-macro-stress-explorer.html';
const ARTICLE='/silver-vs-gold.html';

async function waitForRendered(page){
  await expect(page.locator('#snapshotDate')).not.toHaveText('Loading…');
  await expect(page.locator('#physicalLabel')).not.toHaveText('—');
  await expect(page.locator('#forceMapTable tr')).toHaveCount(6);
  await expect(page.locator('#comparisonTable tbody tr')).toHaveCount(9);
}
function savePdfArtifact(info,name){const dir=path.resolve('qa-artifacts','pdfs');fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(info.filePath,path.join(dir,name));}

async function referenceFixture(page){
  return page.evaluate(async()=>{
    const silver=await (await fetch('data/silver-market-reference.json',{cache:'no-store'})).json();
    const gold=await (await fetch('data/gold-macro-reference.json',{cache:'no-store'})).json();
    const C=window.CarrowmontSilverMacroCore,s=C.buildScenario(silver,gold,{});
    return {silver,gold,s};
  });
}

test.describe('Silver Supply, Demand & Macro Stress Explorer',()=>{
  test('[AUTO] page loads cleanly with reviewed completed-year data, one H1 and collapsed advanced controls',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,PAGE);await waitForRendered(page);
    expect(errors).toEqual([]);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('#snapshotDate')).toContainText('2025');
    await expect(page.locator('#advancedAssumptions')).not.toHaveAttribute('open','');await expect(page.locator('#referenceDataDetails')).not.toHaveAttribute('open','');
    await expect(page.locator('body')).toContainText('No price forecast');await expect(page.locator('body')).toContainText('Silver is not simply “cheaper gold”');
    const result=await page.evaluate(()=>window.__carrowmontSilverLastResult);expect(result.scenario.scenarioType).toBe('reference');expect(result.scenario.forceMap).toHaveLength(6);
  });

  test('[AUTO] completed-year reference and independent deterministic physical fixtures reconcile',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);const {silver,s}=await referenceFixture(page);
    expect(silver.referenceYear).toBe(2025);expect(silver.supply.mineProductionMoz).toBe(846.6);expect(silver.supply.recyclingMoz).toBe(197.6);
    expect(silver.demand.industrialMoz).toBe(657.4);expect(silver.demand.physicalInvestmentMoz).toBe(217.7);expect(silver.publishedBalanceMoz).toBe(-40.3);
    expect(s.totals.totalSupply).toBeCloseTo(1090.4,8);expect(s.totals.totalDemand).toBeCloseTo(1130.7,8);expect(s.totals.balance).toBeCloseTo(-40.3,8);expect(s.balanceClass.label).toBe('Modeled deficit');
    const classes=await page.evaluate(()=>{const C=window.CarrowmontSilverMacroCore;return[-.06,-.03,0,.03,.06].map(C.classifyBalanceRatio).map(x=>x.label);});
    expect(classes).toEqual(['Large modeled deficit','Modeled deficit','Near balance','Modeled surplus','Large modeled surplus']);
  });

  test('[AUTO] simple scenarios and reset use transparent fixed sensitivities',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);
    await page.locator('#simple-industrial').selectOption('strong');await page.locator('#exploreBtn').click();
    let r=await page.evaluate(()=>window.__carrowmontSilverLastResult.scenario);expect(r.adjustments.industrial).toBe(5);expect(r.balanceClass.label).toBe('Large modeled deficit');expect(r.scenarioType).toBe('custom');
    await page.locator('#resetBtn').click();r=await page.evaluate(()=>window.__carrowmontSilverLastResult.scenario);expect(r.scenarioType).toBe('reference');expect(r.totals.balance).toBeCloseTo(-40.3,8);
    await page.locator('#simple-recycling').selectOption('strong');await page.locator('#exploreBtn').click();r=await page.evaluate(()=>window.__carrowmontSilverLastResult.scenario);expect(r.adjustments.recycling).toBe(10);expect(r.balanceClass.label).toBe('Near balance');
  });

  test('[AUTO] Advanced Assumptions open through the real user flow and unit conversion is reversible',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#advancedAssumptions summary').click();await expect(page.locator('#advancedAssumptions')).toHaveAttribute('open','');
    const mine=page.locator('input[data-physical="mineProduction"]');const moz=Number(await mine.inputValue());expect(moz).toBeCloseTo(846.6,1);
    await page.locator('.smse-unit-toggle button[data-unit="tonnes"]').click();const tonnes=Number(await mine.inputValue());expect(tonnes).toBeCloseTo(846.6*31.1034768,0);
    await page.locator('.smse-unit-toggle button[data-unit="moz"]').click();expect(Number(await mine.inputValue())).toBeCloseTo(846.6,1);
    await mine.fill('800');await page.locator('#exploreBtn').click();const result=await page.evaluate(()=>window.__carrowmontSilverLastResult.scenario);expect(result.physical.mineProduction).toBeCloseTo(800,8);expect(result.scenarioType).toBe('custom');
  });

  test('[AUTO] physical and macro results remain separately visible and never become a silver-price signal',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);const body=(await page.locator('main').innerText()).replace(/\s+/g,' ');
    await expect(page.locator('#physicalLabel')).toContainText('deficit');await expect(page.locator('#macroLabel')).toHaveText(/Supportive|Mixed|Adverse/);
    expect(body).toContain('Inventory limitation');expect(body).toContain('does not guarantee a price increase');expect(body).not.toMatch(/silver (?:will|must) (?:rise|fall)|buy silver now|sell silver now/i);
  });

  test('[AUTO] supply-demand and force-map charts have real geometry and accessible table parity',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await chartHasGeometry(page,'#supplyDemandChart');await chartHasGeometry(page,'#forceMap');
    await expect(page.locator('#supplyDemandTable tr')).toHaveCount(2);await expect(page.locator('#forceMapTable tr')).toHaveCount(6);
    const styles=await page.locator('#forceMap text').first().evaluate(el=>{const c=getComputedStyle(el);return{font:c.fontFamily,size:c.fontSize,weight:c.fontWeight,stroke:c.stroke,strokeWidth:c.strokeWidth};});
    expect(styles.font.toLowerCase()).toContain('inter');expect(styles.size).toBe('13px');expect(Number(styles.weight)).toBeGreaterThanOrEqual(700);expect(styles.stroke).toBe('none');expect(parseFloat(styles.strokeWidth)||0).toBe(0);
  });

  test('[AUTO] discovery article answers silver-vs-gold intent and provides two prominent Explorer paths with neutral global copy',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,ARTICLE);expect(errors).toEqual([]);await expect(page.locator('h1')).toHaveText(/Silver vs gold/i);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://carrowmont.com/silver-vs-gold.html');
    await expect(page.locator('.guide-action-first a[href="/silver-supply-demand-macro-stress-explorer.html"]')).toHaveCount(2);
    const text=(await page.locator('main').innerText()).replace(/\s+/g,' ');expect(text).toMatch(/not simply.*cheaper gold/i);expect(text).toContain('industrial');expect(text).toContain('40.3 million ounces');expect(text).not.toMatch(/₹|\blakhs?\b|\bcrores?\b/i);
  });

  test('[AUTO] Learn hub, Gold cluster, Tools directory and sitemap expose the Silver discovery funnel',async({page,request})=>{
    await gotoClean(page,'/learn.html');await expect(page.locator('a[href="/silver-vs-gold.html"]').first()).toBeVisible();
    await gotoClean(page,'/tools.html');await expect(page.locator('a[href="/silver-supply-demand-macro-stress-explorer.html"]')).toBeVisible();
    for(const path of ['/gold-as-an-investment.html','/gold-and-inflation.html','/gold-vs-stocks.html','/physical-gold-vs-gold-etf.html','/gold-macro-stress-explorer.html']){await gotoClean(page,path);await expect(page.locator('a[href="/silver-vs-gold.html"]').first(),path).toBeVisible();}
    const xml=await (await request.get('/sitemap.xml')).text();expect(xml).toContain('<loc>https://carrowmont.com/silver-vs-gold.html</loc>');expect(xml).toContain('<loc>https://carrowmont.com/silver-supply-demand-macro-stress-explorer.html</loc>');
  });

  test('[AUTO] Copy Summary and CSV consume the current deterministic scenario',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#simple-industrial').selectOption('strong');await page.locator('#exploreBtn').click();
    await page.locator('#copySummaryBtn').click();const clip=await page.evaluate(()=>navigator.clipboard.readText());expect(clip).toContain('Carrowmont Silver Supply, Demand & Macro Stress Explorer');expect(clip).toContain('Industrial demand +5.0%');expect(clip).toContain('does not guarantee a price response');
    const dl=page.waitForEvent('download');await page.locator('#downloadCsvBtn').click();const d=await dl,csv=fs.readFileSync(await d.path(),'utf8');expect(csv).toMatch(/industrial/i);expect(csv).toContain('5');expect(csv).toContain('Large modeled deficit');expect(csv).toContain('million_troy_ounces');expect(csv).toContain('scenario_identifier');
  });

  test('[AUTO] 360px and 390px layouts avoid horizontal overflow and keep actions usable',async({page})=>{
    for(const width of [360,390]){await page.setViewportSize({width,height:900});await gotoClean(page,PAGE);await waitForRendered(page);await assertNoHorizontalOverflow(page,`${width}px Silver Explorer`);await expect(page.locator('#forceMap')).toHaveAttribute('data-chart-layout','mobile');await gotoClean(page,ARTICLE);await assertNoHorizontalOverflow(page,`${width}px Silver vs Gold`);}
  });

  test('[VISUAL] capture desktop and mobile Silver Explorer and discovery article',async({page},testInfo)=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await saveReferenceScreenshot(page,testInfo.project.name,'silver-macro-stress','full');
    await gotoClean(page,ARTICLE);await saveReferenceScreenshot(page,testInfo.project.name,'silver-vs-gold','full');
    if(testInfo.project.name==='chrome-desktop'){for(const width of [390,360]){await page.setViewportSize({width,height:900});await gotoClean(page,PAGE);await waitForRendered(page);await saveReferenceScreenshot(page,testInfo.project.name,'silver-macro-stress',String(width));}}
  });

  test('[AUTO] PDF is exactly four pages and generated from the current Silver scenario',async({page},testInfo)=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#simple-industrial').selectOption('strong');await page.locator('#exploreBtn').click();const dl=page.waitForEvent('download');await page.locator('#generateReportBtn').click();const download=await dl;const info=await validatePdfDownload(download,4);expect(info.pages).toBe(4);savePdfArtifact(info,`silver-macro-stress-${testInfo.project.name}.pdf`);await expect(page.locator('#actionMessage')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] browser uses only same-origin bundled Silver/Gold references and permits only isolated Cloudflare RUM traffic',async({page})=>{
    const requests=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());});await gotoClean(page,PAGE);await waitForRendered(page);const origin=new URL(page.url()).origin;const rum=u=>/^https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum(?:[/?#]|$)/i.test(u);expect(requests.filter(u=>!u.startsWith(origin)&&!rum(u))).toEqual([]);expect(requests.some(u=>u.startsWith(origin)&&u.includes('data/silver-market-reference.json'))).toBeTruthy();expect(requests.some(u=>u.startsWith(origin)&&u.includes('data/gold-macro-reference.json'))).toBeTruthy();
    const app=await (await page.request.get(`${origin}/silver-supply-demand-macro-stress-explorer.js`)).text();expect(app).not.toMatch(/silverinstitute\.org|usgs\.gov|home\.treasury\.gov|federalreserve\.gov|api[_-]?key|openai|anthropic/i);
  });

  test('[AUTO] annual physical-reference validator succeeds offline against the exact served reference',async({request},testInfo)=>{
    test.skip(testInfo.project.name!=='chrome-desktop','Validator gate runs once.');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'carrowmont-silver-validator-'));
    try{const base=(process.env.BASE_URL||'https://carrowmont.com').replace(/\/+$/,'');const [vr,rr]=await Promise.all([request.get(`${base}/scripts/validate-silver-market-reference.mjs`,{failOnStatusCode:false}),request.get(`${base}/data/silver-market-reference.json`,{failOnStatusCode:false})]);expect(vr.status()).toBe(200);expect(rr.status()).toBe(200);const validator=path.join(tmp,'validate.mjs'),ref=path.join(tmp,'reference.json');fs.writeFileSync(validator,await vr.body());fs.writeFileSync(ref,await rr.body());const run=spawnSync(process.execPath,[validator,ref],{encoding:'utf8'});expect(run.status,run.stderr||run.stdout).toBe(0);const out=JSON.parse(run.stdout);expect(out.ok).toBeTruthy();expect(out.referenceYear).toBe(2025);expect(out.publishedBalanceMoz).toBe(-40.3);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
  });
});
