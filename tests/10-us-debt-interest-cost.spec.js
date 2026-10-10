import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, setInput, assertNoHorizontalOverflow, chartHasGeometry, saveReferenceScreenshot, validatePdfDownload } from '../helpers/common.js';

const PAGE='/us-debt-interest-cost-calculator.html';

async function waitForRendered(page){
  await expect(page.locator('#referenceDebt')).not.toHaveText('Loading…');
  await expect(page.locator('#openingInterest')).not.toHaveText('—');
  await expect(page.locator('#scenarioComparisonTable tbody tr')).toHaveCount(3);
  await expect(page.locator('#annualTable tbody tr')).toHaveCount(10);
  await expect(page.locator('#interestChart path')).toHaveCount(3);
}

async function core(page, values){ return page.evaluate(inputs=>window.CarrowmontUSDebtInterestCore.calculate(inputs), values); }
function savePdfArtifact(info,name){const dir=path.resolve('qa-artifacts','pdfs');fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(info.filePath,path.join(dir,name));}

function overlap(a,b){return !(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);}

test.describe('US Debt Interest Cost Calculator',()=>{
  test('[AUTO] page loads cleanly with dated Treasury reference, one H1 and complete Simple Mode result',async({page})=>{
    const errors=monitorPageErrors(page); await gotoClean(page,PAGE); await waitForRendered(page);
    expect(errors).toEqual([]); await expect(page.locator('h1')).toHaveCount(1); await expect(page.locator('#referenceMeta')).toContainText('U.S. Treasury reference'); await expect(page.locator('#referenceMeta')).toContainText('2026');
    await expect(page.locator('#advancedAssumptions')).not.toHaveAttribute('open',''); await expect(page.locator('#debtBasis')).toHaveValue('public'); await expect(page.locator('#debtProvenance')).toContainText('Official U.S. Treasury reference'); await expect(page.locator('body')).toContainText('No login'); await expect(page.locator('body')).toContainText('United States'); await expect(page.locator('body')).toContainText('USD');
    await expect(page.locator('#generateReportBtn')).toBeEnabled();
  });

  test('[AUTO] pure core passes approved full-refi, five-year, parity, timing, completion and lower-floor fixtures',async({page})=>{
    await gotoClean(page,PAGE);
    const full=await core(page,{startingDebt:30e12,existingAverageRate:3,refinancingRate:5,primaryDeficit:0,refinancingWindow:1,projectionYears:1});
    expect(full.selected.openingAnnualizedInterest).toBeCloseTo(.9e12,2); expect(full.selected.annualRows[0].modeledInterestCost).toBeCloseTo(1.5e12,2); expect(full.selected.finalDebt).toBeCloseTo(31.5e12,2);
    const five=await core(page,{startingDebt:30e12,existingAverageRate:3,refinancingRate:5,primaryDeficit:1e12,refinancingWindow:5,projectionYears:3});
    expect(five.selected.annualRows[0].modeledInterestCost).toBeCloseTo(1.02e12,2); expect(five.selected.annualRows[1].modeledInterestCost).toBeCloseTo(1.241e12,2); expect(five.selected.annualRows[2].modeledInterestCost).toBeCloseTo(1.47305e12,2);
    const parity=await core(page,{startingDebt:30e12,existingAverageRate:3,refinancingRate:3,primaryDeficit:0,refinancingWindow:5,projectionYears:5});
    expect(parity.selected.annualRows[0].modeledInterestCost).toBeCloseTo(.9e12,2); expect(parity.selected.annualRows[4].legacyStartingDebtRemaining).toBeCloseTo(0,2); expect(parity.selected.repricedShareOfStartingDebt).toBe(1);
    const timing=await core(page,{startingDebt:30e12,existingAverageRate:3,refinancingRate:3,primaryDeficit:1e12,refinancingWindow:30,projectionYears:2});
    expect(timing.selected.annualRows[1].modeledInterestCost).toBeGreaterThan(timing.selected.annualRows[0].modeledInterestCost);
    const floor=await core(page,{startingDebt:30e12,existingAverageRate:3,refinancingRate:.5,primaryDeficit:0,refinancingWindow:5,projectionYears:1}); expect(floor.sensitivity.find(x=>x.key==='lower').ratePercent).toBe(0);
  });

  test('[AUTO] official presets and custom debt provenance behave explicitly',async({page})=>{
    await gotoClean(page,PAGE); await waitForRendered(page); const publicDebt=await page.locator('#startingDebtTrillions').inputValue();
    await page.locator('#advancedAssumptions summary').click(); await expect(page.locator('#advancedAssumptions')).toHaveAttribute('open','');
    await page.locator('#debtBasis').selectOption('total'); await expect(page.locator('#debtProvenance')).toContainText('total public debt reference'); expect(Number(await page.locator('#startingDebtTrillions').inputValue())).toBeGreaterThan(Number(publicDebt));
    await setInput(page,'#startingDebtTrillions',35); await expect(page.locator('#debtBasis')).toHaveValue('custom'); await expect(page.locator('#debtProvenance')).toContainText('Custom scenario');
    await page.locator('#resetBtn').click(); await expect(page.locator('#debtBasis')).toHaveValue('public'); await expect(page.locator('#debtProvenance')).toContainText('Official U.S. Treasury reference');
  });

  test('[AUTO] scenario controls update results and validation rejects invalid assumptions',async({page})=>{
    await gotoClean(page,PAGE); await waitForRendered(page); const initial=await page.evaluate(()=>window.__carrowmontDebtLastResult.selected.finalYearInterest);
    await setInput(page,'#refinancingRate',6); await page.locator('#calculateBtn').click(); const higher=await page.evaluate(()=>window.__carrowmontDebtLastResult.selected.finalYearInterest); expect(higher).toBeGreaterThan(initial);
    await setInput(page,'#projectionYears',16); await page.locator('#calculateBtn').click(); await expect(page.locator('#validationMessage')).toContainText('whole number from 1 to 15'); await expect(page.locator('#generateReportBtn')).toBeDisabled();
    await setInput(page,'#projectionYears',10); await page.locator('#calculateBtn').click(); await expect(page.locator('#validationMessage')).toHaveText('');
  });

  test('[AUTO] three-series chart uses hardened typography and bounded non-overlapping permanent callouts',async({page})=>{
    await gotoClean(page,PAGE); await waitForRendered(page); await chartHasGeometry(page,'#interestChart'); await expect(page.locator('#interestChart path')).toHaveCount(3); await expect(page.locator('#interestChart .callout-bg')).toHaveCount(3);
    const style=await page.locator('#interestChart text').first().evaluate(el=>{const c=getComputedStyle(el);return{fontFamily:c.fontFamily,fontSize:c.fontSize,fontWeight:c.fontWeight,stroke:c.stroke,strokeWidth:c.strokeWidth};}); expect(style.fontFamily.toLowerCase()).toContain('inter'); expect(style.fontSize).toBe('13px'); expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(700); expect(style.stroke).toBe('none'); expect(parseFloat(style.strokeWidth)||0).toBe(0);
    const boxes=await page.locator('#interestChart .callout-bg').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBBox();return{left:r.x,right:r.x+r.width,top:r.y,bottom:r.y+r.height};})); boxes.forEach(b=>{expect(b.left).toBeGreaterThanOrEqual(92);expect(b.right).toBeLessThanOrEqual(944);expect(b.top).toBeGreaterThanOrEqual(34);expect(b.bottom).toBeLessThanOrEqual(358);}); for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)expect(overlap(boxes[i],boxes[j])).toBeFalsy();
  });

  test('[AUTO] Copy Summary and CSV expose current deterministic assumptions and exact detail',async({page,context})=>{
    await context.grantPermissions(['clipboard-read','clipboard-write']); await gotoClean(page,PAGE); await waitForRendered(page); await setInput(page,'#refinancingRate',5.2); await page.locator('#calculateBtn').click(); await page.locator('#copySummaryBtn').click(); const clip=await page.evaluate(()=>navigator.clipboard.readText()); expect(clip).toContain('5.2%'); expect(clip).toContain('primary deficit before interest'); expect(clip).toContain('Treasury reference date');
    const dl=page.waitForEvent('download'); await page.locator('#downloadCsvBtn').click(); const download=await dl; const csv=fs.readFileSync(await download.path(),'utf8'); expect(csv).toContain('Primary deficit before interest USD'); expect(csv).toContain('Selected-rate year-by-year detail'); expect(csv).toContain('Rate sensitivity comparison');
  });

  test('[AUTO] 360px and 390px layouts avoid page overflow and keep action buttons usable',async({page})=>{
    for(const width of [360,390]){await page.setViewportSize({width,height:900});await gotoClean(page,PAGE);await waitForRendered(page);await assertNoHorizontalOverflow(page,`${width}px SEO3C`);const buttons=await page.locator('.usdc-actions .usdc-button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,right:r.right};}));expect(buttons).toHaveLength(3);buttons.forEach(b=>{expect(b.height).toBeGreaterThanOrEqual(43);expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(width+1);});}
  });

  test('[VISUAL] capture full-page SEO3C reference screenshot',async({page},testInfo)=>{await gotoClean(page,PAGE);await waitForRendered(page);await saveReferenceScreenshot(page,testInfo.project.name,'us-debt-interest-cost','full');});

  test('[AUTO] PDF is a four-page no-login report with current web values',async({page},testInfo)=>{
    await gotoClean(page,PAGE);await waitForRendered(page);await setInput(page,'#refinancingRate',4.5);await page.locator('#calculateBtn').click();const dl=page.waitForEvent('download');await page.locator('#generateReportBtn').click();const download=await dl;const info=await validatePdfDownload(download,4);expect(info.pages).toBe(4);savePdfArtifact(info,`us-debt-interest-cost-${testInfo.project.name}.pdf`);await expect(page.locator('#actionMessage')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] browser uses only same-origin bundled reference data and contains no client secret',async({page})=>{
    const requests=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());});await gotoClean(page,PAGE);await waitForRendered(page);await page.locator('#calculateBtn').click();const thirdParty=requests.filter(u=>!u.startsWith(new URL(page.url()).origin));expect(thirdParty).toEqual([]);const source=await page.locator('body').evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean).join('\n'));expect(source).not.toMatch(/api[_-]?key|openai|anthropic/i);
  });
});
