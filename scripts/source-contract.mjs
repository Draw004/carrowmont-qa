import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.env.SOURCE_ROOT ? path.resolve(process.env.SOURCE_ROOT) : null;
if (!root) {
  console.log('SOURCE_ROOT is not set. Example:');
  console.log('  SOURCE_ROOT=/path/to/carrowmont_tools_standardization npm run source-check');
  process.exit(0);
}

const checks = [];
const add = (name, ok, detail='') => checks.push({ name, ok, detail });
const read = rel => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
};

const tools = [
  ['financial-independence', 'index.html', 'app.js', 'Generate Financial Independence Report'],
  ['goal-planner', 'index.html', 'app.js', 'Generate Goal Report'],
  ['inflation-calculator', 'index.html', 'app.js', 'Generate Inflation Report'],
  ['retirement-calculator', 'planner.html', 'app.js', 'Generate Retirement Report'],
  ['sip-calculator', 'index.html', 'app.js', 'Generate SIP Report'],
  ['budget-cash-flow-planner', 'index.html', 'app.js', 'Generate Budget &amp; Cash Flow Report']
];

for (const [dir, htmlFile, jsFile, buttonText] of tools) {
  const html = read(path.join(dir, htmlFile));
  const js = read(path.join(dir, jsFile));
  add(`${dir}: back-to-tools link`, html.includes('Back to all Carrowmont tools'));
  add(`${dir}: correct report button`, html.includes(buttonText));
  add(`${dir}: Copy Summary capitalization`, html.includes('Copy Summary'));
  add(`${dir}: standardized report message`, js.includes('Report has been downloaded.'));
}

const sipHtml = read('sip-calculator/index.html');
const sipCore = read('sip-calculator/core.js');
const sipApp = read('sip-calculator/app.js');
const sipLocale = read('sip-calculator/locale.js');
add('sip: contribution-frequency selector', sipHtml.includes('id="contributionFrequency"'));
add('sip: standardized frequency periods',
  /weekly\s*:\s*52/.test(sipCore) &&
  /biweekly\s*:\s*26/.test(sipCore) &&
  /semimonthly\s*:\s*24/.test(sipCore) &&
  /fourweekly\s*:\s*13/.test(sipCore) &&
  /monthly\s*:\s*12/.test(sipCore)
);
add('sip: country change reapplies suggested frequency while currency-only changes can preserve user choice',
  sipApp.includes('frequencyUserOverride=false;Locale.setRegion') &&
  sipApp.includes('defaultFrequencyForRegion') &&
  sipApp.includes("$('contributionFrequency').addEventListener('change',()=>{frequencyUserOverride=true")
);
add('sip: country selector is alphabetized with Other / International last', sipApp.includes("a.label.localeCompare(b.label,'en'") && sipApp.includes("if(codeA==='OTHER') return 1"));
const expandedRegionCodes = ['AT','BD','BE','CL','DK','FI','IE','NL','NO','OM','PL','PT','QA','SE'];
add('sip: expanded country profiles are present', expandedRegionCodes.every(code => new RegExp(`\\b${code}:\\s*\\{`).test(sipLocale)));
add('sip: expanded currencies and symbols are present',
  /BDT:\s*\{[^}]*symbol:\s*"৳"/.test(sipLocale) &&
  /CLP:\s*\{[^}]*symbol:\s*"\$"/.test(sipLocale) &&
  /DKK:\s*\{[^}]*symbol:\s*"kr"/.test(sipLocale) &&
  /NOK:\s*\{[^}]*symbol:\s*"kr"/.test(sipLocale) &&
  /OMR:\s*\{[^}]*symbol:\s*"OMR"/.test(sipLocale) &&
  /PLN:\s*\{[^}]*symbol:\s*"zł"/.test(sipLocale) &&
  /QAR:\s*\{[^}]*symbol:\s*"QAR"/.test(sipLocale) &&
  /SEK:\s*\{[^}]*symbol:\s*"kr"/.test(sipLocale)
);
add('sip: country profiles carry contribution-frequency terminology metadata',
  /IN:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"neutral"/.test(sipLocale) &&
  /IE:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"fortnightly"/.test(sipLocale) &&
  /US:\s*\{[^}]*contributionFrequency:\s*"biweekly"[^}]*twoWeekLabel:\s*"biweekly"/.test(sipLocale) &&
  /BD:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"neutral"/.test(sipLocale)
);

const goalHtml = read('goal-planner/index.html');
const goalApp = read('goal-planner/app.js');
const goalLocale = read('goal-planner/locale.js');
const goalPdf = read('goal-planner/goal-pdf-renderer.js');
add('goal: separate pay and savings/contribution frequency inputs',
  goalHtml.includes('id="payFrequency"') &&
  goalHtml.includes('id="contributionFrequency"') &&
  goalHtml.includes('id="sameAsPayCycle"')
);
add('goal: standardized frequency periods and periodic-return calculation',
  /weekly\s*:\s*52/.test(goalApp) &&
  /biweekly\s*:\s*26/.test(goalApp) &&
  /semimonthly\s*:\s*24/.test(goalApp) &&
  /fourweekly\s*:\s*13/.test(goalApp) &&
  /monthly\s*:\s*12/.test(goalApp) &&
  goalApp.includes('periodicRate') && goalApp.includes('annuityFactor(s.ret,s.years,s.contributionFrequency)')
);
add('goal: pay frequency stays independent unless Same as my pay cycle is selected',
  goalApp.includes("els.sameAsPayCycle?.addEventListener('change'") &&
  goalApp.includes('els.contributionFrequency.disabled=els.sameAsPayCycle.checked') &&
  goalApp.includes('els.contributionFrequency.value=els.payFrequency.value')
);
add('goal: country change reapplies suggested frequency while currency-only changes preserve choice',
  goalApp.includes('if(regionChanged){payFrequencyUserOverride=false;contributionFrequencyUserOverride=false;}') &&
  goalApp.includes('defaultFrequencyForRegion')
);
add('goal: country profiles carry shared frequency terminology metadata',
  /IN:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"neutral"/.test(goalLocale) &&
  /IE:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"fortnightly"/.test(goalLocale) &&
  /US:\s*\{[^}]*contributionFrequency:\s*"biweekly"[^}]*twoWeekLabel:\s*"biweekly"/.test(goalLocale) &&
  /BD:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"neutral"/.test(goalLocale)
);
add('goal: one-time investment wording and conditional timing field',
  goalHtml.includes('Optional future one-time investment') &&
  goalHtml.includes('When will this investment be made?') &&
  goalHtml.includes('id="futureLumpTimingField"') &&
  goalApp.includes('updateFutureLumpTiming')
);
add('goal: report and copy summary include selected frequencies',
  goalApp.includes('Pay frequency: ${frequencyLabel(s.payFrequency)}') &&
  goalApp.includes('Savings / contribution frequency: ${frequencyLabel(s.contributionFrequency)}') &&
  goalPdf.includes('selected savings / contribution frequency')
);

const localeParityTools = [
  ['goal-planner', 'app.js'],
  ['financial-independence', 'app.js'],
  ['inflation-calculator', 'app.js'],
  ['retirement-calculator', 'locale-ui.js']
];
for (const [dir, selectorFile] of localeParityTools) {
  const locale = read(`${dir}/locale.js`);
  const selectorJs = read(`${dir}/${selectorFile}`);
  add(`${dir}: expanded country profiles match SIP catalogue`,
    expandedRegionCodes.every(code => new RegExp(`\\b${code}:\\s*\\{`).test(locale))
  );
  add(`${dir}: expanded currencies match SIP catalogue`,
    ['BDT','CLP','DKK','NOK','OMR','PLN','QAR','SEK'].every(code => new RegExp(`\\b${code}:\\s*\\{`).test(locale))
  );
  add(`${dir}: country selector is alphabetized with Other / International last`,
    selectorJs.includes('localeCompare') && selectorJs.includes('OTHER') && selectorJs.includes('return 1')
  );
}
const sipTerminology = read('sip-calculator/terminology.js');
add('sip: international hero uses recurring-investment terminology',
  sipTerminology.includes('See how recurring investments may grow or what recurring investment may be required for a goal.')
);

const fiHtml = read('financial-independence/index.html');
const fiJs = read('financial-independence/app.js');
const fiCore = read('financial-independence/core.js');
const fiLocale = read('financial-independence/locale.js');
const fiPdf = read('financial-independence/fi-pdf-renderer.js');
const fiStyles = read('financial-independence/styles.css');
add('financial-independence: separate pay and investment frequency inputs',
  fiHtml.includes('id="payFrequency"') &&
  fiHtml.includes('id="investmentFrequency"') &&
  fiHtml.includes('id="sameAsPayCycle"')
);
add('financial-independence: frequency controls precede money inputs',
  fiHtml.indexOf('id="payFrequency"') < fiHtml.indexOf('id="currentAssets"') &&
  fiHtml.indexOf('id="investmentFrequency"') < fiHtml.indexOf('id="monthlyContribution"')
);
add('financial-independence: standardized frequency periods drive the investment calculation',
  /weekly\s*:\s*52/.test(fiCore) &&
  /biweekly\s*:\s*26/.test(fiCore) &&
  /semimonthly\s*:\s*24/.test(fiCore) &&
  /fourweekly\s*:\s*13/.test(fiCore) &&
  /monthly\s*:\s*12/.test(fiCore) &&
  fiCore.includes('periodicRate') && fiCore.includes('s.investmentFrequency') && fiCore.includes('requiredContribution')
);
add('financial-independence: pay frequency stays independent unless Same as my pay cycle is selected',
  fiJs.includes("els.sameAsPayCycle?.addEventListener('change'") &&
  fiJs.includes('els.investmentFrequency.disabled=els.sameAsPayCycle.checked') &&
  fiJs.includes('els.investmentFrequency.value=els.payFrequency.value')
);
add('financial-independence: country change reapplies suggested frequency while currency-only changes preserve choice',
  fiJs.includes('if(regionChanged){payFrequencyUserOverride=false;investmentFrequencyUserOverride=false;}') &&
  fiJs.includes('defaultFrequencyForRegion')
);
add('financial-independence: country profiles carry shared frequency terminology metadata',
  /IN:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"neutral"/.test(fiLocale) &&
  /IE:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"fortnightly"/.test(fiLocale) &&
  /US:\s*\{[^}]*contributionFrequency:\s*"biweekly"[^}]*twoWeekLabel:\s*"biweekly"/.test(fiLocale)
);
add('financial-independence: report and copy summary include selected frequencies',
  fiJs.includes('Income / pay frequency: ${frequencyLabel(s.payFrequency)}') &&
  fiJs.includes('Investment frequency: ${frequencyLabel(s.investmentFrequency)}') &&
  fiPdf.includes('selected ${frequencyLabel(s.investmentFrequency)} investment frequency')
);
add('financial-independence: Plan Until Age is a separate planning approach with a bounded horizon',
  fiHtml.includes('id="planningModeSustainable"') &&
  fiHtml.includes('id="planningModeUntilAge"') &&
  fiHtml.includes('id="planUntilAge"') &&
  fiHtml.includes('planning horizon, not a prediction of lifespan') &&
  fiCore.includes("planningMode=raw.planningMode==='until_age'?'until_age':'sustainable'") &&
  fiCore.includes('Math.max(targetAge+1,Math.min(120')
);
add('financial-independence: Plan Until Age models inflation-adjusted withdrawals and continued portfolio growth',
  fiCore.includes('requiredPortfolioForWindow') &&
  fiCore.includes('simulatePostFI') &&
  fiCore.includes('withdrawal+needed/(1+rm)') &&
  fiCore.includes('balance-=withdrawal') &&
  fiCore.includes('const growth=balance*rm') &&
  fiCore.includes('futurePortfolioMonthlyNeed')
);
add('financial-independence: Plan Until Age FI timing can extend beyond age 90 and the comparison chart can expose a later crossing',
  fiCore.includes("s.planningMode==='until_age'?s.planUntilAge:90") &&
  fiCore.includes("s.planUntilAge-1/ppy") &&
  fiCore.includes("s.planningMode==='until_age'?Math.min(s.planUntilAge-1/ppy,requested)") &&
  fiJs.includes('Math.ceil(r.modelledFI.age+1)') &&
  fiJs.includes("'Projected portfolio if contributions continue'") &&
  fiPdf.includes('Math.ceil(r.modelledFI.age+1)')
);
add('financial-independence: Plan Until Age checkpoints omit Target Age +5 while Sustainable FI keeps it',
  fiJs.includes("scenarioHead.textContent=isUntil?'Today and your Target Age':'Today, your Target Age and Target Age +5'") &&
  fiJs.includes("els.scenarioGrid.classList.toggle('plan-until-grid',isUntil)") &&
  fiJs.includes('The full FI Journey and Plan Longevity chart then show withdrawals and portfolio balance through age ${Math.round(s.planUntilAge)}.') &&
  fiStyles.includes('.scenario-grid.plan-until-grid{grid-template-columns:repeat(2,minmax(0,1fr))}') &&
  fiStyles.includes('@media(max-width:720px){.scenario-grid.plan-until-grid{grid-template-columns:1fr}}')
);
add('financial-independence: Plan Until Age has a distinct accumulation-to-drawdown annual journey',
  fiHtml.includes('id="journeyHeadRow"') &&
  fiCore.includes('function planUntilPostFIPath') &&
  fiCore.includes('function planUntilJourney') &&
  fiCore.includes("phase:'Drawdown'") &&
  fiCore.includes('withdrawalThatYear') &&
  fiCore.includes('growthThatYear') &&
  fiCore.includes('isPlanUntilAge') &&
  fiJs.includes('Portfolio-funded spending') &&
  fiJs.includes('End portfolio value') &&
  fiJs.includes('contributions stop at Target Age') &&
  fiStyles.includes('.drawdown-row') &&
  fiStyles.includes('.journey-phase.drawdown')
);
add('financial-independence: Plan Until Age uses a dedicated Plan Longevity chart with horizon and depletion markers',
  fiCore.includes('function planUntilDrawdownSeries') &&
  fiJs.includes("textContent='PLAN LONGEVITY'") &&
  fiJs.includes("textContent='Portfolio balance through Plan Until Age'") &&
  fiJs.includes('addPlanUntilAgeMarker') &&
  fiJs.includes('addDepletionMarker') &&
  fiPdf.includes('Plan Longevity · portfolio balance through Plan Until Age')
);
add('financial-independence: inflation treatment is explicit and distinguishes spending inflation from nominal portfolio values',
  fiJs.includes('Inflation treatment: Portfolio-funded spending increases with') &&
  fiJs.includes('future nominal ${L.getCurrency()}') &&
  fiPdf.includes('inflation-adjusted spending model') &&
  fiPdf.includes('Inflation treatment: Portfolio-funded spending increases with') &&
  fiPdf.includes('future nominal ${L().getCurrency()}')
);
add('financial-independence: Plan Until Age supports uninterrupted manual keyboard entry',
  fiJs.includes('document.activeElement!==els.planUntilAge') &&
  fiJs.includes("els.planUntilAge?.addEventListener('change',commitPlanUntilAge)") &&
  fiJs.includes("els.planUntilAge?.addEventListener('blur',commitPlanUntilAge)")
);
add('financial-independence: invalid Plan Until Age is explained instead of silently corrected',
  fiJs.includes('Plan Until Age must be greater than your Target Financial Independence Age.') &&
  fiJs.includes("setCustomValidity(message)") &&
  fiJs.includes("setAttribute('aria-invalid'") &&
  fiJs.includes("if(isUntil&&!planValidation.valid){renderInvalidPlanUntil") &&
  !fiJs.includes("if(num(els.planUntilAge,95)<=targetAge)els.planUntilAge.value")
);
add('financial-independence: Plan Until Age longevity outputs are exposed in web, summary and report',
  fiHtml.includes('id="longevityBox"') &&
  fiHtml.includes('Projected balance at Plan Until Age') &&
  fiJs.includes('Portfolio longevity:') &&
  fiJs.includes('Projected to deplete at') &&
  fiPdf.includes('Projected balance at Plan Until Age') &&
  fiPdf.includes('Plan Until Age is a planning horizon')
);
const fiViewBoxHeight = Number((fiHtml.match(/id="pathChart"[^>]*viewBox="0 0 800 (\d+)"/) || [])[1]);
const fiChartHeight = Number((fiJs.match(/function chartBase\([^)]*\)\{const W=800,H=(\d+)/) || [])[1]);
add('financial-independence: SVG and chart coordinate heights match', fiViewBoxHeight > 0 && fiViewBoxHeight === fiChartHeight, `${fiViewBoxHeight} vs ${fiChartHeight}`);
add('financial-independence: static chart values', fiJs.includes('fi-static-value'));
add('financial-independence: Target Age and actual FI crossing are explicit chart milestones',
  fiJs.includes('target-age-marker') &&
  fiJs.includes('fi-crossing-marker') &&
  fiJs.includes('Target Age ${Math.round(s.targetAge)}') &&
  fiJs.includes('Target +5 · Age') &&
  fiJs.includes('Projected Portfolio Value') &&
  fiJs.includes('Current Portfolio Value')
);
add('financial-independence: FI Journey exists in the web tool and uses annual summaries of the frequency model',
  fiHtml.includes('id="fiJourney"') &&
  fiHtml.includes('id="journeyDetails"') &&
  fiHtml.includes('View full yearly breakdown') &&
  fiHtml.includes('Investment that year') &&
  fiHtml.includes('Modelled investment growth') &&
  fiCore.includes('function annualJourney') &&
  fiJs.includes('renderJourney')
);
add('financial-independence: precise FI timing is expressed in years and months',
  fiJs.includes('years ${months} month') &&
  fiJs.includes('FI target not reached within the modelled period.')
);

const inflJs = read('inflation-calculator/app.js');
add('inflation: permanent static chart values', inflJs.includes('chart-static-value') && inflJs.includes('Your assumption'));

const reportTools = [
  ['sip-calculator', 'index.html', 'sip-pdf-renderer.js'],
  ['goal-planner', 'index.html', 'goal-pdf-renderer.js'],
  ['financial-independence', 'index.html', 'fi-pdf-renderer.js'],
  ['inflation-calculator', 'index.html', 'inflation-pdf-renderer.js'],
  ['retirement-calculator', 'planner.html', 'retirement-pdf-renderer.js'],
  ['budget-cash-flow-planner', 'index.html', 'budget-pdf-renderer.js']
];
const standards = reportTools.map(([dir]) => read(`${dir}/report-standard.js`));
add('reports: shared report standard exists in all tools', standards.every(Boolean));
add('reports: shared report standard is identical across all tools', standards.every(x => x === standards[0]));
add('reports: standard includes country-aware SIP / Recurring Investment identity',
  standards[0]?.includes("toolName:'SIP Calculator'") &&
  standards[0]?.includes("toolName:'Recurring Investment Calculator'") &&
  standards[0]?.includes("reportTitle:'SIP Planning Report'") &&
  standards[0]?.includes("reportTitle:'Recurring Investment Planning Report'")
);
add('reports: standard defines separate guide and tools pages',
  standards[0]?.includes('Report Guide & Methodology') &&
  standards[0]?.includes('Continue planning with Carrowmont') &&
  standards[0]?.includes('Terminology used in this report') &&
  standards[0]?.includes('Important assumptions & disclaimer')
);
add('reports: shared tool registry includes all six active calculators',
  standards[0]?.includes("key:'investment'") &&
  standards[0]?.includes("key:'retirement'") &&
  standards[0]?.includes("key:'goal'") &&
  standards[0]?.includes("key:'fi'") &&
  standards[0]?.includes("key:'inflation'") &&
  standards[0]?.includes("key:'budget'") &&
  standards[0]?.includes("title:'Budget & Cash Flow Planner'") &&
  standards[0]?.includes("url:'carrowmont.com/budget-cash-flow-planner/'")
);
add('reports: Continue Planning renders every other active tool without four-card truncation',
  standards[0]?.includes("filter(t=>t.key!==currentTool);") &&
  !standards[0]?.includes('.slice(0,4)') &&
  standards[0]?.includes('const rows=Math.ceil(tools.length/2);') &&
  standards[0]?.includes('tools.length%2===1')
);
add('reports: How to read card uses content-aware compact height and stronger guidance text',
  standards[0]?.includes('howH=Math.max(52,22+howLines*14)') &&
  standards[0]?.includes('size:10.1,lineHeight:14,weight:650')
);
for (const [dir,htmlFile,rendererFile] of reportTools) {
  const html=read(`${dir}/${htmlFile}`), renderer=read(`${dir}/${rendererFile}`);
  const standardPos=html.indexOf('report-standard.js'), rendererPos=html.indexOf(rendererFile);
  add(`${dir}: report standard loads before PDF renderer`, standardPos >= 0 && rendererPos > standardPos);
  add(`${dir}: PDF renderer uses standardized guide page`, renderer.includes('.guidePage('));
  add(`${dir}: PDF renderer uses standardized Continue Planning page`, renderer.includes('.continuePlanningPage('));
}

add('financial-independence report: permanent Target Age chart value callouts',
  fiPdf.includes('drawTargetAgeValues') &&
  fiPdf.includes('Target Age ${Math.round(s.targetAge)} is highlighted') &&
  fiPdf.includes('Projected Portfolio Value')
);
add('financial-independence report: projected portfolio callout is above money-added callout',
  fiPdf.includes("chartValueLabel(ctx,b,`Projected Portfolio Value ${compact(r.target.portfolio)}`,'#0e8b80',-38") &&
  fiPdf.includes("chartValueLabel(ctx,a,`Money Added ${compact(moneyAdded)}`,'#8799aa',12")
);
add('financial-independence report: FI Journey is printed with sustainable and Plan Until Age phase context',
  fiPdf.includes('Financial Independence Journey') &&
  fiPdf.includes('INVESTMENT THAT YEAR') &&
  fiPdf.includes('PORTFOLIO-FUNDED SPENDING') &&
  fiPdf.includes('END PORTFOLIO VALUE') &&
  fiPdf.includes('FUNDING %') &&
  fiPdf.includes('Target Age +5') &&
  fiPdf.includes('Drawdown phase') &&
  fiPdf.includes('future nominal currency') &&
  fiPdf.includes('FI target not reached within the modelled period.')
);

add('sip report visuals: midpoint and final callouts pair projected/step-up values above invested/fixed values',
  sipApp.includes('Year ${years} projected') &&
  sipApp.includes('Year ${years} invested') &&
  sipApp.includes('Step-up - year ${years} projected') &&
  sipApp.includes('Year ${years} fixed') &&
  sipApp.includes("anchor:'center',dy:-12") &&
  sipApp.includes("anchor:'center',dy:60")
);

const retirementHtml = read('retirement-calculator/planner.html');
const retirementApp = read('retirement-calculator/app.js');
const retirementLocale = read('retirement-calculator/locale.js');
const retirementMethodology = read('retirement-calculator/methodology.html');
const retirementCss = read('retirement-calculator/styles.css');
const inflationCss = read('inflation-calculator/styles.css');
add('retirement: separate pay and contribution frequency inputs',
  retirementHtml.includes('id="payFrequency"') &&
  retirementHtml.includes('id="contributionFrequency"') &&
  retirementHtml.includes('id="sameAsPayCycle"')
);
add('retirement: frequency controls precede savings and contribution inputs',
  retirementHtml.indexOf('id="payFrequency"') < retirementHtml.indexOf('id="currentSavings"') &&
  retirementHtml.indexOf('id="contributionFrequency"') < retirementHtml.indexOf('id="currentMonthlyInvestment"')
);
add('retirement: standardized frequency periods drive pre-retirement contributions',
  /weekly\s*:\s*52/.test(retirementApp) &&
  /biweekly\s*:\s*26/.test(retirementApp) &&
  /semimonthly\s*:\s*24/.test(retirementApp) &&
  /fourweekly\s*:\s*13/.test(retirementApp) &&
  /monthly\s*:\s*12/.test(retirementApp) &&
  retirementApp.includes('contributionSchedule') && retirementApp.includes('s.contributionFrequency')
);
add('retirement: pay frequency stays independent unless Same as my pay cycle is selected',
  retirementApp.includes("$('sameAsPayCycle')?.addEventListener('change'") &&
  retirementApp.includes("$('contributionFrequency').disabled = $('sameAsPayCycle').checked") &&
  retirementApp.includes("$('contributionFrequency').value = $('payFrequency').value")
);
add('retirement: country profiles carry shared frequency terminology metadata',
  /IN:\s*\{[^}]*contributionFrequency:\s*"monthly"[^}]*twoWeekLabel:\s*"neutral"/.test(retirementLocale) &&
  /US:\s*\{[^}]*contributionFrequency:\s*"biweekly"[^}]*twoWeekLabel:\s*"biweekly"/.test(retirementLocale) &&
  /AU:\s*\{[^}]*contributionFrequency:\s*"biweekly"[^}]*twoWeekLabel:\s*"fortnightly"/.test(retirementLocale) &&
  /PH:\s*\{[^}]*contributionFrequency:\s*"semimonthly"/.test(retirementLocale)
);
add('retirement: report and copy summary include selected frequencies',
  retirementApp.includes('Pay frequency: ${frequencyLabel(r.s.payFrequency)}') &&
  retirementApp.includes('Retirement contribution frequency: ${frequencyLabel(r.s.contributionFrequency)}') &&
  retirementApp.includes('Retirement contribution frequency')
);
add('retirement: methodology documents selected contribution frequency',
  retirementMethodology.includes('selected Retirement contribution frequency') &&
  retirementMethodology.includes('Pay frequency is informational')
);
add('retirement and inflation: headers use SIP-aligned 1480px container contract',
  retirementCss.includes('.site-header .container{width:min(1480px,calc(100% - 64px))') &&
  inflationCss.includes('.site-header .container{width:min(1480px,calc(100% - 64px))')
);

const retirementPdf = read('retirement-calculator/retirement-pdf-renderer.js');
add('retirement report: variable-height key-value rows prevent wrapped-label overlap',
  retirementPdf.includes('textLineCount') && retirementPdf.includes('Math.max(minRowH') && retirementPdf.includes('wrappedText(ctx,value') && retirementPdf.includes('maxLines:3')
);
add('retirement report: detailed expense rows use safer pagination and row height',
  retirementPdf.includes('i+=14') && retirementPdf.includes('y+48')
);

add('retirement: report buttons use shrink-safe grid', /grid-template-columns:\s*minmax\(0/.test(retirementCss) && /\.result-actions \.share-button\{[^}]*min-width:0/.test(retirementCss));


const budgetHtml = read('budget-cash-flow-planner/index.html');
const budgetApp = read('budget-cash-flow-planner/app.js');
const budgetStorage = read('budget-cash-flow-planner/storage.js');
const budgetPdf = read('budget-cash-flow-planner/budget-pdf-renderer.js');
const budgetCss = read('budget-cash-flow-planner/styles.css');
const budgetSmart = read('budget-cash-flow-planner/smart-suggestions.js');
const budgetReadme = read('budget-cash-flow-planner/README.md');
add('budget: monthly and pay-cycle views are both present', budgetHtml.includes('Monthly View') && budgetHtml.includes('Pay Cycle View') && budgetHtml.includes('id="primaryPayFrequency"'));
add('budget: frequency model covers weekly through annual and irregular averages', /weekly:\{[^}]*perMonth:52\/12/.test(budgetApp) && /biweekly:\{[^}]*perMonth:26\/12/.test(budgetApp) && /semimonthly:\{[^}]*perMonth:2/.test(budgetApp) && /fourweekly:\{[^}]*perMonth:13\/12/.test(budgetApp) && /quarterly:\{[^}]*perMonth:1\/3/.test(budgetApp) && /annual:\{[^}]*perMonth:1\/12/.test(budgetApp) && budgetApp.includes("irregular:{label:'Irregular / Monthly Average'"));
add('budget: irregular bills are translated into monthly reserves without double subtraction', budgetApp.includes('function irregularReserve') && budgetApp.includes('const remaining=income-essential-flexible-saving') && budgetHtml.includes('Irregular-bill reserves'));
add('budget: emergency reserve target is user-selected', budgetHtml.includes('id="emergencyTargetMonths"') && budgetHtml.includes('Carrowmont does not assume one universal number of months'));
add('budget: privacy-first local history uses IndexedDB plus localStorage preferences', budgetStorage.includes("indexedDB.open(DB_NAME") && budgetStorage.includes('localStorage.setItem') && budgetStorage.includes('exportAll') && budgetStorage.includes('importAll'));
add('budget: history supports 3/6/12 month views and exceptional records', budgetHtml.includes('Last 3 months') && budgetHtml.includes('Last 6 months') && budgetHtml.includes('Last 12 months') && budgetApp.includes('monthExceptional'));
add('budget: Smart Suggestions SS2 UI and local engine are wired',
  budgetHtml.includes('SMART SUGGESTIONS') &&
  budgetHtml.includes('id="smartScenarioPanel"') &&
  budgetHtml.includes('id="smartScenarioBreakdown"') &&
  budgetHtml.includes('data-smart-scenario="low"') &&
  budgetHtml.includes('data-smart-scenario="balanced"') &&
  budgetHtml.includes('data-smart-scenario="aggressive"') &&
  budgetHtml.indexOf('smart-suggestions.js') < budgetHtml.indexOf('app.js') &&
  budgetApp.includes('CarrowmontSmartSuggestions') &&
  budgetApp.includes('function smartAnalysis') &&
  budgetApp.includes('Why am I seeing this?') &&
  budgetApp.includes('smartScenarioBreakdownBody') &&
  budgetReadme.includes('Smart Suggestions SS2 runs entirely in the browser')
);
add('budget: Smart Suggestions engine has no budget-data network primitive',
  budgetSmart.includes("generatedFrom: 'deterministic-local-engine'") &&
  !/\bfetch\s*\(/.test(budgetSmart) &&
  !/XMLHttpRequest/.test(budgetSmart) &&
  !/sendBeacon/.test(budgetSmart) &&
  !/WebSocket/.test(budgetSmart)
);

let smartEngine = null;
let smartEngineError = '';
try {
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, console });
  vm.runInContext(budgetSmart, context, { filename: 'smart-suggestions.js' });
  smartEngine = module.exports;
} catch (error) {
  smartEngineError = error && error.message ? error.message : String(error);
}
add('budget: Smart Suggestions engine loads as a pure deterministic module', !!smartEngine && typeof smartEngine.analyze === 'function' && typeof smartEngine.present === 'function', smartEngineError);

if (smartEngine) {
  const row = (id, name, amount, extra={}) => ({ id, name, amount, frequency: 'monthly', protected: false, exceptional: false, ...extra });
  const month = (monthId, flexibleAmount=5000, options={}) => ({
    month: monthId,
    monthExceptional: !!options.monthExceptional,
    flexible: [row('hist-dining', 'Dining & entertainment', flexibleAmount, { exceptional: !!options.rowExceptional })],
    essential: [row('hist-rent', 'Rent', options.rentAmount || 30000, { protected: true })],
    savings: [{ id: 'hist-save', name: 'Saving', amount: options.savingAmount ?? 10000, frequency: 'monthly' }],
    summary: { income: 120000, flexible: flexibleAmount, essential: options.rentAmount || 30000, saving: options.savingAmount ?? 10000, remaining: 120000 - flexibleAmount - (options.rentAmount || 30000) - (options.savingAmount ?? 10000) }
  });
  const current = (overrides={}) => ({
    month: '2026-10', priority: 'goal', smartScenario: 'balanced', emergencyTargetMonths: 6,
    flexible: [row('current-dining', 'Dining & entertainment', 8500)],
    essential: [row('current-rent', 'Rent', 30000, { protected: true })], savings: [], ...overrides
  });
  const summary = (overrides={}) => ({ income: 120000, essential: 30000, flexible: 8500, saving: 10000, reserves: 0, remaining: 71500, coverage: 3, emergencyGap: 90000, ...overrides });
  const three = ['2026-07','2026-08','2026-09'].map(id => month(id, 5000));

  const noHistory = smartEngine.analyze({ state: current(), history: [], summary: summary() });
  const twoHistory = smartEngine.analyze({ state: current(), history: three.slice(0,2), summary: summary() });
  const threeHistory = smartEngine.analyze({ state: current(), history: three, summary: summary() });
  add('budget smart: history sufficiency gates trend claims at three normal months',
    noHistory.context.normalHistoryMonths === 0 &&
    !noHistory.signals.some(s => /trend|category_change/.test(s.kind)) &&
    twoHistory.context.normalHistoryMonths === 2 &&
    !twoHistory.signals.some(s => /trend|category_change/.test(s.kind)) &&
    threeHistory.context.normalHistoryMonths === 3 &&
    threeHistory.reductionCandidates.length === 1
  );

  const protectedState = current({ flexible: [row('current-dining', 'Dining & entertainment', 8500, { protected: true })] });
  const protectedAnalysis = smartEngine.analyze({ state: protectedState, history: three, summary: summary() });
  const exceptionalState = current({ flexible: [row('current-dining', 'Dining & entertainment', 8500, { exceptional: true })] });
  const exceptionalAnalysis = smartEngine.analyze({ state: exceptionalState, history: three, summary: summary() });
  add('budget smart: protected and exceptional flexible categories never become reduction candidates', protectedAnalysis.reductionCandidates.length === 0 && exceptionalAnalysis.reductionCandidates.length === 0);

  const exceptionalMonthHistory = [month('2026-07',5000), month('2026-08',5000), month('2026-09',15000,{monthExceptional:true})];
  const exceptionalMonthAnalysis = smartEngine.analyze({ state: current(), history: exceptionalMonthHistory, summary: summary() });
  add('budget smart: exceptional months remain excluded from normal history baseline', exceptionalMonthAnalysis.context.normalHistoryMonths === 2 && exceptionalMonthAnalysis.context.excludedExceptionalMonths === 1 && exceptionalMonthAnalysis.reductionCandidates.length === 0);

  const scenario = threeHistory.scenarios.totals;
  add('budget smart: scenario mathematics use evidenced excess plus category caps', Math.abs(scenario.low - 850) < 0.001 && Math.abs(scenario.balanced - 1700) < 0.001 && Math.abs(scenario.aggressive - 2550) < 0.001);

  const essentialState = current({ essential: [row('current-rent', 'Rent', 36000, { protected: false })], flexible: [] });
  const essentialHistory = ['2026-07','2026-08','2026-09'].map(id => month(id, 0, { rentAmount: 30000 }));
  const essentialAnalysis = smartEngine.analyze({ state: essentialState, history: essentialHistory, summary: summary({ essential: 36000, flexible: 0 }) });
  const essentialSignal = essentialAnalysis.signals.find(s => s.kind === 'essential_cost_change');
  add('budget smart: essential increases are informational only and never reduction sources', !!essentialSignal && !essentialSignal.eligibleForReduction && essentialAnalysis.reductionCandidates.length === 0);

  const sixTrend = [5000,5000,5000,6000,6000,6000].map((v,i)=>month(`2026-${String(i+1).padStart(2,'0')}`,v));
  const sixAnalysis = smartEngine.analyze({ state: current({ month:'2026-07', flexible:[row('current-dining','Dining & entertainment',6000)] }), history: sixTrend, summary: summary({ flexible:6000 }) });
  add('budget smart: six-month latest-3 versus previous-3 trend is deterministic', sixAnalysis.signals.some(s => s.kind === 'persistent_flexible_trend' && s.historyMonthsUsed === 6));

  const twelveTrend = [5000,5000,5000,5000,5000,5000,6000,6000,6000,6000,6000,6000].map((v,i)=>month(`2025-${String(i+1).padStart(2,'0')}`,v));
  const twelveAnalysis = smartEngine.analyze({ state: current({ month:'2026-01', flexible:[row('current-dining','Dining & entertainment',6000)] }), history: twelveTrend, summary: summary({ flexible:6000 }) });
  add('budget smart: twelve-month persistence check is deterministic', twelveAnalysis.signals.some(s => s.kind === 'persistent_flexible_trend' && s.historyMonthsUsed === 12));

  const negativeAnalysis = smartEngine.analyze({ state: current(), history: three, summary: summary({ remaining: -5000 }) });
  add('budget smart: negative free cash flow ranks first', negativeAnalysis.primary[0]?.kind === 'cashflow_pressure');

  const zeroIncomeAnalysis = smartEngine.analyze({ state: current(), history: three, summary: summary({ income: 0, remaining: -48500 }) });
  add('budget smart: zero income is safe and does not create percentage-of-income reduction candidates', zeroIncomeAnalysis.reductionCandidates.length === 0 && zeroIncomeAnalysis.primary[0]?.kind === 'cashflow_pressure');

  const goalView = smartEngine.present(threeHistory, { scenario: 'balanced', money: v => String(Math.round(v)) });
  add('budget smart: selected priority links scenario capacity to the correct destination tool', goalView.scenario?.relatedTool?.href === '/goal-planner/' && goalView.scenario?.amount === 1700);

  add('budget smart SS2: engine version and structured evidence contract are active',
    smartEngine.VERSION === '2.0.0' &&
    threeHistory.signals.every(s => 'score' in s && 'confidenceLabel' in s && 'comparisonWindow' in s && 'reasonCodes' in s && 'scenarioEligible' in s && 'frequencyClass' in s)
  );
  add('budget smart SS2: no-history state does not pad primary cards with low-value filler',
    noHistory.primary.length === 0 && noHistory.noAction?.reason === 'insufficient-history'
  );
  const emerging = threeHistory.signals.find(s => s.kind === 'flexible_category_change');
  add('budget smart SS2: three normal months create Emerging category evidence',
    emerging?.confidenceLabel === 'Emerging' && emerging?.comparisonWindow === 'current-vs-3' && emerging?.historyMonthsUsed === 3
  );
  add('budget smart SS2: primary cards are thresholded rather than padded',
    threeHistory.primary.length === 1 && threeHistory.primary[0]?.kind === 'flexible_category_change' && threeHistory.primary[0]?.score >= 35
  );
  add('budget smart SS2: six-month Established trend requires repeated consistency',
    sixAnalysis.signals.some(s => s.kind === 'persistent_flexible_trend' && s.confidenceLabel === 'Established' && s.consistencyCount >= 2 && s.consistencyRequired === 2)
  );
  const sixSpike = [5000,5000,5000,5000,5000,9000].map((v,i)=>month(`2026-${String(i+1).padStart(2,'0')}`,v));
  const sixSpikeAnalysis = smartEngine.analyze({ state: current({ month:'2026-07', flexible:[row('current-dining','Dining & entertainment',9000)] }), history: sixSpike, summary: summary({ flexible:9000 }) });
  add('budget smart SS2: a single six-month spike does not become Established',
    !sixSpikeAnalysis.signals.some(s => s.kind === 'persistent_flexible_trend' && s.confidenceLabel === 'Established')
  );
  const twelveSpike = [5000,5000,5000,5000,5000,5000,5000,5000,5000,5000,5000,12000].map((v,i)=>month(`2025-${String(i+1).padStart(2,'0')}`,v));
  const twelveSpikeAnalysis = smartEngine.analyze({ state: current({ month:'2026-01', flexible:[row('current-dining','Dining & entertainment',12000)] }), history: twelveSpike, summary: summary({ flexible:12000 }) });
  add('budget smart SS2: a single twelve-month spike does not become Established',
    !twelveSpikeAnalysis.signals.some(s => s.kind === 'persistent_flexible_trend' && s.confidenceLabel === 'Established')
  );
  const recurringHistory = [5000,5000,5000,6500,6500].map((v,i)=>month(`2026-${String(i+1).padStart(2,'0')}`,v));
  const recurringAnalysis = smartEngine.analyze({ state: current({ month:'2026-06', flexible:[row('current-dining','Dining & entertainment',7000)] }), history: recurringHistory, summary: summary({ flexible:7000 }) });
  const recurringSignal = recurringAnalysis.signals.find(s => s.kind === 'recurring_cost_step_up');
  add('budget smart SS2: stable recurring step-up is identified and generic duplicate is suppressed',
    !!recurringSignal && recurringAnalysis.signals.some(s => s.kind === 'flexible_category_change' && s.suppressedBy === recurringSignal.id)
  );
  const annualState = current({ month:'2026-10', flexible:[row('annual-trip','Annual travel reserve',24000,{frequency:'annual'})] });
  const annualHistory = ['2026-07','2026-08','2026-09'].map(id => ({...month(id,0), flexible:[row('annual-trip','Annual travel reserve',12000,{frequency:'annual'})], summary:{...month(id,0).summary, flexible:1000}}));
  const annualAnalysis = smartEngine.analyze({ state: annualState, history: annualHistory, summary: summary({ flexible:2000, reserves:2000 }) });
  add('budget smart SS2: annual reserve changes stay informational and out of scenarios',
    annualAnalysis.signals.some(s => s.kind === 'reserve_style_change' && s.frequencyClass === 'reserve-style' && !s.scenarioEligible) && annualAnalysis.reductionCandidates.length === 0
  );
  const genericTotal = threeHistory.signals.find(s => s.kind === 'flexible_total_change');
  add('budget smart SS2: category evidence deterministically suppresses redundant total-level evidence',
    !!genericTotal?.suppressedBy && genericTotal.suppressedBy === emerging?.id
  );
  const balancedBreakdown = threeHistory.scenarios.breakdown.balanced || [];
  add('budget smart SS2: scenario breakdown sums exactly to scenario total',
    Math.abs(balancedBreakdown.reduce((sum,x)=>sum+x.adjustmentValue,0) - threeHistory.scenarios.totals.balanced) < 0.001 &&
    balancedBreakdown.every(x => x.adjustmentValue <= x.excessValue + 1e-9)
  );
}

add('budget: report uses shared Smart Suggestions plus guide and Continue Planning pages', budgetPdf.includes('function smartView') && budgetPdf.includes('SMART SUGGESTIONS') && budgetPdf.includes('SELECTED SCENARIO') && budgetPdf.includes('.guidePage(') && budgetPdf.includes('.continuePlanningPage(') && budgetPdf.includes("currentTool:'budget'"));
add('budget: SS2 report prints evidence labels and scenario breakdown from shared presentation', budgetPdf.includes('confidenceLabel') && budgetPdf.includes('Scenario breakdown') && budgetPdf.includes('smart.emptyState') && budgetPdf.includes('/ 12 months'));
add('budget: report page 3 uses plain-language wrapped comparison notes',
  budgetPdf.includes('HOW THIS REPORT INTERPRETS YOUR ENTRIES') &&
  budgetPdf.includes("label:'Different frequencies'") &&
  budgetPdf.includes("label:'Irregular / monthly average'") &&
  budgetPdf.includes("label:'Exceptional entries'") &&
  budgetPdf.includes('left out of the normal comparison baseline') &&
  budgetPdf.includes('function noteTable') &&
  budgetPdf.includes('P().wrappedText(ctx,body,bodyX')
);
add('budget: shared footer standard is applied', budgetHtml.includes('footer-brand-block') && budgetHtml.includes('footer-investment-link') && budgetCss.includes('Carrowmont shared footer standard - 2026-09-27'));
add('budget: shared tool header and locale shell use the approved UI standard',
  budgetCss.includes('Carrowmont shared tool-header standard - 2026-10-01') &&
  budgetCss.includes('border-radius:999px!important') &&
  budgetCss.includes('width:360px!important') &&
  budgetCss.includes('.site-header .container{width:min(1480px,calc(100% - 64px))!important') &&
  budgetHtml.includes('It does not convert entered amounts using an exchange rate.')
);
add('budget: currency labels use CODE dot Currency Name and CTA arrows do not leak into footer navigation',
  budgetApp.includes('>${k} · ${escapeHtml(v.label)}</option>') &&
  !budgetApp.includes(".investment-tool-link,.footer-investment-link") &&
  budgetApp.includes("document.querySelectorAll('.footer-investment-link').forEach(a=>a.textContent=investmentName)")
);

// Main-site checks run when SOURCE_ROOT also contains draw004.github.io (for example, a full source snapshot).
const mainHome = read('draw004.github.io/index.html');
const mainSiteJs = read('draw004.github.io/site.js');
if (mainHome || mainSiteJs) {
  add('main site: Budget & Cash Flow Planner is live and discoverable',
    mainHome.includes('class="tool-card budget-card"') &&
    mainHome.includes('href="/budget-cash-flow-planner/"') &&
    read('draw004.github.io/sitemap.xml').includes('https://carrowmont.com/budget-cash-flow-planner/')
  );
  add('main site: Monthly Investment Calculator retired as product identity',
    !mainHome.includes('Monthly Investment Calculator') && !mainSiteJs.includes('Monthly Investment Calculator')
  );
  add('main site: international investment product uses Recurring Investment Calculator',
    mainHome.includes('Recurring Investment Calculator') && mainSiteJs.includes('Recurring Investment Calculator')
  );

  const mainLocale = read('draw004.github.io/locale.js');
  const mainCss = read('draw004.github.io/carrowmont.css');
  add('main site: homepage country catalogue matches expanded tool list',
    expandedRegionCodes.every(code => new RegExp(`\\b${code}:\\s*\\{`).test(mainLocale))
  );
  add('main site: homepage country selector is alphabetized with Other / International last',
    mainSiteJs.includes('a.label.localeCompare') && mainSiteJs.includes('codeA === "OTHER"') && mainSiteJs.includes('return 1')
  );
  add('main site: redundant Home navigation removed from homepage',
    !/<nav class="desktop-nav"[\s\S]*?<a href="\/">Home<\/a>/.test(mainHome) &&
    !/<div class="mobile-nav-panel"[\s\S]*?<a href="\/">Home<\/a>/.test(mainHome)
  );
  add('main site: homepage keeps practical-tools wording and refined trust-point icons',
    mainHome.includes('Carrowmont gives you practical tools, clear explanations and scenario analysis') &&
    mainHome.includes('hero-point-icon') &&
    !mainHome.includes('Carrowmont gives you practical calculators')
  );
  add('main site: shared footer standard is active',
    mainCss.includes('Carrowmont shared footer standard - 2026-09-27') &&
    mainHome.includes('footer-brand-block') &&
    mainHome.includes('footer-investment-link')
  );
  add('main site: responsive homepage hero image assets are wired without copy changes',
    mainHome.includes('carrowmont-hero-mobile.webp?v=20260927-hero-asset3') &&
    mainHome.includes('carrowmont-hero-laptop.webp?v=20260927-hero-asset3') &&
    mainHome.includes('carrowmont-hero.webp?v=20260927-hero-asset3') &&
    mainCss.includes('Homepage hero responsive image asset fix - 2026-09-27') &&
    mainCss.includes('object-position:80% center!important') &&
    mainCss.includes('object-position:right center!important') &&
    fs.existsSync(path.join(root, 'draw004.github.io/carrowmont-hero.webp')) &&
    fs.existsSync(path.join(root, 'draw004.github.io/carrowmont-hero-laptop.webp')) &&
    fs.existsSync(path.join(root, 'draw004.github.io/carrowmont-hero-mobile.webp'))
  );
}


// Learn expansion contract - 2026-09-27. Protects the 40-article library, sitemap and new money-management pillar.
const learnHub = read('draw004.github.io/learn.html');
const learnExpansion = read('draw004.github.io/learn-expansion.js');
const learnSitemap = read('draw004.github.io/sitemap.xml');
const newLearnPages = [
  '50-30-20-budget-rule.html','zero-based-budgeting.html','pay-yourself-first-budgeting.html','sinking-fund-vs-emergency-fund.html',
  'budgeting-with-irregular-income.html','cash-flow-vs-income.html','lifestyle-inflation.html','how-much-should-i-save-each-month.html',
  'budgeting-by-pay-frequency.html','sequence-of-returns-risk.html','4-percent-rule-retirement.html','longevity-risk-retirement.html',
  'coast-fire-explained.html','sip-during-market-fall.html'
];
add('main site: Learn expansion adds Budget & Cash Flow pillar and popular-question discovery',
  learnHub.includes('data-category="budget"') && learnHub.includes('POPULAR PLANNING QUESTIONS') && learnHub.includes('learn-expansion.js?v=20260927-learn1')
);
add('main site: all 14 new Learn pages exist and are linked from Learn hub',
  newLearnPages.every(file => fs.existsSync(path.join(root,'draw004.github.io',file)) && learnHub.includes('href="/'+file+'"'))
);
add('main site: all 14 new Learn pages are indexable Article pages with canonical URLs and editorial identity',
  newLearnPages.every(file => {
    const page=read('draw004.github.io/'+file);
    return page.includes('name="robots"') && page.includes('index,follow') && page.includes('rel="canonical"') &&
      page.includes('"@type":"Article"') && page.includes('name="author"') && page.includes('content="Carrowmont"') && page.includes('dateModified":"2026-09-28"');
  })
);
add('main site: sitemap contains 71 URLs including all 14 first-wave Learn-expansion pages and the Budget Planner',
  (learnSitemap.match(/<loc>/g)||[]).length===71 && learnSitemap.includes('https://carrowmont.com/budget-cash-flow-planner/') && newLearnPages.every(file => learnSitemap.includes('https://carrowmont.com/'+file))
);
add('main site: Learn expansion preserves country-aware investment wording and market ordering',
  learnExpansion.includes("['investment','assets','retirement','budget','goals','fi','inflation','foundation']") &&
  learnExpansion.includes("['retirement','assets','budget','goals','investment','fi','inflation','foundation']") &&
  learnExpansion.includes('What happens to a SIP when markets fall?') &&
  learnExpansion.includes('What happens to recurring investments when markets fall?')
);


// Assets & Investing expansion contract - 2026-09-27. Protects 12 global asset-class guides and the 52-article Learn library.
const assetLearnPages = [
  'gold-as-an-investment.html',
  'physical-gold-vs-gold-etf.html',
  'gold-vs-stocks.html',
  'gold-and-inflation.html',
  'rent-vs-buy-home.html',
  'rental-yield-explained.html',
  'real-estate-vs-stocks.html',
  'what-is-a-reit.html',
  'reit-vs-direct-property.html',
  'asset-allocation-explained.html',
  'stocks-vs-bonds.html',
  'diversification-across-asset-classes.html',
];
add('main site: Learn hub adds global Assets & Investing pillar and asset discovery cards',
  learnHub.includes('data-category="assets"') && learnHub.includes('Gold as an investment') && learnHub.includes('Rent or buy a home?') && learnHub.includes('What is a REIT')
);
add('main site: all 12 asset-class Learn pages exist and are linked from Learn hub',
  assetLearnPages.every(file => fs.existsSync(path.join(root,'draw004.github.io',file)) && learnHub.includes('href="/'+file+'"'))
);
add('main site: all 12 asset-class pages are indexable Article pages with canonical URLs and source notes',
  assetLearnPages.every(file => { const page=read('draw004.github.io/'+file); return page.includes('name="robots"') && page.includes('index,follow') && page.includes('rel="canonical"') && page.includes('"@type":"Article"') && page.includes('Carrowmont') && page.includes('Sources and how this guide was prepared'); })
);
add('main site: final Learn sitemap contains 71 unique URLs, the Budget Planner and all 12 asset-class guides',
  (learnSitemap.match(/<loc>/g)||[]).length===71 && new Set([...learnSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])).size===71 && learnSitemap.includes('https://carrowmont.com/budget-cash-flow-planner/') && assetLearnPages.every(file => learnSitemap.includes('https://carrowmont.com/'+file))
);


// Shared Learn article standard - 2026-09-28.
// Any current or future indexable Article page must inherit the same reusable structure.
const learnArticleCss = read('draw004.github.io/learn-article.css');
const learnArticleJs = read('draw004.github.io/learn-article.js');
const learnArticleStandardDoc = read('draw004.github.io/.github/LEARN-ARTICLE-STANDARD.md');
const learnArticleDir = path.join(root, 'draw004.github.io');
const standardizedLearnFiles = fs.existsSync(learnArticleDir)
  ? fs.readdirSync(learnArticleDir).filter(file => {
      if (!file.endsWith('.html')) return false;
      return read('draw004.github.io/' + file).includes('"@type":"Article"');
    }).sort()
  : [];
const standardizedLearnPages = standardizedLearnFiles.map(file => ({ file, page: read('draw004.github.io/' + file) }));
const standardLearnTitles = standardizedLearnPages.map(({page}) => (page.match(/<title>([^<]+)<\/title>/i)||[])[1] || '');
const standardLearnDescriptions = standardizedLearnPages.map(({page}) => ((page.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)||page.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i)||[])[1] || ''));

add('main site: shared Learn article CSS/JS standard exists',
  learnArticleCss.includes('Carrowmont Learn article standard v2 - 2026-09-28') &&
  learnArticleCss.includes('font-size:clamp(42px,3.25vw,56px)') &&
  learnArticleCss.includes('.learn-tool-return') &&
  learnArticleJs.includes('Carrowmont Learn article standard v2 - 2026-09-28') &&
  learnArticleJs.includes("data-cm-generated', 'tool-return") &&
  learnArticleStandardDoc.includes('required structure and editorial-depth standard for every indexable Carrowmont Learn article')
);
add('main site: all Learn Article pages inherit the reusable article standard',
  standardizedLearnPages.length >= 52 && standardizedLearnPages.every(({page}) =>
    page.includes('data-cm-learn-article="1"') &&
    page.includes('learn-article.css?v=20260928-standard2') &&
    page.includes('learn-article.js?v=20260928-standard2') &&
    page.includes('class="article-meta"') &&
    page.includes('class="guide-action-first"') &&
    page.includes('class="reference-note"') &&
    page.includes('class="learn-disclaimer"') &&
    page.includes('class="learn-more-row"') &&
    page.includes('class="guide-index"') &&
    page.includes('name="author"') && page.includes('content="Carrowmont"') &&
    page.includes('"@type":"BreadcrumbList"') &&
    (page.match(/<h1\b/gi)||[]).length === 1
  )
);
add('main site: every Learn Article remains discoverable from Learn hub and sitemap',
  standardizedLearnPages.length >= 52 && standardizedLearnFiles.every(file =>
    learnHub.includes('href="/' + file + '"') &&
    learnSitemap.includes('https://carrowmont.com/' + file) &&
    /<link[^>]*rel="canonical"[^>]*href="https:\/\/carrowmont\.com\/[^"]+"[^>]*>/i.test(read('draw004.github.io/' + file)) ||
    /<link[^>]*href="https:\/\/carrowmont\.com\/[^"]+"[^>]*rel="canonical"[^>]*>/i.test(read('draw004.github.io/' + file))
  )
);
add('main site: Learn titles/descriptions are unique and kept within the editorial search standard',
  standardizedLearnPages.length >= 52 &&
  new Set(standardLearnTitles).size === standardLearnTitles.length &&
  new Set(standardLearnDescriptions).size === standardLearnDescriptions.length &&
  standardLearnTitles.every(title => title.length >= 25 && title.length <= 70) &&
  standardLearnDescriptions.every(description => description.length >= 100 && description.length <= 170)
);

add('main site: all Learn Article pages meet the v2 content-depth contract',
  standardizedLearnPages.length >= 52 && standardizedLearnPages.every(({page}) => {
    const guideMatch = page.match(/<section[^>]*class="[^"]*guide-section[^"]*"[\s\S]*?<\/section>/i);
    const guide = guideMatch ? guideMatch[0] : page;
    const text = guide.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z0-9#]+;/gi,' ').replace(/\s+/g,' ').trim();
    const words = text ? text.split(' ').filter(Boolean).length : 0;
    const h2Count = (guide.match(/<h2\b/gi)||[]).length;
    const sourceLinks = ((guide.match(/<details[^>]*class="reference-note"[\s\S]*?<\/details>/i)||[])[0]||'').match(/<a\b[^>]*href=/gi)||[];
    return page.includes('data-cm-rich="1"') &&
      page.includes('data-cm-depth="1"') &&
      page.includes('class="guide-answer"') &&
      page.includes('Frequently asked questions') &&
      h2Count >= 8 &&
      sourceLinks.length >= 3 &&
      words >= 1000;
  })
);
add('main site: Learn v2 standard documents depth, evidence and calculation-consistency rules',
  learnArticleStandardDoc.includes('Content-depth standard') &&
  learnArticleStandardDoc.includes('Evidence and sourcing standard') &&
  learnArticleStandardDoc.includes('Calculation consistency') &&
  learnArticleStandardDoc.includes('must not publish thin pages') &&
  learnArticleCss.includes('.guide-answer') &&
  learnArticleCss.includes('.guide-depth-module')
);


const standardizedFooterDirs = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner'];
const sharedFooterToolHrefs = ['/sip-calculator/','/retirement-calculator/','/inflation-calculator/','/goal-planner/','/financial-independence/','/budget-cash-flow-planner/','/#tools'];
function footerToolsBlock(html) {
  const m = html.match(/<div class="footer-col"><strong>Tools<\/strong>([\s\S]*?)<\/div>/i);
  return m ? m[1] : '';
}
for (const dir of standardizedFooterDirs) {
  const html = read(`${dir}/index.html`);
  const css = read(`${dir}/styles.css`);
  const toolsBlock = footerToolsBlock(html);
  add(`${dir}: standardized shared footer structure, six-tool registry and no navigation arrows`,
    html.includes('footer-brand-block') &&
    html.includes('footer-investment-link') &&
    sharedFooterToolHrefs.every(href => toolsBlock.includes(`href="${href}"`)) &&
    !toolsBlock.includes('→') &&
    html.includes('Illustrative estimates, not financial advice.') &&
    css.includes('Carrowmont shared footer standard - 2026-09-27') &&
    css.includes('background:#102945!important')
  );
}
const retirementPlannerHtml = read('retirement-calculator/planner.html');
const retirementPlannerTools = footerToolsBlock(retirementPlannerHtml);
add('retirement: calculator page also uses the six-tool shared footer',
  retirementPlannerHtml.includes('footer-investment-link') &&
  sharedFooterToolHrefs.every(href => retirementPlannerTools.includes(`href="${href}"`)) &&
  !retirementPlannerTools.includes('→') &&
  retirementPlannerHtml.includes('Illustrative estimates, not financial advice.')
);

const currencyFormatSources = [
  read('sip-calculator/app.js'),
  read('goal-planner/app.js'),
  read('financial-independence/app.js'),
  read('inflation-calculator/app.js'),
  read('retirement-calculator/locale-ui.js'),
  read('budget-cash-flow-planner/app.js')
];
add('shared UI: all six tools render currency options as CODE dot Currency Name',
  currencyFormatSources.every(src => /\$\{(?:code|c|k)\} · \$\{/.test(src))
);

const sharedLocaleCssDirs = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner'];
for (const dir of sharedLocaleCssDirs) {
  const css = read(`${dir}/styles.css`);
  add(`${dir}: shared locale pill geometry is locked to 44px desktop and 38px mobile`,
    css.includes('Carrowmont shared locale pill geometry lock - 2026-10-02') &&
    css.includes('height:44px!important') &&
    css.includes('height:38px!important')
  );
}

const smartSpec = read('draw004.github.io/docs/CARROWMONT_SMART_SUGGESTIONS_V1_SPEC.md');
if (smartSpec) {
  add('main site: Smart Suggestions specification is pinned to Snapshot 17 and V1A local-first architecture',
    smartSpec.includes('Version:** 1.1') &&
    smartSpec.includes('carrowmont-source-snapshot (17).zip') &&
    smartSpec.includes('V1A - Deterministic Smart Suggestions') &&
    smartSpec.includes('zero new budget-data network transmission')
  );
}

const smartSs2Spec = read('draw004.github.io/docs/CARROWMONT_SMART_SUGGESTIONS_SS2_SPEC.md');
if (smartSs2Spec) {
  add('main site: SS2 specification is pinned to Snapshot 18 and deterministic intelligence enhancement',
    smartSs2Spec.includes('Version:** 1.1') &&
    smartSs2Spec.includes('carrowmont-source-snapshot (18).zip') &&
    smartSs2Spec.includes('SS2 - Deterministic intelligence enhancement') &&
    smartSs2Spec.includes('Smart Suggestions engine version 2.0.0') &&
    smartSs2Spec.includes('no external AI service')
  );
}

const uiStandard = read('draw004.github.io/docs/CARROWMONT_SHARED_UI_STANDARD.md');
if (uiStandard) {
  add('main site: shared UI standard documents the six-tool registry and no-arrow footer rule',
    uiStandard.includes('Version:** 1.0') &&
    uiStandard.includes('Budget & Cash Flow Planner') &&
    uiStandard.includes('No arrows in footer navigation') &&
    uiStandard.includes('UI Standardization Batch 1') &&
    uiStandard.includes('44px on desktop') && uiStandard.includes('38px on mobile')
  );
}

console.log('\nCarrowmont source contract check\n');
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length} PASS / ${failed.length} FAIL\n`);
process.exit(failed.length ? 1 : 0);
