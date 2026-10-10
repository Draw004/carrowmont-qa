import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, chartHasGeometry, saveReferenceScreenshot, validatePdfDownload } from '../helpers/common.js';

const PAGE='/gold-macro-stress-explorer.html';
const DRIVER_ORDER=['realYield','dollar','inflation','centralBank','fiscal','stress'];

async function waitForRendered(page){
  await expect(page.locator('#snapshotDate')).not.toHaveText('Loading…');
  await expect(page.locator('#environmentLabel')).not.toHaveText('—');
  await expect(page.locator('#driverControls select[data-driver]')).toHaveCount(6);
  await expect(page.locator('#forceMapTable tr')).toHaveCount(6);
  await expect(page.locator('#comparisonTable tbody tr')).toHaveCount(6);
}
function savePdfArtifact(info,name){const dir=path.resolve('qa-artifacts','pdfs');fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(info.filePath,path.join(dir,name));}
function fileHash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function dateString(d){return d.toISOString().slice(0,10);}
function buildDailySeries(start,end,startValue,endValue,wobble=0){
  const a=new Date(`${start}T00:00:00Z`),b=new Date(`${end}T00:00:00Z`),days=Math.round((b-a)/86400000),out=[];
  for(let i=0;i<=days;i++){const d=new Date(a.getTime()+i*86400000),t=i/Math.max(1,days),v=startValue+(endValue-startValue)*t+wobble*Math.sin(i/43);out.push({date:dateString(d),value:Number(v.toFixed(6))});}
  return out;
}
function buildMonthlyCpi(startYear,startMonth,count){
  const out=[];for(let i=0;i<count;i++){const total=(startMonth-1)+i,y=startYear+Math.floor(total/12),m=total%12+1,v=100*Math.pow(1.034,i/12);out.push({date:`${y}-${String(m).padStart(2,'0')}-01`,value:Number(v.toFixed(6))});}return out;
}
function syntheticUpdaterFixture(){
  return {
    treasury:buildDailySeries('2020-01-01','2026-10-12',1.55,2.92,.03),
    dollar:buildDailySeries('2020-01-01','2026-10-12',101,121.2,.3),
    cpi:buildMonthlyCpi(2019,1,93),
    gpr:buildDailySeries('2020-01-01','2026-10-12',105,167,.9),
    ofr:buildDailySeries('2020-01-01','2026-10-12',-3.6,-2.36,.04)
  };
}
function runUpdater(updater,current,output,fixture){
  return spawnSync(process.execPath,[updater,'--fixture',fixture,'--current',current,'--output',output],{encoding:'utf8',maxBuffer:20*1024*1024});
}

async function environment(page,scores){return page.evaluate(s=>window.CarrowmontGoldMacroCore.calculateEnvironment(s),scores);}

test.describe('Gold Under Macro Stress Explorer',()=>{
  test('[AUTO] page loads cleanly with one H1, dated bundled snapshot, six drivers and collapsed disclosures',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,PAGE);await waitForRendered(page);
    expect(errors).toEqual([]);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('#snapshotDate')).toContainText('2026');
    await expect(page.locator('#referenceDataDetails')).not.toHaveAttribute('open','');await expect(page.locator('#scenarioPresets')).not.toHaveAttribute('open','');
    await expect(page.locator('#generateReportBtn')).toBeEnabled();await expect(page.locator('body')).toContainText('No login');await expect(page.locator('body')).toContainText('No price forecast');
    const result=await page.evaluate(()=>window.__carrowmontGoldLastResult);expect(result.scenario.environment.drivers).toHaveLength(6);expect(result.scenario.scenarioType).toBe('reference');
  });

  test('[AUTO] approved deterministic fixtures A-K pass independently in the browser core',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);
    const A=await environment(page,{realYield:0,dollar:0,inflation:0,centralBank:0,fiscal:0,stress:0});expect(A.weightedSum).toBe(0);expect(A.normalized).toBe(0);expect(A.label).toBe('Mixed macro environment');expect(A.hasConflict).toBeFalsy();
    const B=await environment(page,{realYield:1,dollar:1,inflation:1,centralBank:1,fiscal:1,stress:1});expect(B.weightedSum).toBe(7);expect(B.normalized).toBeCloseTo(.5,10);expect(B.label).toBe('Supportive macro environment');
    const C=await environment(page,{realYield:-1,dollar:-1,inflation:-1,centralBank:-1,fiscal:-1,stress:-1});expect(C.weightedSum).toBe(-7);expect(C.normalized).toBeCloseTo(-.5,10);expect(C.label).toBe('Macro headwinds');
    const D=await environment(page,{realYield:2,dollar:2,inflation:2,centralBank:2,fiscal:2,stress:2});expect(D.weightedSum).toBe(14);expect(D.normalized).toBe(1);expect(D.label).toBe('Strongly supportive macro environment');
    const E=await environment(page,{realYield:-2,dollar:-2,inflation:-2,centralBank:-2,fiscal:-2,stress:-2});expect(E.weightedSum).toBe(-14);expect(E.normalized).toBe(-1);expect(E.label).toBe('Strong macro headwinds');
    const F=await environment(page,{realYield:-2,dollar:-2,inflation:1,centralBank:1,fiscal:1,stress:1});expect(F.weightedSum).toBe(-2);expect(F.normalized).toBeCloseTo(-2/14,10);expect(F.label).toBe('Mixed macro environment');expect(F.hasConflict).toBeTruthy();
    const G=await page.evaluate(()=>{const C=window.CarrowmontGoldMacroCore,e=C.calculateEnvironment({realYield:-1,dollar:0,inflation:2,centralBank:2,fiscal:2,stress:2});return{e,text:C.buildInterpretation(e)};});expect(G.e.weightedSum).toBe(6.5);expect(G.e.normalized).toBeCloseTo(6.5/14,10);expect(G.e.label).toBe('Supportive macro environment');expect(G.e.hasConflict).toBeTruthy();expect(G.text).toContain('Real yields');expect(G.text.toLowerCase()).toContain('headwind');
    const H=await page.evaluate(()=>window.CarrowmontGoldMacroCore.classifyRealYield({fiveYearPercentile:10,trend13WeekPp:-.6}));expect(H.baseScore).toBe(2);expect(H.trendModifier).toBe(1);expect(H.score).toBe(2);
    const I=await page.evaluate(()=>window.CarrowmontGoldMacroCore.classifyDollar({fiveYearPercentile:75,trend13WeekPct:3.5}));expect(I.baseScore).toBe(-1);expect(I.trendModifier).toBe(-1);expect(I.score).toBe(-2);
    expect(await page.evaluate(()=>window.CarrowmontGoldMacroCore.combineStress(2,0))).toBe(2);expect(await page.evaluate(()=>window.CarrowmontGoldMacroCore.combineStress(-1,-1))).toBe(-1);
  });

  test('[AUTO] bundled reference classifications are independently recomputed and detailed sources open through the real user flow',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);
    const referenceCheck=await page.evaluate(async()=>{const r=await (await fetch('data/gold-macro-reference.json',{cache:'no-store'})).json();const c=window.CarrowmontGoldMacroCore.referenceScores(r);return{computed:c,stored:{realYield:r.drivers.realYields.referenceScore,dollar:r.drivers.dollar.referenceScore,inflation:r.drivers.inflation.referenceScore,centralBank:r.drivers.centralBankDemand.referenceScore,fiscal:r.drivers.fiscalStress.referenceScore,stress:r.drivers.stress.referenceScore},method:r.methodologyVersion};});
    expect(referenceCheck.computed).toEqual(referenceCheck.stored);expect(referenceCheck.method).toBe('gold-macro-stress-v1.0');
    await page.locator('#referenceDataDetails summary').click();await expect(page.locator('#referenceDataDetails')).toHaveAttribute('open','');await expect(page.locator('#referenceDataBody tr')).toHaveCount(6);await expect(page.locator('#referenceDataBody')).toContainText('U.S. Department of the Treasury');await expect(page.locator('#referenceDataBody')).toContainText('World Gold Council');
  });

  test('[AUTO] custom what-if scenario, conflict visibility and Reset fixture L preserve exact reference state',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);const reference=await page.evaluate(()=>window.__carrowmontGoldLastResult.referenceScores);
    await page.locator('#driver-realYield').selectOption('-2');await page.locator('#driver-dollar').selectOption('-2');await page.locator('#driver-inflation').selectOption('1');await page.locator('#driver-centralBank').selectOption('1');await page.locator('#driver-fiscal').selectOption('1');await page.locator('#driver-stress').selectOption('1');await page.locator('#exploreBtn').click();
    const custom=await page.evaluate(()=>window.__carrowmontGoldLastResult.scenario);expect(custom.environment.label).toBe('Mixed macro environment');expect(custom.environment.hasConflict).toBeTruthy();await expect(page.locator('#scenarioType')).toHaveText('CUSTOM WHAT-IF SCENARIO');await expect(page.locator('#conflictBadge')).toBeVisible();
    await page.locator('#resetBtn').click();const reset=await page.evaluate(()=>({r:window.__carrowmontGoldLastResult.referenceScores,s:window.__carrowmontGoldLastResult.scenario.scores,changed:window.__carrowmontGoldLastResult.scenario.changedDrivers,flags:window.__carrowmontGoldLastResult.scenario.isUserOverride}));expect(reset.s).toEqual(reset.r);expect(reset.r).toEqual(reference);expect(reset.changed).toEqual([]);expect(Object.values(reset.flags).every(Boolean)).toBeFalsy();await expect(page.locator('#scenarioType')).toHaveText('REFERENCE SNAPSHOT');
  });

  test('[AUTO] scenario shortcuts affect only documented drivers and disclosure starts collapsed',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await expect(page.locator('#scenarioPresets')).not.toHaveAttribute('open','');await page.locator('#scenarioPresets summary').click();await expect(page.locator('#scenarioPresets')).toHaveAttribute('open','');
    const reference=await page.evaluate(()=>window.__carrowmontGoldLastResult.referenceScores);
    const cases=[['lower-real-yields',{realYield:2}],['higher-real-yields',{realYield:-2}],['dollar-weakness',{dollar:2}],['inflation-shock',{inflation:2}],['central-bank-demand',{centralBank:2}],['stress-shock',{fiscal:2,stress:2}]];
    for(const [preset,changes] of cases){await page.locator(`button[data-preset="${preset}"]`).click();const got=await page.evaluate(()=>window.__carrowmontGoldLastResult.scenario.scores);for(const key of DRIVER_ORDER)expect(got[key],`${preset}:${key}`).toBe(Object.prototype.hasOwnProperty.call(changes,key)?changes[key]:reference[key]);}
  });

  test('[AUTO] rendered result language remains qualitative and never becomes a gold-price prediction',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#driver-realYield').selectOption('2');await page.locator('#driver-dollar').selectOption('2');await page.locator('#driver-inflation').selectOption('2');await page.locator('#driver-centralBank').selectOption('2');await page.locator('#driver-fiscal').selectOption('2');await page.locator('#driver-stress').selectOption('2');await page.locator('#exploreBtn').click();
    await expect(page.locator('#environmentLabel')).toHaveText('Strongly supportive macro environment');const rendered=await page.locator('#environmentLabel, #interpretation, .gmse-disclaimer').allTextContents();const text=rendered.join(' ').toLowerCase();expect(text).not.toMatch(/gold (?:will|must|is guaranteed to) (?:rise|fall|increase|decrease)/);expect(text).not.toMatch(/price target|expected return|buy gold|sell gold/);await expect(page.locator('.gmse-disclaimer')).toContainText('not a gold-price forecast or investment recommendation');
  });

  test('[AUTO] force map uses hardened Carrowmont typography, bounded permanent labels and accessible parity',async({page})=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await chartHasGeometry(page,'#forceMap');
    const style=await page.locator('#forceMap text').first().evaluate(el=>{const c=getComputedStyle(el);return{fontFamily:c.fontFamily,fontSize:c.fontSize,fontWeight:c.fontWeight,fill:c.fill,stroke:c.stroke,strokeWidth:c.strokeWidth};});expect(style.fontFamily.toLowerCase()).toContain('inter');expect(style.fontSize).toBe('13px');expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(700);expect(style.stroke).toBe('none');expect(parseFloat(style.strokeWidth)||0).toBe(0);
    const geometry=await page.locator('#forceMap').evaluate(svg=>{const vb=svg.viewBox.baseVal;const boxes=[...svg.querySelectorAll('text')].map(n=>{const b=n.getBBox(),r=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,text:n.textContent,renderedHeight:r.height};});return{viewBox:{x:vb.x,y:vb.y,width:vb.width,height:vb.height},layout:svg.dataset.chartLayout,boxes};});for(const b of geometry.boxes){expect(b.x,`${b.text} left`).toBeGreaterThanOrEqual(geometry.viewBox.x-.5);expect(b.right,`${b.text} right`).toBeLessThanOrEqual(geometry.viewBox.x+geometry.viewBox.width+.5);expect(b.y,`${b.text} top`).toBeGreaterThanOrEqual(geometry.viewBox.y-.5);expect(b.bottom,`${b.text} bottom`).toBeLessThanOrEqual(geometry.viewBox.y+geometry.viewBox.height+.5);if(geometry.layout==='mobile')expect(b.renderedHeight,`${b.text} rendered height`).toBeGreaterThanOrEqual(10.5);}const table=await page.locator('#forceMapTable tr').allTextContents();expect(table).toHaveLength(6);for(const name of ['Real yields','U.S. dollar','Inflation pressure','Central-bank demand','Fiscal stress','Geopolitical / financial stress'])expect(table.join('\n')).toContain(name);
  });

  test('[AUTO] Copy Summary and CSV use the current deterministic scenario result',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']);await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#driver-dollar').selectOption('2');await page.locator('#exploreBtn').click();const label=await page.locator('#environmentLabel').textContent();await page.locator('#copySummaryBtn').click();const clip=await page.evaluate(()=>navigator.clipboard.readText());expect(clip).toContain(`Overall macro environment: ${label}`);expect(clip).toContain('U.S. dollar');expect(clip).toContain('[changed from reference]');expect(clip).toContain('not a gold-price forecast');
    const dl=page.waitForEvent('download');await page.locator('#downloadCsvBtn').click();const download=await dl;const csv=fs.readFileSync(await download.path(),'utf8');expect(csv).toContain(`Overall macro environment,${label}`);expect(csv).toContain('U.S. dollar');expect(csv).toContain(',yes');expect(csv).toContain('Reference snapshot date');expect(csv).toContain('Macro-environment framework only');
  });

  test('[AUTO] 360px and 390px layouts avoid page overflow and keep actions usable',async({page})=>{
    for(const width of [360,390]){await page.setViewportSize({width,height:900});await gotoClean(page,PAGE);await waitForRendered(page);await assertNoHorizontalOverflow(page,`${width}px SEO3D`);await expect(page.locator('#forceMap')).toHaveAttribute('data-chart-layout','mobile');const chartText=await page.locator('#forceMap text').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(Math.min(...chartText)).toBeGreaterThanOrEqual(10.5);const buttons=await page.locator('.gmse-actions .gmse-button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,right:r.right};}));expect(buttons).toHaveLength(3);buttons.forEach(b=>{expect(b.height).toBeGreaterThanOrEqual(43);expect(b.left).toBeGreaterThanOrEqual(-1);expect(b.right).toBeLessThanOrEqual(width+1);});}
  });

  test('[VISUAL] capture desktop and mobile SEO3D reference screenshots',async({page},testInfo)=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await saveReferenceScreenshot(page,testInfo.project.name,'gold-macro-stress','full');
    if(testInfo.project.name==='chrome-desktop'){for(const width of [390,360]){await page.setViewportSize({width,height:900});await gotoClean(page,PAGE);await waitForRendered(page);await saveReferenceScreenshot(page,testInfo.project.name,'gold-macro-stress',String(width));}}
  });

  test('[AUTO] PDF is exactly four pages and is generated from the current web scenario',async({page},testInfo)=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#driver-dollar').selectOption('2');await page.locator('#exploreBtn').click();const dl=page.waitForEvent('download');await page.locator('#generateReportBtn').click();const download=await dl;const info=await validatePdfDownload(download,4);expect(info.pages).toBe(4);savePdfArtifact(info,`gold-macro-stress-${testInfo.project.name}.pdf`);await expect(page.locator('#actionMessage')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] browser uses only same-origin bundled macro data and permits only isolated Cloudflare RUM traffic',async({page})=>{
    const requests=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());});await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#exploreBtn').click();const origin=new URL(page.url()).origin;const isIsolatedCloudflareRum=u=>/^https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum(?:[/?#]|$)/i.test(u);const thirdParty=requests.filter(u=>!u.startsWith(origin)&&!isIsolatedCloudflareRum(u));expect(thirdParty).toEqual([]);expect(requests.some(u=>u.startsWith(origin)&&/data\/gold-macro-reference\.json/.test(u))).toBeTruthy();const scriptSource=await page.locator('body').evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean).join('\n'));expect(scriptSource).not.toMatch(/api[_-]?key|openai|anthropic/i);const appResponse=await (await page.request.get(`${origin}/gold-macro-stress-explorer.js`)).text();expect(appResponse).not.toMatch(/home\.treasury\.gov|federalreserve\.gov|bls\.gov|matteoiacoviello|financialresearch\.gov|gold\.org/i);
  });

  test('[AUTO] updater fixtures cover valid change, no-change, malformed input, partial failure and anomaly rejection',async({request},testInfo)=>{
    test.skip(testInfo.project.name!=='chrome-desktop','Updater fixture gate runs once.');
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'carrowmont-gold-updater-'));
    try{
      // Publisher serves the staged main-site tree through BASE_URL, while live Automated QA checks out only carrowmont-qa.
      // Materialize the exact served updater/reference pair so this fixture gate exercises the deployed/staged product in both layouts.
      const base=(process.env.BASE_URL||'https://carrowmont.com').replace(/\/+$/,'');
      const updaterResponse=await request.get(`${base}/scripts/update-gold-macro-reference.mjs`,{failOnStatusCode:false});
      const currentResponse=await request.get(`${base}/data/gold-macro-reference.json`,{failOnStatusCode:false});
      expect(updaterResponse.status(),`Updater asset was not served from ${base}`).toBe(200);
      expect(currentResponse.status(),`Reference asset was not served from ${base}`).toBe(200);
      const updater=path.join(tmp,'update-gold-macro-reference.mjs'),current=path.join(tmp,'gold-macro-reference.json');
      fs.writeFileSync(updater,await updaterResponse.body());
      fs.writeFileSync(current,await currentResponse.body());
      const fixture=syntheticUpdaterFixture(),fixturePath=path.join(tmp,'valid.json'),out=path.join(tmp,'updated.json');fs.writeFileSync(fixturePath,JSON.stringify(fixture));const valid=runUpdater(updater,current,out,fixturePath);expect(valid.status,valid.stderr||valid.stdout).toBe(0);const validResult=JSON.parse(valid.stdout);expect(validResult.ok).toBeTruthy();expect(validResult.changed).toBeTruthy();expect(validResult.preservedReviewed.centralBankDemand).toBeTruthy();expect(validResult.preservedReviewed.fiscalStress).toBeTruthy();expect(fs.existsSync(out)).toBeTruthy();const old=JSON.parse(fs.readFileSync(current,'utf8')),next=JSON.parse(fs.readFileSync(out,'utf8'));expect(next.drivers.centralBankDemand).toEqual(old.drivers.centralBankDemand);expect(next.drivers.fiscalStress).toEqual(old.drivers.fiscalStress);
      const noChangeOut=path.join(tmp,'no-change.json');const noChange=runUpdater(updater,out,noChangeOut,fixturePath);expect(noChange.status,noChange.stderr||noChange.stdout).toBe(0);expect(JSON.parse(noChange.stdout).changed).toBeFalsy();expect(fs.existsSync(noChangeOut)).toBeFalsy();
      const malformedPath=path.join(tmp,'malformed.json');fs.writeFileSync(malformedPath,JSON.stringify({...fixture,ofr:undefined}));const malformedOut=path.join(tmp,'malformed-out.json'),beforeHash=fileHash(current);const malformed=runUpdater(updater,current,malformedOut,malformedPath);expect(malformed.status).toBe(2);expect(fs.existsSync(malformedOut)).toBeFalsy();expect(fileHash(current)).toBe(beforeHash);
      const partialPath=path.join(tmp,'partial.json');fs.writeFileSync(partialPath,JSON.stringify({error:'simulated source failure'}));const partialOut=path.join(tmp,'partial-out.json'),partial=runUpdater(updater,current,partialOut,partialPath);expect(partial.status).toBe(2);expect(fs.existsSync(partialOut)).toBeFalsy();expect(fileHash(current)).toBe(beforeHash);
      const anomaly=syntheticUpdaterFixture();for(let i=anomaly.treasury.length-10;i<anomaly.treasury.length;i++)anomaly.treasury[i].value=6.5;const anomalyPath=path.join(tmp,'anomaly.json');fs.writeFileSync(anomalyPath,JSON.stringify(anomaly));const anomalyOut=path.join(tmp,'anomaly-out.json'),bad=runUpdater(updater,current,anomalyOut,anomalyPath);expect(bad.status).toBe(2);expect(bad.stderr).toContain('Anomaly guard');expect(fs.existsSync(anomalyOut)).toBeFalsy();expect(fileHash(current)).toBe(beforeHash);
    }finally{fs.rmSync(tmp,{recursive:true,force:true});}
  });
});
