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
const fiViewBoxHeight = Number((fiHtml.match(/id="pathChart"[^>]*viewBox="0 0 800 (\d+)"/) || [])[1]);
const fiChartHeight = Number((fiJs.match(/function chartBase\([^)]*\)\{const W=800,H=(\d+)/) || [])[1]);
add('financial-independence: SVG and chart coordinate heights match', fiViewBoxHeight > 0 && fiViewBoxHeight === fiChartHeight, `${fiViewBoxHeight} vs ${fiChartHeight}`);
add('financial-independence: static chart values', fiJs.includes('fi-static-value'));

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

const fiPdf = read('financial-independence/fi-pdf-renderer.js');
add('financial-independence report: permanent selected-age chart value callouts',
  fiPdf.includes('drawSelectedAgeValues') && fiPdf.includes('Printed value labels mark the selected age')
);
add('financial-independence report: projected portfolio callout is above money-added callout',
  fiPdf.includes("chartValueLabel(ctx,b,`Portfolio ${compact(r.target.portfolio)}`,'#0e8b80',-38)") &&
  fiPdf.includes("chartValueLabel(ctx,a,`Money added ${compact(moneyAdded)}`,'#8799aa',12)")
);

add('sip report visuals: midpoint and final callouts pair projected/step-up values above invested/fixed values',
  sipApp.includes('Year ${years} projected') &&
  sipApp.includes('Year ${years} invested') &&
  sipApp.includes('Step-up - year ${years} projected') &&
  sipApp.includes('Year ${years} fixed') &&
  sipApp.includes("anchor:'center',dy:-12") &&
  sipApp.includes("anchor:'center',dy:60")
);

const retirementPdf = read('retirement-calculator/retirement-pdf-renderer.js');
add('retirement report: variable-height key-value rows prevent wrapped-label overlap',
  retirementPdf.includes('textLineCount') && retirementPdf.includes('Math.max(minRowH') && retirementPdf.includes('wrappedText(ctx,value') && retirementPdf.includes('maxLines:3')
);
add('retirement report: detailed expense rows use safer pagination and row height',
  retirementPdf.includes('i+=14') && retirementPdf.includes('y+48')
);

const retirementCss = read('retirement-calculator/styles.css');
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
