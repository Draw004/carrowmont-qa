import fs from 'node:fs';
import path from 'node:path';

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
  ['sip-calculator', 'index.html', 'app.js', 'Generate SIP Report']
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
  ['retirement-calculator', 'planner.html', 'retirement-pdf-renderer.js']
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
  fiPdf.includes('Target Age ${Math.round(r.state.targetAge)} is highlighted') &&
  fiPdf.includes('Projected Portfolio Value')
);
add('financial-independence report: projected portfolio callout is above money-added callout',
  fiPdf.includes("chartValueLabel(ctx,b,`Projected Portfolio Value ${compact(r.target.portfolio)}`,'#0e8b80',-38") &&
  fiPdf.includes("chartValueLabel(ctx,a,`Money Added ${compact(moneyAdded)}`,'#8799aa',12")
);
add('financial-independence report: FI Journey is printed with funding and milestone context',
  fiPdf.includes('Financial Independence Journey') &&
  fiPdf.includes('INVESTMENT THAT YEAR') &&
  fiPdf.includes('FUNDING %') &&
  fiPdf.includes('Target Age +5') &&
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

// Main-site checks run when SOURCE_ROOT also contains draw004.github.io (for example, a full source snapshot).
const mainHome = read('draw004.github.io/index.html');
const mainSiteJs = read('draw004.github.io/site.js');
if (mainHome || mainSiteJs) {
  add('main site: Monthly Investment Calculator retired as product identity',
    !mainHome.includes('Monthly Investment Calculator') && !mainSiteJs.includes('Monthly Investment Calculator')
  );
  add('main site: international investment product uses Recurring Investment Calculator',
    mainHome.includes('Recurring Investment Calculator') && mainSiteJs.includes('Recurring Investment Calculator')
  );
}

console.log('\nCarrowmont source contract check\n');
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length} PASS / ${failed.length} FAIL\n`);
process.exit(failed.length ? 1 : 0);
