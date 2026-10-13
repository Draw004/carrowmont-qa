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

const jsonLdNodes = html => {
  const nodes = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed?.['@graph'])) nodes.push(...parsed['@graph']);
      else if (parsed && typeof parsed === 'object') nodes.push(parsed);
    } catch {}
  }
  return nodes;
};
const jsonLdNode = (html, type) => jsonLdNodes(html).find(node => {
  const t = node?.['@type'];
  return Array.isArray(t) ? t.includes(type) : t === type;
});

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
  ['budget-cash-flow-planner', 'index.html', 'app.js', 'Generate Budget &amp; Cash Flow Report'],
  ['mortgage-payoff-calculator', 'index.html', 'app.js', 'Generate Mortgage Payoff Report']
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
add('sip: GSEO1B-1 search title broadens global intent while preserving the visible India product label',
  sipHtml.includes('<title>Investment Calculator &amp; SIP Calculator | Carrowmont</title>') &&
  sipHtml.includes('content="Investment Calculator &amp; SIP Calculator | Carrowmont"') &&
  sipHtml.includes('"name":"Carrowmont Investment & SIP Calculator"') &&
  sipHtml.includes('<span class="product-label">SIP Calculator</span>')
);
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
add('goal: GSEO1B-1 search title identifies savings-goal calculator intent while preserving Goal Planner UI',
  goalHtml.includes('<title>Savings Goal Calculator &amp; Financial Goal Planner | Carrowmont</title>') &&
  goalHtml.includes('content="Savings Goal Calculator &amp; Financial Goal Planner | Carrowmont"') &&
  goalHtml.includes('"name":"Carrowmont Savings Goal Calculator & Financial Goal Planner"') &&
  goalHtml.includes('<span class="product-label">Goal Planner</span>')
);
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

// GSEO1B-2 core-tool search-intent contract - 2026-10-13.
const gseoFiHtml = read('financial-independence/index.html');
const gseoRetirementLandingHtml = read('retirement-calculator/index.html');
const gseoRetirementPlannerHtml = read('retirement-calculator/planner.html');
const gseoBudgetHtml = read('budget-cash-flow-planner/index.html');
const gseoInflationHtml = read('inflation-calculator/index.html');
add('financial-independence: GSEO1B-2 identifies Financial Independence and FIRE calculator intent without changing visible product identity',
  gseoFiHtml.includes('<title>Financial Independence &amp; FIRE Calculator | Carrowmont</title>') &&
  gseoFiHtml.includes('content="Financial Independence &amp; FIRE Calculator | Carrowmont"') &&
  gseoFiHtml.includes('"name":"Carrowmont Financial Independence & FIRE Calculator"') &&
  gseoFiHtml.includes('<span class="product-label">Financial Independence</span>') &&
  gseoFiHtml.includes('<h1>See how spending and saving may shape your path to financial independence.</h1>')
);
add('retirement: GSEO1B-2 assigns calculator intent to planner page while preserving the overview landing-page identity',
  gseoRetirementPlannerHtml.includes('<title>Retirement Calculator &amp; Retirement Planner | Carrowmont</title>') &&
  gseoRetirementPlannerHtml.includes('content="Retirement Calculator &amp; Retirement Planner | Carrowmont"') &&
  gseoRetirementPlannerHtml.includes('"name": "Carrowmont Retirement Calculator & Planner"') &&
  gseoRetirementPlannerHtml.includes('<a class="product-label" href="index.html">Retirement Planner</a>') &&
  gseoRetirementPlannerHtml.includes('<h1>Your retirement plan should reflect how your expenses actually change.</h1>') &&
  gseoRetirementLandingHtml.includes('<title>Carrowmont Retirement Planner | Expense-Aware Retirement Planning</title>')
);
add('budget: GSEO1B-2 identifies budget-calculator and monthly cash-flow intent without changing visible product identity',
  gseoBudgetHtml.includes('<title>Budget Calculator &amp; Monthly Cash Flow Planner | Carrowmont</title>') &&
  gseoBudgetHtml.includes('content="Budget Calculator &amp; Monthly Cash Flow Planner | Carrowmont"') &&
  gseoBudgetHtml.includes('"name":"Carrowmont Budget Calculator & Monthly Cash Flow Planner"') &&
  gseoBudgetHtml.includes('<span class="product-label">Budget &amp; Cash Flow Planner</span>') &&
  gseoBudgetHtml.includes('<h1>See what comes in, what goes out, and what is actually left.</h1>')
);
add('inflation: GSEO1B-2 identifies purchasing-power calculator intent without changing visible product identity',
  gseoInflationHtml.includes('<title>Inflation &amp; Purchasing Power Calculator | Carrowmont</title>') &&
  gseoInflationHtml.includes('content="Inflation &amp; Purchasing Power Calculator | Carrowmont"') &&
  gseoInflationHtml.includes('"name":"Carrowmont Inflation & Purchasing Power Calculator"') &&
  gseoInflationHtml.includes('<a class="product-label" href="index.html">Inflation Calculator</a>') &&
  gseoInflationHtml.includes('<h1>See what inflation can do to your money.</h1>')
);

// GSEO1C trust + structured-data foundation - 2026-10-13.
const gseo1cHome = read('draw004.github.io/index.html');
const gseo1cTools = read('draw004.github.io/tools.html');
const gseo1cAbout = read('draw004.github.io/about.html');
const gseo1cMethodology = read('draw004.github.io/methodology.html');
const gseo1cEditorial = read('draw004.github.io/editorial-policy.html');
const gseo1cQaConfig = read('carrowmont-qa/qa.config.js');
const gseo1cHomeWebsite = jsonLdNode(gseo1cHome, 'WebSite');
const gseo1cHomeOrg = jsonLdNode(gseo1cHome, 'Organization');
add('main site: GSEO1C publishes one connected domain-level WebSite and Organization identity',
  gseo1cHomeWebsite?.['@id'] === 'https://carrowmont.com/#website' &&
  gseo1cHomeWebsite?.name === 'Carrowmont' &&
  gseo1cHomeWebsite?.url === 'https://carrowmont.com/' &&
  gseo1cHomeWebsite?.alternateName === 'carrowmont.com' &&
  gseo1cHomeWebsite?.publisher?.['@id'] === 'https://carrowmont.com/#organization' &&
  gseo1cHomeOrg?.['@id'] === 'https://carrowmont.com/#organization' &&
  gseo1cHomeOrg?.name === 'Carrowmont' &&
  gseo1cHomeOrg?.url === 'https://carrowmont.com/' &&
  gseo1cHomeOrg?.email === 'contact@carrowmont.com'
);
const gseo1cTrustPages = [
  [gseo1cAbout, 'AboutPage', 'https://carrowmont.com/about.html'],
  [gseo1cMethodology, 'WebPage', 'https://carrowmont.com/methodology.html'],
  [gseo1cEditorial, 'WebPage', 'https://carrowmont.com/editorial-policy.html']
];
add('main site: GSEO1C trust pages are indexable, connected to the site entity and expose breadcrumbs',
  gseo1cTrustPages.every(([html,type,url]) => {
    const pageNode = jsonLdNode(html, type);
    const breadcrumb = jsonLdNode(html, 'BreadcrumbList');
    return html.includes('<meta name="robots" content="index,follow">') &&
      html.includes(`<link rel="canonical" href="${url}">`) &&
      pageNode?.url === url && pageNode?.isPartOf?.['@id'] === 'https://carrowmont.com/#website' &&
      pageNode?.breadcrumb?.['@id'] === `${url}#breadcrumb` && breadcrumb?.['@id'] === `${url}#breadcrumb`;
  }) &&
  gseo1cAbout.includes('/editorial-policy.html') &&
  gseo1cMethodology.includes('/editorial-policy.html') &&
  gseo1cQaConfig.includes("key: 'editorial-policy'") && gseo1cQaConfig.includes("path: '/editorial-policy.html'") &&
  gseo1cEditorial.includes('Professional review labels') &&
  gseo1cEditorial.includes('Automated checks reduce implementation risk but cannot guarantee that every page is error-free.')
);
const gseo1cAppPages = [
  ['sip-calculator/index.html', 'https://carrowmont.com/sip-calculator/'],
  ['goal-planner/index.html', 'https://carrowmont.com/goal-planner/'],
  ['financial-independence/index.html', 'https://carrowmont.com/financial-independence/'],
  ['inflation-calculator/index.html', 'https://carrowmont.com/inflation-calculator/'],
  ['retirement-calculator/planner.html', 'https://carrowmont.com/retirement-calculator/planner.html'],
  ['budget-cash-flow-planner/index.html', 'https://carrowmont.com/budget-cash-flow-planner/'],
  ['mortgage-payoff-calculator/index.html', 'https://carrowmont.com/mortgage-payoff-calculator/']
];
add('core tools: GSEO1C WebApplication nodes share publisher/site identity and three-level breadcrumbs',
  gseo1cAppPages.every(([file,url]) => {
    const html = read(file);
    const app = jsonLdNode(html, 'WebApplication');
    const breadcrumb = jsonLdNode(html, 'BreadcrumbList');
    const items = breadcrumb?.itemListElement || [];
    return app?.['@id'] === `${url}#app` && app?.url === url &&
      app?.applicationCategory === 'FinanceApplication' && app?.operatingSystem === 'Any' &&
      app?.isPartOf?.['@id'] === 'https://carrowmont.com/#website' &&
      app?.publisher?.['@id'] === 'https://carrowmont.com/#organization' &&
      items.length === 3 && items[0]?.item === 'https://carrowmont.com/' &&
      items[1]?.item === 'https://carrowmont.com/tools.html' && items[2]?.item === url;
  })
);
const gseo1cRetirementLanding = read('retirement-calculator/index.html');
add('retirement: GSEO1C removes unsupported subdirectory WebSite identity while preserving landing-page intent',
  !jsonLdNode(gseo1cRetirementLanding, 'WebSite') &&
  jsonLdNode(gseo1cRetirementLanding, 'WebPage')?.url === 'https://carrowmont.com/retirement-calculator/' &&
  jsonLdNode(gseo1cRetirementLanding, 'WebPage')?.isPartOf?.['@id'] === 'https://carrowmont.com/#website' &&
  jsonLdNode(gseo1cRetirementLanding, 'BreadcrumbList')?.itemListElement?.length === 3 &&
  gseo1cRetirementLanding.includes('<title>Carrowmont Retirement Planner | Expense-Aware Retirement Planning</title>')
);
add('main site: GSEO1C tools directory shares the domain WebSite identity and breadcrumb contract',
  jsonLdNode(gseo1cTools, 'CollectionPage')?.isPartOf?.['@id'] === 'https://carrowmont.com/#website' &&
  jsonLdNode(gseo1cTools, 'CollectionPage')?.breadcrumb?.['@id'] === 'https://carrowmont.com/tools.html#breadcrumb' &&
  jsonLdNode(gseo1cTools, 'BreadcrumbList')?.itemListElement?.length === 2
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
  ['budget-cash-flow-planner', 'index.html', 'budget-pdf-renderer.js'],
  ['mortgage-payoff-calculator', 'index.html', 'mortgage-payoff-pdf-renderer.js']
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
add('reports: shared tool registry includes all seven active calculators',
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
    '/goal-planner/','/financial-independence/','/mortgage-payoff-calculator/','/4-percent-rule-stress-test.html',
    '/financial-independence-number-by-spending.html','/us-debt-interest-cost-calculator.html',
    '/gold-macro-stress-explorer.html','/silver-supply-demand-macro-stress-explorer.html'
  ];
  const supportedCountryCodes = [
    'IN','US','CA','GB','AU','AT','BD','BE','NZ','CL','DK','CN','JP','KR','SG','AE','SA','OM','QA',
    'DE','FR','IT','ES','FI','IE','NL','NO','PL','PT','SE','CH','BR','MX','ZA','ID','MY','TH','PH','VN',
    'HK','TW','RU','TR','OTHER'
  ];
  add('main site: TOOLS-HUB1 canonical all-tools directory is indexable and structured',
    toolsDirectory.includes('<link rel="canonical" href="https://carrowmont.com/tools.html">') &&
    toolsDirectory.includes('<meta name="robots" content="index,follow">') &&
    /"@type"\s*:\s*"CollectionPage"/.test(toolsDirectory) && /"@type"\s*:\s*"ItemList"/.test(toolsDirectory) &&
    /"numberOfItems"\s*:\s*12/.test(toolsDirectory) &&
    (toolsDirectory.match(/class="directory-tool-card/g)||[]).length === 12
  );
  add('main site: CORE7 directory groups seven core tools, two stress tests and three macro explorers',
    toolsDirectory.includes('id="core-planning-tools"') &&
    toolsDirectory.includes('id="planning-stress-tests"') &&
    toolsDirectory.includes('id="macro-market-explorers"') &&
    (toolsDirectory.match(/data-directory-tool=/g)||[]).length === 7 &&
    currentToolPaths.every(toolPath => toolsDirectory.includes(`href="${toolPath}"`)) &&
    !/coming soon/i.test(toolsDirectory)
  );
  add('main site: homepage keeps seven complete real tool cards and a visually distinct fixed Explore All Tools gateway',
    mainHome.includes('data-homepage-core-grid') && mainHome.includes('data-core-tool-count="7"') &&
    (mainHome.match(/data-tool-id="(?:budget|investment|retirement|inflation|goals|independence|housing)"/g)||[]).length === 7 &&
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
  add('main site: CORE7 architecture and demand matrix document evidence, fallbacks and seven-tool country ordering',
    toolsArchitecture.includes('20A. All-Tools Directory and Homepage Discovery Rule') &&
    toolsArchitecture.includes('Currency-only changes must not reorder tools') &&
    toolsArchitecture.includes('October 2026 CORE7 Home Loan / Mortgage extension') &&
    toolsDemandMatrix.includes('Research source registry') && toolsDemandMatrix.includes('Country-to-profile matrix') &&
    toolsDemandMatrix.includes('The seven ranked tools are:') && toolsDemandMatrix.includes('`housing`') &&
    toolsDemandMatrix.includes('Explore All Tools') && toolsDemandMatrix.includes('fixed eighth gateway card') &&
    supportedCountryCodes.every(code => toolsDemandMatrix.includes(`| ${code} |`))
  );
  add('main site: TOOLS-HUB1 implementation record locks Snapshot 36, two-PR scope and no workflow permission requirement',
    toolsImplementation.includes('Snapshot 36') && toolsImplementation.includes('d6392c73d57c6bbed19ec6ef8da71ab1896c6a30') &&
    toolsImplementation.includes('034ba87da64af4853f69d6e94454df2f662224c5') &&
    toolsImplementation.includes('Expected generated release PR count: **2**') &&
    toolsImplementation.includes('Workflows: Read and write is **not required**')
  );
  add('main site: sitemap includes canonical tools directory with release lastmod',
    ((toolsSitemap.match(/<loc>https:\/\/carrowmont\.com\/tools\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/) || [])[1] || '') >= '2026-10-10'
  );
  add('central QA: TOOLS-HUB1 is registered and covers country order, terminology, legacy links, responsiveness and visuals',
    qaConfig.includes("key: 'tools-directory'") && qaConfig.includes("path: '/tools.html'") &&
    toolsQa.includes('country controls terminology and deterministic card priority') &&
    toolsQa.includes('currency alone never reorders') && toolsQa.includes('upgrades legacy visible all-tools links') &&
    toolsQa.includes('1440px, 390px and 360px') && toolsQa.includes('[VISUAL] capture homepage and tools-directory discovery references')
  );
  add('central QA: CORE7 registers seven primary tools while keeping tools-directory outside the report registry',
    (qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).match(/key:\s*'/g)||[]).length === 7 &&
    qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).includes("key: 'mortgage-payoff-calculator'") &&
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
  learnHub.includes('data-category="budget"') && learnHub.includes('data-category="home"') && learnHub.includes('POPULAR PLANNING QUESTIONS') && learnHub.includes('learn-expansion.js?v=20261011-mortgage1')
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
  learnExpansion.includes("['investment','assets','home','retirement','budget','goals','fi','inflation','foundation']") &&
  learnExpansion.includes("['retirement','assets','home','budget','goals','investment','fi','inflation','foundation']") &&
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
const mortgageLearnFiles = [
  'one-extra-mortgage-payment-a-year.html',
  'monthly-extra-vs-annual-lump-sum-mortgage.html',
  'biweekly-fortnightly-mortgage-payments.html',
  'extra-mortgage-payments-early-vs-late.html',
  'pay-off-mortgage-five-years-early.html'
];
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
  standardizedLearnPages.length >= 57 && standardizedLearnPages.every(({file,page}) =>
    page.includes('data-cm-learn-article="1"') &&
    page.includes('learn-article.css?v=20261010-global1') &&
    (page.includes('learn-article.js?v=20260928-standard2') || ((mortgageLearnFiles.includes(file) || file === 'mortgage-prepayment-vs-investing.html') && page.includes('learn-article.js?v=20261011-mortgage1'))) &&
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
  standardizedLearnFiles.every((file,i) => file === 'mortgage-prepayment-vs-investing.html'
    ? standardLearnTitles[i] === 'Mortgage Prepayment vs Investing: How to Compare the Trade-Off | Carrowmont'
    : standardLearnTitles[i].length >= 25 && standardLearnTitles[i].length <= 70) &&
  standardizedLearnFiles.every((file,i) => file === 'mortgage-prepayment-vs-investing.html'
    ? standardLearnDescriptions[i] === 'Compare mortgage or home-loan prepayment with investing the same extra money using equal cash flows, a common horizon and a modeled break-even investment return.'
    : standardLearnDescriptions[i].length >= 100 && standardLearnDescriptions[i].length <= 170)
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


const standardizedFooterDirs = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator'];
const sharedFooterToolHrefs = ['/sip-calculator/','/retirement-calculator/','/inflation-calculator/','/goal-planner/','/financial-independence/','/budget-cash-flow-planner/','/mortgage-payoff-calculator/','/tools.html'];
function footerToolsBlock(html) {
  const m = html.match(/<div class="footer-col"><strong>Tools<\/strong>([\s\S]*?)<\/div>/i);
  return m ? m[1] : '';
}
for (const dir of standardizedFooterDirs) {
  const html = read(`${dir}/index.html`);
  const css = read(`${dir}/styles.css`);
  const toolsBlock = footerToolsBlock(html);
  add(`${dir}: standardized shared footer structure, seven-tool registry and no navigation arrows`,
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
add('retirement: calculator page also uses the seven-tool shared footer',
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
  read('budget-cash-flow-planner/app.js'),
  read('mortgage-payoff-calculator/app.js')
];
add('shared UI: all seven tools render currency options as CODE dot Currency Name',
  currencyFormatSources.every(src => /\$\{(?:code|c|k)\} · \$\{/.test(src))
);

const sharedLocaleCssDirs = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator'];
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
  add('main site: shared UI standard documents the seven-tool CORE7 registry and no-arrow footer rule',
    uiStandard.includes('Version:** 1.1') &&
    uiStandard.includes('Budget & Cash Flow Planner') &&
    uiStandard.includes('Home Loan / Mortgage Prepayment & Early Payoff Calculator') &&
    uiStandard.includes('current seven-tool registry') &&
    uiStandard.includes('No arrows in footer navigation') &&
    uiStandard.includes('UI Standardization Batch 1') &&
    uiStandard.includes('44px on desktop') && uiStandard.includes('38px on mobile')
  );
}




// CORE7 Home Loan / Mortgage Prepayment & Early Payoff - Snapshot 43 implementation contract.
const mortgageHtml = read('mortgage-payoff-calculator/index.html');
const mortgageCore = read('mortgage-payoff-calculator/core.js');
const mortgageApp = read('mortgage-payoff-calculator/app.js');
const mortgagePdf = read('mortgage-payoff-calculator/mortgage-payoff-pdf-renderer.js');
const mortgageState = read('mortgage-payoff-calculator/shared-plan-state.js');
const mortgageBridge = read('mortgage-payoff-calculator/shared-plan-bridge.js');
const mortgageReadme = read('mortgage-payoff-calculator/README.md');
const mortgageQa = fs.readFileSync(new URL('../tests/15-mortgage-payoff-calculator.spec.js', import.meta.url), 'utf8');
const mortgageStyles = read('mortgage-payoff-calculator/styles.css');

add('mortgage: shared shell follows approved Carrowmont header/footer standard',
  mortgageHtml.includes('class="brand-wordmark">CARROWMONT</span>') &&
  mortgageHtml.includes('<a href="#planner">Calculator</a>') &&
  mortgageHtml.includes('<a href="#how-it-works">How it works</a>') &&
  mortgageHtml.includes('<a href="#methodology">Methodology</a>') &&
  mortgageHtml.includes('<a href="/tools.html">All tools</a>') &&
  mortgageHtml.includes('<a href="/">Home</a>') &&
  mortgageHtml.includes('class="mobile-nav"') &&
  mortgageHtml.includes('class="footer-wordmark" href="/">CARROWMONT</a>') &&
  mortgageHtml.includes('<strong>Carrowmont</strong>') &&
  mortgageHtml.includes('<strong>Legal</strong>') &&
  mortgageHtml.includes('footer-product-bottom') &&
  mortgageStyles.includes('CORE7 shared-shell conformance - 2026-10-11') &&
  mortgageStyles.includes('.site-header .mobile-nav')
);

const core7Spec = read('draw004.github.io/docs/CARROWMONT_CORE7_HOME_LOAN_MORTGAGE_PAYOFF_SPEC.md');
const core7ToolsDirectory = read('draw004.github.io/tools.html');
const core7Sitemap = read('draw004.github.io/sitemap.xml');
const core7Css = read('draw004.github.io/carrowmont.css');

add('CORE7 mortgage: canonical page, four modes and neutral recurring part-prepayment state are present',
  mortgageHtml.includes('https://carrowmont.com/mortgage-payoff-calculator/') &&
  ['recurring','lump','target','full'].every(mode => mortgageHtml.includes(`data-mode="${mode}"`)) &&
  mortgageHtml.includes('id="recurringEnabled"') &&
  mortgageHtml.includes('<option value="">Choose frequency</option>') &&
  mortgageHtml.includes('<option value="quarterly">Quarterly</option>') &&
  !/id="extraFrequency"[^>]*>\s*<option[^>]*selected/i.test(mortgageHtml)
);
add('CORE7 mortgage: scheduled repayment, planning view and part-prepayment cadence remain separate concepts',
  mortgageHtml.includes('id="paymentFrequency"') && mortgageHtml.includes('data-view="monthly"') && mortgageHtml.includes('data-view="paycycle"') &&
  mortgageHtml.includes('id="extraFrequency"') && mortgageApp.includes("planningView==='paycycle'") &&
  mortgagePdf.includes('View changes presentation only')
);
add('CORE7 mortgage: calculation engine includes standard and Canadian fixed-rate conventions plus payoff safety',
  mortgageCore.includes("if(convention==='canada-fixed') return Math.pow(1+r/2,2/m)-1") &&
  mortgageCore.includes('scheduledPayment') && mortgageCore.includes("error:'negative-amortization'") &&
  mortgageCore.includes('Math.min(extra,maxExtra)') && mortgageCore.includes('Math.max(0,opening+interest-scheduled-extra)')
);
add('CORE7 mortgage: target-payoff lump sum is applied before target-period interest',
  mortgageCore.includes('const startBalance=Math.max(0,finite(input.balance)-lump)') &&
  mortgageCore.includes('simulate({balance:startBalance') && mortgageCore.includes('initialLumpSum:lump')
);
add('CORE7 mortgage: CSV and PDF expose methodology, scenario assumptions and complete schedule contract',
  mortgageApp.includes("['target_payoff_date'") && mortgageApp.includes("['recurring_extra_start_period'") &&
  mortgageApp.includes("['methodology_version','1.0.0']") && mortgageApp.includes("['period','date','opening_balance'") &&
  mortgagePdf.includes('Report Guide & Methodology') === false && mortgagePdf.includes('.guidePage(') && mortgagePdf.includes('.continuePlanningPage(')
);
add('CORE7 mortgage: shared local plan state is versioned, local-only and semantic',
  mortgageState.includes("const STORAGE_KEY = 'carrowmont_plan_context_v1'") && mortgageState.includes('const SCHEMA_VERSION = 1') &&
  mortgageState.includes("new Set(['locale', 'assumptions', 'housingLoan'])") &&
  !/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/.test(mortgageState + mortgageBridge)
);
const sharedStateCopies = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator'].map(dir => read(`${dir}/shared-plan-state.js`));
const sharedBridgeCopies = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator'].map(dir => read(`${dir}/shared-plan-bridge.js`));
add('CORE7 mortgage: shared-plan-state helper is byte-identical across all seven primary tools', sharedStateCopies.every(Boolean) && sharedStateCopies.every(x => x === sharedStateCopies[0]));
add('CORE7 mortgage: shared-plan bridge is byte-identical across all seven primary tools', sharedBridgeCopies.every(Boolean) && sharedBridgeCopies.every(x => x === sharedBridgeCopies[0]));
add('CORE7 mortgage: existing tools use safe explicit housing handoff rules rather than silent double counting',
  mortgageBridge.includes('Use in Rent / mortgage') && mortgageBridge.includes('Apply to Home loan / rent') &&
  mortgageBridge.includes('Use balance as goal amount') && mortgageBridge.includes('will not add this automatically and risk double-counting') &&
  mortgageBridge.includes('will not automatically redirect that future payment into investing') &&
  mortgageBridge.includes('will not inflate the loan balance')
);
add('CORE7 mortgage: main homepage/directory/sitemap integrate seventh primary tool and fixed eighth gateway',
  mainHome.includes('data-core-tool-count="7"') && mainHome.includes('data-tool-id="housing"') &&
  core7ToolsDirectory.includes('data-directory-tool="housing"') && core7ToolsDirectory.includes('href="/mortgage-payoff-calculator/"') &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-payoff-calculator/') &&
  core7Css.includes('.planning-grid[data-core-tool-count="7"] .explore-all-card{grid-column:span 1}')
);
add('CORE7 mortgage: country-demand runtime includes housing in all seven-item profiles and keeps currency outside order selection',
  ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11'].every(profile => {
    const m=mainSiteJs.match(new RegExp(`${profile}:\\s*Object\\.freeze\\(\\[([^\\]]+)\\]`));
    return m && m[1].includes('housing') && (m[1].match(/"/g)||[]).length===14;
  }) && mainSiteJs.includes('const regionCode = locale.getRegion()')
);
add('CORE7 mortgage: approved merged specification and dedicated QA protect the release',
  core7Spec.includes('Home Loan / Mortgage Prepayment & Early Payoff Calculator') &&
  core7Spec.includes('Part-prepayment cadence is user-selected') &&
  mortgageQa.includes('recurring part-prepayment is neutral by default') && mortgageQa.includes('Pay Cycle View do not change amortization') &&
  mortgageReadme.includes('Carrowmont')
);

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


add('main site: GSEO1B-2 sitemap freshness marks only the changed core calculator URLs at the release date',
  sitemapLastmods.get('https://carrowmont.com/financial-independence/') === '2026-10-13' &&
  sitemapLastmods.get('https://carrowmont.com/retirement-calculator/planner.html') === '2026-10-13' &&
  sitemapLastmods.get('https://carrowmont.com/budget-cash-flow-planner/') === '2026-10-13' &&
  sitemapLastmods.get('https://carrowmont.com/inflation-calculator/') === '2026-10-13'
);

const gseo1cSitemapLastmods = new Map([...learnSitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map(m => [m[1], m[2]]));
add('main site: GSEO1C sitemap publishes the editorial policy and refreshes all structured-data/trust pages',
  [
    'https://carrowmont.com/',
    'https://carrowmont.com/tools.html',
    'https://carrowmont.com/about.html',
    'https://carrowmont.com/methodology.html',
    'https://carrowmont.com/editorial-policy.html',
    'https://carrowmont.com/sip-calculator/',
    'https://carrowmont.com/goal-planner/',
    'https://carrowmont.com/financial-independence/',
    'https://carrowmont.com/inflation-calculator/',
    'https://carrowmont.com/retirement-calculator/',
    'https://carrowmont.com/retirement-calculator/planner.html',
    'https://carrowmont.com/budget-cash-flow-planner/',
    'https://carrowmont.com/mortgage-payoff-calculator/'
  ].every(url => gseo1cSitemapLastmods.get(url) === '2026-10-13')
);

// BING-SEO2 internal authority and search-presentation contract - 2026-10-08.
add('main site: BING-SEO2 Learn titles and descriptions stay concise for search presentation',
  standardizedLearnPages.length >= 52 &&
  standardizedLearnFiles.every((file,i) => file === 'mortgage-prepayment-vs-investing.html'
    ? standardLearnTitles[i] === 'Mortgage Prepayment vs Investing: How to Compare the Trade-Off | Carrowmont'
    : standardLearnTitles[i].length >= 25 && standardLearnTitles[i].length <= 60) &&
  standardizedLearnFiles.every((file,i) => file === 'mortgage-prepayment-vs-investing.html'
    ? standardLearnDescriptions[i] === 'Compare mortgage or home-loan prepayment with investing the same extra money using equal cash flows, a common horizon and a modeled break-even investment return.'
    : standardLearnDescriptions[i].length >= 110 && standardLearnDescriptions[i].length <= 160)
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
  sitemapLastmods.get('https://carrowmont.com/financial-independence/') === '2026-10-13'
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
  sitemapLastmods.get('https://carrowmont.com/learn.html') >= '2026-10-11' &&
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
add('main site: GSEO1B-1 Gold primary action navigates to the already-live scenario result',
  goldMacroHtml.includes('id="exploreBtn" aria-controls="goldResults">View Gold Scenario Results</button>') &&
  goldMacroHtml.includes('class="gmse-results" id="goldResults" tabindex="-1"') &&
  goldMacroApp.includes('function viewResults()') && goldMacroApp.includes('scrollIntoView') &&
  goldMacroApp.includes("els.explore.addEventListener('click',viewResults)")
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
add('main site: SEO3D weekly updater fails closed for core sources, preserves validated OFR only on explicit availability failure, and keeps reviewed fields protected',
  goldMacroUpdater.includes('Promise.all([fetchTreasury(),fetchDollar(),fetchCpi(),fetchGpr()])') &&
  goldMacroUpdater.includes('OFR_AVAILABILITY_STATUSES') && goldMacroUpdater.includes('class OfrUnavailableError') &&
  goldMacroUpdater.includes("status:ofr.preserved?'preserved':'refreshed'") &&
  goldMacroUpdater.includes('prior validated OFR reference may be preserved') &&
  goldMacroUpdater.includes('Current reference snapshotDate is invalid.') &&
  goldMacroUpdater.includes('previousSnapshotDate,newestAutomatedDate') &&
  goldMacroUpdater.includes('OFR FSI input missing without an approved availability fallback') &&
  goldMacroUpdater.includes('insufficient five-year history') && goldMacroUpdater.includes('insufficient monthly history') &&
  goldMacroUpdater.includes('source date moved backwards') && goldMacroUpdater.includes('Anomaly guard:') &&
  goldMacroUpdater.includes('structuredClone(oldRef)') && goldMacroUpdater.includes('preservedReviewed') &&
  goldMacroSpec.includes('fail-closed for Treasury real yields, Broad Dollar, CPI and GPR') &&
  goldMacroSpec.includes('previously validated OFR FSI value, percentile and source date') &&
  goldMacroImplementation.includes('sourceStatus.ofr.status = "preserved"') &&
  goldMacroSpec.includes('top-level `snapshotDate` is monotonic') &&
  goldMacroImplementation.includes('monotonic reference freshness') &&
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
  sitemapLastmods.get('https://carrowmont.com/gold-macro-stress-explorer.html') === '2026-10-12' &&
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
add('central QA: SEO3D covers live-style RUM privacy, mobile widths, PDF, OFR availability fallback and updater hard-failure fixtures',
  goldMacroQa.includes('isIsolatedCloudflareRum') && goldMacroQa.includes('360px and 390px') &&
  goldMacroQa.includes('PDF is exactly four pages') && goldMacroQa.includes('malformed input') &&
  goldMacroQa.includes('OFR availability fallback') && goldMacroQa.includes('non-OFR failure') &&
  goldMacroQa.includes('sourceStatus.ofr.status') && goldMacroQa.includes('anomaly rejection')
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
  add('main site: SEO3D approved deterministic fixtures A-K and current bundled reference classifications pass independently',
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
    !!refScores && (() => {
      const storedReferenceScores = {
        realYield: goldMacroReference?.drivers?.realYields?.referenceScore,
        dollar: goldMacroReference?.drivers?.dollar?.referenceScore,
        inflation: goldMacroReference?.drivers?.inflation?.referenceScore,
        centralBank: goldMacroReference?.drivers?.centralBankDemand?.referenceScore,
        fiscal: goldMacroReference?.drivers?.fiscalStress?.referenceScore,
        stress: goldMacroReference?.drivers?.stress?.referenceScore
      };
      return Object.entries(storedReferenceScores).every(([k,v]) => Number.isFinite(v) && refScores[k] === v);
    })()
  );
}



// --- SEO3D Silver Supply, Demand & Macro Stress Explorer ---
const silverHtml = read('draw004.github.io/silver-supply-demand-macro-stress-explorer.html');
const silverCss = read('draw004.github.io/silver-supply-demand-macro-stress-explorer.css');
const silverCore = read('draw004.github.io/silver-supply-demand-macro-stress-explorer-core.js');
const silverApp = read('draw004.github.io/silver-supply-demand-macro-stress-explorer.js');
const silverPdf = read('draw004.github.io/silver-supply-demand-macro-stress-explorer-pdf-renderer.js');
const silverReport = read('draw004.github.io/silver-supply-demand-macro-stress-explorer-report-standard.js');
const silverReferenceRaw = read('draw004.github.io/data/silver-market-reference.json');
const silverValidator = read('draw004.github.io/scripts/validate-silver-market-reference.mjs');
const silverArticle = read('draw004.github.io/silver-vs-gold.html');
const silverSpec = read('draw004.github.io/docs/CARROWMONT_SEO3D_SILVER_SUPPLY_DEMAND_MACRO_STRESS_EXPLORER_SPEC_FINAL.md');
const silverImplementation = read('draw004.github.io/docs/CARROWMONT_SEO3D_SILVER_SUPPLY_DEMAND_MACRO_STRESS_EXPLORER_IMPLEMENTATION.md');
const silverQa = fs.readFileSync(new URL('../tests/14-silver-supply-demand-macro-stress.spec.js', import.meta.url), 'utf8');
let silverReference=null;try{silverReference=JSON.parse(silverReferenceRaw);}catch(_){}
add('main site: Silver Explorer product, physical reference, validator, discovery article, spec and implementation files exist',
  !!silverHtml&&!!silverCss&&!!silverCore&&!!silverApp&&!!silverPdf&&!!silverReport&&!!silverReferenceRaw&&!!silverValidator&&!!silverArticle&&!!silverSpec&&!!silverImplementation
);
add('main site: Silver Explorer canonical metadata, one H1 and indexability contract are present',
  silverHtml.includes('<link rel="canonical" href="https://carrowmont.com/silver-supply-demand-macro-stress-explorer.html">') &&
  silverHtml.includes('<meta name="robots" content="index,follow">') && silverHtml.includes('"@type":"WebApplication"') &&
  (silverHtml.match(/<h1\b/g)||[]).length===1
);
add('main site: Silver completed-year physical reference preserves 2025 World Silver Survey provenance and USGS cross-check',
  !!silverReference && silverReference.schemaVersion===1 && silverReference.methodologyVersion==='silver-supply-demand-macro-v1.0' &&
  silverReference.referenceYear===2025 && silverReference.supply?.mineProductionMoz===846.6 && silverReference.supply?.recyclingMoz===197.6 &&
  silverReference.demand?.industrialMoz===657.4 && silverReference.demand?.physicalInvestmentMoz===217.7 && silverReference.publishedBalanceMoz===-40.3 &&
  /World Silver Survey 2026/.test(silverReference.source?.title||'') && /U\.S\. Geological Survey|USGS/.test(silverReference.secondaryValidation?.publisher||'')
);
add('main site: Silver browser path uses only bundled same-origin Silver and shared Gold macro references',
  silverApp.includes("fetch('data/silver-market-reference.json'") && silverApp.includes("fetch('data/gold-macro-reference.json'") &&
  !/silverinstitute\.org|usgs\.gov|home\.treasury\.gov|federalreserve\.gov/i.test(silverApp) && !/api[_-]?key|openai|anthropic/i.test(silverApp+silverCore)
);
add('main site: Silver physical balance thresholds and disclosed simple sensitivities match the approved deterministic specification',
  silverCore.includes("if(r<=-0.05)") && silverCore.includes("if(r<=-0.02)") && silverCore.includes("if(r<0.02)") && silverCore.includes("if(r<0.05)") &&
  silverCore.includes("industrial:{weak:-5,reference:0,strong:5}") && silverCore.includes("physicalInvestment:{weak:-10,reference:0,strong:10}") &&
  silverCore.includes("mineProduction:{weak:-2,reference:0,strong:2}") && silverCore.includes("recycling:{weak:-10,reference:0,strong:10}")
);
add('main site: Silver explicitly separates physical and macro outputs and rejects price-prediction framing',
  /Physical market/i.test(silverHtml) && /Macro backdrop/i.test(silverHtml) && silverHtml.includes('Silver is not simply “cheaper gold”') &&
  silverHtml.includes('does not guarantee a price increase') && silverHtml.includes('No price forecast') &&
  !/silver (?:will|must) (?:rise|fall)|buy silver now|sell silver now/i.test(silverApp+silverCore)
);
add('main site: Silver Advanced Assumptions begin collapsed and expose Moz/metric-tonne display without local-currency conversion',
  silverHtml.includes('id="advancedAssumptions"') && !silverHtml.includes('id="advancedAssumptions" open') &&
  silverHtml.includes('data-unit="moz"') && silverHtml.includes('data-unit="tonnes"') && silverCore.includes('MOZ_TO_TONNES=31.1034768')
);
add('main site: Silver actions share one deterministic scenario across Copy Summary, CSV and four-page report layer',
  silverHtml.includes('Copy Summary') && silverHtml.includes('Download CSV') && silverHtml.includes('Generate Silver Report') &&
  silverApp.includes('window.__carrowmontSilverLastResult') && silverApp.includes('function copySummary()') && silverApp.includes('function downloadCsv()') &&
  silverPdf.includes("filename:'carrowmont-silver-supply-demand-macro-stress-report.pdf'") && silverReport.includes('continuePlanningPage')
);
add('main site: Silver-vs-Gold discovery article is canonical, substantive, globally neutral and links twice to the Explorer',
  /<link[^>]*href="https:\/\/carrowmont\.com\/silver-vs-gold\.html"[^>]*rel="canonical"|<link[^>]*rel="canonical"[^>]*href="https:\/\/carrowmont\.com\/silver-vs-gold\.html"/i.test(silverArticle) && (silverArticle.match(/<h1\b/g)||[]).length===1 &&
  (silverArticle.match(/href="\/silver-supply-demand-macro-stress-explorer\.html"/g)||[]).length>=2 &&
  /industrial demand/i.test(silverArticle) && /40\.3 million ounces/.test(silverArticle) && !/₹|\blakhs?\b|\bcrores?\b/i.test(learnMainVisibleText(silverArticle))
);
add('main site: Silver discovery funnel is connected through Learn, Gold context, Tools directory and sitemap',
  read('draw004.github.io/learn.html').includes('href="/silver-vs-gold.html"') &&
  ['gold-as-an-investment.html','gold-and-inflation.html','gold-vs-stocks.html','physical-gold-vs-gold-etf.html','gold-macro-stress-explorer.html'].every(f=>read('draw004.github.io/'+f).includes('href="/silver-vs-gold.html"')) &&
  read('draw004.github.io/tools.html').includes('href="/silver-supply-demand-macro-stress-explorer.html"') &&
  sitemapLastmods.get('https://carrowmont.com/silver-vs-gold.html')==='2026-10-10' && sitemapLastmods.get('https://carrowmont.com/silver-supply-demand-macro-stress-explorer.html')==='2026-10-10'
);
add('main site: Silver annual physical-reference validator is offline, deterministic and protects source reconciliation',
  silverValidator.includes('publishedBalanceMoz') && silverValidator.includes('publishedTotalDemandMoz') && silverValidator.includes('history') &&
  silverValidator.includes('secondaryValidation') && !/fetch\(|https?:\/\//.test(silverValidator)
);
let silverCoreApi=null;try{const sandbox={module:{exports:{}},exports:{},console};vm.runInNewContext(silverCore,sandbox,{filename:'silver-supply-demand-macro-stress-explorer-core.js'});silverCoreApi=sandbox.module.exports;}catch(_){}
add('main site: Silver core executes as an isolated pure deterministic module',
  !!silverCoreApi && typeof silverCoreApi.buildScenario==='function' && typeof silverCoreApi.classifyBalanceRatio==='function' && typeof silverCoreApi.toTonnes==='function' &&
  !/document\.|window\.|fetch\(|XMLHttpRequest/.test(silverCore)
);
if(silverCoreApi&&silverReference&&goldMacroReference){
  const ref=silverCoreApi.buildScenario(silverReference,goldMacroReference,{});
  const industrial=silverCoreApi.buildScenario(silverReference,goldMacroReference,{adjustments:{industrial:5}});
  const recycling=silverCoreApi.buildScenario(silverReference,goldMacroReference,{adjustments:{recycling:10}});
  add('main site: Silver approved deterministic reference and scenario fixtures pass independently',
    Math.abs(ref.totals.totalSupply-1090.4)<1e-9 && Math.abs(ref.totals.totalDemand-1130.7)<1e-9 && Math.abs(ref.totals.balance+40.3)<1e-9 && ref.balanceClass.label==='Modeled deficit' &&
    industrial.balanceClass.label==='Large modeled deficit' && recycling.balanceClass.label==='Near balance' &&
    silverCoreApi.classifyBalanceRatio(-.06).label==='Large modeled deficit' && silverCoreApi.classifyBalanceRatio(.06).label==='Large modeled surplus' &&
    Math.abs(silverCoreApi.toMoz(silverCoreApi.toTonnes(123.456))-123.456)<1e-9
  );
}
add('central QA: Silver suite covers deterministic physical fixtures, hidden advanced controls, discovery funnel, exports, PDF, privacy and mobile',
  silverQa.includes('completed-year reference and independent deterministic physical fixtures reconcile') && silverQa.includes('Advanced Assumptions open through the real user flow') &&
  silverQa.includes('discovery article answers silver-vs-gold intent') && silverQa.includes('PDF is exactly four pages') && silverQa.includes('same-origin bundled Silver/Gold references') &&
  silverQa.includes('360px and 390px')
);
add('main site: Silver implementation record locks Snapshot 39, two-PR scope and no workflow permission requirement',
  silverImplementation.includes('Snapshot 39') && silverImplementation.includes('932669af99842a2ca31b30f76ffffc9d3edec509') &&
  silverImplementation.includes('4727a788bdbe01b64c61f9abe55a06baac4b53de') && silverImplementation.includes('Expected generated release PR count: **2**') &&
  silverImplementation.includes('Workflows: Read and write is not required')
);

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
add('main site: LEARN-LOCALE1 audits the full Learn/hub set through the shared localization layer',
  learnLocalePages.length >= 60 && learnLocalePages.includes('learn.html') && learnLocalePages.includes('financial-independence-number.html') && learnLocalePages.includes('mortgage-prepayment-vs-investing.html')
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
  initialLearnLocaleAffected.every(file => { const d=sitemapLastmods.get('https://carrowmont.com/' + file); return file === 'learn.html' ? d >= '2026-10-11' : file === 'rent-vs-buy-home.html' ? d === '2026-10-11' : d === '2026-10-10'; }) &&
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


// Mortgage Learn & Education Integration V1 - 2026-10-11.
const mortgageLearnHub = read('draw004.github.io/learn.html');
const mortgageLearnScript = read('draw004.github.io/mortgage-learn.js');
const mortgageLearnArticleJs = read('draw004.github.io/learn-article.js');
const mortgageLearnToolHtml = read('mortgage-payoff-calculator/index.html');
const mortgageLearnToolApp = read('mortgage-payoff-calculator/app.js');
const mortgageLearnToolCss = read('mortgage-payoff-calculator/styles.css');
const mortgageLearnRentBuy = read('draw004.github.io/rent-vs-buy-home.html');
const mortgageLearnImpl = read('draw004.github.io/docs/CARROWMONT_MORTGAGE_LEARN_EDUCATION_V1_IMPLEMENTATION.md');
const mortgageLearnQa = fs.readFileSync(new URL('../tests/16-mortgage-learn-education.spec.js', import.meta.url), 'utf8');
add('Mortgage Learn V1: all five universal guides exist, inherit the article standard and are discoverable from the Learn hub',
  mortgageLearnFiles.every(file => fs.existsSync(path.join(root,'draw004.github.io',file)) && mortgageLearnHub.includes('href="/'+file+'"') && read('draw004.github.io/'+file).includes('data-cm-learn-article="1"') && read('draw004.github.io/'+file).includes('href="/mortgage-payoff-calculator/"')) &&
  mortgageLearnHub.includes('id="home-loans"') && mortgageLearnHub.includes('Home Loans &amp; Mortgages')
);
add('Mortgage Learn V1: new guides use the shared mortgage-localization layer and shared bottom tool-return pattern',
  mortgageLearnScript.includes("IN:{kicker:'HOME LOAN PREPAYMENT GUIDE'") && mortgageLearnScript.includes("GB:{kicker:'MORTGAGE OVERPAYMENT GUIDE'") &&
  mortgageLearnArticleJs.includes("'/mortgage-payoff-calculator/': 'Mortgage / Home Loan Payoff Calculator'") &&
  mortgageLearnFiles.every(file => read('draw004.github.io/'+file).includes('mortgage-learn.js?v=20261011-mortgage1'))
);
add('Mortgage Learn V1: new guides preserve the shared single-content-wrapper and one-direct-answer article structure',
  mortgageLearnFiles.every(file => {
    const page = read('draw004.github.io/'+file);
    return /<article class="guide-section"><div>\s*<div class="guide-action-first">/.test(page) &&
      !page.includes('class="guide-number"') &&
      (page.match(/class="guide-answer"/g)||[]).length === 1;
  })
);
add('Mortgage Learn V1: tool exposes before-model Learn bridge, contextual result education and exactly one country-aware FAQ slot',
  mortgageLearnToolHtml.includes('UNDERSTAND BEFORE YOU MODEL') && mortgageLearnToolHtml.includes('href="/one-extra-mortgage-payment-a-year.html"') &&
  mortgageLearnToolHtml.includes('id="resultLearnLink"') && mortgageLearnToolHtml.includes('id="countryFaqItem"') &&
  !mortgageLearnToolHtml.includes('What does home-loan foreclosure mean in India?') && !mortgageLearnToolHtml.includes('What is mortgage overpayment in the UK?') &&
  mortgageLearnToolApp.includes('function countryFaq(') && mortgageLearnToolApp.includes("href:'/pay-off-mortgage-five-years-early.html'") &&
  mortgageLearnToolCss.includes('Mortgage Learn & Education Integration V1')
);
add('Mortgage Learn V1: Learn-to-Tool and Tool-to-Learn paths are bidirectional and Rent vs Buy is contextually connected',
  mortgageLearnFiles.every(file => read('draw004.github.io/'+file).includes('href="/mortgage-payoff-calculator/"')) &&
  mortgageLearnToolHtml.includes('href="/learn.html#home-loans"') && mortgageLearnRentBuy.includes('href="/mortgage-payoff-calculator/"') && mortgageLearnRentBuy.includes('href="/one-extra-mortgage-payment-a-year.html"')
);
add('Mortgage Learn V1: sitemap contains every new guide with the release date and changed discovery pages are refreshed',
  mortgageLearnFiles.every(file => sitemapLastmods.get('https://carrowmont.com/'+file)>='2026-10-11') &&
  sitemapLastmods.get('https://carrowmont.com/learn.html')>='2026-10-11' && sitemapLastmods.get('https://carrowmont.com/rent-vs-buy-home.html')==='2026-10-11'
);
add('Mortgage Learn V1: implementation record locks Snapshot 44, three-PR scope and no workflow permission requirement',
  mortgageLearnImpl.includes('Source Snapshot 44') && mortgageLearnImpl.includes('5c8c9ae3a8afbf6c6bb1d4ad3de6888e6f8a2ff8') &&
  mortgageLearnImpl.includes('5b62be00cbe76d78003c94567006cc0c3590c637') && mortgageLearnImpl.includes('dba41980f57dcad9dcbf409b4ce092d22dbd004c') &&
  mortgageLearnImpl.includes('Expected generated release PR count: **3**') && mortgageLearnImpl.includes('Workflows: Read and write` is **not required**')
);
add('central QA: Mortgage Learn V1 protects country-aware FAQ, contextual result education, bidirectional links and mobile overflow',
  mortgageLearnQa.includes('country-aware FAQ') && mortgageLearnQa.includes('result education link changes') && mortgageLearnQa.includes('shared bottom CTA') &&
  mortgageLearnQa.includes('Home Loans & Mortgages cluster') && mortgageLearnQa.includes('390,360')
);


// CORE6 Tool <-> Learn Integration V1 - 2026-10-11.
const core6ToolLearnCases = [
  { repo:'sip-calculator', page:'index.html', primary:'/compound-interest-monthly-contributions.html', related:['/starting-investing-earlier.html','/step-up-sip-vs-regular-sip.html','/investment-time-to-target.html'], tool:'/sip-calculator/' },
  { repo:'goal-planner', page:'index.html', primary:'/savings-goal-planning.html', related:['/how-much-should-i-invest-each-month.html','/planning-life-goals.html','/emergency-fund-how-much.html'], tool:'/goal-planner/' },
  { repo:'financial-independence', page:'index.html', primary:'/when-can-i-reach-financial-independence.html', related:['/coast-fire-explained.html','/longevity-risk-retirement.html','/diversification-across-asset-classes.html'], tool:'/financial-independence/' },
  { repo:'inflation-calculator', page:'index.html', primary:'/inflation-value-of-money-over-time.html', related:['/future-cost-of-expenses.html','/inflation-purchasing-power-savings.html','/todays-money-vs-future-money.html'], tool:'/inflation-calculator/' },
  { repo:'retirement-calculator', page:'planner.html', primary:'/how-much-money-do-i-need-to-retire.html', related:['/retirement-expenses.html','/how-long-will-retirement-savings-last.html','/inflation-and-retirement-planning.html'], tool:'/retirement-calculator/' },
  { repo:'budget-cash-flow-planner', page:'index.html', primary:'/cash-flow-vs-income.html', related:['/budgeting-by-pay-frequency.html','/budgeting-with-irregular-income.html','/sinking-fund-vs-emergency-fund.html'], tool:'/budget-cash-flow-planner/' }
];
const core6ToolLearnQa = fs.readFileSync(new URL('../tests/17-core6-tool-learn-integration.spec.js', import.meta.url), 'utf8');
add('CORE6 Tool-Learn V1: all six remaining core tools expose one primary education bridge and contextual result links',
  core6ToolLearnCases.every(item => {
    const html = read(item.repo+'/'+item.page);
    return html.includes('data-cm-tool-learn="primary"') && html.includes('href="'+item.primary+'"') &&
      html.includes('data-cm-tool-learn="result"') && item.related.every(href => html.includes('href="'+href+'"')) && html.includes('href="/learn.html"');
  })
);
add('CORE6 Tool-Learn V1: the shared education-card presentation is present in every affected core-tool stylesheet',
  core6ToolLearnCases.every(item => {
    const css = read(item.repo+'/styles.css');
    return css.includes('CORE6 Tool <-> Learn Integration V1') && css.includes('.cm-learn-bridge-card') && css.includes('.cm-result-learn-card') && css.includes('@media(max-width:800px)');
  })
);
add('CORE6 Tool-Learn V1: every selected primary and contextual Learn guide links back to its mapped core tool',
  core6ToolLearnCases.every(item => [item.primary,...item.related].every(href => {
    const file = href.replace(/^\//,'');
    const article = read('draw004.github.io/'+file);
    return article.includes('data-cm-learn-article="1"') && article.includes('class="guide-action-first"') && article.includes('href="'+item.tool+'"');
  }))
);
add('CORE6 Tool-Learn V1: Retirement exposes education on both its public landing page and working planner',
  read('retirement-calculator/index.html').includes('data-cm-tool-learn="primary"') &&
  read('retirement-calculator/index.html').includes('href="/how-much-money-do-i-need-to-retire.html"') &&
  read('retirement-calculator/planner.html').includes('data-cm-tool-learn="primary"') &&
  read('retirement-calculator/planner.html').includes('data-cm-tool-learn="result"')
);
add('central QA: CORE6 Tool-Learn V1 protects both link directions and 390/360 mobile overflow',
  core6ToolLearnQa.includes('primary Learn bridge') && core6ToolLearnQa.includes('shared bottom CTA') &&
  core6ToolLearnQa.includes('Retirement landing page') && core6ToolLearnQa.includes('390, 360')
);


// MDC1A Mortgage Decision Centre - Prepayment vs Investing - Snapshot 48 production contract.
const mdcHubHtml = read('mortgage-payoff-calculator/decision-centre.html');
const mdcToolHtml = read('mortgage-payoff-calculator/prepayment-vs-investing.html');
const mdcCore = read('mortgage-payoff-calculator/prepayment-vs-investing-core.js');
const mdcUi = read('mortgage-payoff-calculator/prepayment-vs-investing.js');
const mdcPdf = read('mortgage-payoff-calculator/prepayment-vs-investing-pdf-renderer.js');
const mdcProfile = read('mortgage-payoff-calculator/mortgage-decision-profile.js');
const mdcCss = read('mortgage-payoff-calculator/decision-centre.css');
const mdcLearn = read('draw004.github.io/mortgage-prepayment-vs-investing.html');
const mdcImpl = read('draw004.github.io/docs/CARROWMONT_MDC1A_PREPAYMENT_VS_INVESTING_IMPLEMENTATION.md');
const mdcSpec = read('draw004.github.io/docs/CARROWMONT_MDC1A_PREPAYMENT_VS_INVESTING_SPEC_FINAL.md');
const mdcQa = fs.readFileSync(new URL('../tests/18-mortgage-decision-centre-mdc1a.spec.js', import.meta.url), 'utf8');

add('MDC1A: Decision Centre publishes exactly two live choices and two non-link planned choices',
  mdcHubHtml.includes('<h1>What are you trying to decide?</h1>') &&
  (mdcHubHtml.match(/<span class="decision-status">Live<\/span>/g)||[]).length === 2 &&
  (mdcHubHtml.match(/<article class="decision-card planned">/g)||[]).length === 2 &&
  mdcHubHtml.includes('Planned for MDC1B. No placeholder calculator is published.') &&
  mdcHubHtml.includes('Planned for MDC1C. No placeholder calculator is published.') &&
  [...mdcHubHtml.matchAll(/<article class="decision-card planned">([\s\S]*?)<\/article>/g)].every(m => !/<a\b/.test(m[1]))
);
add('MDC1A: canonical routes, equal-cash-flow methodology and break-even hero are present',
  mdcHubHtml.includes('https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html') &&
  mdcToolHtml.includes('https://carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html') &&
  mdcToolHtml.includes('BREAK-EVEN INVESTMENT RETURN') && mdcToolHtml.includes('Equal cash flow. One original mortgage horizon.') &&
  mdcCore.includes("breakEvenStatus: 'no-extra'") && mdcCore.includes('applicable: false') &&
  mdcCore.includes('prepayInvestmentContribution') && mdcCore.includes('identityDifference') &&
  !/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/.test(mdcCore + mdcProfile)
);
add('MDC1A: investment return stays user-controlled and no market-return default/feed is introduced',
  mdcToolHtml.includes('id="assumedReturn"') && mdcToolHtml.includes('placeholder="Optional') && mdcToolHtml.includes('max="100"') &&
  mdcUi.includes("rawReturn===''?'':Number(rawReturn)") &&
  !/market\s*return\s*(api|feed)|yahoo|alpha\s*vantage|finnhub|polygon\.io/i.test(mdcCore + mdcUi)
);
add('MDC1A: local mortgage profile is scoped, explicit-use and does not store decision assumptions',
  mdcProfile.includes("const STORAGE_KEY = 'carrowmontMortgageDecisionV1'") &&
  mdcToolHtml.includes('Use these loan details') && mdcToolHtml.includes('Start fresh') &&
  mortgageApp.includes('decisionProfileFromResult()') && mortgageApp.includes('D.write(profile)') && mortgageApp.includes("window.location.href='prepayment-vs-investing.html'") &&
  !/assumedInvestmentReturn|prepaymentCharge|extraAmount|result/i.test(mdcProfile)
);
add('MDC1A: existing payoff engine is consumed as a separate dependency rather than copied into the decision engine',
  mdcCore.includes('const Mortgage = window.CarrowmontMortgageCore') &&
  mdcCore.includes('Mortgage.simulate(') && mdcCore.includes('Mortgage.paymentConvention(') &&
  !mdcCore.includes('function scheduledPayment(') && mdcImpl.includes('existing `mortgage-payoff-calculator/core.js` payoff engine is not modified')
);
add('MDC1A: report is a three-page Decision Report driven from the shared result object and no CSV is added',
  mdcPdf.includes('const canvases=[summaryPage(model),comparisonPage(model),guidePage(model)]') &&
  mdcPdf.includes('.guidePage(') && mdcToolHtml.includes('Generate Prepayment vs Investing Decision Report') &&
  mdcToolHtml.includes('Copy Summary') && !mdcToolHtml.includes('Download CSV')
);
add('MDC1A: primary Learn guide uses Article/Breadcrumb structure and bidirectional tool links',
  mdcLearn.includes('Mortgage Prepayment vs Investing: How to Compare the Trade-Off | Carrowmont') &&
  mdcLearn.includes('"@type":"Article"') && mdcLearn.includes('"@type":"BreadcrumbList"') &&
  mdcLearn.includes('href="/mortgage-payoff-calculator/prepayment-vs-investing.html"') &&
  mdcToolHtml.includes('href="/mortgage-prepayment-vs-investing.html"') &&
  mortgageLearnHub.includes('href="/mortgage-prepayment-vs-investing.html"') &&
  mortgageLearnArticleJs.includes("'/mortgage-payoff-calculator/prepayment-vs-investing.html': 'Mortgage Prepayment vs Investing Calculator'")
);
add('MDC1A: sitemap/discovery include all new public URLs and refreshed Learn hub',
  core7Sitemap.includes('https://carrowmont.com/mortgage-prepayment-vs-investing.html') &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html') &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html') &&
  sitemapLastmods.get('https://carrowmont.com/mortgage-prepayment-vs-investing.html') === '2026-10-12' &&
  sitemapLastmods.get('https://carrowmont.com/learn.html') === '2026-10-12'
);
add('MDC1A: seven-core homepage architecture remains unchanged and companion tools are not promoted as new core cards',
  mainHome.includes('data-core-tool-count="7"') &&
  !mainHome.includes('data-tool-id="mortgage-prepayment-vs-investing"') &&
  !mainHome.includes('data-tool-id="mortgage-decision-centre"')
);
add('MDC1A: implementation record locks Snapshot 48, three-PR merge scope and no-workflow discipline',
  mdcImpl.includes('Source Snapshot 48') &&
  mdcImpl.includes('7ca7eaa3fe7bf7303a70b63f3b74612166a3296b') &&
  mdcImpl.includes('f87041cef73bc489980c93f566191eef78cf372b') &&
  mdcImpl.includes('a62539879b2c33df515bc7d0772c0c30529cbed9') &&
  mdcImpl.includes('Expected generated release PR count: **3**') &&
  mdcImpl.includes('No workflow file is changed') && mdcImpl.includes('Workflows: Read and write` is **not required**') &&
  mdcSpec.includes('common horizon') && mdcSpec.includes('break-even')
);
add('central QA: MDC1A protects profile confirmation, PDF, Learn, localization and 1280/390/360 overflow',
  mdcQa.includes('explicit confirmation') && mdcQa.includes('exact three-page PDF') &&
  mdcQa.includes('bidirectional') && mdcQa.includes("['IN','INR'") && mdcQa.includes("['GB','GBP'") &&
  mdcQa.includes('[1280,390,360]')
);

let mdcFixtureOk = false;
let mdcFixtureDetail = '';
try {
  const sandbox = { window:{}, console, Date, Math, Intl, Number, String, Map, Set, Array, Object, JSON, RegExp };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(mortgageCore, sandbox, { filename:'mortgage-core.js' });
  vm.runInContext(mdcCore, sandbox, { filename:'prepayment-vs-investing-core.js' });
  const MortgageApi = sandbox.window.CarrowmontMortgageCore;
  const C = sandbox.window.CarrowmontMdc1aCore;
  const base = { country:'US', currency:'USD', balance:300000, annualRatePct:6, remainingYears:30, remainingMonths:0, paymentFrequency:'monthly', useCurrentPayment:false, currentPayment:0, extraMode:'lump', extraAmount:25000, lumpSumPeriod:1, prepaymentCharge:0, assumedInvestmentReturnPct:7, startDate:'2026-10-12', rateMode:'fixed' };
  const calc = over => C.calculate({ ...base, ...over });
  const close = (a,b,t=1e-6) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= t;
  const checks = [];
  const push = (name,ok) => checks.push([name,Boolean(ok)]);

  const zero=calc({extraAmount:0});
  push('zero extra', zero.ok && zero.comparison.applicable===false && zero.comparison.breakEvenReturnPct===null && zero.prepay.payoffPeriods===zero.baseline.payoffPeriods && zero.accounting.maxIdentityError===0);
  const lump=calc({});
  push('simple lump sum', lump.ok && lump.baseline.payoffPeriods===360 && lump.prepay.payoffPeriods===291 && close(lump.prepay.interestAvoided,100557.57254676925,0.01));
  const monthly=calc({extraMode:'recurring',extraAmount:300,extraFrequency:'monthly',extraStartPeriod:1});
  push('recurring monthly', monthly.ok && monthly.invest.investmentCashFlows.length===360 && monthly.accounting.maxIdentityError<0.01);
  const every=calc({extraMode:'recurring',extraAmount:100,extraFrequency:'everyScheduled',extraStartPeriod:1});
  push('every scheduled', every.ok && every.invest.investmentCashFlows.length===360 && every.accounting.maxIdentityError<0.01);
  const quarterly=calc({extraMode:'recurring',extraAmount:1000,extraFrequency:'quarterly',extraStartPeriod:1});
  push('quarterly', quarterly.ok && quarterly.invest.investmentCashFlows.length===120);
  const annual=calc({extraMode:'recurring',extraAmount:2000,extraFrequency:'annual',extraStartPeriod:1});
  push('annual', annual.ok && annual.invest.investmentCashFlows.length===30);
  const custom=calc({extraMode:'recurring',extraAmount:1000,extraFrequency:'custom',customIntervalMonths:5,extraStartPeriod:1});
  push('custom interval', custom.ok && custom.invest.investmentCashFlows.length===72);
  const fee0=calc({prepaymentCharge:0}), fee=calc({prepaymentCharge:500});
  push('prepayment fee', fee.ok && fee.prepay.feeFutureValue>500 && close(fee0.prepay.endingNetValue-fee.prepay.endingNetValue,fee.prepay.feeFutureValue,0.02));
  const immediate=calc({balance:10000,remainingYears:5,extraAmount:50000});
  push('immediate payoff', immediate.ok && immediate.prepay.payoffPeriods===1 && immediate.prepay.investmentCashFlows.some(x=>x.amount>40000));
  const finalRow=lump.accounting.rows.find(x=>x.period===lump.prepay.payoffPeriods);
  push('final partial scheduled payment', finalRow && finalRow.prepayInvestmentContribution>0 && Math.abs(finalRow.identityDifference)<0.01);
  const low=calc({assumedInvestmentReturnPct:2}), high=calc({assumedInvestmentReturnPct:20}), negative=calc({assumedInvestmentReturnPct:-20});
  push('low return', low.ok && low.comparison.higherModeledPath==='prepay');
  push('high return', high.ok && high.comparison.higherModeledPath==='invest');
  push('negative return', negative.ok && Number.isFinite(negative.comparison.pathDifference) && negative.comparison.higherModeledPath==='prepay');
  const be=lump.comparison.breakEvenReturnPct; const atBe=calc({assumedInvestmentReturnPct:be});
  push('break-even solve', be>0 && Math.abs(atBe.comparison.pathDifference)<0.05);
  const zeroRate=calc({annualRatePct:0});
  push('zero mortgage rate', zeroRate.ok && close(zeroRate.prepay.interestAvoided,0,0.01) && close(zeroRate.comparison.breakEvenReturnPct,0,0.001));
  const ca=calc({country:'CA',currency:'CAD'}); const caConvention=MortgageApi.paymentConvention('CA','fixed'); const caPeriodic=MortgageApi.periodicRate(6,'monthly',caConvention); const caExpected=MortgageApi.scheduledPayment(300000,caPeriodic,360);
  push('Canada fixed convention', ca.ok && caConvention==='canada-fixed' && close(ca.baseline.payment,caExpected,0.0001));
  for (const freq of ['monthly','biweekly','weekly']) { const r=calc({paymentFrequency:freq}); const m=MortgageApi.periodsPerYear(freq); const conv=MortgageApi.paymentConvention('US','fixed'); const expected=MortgageApi.scheduledPayment(300000,MortgageApi.periodicRate(6,freq,conv),30*m); push(freq+' cadence parity', r.ok && close(r.baseline.payment,expected,0.0001) && r.baseline.payoffPeriods===30*m); }
  const entered=calc({useCurrentPayment:true,currentPayment:2000});
  push('user current repayment', entered.ok && entered.baseline.payment===2000);
  const negAm=calc({useCurrentPayment:true,currentPayment:100});
  push('negative amortization', !negAm.ok && negAm.error==='negative-amortization');
  const noCross=calc({lumpSumPeriod:360,prepaymentCharge:100});
  push('no break-even', noCross.ok && noCross.comparison.breakEvenReturnPct===null && noCross.comparison.breakEvenStatus==='no-crossing');
  const hugeFee=calc({prepaymentCharge:200000});
  push('fee larger than interest avoided', hugeFee.ok && hugeFee.input.prepaymentCharge>hugeFee.prepay.interestAvoided && Number.isFinite(hugeFee.comparison.pathDifference));
  push('equal cash identity', [lump,monthly,every,quarterly,annual,custom,immediate].every(r=>r.accounting.rows.every(row=>Math.abs(row.identityDifference)<0.01)));

  const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
  mdcFixtureOk=failed.length===0;
  mdcFixtureDetail=failed.length ? 'failed: '+failed.join(', ') : `${checks.length} deterministic fixtures passed`;
} catch (error) {
  mdcFixtureDetail=error?.stack || String(error);
}
add('MDC1A: independent deterministic core fixture set passes equal-cash-flow and edge-case contract', mdcFixtureOk, mdcFixtureDetail);

console.log('\nCarrowmont source contract check\n');
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length} PASS / ${failed.length} FAIL\n`);
process.exit(failed.length ? 1 : 0);
