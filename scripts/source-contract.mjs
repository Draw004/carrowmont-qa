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

const qaCommon = fs.readFileSync(new URL('../helpers/common.js', import.meta.url), 'utf8');
add('central QA: Cloudflare RUM ingestion is isolated from automated QA traffic',
  qaCommon.includes('async function isolateThirdPartyAnalyticsForQa(page)') &&
  qaCommon.includes("page.route('https://cloudflareinsights.com/**'") &&
  qaCommon.includes("page.route('**/cdn-cgi/rum**'") &&
  qaCommon.includes('await isolateThirdPartyAnalyticsForQa(page);')
);

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


  const toolsDirectory = read('draw004.github.io/tools.html');
  const toolsSitemap = read('draw004.github.io/sitemap.xml');
  const toolsArchitecture = read('draw004.github.io/docs/CARROWMONT_ARCHITECTURE.md');
  const toolsDemandMatrix = read('draw004.github.io/docs/CARROWMONT_HOMEPAGE_TOOL_DEMAND_MATRIX.md');
  const toolsImplementation = read('draw004.github.io/docs/CARROWMONT_TOOLS_HUB1_IMPLEMENTATION.md');
  const toolsQa = fs.readFileSync(new URL('../tests/12-tools-hub.spec.js', import.meta.url), 'utf8');
  const qaConfig = fs.readFileSync(new URL('../qa.config.js', import.meta.url), 'utf8');
  const currentToolPaths = [
    '/budget-cash-flow-planner/','/sip-calculator/','/retirement-calculator/','/inflation-calculator/',
    '/goal-planner/','/financial-independence/','/4-percent-rule-stress-test.html',
    '/financial-independence-number-by-spending.html','/us-debt-interest-cost-calculator.html',
    '/gold-macro-stress-explorer.html'
  ];
  const supportedCountryCodes = [
    'IN','US','CA','GB','AU','AT','BD','BE','NZ','CL','DK','CN','JP','KR','SG','AE','SA','OM','QA',
    'DE','FR','IT','ES','FI','IE','NL','NO','PL','PT','SE','CH','BR','MX','ZA','ID','MY','TH','PH','VN',
    'HK','TW','RU','TR','OTHER'
  ];
  add('main site: TOOLS-HUB1 canonical all-tools directory is indexable and structured',
    toolsDirectory.includes('<link rel="canonical" href="https://carrowmont.com/tools.html">') &&
    toolsDirectory.includes('<meta name="robots" content="index,follow">') &&
    toolsDirectory.includes('"@type":"CollectionPage"') && toolsDirectory.includes('"@type":"ItemList"') &&
    toolsDirectory.includes('"numberOfItems":10') &&
    (toolsDirectory.match(/class="directory-tool-card/g)||[]).length === 10
  );
  add('main site: TOOLS-HUB1 directory groups six core tools, two stress tests and two macro explorers',
    toolsDirectory.includes('id="core-planning-tools"') &&
    toolsDirectory.includes('id="planning-stress-tests"') &&
    toolsDirectory.includes('id="macro-market-explorers"') &&
    (toolsDirectory.match(/data-directory-tool=/g)||[]).length === 6 &&
    currentToolPaths.every(toolPath => toolsDirectory.includes(`href="${toolPath}"`)) &&
    !/coming soon/i.test(toolsDirectory)
  );
  add('main site: homepage keeps six complete real tool cards and a visually distinct fixed Explore All Tools gateway',
    mainHome.includes('data-homepage-core-grid') && mainHome.includes('data-core-tool-count="6"') &&
    (mainHome.match(/data-tool-id="(?:budget|investment|retirement|inflation|goals|independence)"/g)||[]).length === 6 &&
    mainHome.includes('data-tools-gateway') && mainHome.includes('Explore All Tools') &&
    mainHome.includes('class="tool-icon explore-tools-icon"') && mainHome.includes('href="/tools.html"') &&
    mainCss.includes('.explore-all-card{') && mainCss.includes('linear-gradient(135deg') &&
    mainCss.includes('.planning-grid[data-core-tool-count="7"] .explore-all-card{grid-column:span 1}')
  );
  add('main site: homepage authority discovery links all four current focused assets without displacing core tools',
    mainHome.includes('id="authorityToolsHeading"') && mainHome.includes('Explore more financial tools') &&
    ['/4-percent-rule-stress-test.html','/financial-independence-number-by-spending.html','/us-debt-interest-cost-calculator.html','/gold-macro-stress-explorer.html']
      .every(toolPath => mainHome.includes(`href="${toolPath}"`)) &&
    (mainHome.match(/class="authority-tool-card"/g)||[]).length === 4
  );
  add('main site: View all tools and primary Tools navigation use the canonical directory',
    mainHome.includes('<a class="text-link" href="/tools.html">View all tools') &&
    (mainHome.match(/href="\/tools\.html"/g)||[]).length >= 5 &&
    mainSiteJs.includes('upgradeLegacyToolsLinks') &&
    mainSiteJs.includes('a[href="/#tools"], a[href="#tools"]') &&
    mainSiteJs.includes('link.setAttribute("href", "/tools.html")')
  );
  add('main site: country-demand ordering is deterministic, country-based and keeps gateway outside ranking',
    mainSiteJs.includes('const TOOL_ORDER_PROFILES = Object.freeze') &&
    mainSiteJs.includes('const REGION_ORDER_PROFILE = Object.freeze') &&
    mainSiteJs.includes('function getOrderForRegion(regionCode)') &&
    mainSiteJs.includes('const regionCode = locale.getRegion()') &&
    mainSiteJs.includes('if (!grid || lastOrderedRegion === regionCode) return') &&
    mainSiteJs.includes('grid.appendChild(card)') && mainSiteJs.includes('grid.appendChild(gateway)') &&
    mainSiteJs.includes('grid.dataset.appliedOrder')
  );
  add('main site: every supported country has an explicit demand-profile mapping',
    supportedCountryCodes.every(code => new RegExp(`\\b${code}:\\s*"P(?:[1-9]|10|11)"`).test(mainSiteJs)) &&
    ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11'].every(profile => new RegExp(`\\b${profile}:\\s*Object\\.freeze`).test(mainSiteJs))
  );
  add('main site: India receives SIP terminology while other countries retain recurring-investment terminology',
    mainHome.includes('data-cm-investment-title') && toolsDirectory.includes('data-cm-investment-title') &&
    mainSiteJs.includes('india ? "SIP Calculator" : "Recurring Investment Calculator"') &&
    mainSiteJs.includes('india ? "Calculate SIP →" : "Calculate investments →"') &&
    mainSiteJs.includes('document.body.classList.toggle("india-inr", regionCode === "IN")')
  );
  add('main site: TOOLS-HUB1 responsive rules preserve card identity and prevent directory/gateway collapse',
    mainCss.includes('TOOLS-HUB1: all-tools discovery + scalable homepage tool grid') &&
    mainCss.includes('.authority-tools-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))') &&
    mainCss.includes('.tools-directory-grid-core{grid-template-columns:repeat(3,minmax(0,1fr))}') &&
    mainCss.includes('@media(max-width:700px)') && mainCss.includes('.tools-directory-grid-core{grid-template-columns:1fr}') &&
    mainCss.includes('.explore-all-card{grid-column:span 1;min-height:255px}')
  );
  add('main site: TOOLS-HUB1 architecture and demand matrix document evidence, fallbacks and future seventh-tool rule',
    toolsArchitecture.includes('20A. All-Tools Directory and Homepage Discovery Rule') &&
    toolsArchitecture.includes('Currency-only changes must not reorder tools') &&
    toolsDemandMatrix.includes('Research source registry') && toolsDemandMatrix.includes('Country-to-profile matrix') &&
    toolsDemandMatrix.includes('The planned Home Loan / Mortgage Prepayment & Early Payoff tool is not ranked until it is live') &&
    supportedCountryCodes.every(code => toolsDemandMatrix.includes(`| ${code} |`))
  );
  add('main site: TOOLS-HUB1 implementation record locks Snapshot 36, two-PR scope and no workflow permission requirement',
    toolsImplementation.includes('Snapshot 36') && toolsImplementation.includes('d6392c73d57c6bbed19ec6ef8da71ab1896c6a30') &&
    toolsImplementation.includes('034ba87da64af4853f69d6e94454df2f662224c5') &&
    toolsImplementation.includes('Expected generated release PR count: **2**') &&
    toolsImplementation.includes('Workflows: Read and write is **not required**')
  );
  add('main site: sitemap includes canonical tools directory with release lastmod',
    /<loc>https:\/\/carrowmont\.com\/tools\.html<\/loc>\s*<lastmod>2026-10-10<\/lastmod>/.test(toolsSitemap)
  );
  add('central QA: TOOLS-HUB1 is registered and covers country order, terminology, legacy links, responsiveness and visuals',
    qaConfig.includes("key: 'tools-directory'") && qaConfig.includes("path: '/tools.html'") &&
    toolsQa.includes('country controls terminology and deterministic card priority') &&
    toolsQa.includes('currency alone never reorders') && toolsQa.includes('upgrades legacy visible all-tools links') &&
    toolsQa.includes('1440px, 390px and 360px') && toolsQa.includes('[VISUAL] capture homepage and tools-directory discovery references')
  );
  add('central QA: TOOLS-HUB1 does not expand the six-tool report registry',
    (qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).match(/key:\s*'/g)||[]).length === 6 &&
    !qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).includes("key: 'tools-directory'")
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
    const modified=((page.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)||[])[1]||'');
    return page.includes('name="robots"') && page.includes('index,follow') && page.includes('rel="canonical"') &&
      page.includes('"@type":"Article"') && page.includes('name="author"') && page.includes('content="Carrowmont"') && modified >= '2026-09-28';
  })
);
add('main site: sitemap contains at least 71 URLs including all 14 first-wave Learn-expansion pages and the Budget Planner',
  (learnSitemap.match(/<loc>/g)||[]).length>=71 && learnSitemap.includes('https://carrowmont.com/budget-cash-flow-planner/') && newLearnPages.every(file => learnSitemap.includes('https://carrowmont.com/'+file))
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
add('main site: Learn sitemap URLs remain unique and include the Budget Planner and all 12 asset-class guides',
  (learnSitemap.match(/<loc>/g)||[]).length>=71 && new Set([...learnSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])).size===(learnSitemap.match(/<loc>/g)||[]).length && learnSitemap.includes('https://carrowmont.com/budget-cash-flow-planner/') && assetLearnPages.every(file => learnSitemap.includes('https://carrowmont.com/'+file))
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
    page.includes('learn-article.css?v=20261010-global1') &&
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


// BING-SEO1 technical indexing foundation - 2026-10-08.
const indexNowKey = 'd7088229f885cb74d3cd2a3b696b5708';
const indexNowKeyFile = read(`draw004.github.io/${indexNowKey}.txt`).trim();
const indexNowWorkflow = read('draw004.github.io/.github/workflows/carrowmont-indexnow.yml');
const indexNowScript = read('draw004.github.io/scripts/indexnow-submit.mjs');
const indexNowDoc = read('draw004.github.io/docs/CARROWMONT_INDEXNOW_IMPLEMENTATION.md');
add('main site: IndexNow verification key is hosted at the public site root',
  indexNowKeyFile === indexNowKey &&
  indexNowDoc.includes(`${indexNowKey}.txt`) &&
  indexNowDoc.includes('The IndexNow key is intentionally public')
);
add('main site: IndexNow automation uses the global endpoint, read-only workflow permissions and recent-change filtering',
  indexNowWorkflow.includes('name: Carrowmont IndexNow') &&
  indexNowWorkflow.includes('permissions:\n  contents: read') &&
  indexNowWorkflow.includes('https://carrowmont.com/${INDEXNOW_KEY}.txt') &&
  indexNowWorkflow.includes('node scripts/indexnow-submit.mjs') &&
  indexNowScript.includes("https://api.indexnow.org/indexnow") &&
  indexNowScript.includes('INDEXNOW_LOOKBACK_DAYS') &&
  indexNowScript.includes('keyLocation: KEY_LOCATION') &&
  indexNowScript.includes('urls.length > 10000')
);

const sitemapLastmods = new Map([...learnSitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*<\/url>/g)].map(m => [m[1], m[2]]));
add('main site: every Learn Article sitemap lastmod matches JSON-LD dateModified',
  standardizedLearnPages.length >= 52 && standardizedLearnPages.every(({page}) => {
    const canonical = ((page.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i) || page.match(/<link[^>]*href="([^"]+)"[^>]*rel="canonical"/i) || [])[1] || '');
    const dateModified = ((page.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/) || [])[1] || '');
    return canonical && dateModified && sitemapLastmods.get(canonical) === dateModified;
  })
);
add('main site: Learn hub has descriptive search metadata and one HTML doctype',
  learnHub.includes('<title>Financial Planning Guides &amp; Calculators | Carrowmont</title>') &&
  learnHub.includes('Explore practical guides on retirement, investing, budgeting, inflation, financial independence, gold, real estate and more, with related Carrowmont calculators.') &&
  (learnHub.match(/<!DOCTYPE html>/gi) || []).length === 1
);
add('goal and retirement planner documents expose one page-level H1 while report titles remain subordinate headings',
  (goalHtml.match(/<h1\b/gi) || []).length === 1 &&
  goalHtml.includes('<h2 class="report-document-title">Goal Planning Report</h2>') &&
  (retirementPlannerHtml.match(/<h1\b/gi) || []).length === 1 &&
  retirementPlannerHtml.includes('<h2 class="report-document-title">Retirement Planning Report</h2>')
);
add('main site: BING-SEO1 sitemap freshness keeps the changed hub and planner URLs at or beyond the release baseline',
  (sitemapLastmods.get('https://carrowmont.com/learn.html') || '') >= '2026-10-08' &&
  (sitemapLastmods.get('https://carrowmont.com/goal-planner/') || '') >= '2026-10-08' &&
  (sitemapLastmods.get('https://carrowmont.com/retirement-calculator/planner.html') || '') >= '2026-10-08'
);


// BING-SEO2 internal authority and search-presentation contract - 2026-10-08.
add('main site: BING-SEO2 Learn titles and descriptions stay concise for search presentation',
  standardizedLearnPages.length >= 52 &&
  standardLearnTitles.every(title => title.length >= 25 && title.length <= 60) &&
  standardLearnDescriptions.every(description => description.length >= 110 && description.length <= 160)
);

const seo2RootHtmlFiles = fs.existsSync(learnArticleDir)
  ? fs.readdirSync(learnArticleDir).filter(file => file.endsWith('.html')).sort()
  : [];
const seo2InboundSources = new Map(standardizedLearnFiles.map(file => [file, new Set()]));
for (const sourceFile of seo2RootHtmlFiles) {
  const sourcePage = read('draw004.github.io/' + sourceFile);
  for (const targetFile of standardizedLearnFiles) {
    if (sourceFile === targetFile) continue;
    if (sourcePage.includes(`href="/${targetFile}"`) || sourcePage.includes(`href='/${targetFile}'`)) {
      seo2InboundSources.get(targetFile)?.add(sourceFile);
    }
  }
}
add('main site: BING-SEO2 gives every Learn Article at least three unique internal source pages',
  standardizedLearnFiles.length >= 52 &&
  standardizedLearnFiles.every(file => (seo2InboundSources.get(file)?.size || 0) >= 3)
);

const seo2ClusterPages = [
  '10000-sip-returns.html',
  '50-30-20-budget-rule.html',
  'budgeting-with-irregular-income.html',
  'cash-flow-vs-income.html',
  'compound-interest-monthly-contributions.html',
  'financial-independence-number.html',
  'gold-as-an-investment.html',
  'gold-vs-stocks.html',
  'how-much-money-do-i-need-to-retire.html',
  'how-much-should-i-invest-each-month.html',
  'inflation-purchasing-power.html',
  'real-estate-vs-stocks.html',
  'savings-goal-planning.html',
  'sinking-fund-vs-emergency-fund.html',
  'when-can-i-reach-financial-independence.html'
];
add('main site: BING-SEO2 contextual related-guide modules are present across the topic clusters',
  seo2ClusterPages.every(file => read('draw004.github.io/' + file).includes('class="guide-note seo-related-guides"')) &&
  read('draw004.github.io/how-much-should-i-invest-each-month.html').includes('href="/planning-life-goals.html"') &&
  read('draw004.github.io/compound-interest-monthly-contributions.html').includes('href="/sip-during-market-fall.html"') &&
  read('draw004.github.io/financial-independence-number.html').includes('href="/coast-fire-explained.html"') &&
  read('draw004.github.io/inflation-purchasing-power.html').includes('href="/future-cost-of-expenses.html"')
);

const seo2LearnHubDescription = ((learnHub.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i) || learnHub.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) || [])[1] || '');
const seo2MethodologyPage = read('draw004.github.io/methodology.html');
const seo2MethodologyDescription = ((seo2MethodologyPage.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i) || seo2MethodologyPage.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) || [])[1] || '');
add('main site: BING-SEO2 keeps Learn hub and methodology descriptions within snippet-safe length',
  seo2LearnHubDescription.length >= 110 && seo2LearnHubDescription.length <= 160 &&
  seo2MethodologyDescription.length >= 110 && seo2MethodologyDescription.length <= 160
);


// SEO3A 4% Rule Stress Test authority asset - 2026-10-09.
const stressHtml = read('draw004.github.io/4-percent-rule-stress-test.html');
const stressCss = read('draw004.github.io/4-percent-rule-stress-test.css');
const stressCore = read('draw004.github.io/4-percent-rule-stress-test-core.js');
const stressApp = read('draw004.github.io/4-percent-rule-stress-test.js');
const stressPdf = read('draw004.github.io/4-percent-rule-stress-test-pdf.js');
const stressPdfExport = read('draw004.github.io/4-percent-rule-stress-test-pdf-export.js');
const stressReportStandard = read('draw004.github.io/4-percent-rule-stress-test-report-standard.js');
const stressImplementation = read('draw004.github.io/docs/CARROWMONT_SEO3A_IMPLEMENTATION.md');
const stressSpec = read('draw004.github.io/docs/CARROWMONT_SEO3A_4_PERCENT_RULE_STRESS_TEST_SPEC.md');
const fourPercentGuide = read('draw004.github.io/4-percent-rule-retirement.html');
const sequenceGuide = read('draw004.github.io/sequence-of-returns-risk.html');
const longevityGuide = read('draw004.github.io/longevity-risk-retirement.html');

add('main site: SEO3A stress-test files and implementation record exist',
  [stressHtml, stressCss, stressCore, stressApp, stressPdf, stressPdfExport, stressReportStandard, stressImplementation].every(Boolean)
);
add('main site: 4% Rule Stress Test has indexable unique search metadata and one H1',
  stressHtml.includes('<title>4% Rule Stress Test | Retirement Withdrawal Risk</title>') &&
  stressHtml.includes('<meta name="description" content="Test how inflation, retirement length and weak early returns can affect a 4% withdrawal plan using transparent deterministic scenarios.">') &&
  stressHtml.includes('<meta name="robots" content="index,follow">') &&
  stressHtml.includes('<link rel="canonical" href="https://carrowmont.com/4-percent-rule-stress-test.html">') &&
  (stressHtml.match(/<h1\b/gi) || []).length === 1
);
add('main site: 4% Rule Stress Test exposes WebApplication, Breadcrumb and FAQ structured data',
  stressHtml.includes('"@type": "WebApplication"') &&
  stressHtml.includes('"@type": "BreadcrumbList"') &&
  stressHtml.includes('"@type": "FAQPage"') &&
  stressHtml.includes('"isAccessibleForFree": true')
);
add('main site: stress test uses the shared locale shell and keeps country/currency separate from assumptions',
  stressHtml.includes('id="localeMenu"') &&
  stressHtml.includes('id="regionSelect"') &&
  stressHtml.includes('id="currencySelect"') &&
  stressApp.includes("window.addEventListener('carrowmont:localechange'") &&
  stressHtml.includes('changing currency changes the unit and number format. It does not convert')
);
add('main site: stress-test input and output contract is complete',
  ['startAge','planUntilAge','startingPortfolio','startingWithdrawalRate','firstYearWithdrawal','inflationRate','nominalReturn','summaryCards','portfolioChart','sequenceChart','rateComparisonBody','annualTableBody','copySummaryBtn','downloadCsvBtn','generateReportBtn']
    .every(id => stressHtml.includes(`id="${id}"`)) &&
  stressHtml.includes('No login') && stressHtml.includes('Local calculations') && stressHtml.includes('Deterministic scenarios')
);
add('main site: stress-test engine documents annual withdrawal-before-return mechanics and no-negative depletion',
  stressCore.includes("const METHODOLOGY_VERSION = '4-percent-stress-test-v1.0'") &&
  stressCore.includes('const afterWithdrawal = openingBalance - withdrawal') &&
  stressCore.includes('investmentGrowth = afterWithdrawal * returnRate') &&
  stressCore.includes('closingBalance = Math.max(0, afterWithdrawal + investmentGrowth)') &&
  stressCore.includes('status = \'Partial withdrawal; depleted\'')
);
add('main site: stress-test scenarios and standard rate comparison are deterministic and disclosed',
  stressCore.includes('const RAW_SEQUENCE = [-0.20, -0.10, 0, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16]') &&
  stressCore.includes('const RATE_COMPARISON = [0.03, 0.035, 0.04, 0.05]') &&
  stressCore.includes('selectedFactor / rawGeometricMean') &&
  stressCore.includes("key: 'cautious'") && stressCore.includes("key: 'adverse'") &&
  stressCore.includes('reverse ? [...ten].reverse() : ten')
);
add('main site: stress-test UI, CSV and PDF all consume the same deterministic result object',
  stressApp.includes('latestResult = Core.calculate(raw)') &&
  stressApp.includes('summaryText(latestResult)') &&
  stressApp.includes("['Base', latestResult.base]") &&
  stressApp.includes('window.CarrowmontFourPercentPdf.generate(latestResult') &&
  stressPdf.includes('async function generate(result, options = {})')
);
add('main site: stress-test report uses standardized guide and Continue Planning pages',
  stressHtml.indexOf('4-percent-rule-stress-test-report-standard.js') < stressHtml.indexOf('4-percent-rule-stress-test-pdf.js') &&
  stressPdf.includes('S().guidePage({') &&
  stressPdf.includes('S().continuePlanningPage({') &&
  stressPdf.includes("filename: 'carrowmont-4-percent-rule-stress-test-report.pdf'") &&
  stressReportStandard.includes('Continue planning with Carrowmont')
);
add('main site: stress-test privacy contract has no API or account dependency',
  stressHtml.includes('does not transmit or store the financial values entered here') &&
  stressHtml.includes('No account or cloud storage is required') &&
  !/\bfetch\s*\(/.test(stressApp) &&
  !/XMLHttpRequest/.test(stressApp) &&
  !/api[_-]?key|openai|anthropic/i.test(stressApp + stressCore)
);
add('main site: stress test is discoverable from Learn and the retirement authority cluster',
  learnHub.includes('href="/4-percent-rule-stress-test.html"') &&
  fourPercentGuide.includes('href="/4-percent-rule-stress-test.html"') &&
  sequenceGuide.includes('href="/4-percent-rule-stress-test.html"') &&
  longevityGuide.includes('href="/4-percent-rule-stress-test.html"') &&
  retirementPlannerHtml.includes('href="/4-percent-rule-stress-test.html"')
);
add('main site: stress-test route is in sitemap with the SEO3A release lastmod',
  sitemapLastmods.get('https://carrowmont.com/4-percent-rule-stress-test.html') === '2026-10-09'
);
add('main site: SEO3A approved specification and implementation record preserve scope and calculation separation',
  stressSpec.includes('4% Rule Stress Test') &&
  stressSpec.includes('Monte Carlo simulation') &&
  stressSpec.includes('do not change any Retirement Planner formula') &&
  stressImplementation.includes('Carrowmont Source Snapshot 23') &&
  stressImplementation.includes('does not change the approved Retirement Planner calculation engine') &&
  stressImplementation.includes('No existing SIP, Goal, Financial Independence, Inflation, Retirement or Budget calculation engine is modified')
);
add('main site: stress-test responsive CSS includes explicit mobile treatment and printable output protection',
  stressCss.includes('@media(max-width:') &&
  stressCss.includes('.stress-layout') &&
  stressCss.includes('.stress-annual-table-wrap') &&
  stressCss.includes('@media print')
);

add('main site: stress-test chart typography follows the Carrowmont chart standard and neutralizes global SVG icon strokes',
  stressCss.includes('font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif') &&
  stressCss.includes('fill:#385b78;font-size:13px;font-weight:700;stroke:none!important;stroke-width:0!important') &&
  stressCss.includes('.stress-chart .chart-label-text{fill:#173d5c;font-size:12px;font-weight:850;stroke:none!important;stroke-width:0!important}') &&
  stressCss.includes('.stress-chart .series-path{fill:none;stroke-width:4;') &&
  stressHtml.includes('4-percent-rule-stress-test.css?v=20261009-seo3a-fix2')
);
add('main site: stress-test callout layout is plot-bounded and annual values use the standard collapsed disclosure',
  stressApp.includes('svg.dataset.plotLeft = String(margin.left)') &&
  stressApp.includes('getComputedTextLength') &&
  stressApp.includes('coversAnchor(box, px, py)') &&
  stressApp.includes('labelBoxes.some((other) => overlaps(box, other))') &&
  stressHtml.includes('id="annualValuesDetails"') &&
  stressHtml.includes('id="annualValuesSummary" aria-expanded="false"') &&
  stressHtml.includes('id="annualDisclosureLabel">Show annual values') &&
  stressCss.includes(".stress-annual-details[open] summary::after{content:'−'}")
);
add('main site: stress-test report summary uses content-sized explanation spacing',
  stressPdf.includes('const meaningCardH = Math.max(72, 31 + meaningLineCount * 15)') &&
  stressPdf.includes('y += meaningCardH + 21') &&
  stressPdfExport.includes('linesForText,wrappedText')
);

let stressCoreApi = null;
try {
  const sandbox = { module: { exports: {} }, exports: {}, console };
  vm.runInNewContext(stressCore, sandbox, { filename: '4-percent-rule-stress-test-core.js' });
  stressCoreApi = sandbox.module.exports;
} catch (_) {}
add('main site: stress-test core executes as an isolated pure calculation module',
  !!stressCoreApi && typeof stressCoreApi.calculate === 'function' && typeof stressCoreApi.simulateScenario === 'function'
);
if (stressCoreApi) {
  const fixture = stressCoreApi.calculate({ startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'rate', startingWithdrawalRate:4, inflationRate:4, nominalReturn:6 });
  const noWithdrawal = stressCoreApi.calculate({ startAge:60, planUntilAge:80, startingPortfolio:10000000, withdrawalMode:'amount', firstYearWithdrawal:0, inflationRate:0, nominalReturn:6 });
  const sequence = fixture.sequenceComparison.normalizedReturns;
  const sequenceGeo = Math.pow(sequence.reduce((product, value) => product * (1 + value), 1), 1 / sequence.length) - 1;
  add('main site: stress-test approved calculation fixtures pass independently',
    fixture.assumptions.firstYearWithdrawal === 400000 &&
    fixture.base.annualRows.length === 30 &&
    Math.abs(sequenceGeo - 0.06) < 1e-10 &&
    Math.abs(noWithdrawal.sequenceComparison.weakFirst.endingBalanceNominal - noWithdrawal.sequenceComparison.strongFirst.endingBalanceNominal) < 0.01 &&
    fixture.sequenceComparison.weakFirst.endingBalanceNominal < fixture.sequenceComparison.strongFirst.endingBalanceNominal &&
    fixture.rateComparison.map(row => row.rate).join(',') === '0.03,0.035,0.04,0.05' &&
    fixture.base.annualRows.every(row => row.closingBalance >= 0)
  );
}


// SEO3B Financial Independence Number by Spending authority asset - 2026-10-09.
const fiSpendHtml = read('draw004.github.io/financial-independence-number-by-spending.html');
const fiSpendCss = read('draw004.github.io/financial-independence-number-by-spending.css');
const fiSpendCore = read('draw004.github.io/financial-independence-number-by-spending-core.js');
const fiSpendApp = read('draw004.github.io/financial-independence-number-by-spending.js');
const fiSpendPdf = read('draw004.github.io/financial-independence-number-by-spending-pdf-renderer.js');
const fiSpendPdfExport = read('draw004.github.io/financial-independence-number-by-spending-pdf-export.js');
const fiSpendReportStandard = read('draw004.github.io/financial-independence-number-by-spending-report-standard.js');
const fiSpendSpec = read('draw004.github.io/docs/CARROWMONT_SEO3B_FI_NUMBER_BY_SPENDING_SPEC.md');
const fiSpendImplementation = read('draw004.github.io/docs/CARROWMONT_SEO3B_IMPLEMENTATION.md');
const fiNumberGuide = read('draw004.github.io/financial-independence-number.html');
const fiTimingGuide = read('draw004.github.io/when-can-i-reach-financial-independence.html');

add('main site: SEO3B FI-number-by-spending product files and implementation record exist',
  [fiSpendHtml, fiSpendCss, fiSpendCore, fiSpendApp, fiSpendPdf, fiSpendPdfExport, fiSpendReportStandard, fiSpendSpec, fiSpendImplementation].every(Boolean)
);
add('main site: FI Number by Spending has approved indexable metadata and exactly one H1',
  fiSpendHtml.includes('<title>Financial Independence Number by Spending | Carrowmont</title>') &&
  fiSpendHtml.includes('<meta name="robots" content="index,follow">') &&
  fiSpendHtml.includes('<link rel="canonical" href="https://carrowmont.com/financial-independence-number-by-spending.html">') &&
  (fiSpendHtml.match(/<h1\b/gi) || []).length === 1 &&
  fiSpendHtml.includes('See how spending changes your financial independence number')
);
add('main site: FI Number by Spending exposes free WebApplication, Breadcrumb and FAQ structured data',
  fiSpendHtml.includes('"@type": "WebApplication"') &&
  fiSpendHtml.includes('"@type": "BreadcrumbList"') &&
  fiSpendHtml.includes('"@type": "FAQPage"') &&
  fiSpendHtml.includes('"isAccessibleForFree": true') &&
  fiSpendHtml.includes('"dateModified": "2026-10-09"')
);
add('main site: FI Number by Spending input, result and export contract is complete',
  ['portfolioSpending','withdrawalRate','yearsUntilFi','inflationRate','summaryCards','annualSpendingValue','fiTodayValue','multipleValue','fiFutureValue','rateComparisonBody','sensitivityChart','spendingSensitivityBody','copySummaryBtn','downloadCsvBtn','generateReportBtn','fullPlannerCta']
    .every(id => fiSpendHtml.includes(`id="${id}"`)) &&
  fiSpendHtml.includes('name="spendingView"') &&
  fiSpendHtml.includes('No login') && fiSpendHtml.includes('Local calculations') && fiSpendHtml.includes('Standard report')
);
add('main site: FI Number by Spending uses shared locale formatting without automatic FX conversion',
  fiSpendHtml.includes('id="localeMenu"') && fiSpendHtml.includes('id="regionSelect"') && fiSpendHtml.includes('id="currencySelect"') &&
  fiSpendApp.includes('Locale.formatCompactMoney') && fiSpendApp.includes('Locale.formatMoney') &&
  fiSpendHtml.includes('changing currency changes the unit and number format. It does not convert entered amounts using an exchange rate')
);
add('main site: FI Number by Spending deterministic engine implements the approved formula and comparisons',
  fiSpendCore.includes("const METHODOLOGY_VERSION = 'fi-number-by-spending-v1.0'") &&
  fiSpendCore.includes('const STANDARD_RATES = [0.03, 0.035, 0.04, 0.05]') &&
  fiSpendCore.includes('const SENSITIVITY_FACTORS = [0.8, 0.9, 1, 1.1, 1.2]') &&
  fiSpendCore.includes("inputs && inputs.view === 'annual' ? s : s * 12") &&
  fiSpendCore.includes('return annualSpendingValue / withdrawalRate') &&
  fiSpendCore.includes('Math.pow(1 + inflation, years)')
);
add('main site: FI Number by Spending UI, CSV and PDF consume the same deterministic result object',
  fiSpendApp.includes('latestResult = Core.calculate(raw)') &&
  fiSpendApp.includes('summaryText(latestResult)') &&
  fiSpendApp.includes('latestResult.rateComparison.forEach') &&
  fiSpendApp.includes('latestResult.spendingSensitivity.forEach') &&
  fiSpendApp.includes('window.CarrowmontFINumberBySpendingPdf.generate(latestResult') &&
  fiSpendPdf.includes('async function generate(result,options={})')
);
add('main site: FI Number by Spending chart follows hardened Carrowmont typography and callout geometry',
  fiSpendCss.includes('font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif') &&
  fiSpendCss.includes('fill:#385b78;font-size:13px;font-weight:700;stroke:none!important;stroke-width:0!important') &&
  fiSpendCss.includes('.fiq-chart .chart-label-text{fill:#173d5c;font-size:12px;font-weight:850;stroke:none!important;stroke-width:0!important}') &&
  fiSpendCss.includes('.fiq-chart .series-path{fill:none;stroke:var(--fiq-teal);stroke-width:4;') &&
  fiSpendApp.includes('svg.dataset.plotLeft = String(margin.left)') &&
  fiSpendApp.includes('getComputedTextLength') &&
  fiSpendApp.includes('coversAnchor(box, px, py') &&
  fiSpendApp.includes('labelBoxes.some(other => overlaps(box, other))')
);
add('main site: FI Number by Spending baseline marker is distinguishable without color alone',
  fiSpendApp.includes("class: 'chart-point-baseline', 'data-baseline': 'true'") &&
  fiSpendApp.includes("class: 'chart-point-baseline-core'") &&
  fiSpendCss.includes('.fiq-chart .chart-point-baseline{fill:#fff;stroke:var(--fiq-teal);stroke-width:4}')
);
add('main site: FI Number by Spending report uses standardized four-page structure and no login wall',
  fiSpendHtml.indexOf('financial-independence-number-by-spending-report-standard.js') < fiSpendHtml.indexOf('financial-independence-number-by-spending-pdf-renderer.js') &&
  fiSpendPdf.includes('S().guidePage({') && fiSpendPdf.includes('S().continuePlanningPage({') &&
  fiSpendPdf.includes("filename:'carrowmont-fi-number-by-spending-report.pdf'") &&
  fiSpendPdf.includes('standard report is available without an account') &&
  fiSpendReportStandard.includes('Continue planning with Carrowmont')
);
add('main site: FI Number by Spending privacy contract has no backend, API-key or AI dependency',
  fiSpendHtml.includes('All calculations run in this browser. Carrowmont does not transmit or store the financial values entered here.') &&
  !/\bfetch\s*\(/.test(fiSpendApp + fiSpendCore) && !/XMLHttpRequest/.test(fiSpendApp + fiSpendCore) &&
  !/api[_-]?key|openai|anthropic/i.test(fiSpendApp + fiSpendCore)
);
add('main site: FI Number by Spending is discoverable across the approved FI authority cluster',
  learnHub.includes('href="/financial-independence-number-by-spending.html"') &&
  fiNumberGuide.includes('href="/financial-independence-number-by-spending.html"') &&
  fiTimingGuide.includes('href="/financial-independence-number-by-spending.html"') &&
  fourPercentGuide.includes('href="/financial-independence-number-by-spending.html"') &&
  stressHtml.includes('href="/financial-independence-number-by-spending.html"') &&
  fiHtml.includes('href="/financial-independence-number-by-spending.html"')
);
add('main site: FI Number by Spending route and refreshed FI guides remain in sitemap with current content lastmods',
  sitemapLastmods.get('https://carrowmont.com/financial-independence-number-by-spending.html') === '2026-10-09' &&
  sitemapLastmods.get('https://carrowmont.com/financial-independence-number.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/when-can-i-reach-financial-independence.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/financial-independence/') === '2026-10-09'
);
add('financial-independence: SEO3B handoff is explicit, validated and keeps the approved FI core separate',
  fiHtml.includes('id="seo3bHandoffNotice"') &&
  fiJs.includes("params.get('cm_handoff')!=='fi_spending_v1'") &&
  fiJs.includes("els.spendingPct.value='100'") && fiJs.includes("els.monthlyIncome.value='0'") &&
  fiJs.includes('applySeo3bHandoff()') &&
  !fiCore.includes('fi_spending_v1')
);
add('main site: SEO3B specification and implementation preserve no-login access, full-planner progression and engine separation',
  fiSpendSpec.includes('Financial Independence Number by Spending') &&
  fiSpendSpec.includes('usable without login') &&
  fiSpendSpec.includes('`financial-independence/core.js`') &&
  fiSpendImplementation.includes('Carrowmont Source Snapshot 28') &&
  fiSpendImplementation.includes('existing `financial-independence/core.js` is not modified') &&
  fiSpendImplementation.includes('No SIP, Goal, Inflation, Retirement or Budget calculation engine is changed')
);
add('main site: FI Number by Spending responsive CSS contains mobile, chart and print safeguards',
  fiSpendCss.includes('@media(max-width:700px)') && fiSpendCss.includes('@media(max-width:420px)') &&
  fiSpendCss.includes('.fiq-chart{display:block;width:100%;height:auto;') &&
  fiSpendCss.includes('.fiq-table-wrap{overflow:auto;') && fiSpendCss.includes('@media print')
);

let fiSpendCoreApi = null;
try {
  const sandbox = { module: { exports: {} }, exports: {}, console, Date };
  vm.runInNewContext(fiSpendCore, sandbox, { filename: 'financial-independence-number-by-spending-core.js' });
  fiSpendCoreApi = sandbox.module.exports;
} catch (_) {}
add('main site: FI Number by Spending core executes as an isolated pure calculation module',
  !!fiSpendCoreApi && typeof fiSpendCoreApi.calculate === 'function' && typeof fiSpendCoreApi.fiNumber === 'function'
);
if (fiSpendCoreApi) {
  const annual = fiSpendCoreApi.calculate({ view:'annual', spending:1200000, withdrawalRate:4, yearsUntilFi:0, inflationRate:5 });
  const monthly = fiSpendCoreApi.calculate({ view:'monthly', spending:100000, withdrawalRate:4, yearsUntilFi:0, inflationRate:5 });
  const threeFive = fiSpendCoreApi.calculate({ view:'annual', spending:1200000, withdrawalRate:3.5, yearsUntilFi:0, inflationRate:5 });
  const inflation = fiSpendCoreApi.calculate({ view:'annual', spending:1200000, withdrawalRate:4, yearsUntilFi:10, inflationRate:5 });
  const zero = fiSpendCoreApi.calculate({ view:'monthly', spending:0, withdrawalRate:4, yearsUntilFi:10, inflationRate:5 });
  add('main site: FI Number by Spending approved calculation fixtures pass independently',
    annual.fiToday === 30000000 && monthly.fiToday === 30000000 &&
    Math.abs(threeFive.fiToday - 34285714.28571428) < 0.01 &&
    Math.abs(inflation.futureAnnualSpending - (1200000 * Math.pow(1.05,10))) < 0.01 &&
    inflation.spendingSensitivity.map(row => row.percentage).join(',') === '80,90,100,110,120' &&
    zero.fiToday === 0 && zero.fiFuture === 0
  );
}


// SEO3C US Debt & Interest Cost Calculator authority asset - 2026-10-10.
const usDebtHtml = read('draw004.github.io/us-debt-interest-cost-calculator.html');
const usDebtCss = read('draw004.github.io/us-debt-interest-cost-calculator.css');
const usDebtCore = read('draw004.github.io/us-debt-interest-cost-calculator-core.js');
const usDebtApp = read('draw004.github.io/us-debt-interest-cost-calculator.js');
const usDebtPdf = read('draw004.github.io/us-debt-interest-cost-calculator-pdf-renderer.js');
const usDebtPdfExport = read('draw004.github.io/us-debt-interest-cost-calculator-pdf-export.js');
const usDebtReportStandard = read('draw004.github.io/us-debt-interest-cost-calculator-report-standard.js');
const usDebtReferenceRaw = read('draw004.github.io/data/us-debt-reference.json');
const usDebtUpdater = read('draw004.github.io/scripts/update-us-debt-reference.mjs');
const usDebtWorkflow = read('draw004.github.io/.github/workflows/update-us-debt-reference.yml');
const usDebtSpec = read('draw004.github.io/docs/CARROWMONT_SEO3C_US_DEBT_INTEREST_COST_CALCULATOR_SPEC_FINAL.md');
const usDebtImplementation = read('draw004.github.io/docs/CARROWMONT_SEO3C_IMPLEMENTATION.md');
const stocksVsBonds = read('draw004.github.io/stocks-vs-bonds.html');
const goldInflation = read('draw004.github.io/gold-and-inflation.html');
const inflationRetirement = read('draw004.github.io/inflation-and-retirement-planning.html');

add('main site: SEO3C product, reference-data, updater and implementation files exist',
  !!usDebtHtml && !!usDebtCss && !!usDebtCore && !!usDebtApp && !!usDebtPdf && !!usDebtPdfExport && !!usDebtReportStandard &&
  !!usDebtReferenceRaw && !!usDebtUpdater && !!usDebtWorkflow && !!usDebtSpec && !!usDebtImplementation
);
add('main site: SEO3C canonical metadata and one explicit WebApplication contract are present',
  usDebtHtml.includes('<link rel="canonical" href="https://carrowmont.com/us-debt-interest-cost-calculator.html">') &&
  usDebtHtml.includes('<title>US Debt Interest Cost Calculator | Carrowmont</title>') &&
  usDebtHtml.includes('"@type":"WebApplication"') && usDebtHtml.includes('isAccessibleForFree') &&
  (usDebtHtml.match(/<h1\b/g) || []).length === 1
);
add('main site: SEO3C Simple Mode preloads official debt and keeps Advanced Assumptions collapsed by default',
  usDebtHtml.includes('id="officialReferenceCard"') && usDebtHtml.includes('id="refinancingRate"') && usDebtHtml.includes('id="projectionYears"') &&
  usDebtHtml.includes('<details class="usdc-advanced" id="advancedAssumptions">') && !usDebtHtml.includes('id="advancedAssumptions" open') &&
  usDebtHtml.includes('Annual primary deficit before interest') && usDebtHtml.includes('Reset Published Defaults')
);
add('main site: SEO3C keeps U.S. federal debt in fixed USD context without FX relabelling',
  usDebtHtml.includes('United States') && usDebtHtml.includes('<strong>USD</strong>') &&
  !usDebtHtml.includes('currencySelect') && !usDebtApp.includes('CarrowmontLocale')
);
let usDebtReference = null;
try { usDebtReference = JSON.parse(usDebtReferenceRaw); } catch (_) {}
add('main site: SEO3C release-time Treasury reference is dated, validated and matches the 2026-10-08 official snapshot',
  !!usDebtReference && usDebtReference.schemaVersion === 1 && usDebtReference.asOfDate === '2026-10-08' &&
  usDebtReference.debtHeldByPublic === 32454086117711.32 && usDebtReference.totalPublicDebtOutstanding === 40305316210829.72 &&
  usDebtReference.totalPublicDebtOutstanding >= usDebtReference.debtHeldByPublic &&
  /Debt to the Penny/.test(usDebtReference.sourceName || '') && /fiscaldata\.treasury\.gov/.test(usDebtReference.sourceUrl || '')
);
add('main site: SEO3C reference provenance is explicit and never marketed as live data',
  usDebtHtml.includes('U.S. Treasury reference') && usDebtHtml.includes('validated U.S. Treasury reference snapshot') &&
  !/\blive debt\b|\breal-time debt\b/i.test(usDebtHtml)
);
add('main site: SEO3C browser path uses bundled same-origin reference data, not Treasury API or client secrets',
  usDebtApp.includes("fetch('data/us-debt-reference.json'") &&
  !/api\.fiscaldata\.treasury\.gov/i.test(usDebtApp + usDebtHtml) &&
  !/api[_-]?key|openai|anthropic/i.test(usDebtApp + usDebtCore + usDebtHtml)
);
add('main site: SEO3C source-of-truth core feeds web, chart, tables and exports',
  usDebtApp.includes('Core().calculate(raw)') && usDebtApp.includes('renderChart(result)') && usDebtApp.includes('renderTables(result)') &&
  usDebtApp.includes('buildSummary(result=lastResult)') && usDebtApp.includes('csvText(result=lastResult)') &&
  usDebtPdf.includes('result.selected') && usDebtPdf.includes('result.sensitivity')
);
add('main site: SEO3C chart and responsive presentation follow Carrowmont visual safeguards',
  usDebtCss.includes('.usdc-chart text{font-family:Inter') && usDebtCss.includes('stroke:none!important') &&
  usDebtCss.includes('.usdc-table-wrap{overflow:auto;') && usDebtCss.includes('@media(max-width:700px)') && usDebtCss.includes('@media(max-width:420px)') &&
  usDebtApp.includes('textWidth(') && usDebtApp.includes("class:`callout-bg")
);
add('main site: SEO3C comparison and detailed tables preserve the approved deterministic result fields',
  usDebtHtml.includes('id="scenarioComparisonTable"') && usDebtHtml.includes('id="annualTable"') &&
  usDebtHtml.includes('Legacy debt remaining') && usDebtHtml.includes('Original debt refinanced') && usDebtHtml.includes('Effective modeled rate') &&
  usDebtHtml.includes('Show year-by-year debt and interest detail')
);
add('main site: SEO3C anonymous actions include Copy Summary, CSV and four-page PDF report',
  usDebtHtml.includes('Copy Summary') && usDebtHtml.includes('Download CSV') && usDebtHtml.includes('Download US Debt Interest Cost Report') &&
  usDebtPdf.includes("filename:'carrowmont-us-debt-interest-cost-report.pdf'") &&
  usDebtPdf.includes("currentTool:'seo3c'") && usDebtPdf.includes('Scenario Snapshot') && usDebtPdf.includes('Rate Sensitivity') && usDebtPdf.includes('Debt Path') &&
  usDebtReportStandard.includes('Continue planning with Carrowmont')
);
add('main site: SEO3C weekly updater is scheduled, dispatchable, protected-PR based and failure safe',
  usDebtWorkflow.includes('cron: "23 6 * * 1"') && usDebtWorkflow.includes('workflow_dispatch:') &&
  usDebtWorkflow.includes('CARROWMONT_REPO_TOKEN') && usDebtWorkflow.includes('gh pr create') && usDebtWorkflow.includes('git checkout -b') &&
  usDebtUpdater.includes('validateTreasuryPayload') && usDebtUpdater.includes('validateStoredReference') &&
  usDebtUpdater.includes("if (next.asOfDate <= stored.asOfDate)") && usDebtUpdater.includes('ANOMALY_THRESHOLD = 0.05') &&
  usDebtUpdater.includes("process.exit(1)") && usDebtWorkflow.includes('git add data/us-debt-reference.json')
);
add('main site: SEO3C updater validates expected Treasury fields and debt relationships before proposing change',
  usDebtUpdater.includes("labels.debt_held_public_amt !== 'Debt Held by the Public'") &&
  usDebtUpdater.includes("labels.tot_pub_debt_out_amt !== 'Total Public Debt Outstanding'") &&
  usDebtUpdater.includes('totalPublicDebtOutstanding < debtHeldByPublic') &&
  usDebtUpdater.includes('Treasury response does not contain a data row')
);
add('main site: SEO3C is discoverable from the approved macro-relevant cluster',
  learnHub.includes('href="/us-debt-interest-cost-calculator.html"') && stocksVsBonds.includes('href="/us-debt-interest-cost-calculator.html"') &&
  goldInflation.includes('href="/us-debt-interest-cost-calculator.html"') && inflationRetirement.includes('href="/us-debt-interest-cost-calculator.html"')
);
add('main site: SEO3C canonical route and refreshed contextual pages are in sitemap with release lastmod',
  sitemapLastmods.get('https://carrowmont.com/us-debt-interest-cost-calculator.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/learn.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/stocks-vs-bonds.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-and-inflation.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/inflation-and-retirement-planning.html') === '2026-10-10'
);
add('main site: SEO3C specification and implementation record preserve approved no-login, Simple Mode and updater direction',
  usDebtSpec.includes('Simple Mode') && usDebtSpec.includes('Advanced Assumptions') && usDebtSpec.includes('Weekly automatic Treasury check') &&
  usDebtImplementation.includes('Source Snapshot generated 10 October 2026 at 05:34:08 UTC') &&
  usDebtImplementation.includes('No existing SIP, Goal, Inflation, Retirement, Financial Independence, Budget, SEO3A or SEO3B calculation engine is modified')
);
let usDebtCoreApi = null;
try {
  const sandbox = { module: { exports: {} }, exports: {}, console, Date };
  vm.runInNewContext(usDebtCore, sandbox, { filename: 'us-debt-interest-cost-calculator-core.js' });
  usDebtCoreApi = sandbox.module.exports;
} catch (_) {}
add('main site: SEO3C core executes as an isolated pure calculation module',
  !!usDebtCoreApi && typeof usDebtCoreApi.calculate === 'function' && typeof usDebtCoreApi.runDebtInterestScenario === 'function' && typeof usDebtCoreApi.runRateSensitivity === 'function' &&
  !/document\.|window\.|fetch\(|XMLHttpRequest/.test(usDebtCore)
);
if (usDebtCoreApi) {
  const full = usDebtCoreApi.calculate({ startingDebt:30e12, existingAverageRate:3, refinancingRate:5, primaryDeficit:0, refinancingWindow:1, projectionYears:1 });
  const five = usDebtCoreApi.calculate({ startingDebt:30e12, existingAverageRate:3, refinancingRate:5, primaryDeficit:1e12, refinancingWindow:5, projectionYears:3 });
  const parity = usDebtCoreApi.calculate({ startingDebt:30e12, existingAverageRate:3, refinancingRate:3, primaryDeficit:0, refinancingWindow:5, projectionYears:5 });
  const floor = usDebtCoreApi.calculate({ startingDebt:30e12, existingAverageRate:3, refinancingRate:.5, primaryDeficit:0, refinancingWindow:5, projectionYears:1 });
  const sum = five.selected.annualRows.reduce((a,r)=>a+r.modeledInterestCost,0);
  add('main site: SEO3C approved deterministic calculation fixtures pass independently',
    Math.abs(full.selected.openingAnnualizedInterest - .9e12) < .01 && Math.abs(full.selected.annualRows[0].modeledInterestCost - 1.5e12) < .01 && Math.abs(full.selected.finalDebt - 31.5e12) < .01 &&
    Math.abs(five.selected.annualRows[0].modeledInterestCost - 1.02e12) < .01 && Math.abs(five.selected.annualRows[1].modeledInterestCost - 1.241e12) < .01 && Math.abs(five.selected.annualRows[2].modeledInterestCost - 1.47305e12) < .01 &&
    Math.abs(five.selected.cumulativeInterest - sum) < .01 && parity.selected.annualRows[4].legacyStartingDebtRemaining === 0 && parity.selected.repricedShareOfStartingDebt === 1 &&
    floor.sensitivity.find(row => row.key === 'lower').ratePercent === 0 && full.selected.fullStartingDebtOnePpSensitivity === 300e9
  );
}


// --- SEO3D Gold Macro Stress Explorer ---
const goldMacroHtml = read('draw004.github.io/gold-macro-stress-explorer.html');
const goldMacroCss = read('draw004.github.io/gold-macro-stress-explorer.css');
const goldMacroCore = read('draw004.github.io/gold-macro-stress-explorer-core.js');
const goldMacroApp = read('draw004.github.io/gold-macro-stress-explorer.js');
const goldMacroPdf = read('draw004.github.io/gold-macro-stress-explorer-pdf.js');
const goldMacroReport = read('draw004.github.io/gold-macro-stress-explorer-report-standard.js');
const goldMacroReferenceRaw = read('draw004.github.io/data/gold-macro-reference.json');
const goldMacroUpdater = read('draw004.github.io/scripts/update-gold-macro-reference.mjs');
const goldMacroWorkflow = read('draw004.github.io/.github/workflows/update-gold-macro-reference.yml');
const goldMacroSpec = read('draw004.github.io/docs/CARROWMONT_SEO3D_GOLD_MACRO_STRESS_EXPLORER_SPEC_FINAL.md');
const goldMacroImplementation = read('draw004.github.io/docs/CARROWMONT_SEO3D_GOLD_MACRO_STRESS_EXPLORER_IMPLEMENTATION.md');
const goldAsInvestment = read('draw004.github.io/gold-as-an-investment.html');
const goldVsStocks = read('draw004.github.io/gold-vs-stocks.html');
const physicalGoldEtf = read('draw004.github.io/physical-gold-vs-gold-etf.html');
const goldMacroQa = fs.readFileSync(new URL('../tests/11-gold-macro-stress-explorer.spec.js', import.meta.url), 'utf8');

add('main site: SEO3D product, reference, updater, report and implementation files exist',
  !!goldMacroHtml && !!goldMacroCss && !!goldMacroCore && !!goldMacroApp && !!goldMacroPdf && !!goldMacroReport &&
  !!goldMacroReferenceRaw && !!goldMacroUpdater && !!goldMacroWorkflow && !!goldMacroSpec && !!goldMacroImplementation
);
add('main site: SEO3D canonical metadata, WebApplication schema and one H1 are present',
  goldMacroHtml.includes('<link rel="canonical" href="https://carrowmont.com/gold-macro-stress-explorer.html">') &&
  goldMacroHtml.includes('"@type":"WebApplication"') && goldMacroHtml.includes('isAccessibleForFree') &&
  (goldMacroHtml.match(/<h1\b/g) || []).length === 1
);
add('main site: SEO3D exposes exactly six approved drivers and keeps reference/source detail collapsed by default',
  ['realYield','dollar','inflation','centralBank','fiscal','stress'].every(key => goldMacroApp.includes(`${key}:`)) &&
  goldMacroHtml.includes('id="referenceDataDetails"') && !goldMacroHtml.includes('id="referenceDataDetails" open') &&
  goldMacroHtml.includes('View Reference Data &amp; Sources') && goldMacroHtml.includes('id="scenarioPresets"') && !goldMacroHtml.includes('id="scenarioPresets" open')
);
add('main site: SEO3D keeps qualitative educational wording and explicit no-price-forecast disclaimer',
  goldMacroHtml.includes('This describes a macro environment, not a gold-price forecast or investment recommendation.') &&
  goldMacroHtml.includes('No price forecast') && goldMacroHtml.includes('It is not a return scale') &&
  !/\bprice target\b|\bbuy gold now\b|\bsell gold now\b/i.test(goldMacroApp + goldMacroCore)
);
let goldMacroReference = null;
try { goldMacroReference = JSON.parse(goldMacroReferenceRaw); } catch (_) {}
add('main site: SEO3D bundled reference is versioned, dated and preserves reviewed central-bank/fiscal fields',
  !!goldMacroReference && goldMacroReference.schemaVersion === 1 && goldMacroReference.methodologyVersion === 'gold-macro-stress-v1.0' &&
  /^2026-10-\d{2}$/.test(goldMacroReference.snapshotDate || '') &&
  goldMacroReference.drivers?.centralBankDemand?.manualReviewed === true &&
  goldMacroReference.drivers?.centralBankDemand?.classificationMethod === 'reviewed-threshold-v1' &&
  goldMacroReference.drivers?.fiscalStress?.manualReviewed === true
);
add('main site: SEO3D browser reads only the bundled same-origin macro snapshot',
  goldMacroApp.includes("fetch('data/gold-macro-reference.json'") &&
  !/home\.treasury\.gov|federalreserve\.gov|bls\.gov|matteoiacoviello|financialresearch\.gov|gold\.org/i.test(goldMacroApp) &&
  !/api[_-]?key|openai|anthropic/i.test(goldMacroApp + goldMacroCore + goldMacroHtml)
);
add('main site: SEO3D deterministic weights, normalization and qualitative thresholds match the approved spec',
  goldMacroCore.includes("realYield:1.5, dollar:1.5, inflation:1, centralBank:1, fiscal:1, stress:1") &&
  goldMacroCore.includes('const MAX_WEIGHTED_ABSOLUTE = 14') &&
  goldMacroCore.includes("if(n<=-0.60) return 'Strong macro headwinds'") &&
  goldMacroCore.includes("if(n< -0.15) return 'Macro headwinds'") &&
  goldMacroCore.includes("if(n<=0.15) return 'Mixed macro environment'") &&
  goldMacroCore.includes("if(n<0.60) return 'Supportive macro environment'") &&
  goldMacroCore.includes("return 'Strongly supportive macro environment'")
);
add('main site: SEO3D chart follows Carrowmont typography, grid and no-stroke safeguards',
  /font-family:Inter/.test(goldMacroCss) && goldMacroCss.includes('font-size:13px') &&
  /font-weight:(?:700|800|900)/.test(goldMacroCss) && goldMacroCss.includes('#385b78') && goldMacroCss.includes('#dce7ec') &&
  goldMacroCss.includes('stroke:none!important') && goldMacroHtml.includes('Accessible force map values')
);
add('main site: SEO3D actions share the same scenario result and include Copy, CSV and four-page PDF report',
  goldMacroHtml.includes('Copy Summary') && goldMacroHtml.includes('Download CSV') && goldMacroHtml.includes('Generate Gold Macro Report') &&
  goldMacroApp.includes('buildSummary(bundle=lastResult)') && goldMacroApp.includes('csvText(bundle=lastResult)') &&
  goldMacroApp.includes('CarrowmontGoldMacroPdf.generate(lastResult') &&
  goldMacroPdf.includes("filename:'carrowmont-gold-macro-stress-report.pdf'") &&
  goldMacroPdf.includes('Gold Macro Snapshot') && goldMacroPdf.includes('Competing Forces') &&
  goldMacroPdf.includes('Reference Data, Methodology & Sources') && goldMacroReport.includes('Continue Planning')
);
add('main site: SEO3D responsive safeguards cover 700px and 420px breakpoints and table overflow',
  goldMacroCss.includes('@media(max-width:700px)') && goldMacroCss.includes('@media(max-width:420px)') &&
  /\.gmse-table-wrap\{[^}]*overflow:auto/.test(goldMacroCss) && /\.gmse-chart-wrap\{[^}]*overflow/.test(goldMacroCss)
);
add('main site: SEO3D weekly updater is all-or-nothing, history-validated, anomaly guarded and preserves reviewed fields',
  goldMacroUpdater.includes('Promise.all([fetchTreasury(),fetchDollar(),fetchCpi(),fetchGpr(),fetchOfr()])') &&
  goldMacroUpdater.includes('insufficient five-year history') && goldMacroUpdater.includes('insufficient monthly history') &&
  goldMacroUpdater.includes('source date moved backwards') && goldMacroUpdater.includes('Anomaly guard:') &&
  goldMacroUpdater.includes('structuredClone(oldRef)') && goldMacroUpdater.includes('preservedReviewed') &&
  !/drivers\.centralBankDemand\s*=|drivers\.fiscalStress\s*=/.test(goldMacroUpdater)
);
add('main site: SEO3D updater uses approved sources and only automated fields are refreshed',
  goldMacroUpdater.includes('daily_treasury_real_yield_curve') && goldMacroUpdater.includes('DTWEXBGS') &&
  goldMacroUpdater.includes('CUUR0000SA0') && goldMacroUpdater.includes('data_gpr_daily_recent.xls') &&
  goldMacroUpdater.includes('ofr-fsi.csv') && goldMacroUpdater.includes('data/files/fsi.csv') &&
  goldMacroUpdater.includes('Carrowmont-Gold-Macro-Reference/1.0') && goldMacroUpdater.includes('normalizeSourceDate') &&
  goldMacroImplementation.includes('Federal Reserve H.10 Broad Dollar series as distributed through the FRED CSV endpoint')
);
add('main site: SEO3D update workflow is weekly, dispatchable, duplicate-aware and protected-data-PR based',
  goldMacroWorkflow.includes('cron: "25 14 * * 1"') && goldMacroWorkflow.includes('workflow_dispatch:') &&
  goldMacroWorkflow.includes('CARROWMONT_REPO_TOKEN') && goldMacroWorkflow.includes('automation/gold-macro-reference-') &&
  goldMacroWorkflow.includes('git checkout -b "$branch"') && goldMacroWorkflow.includes('git add data/gold-macro-reference.json') &&
  goldMacroWorkflow.includes('test "$(git diff --cached --name-only)" = "data/gold-macro-reference.json"') &&
  goldMacroWorkflow.includes('gh pr create') && goldMacroWorkflow.includes('--base main') &&
  goldMacroWorkflow.includes('permissions:\n  contents: read') && !goldMacroWorkflow.includes('contents: write')
);
add('main site: SEO3D updater workflow never stores permanent workflow-write privilege',
  goldMacroImplementation.includes('temporary **Workflows: Read and write** permission') &&
  goldMacroImplementation.includes('Revoke Workflows permission again **before merging**') &&
  goldMacroWorkflow.includes('persist-credentials: false')
);
add('main site: SEO3D is discoverable from Learn, gold cluster and SEO3C',
  learnHub.includes('href="/gold-macro-stress-explorer.html"') &&
  goldAsInvestment.includes('href="/gold-macro-stress-explorer.html"') && goldInflation.includes('href="/gold-macro-stress-explorer.html"') &&
  goldVsStocks.includes('href="/gold-macro-stress-explorer.html"') && physicalGoldEtf.includes('href="/gold-macro-stress-explorer.html"') &&
  usDebtHtml.includes('href="/gold-macro-stress-explorer.html"')
);
add('main site: SEO3D canonical route and refreshed gold cluster are in sitemap with release lastmod',
  sitemapLastmods.get('https://carrowmont.com/gold-macro-stress-explorer.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-as-an-investment.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-and-inflation.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-vs-stocks.html') === '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/physical-gold-vs-gold-etf.html') === '2026-10-10'
);
add('main site: SEO3D modified gold articles keep structured-data and article modified dates aligned',
  [goldAsInvestment,goldInflation,goldVsStocks,physicalGoldEtf].every(html => html.includes('"dateModified":"2026-10-10"') && html.includes('content="2026-10-10" property="article:modified_time"'))
);
add('main site: SEO3D final spec and implementation lock Snapshot 34, deterministic model and red-prevention gate',
  goldMacroSpec.includes('Gold Under Macro Stress Explorer') && goldMacroSpec.toLowerCase().includes('release-candidate red-prevention gate') &&
  goldMacroImplementation.includes('Source Snapshot generated **10 October 2026 at 08:37:15 UTC**') &&
  goldMacroImplementation.includes('a0e41cf3a753c1da6b0bff886cdf84639cada8a3') &&
  goldMacroImplementation.includes('Expected generated release PR count: **2**')
);
add('central QA: SEO3D covers live-style RUM privacy, mobile widths, PDF and updater failure fixtures',
  goldMacroQa.includes('isIsolatedCloudflareRum') && goldMacroQa.includes('360px and 390px') &&
  goldMacroQa.includes('PDF is exactly four pages') && goldMacroQa.includes('malformed input') &&
  goldMacroQa.includes('partial failure') && goldMacroQa.includes('anomaly rejection')
);
let goldMacroCoreApi = null;
try {
  const sandbox = { module: { exports: {} }, exports: {}, console, Date, globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(goldMacroCore, sandbox, { filename: 'gold-macro-stress-explorer-core.js' });
  goldMacroCoreApi = sandbox.module.exports;
} catch (_) {}
add('main site: SEO3D core executes as an isolated pure deterministic module',
  !!goldMacroCoreApi && typeof goldMacroCoreApi.calculateEnvironment === 'function' && typeof goldMacroCoreApi.buildScenario === 'function' &&
  typeof goldMacroCoreApi.referenceScores === 'function' && !/document\.|window\.|fetch\(|XMLHttpRequest/.test(goldMacroCore)
);
if (goldMacroCoreApi) {
  const make = v => Object.fromEntries(goldMacroCoreApi.DRIVER_ORDER.map(k => [k, v]));
  const A = goldMacroCoreApi.calculateEnvironment(make(0));
  const B = goldMacroCoreApi.calculateEnvironment(make(1));
  const C = goldMacroCoreApi.calculateEnvironment(make(-1));
  const D = goldMacroCoreApi.calculateEnvironment(make(2));
  const E = goldMacroCoreApi.calculateEnvironment(make(-2));
  const F = goldMacroCoreApi.calculateEnvironment({realYield:-2,dollar:-2,inflation:1,centralBank:1,fiscal:1,stress:1});
  const G = goldMacroCoreApi.calculateEnvironment({realYield:-1,dollar:0,inflation:2,centralBank:2,fiscal:2,stress:2});
  const H = goldMacroCoreApi.classifyRealYield({fiveYearPercentile:10,trend13WeekPp:-.6});
  const I = goldMacroCoreApi.classifyDollar({fiveYearPercentile:75,trend13WeekPct:3.5});
  let refScores = null;
  try { refScores = goldMacroCoreApi.referenceScores(goldMacroReference); } catch (_) {}
  add('main site: SEO3D approved deterministic fixtures A-K and release reference classifications pass independently',
    A.weightedSum === 0 && A.label === 'Mixed macro environment' && !A.hasConflict &&
    B.weightedSum === 7 && Math.abs(B.normalized-.5)<1e-12 && B.label === 'Supportive macro environment' &&
    C.weightedSum === -7 && Math.abs(C.normalized+.5)<1e-12 && C.label === 'Macro headwinds' &&
    D.weightedSum === 14 && D.normalized === 1 && D.label === 'Strongly supportive macro environment' &&
    E.weightedSum === -14 && E.normalized === -1 && E.label === 'Strong macro headwinds' &&
    F.weightedSum === -2 && Math.abs(F.normalized-(-2/14))<1e-12 && F.label === 'Mixed macro environment' && F.hasConflict &&
    G.weightedSum === 6.5 && Math.abs(G.normalized-(6.5/14))<1e-12 && G.label === 'Supportive macro environment' && G.hasConflict &&
    /Real yields/.test(goldMacroCoreApi.buildInterpretation(G)) && /headwind/i.test(goldMacroCoreApi.buildInterpretation(G)) &&
    H.baseScore === 2 && H.trendModifier === 1 && H.score === 2 && I.baseScore === -1 && I.trendModifier === -1 && I.score === -2 &&
    goldMacroCoreApi.combineStress(2,0) === 2 && goldMacroCoreApi.combineStress(-1,-1) === -1 &&
    !!refScores && Object.entries({realYield:-2,dollar:-2,inflation:-2,centralBank:1,fiscal:2,stress:2}).every(([k,v]) => refScores[k] === v)
  );
}


// LEARN-LOCALE1 global Learn-content localization contract - 2026-10-10.
const learnLocaleJs = read('draw004.github.io/learn-localization.js');
const learnLocaleMain = read('draw004.github.io/locale.js');
const learnLocaleQa = fs.readFileSync(new URL('../tests/13-learn-localization.spec.js', import.meta.url), 'utf8');
const learnLocaleSpec = read('draw004.github.io/docs/CARROWMONT_LEARN_LOCALE1_GLOBAL_LEARN_CONTENT_LOCALIZATION_SPEC_FINAL_REV1.md');
const learnLocaleImplementation = read('draw004.github.io/docs/CARROWMONT_LEARN_LOCALE1_IMPLEMENTATION.md');
const learnLocaleSitemap = read('draw004.github.io/sitemap.xml');
const learnRoot = path.join(root, 'draw004.github.io');
const learnLocalePages = fs.existsSync(learnRoot) ? fs.readdirSync(learnRoot).filter(file => file.endsWith('.html') && read('draw004.github.io/'+file).includes('learn-localization.js')).sort() : [];
const initialLearnLocaleAffected = [
  '10000-sip-returns.html','4-percent-rule-retirement.html','budgeting-by-pay-frequency.html','coast-fire-explained.html',
  'compound-interest-monthly-contributions.html','compounding-and-time.html','emergency-fund-how-much.html','financial-independence-number.html',
  'future-cost-of-expenses.html','how-long-will-retirement-savings-last.html','how-much-money-do-i-need-to-retire.html',
  'how-much-should-i-invest-each-month.html','how-much-should-i-save-each-month.html','inflation-and-retirement-planning.html',
  'inflation-purchasing-power-savings.html','inflation-value-of-money-over-time.html','investment-time-to-target.html','learn.html',
  'longevity-risk-retirement.html','lump-sum-vs-monthly-investing.html','planning-life-goals.html','real-estate-vs-stocks.html',
  'rent-vs-buy-home.html','retirement-monthly-income-needed.html','savings-goal-planning.html','sequence-of-returns-risk.html',
  'sip-during-market-fall.html','sip-for-1-crore.html','starting-investing-earlier.html','step-up-sip-vs-regular-sip.html',
  'todays-money-vs-future-money.html','when-can-i-reach-financial-independence.html','zero-based-budgeting.html'
];
function learnMainVisibleText(html) {
  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [,''])[1];
  return main
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/\s+/g,' ')
    .trim();
}
const localeCurrencyBlock = (learnLocaleMain.match(/const currencies\s*=\s*\{([\s\S]*?)\n\s*\};/) || [,''])[1];
const learnExampleBlock = (learnLocaleJs.match(/var currencyExamples\s*=\s*\{([\s\S]*?)\n\s*\};/) || [,''])[1];
const localeCurrencyCodes = [...localeCurrencyBlock.matchAll(/\b([A-Z]{3}):\s*\{/g)].map(m => m[1]);
const learnExampleCodes = [...learnExampleBlock.matchAll(/\b([A-Z]{3}):\s*\{/g)].map(m => m[1]);
const learnMainTexts = Object.fromEntries(learnLocalePages.map(file => [file, learnMainVisibleText(read('draw004.github.io/'+file))]));
const regionalLeakPattern = /₹|\brupees?\b|\blakhs?\b|\bcrores?\b|\bSIP(?:s)?\b/i;
add('main site: LEARN-LOCALE1 audits exactly all 53 Learn/hub pages through the shared localization layer',
  learnLocalePages.length === 53 && learnLocalePages.includes('learn.html') && learnLocalePages.includes('financial-independence-number.html')
);
add('main site: LEARN-LOCALE1 raw Learn main content is globally neutral with no hard-coded India monetary/SIP leakage',
  learnLocalePages.every(file => !regionalLeakPattern.test(learnMainTexts[file]))
);
add('main site: LEARN-LOCALE1 all 33 initially affected pages remain under the permanent repository scanner',
  initialLearnLocaleAffected.length === 33 && initialLearnLocaleAffected.every(file => learnLocalePages.includes(file) && !regionalLeakPattern.test(learnMainTexts[file]))
);
add('main site: LEARN-LOCALE1 defines an explicit example profile for all 34 supported currencies',
  localeCurrencyCodes.length === 34 && new Set(localeCurrencyCodes).size === 34 &&
  learnExampleCodes.length === 34 && new Set(learnExampleCodes).size === 34 &&
  localeCurrencyCodes.every(code => learnExampleCodes.includes(code)) &&
  ['BDT','CLP','DKK','NOK','OMR','PLN','QAR','SEK'].every(code => learnExampleCodes.includes(code))
);
add('main site: LEARN-LOCALE1 shared declarative bindings handle money, country terminology and local-only updates',
  learnLocaleJs.includes("document.querySelectorAll('[data-cm-money-inr]')") &&
  learnLocaleJs.includes("document.querySelectorAll('[data-cm-term]')") &&
  learnLocaleJs.includes("basis==='monthly'") && learnLocaleJs.includes("basis==='unit'") &&
  learnLocaleJs.includes("'sip-calculator':'SIP Calculator'") &&
  learnLocaleJs.includes("'sip-calculator':'Recurring Investment Calculator'") &&
  learnLocaleJs.includes("window.CarrowmontLearnLocalization=Object.freeze")
);
const allLearnBindingCount = learnLocalePages.reduce((sum,file) => sum + (read('draw004.github.io/'+file).match(/data-cm-money-inr=/g)||[]).length, 0);
add('main site: LEARN-LOCALE1 migrated hard-coded Learn amounts to reusable declarative bindings with neutral no-JS fallbacks',
  allLearnBindingCount >= 200 &&
  initialLearnLocaleAffected.every(file => !read('draw004.github.io/'+file).includes('₹'))
);
const fiGuideLocale = read('draw004.github.io/financial-independence-number.html');
add('main site: LEARN-LOCALE1 Financial Independence rich table preserves deterministic spending/withdrawal-rate relationships',
  fiGuideLocale.includes('data-cm-money-inr="600000"') &&
  fiGuideLocale.includes('data-cm-money-inr="15000000"') &&
  fiGuideLocale.includes('data-cm-money-inr="17100000"') &&
  fiGuideLocale.includes('data-cm-money-inr="20000000"') &&
  Math.abs(600000/.04 - 15000000) < 1e-9 &&
  Math.abs(600000/.035 - (600000/.035)) < 1e-9 &&
  Math.abs(600000/.03 - 20000000) < 1e-9
);
add('main site: LEARN-LOCALE1 required previously-unidentified pages now have stable localization page identifiers',
  read('draw004.github.io/compounding-and-time.html').includes('data-cm-page="compounding-time-guide"') &&
  read('draw004.github.io/planning-life-goals.html').includes('data-cm-page="planning-life-goals-guide"') &&
  read('draw004.github.io/todays-money-vs-future-money.html').includes('data-cm-page="today-vs-future-money-guide"')
);
add('main site: LEARN-LOCALE1 updates all content-changed Learn sitemap entries without creating duplicate country URLs',
  initialLearnLocaleAffected.every(file => sitemapLastmods.get('https://carrowmont.com/' + file) === '2026-10-10') &&
  !/\/in\/|\/us\/|\?country=/.test(learnLocaleSitemap)
);
add('main site: LEARN-LOCALE1 cache-busts the shared localization/CSS assets and keeps long related-guide links mobile-safe',
  learnLocalePages.every(file => read('draw004.github.io/'+file).includes('learn-localization.js?v=20261010-global1')) &&
  standardizedLearnPages.every(({page}) => page.includes('learn-article.css?v=20261010-global1')) &&
  learnArticleCss.includes('.seo-related-guides .text-link') && learnArticleCss.includes('white-space:normal')
);
add('central QA: LEARN-LOCALE1 covers all-currency profiles, FI table, SIP terminology, homepage non-regression and mobile overflow',
  learnLocaleQa.includes('all supported currencies have explicit finite Learn example profiles') &&
  learnLocaleQa.includes('Financial Independence guide rich table follows country and selected currency') &&
  learnLocaleQa.includes('legacy SIP guides keep India terminology') &&
  learnLocaleQa.includes('does not change TOOLS-HUB homepage country ordering') &&
  learnLocaleQa.includes('390px and 360px')
);
add('main site: LEARN-LOCALE1 implementation record locks Snapshot 37, controlling standards and two-PR no-workflow scope',
  learnLocaleSpec.includes('CARROWMONT_SHARED_UI_STANDARD.md') && learnLocaleSpec.includes('CARROWMONT_ARCHITECTURE.md') &&
  learnLocaleImplementation.includes('Snapshot 37') && learnLocaleImplementation.includes('94c4f37756eab94b01ca1cd0455700f34f463c66') &&
  learnLocaleImplementation.includes('05a41d03d2aa3215284d5d8955b5ac77767a80c4') &&
  learnLocaleImplementation.includes('Expected generated release PR count: **2**') &&
  learnLocaleImplementation.includes('Workflows: Read and write is **not required**')
);

console.log('\nCarrowmont source contract check\n');
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length} PASS / ${failed.length} FAIL\n`);
process.exit(failed.length ? 1 : 0);
