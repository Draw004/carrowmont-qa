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
const readQa = rel => {
  const p = new URL(`../${rel}`, import.meta.url);
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

const automatedQaWorkflow = readQa('.github/workflows/carrowmont-qa.yml');
const batchPublisherWorkflow = read('draw004.github.io/.github/workflows/carrowmont-batch-pr-publisher.yml');
add('central QA workflow: live core-route preflight blocks expensive browser cascades after deployment 404s',
  automatedQaWorkflow.includes('Live route preflight') &&
  automatedQaWorkflow.includes('/compound-interest-calculator/') &&
  automatedQaWorkflow.includes('/loan-calculator/') &&
  automatedQaWorkflow.includes('Browser QA will not start') &&
  automatedQaWorkflow.includes('needs: preflight')
);
add('central QA workflow: Chrome, Edge and mobile projects are sharded into parallel matrix jobs with independent artifacts',
  automatedQaWorkflow.includes('fail-fast: false') &&
  automatedQaWorkflow.includes('project: chrome-desktop') &&
  automatedQaWorkflow.includes('project: edge-desktop') &&
  automatedQaWorkflow.includes('project: mobile-chromium') &&
  automatedQaWorkflow.includes('npx playwright test --project="${{ matrix.project }}"') &&
  automatedQaWorkflow.includes('carrowmont-qa-results-${{ matrix.project }}') &&
  automatedQaWorkflow.includes('timeout-minutes: 25')
);
add('publisher: release manifests must provide non-empty release IDs, names, summaries, PR titles and commit messages before publication',
  batchPublisherWorkflow.includes('.release_id | type == "string"') &&
  batchPublisherWorkflow.includes('.release_name | type == "string"') &&
  batchPublisherWorkflow.includes('.summary | type == "string"') &&
  batchPublisherWorkflow.includes('.pr_title | type == "string"') &&
  batchPublisherWorkflow.includes('.commit_message | type == "string"') &&
  batchPublisherWorkflow.includes('Release manifest metadata contract verified.')
);

const tools = [
  ['financial-independence', 'index.html', 'app.js', 'Generate Financial Independence Report'],
  ['goal-planner', 'index.html', 'app.js', 'Generate Goal Report'],
  ['inflation-calculator', 'index.html', 'app.js', 'Generate Inflation Report'],
  ['retirement-calculator', 'planner.html', 'app.js', 'Generate Retirement Report'],
  ['sip-calculator', 'index.html', 'app.js', 'Generate SIP Report'],
  ['budget-cash-flow-planner', 'index.html', 'app.js', 'Generate Budget &amp; Cash Flow Report'],
  ['mortgage-payoff-calculator', 'index.html', 'app.js', 'Generate Mortgage Payoff Report'],
  ['compound-interest-calculator', 'index.html', 'app.js', 'Generate Compound Interest Report'],
  ['loan-calculator', 'index.html', 'app.js', 'Generate Loan / EMI Report']
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
  sipHtml.includes('<title>SIP Calculator &amp; Recurring Investment Calculator | Carrowmont</title>') &&
  sipHtml.includes('content="SIP Calculator &amp; Recurring Investment Calculator | Carrowmont"') &&
  sipHtml.includes('"name":"Carrowmont SIP Calculator & Recurring Investment Calculator"') &&
  sipHtml.includes('<strong>SIP means Systematic Investment Plan.</strong>') &&
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
add('retirement: GSEO2A assigns broad retirement-calculator intent to the landing page and detailed-planner intent to planner.html',
  gseoRetirementLandingHtml.includes('<title>Retirement Calculator &amp; Retirement Planner | Carrowmont</title>') &&
  gseoRetirementLandingHtml.includes('content="Retirement Calculator &amp; Retirement Planner | Carrowmont"') &&
  gseoRetirementLandingHtml.includes('"name":"Carrowmont Retirement Calculator & Retirement Planner"') &&
  gseoRetirementLandingHtml.includes('<strong>Retirement calculator:</strong>') &&
  gseoRetirementPlannerHtml.includes('<title>Detailed Retirement Planner | Carrowmont</title>') &&
  gseoRetirementPlannerHtml.includes('content="Detailed Retirement Planner | Carrowmont"') &&
  gseoRetirementPlannerHtml.includes('"name": "Carrowmont Detailed Retirement Planner"') &&
  gseoRetirementPlannerHtml.includes('<h1>Your retirement plan should reflect how your expenses actually change.</h1>')
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
const gseo1cQaConfig = fs.readFileSync(new URL('../qa.config.js', import.meta.url), 'utf8');
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
  gseo1cRetirementLanding.includes('<title>Retirement Calculator &amp; Retirement Planner | Carrowmont</title>')
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
  ['mortgage-payoff-calculator', 'index.html', 'mortgage-payoff-pdf-renderer.js'],
  ['compound-interest-calculator', 'index.html', 'compound-interest-pdf-renderer.js'],
  ['loan-calculator', 'index.html', 'loan-pdf-renderer.js']
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
add('reports: shared tool registry includes all nine active calculators',
  standards[0]?.includes("key:'investment'") &&
  standards[0]?.includes("key:'retirement'") &&
  standards[0]?.includes("key:'goal'") &&
  standards[0]?.includes("key:'fi'") &&
  standards[0]?.includes("key:'inflation'") &&
  standards[0]?.includes("key:'budget'") &&
  standards[0]?.includes("key:'compound'") &&
  standards[0]?.includes("key:'loan'") &&
  standards[0]?.includes('function loanIdentity(') &&
  standards[0]?.includes("url:'carrowmont.com/loan-calculator/'") &&
  standards[0]?.includes("title:'Compound Interest Calculator'") &&
  standards[0]?.includes("url:'carrowmont.com/compound-interest-calculator/'") &&
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
    '/goal-planner/','/financial-independence/','/mortgage-payoff-calculator/','/compound-interest-calculator/','/loan-calculator/','/4-percent-rule-stress-test.html',
    '/financial-independence-number-by-spending.html','/us-debt-interest-cost-calculator.html',
    '/gold-macro-stress-explorer.html','/silver-supply-demand-macro-stress-explorer.html',
    '/budget-cash-flow-planner/debt-payoff-calculator.html','/mortgage-payoff-calculator/rent-vs-buy-calculator.html',
    '/market-chain-reaction-explorer.html','/retirement-calculator/withdrawal-calculator.html'
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
    /"numberOfItems"\s*:\s*19/.test(toolsDirectory) &&
    (toolsDirectory.match(/class="directory-tool-card/g)||[]).length === 19
  );
  add('main site: CORE9 directory keeps nine core tools while focused secondary tools expand safely',
    toolsDirectory.includes('id="core-planning-tools"') &&
    toolsDirectory.includes('id="planning-stress-tests"') &&
    toolsDirectory.includes('id="macro-market-explorers"') &&
    (toolsDirectory.match(/data-directory-tool=/g)||[]).length === 9 &&
    currentToolPaths.every(toolPath => toolsDirectory.includes(`href="${toolPath}"`)) &&
    !/coming soon/i.test(toolsDirectory)
  );
  add('main site: homepage keeps nine complete real tool cards and a visually distinct fixed Explore All Tools gateway',
    mainHome.includes('data-homepage-core-grid') && mainHome.includes('data-core-tool-count="9"') &&
    (mainHome.match(/data-tool-id="(?:budget|investment|compound|loan|retirement|inflation|goals|independence|housing)"/g)||[]).length === 9 &&
    mainHome.includes('data-tools-gateway') && mainHome.includes('Explore All Tools') &&
    mainHome.includes('class="tool-icon explore-tools-icon"') && mainHome.includes('href="/tools.html"') &&
    mainCss.includes('.explore-all-card{') && mainCss.includes('linear-gradient(135deg') &&
    mainCss.includes('.planning-grid[data-core-tool-count="9"] .explore-all-card{grid-column:span 1}')
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
  add('central QA: CORE9 registers nine primary tools while keeping tools-directory outside the report registry',
    (qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).match(/key:\s*'/g)||[]).length === 9 &&
    qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).includes("key: 'mortgage-payoff-calculator'") &&
    qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).includes("key: 'compound-interest-calculator'") &&
    qaConfig.slice(0, qaConfig.indexOf('export const mainSitePages')).includes("key: 'loan-calculator'") &&
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
  learnExpansion.includes("['investment','assets','home','loans','macro','retirement','budget','goals','fi','inflation','foundation']") &&
  learnExpansion.includes("['retirement','assets','home','loans','macro','budget','goals','investment','fi','inflation','foundation']") &&
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
    (page.includes('learn-article.js?v=20260928-standard2') || ((mortgageLearnFiles.includes(file) || file === 'mortgage-prepayment-vs-investing.html') && page.includes('learn-article.js?v=20261011-mortgage1')) || (file === 'mortgage-refinance-break-even.html' && page.includes('learn-article.js?v=20261014-mdc1b1'))) &&
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
    : file === 'mortgage-rate-rise-payment-stress.html'
      ? standardLearnTitles[i] === 'How Much Could Your Mortgage Payment Rise if Rates Increase? | Carrowmont'
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
    const legacyDepth = page.includes('data-cm-rich="1"') && page.includes('data-cm-depth="1"');
    const editorialDepth = page.includes('Checklist:') && (page.match(/class="guide-table-wrap"/g)||[]).length >= 2 && page.includes('href="/editorial-policy.html"');
    return (legacyDepth || editorialDepth) &&
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
const sharedStateCopies = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator','compound-interest-calculator','loan-calculator'].map(dir => read(`${dir}/shared-plan-state.js`));
const sharedBridgeCopies = ['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator','compound-interest-calculator','loan-calculator'].map(dir => read(`${dir}/shared-plan-bridge.js`));
add('CORE9: shared-plan-state helper is byte-identical across all nine primary tools', sharedStateCopies.every(Boolean) && sharedStateCopies.every(x => x === sharedStateCopies[0]));
add('CORE9: shared-plan bridge is byte-identical across all nine primary tools', sharedBridgeCopies.every(Boolean) && sharedBridgeCopies.every(x => x === sharedBridgeCopies[0]));
add('CORE7 mortgage: existing tools use safe explicit housing handoff rules rather than silent double counting',
  mortgageBridge.includes('Use in Rent / mortgage') && mortgageBridge.includes('Apply to Home loan / rent') &&
  mortgageBridge.includes('Use balance as goal amount') && mortgageBridge.includes('will not add this automatically and risk double-counting') &&
  mortgageBridge.includes('will not automatically redirect that future payment into investing') &&
  mortgageBridge.includes('will not inflate the loan balance')
);
add('CORE7 mortgage: housing remains integrated after CORE9 expands the primary homepage suite',
  mainHome.includes('data-core-tool-count="9"') && mainHome.includes('data-tool-id="housing"') &&
  core7ToolsDirectory.includes('data-directory-tool="housing"') && core7ToolsDirectory.includes('href="/mortgage-payoff-calculator/"') &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-payoff-calculator/') &&
  core7Css.includes('.planning-grid[data-core-tool-count="9"] .explore-all-card{grid-column:span 1}')
);
add('CORE9: country-demand runtime keeps housing, compound and loan in all nine-item profiles and keeps currency outside order selection',
  ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11'].every(profile => {
    const m=mainSiteJs.match(new RegExp(`${profile}:\\s*Object\\.freeze\\(\\[([^\\]]+)\\]`));
    return m && m[1].includes('housing') && m[1].includes('compound') && m[1].includes('loan') && (m[1].match(/"/g)||[]).length===18;
  }) && mainSiteJs.includes('const regionCode = locale.getRegion()')
);
add('CORE7 mortgage: approved merged specification and dedicated QA protect the release',
  core7Spec.includes('Home Loan / Mortgage Prepayment & Early Payoff Calculator') &&
  core7Spec.includes('Part-prepayment cadence is user-selected') &&
  mortgageQa.includes('recurring part-prepayment is neutral by default') && mortgageQa.includes('Pay Cycle View do not change amortization') &&
  mortgageReadme.includes('Carrowmont')
);


const sharedLayoutQa = fs.readFileSync(new URL('../tests/02-layout.spec.js', import.meta.url), 'utf8');

// CORE8 Compound Interest Calculator - Snapshot 72 implementation - 2026-10-16.
const compoundSpec = read('draw004.github.io/docs/CARROWMONT_CORE8_COMPOUND_INTEREST_CALCULATOR_SPEC_FINAL.md');
const compoundHtml = read('compound-interest-calculator/index.html');
const compoundCore = read('compound-interest-calculator/core.js');
const compoundApp = read('compound-interest-calculator/app.js');
const compoundStyles = read('compound-interest-calculator/styles.css');
const compoundPdf = read('compound-interest-calculator/compound-interest-pdf-renderer.js');
const compoundQa = fs.readFileSync(new URL('../tests/29-core8-compound-interest.spec.js', import.meta.url), 'utf8');
const compoundContext = { window: {} };
vm.runInNewContext(compoundCore, compoundContext);
const compoundEngine = compoundContext.window.CarrowmontCompoundCore;
const compoundFixture = compoundEngine?.calculate({principal:100000,annualRate:12,years:1,compounding:'monthly',contributionEnabled:false,contribution:0,contributionFrequency:'monthly',contributionTiming:'end',inflationEnabled:false,inflation:0});
const compoundZero = compoundEngine?.calculate({principal:0,annualRate:0,years:1,compounding:'monthly',contributionEnabled:true,contribution:1000,contributionFrequency:'monthly',contributionTiming:'end',inflationEnabled:false,inflation:0});
const compoundEnd = compoundEngine?.calculate({principal:0,annualRate:12,years:1,compounding:'monthly',contributionEnabled:true,contribution:1000,contributionFrequency:'monthly',contributionTiming:'end',inflationEnabled:false,inflation:0});
const compoundDue = compoundEngine?.calculate({principal:0,annualRate:12,years:1,compounding:'monthly',contributionEnabled:true,contribution:1000,contributionFrequency:'monthly',contributionTiming:'beginning',inflationEnabled:false,inflation:0});

add('CORE8 compound: specification, canonical app identity and one-H1 indexable shell are present',
  compoundSpec.includes('Compound Interest Calculator') && compoundSpec.includes('Source Snapshot 71') &&
  compoundHtml.includes('<title>Compound Interest Calculator | Carrowmont</title>') &&
  compoundHtml.includes('<link rel="canonical" href="https://carrowmont.com/compound-interest-calculator/"') &&
  compoundHtml.includes('<meta name="robots" content="index,follow"') &&
  (compoundHtml.match(/<h1(?:\s|>)/g)||[]).length===1 &&
  compoundHtml.includes('data-carrowmont-tool="compound-interest-calculator"')
);
add('CORE8 compound: deterministic engine anchors nominal compounding, EAR, zero-rate contributions and annuity-due timing',
  compoundFixture?.ok && Math.abs(compoundFixture.endingValue - 112682.503013) < 0.01 &&
  Math.abs(compoundFixture.effectiveAnnualRate - 0.12682503013) < 1e-9 &&
  Math.abs(compoundFixture.simpleEndingValue - 112000) < 0.01 &&
  compoundZero?.ok && Math.abs(compoundZero.endingValue - 12000) < 0.01 &&
  compoundEnd?.ok && compoundDue?.ok && compoundDue.endingValue > compoundEnd.endingValue
);
add('CORE8 compound: optional contributions, inflation context, chart, annual table, CSV and no-runtime-API contract are implemented',
  compoundHtml.includes('id="contributionEnabled"') && compoundHtml.includes('id="inflationEnabled"') &&
  compoundHtml.includes('id="growthChart"') && compoundHtml.includes('id="annualTableBody"') &&
  compoundApp.includes('carrowmont-compound-interest-growth.csv') && compoundApp.includes('effectiveAnnualRate') &&
  !/fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|sendBeacon\s*\(/.test(compoundCore + compoundApp + compoundPdf)
);
add('CORE8 compound: shared header uses the SIP-aligned desktop/mobile geometry and is protected by central layout QA',
  compoundStyles.includes('Carrowmont shared tool-header alignment polish - Snapshot 77') &&
  compoundStyles.includes('.site-header .container{width:min(1480px,calc(100% - 64px));margin:auto}') &&
  compoundStyles.includes('.site-header #localeSummary{box-sizing:border-box;height:44px;min-height:44px;max-height:44px}') &&
  compoundStyles.includes('.site-header .locale-menu summary{appearance:none;-webkit-appearance:none;list-style:none;border:1px solid #c8dae4;border-radius:999px') &&
  sharedLayoutQa.includes("const compound = await metric('/compound-interest-calculator/');") &&
  sharedLayoutQa.includes("Compound:'/compound-interest-calculator/'") &&
  sharedLayoutQa.includes("page.locator('.site-header > .container.header-inner').evaluate") &&
  sharedLayoutQa.includes("document.querySelector('.site-header > .container.header-inner')") &&
  !sharedLayoutQa.includes("page.locator('.site-header .container').evaluate")
);
add('CORE8 compound: shared footer, currency-label and narrow-screen contracts match the established suite',
  sharedFooterToolHrefs.every(href => footerToolsBlock(compoundHtml).includes(`href="${href}"`)) &&
  compoundHtml.includes('href="/compound-interest-calculator/"') &&
  compoundApp.includes('${code} · ${cfg.label}') &&
  compoundStyles.includes('.visual-grid>*,.explain-grid>*') && compoundStyles.includes('{min-width:0}') &&
  compoundStyles.includes('.table-scroll{width:100%;max-width:100%;min-width:0;')
);
add('CORE8 compound: report uses standardized guide and Continue Planning pages with compound as current tool',
  compoundPdf.includes('.guidePage(') && compoundPdf.includes(".continuePlanningPage({currentTool:'compound'") &&
  compoundPdf.includes('Compound Interest Planning Report') && compoundHtml.indexOf('report-standard.js') < compoundHtml.indexOf('compound-interest-pdf-renderer.js')
);
add('CORE8 compound: homepage, tools directory, sitemap and Learn cluster integrate the canonical calculator',
  mainHome.includes('data-tool-id="compound"') && mainHome.includes('href="/compound-interest-calculator/"') &&
  core7ToolsDirectory.includes('data-directory-tool="compound"') && core7ToolsDirectory.includes('href="/compound-interest-calculator/"') &&
  /"numberOfItems"\s*:\s*19/.test(core7ToolsDirectory) && core7Sitemap.includes('https://carrowmont.com/compound-interest-calculator/') &&
  read('draw004.github.io/compounding-and-time.html').includes('href="/compound-interest-calculator/"') &&
  read('draw004.github.io/compound-interest-monthly-contributions.html').includes('href="/compound-interest-calculator/"')
);
add('CORE8 compound: central QA protects formulas, responsive layout, locale behavior, SEO and report integration',
  compoundQa.includes('monthly compounding fixture') && compoundQa.includes('[1440, 390, 360]') &&
  compoundQa.includes('beginning contributions') && compoundQa.includes('inflation-adjusted') &&
  compoundQa.includes('canonical') && compoundQa.includes('tools directory')
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

const sitemapUrlBlocks = [...learnSitemap.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)];
const sitemapEntries = sitemapUrlBlocks.map(match => {
  const block = match[1];
  const loc = (block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i) || [])[1];
  const lastmod = (block.match(/<lastmod>\s*(\d{4}-\d{2}-\d{2})\s*<\/lastmod>/i) || [])[1];
  return loc && lastmod ? [loc.trim(), lastmod] : null;
}).filter(Boolean);
const sitemapLastmods = new Map(sitemapEntries);
add('main site: sitemap parsing covers every URL even when optional changefreq/priority fields are present',
  sitemapUrlBlocks.length > 0 &&
  sitemapEntries.length === sitemapUrlBlocks.length &&
  sitemapLastmods.size === sitemapUrlBlocks.length &&
  [
    'https://carrowmont.com/mortgage-payoff-calculator/',
    'https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html',
    'https://carrowmont.com/mortgage-payoff-calculator/rate-rise-stress-test.html',
    'https://carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html',
    'https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html',
    'https://carrowmont.com/budget-cash-flow-planner/debt-payoff-calculator.html',
    'https://carrowmont.com/mortgage-payoff-calculator/rent-vs-buy-calculator.html'
  ].every(url => sitemapLastmods.has(url))
);
add('main site: IndexNow parser reads sitemap URL blocks instead of requiring lastmod to be the final child',
  indexNowScript.includes('const urlBlocks = [...xml.matchAll(/<url\\b[^>]*>([\\s\\S]*?)<\\/url>/gi)]') &&
  indexNowScript.includes('entries.length !== urlBlocks.length') &&
  indexNowScript.includes('Every sitemap <url> entry must include both <loc> and <lastmod>.')
);
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
  (sitemapLastmods.get('https://carrowmont.com/financial-independence/') || '') >= '2026-10-13' &&
  (sitemapLastmods.get('https://carrowmont.com/retirement-calculator/planner.html') || '') >= '2026-10-13' &&
  (sitemapLastmods.get('https://carrowmont.com/budget-cash-flow-planner/') || '') >= '2026-10-13' &&
  (sitemapLastmods.get('https://carrowmont.com/inflation-calculator/') || '') >= '2026-10-13'
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
  ].every(url => (gseo1cSitemapLastmods.get(url) || '') >= '2026-10-13')
);

// BING-SEO2 internal authority and search-presentation contract - 2026-10-08.
add('main site: BING-SEO2 Learn titles and descriptions stay concise for search presentation',
  standardizedLearnPages.length >= 52 &&
  standardizedLearnFiles.every((file,i) => file === 'mortgage-prepayment-vs-investing.html'
    ? standardLearnTitles[i] === 'Mortgage Prepayment vs Investing: How to Compare the Trade-Off | Carrowmont'
    : file === 'mortgage-rate-rise-payment-stress.html'
      ? standardLearnTitles[i] === 'How Much Could Your Mortgage Payment Rise if Rates Increase? | Carrowmont'
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
  fiJs.includes("if(handoff==='fi_spending_v2')") && fiJs.includes("else if(handoff==='fi_spending_v1')") &&
  fiJs.includes("els.spendingPct.value='100'") && fiJs.includes("els.monthlyIncome.value='0'") &&
  fiJs.includes('applySeo3bHandoff()') &&
  !fiCore.includes('fi_spending_v1') && !fiCore.includes('fi_spending_v2')
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
add('main site: SEO3C Treasury reference is dated, validated, monotonic-ready and bound to the approved official source',
  !!usDebtReference && usDebtReference.schemaVersion === 1 && usDebtReference.dataset === 'Debt to the Penny' &&
  /^\d{4}-\d{2}-\d{2}$/.test(usDebtReference.asOfDate || '') && usDebtReference.asOfDate >= '2026-10-08' &&
  Number.isFinite(usDebtReference.debtHeldByPublic) && usDebtReference.debtHeldByPublic > 0 &&
  Number.isFinite(usDebtReference.totalPublicDebtOutstanding) && usDebtReference.totalPublicDebtOutstanding >= usDebtReference.debtHeldByPublic &&
  /U\.S\. Treasury FiscalData/.test(usDebtReference.sourceName || '') && /Debt to the Penny/.test(usDebtReference.sourceName || '') &&
  /fiscaldata\.treasury\.gov\/datasets\/debt-to-the-penny\/?/.test(usDebtReference.sourceUrl || '') &&
  /api\.fiscaldata\.treasury\.gov\/services\/api\/fiscal_service\/v2\/accounting\/od\/debt_to_penny/.test(usDebtReference.apiUrl || '') &&
  !Number.isNaN(Date.parse(usDebtReference.retrievedAt || '')) && (usDebtReference.retrievedAt || '').slice(0, 10) >= usDebtReference.asOfDate
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
  sitemapLastmods.get('https://carrowmont.com/us-debt-interest-cost-calculator.html') >= '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/learn.html') >= '2026-10-11' &&
  sitemapLastmods.get('https://carrowmont.com/stocks-vs-bonds.html') >= '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-and-inflation.html') >= '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/inflation-and-retirement-planning.html') >= '2026-10-10'
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
  sitemapLastmods.get('https://carrowmont.com/gold-macro-stress-explorer.html') >= '2026-10-12' &&
  sitemapLastmods.get('https://carrowmont.com/gold-as-an-investment.html') >= '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-and-inflation.html') >= '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/gold-vs-stocks.html') >= '2026-10-10' &&
  sitemapLastmods.get('https://carrowmont.com/physical-gold-vs-gold-etf.html') >= '2026-10-10'
);
add('main site: SEO3D modified gold articles keep structured-data and article modified dates aligned',
  [
    [goldAsInvestment, 'https://carrowmont.com/gold-as-an-investment.html'],
    [goldInflation, 'https://carrowmont.com/gold-and-inflation.html'],
    [goldVsStocks, 'https://carrowmont.com/gold-vs-stocks.html'],
    [physicalGoldEtf, 'https://carrowmont.com/physical-gold-vs-gold-etf.html']
  ].every(([html, url]) => {
    const modified = sitemapLastmods.get(url);
    return !!modified && html.includes(`\"dateModified\":\"${modified}\"`) && html.includes(`content=\"${modified}\" property=\"article:modified_time\"`);
  })
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
  sitemapLastmods.get('https://carrowmont.com/silver-vs-gold.html')==='2026-10-10' && sitemapLastmods.get('https://carrowmont.com/silver-supply-demand-macro-stress-explorer.html')>='2026-10-10'
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
  initialLearnLocaleAffected.every(file => { const d=sitemapLastmods.get('https://carrowmont.com/' + file); return file === 'learn.html' ? d >= '2026-10-11' : file === 'rent-vs-buy-home.html' ? d >= '2026-10-11' : ['zero-based-budgeting.html','asset-allocation-explained.html','diversification-across-asset-classes.html','emergency-fund-how-much.html','how-much-should-i-invest-each-month.html'].includes(file) ? d >= '2026-10-13' : d >= '2026-10-10'; }) &&
  !/\/in\/|\/us\/|\?country=/.test(learnLocaleSitemap)
);
add('main site: LEARN-LOCALE1 cache-busts the shared localization/CSS assets and keeps long related-guide links mobile-safe',
  learnLocalePages.every(file => /learn-localization\.js\?v=(?:20261010-global1|20261014-mortgage-learn2|20261014-housing3|20261020-learn3b1)/.test(read('draw004.github.io/'+file))) &&
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
  mortgageLearnFiles.every(file => read('draw004.github.io/'+file).includes('mortgage-learn.js?v=20261014-mortgage-learn2'))
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
  sitemapLastmods.get('https://carrowmont.com/learn.html')>='2026-10-11' && sitemapLastmods.get('https://carrowmont.com/rent-vs-buy-home.html')>='2026-10-11'
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

add('MDC family after MDC1C: Decision Centre publishes exactly four live choices and no planned placeholder',
  mdcHubHtml.includes('<h1>What are you trying to decide?</h1>') &&
  (mdcHubHtml.match(/<span class="decision-status">Live<\/span>/g)||[]).length === 4 &&
  (mdcHubHtml.match(/<article class="decision-card planned">/g)||[]).length === 0 &&
  mdcHubHtml.includes('href="refinance-break-even.html"') &&
  mdcHubHtml.includes('href="rate-rise-stress-test.html"') &&
  mdcHubHtml.includes('href="/mortgage-rate-rise-payment-stress.html"')
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
  sitemapLastmods.get('https://carrowmont.com/mortgage-prepayment-vs-investing.html') >= '2026-10-12' &&
  sitemapLastmods.get('https://carrowmont.com/learn.html') >= '2026-10-12'
);
add('MDC1A: core homepage architecture keeps MDC1A outside the approved primary suite and companion tools are not promoted as new core cards',
  mainHome.includes('data-core-tool-count="9"') &&
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

// MDC1B Mortgage Decision Centre - Refinance / Balance Transfer Break-Even - Snapshot 59 production contract.
const mdc1bToolHtml = read('mortgage-payoff-calculator/refinance-break-even.html');
const mdc1bCore = read('mortgage-payoff-calculator/refinance-break-even-core.js');
const mdc1bUi = read('mortgage-payoff-calculator/refinance-break-even.js');
const mdc1bPdf = read('mortgage-payoff-calculator/refinance-break-even-pdf-renderer.js');
const mdc1bLearn = read('draw004.github.io/mortgage-refinance-break-even.html');
const mdc1bImpl = read('draw004.github.io/docs/CARROWMONT_MDC1B_REFINANCE_BREAK_EVEN_IMPLEMENTATION.md');
const mdc1bSpec = read('draw004.github.io/docs/CARROWMONT_MDC1B_REFINANCE_BREAK_EVEN_SPEC_FINAL.md');
const mdc1bQa = fs.readFileSync(new URL('../tests/21-mdc1b-refinance-break-even.spec.js', import.meta.url), 'utf8');

add('MDC1B: canonical route, search identity and three-payment rate/term separation are present',
  mdc1bToolHtml.includes('<title>Mortgage Refinance Break-Even Calculator | Carrowmont</title>') &&
  mdc1bToolHtml.includes('https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html') &&
  mdc1bToolHtml.includes('id="currentPaymentResult"') && mdc1bToolHtml.includes('id="rateOnlyPaymentResult"') && mdc1bToolHtml.includes('id="proposedPaymentResult"') &&
  mdc1bToolHtml.includes('Separate the rate effect from the term effect.') &&
  mdc1bCore.includes('rateOnlySameTerm') && mdc1bCore.includes('principal: normalized.balance') &&
  mdc1bCore.includes('const proposedPrincipal = normalized.balance + financedFees')
);
add('MDC1B: fee, cashback, holding-period and durable-break-even rules are explicit and deterministic',
  mdc1bCore.includes('const netSwitchingCost = normalized.switchingFees + normalized.exitCharge - normalized.cashback') &&
  mdc1bCore.includes('function durableBreakEven(') && mdc1bCore.includes('suffixMin') &&
  mdc1bCore.includes('holdingPeriodAdvantage') && mdc1bCore.includes('temporaryCrossingPeriod') &&
  mdc1bCore.includes('lowerPaymentHigherLifetimeCost') &&
  !/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/.test(mdc1bCore + mdc1bUi)
);
add('MDC1B: existing mortgage engine is reused and current-payment profile overrides cannot drive the refinance comparison',
  mdc1bCore.includes('const M = window.CarrowmontMortgageCore') && mdc1bCore.includes('M.simulate(') && mdc1bCore.includes('M.paymentConvention(') &&
  mdc1bUi.includes('Saved current-payment overrides are not used by this refinance model.') &&
  mdc1bUi.includes('override was intentionally ignored') && mdc1bUi.includes('useCurrentPayment: false, currentPayment: null') &&
  !mdc1bCore.includes('function scheduledPayment(')
);
add('MDC1B: report is an exact three-page decision report from the shared result object and no CSV is added',
  mdc1bPdf.includes('const canvases=[summaryPage(model),comparisonPage(model),guidePage(model)]') &&
  mdc1bPdf.includes("filename:'carrowmont-refinance-break-even-decision-report.pdf'") &&
  mdc1bToolHtml.includes('Generate Refinance Decision Report') && mdc1bToolHtml.includes('Copy Summary') &&
  !mdc1bToolHtml.includes('Download CSV')
);
add('MDC1B: Learn guide and Decision Centre create a bidirectional refinance path with a shared bottom CTA mapping',
  mdc1bLearn.includes('When Does Mortgage Refinancing Break Even? | Carrowmont') &&
  mdc1bLearn.includes('"@type":"Article"') && mdc1bLearn.includes('"@type":"BreadcrumbList"') &&
  mdc1bLearn.includes('href="/mortgage-payoff-calculator/refinance-break-even.html"') &&
  mdc1bToolHtml.includes('href="/mortgage-refinance-break-even.html"') &&
  mortgageLearnHub.includes('href="/mortgage-refinance-break-even.html"') &&
  mortgageLearnArticleJs.includes("'/mortgage-payoff-calculator/refinance-break-even.html': 'Mortgage Refinance Break-Even Calculator'")
);
const mdc1bSitemapLastmods = new Map([...core7Sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => {
  const loc = match[1].match(/<loc>([^<]+)<\/loc>/);
  const lastmod = match[1].match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
  return loc && lastmod ? [loc[1], lastmod[1]] : null;
}).filter(Boolean));
add('MDC1B: sitemap/discovery publish both new routes and refresh the changed hubs',
  core7Sitemap.includes('https://carrowmont.com/mortgage-refinance-break-even.html') &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html') &&
  mdc1bSitemapLastmods.get('https://carrowmont.com/mortgage-refinance-break-even.html') === '2026-10-14' &&
  mdc1bSitemapLastmods.get('https://carrowmont.com/mortgage-payoff-calculator/refinance-break-even.html') === '2026-10-14' &&
  mdc1bSitemapLastmods.get('https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html') === '2026-10-14' &&
  mdc1bSitemapLastmods.get('https://carrowmont.com/learn.html') >= '2026-10-14' &&
  mdc1bSitemapLastmods.get('https://carrowmont.com/mortgage-prepayment-vs-investing.html') === '2026-10-14' &&
  mdc1bSitemapLastmods.get('https://carrowmont.com/one-extra-mortgage-payment-a-year.html') === '2026-10-14'
);
add('MDC1B: core homepage keeps MDC1B outside the approved primary suite while MDC1C becomes a separate live Decision Centre route',
  mainHome.includes('data-core-tool-count="9"') &&
  !mainHome.includes('data-tool-id="mortgage-refinance-break-even"') &&
  !mainHome.includes('data-tool-id="mortgage-rate-rise-stress"') &&
  mdcHubHtml.includes('Rate Rise / Payment Stress') && mdcHubHtml.includes('href="rate-rise-stress-test.html"')
);
add('MDC1B: implementation record locks Snapshot 59, three-PR scope and no-workflow discipline',
  mdc1bImpl.includes('Source Snapshot 59') &&
  mdc1bImpl.includes('e2db46fd12843e68238515ff2b92d032f2398dce') &&
  mdc1bImpl.includes('84b149c7fc730ac0daa0b7fe0c38cfadf12b6345') &&
  mdc1bImpl.includes('d8f6e1189537cec5120e88d621803396e359e889') &&
  mdc1bImpl.includes('Expected generated release PR count: **3**') &&
  mdc1bImpl.includes('No workflow file is changed') && mdc1bImpl.includes('Workflows: Read and write` is **not required**') &&
  mdc1bSpec.includes('durable') && mdc1bSpec.includes('same remaining term')
);
add('central QA: MDC1B protects profile confirmation, PDF, Tool/Learn, localization and 1280/390/360 overflow',
  mdc1bQa.includes('explicit confirmation') && mdc1bQa.includes('exact three-page PDF') &&
  mdc1bQa.includes('bidirectional') && mdc1bQa.includes("['IN','INR'") && mdc1bQa.includes("['GB','GBP'") &&
  mdc1bQa.includes('[1280,390,360]')
);

let mdc1bFixtureOk = false;
let mdc1bFixtureDetail = '';
try {
  const sandbox = { window:{}, console, Date, Math, Intl, Number, String, Map, Set, Array, Object, JSON, RegExp };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(mortgageCore, sandbox, { filename:'mortgage-core.js' });
  vm.runInContext(mdc1bCore, sandbox, { filename:'refinance-break-even-core.js' });
  const C = sandbox.window.CarrowmontMdc1bCore;
  const base = { country:'US', currency:'USD', balance:300000, currentRatePct:6.5, remainingYears:20, remainingMonths:0, paymentFrequency:'monthly', newRatePct:5.5, proposedYears:20, proposedMonths:0, switchingFees:5000, exitCharge:0, cashback:0, feePaymentMode:'upfront', useHoldingPeriod:true, holdingYears:5, holdingMonths:0, startDate:'2026-10-14' };
  const calc = over => C.calculate({ ...base, ...over });
  const close = (a,b,t=1e-6) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= t;
  const checks = [];
  const push = (name,ok) => checks.push([name,Boolean(ok)]);

  const standard=calc({});
  const noFee=calc({switchingFees:0});
  const financed=calc({feePaymentMode:'financed'});
  const cashback=calc({cashback:2000});
  const longer=calc({proposedYears:30});
  const shorter=calc({proposedYears:15});
  const noBreak=calc({newRatePct:6.4,switchingFees:15000});
  const temporary=calc({newRatePct:5.5,proposedYears:30,switchingFees:1000});
  const holdEarly=calc({holdingYears:1});
  const cashOver=calc({switchingFees:1000,cashback:5000});
  const zero=calc({currentRatePct:0,newRatePct:0,switchingFees:0});
  const canada=calc({country:'CA'});
  const biweekly=calc({paymentFrequency:'biweekly'});
  const weekly=calc({paymentFrequency:'weekly'});

  push('standard upfront exact break-even month', standard.ok && standard.comparison.durableBreakEvenPeriod===21 && standard.comparison.durableBreakEvenMonths===21 && standard.comparison.lifetimeAdvantage>0);
  push('same-term rate isolation', standard.ok && close(standard.rateOnlySameTerm.principal,base.balance) && standard.rateOnlySameTerm.termPeriods===standard.currentLoan.termPeriods && close(standard.rateOnlySameTerm.payment,standard.proposedLoan.payment,0.01));
  push('no-fee immediate', noFee.ok && noFee.comparison.durableBreakEvenPeriod===0 && noFee.costs.netSwitchingCost===0);
  push('financed fee principal plus interest', financed.ok && financed.proposedLoan.financedFees===5000 && financed.proposedLoan.principal===305000 && financed.comparison.durableBreakEvenPeriod>standard.comparison.durableBreakEvenPeriod && financed.proposedLoan.totalInterest>standard.proposedLoan.totalInterest);
  push('cashback earlier break-even', cashback.ok && cashback.costs.netSwitchingCost===3000 && cashback.comparison.durableBreakEvenPeriod<standard.comparison.durableBreakEvenPeriod);
  push('longer term warning and durable protection', longer.ok && longer.comparison.termChangePeriods>0 && longer.comparison.lowerPaymentHigherLifetimeCost && longer.comparison.durableBreakEvenPeriod===null && longer.comparison.temporaryCrossingPeriod!=null && longer.comparison.lifetimeAdvantage<0);
  push('shorter term higher payment lower lifetime cost', shorter.ok && shorter.comparison.termChangePeriods<0 && shorter.comparison.paymentChange>0 && shorter.comparison.lifetimeAdvantage>0);
  push('no break-even', noBreak.ok && noBreak.comparison.durableBreakEvenPeriod===null && noBreak.comparison.temporaryCrossingPeriod===null && noBreak.comparison.lifetimeAdvantage<0);
  push('temporary crossing not promoted', temporary.ok && temporary.comparison.temporaryCrossingPeriod!=null && temporary.comparison.durableBreakEvenPeriod===null);
  push('holding before/after', holdEarly.ok && holdEarly.comparison.holdingPeriodAdvantage<0 && standard.comparison.holdingPeriodAdvantage>0 && holdEarly.comparison.holdingPeriodPeriods===12);
  push('cashback exceeds costs', cashOver.ok && cashOver.costs.netSwitchingCost<0 && cashOver.comparison.durableBreakEvenPeriod===0);
  push('zero-rate deterministic', zero.ok && close(zero.currentLoan.payment,1250,0.01) && zero.comparison.durableBreakEvenPeriod===0 && close(zero.comparison.lifetimeAdvantage,0,0.01));
  push('Canada fixed convention remains distinct', canada.ok && canada.currentLoan.payment!==standard.currentLoan.payment && canada.currentLoan.payment>0);
  push('repayment frequency month conversion', biweekly.ok && weekly.ok && biweekly.comparison.durableBreakEvenPeriod===44 && biweekly.comparison.durableBreakEvenMonths===21 && weekly.comparison.durableBreakEvenPeriod===88 && weekly.comparison.durableBreakEvenMonths===21);
  push('economic equivalence invariant', [standard,noFee,financed,cashback,longer,shorter,noBreak,temporary,holdEarly,cashOver,zero,canada,biweekly,weekly].every(r=>r.ok && r.comparison.equivalenceMaxError<0.01));

  const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
  mdc1bFixtureOk=failed.length===0;
  mdc1bFixtureDetail=failed.length ? 'failed: '+failed.join(', ') : `${checks.length} deterministic fixtures passed`;
} catch (error) {
  mdc1bFixtureDetail=error?.stack || String(error);
}
add('MDC1B: independent deterministic refinance fixtures pass rate-isolation, durable-break-even and equivalence contracts', mdc1bFixtureOk, mdc1bFixtureDetail);


// MDC1C Mortgage Rate Rise & Payment Stress Test - Snapshot 61 production contract.
const mdc1cToolHtml = read('mortgage-payoff-calculator/rate-rise-stress-test.html');
const mdc1cCore = read('mortgage-payoff-calculator/rate-rise-stress-test-core.js');
const mdc1cUi = read('mortgage-payoff-calculator/rate-rise-stress-test.js');
const mdc1cPdf = read('mortgage-payoff-calculator/rate-rise-stress-test-pdf-renderer.js');
const mdc1cLearn = read('draw004.github.io/mortgage-rate-rise-payment-stress.html');
const mdc1cImpl = read('draw004.github.io/docs/CARROWMONT_MDC1C_RATE_RISE_PAYMENT_STRESS_IMPLEMENTATION.md');
const mdc1cSpec = read('draw004.github.io/docs/CARROWMONT_MDC1C_RATE_RISE_PAYMENT_STRESS_SPEC_FINAL.md');
const mdc1cQa = fs.readFileSync(new URL('../tests/22-mdc1c-rate-rise-payment-stress.spec.js', import.meta.url), 'utf8');

add('MDC1C: canonical search identity, four-live Decision Centre and visible rate-vs-today separation are present',
  mdc1cToolHtml.includes('<title>Mortgage Rate Rise Calculator &amp; Payment Stress Test | Carrowmont</title>') &&
  mdc1cToolHtml.includes('https://carrowmont.com/mortgage-payoff-calculator/rate-rise-stress-test.html') &&
  mdc1cToolHtml.includes('id="rateOnlyChangeResult"') && mdc1cToolHtml.includes('id="todayChangeResult"') &&
  (mdcHubHtml.match(/<span class="decision-status">Live<\/span>/g)||[]).length === 4 &&
  (mdcHubHtml.match(/decision-card planned/g)||[]).length === 0 &&
  mdcHubHtml.includes('href="rate-rise-stress-test.html"')
);
add('MDC1C: existing mortgage engine drives projection, same-rate reference and stress scenarios without a duplicated payment formula',
  mdc1cCore.includes('const M = window.CarrowmontMortgageCore') && mdc1cCore.includes('M.simulate({') &&
  mdc1cCore.includes('sameRateReferencePayment') && mdc1cCore.includes('remainingPeriods') &&
  mdc1cCore.includes('const payment = M.scheduledPayment(') && !mdc1cCore.includes('function scheduledPayment(') &&
  !/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/.test(mdc1cCore + mdc1cUi)
);
add('MDC1C: standard percentage-point ladder, monthly-equivalent normalization and optional non-normative budget crossover are explicit',
  mdc1cCore.includes('Object.freeze([0.25, 0.50, 1.00, 2.00, 3.00])') &&
  mdc1cCore.includes('function monthlyEquivalent(') && mdc1cCore.includes('function solveZeroBufferRate(') &&
  mdc1cCore.includes('MAX_RATE = 50') && mdc1cToolHtml.includes('Modeled zero-buffer rate') &&
  mdc1cToolHtml.includes('not a recommended maximum or lender affordability result') &&
  !/safe rate|maximum affordable rate/i.test(mdc1cUi)
);
add('MDC1C: shared profile remains explicit-use and household/stress assumptions are not persisted',
  mdc1cToolHtml.includes('Use these loan details') && mdc1cToolHtml.includes('Start fresh') &&
  mdc1cUi.includes('Future rate, reset timing, income, expenses and results were not saved.') &&
  mdc1cUi.includes('Stress rate, timing and household budget were not taken from the profile.') &&
  !/monthlyTakeHomeIncome|monthlyEssentialOutgoings|stressedAnnualRatePct|monthsUntilRateChange/.test(mdcProfile)
);
add('MDC1C: report is exact three pages from the deterministic result and no CSV export is introduced',
  mdc1cPdf.includes('const canvases=[summaryPage(model),scenarioPage(model),guidePage(model)]') &&
  mdc1cPdf.includes("filename:'carrowmont-mortgage-rate-rise-stress-report.pdf'") &&
  mdc1cToolHtml.includes('Generate Payment Stress Decision Report') && mdc1cToolHtml.includes('Copy Summary') &&
  !mdc1cToolHtml.includes('Download CSV')
);
add('MDC1C: Learn guide, Learn hub, sitemap and shared bottom CTA publish a bidirectional rate-stress path',
  mdc1cLearn.includes('How Much Could Your Mortgage Payment Rise if Rates Increase? | Carrowmont') &&
  mdc1cLearn.includes('"@type":"Article"') && mdc1cLearn.includes('"@type":"BreadcrumbList"') &&
  mdc1cLearn.includes('href="/mortgage-payoff-calculator/rate-rise-stress-test.html"') &&
  mdc1cToolHtml.includes('href="/mortgage-rate-rise-payment-stress.html"') &&
  mortgageLearnHub.includes('href="/mortgage-rate-rise-payment-stress.html"') &&
  mortgageLearnArticleJs.includes("'/mortgage-payoff-calculator/rate-rise-stress-test.html': 'Mortgage Rate Rise & Payment Stress Test'") &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-rate-rise-payment-stress.html') &&
  core7Sitemap.includes('https://carrowmont.com/mortgage-payoff-calculator/rate-rise-stress-test.html')
);
add('MDC1C: core homepage keeps MDC1C outside the approved primary suite and existing payoff/MDC1A/MDC1B production engines remain separate',
  mainHome.includes('data-core-tool-count="9"') &&
  !mainHome.includes('data-tool-id="mortgage-rate-rise-stress"') &&
  mdc1cCore !== mdcCore && mdc1cCore !== mdc1bCore &&
  mdc1cSpec.includes('MDC1C')
);
add('MDC1C: implementation record locks Snapshot 61, three-PR scope and no-workflow discipline',
  mdc1cImpl.includes('Source Snapshot 61') &&
  mdc1cImpl.includes('3a8eecc1dd50011a801abfab7c1e5e2c90167a8f') &&
  mdc1cImpl.includes('35c3ec813e9dc6d1791290ebdd88bafb5dea911d') &&
  mdc1cImpl.includes('c00ec350207292c2fe149c689c1aee1ae454fab7') &&
  mdc1cImpl.includes('Expected generated release PR count: **3**') &&
  mdc1cImpl.includes('No workflow file is changed') && mdc1cImpl.includes('Workflows: Read and write` is **not required**')
);
add('central QA: MDC1C protects explicit profile confirmation, exact three-page PDF, localization, Tool/Learn and 1280/390/360 overflow',
  mdc1cQa.includes('explicit confirmation') && mdc1cQa.includes('exact three-page PDF') &&
  mdc1cQa.includes("['IN','INR'") && mdc1cQa.includes("['GB','GBP'") &&
  mdc1cQa.includes('Tool and Learn guide are bidirectional') && mdc1cQa.includes('[1280,390,360]')
);

let mdc1cFixtureOk = false;
let mdc1cFixtureDetail = '';
try {
  const sandbox = { window:{}, console, Date, Math, Intl, Number, String, Map, Set, Array, Object, JSON, RegExp };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(mortgageCore, sandbox, { filename:'mortgage-core.js' });
  vm.runInContext(mdc1cCore, sandbox, { filename:'rate-rise-stress-test-core.js' });
  const C = sandbox.window.CarrowmontMdc1cCore;
  const close = (a,b,t=1e-6) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= t;
  const checks=[]; const push=(name,ok)=>checks.push([name,Boolean(ok)]);
  const base={country:'US',currency:'USD',balance:400000,annualRatePct:6,remainingYears:20,remainingMonths:0,paymentFrequency:'monthly',useCurrentPayment:false,currentPayment:null,monthsUntilRateChange:0,stressedAnnualRatePct:7,householdBudgetEnabled:false,monthlyTakeHomeIncome:null,monthlyEssentialOutgoings:null,startDate:'2026-10-14'};
  const calc=over=>C.calculate({...base,...over});
  const immediate=calc({}); const plus2=calc({stressedAnnualRatePct:8}); const future=calc({monthsUntilRateChange:24});
  const india=calc({country:'IN',currency:'INR',balance:5000000,annualRatePct:8.5,remainingYears:15,stressedAnnualRatePct:9.5});
  const canada=calc({country:'CA',currency:'CAD',balance:500000,annualRatePct:5,remainingYears:25,monthsUntilRateChange:36,stressedAnnualRatePct:6});
  const zero=calc({balance:100000,annualRatePct:0,remainingYears:10,stressedAnnualRatePct:1});
  const budget=calc({householdBudgetEnabled:true,monthlyTakeHomeIncome:6500,monthlyEssentialOutgoings:3500});
  const futureBudget=calc({monthsUntilRateChange:24,householdBudgetEnabled:true,monthlyTakeHomeIncome:6500,monthlyEssentialOutgoings:3500});
  const indiaBudget=calc({country:'IN',currency:'INR',balance:5000000,annualRatePct:8.5,remainingYears:15,stressedAnnualRatePct:9.5,householdBudgetEnabled:true,monthlyTakeHomeIncome:120000,monthlyEssentialOutgoings:65000});
  const canadaBudget=calc({country:'CA',currency:'CAD',balance:500000,annualRatePct:5,remainingYears:25,monthsUntilRateChange:36,stressedAnnualRatePct:6,householdBudgetEnabled:true,monthlyTakeHomeIncome:7000,monthlyEssentialOutgoings:3500});
  const override=calc({useCurrentPayment:true,currentPayment:3000,monthsUntilRateChange:24});
  const biweekly=calc({paymentFrequency:'biweekly'}); const weekly=calc({paymentFrequency:'weekly'});
  const down=calc({stressedAnnualRatePct:5}); const max=calc({stressedAnnualRatePct:50});
  const badReset=calc({monthsUntilRateChange:240}); const negAm=calc({useCurrentPayment:true,currentPayment:100});
  const noBudget=calc({householdBudgetEnabled:true,monthlyTakeHomeIncome:null,monthlyEssentialOutgoings:null});

  push('immediate current payment', immediate.ok && close(immediate.current.paymentToday,2865.724233912691,0.01));
  push('immediate +1 stressed payment', immediate.ok && close(immediate.customScenario.payment,3101.1957424754924,0.01) && close(immediate.customScenario.rateOnlyChange,235.47150856280132,0.01));
  push('+2 stressed payment', plus2.ok && close(plus2.customScenario.payment,3345.7602759738656,0.01) && close(plus2.customScenario.rateOnlyChange,480.0360420611746,0.01));
  push('future projected balance', future.ok && close(future.reset.projectedBalance,377982.9400320151,0.01));
  push('future +1 payment', future.ok && close(future.customScenario.payment,3082.459081048156,0.01) && close(future.customScenario.rateOnlyChange,216.7348471354726,0.01));
  push('India fixture', india.ok && close(india.current.paymentToday,49236.97789627968,0.01) && close(india.customScenario.payment,52211.234143189606,0.01));
  push('Canada convention fixture', canada.ok && close(canada.current.paymentToday,2908.0249251850773,0.01) && close(canada.reset.projectedBalance,467237.1164811398,0.01) && close(canada.customScenario.payment,3171.272720983039,0.01));
  push('zero-rate deterministic fixture', zero.ok && close(zero.current.paymentToday,833.3333333333334,0.01) && close(zero.customScenario.payment,876.0412137016195,0.01));
  push('optional budget shortfall and zero crossover', budget.ok && budget.budget.applicable && close(budget.budget.customBuffer,-101.19574247549235,0.01) && close(budget.budget.zeroBufferRatePct,6.575081981625562,1e-6));
  push('future budget zero crossover', futureBudget.ok && close(futureBudget.budget.zeroBufferRatePct,6.623966650909031,1e-6));
  push('India budget zero crossover', indiaBudget.ok && close(indiaBudget.budget.zeroBufferRatePct,10.41281416947579,1e-6));
  push('Canada budget zero crossover', canadaBudget.ok && close(canadaBudget.budget.zeroBufferRatePct,7.197361901892508,1e-6));
  push('current-payment override preserves two comparisons', override.ok && close(override.reset.projectedBalance,374568.0447589218,0.01) && close(override.reset.sameRateReferencePayment,2839.8337846253467,0.01) && close(override.customScenario.payment,3054.6105359670382,0.01) && close(override.customScenario.rateOnlyChange,214.77675134169158,0.01) && close(override.customScenario.todayChange,54.61053596703823,0.01));
  push('biweekly monthly equivalent', biweekly.ok && close(biweekly.customScenario.payment,1430.293182084091,0.01) && close(biweekly.customScenario.monthlyEquivalent,3098.9685611821974,0.01));
  push('weekly monthly equivalent is normalized', weekly.ok && close(weekly.customScenario.monthlyEquivalent,immediate.customScenario.monthlyEquivalent,15));
  push('lower stressed rate is allowed', down.ok && down.customScenario.rateOnlyChange<0 && down.customScenario.todayChange<0);
  push('50 percent ceiling accepted', max.ok && max.customScenario.annualRatePct===50 && max.customScenario.payment>0);
  push('standard ladder contains five increments', immediate.ok && immediate.ladder.length===5 && immediate.ladder.map(x=>x.deltaPctPoints).join(',')==='0.25,0.5,1,2,3');
  push('reset at or after term rejected', !badReset.ok && badReset.error==='reset-after-term');
  push('negative amortization override rejected', !negAm.ok && negAm.error==='negative-amortization');
  push('budget remains optional if figures absent', noBudget.ok && !noBudget.budget.applicable);
  push('pure rate effect references same remaining term', immediate.ok && immediate.reset.remainingPeriods===immediate.current.totalPeriods && close(immediate.reset.sameRateReferencePayment,immediate.current.formulaPayment,0.01));

  const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
  mdc1cFixtureOk=failed.length===0; mdc1cFixtureDetail=failed.length ? 'failed: '+failed.join(', ') : `${checks.length} deterministic fixtures passed`;
} catch (error) { mdc1cFixtureDetail=error?.stack || String(error); }
add('MDC1C: independent deterministic fixtures pass projection, rate stress, country convention, cadence and optional-budget contracts', mdc1cFixtureOk, mdc1cFixtureDetail);


// GSEO1D internal topic authority - Snapshot 56 - 2026-10-13.
const gseo1dLearnHub = read('draw004.github.io/learn.html');
const gseo1dMortgageDecision = read('mortgage-payoff-calculator/decision-centre.html');
const gseo1dMortgageDecisionCss = read('mortgage-payoff-calculator/decision-centre.css');
const gseo1dMortgageGuide = read('draw004.github.io/mortgage-prepayment-vs-investing.html');
const gseo1dSpec = read('draw004.github.io/docs/CARROWMONT_GSEO1D_INTERNAL_TOPIC_AUTHORITY_SPEC.md');
const gseo1dQa = fs.readFileSync(new URL('../tests/19-gseo1d-internal-topic-authority.spec.js', import.meta.url), 'utf8');
const gseo1dTopicOwners = [
  ['investment','/sip-calculator/'],
  ['retirement','/retirement-calculator/'],
  ['budget','/budget-cash-flow-planner/'],
  ['goals','/goal-planner/'],
  ['fi','/financial-independence/'],
  ['inflation','/inflation-calculator/'],
  ['home','/mortgage-payoff-calculator/decision-centre.html'],
  ['loan','/loan-calculator/']
];
add('main site: GSEO1D Learn hub gives each mapped planning cluster exactly one contextual primary-tool owner',
  (gseo1dLearnHub.match(/data-cm-topic-tool=/g)||[]).length === 8 &&
  gseo1dTopicOwners.every(([topic,href]) =>
    gseo1dLearnHub.includes(`data-cm-topic-tool="${topic}" href="${href}"`)
  ) &&
  !/data-category="assets"[^]*?data-cm-topic-tool=/.test((gseo1dLearnHub.match(/<section class="category-box" data-category="assets"[\s\S]*?<\/section>/)||[])[0]||'') &&
  !/data-category="foundation"[^]*?data-cm-topic-tool=/.test((gseo1dLearnHub.match(/<section class="category-box foundation-box" data-category="foundation"[\s\S]*?<\/section>/)||[])[0]||'')
);
add('mortgage: GSEO1D creates a bounded Learn hub -> Decision Centre <-> explainer authority path',
  gseo1dLearnHub.includes('data-cm-topic-tool="home" href="/mortgage-payoff-calculator/decision-centre.html"') &&
  gseo1dMortgageDecision.includes('data-cm-topic-learn="prepay-vs-invest" href="/mortgage-prepayment-vs-investing.html"') &&
  gseo1dMortgageGuide.includes('href="/mortgage-payoff-calculator/decision-centre.html"') &&
  gseo1dMortgageDecisionCss.includes('.decision-card .decision-learn-link')
);
add('main site: GSEO1D preserves one primary calculator owner per targeted intent without search-facing metadata churn',
  gseo1dLearnHub.includes('data-cm-topic-tool="investment" href="/sip-calculator/"') &&
  gseo1dLearnHub.includes('data-cm-topic-tool="retirement" href="/retirement-calculator/"') &&
  gseo1dLearnHub.includes('data-cm-topic-tool="budget" href="/budget-cash-flow-planner/"') &&
  gseo1dLearnHub.includes('data-cm-topic-tool="goals" href="/goal-planner/"') &&
  gseo1dLearnHub.includes('data-cm-topic-tool="fi" href="/financial-independence/"') &&
  gseo1dLearnHub.includes('data-cm-topic-tool="inflation" href="/inflation-calculator/"') &&
  gseo1dLearnHub.includes('data-cm-topic-tool="loan" href="/loan-calculator/"') &&
  gseoFiHtml.includes('<title>Financial Independence &amp; FIRE Calculator | Carrowmont</title>') &&
  gseoRetirementLandingHtml.includes('<title>Retirement Calculator &amp; Retirement Planner | Carrowmont</title>') &&
  gseoRetirementPlannerHtml.includes('<title>Detailed Retirement Planner | Carrowmont</title>') &&
  gseoBudgetHtml.includes('<title>Budget Calculator &amp; Monthly Cash Flow Planner | Carrowmont</title>') &&
  gseoInflationHtml.includes('<title>Inflation &amp; Purchasing Power Calculator | Carrowmont</title>')
);
const gseo1dSitemapLastmods = new Map([...learnSitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => {
  const loc = match[1].match(/<loc>([^<]+)<\/loc>/);
  const lastmod = match[1].match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
  return loc && lastmod ? [loc[1], lastmod[1]] : null;
}).filter(Boolean));
add('main site: GSEO1D sitemap freshness matches the changed hub, mortgage explainer and Decision Centre',
  gseo1dSitemapLastmods.get('https://carrowmont.com/learn.html') >= '2026-10-13' &&
  gseo1dSitemapLastmods.get('https://carrowmont.com/mortgage-prepayment-vs-investing.html') >= '2026-10-13' &&
  gseo1dSitemapLastmods.get('https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html') >= '2026-10-13' &&
  gseo1dMortgageGuide.includes('\"dateModified\":\"2026-10-14\"') &&
  gseo1dMortgageGuide.includes('Updated 14 Oct 2026')
);
add('GSEO1D: specification and browser QA lock contextual authority without link dumping',
  gseo1dSpec.includes('without link dumping') &&
  gseo1dSpec.includes('Primary internal ownership map') &&
  gseo1dSpec.includes('Expected Publisher output: **3 PRs**') &&
  gseo1dQa.includes('exactly one contextual primary-tool path') &&
  gseo1dQa.includes('Mortgage Decision Centre and explainer stay bidirectionally connected') &&
  gseo1dQa.includes('[390, 360]')
);


// GSEO1E Learn search-intent refinement - Snapshot 57 - 2026-10-13.
const gseo1eAssetAllocation = read('draw004.github.io/asset-allocation-explained.html');
const gseo1eZeroBased = read('draw004.github.io/zero-based-budgeting.html');
const gseo1eDiversification = read('draw004.github.io/diversification-across-asset-classes.html');
const gseo1eEmergencyFund = read('draw004.github.io/emergency-fund-how-much.html');
const gseo1eMonthlyInvest = read('draw004.github.io/how-much-should-i-invest-each-month.html');
const gseo1eSpec = read('draw004.github.io/docs/CARROWMONT_GSEO1E_LEARN_SEARCH_INTENT_REFINEMENT_SPEC.md');
const gseo1eQa = fs.readFileSync(new URL('../tests/20-gseo1e-learn-search-intent.spec.js', import.meta.url), 'utf8');
const gseo1eAssetArticle = jsonLdNode(gseo1eAssetAllocation, 'Article');
const gseo1eEmergencyArticle = jsonLdNode(gseo1eEmergencyFund, 'Article');
const gseo1eEmergencyBreadcrumb = jsonLdNode(gseo1eEmergencyFund, 'BreadcrumbList');

add('main site: GSEO1E asset-allocation definition intent is explicit without H1 churn',
  gseo1eAssetAllocation.includes('<title>What Is Asset Allocation? How It Works | Carrowmont</title>') &&
  gseo1eAssetAllocation.includes('<h1>What is asset allocation, and why does it matter?</h1>') &&
  gseo1eAssetAllocation.includes('Asset allocation is how a portfolio is divided among stocks, bonds, cash and other assets.') &&
  gseo1eAssetArticle?.dateModified >= '2026-10-13'
);
add('main site: GSEO1E zero-based budgeting absorbs observed wording variants without a duplicate URL',
  gseo1eZeroBased.includes('<title>Zero-Based Budgeting: How It Works | Carrowmont</title>') &&
  gseo1eZeroBased.includes('<h1>What is zero-based budgeting and how does it work?</h1>') &&
  gseo1eZeroBased.includes('What if I searched for zero-sum budgeting or zero-balance budgeting?') &&
  gseo1eZeroBased.includes('zero unassigned income') &&
  !learnSitemap.includes('zero-sum-budgeting.html') && !learnSitemap.includes('zero-balance-budgeting.html')
);
add('main site: GSEO1E diversification and asset allocation remain separate informational owners',
  gseo1eDiversification.includes('<title>Diversification Across Asset Classes | Carrowmont</title>') &&
  gseo1eDiversification.includes('<h1>What does diversification across asset classes actually mean?</h1>') &&
  gseo1eDiversification.includes('How is diversification different from asset allocation?') &&
  gseo1eDiversification.includes('href="/asset-allocation-explained.html"') &&
  gseo1eAssetAllocation.includes('What Is Asset Allocation? How It Works | Carrowmont')
);
add('main site: GSEO1E emergency-fund and monthly-investment questions align to their owned informational intents',
  gseo1eEmergencyFund.includes('<title>How Much Emergency Fund Should You Have? | Carrowmont</title>') &&
  gseo1eEmergencyFund.includes('<h1 id="articleTitle">How much emergency fund should you have?</h1>') &&
  gseo1eEmergencyArticle?.headline === 'How much emergency fund should you have?' &&
  gseo1eEmergencyBreadcrumb?.itemListElement?.[2]?.name === 'How much emergency fund should you have?' &&
  gseo1eMonthlyInvest.includes('<title>How Much Should You Invest Each Month? | Carrowmont</title>') &&
  gseo1eMonthlyInvest.includes('<h1>How much should you invest each month to reach a financial goal?</h1>') &&
  gseo1eMonthlyInvest.includes('class="guide-action-first"') && gseo1eMonthlyInvest.includes('href="/goal-planner/"')
);
const gseo1eSitemapLastmods = new Map([...learnSitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => {
  const loc = match[1].match(/<loc>([^<]+)<\/loc>/);
  const lastmod = match[1].match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
  return loc && lastmod ? [loc[1], lastmod[1]] : null;
}).filter(Boolean));
const gseo1eChangedUrls = [
  'https://carrowmont.com/zero-based-budgeting.html',
  'https://carrowmont.com/asset-allocation-explained.html',
  'https://carrowmont.com/diversification-across-asset-classes.html',
  'https://carrowmont.com/emergency-fund-how-much.html',
  'https://carrowmont.com/how-much-should-i-invest-each-month.html'
];
add('GSEO1E: evidence, sitemap freshness and browser QA lock a bounded refinement release',
  gseo1eChangedUrls.every(url => gseo1eSitemapLastmods.get(url) >= '2026-10-13') &&
  gseo1eSpec.includes('Source Snapshot 57') &&
  gseo1eSpec.includes('Explicit hold decisions') &&
  gseo1eSpec.includes('No new “content-gap” page is justified') &&
  gseo1eSpec.includes('Expected Publisher output: **2 PRs**') &&
  gseo1eQa.includes('definition-first snippet') &&
  gseo1eQa.includes('zero-sum wording') &&
  gseo1eQa.includes('Goal Planner handoff') &&
  gseo1eQa.includes('[390, 360]')
);



// Mortgage terminology + shared-plan hotfix - Snapshot 62 - 2026-10-14.
const mortgageHotfixLocale = read('mortgage-payoff-calculator/locale.js');
const mortgageHotfixPayoffHtml = read('mortgage-payoff-calculator/index.html');
const mortgageHotfixPayoffJs = read('mortgage-payoff-calculator/app.js');
const mortgageHotfixHubHtml = read('mortgage-payoff-calculator/decision-centre.html');
const mortgageHotfixHubJs = read('mortgage-payoff-calculator/decision-centre.js');
const mortgageHotfixPrepayHtml = read('mortgage-payoff-calculator/prepayment-vs-investing.html');
const mortgageHotfixPrepayJs = read('mortgage-payoff-calculator/prepayment-vs-investing.js');
const mortgageHotfixRefiHtml = read('mortgage-payoff-calculator/refinance-break-even.html');
const mortgageHotfixRefiJs = read('mortgage-payoff-calculator/refinance-break-even.js');
const mortgageHotfixStressHtml = read('mortgage-payoff-calculator/rate-rise-stress-test.html');
const mortgageHotfixStressJs = read('mortgage-payoff-calculator/rate-rise-stress-test.js');
const mortgageHotfixPdfFiles = [
  read('mortgage-payoff-calculator/mortgage-payoff-pdf-renderer.js'),
  read('mortgage-payoff-calculator/prepayment-vs-investing-pdf-renderer.js'),
  read('mortgage-payoff-calculator/refinance-break-even-pdf-renderer.js'),
  read('mortgage-payoff-calculator/rate-rise-stress-test-pdf-renderer.js')
];
const mortgageHotfixQa = fs.readFileSync(new URL('../tests/23-mortgage-localization-shared-plan-hotfix.spec.js', import.meta.url), 'utf8');

add('mortgage hotfix: one locale helper owns Home Loan vs Mortgage family wording',
  mortgageHotfixLocale.includes('function getMortgageTerms') &&
  mortgageHotfixLocale.includes("const homeLoanMarket = ['IN', 'AU', 'NZ'].includes(region)") &&
  mortgageHotfixLocale.includes("const mortgageMarket = ['US', 'CA', 'GB', 'IE'].includes(region)") &&
  mortgageHotfixLocale.includes("familyName = homeLoanMarket ? 'Home Loan Decision Centre'") &&
  mortgageHotfixLocale.includes('function applyMortgageCopy')
);
add('mortgage hotfix: payoff and all Decision Centre modules apply shared family terminology at runtime',
  [mortgageHotfixPayoffJs,mortgageHotfixHubJs,mortgageHotfixPrepayJs,mortgageHotfixRefiJs,mortgageHotfixStressJs]
    .every(src=>src.includes('applyMortgageCopy?.()')) &&
  mortgageHotfixPayoffHtml.includes('data-mortgage-copy="nextDecision"') &&
  mortgageHotfixHubHtml.includes('data-mortgage-copy="familyName"') &&
  mortgageHotfixPrepayHtml.includes('data-mortgage-copy="prepayPrivacy"') &&
  mortgageHotfixRefiHtml.includes('data-mortgage-copy="refiPrivacy"') &&
  mortgageHotfixStressHtml.includes('data-mortgage-copy="stressPrivacy"')
);
add('mortgage hotfix: previously hard-coded Decision Centre, FAQ, privacy and footer strings are localization targets',
  mortgageHotfixPayoffHtml.includes('data-mortgage-copy="payoffExtraFaq"') &&
  mortgageHotfixPayoffHtml.includes('data-mortgage-copy="payoffDecisionLink"') &&
  mortgageHotfixHubHtml.includes('data-mortgage-copy="learnLabel"') &&
  mortgageHotfixPrepayHtml.includes('data-mortgage-copy="prepayFreedCashFaq"') &&
  mortgageHotfixPrepayHtml.includes('data-mortgage-copy="clearSavedDetails"') &&
  mortgageHotfixRefiHtml.includes('data-mortgage-copy="toolsLabel"') &&
  mortgageHotfixStressHtml.includes('data-mortgage-copy="stressExpensesLabel"') &&
  mortgageHotfixStressHtml.includes('data-mortgage-copy="zeroBufferExplanation"')
);
add('mortgage hotfix: shared-plan stop-sharing clears only housing-loan values and blocks silent republishing',
  mortgageHotfixPayoffJs.includes("SHARED_LOAN_ENABLED_KEY='carrowmont_mortgage_shared_plan_enabled_v1'") &&
  mortgageHotfixPayoffJs.includes("S.clear(SHARED_LOAN_PATHS)") &&
  mortgageHotfixPayoffJs.includes("!sharedLoanEnabled()") &&
  mortgageHotfixPayoffJs.includes("Loan details are no longer available to other Carrowmont tools.") &&
  !mortgageHotfixPayoffJs.includes("S?.clear();els.reportStatus.textContent='Shared Carrowmont plan values cleared from this browser.'") &&
  mortgageHotfixPayoffHtml.includes('id="sharedPlanStatus"') &&
  mortgageHotfixPayoffHtml.includes('Stop sharing this loan with other Carrowmont tools')
);
add('mortgage hotfix: PDFs use the same country-aware mortgage/home-loan terminology source',
  mortgageHotfixPdfFiles.every(src=>src.includes('getMortgageTerms?.()')) &&
  mortgageHotfixPdfFiles.every(src=>src.includes('T()'))
);
add('mortgage hotfix: user-facing copy avoids V1 jargon in the localized extra-money explanation',
  mortgageHotfixLocale.includes('Choose how you want to use the extra money.') &&
  !mortgageHotfixLocale.includes('Choose one V1 mode.')
);
add('central QA: mortgage hotfix protects country wording, targeted clear semantics and 1280/390/360 layouts',
  mortgageHotfixQa.includes('Decision Centre family wording follows India, US, UK and Australia terminology') &&
  mortgageHotfixQa.includes('Stop sharing clears only housing-loan values') &&
  mortgageHotfixQa.includes("assumptions.inflationPct") &&
  mortgageHotfixQa.includes('[1280,390,360]')
);


// Learn housing-language localization hotfix - Snapshot 63 - 2026-10-14.
const mortgageLearnHotfixLocale = read('draw004.github.io/locale.js');
const mortgageLearnHotfixHub = read('draw004.github.io/learn.html');
const mortgageLearnHotfixLocalization = read('draw004.github.io/learn-localization.js');
const mortgageLearnHotfixRuntime = read('draw004.github.io/mortgage-learn.js');
const mortgageLearnHotfixRentBuy = read('draw004.github.io/rent-vs-buy-home.html');
const mortgageLearnHotfixSitemap = read('draw004.github.io/sitemap.xml');
const mortgageLearnHotfixQa = fs.readFileSync(new URL('../tests/24-mortgage-learn-localization-hotfix.spec.js', import.meta.url), 'utf8');
const mortgageLearnHotfixPages = [
  'mortgage-prepayment-vs-investing.html','mortgage-refinance-break-even.html','mortgage-rate-rise-payment-stress.html',
  'one-extra-mortgage-payment-a-year.html','monthly-extra-vs-annual-lump-sum-mortgage.html',
  'biweekly-fortnightly-mortgage-payments.html','extra-mortgage-payments-early-vs-late.html','pay-off-mortgage-five-years-early.html'
].map(name=>read('draw004.github.io/'+name));
const housingLearnAuditNames = [
  'biweekly-fortnightly-mortgage-payments.html','budgeting-by-pay-frequency.html','emergency-fund-how-much.html',
  'extra-mortgage-payments-early-vs-late.html','how-much-money-do-i-need-to-retire.html',
  'monthly-extra-vs-annual-lump-sum-mortgage.html','mortgage-prepayment-vs-investing.html',
  'mortgage-rate-rise-payment-stress.html','mortgage-refinance-break-even.html','one-extra-mortgage-payment-a-year.html',
  'pay-off-mortgage-five-years-early.html','real-estate-vs-stocks.html','reit-vs-direct-property.html',
  'rent-vs-buy-home.html','rental-yield-explained.html','retirement-expenses.html',
  'retirement-monthly-income-needed.html','retirement-savings-by-age.html'
];
const housingLearnAuditPages = housingLearnAuditNames.map(name=>read('draw004.github.io/'+name));

add('main Learn: one country-aware mortgage/home-loan terminology helper now serves the Learn surface',
  mortgageLearnHotfixLocale.includes('function getMortgageTerms') &&
  mortgageLearnHotfixLocale.includes("const homeLoanMarket = ['IN', 'AU', 'NZ'].includes(region)") &&
  mortgageLearnHotfixLocale.includes("const mortgageMarket = ['US', 'CA', 'GB', 'IE'].includes(region)") &&
  mortgageLearnHotfixLocale.includes("learnCategory = homeLoanMarket ? 'Home Loans'") &&
  mortgageLearnHotfixLocale.includes('learnPrepayTitle') && mortgageLearnHotfixLocale.includes('learnRefiTitle') && mortgageLearnHotfixLocale.includes('learnStressTitle')
);
add('main Learn: hub home-loan/mortgage category, Decision Centre CTA and mortgage cards are localized at runtime',
  mortgageLearnHotfixLocalization.includes('function updateMortgageLearnHub') &&
  mortgageLearnHotfixLocalization.includes('#home-loans') &&
  mortgageLearnHotfixLocalization.includes('/mortgage-prepayment-vs-investing.html') &&
  mortgageLearnHotfixLocalization.includes('/mortgage-refinance-break-even.html') &&
  mortgageLearnHotfixLocalization.includes('/mortgage-rate-rise-payment-stress.html') &&
  mortgageLearnHotfixLocalization.includes('/one-extra-mortgage-payment-a-year.html') &&
  mortgageLearnHotfixLocalization.includes('t.learnHubCta') && mortgageLearnHotfixLocalization.includes('t.learnRentBuyDesc')
);
add('main Learn: sitewide Learn housing copy uses reversible country localization beyond the mortgage cluster',
  mortgageLearnHotfixLocalization.includes('var housingTextSource=new WeakMap()') &&
  mortgageLearnHotfixLocalization.includes('function localizeHousingLearnSurface') &&
  mortgageLearnHotfixLocalization.includes("body.dataset.cmLearnArticle==='1'") &&
  mortgageLearnHotfixLocalization.includes("parent.closest('script,style,code,pre,.reference-note')") &&
  housingLearnAuditPages.length === 18 &&
  housingLearnAuditPages.every(src=>/learn-localization\.js\?v=(?:20261014-housing3|20261020-learn3b1)/.test(src))
);
add('main Learn: mortgage guide hero/back-link/footer wording follows country without changing canonical URLs',
  mortgageLearnHotfixRuntime.includes('function articleTitle') &&
  mortgageLearnHotfixRuntime.includes('function updateVisibleFrame') &&
  mortgageLearnHotfixRuntime.includes("'← Back to '+t.learnGuides") &&
  mortgageLearnHotfixRuntime.includes('.footer-col a[href="/mortgage-payoff-calculator/"]') &&
  mortgageLearnHotfixPages.every(src=>src.includes('mortgage-learn.js?v=20261014-mortgage-learn2')) &&
  mortgageLearnHotfixPages.every(src=>src.includes('locale.js?v=20261014-housing3'))
);
add('main Learn: Rent vs Buy keeps Goal Planner limited to down-payment planning and routes comparison intent to RENT1',
  mortgageLearnHotfixRentBuy.includes('COMPARE THE TWO PATHS') &&
  mortgageLearnHotfixRentBuy.includes('Open the Rent vs Buy Calculator') &&
  mortgageLearnHotfixRentBuy.includes('/mortgage-payoff-calculator/rent-vs-buy-calculator.html') &&
  mortgageLearnHotfixRentBuy.includes('Use Goal Planner separately') &&
  mortgageLearnHotfixRentBuy.includes('amount and timing of a future down payment')
);
add('main Learn: changed housing education URLs are fresh in the sitemap and keep stable canonical routes',
  mortgageLearnHotfixPages.every(src=>src.includes('rel="canonical"')) &&
  ['learn.html',...housingLearnAuditNames.filter(name=>name!=='rent-vs-buy-home.html')].every(name => (sitemapLastmods.get('https://carrowmont.com/' + name) || '') >= '2026-10-14') &&
  (sitemapLastmods.get('https://carrowmont.com/rent-vs-buy-home.html') || '') >= '2026-10-15' &&
  mortgageLearnHotfixHub.includes('learn-localization.js?v=20261014-housing3')
);
add('central QA: Learn housing hotfix covers India, US, UK, Australia, cross-cluster articles and 390/360 responsive layouts',
  mortgageLearnHotfixQa.includes("'IN','INR'") && mortgageLearnHotfixQa.includes("'US','USD'") &&
  mortgageLearnHotfixQa.includes("'GB','GBP'") && mortgageLearnHotfixQa.includes("'AU','AUD'") &&
  mortgageLearnHotfixQa.includes('housing wording is localized across Learn articles outside the mortgage cluster') &&
  mortgageLearnHotfixQa.includes('Rent vs Buy guide routes to the live comparison calculator while Goal Planner stays down-payment-only') &&
  mortgageLearnHotfixQa.includes('[390,360]') &&
  mortgageLearnHotfixQa.includes('Open Home Loan Decision Centre') && mortgageLearnHotfixQa.includes('Open Mortgage Decision Centre')
);


// DEBT1 Debt Payoff Calculator production contract - 2026-10-14.
const debt1Html = read('budget-cash-flow-planner/debt-payoff-calculator.html');
const debt1Core = read('budget-cash-flow-planner/debt-payoff-core.js');
const debt1App = read('budget-cash-flow-planner/debt-payoff-calculator.js');
const debt1Pdf = read('budget-cash-flow-planner/debt-payoff-pdf-renderer.js');
const debt1BudgetHtml = read('budget-cash-flow-planner/index.html');
const debt1BudgetApp = read('budget-cash-flow-planner/app.js');
const debt1Tools = read('draw004.github.io/tools.html');
const debt1LearnHub = read('draw004.github.io/learn.html');
const debt1Learn = read('draw004.github.io/debt-snowball-vs-avalanche.html');
const debt1Sitemap = read('draw004.github.io/sitemap.xml');
const debt1Home = read('draw004.github.io/index.html');
const debt1Qa = fs.readFileSync(new URL('../tests/25-debt-payoff-calculator.spec.js', import.meta.url), 'utf8');

add('DEBT1: canonical Debt Payoff Calculator identity and plain-language primary inputs are present',
  debt1Html.includes('<title>Debt Payoff Calculator | Compare Snowball vs Avalanche | Carrowmont</title>') &&
  debt1Html.includes('https://carrowmont.com/budget-cash-flow-planner/debt-payoff-calculator.html') &&
  debt1Html.includes('How much do you owe?') &&
  debt1Html.includes('Extra amount I can pay each month') &&
  debt1Html.includes('Pay highest-interest debt first') &&
  debt1Html.includes('Pay smallest debt first')
);
add('DEBT1: deterministic core owns equal-budget monthly interest, tie rules and same-month spillover',
  debt1Core.includes('const totalMonthlyBudget = baseMinimumBudget + extra') &&
  debt1Core.includes("if (method === 'avalanche')") &&
  debt1Core.includes('while (remainingBudget > EPSILON') &&
  debt1Core.includes('targetSort(method, a, b)') &&
  debt1Core.includes("version: 'DEBT1-1.0'")
);
add('DEBT1: core fixture pack protects all 19 required edge cases',
  debt1Core.includes('function runFixtures()') &&
  (debt1Core.match(/add\('/g)||[]).length >= 19 &&
  debt1Qa.includes('fixtures).toHaveLength(19)')
);
add('DEBT1: zero-extra comparison and 600-month unresolved protection are built into the same result object',
  debt1Core.includes("const avalancheZero = simulateStrategy(normalized, 0, 'avalanche'") &&
  debt1Core.includes("const snowballZero = simulateStrategy(normalized, 0, 'snowball'") &&
  debt1Core.includes('const MAX_MONTHS = 600') &&
  debt1Core.includes("status: allPaid ? 'paid_off' : 'unresolved'")
);
add('DEBT1: debt details are not automatically persisted and shared state is limited to explicit Budget extra-payment handoff',
  !debt1App.includes('localStorage.setItem') &&
  debt1App.includes("S.get('assumptions.possibleMonthlyDebtExtra')") &&
  debt1App.includes("entry.sourceTool!=='budget-cash-flow-planner'") &&
  debt1App.includes('30*60*1000') &&
  debt1App.includes("S?.clear('assumptions.possibleMonthlyDebtExtra')")
);
add('Budget: positive money remaining offers an explicit Debt Payoff handoff without silently applying it',
  debt1BudgetHtml.includes('id="debtPayoffHandoffBtn"') &&
  debt1BudgetHtml.includes('Explore debt payoff with this monthly amount') &&
  debt1BudgetApp.includes("plan.set('assumptions.possibleMonthlyDebtExtra',c.remaining") &&
  debt1BudgetApp.includes("sourceTool:'budget-cash-flow-planner'") &&
  debt1BudgetApp.includes("window.location.href='debt-payoff-calculator.html'")
);
add('DEBT1: Copy Summary and exact three-page PDF are driven from the deterministic result object',
  debt1App.includes('function summaryText()') &&
  debt1App.includes('window.CarrowmontDebtPayoffPdfRenderer.download({result') &&
  debt1Pdf.includes('const canvases=[page1(model),page2(model),page3(model)]') &&
  debt1Pdf.includes("filename:'carrowmont-debt-payoff-report.pdf'")
);
add('DEBT1: Tool and Learn guide form a bidirectional plain-language journey',
  debt1Html.includes('href="/debt-snowball-vs-avalanche.html"') &&
  debt1Learn.includes('Debt snowball vs avalanche: which debt gets paid first?') &&
  debt1Learn.includes('href="/budget-cash-flow-planner/debt-payoff-calculator.html"') &&
  debt1Learn.includes('Snowball') && debt1Learn.includes('Avalanche')
);
add('DEBT1: Tools Hub lists Debt Payoff as a secondary focused calculator, not a CORE8 primary tool',
  debt1Tools.includes('data-secondary-tool="debt-payoff"') &&
  debt1Tools.includes('<span class="directory-tool-type">Debt planning</span>') &&
  debt1Tools.includes('/budget-cash-flow-planner/debt-payoff-calculator.html') &&
  debt1Home.includes('data-core-tool-count="9"') &&
  (debt1Home.match(/data-tool-id=/g)||[]).length === 9 &&
  !debt1Home.includes('data-tool-id="debt-payoff"')
);
add('DEBT1: Learn hub owns educational comparison intent in the Budget & Cash Flow category',
  debt1LearnHub.includes('/debt-snowball-vs-avalanche.html') &&
  debt1LearnHub.includes('Debt snowball vs avalanche: which debt gets paid first?') &&
  debt1LearnHub.includes('Compare paying the smallest balance first with paying the highest-interest debt first.')
);
add('DEBT1: sitemap publishes both new canonical public URLs with release-date lastmod',
  ((debt1Sitemap.match(/<loc>https:\/\/carrowmont\.com\/debt-snowball-vs-avalanche\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-17' &&
  ((debt1Sitemap.match(/<loc>https:\/\/carrowmont\.com\/budget-cash-flow-planner\/debt-payoff-calculator\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-14'
);
add('DEBT1: structured data uses WebApplication for the tool and Article for the Learn guide',
  Boolean(jsonLdNode(debt1Html,'WebApplication')) && Boolean(jsonLdNode(debt1Html,'BreadcrumbList')) &&
  Boolean(jsonLdNode(debt1Learn,'Article')) && Boolean(jsonLdNode(debt1Learn,'BreadcrumbList'))
);
add('DEBT1: browser QA protects handoff, privacy, PDF, discovery, plain language and 1280/390/360 layouts',
  debt1Qa.includes('Budget handoff is explicit, short-lived, currency-safe and cleared after apply') &&
  debt1Qa.includes('entered debt details are not silently persisted to localStorage') &&
  debt1Qa.includes('exact PDF is three pages') &&
  debt1Qa.includes('Tool, Learn, Tools Hub and sitemap') &&
  debt1Qa.includes('primary fields, results and CTAs stay in plain language') &&
  debt1Qa.includes('[1280,390,360]')
);


// RENT1 Rent vs Buy Calculator production contract - 2026-10-15.
const rent1Html = read('mortgage-payoff-calculator/rent-vs-buy-calculator.html');
const rent1Core = read('mortgage-payoff-calculator/rent-vs-buy-core.js');
const rent1App = read('mortgage-payoff-calculator/rent-vs-buy-calculator.js');
const rent1Css = read('mortgage-payoff-calculator/rent-vs-buy-calculator.css');
const rent1Pdf = read('mortgage-payoff-calculator/rent-vs-buy-pdf-renderer.js');
const rent1Learn = read('draw004.github.io/rent-vs-buy-home.html');
const rent1Tools = read('draw004.github.io/tools.html');
const rent1Sitemap = read('draw004.github.io/sitemap.xml');
const rent1Home = read('draw004.github.io/index.html');
const rent1Centre = read('mortgage-payoff-calculator/decision-centre.html');
const rent1Qa = fs.readFileSync(new URL('../tests/26-rent-vs-buy-calculator.spec.js', import.meta.url), 'utf8');

add('RENT1: canonical Rent vs Buy identity, search metadata and plain-language core inputs are present',
  rent1Html.includes('<title>Rent vs Buy Calculator | Compare Renting and Buying | Carrowmont</title>') &&
  rent1Html.includes('https://carrowmont.com/mortgage-payoff-calculator/rent-vs-buy-calculator.html') &&
  rent1Html.includes('Price of the home') && rent1Html.includes('Down payment') &&
  rent1Html.includes('Monthly rent for a similar home') && rent1Html.includes('How long do you expect to stay?')
);
add('RENT1: deterministic core owns same-starting-cash and same-monthly-housing-budget rules symmetrically',
  rent1Core.includes("const VERSION='RENT1-1.0'") &&
  rent1Core.includes('const startingHousingCash=Math.max(buyerUpfront,renterUpfront)') &&
  rent1Core.includes('const sharedMonthlyHousingBudget=Math.max(buyerHousingOutflow,renterHousingOutflow)') &&
  rent1Core.includes('const buyerAdd=sharedMonthlyHousingBudget-buyerHousingOutflow') &&
  rent1Core.includes('const renterAdd=sharedMonthlyHousingBudget-renterHousingOutflow')
);
add('RENT1: mortgage amortization, refundable deposit, selling cost and negative-equity treatment are explicit',
  rent1Core.includes('loanPayment=Math.min(payment,loanBalance+interest)') &&
  rent1Core.includes('const saleCost=homeValue*(input.sellingCostPct/100)') &&
  rent1Core.includes('const netHomeSaleProceeds=final.homeValue-saleCost-final.loanBalance') &&
  rent1Core.includes('renterEndWealth=final.renterInvestment+input.refundableRentalDeposit')
);
add('RENT1: stable crossover semantics reject misleading temporary crossings',
  rent1Core.includes("state:'stable-crossover'") &&
  rent1Core.includes("state:'no-single-stable-break-even'") &&
  rent1App.includes('No single stable break-even point within this period')
);
let rent1Fixtures=[];
try {
  const sandbox={window:{},module:{exports:{}}}; vm.createContext(sandbox); vm.runInContext(rent1Core,sandbox); rent1Fixtures=sandbox.window.CarrowmontRentVsBuyCore.runFixtures();
} catch {}
add('RENT1: independent deterministic fixture pack protects all 30 required edge cases',
  rent1Fixtures.length===30 && rent1Fixtures.every(x=>x.ok) && rent1Qa.includes('fixtures).toHaveLength(30)')
);
add('RENT1: country changes terminology and currency changes formatting without changing the core math',
  rent1App.includes("['IN','AU','NZ'].includes(r)") && rent1App.includes("['US','CA','GB','IE'].includes(r)") &&
  rent1App.includes('Starting EMI / home-loan payment') && rent1App.includes('Starting home-loan repayment') &&
  rent1App.includes('changing currency changes the unit and formatting only') === false &&
  rent1Html.includes('changing currency changes the unit and formatting only') &&
  rent1Core.includes("country:String(raw.country||'OTHER'), currency:String(raw.currency||'USD')")
);
add('RENT1: Copy Summary and exact three-page report are driven from the same deterministic result object',
  rent1App.includes('function summaryText()') && rent1App.includes('Starting buy housing cost:') && rent1App.includes('window.CarrowmontRentVsBuyPdfRenderer.generate({result:lastResult') &&
  rent1Pdf.includes('const pages=[summaryPage(model),detailPage(model),guidePage(model)]') && rent1Pdf.includes('SELECTED YEAR CHECKPOINTS') &&
  rent1Pdf.includes('Starting monthly housing cost · Buy') && rent1Pdf.includes("filename:'carrowmont-rent-vs-buy-report.pdf'")
);
add('RENT1: tool and existing Learn guide form a bidirectional live journey while Goal Planner remains down-payment-only',
  rent1Html.includes('href="/rent-vs-buy-home.html"') && rent1Html.includes('href="/budget-cash-flow-planner/"') &&
  rent1Html.includes('href="/mortgage-payoff-calculator/rate-rise-stress-test.html"') &&
  rent1Learn.includes('href="/mortgage-payoff-calculator/rent-vs-buy-calculator.html"') &&
  rent1Learn.includes('Open the Rent vs Buy Calculator') && rent1Learn.includes('Use Goal Planner separately') &&
  !rent1Learn.includes('will use a dedicated Rent vs Buy Calculator')
);
add('RENT1: Tools Hub keeps Rent vs Buy live while CORE8 expands the primary suite without changing the four-module Decision Centre',
  rent1Tools.includes('data-secondary-tool="rent-vs-buy"') &&
  rent1Tools.includes('/mortgage-payoff-calculator/rent-vs-buy-calculator.html') &&
  /"numberOfItems"\s*:\s*19/.test(rent1Tools) && (rent1Tools.match(/class="directory-tool-card/g)||[]).length===19 &&
  rent1Home.includes('data-core-tool-count="9"') && (rent1Home.match(/data-tool-id=/g)||[]).length===9 &&
  !rent1Home.includes('data-tool-id="rent-vs-buy"') && (rent1Centre.match(/class="decision-card"/g)||[]).length===4 &&
  !rent1Centre.includes('Rent vs Buy Calculator')
);
add('RENT1: new tool and materially updated Learn page are fresh in the sitemap',
  ((rent1Sitemap.match(/<loc>https:\/\/carrowmont\.com\/mortgage-payoff-calculator\/rent-vs-buy-calculator\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-15' &&
  ((rent1Sitemap.match(/<loc>https:\/\/carrowmont\.com\/rent-vs-buy-home\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-15' &&
  ((rent1Sitemap.match(/<loc>https:\/\/carrowmont\.com\/tools\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-18'
);
add('RENT1: structured data uses WebApplication for the tool and retains Article for the Learn guide',
  Boolean(jsonLdNode(rent1Html,'WebApplication')) && Boolean(jsonLdNode(rent1Html,'BreadcrumbList')) &&
  Boolean(jsonLdNode(rent1Learn,'Article')) && Boolean(jsonLdNode(rent1Learn,'BreadcrumbList'))
);
add('RENT1: privacy boundary avoids Mortgage Decision Profile and shared-plan writes',
  !rent1App.includes('CarrowmontMortgageDecisionProfile') && !rent1App.includes('CarrowmontPlanState') &&
  !rent1App.includes('localStorage.setItem') && rent1Html.includes('does not save or overwrite your Mortgage / Home Loan Decision Centre profile')
);
add('RENT1: browser QA protects localization, equal-resource rules, PDF, discovery, privacy, plain language and 1280/390/360 layouts',
  rent1Qa.includes('country and currency catalogue loads') && rent1Qa.includes('equal-resource rules are visible and match the result object') &&
  rent1Qa.includes('exact report is three pages') && rent1Qa.includes('Tool, Learn, Tools Hub and sitemap') &&
  rent1Qa.includes('does not silently write Mortgage Decision Profile or shared housing-plan state') &&
  rent1Qa.includes('primary fields, results, CTAs and methodology stay in plain language') && rent1Qa.includes('[1280,390,360]')
);
add('RENT1: responsive CSS protects narrow screens and chart/table equivalents remain available',
  rent1Css.includes('@media(max-width:390px)') && rent1Css.includes('@media(max-width:720px)') && rent1Css.includes('.rent1-crossover-line') &&
  rent1Html.includes('id="wealthChart"') && rent1Html.includes('id="checkpointRows"') &&
  rent1Html.includes('Projected home value') && rent1Html.includes('Remaining loan')
);



// SEO3-MCR1 Market Chain Reaction Explorer - Snapshot 68 - 2026-10-15.
const mcrHtml = read('draw004.github.io/market-chain-reaction-explorer.html');
const mcrTools = read('draw004.github.io/tools.html');
const mcrHome = read('draw004.github.io/index.html');
const mcrHub = read('draw004.github.io/learn.html');
const mcrCss = read('draw004.github.io/market-chain-reaction-explorer.css');
const mcrCore = read('draw004.github.io/market-chain-reaction-explorer-core.js');
const mcrApp = read('draw004.github.io/market-chain-reaction-explorer.js');
const mcrLearnCss = read('draw004.github.io/market-chain-learn.css');
const mcrSpec = read('draw004.github.io/docs/CARROWMONT_SEO3_MCR1_MARKET_CHAIN_REACTION_EXPLORER_SPEC_FINAL.md');
const mcrImplementation = read('draw004.github.io/docs/CARROWMONT_SEO3_MCR1_MARKET_CHAIN_REACTION_EXPLORER_IMPLEMENTATION.md');
const mcrQa = fs.readFileSync(new URL('../tests/27-market-chain-reaction-explorer.spec.js', import.meta.url), 'utf8');
const mcrLearnNames = [
  'what-happens-when-bond-yields-rise.html',
  'how-oil-prices-affect-inflation.html',
  'what-happens-when-fed-cuts-interest-rates.html',
  'what-happens-when-dollar-strengthens.html'
];
const mcrLearnPages = mcrLearnNames.map(name => read('draw004.github.io/' + name));
let mcrEvents={events:[],targets:[]},mcrRelations={relationships:[]},mcrSources={sources:[]};
try { mcrEvents=JSON.parse(read('draw004.github.io/data/market-chain-events.json')); } catch {}
try { mcrRelations=JSON.parse(read('draw004.github.io/data/market-chain-relations.json')); } catch {}
try { mcrSources=JSON.parse(read('draw004.github.io/data/market-chain-sources.json')); } catch {}
const mcrRelationMap=new Map((mcrRelations.relationships||[]).map(r=>[r.id,r]));
const mcrSourceIds=new Set((mcrSources.sources||[]).map(x=>x.id));
const mcrAllowedVerdicts=new Set(['Usually supportive','Usually a headwind','Usually pushes higher','Usually pushes lower','Mixed / cause-dependent','Indirect effect','No reliable one-way relationship','Mechanical inverse relationship']);
const mcrAllowedTypes=new Set(['Mechanical relationship','Economic transmission','Market tendency','Context-dependent relationship']);
const mcrCoverageOk=(mcrEvents.events||[]).every(event => (event.targets||[]).every(target => mcrRelationMap.has(`${event.id}__${target}`)));
const mcrRelationsOk=(mcrRelations.relationships||[]).every(r =>
  mcrAllowedVerdicts.has(r.verdict) && mcrAllowedTypes.has(r.relationshipType) &&
  typeof r.directAnswer==='string' && r.directAnswer.length>20 &&
  Array.isArray(r.mechanismSteps) && r.mechanismSteps.length>=2 &&
  typeof r.chainBreaker==='string' && r.chainBreaker.length>20 &&
  Array.isArray(r.sourceIds) && r.sourceIds.length>=1 && r.sourceIds.every(id=>mcrSourceIds.has(id)) &&
  !/will definitely|guaranteed return|buy now|sell now|must rise|must fall/i.test(r.directAnswer+' '+r.chainBreaker)
);
add('MCR1: canonical Explorer is a deterministic educational authority product with one indexable base URL',
  mcrHtml.includes('<title>What Happens When Markets Change? | Carrowmont</title>') &&
  mcrHtml.includes('<h1>What Happens When Markets Change?</h1>') &&
  mcrHtml.includes('rel="canonical" href="https://carrowmont.com/market-chain-reaction-explorer.html"') &&
  Boolean(jsonLdNode(mcrHtml,'WebApplication')) && Boolean(jsonLdNode(mcrHtml,'BreadcrumbList')) &&
  mcrHtml.includes('No price forecast') && mcrHtml.includes('why did the move happen?') &&
  mcrCore.includes("const VERSION='MCR1-1.0'") && mcrApp.includes('window.__carrowmontMarketChainLastResult')
);
add('MCR1: event/cause/outcome library has 12 events, 25 targets and exactly 73 reviewed relationships',
  (mcrEvents.events||[]).length===12 && (mcrEvents.targets||[]).length===25 &&
  (mcrRelations.relationships||[]).length===73 && (mcrSources.sources||[]).length>=10 && mcrCoverageOk
);
add('MCR1: every exposed relationship uses controlled terminology, evidence and a mandatory Chain Breaker',
  mcrRelationsOk && mcrCore.includes('Missing relationship') && mcrCore.includes('has no Chain Breaker') &&
  mcrHtml.includes('Chain Breaker: What could make the opposite happen?')
);
add('MCR1: cause-specific logic protects the central rule that why the market moved changes the answer',
  (mcrRelationMap.get('yields-rise__broad-stocks')?.causeOverrides?.growth?.directAnswer || '').length>20 &&
  (mcrRelationMap.get('yields-rise__broad-stocks')?.causeOverrides?.inflation?.directAnswer || '').length>20 &&
  (mcrRelationMap.get('oil-rise__broad-stocks')?.causeOverrides?.demand?.directAnswer || '').length>20 &&
  (mcrRelationMap.get('oil-rise__broad-stocks')?.causeOverrides?.supply?.directAnswer || '').length>20 &&
  mcrRelationMap.get('yields-rise__bond-prices')?.verdict==='Mechanical inverse relationship'
);
add('MCR1: hypothetical Treasury default stress is explicitly uncertain rather than presented as a forecast',
  (mcrEvents.events||[]).find(x=>x.id==='treasury-default-stress')?.specialWarning?.length>40 &&
  (mcrEvents.events||[]).find(x=>x.id==='treasury-default-stress')?.targets?.every(target => (mcrRelationMap.get(`treasury-default-stress__${target}`)?.scenarioWarning || (mcrEvents.events||[]).find(x=>x.id==='treasury-default-stress')?.specialWarning)) &&
  mcrSpec.includes('default') && mcrSpec.includes('No reliable one-way relationship')
);
add('MCR1: visitor runtime uses reviewed same-origin static JSON with no third-party market API or runtime AI layer',
  mcrApp.includes("'data/market-chain-events.json'") && mcrApp.includes("'data/market-chain-relations.json'") && mcrApp.includes("'data/market-chain-sources.json'") &&
  !/openai|anthropic|gemini|cohere|alphavantage|finnhub|polygon\.io|iexcloud/i.test(mcrApp+mcrCore) &&
  mcrImplementation.includes('does not call') && mcrImplementation.includes('external AI service')
);
add('MCR1: Explorer keeps substantial static education and a no-JavaScript path to the four Batch-1 guides',
  mcrHtml.includes('<noscript>') && mcrHtml.includes('PLAIN-ENGLISH GLOSSARY') &&
  mcrHtml.includes('Mechanical relationship') && mcrHtml.includes('Context-dependent relationship') &&
  mcrLearnNames.every(name=>mcrHtml.includes(`href="/${name}"`))
);
add('MCR1: four Batch-1 Learn pages satisfy Carrowmont depth, source, canonical and global-language standards',
  mcrLearnPages.every((page,i) =>
    page.includes('data-cm-learn-article="1"') && page.includes('class="guide-answer"') && page.includes('data-cm-rich="1"') &&
    page.includes('data-cm-depth="1"') && page.includes('Frequently asked questions') && page.includes('class="reference-note"') &&
    page.includes('href="/market-chain-reaction-explorer.html#') && page.includes('learn-article.css?v=20261010-global1') &&
    page.includes('learn-localization.js?v=20261014-housing3') && Boolean(jsonLdNode(page,'Article')) && Boolean(jsonLdNode(page,'BreadcrumbList')) &&
    page.includes(`https://carrowmont.com/${mcrLearnNames[i]}`) && !/₹|\blakhs?\b|\bcrores?\b/i.test(learnMainVisibleText(page))
  ) && mcrLearnCss.includes('data-cm-mcr-learn')
);
add('MCR1: Learn hub and Tools directory expose the macro network without promoting MCR1 into the CORE9 primary suite',
  mcrHub.includes('data-category="macro"') && mcrHub.includes('class="category-tool-link" href="/market-chain-reaction-explorer.html"') &&
  mcrLearnNames.every(name=>mcrHub.includes(`href="/${name}"`)) &&
  mcrTools.includes('data-secondary-tool="market-chain-reaction"') && mcrTools.includes('href="/market-chain-reaction-explorer.html"') &&
  /"numberOfItems"\s*:\s*19/.test(mcrTools) && (mcrTools.match(/class="directory-tool-card/g)||[]).length===19 &&
  mcrHome.includes('data-core-tool-count="9"') && !mcrHome.includes('data-tool-id="market-chain-reaction"')
);
add('MCR1: existing Gold, Silver and U.S. debt authority assets link into the new explanation layer',
  read('draw004.github.io/gold-macro-stress-explorer.html').includes('market-chain-reaction-explorer.html#event=yields-rise') &&
  read('draw004.github.io/silver-supply-demand-macro-stress-explorer.html').includes('market-chain-reaction-explorer.html#event=dollar-strengthens') &&
  read('draw004.github.io/us-debt-interest-cost-calculator.html').includes('market-chain-reaction-explorer.html#event=fiscal-stress')
);
add('MCR1: sitemap publishes the Explorer and four guides with current release freshness and no fragment URLs',
  ['market-chain-reaction-explorer.html',...mcrLearnNames].every(name => sitemapLastmods.get('https://carrowmont.com/'+name)==='2026-10-15') &&
  !/<loc>[^<]*#event=/.test(learnSitemap)
);
add('MCR1: final specification and implementation record lock Snapshot 68 and the controlled release model',
  mcrSpec.includes('Specification — FINAL') && mcrSpec.includes('Snapshot 68') &&
  mcrSpec.includes('71f321a742f48da3f3e3beff14d568ad6ee306c7') &&
  mcrImplementation.includes('Snapshot 68') && mcrImplementation.includes('CREATE_PRS') &&
  mcrImplementation.includes('Do not merge the staging branch itself')
);
add('central QA: MCR1 protects causes, evidence, default uncertainty, articles, discovery, privacy and 1280/390/360 layouts',
  mcrQa.includes('toHaveLength(12)') && mcrQa.includes('toHaveLength(73)') &&
  mcrQa.includes('Treasury default stress') && mcrQa.includes('same-origin reviewed static data') &&
  mcrQa.includes('four Batch-1 Learn pages') && mcrQa.includes('[1280,390,360]') &&
  mcrQa.includes('nine-core homepage')
);


// SEO3-MCR1 Batch 2 - Bond Yields, Equities & Gold Search Cluster - Snapshot 69 - 2026-10-15.
const mcrB2Names = [
  'why-do-stocks-fall-when-bond-yields-rise.html',
  'what-happens-to-gold-when-interest-rates-rise.html',
  'what-happens-to-gold-when-dollar-rises.html'
];
const mcrB2Pages = mcrB2Names.map(name => read('draw004.github.io/' + name));
const mcrB2Spec = read('draw004.github.io/docs/CARROWMONT_SEO3_MCR1_BATCH2_BOND_EQUITIES_GOLD_SEARCH_CLUSTER_SPEC_FINAL.md');
const mcrB2Implementation = read('draw004.github.io/docs/CARROWMONT_SEO3_MCR1_BATCH2_BOND_EQUITIES_GOLD_SEARCH_CLUSTER_IMPLEMENTATION.md');
const mcrB2Qa = fs.readFileSync(new URL('../tests/28-mcr1-batch2-bond-equities-gold.spec.js', import.meta.url), 'utf8');
add('MCR1 Batch 2: three focused bond/equity/gold pages are canonical, substantive and globally neutral',
  mcrB2Pages.every((page,i) =>
    page.includes('data-cm-learn-article="1"') && page.includes('data-cm-mcr-learn="1"') &&
    page.includes('class="guide-answer"') && page.includes('data-cm-depth="1"') && page.includes('Chain Breaker') &&
    page.includes('Frequently asked questions') && page.includes('class="reference-note"') &&
    page.includes('href="/market-chain-reaction-explorer.html#') && Boolean(jsonLdNode(page,'Article')) && Boolean(jsonLdNode(page,'BreadcrumbList')) &&
    page.includes(`https://carrowmont.com/${mcrB2Names[i]}`) && !/₹|\blakhs?\b|\bcrores?\b/i.test(learnMainVisibleText(page)) &&
    learnMainVisibleText(page).split(/\s+/).filter(Boolean).length > 1000
  )
);
add('MCR1 Batch 2: focused pages protect mechanism-vs-tendency terminology and gold multi-factor nuance',
  mcrB2Pages[0].includes('mechanical inverse price/yield relationship') && mcrB2Pages[0].includes('do <em>not</em> automatically mean falling stocks') &&
  mcrB2Pages[1].includes('<strong>real yields</strong>') && mcrB2Pages[1].includes('policy-rate increase does not mechanically make gold fall') &&
  mcrB2Pages[2].includes('relationship is not mechanical') && mcrB2Pages[2].includes('local-currency gold') &&
  mcrB2Pages.every(page => !/\b(?:buy now|sell now|will definitely|guaranteed return)\b/i.test(learnMainVisibleText(page)))
);
add('MCR1 Batch 2: Learn, Explorer and existing authority pages form a deliberate internal-link network',
  mcrB2Names.every(name => mcrHub.includes(`href="/${name}"`) && mcrHtml.includes(`href="/${name}"`)) &&
  read('draw004.github.io/what-happens-when-bond-yields-rise.html').includes('href="/why-do-stocks-fall-when-bond-yields-rise.html"') &&
  read('draw004.github.io/what-happens-when-bond-yields-rise.html').includes('href="/what-happens-to-gold-when-interest-rates-rise.html"') &&
  read('draw004.github.io/what-happens-when-dollar-strengthens.html').includes('href="/what-happens-to-gold-when-dollar-rises.html"') &&
  read('draw004.github.io/stocks-vs-bonds.html').includes('href="/why-do-stocks-fall-when-bond-yields-rise.html"') &&
  read('draw004.github.io/gold-as-an-investment.html').includes('href="/what-happens-to-gold-when-interest-rates-rise.html"') &&
  read('draw004.github.io/gold-macro-stress-explorer.html').includes('href="/what-happens-to-gold-when-dollar-rises.html"')
);
add('MCR1 Batch 2: sitemap publishes only canonical new pages with 2026-10-15 freshness',
  mcrB2Names.every(name => sitemapLastmods.get('https://carrowmont.com/'+name)==='2026-10-15') &&
  !/<loc>[^<]*#event=/.test(learnSitemap)
);
add('MCR1 Batch 2: specification and implementation lock Snapshot 69 and the controlled release path',
  mcrB2Spec.includes('Specification — FINAL') && mcrB2Spec.includes('Snapshot 69') &&
  mcrB2Spec.includes('0d9ee6e436660d00a6ce0bc6859363da8031ce53') && mcrB2Spec.includes('d96117032795c0fc2a4aa1d978747d37b946e334') &&
  mcrB2Implementation.includes('Snapshot 69') && mcrB2Implementation.includes('CREATE_PRS') && mcrB2Implementation.includes('Do not merge the staging branch itself')
);
add('central QA: MCR1 Batch 2 protects focused intent, authority links, sitemap and 1280/390/360 layouts',
  mcrB2Qa.includes('three focused pages') && mcrB2Qa.includes('focused intent ownership') &&
  mcrB2Qa.includes('authority pages') && mcrB2Qa.includes('[1280,390,360]') && mcrB2Qa.includes('nine-core homepage')
);


// CORE9 Loan / EMI Calculator - Snapshot 76 implementation - 2026-10-17.
const loanSpec = read('draw004.github.io/docs/CARROWMONT_CORE9_LOAN_EMI_CALCULATOR_SPEC_FINAL.md');
const loanHtml = read('loan-calculator/index.html');
const loanCore = read('loan-calculator/core.js');
const loanApp = read('loan-calculator/app.js');
const loanStyles = read('loan-calculator/styles.css');
const loanPdf = read('loan-calculator/loan-pdf-renderer.js');
const loanReportStandard = read('loan-calculator/report-standard.js');
const loanState = read('loan-calculator/shared-plan-state.js');
const loanBridge = read('loan-calculator/shared-plan-bridge.js');
const loanQa = fs.readFileSync(new URL('../tests/30-core9-loan-emi.spec.js', import.meta.url), 'utf8');
const loanSmokeQa = fs.readFileSync(new URL('../tests/01-smoke.spec.js', import.meta.url), 'utf8');
const loanQaConfig = fs.readFileSync(new URL('../qa.config.js', import.meta.url), 'utf8');
const loanWorkflow = readQa('.github/workflows/carrowmont-qa.yml');
const loanTools = read('draw004.github.io/tools.html');
const loanSitemap = read('draw004.github.io/sitemap.xml');
const loanDebtGuide = read('draw004.github.io/debt-snowball-vs-avalanche.html');

let LoanCore = null;
try {
  const sandbox={window:{}}; vm.createContext(sandbox); vm.runInContext(loanCore,sandbox); LoanCore=sandbox.window.CarrowmontLoanCore;
} catch {}
const loanStd = LoanCore?.calculate?.({mode:'payment',principal:500000,targetPayment:12000,annualRate:10,termYears:5,termMonths:0,firstPaymentDate:'',fixedFee:0,percentageFee:0,extraMonthly:0,oneTimeExtra:0,oneTimeMonth:12});
const loanExpected = 500000*(0.10/12)*Math.pow(1+0.10/12,60)/(Math.pow(1+0.10/12,60)-1);
const loanZero = LoanCore?.calculate?.({mode:'payment',principal:12000,targetPayment:1000,annualRate:0,termYears:1,termMonths:0,firstPaymentDate:'',fixedFee:0,percentageFee:0,extraMonthly:0,oneTimeExtra:0,oneTimeMonth:12});
const loanReverse = LoanCore?.calculate?.({mode:'principal',principal:0,targetPayment:12000,annualRate:10,termYears:5,termMonths:0,firstPaymentDate:'',fixedFee:0,percentageFee:0,extraMonthly:0,oneTimeExtra:0,oneTimeMonth:12});
const loanReverseExpected = 12000*(1-Math.pow(1+0.10/12,-60))/(0.10/12);
const loanLong = LoanCore?.calculate?.({mode:'payment',principal:1000000,targetPayment:12000,annualRate:0.01,termYears:50,termMonths:0,firstPaymentDate:'',fixedFee:0,percentageFee:0,extraMonthly:0,oneTimeExtra:0,oneTimeMonth:12});
const loanFees = LoanCore?.calculate?.({mode:'payment',principal:500000,targetPayment:12000,annualRate:10,termYears:5,termMonths:0,firstPaymentDate:'',fixedFee:5000,percentageFee:2,extraMonthly:0,oneTimeExtra:0,oneTimeMonth:12});
const loanExtra = LoanCore?.calculate?.({mode:'payment',principal:500000,targetPayment:12000,annualRate:10,termYears:5,termMonths:0,firstPaymentDate:'',fixedFee:0,percentageFee:0,extraMonthly:2000,oneTimeExtra:50000,oneTimeMonth:12});

add('CORE9 loan: approved specification, canonical indexable shell and one-H1 identity are present',
  loanSpec.includes('Loan / EMI Calculator') && loanSpec.includes('Snapshot 75') && loanSpec.includes('post-bootstrap snapshot') &&
  loanHtml.includes('<title>Loan &amp; EMI Calculator | Carrowmont</title>') &&
  loanHtml.includes('<link rel="canonical" href="https://carrowmont.com/loan-calculator/"') &&
  loanHtml.includes('<meta name="robots" content="index,follow"') &&
  (loanHtml.match(/<h1\b/g)||[]).length===1 && loanHtml.includes('See what a loan could cost each month.') &&
  loanHtml.includes('data-carrowmont-tool="loan-calculator"')
);
add('CORE9 loan: deterministic engine anchors standard, zero-rate, reverse-principal and final-balance formulas',
  Boolean(LoanCore) && loanStd?.ok && Math.abs(loanStd.scheduledPayment-loanExpected)<1e-7 && loanStd.payoffMonths===60 &&
  Math.abs(loanStd.schedule.at(-1).endingBalance)<1e-6 && loanZero?.ok && Math.abs(loanZero.scheduledPayment-1000)<1e-9 &&
  loanReverse?.ok && Math.abs(loanReverse.principal-loanReverseExpected)<1e-7 && Math.abs(loanReverse.scheduledPayment-12000)<1e-9 &&
  loanLong?.ok && loanLong.schedule.length===600 && Math.abs(loanLong.schedule.at(-1).endingBalance)<1e-8
);
add('CORE9 loan: entered fees remain separate while extra payments save modeled interest and time',
  loanFees?.ok && Math.abs(loanFees.fees-15000)<1e-7 && Math.abs(loanFees.totalCostIncludingFees-(loanFees.totalRepayment+15000))<1e-6 &&
  loanExtra?.ok && loanExtra.totalInterest<loanStd.totalInterest && loanExtra.payoffMonths<loanStd.payoffMonths &&
  Math.abs(loanExtra.schedule.at(-1).endingBalance)<1e-6 && loanExtra.schedule.every(row=>row.endingBalance>=0)
);
add('CORE9 loan: UI supports payment/reverse modes, fees, extras, chart, amortization table, CSV and Copy Summary',
  loanHtml.includes('id="paymentModeBtn"') && loanHtml.includes('id="principalModeBtn"') &&
  ['fixedFee','percentageFee','extraMonthly','oneTimeExtra','oneTimeMonth','balanceChart','amortizationTableBody','copySummaryBtn','csvBtn','reportBtn'].every(id=>loanHtml.includes(`id="${id}"`)) &&
  loanApp.includes('function renderChart(') && loanApp.includes('function summaryText()') && loanApp.includes('carrowmont-loan-amortization.csv') &&
  loanApp.includes('window.CarrowmontLoanPdf.download(lastResult')
);
add('CORE9 loan: shared header uses the SIP-aligned desktop/mobile geometry and is protected by central layout QA',
  loanStyles.includes('Carrowmont shared tool-header alignment polish - Snapshot 77') &&
  loanStyles.includes('.site-header .container{width:min(1480px,calc(100% - 64px));margin:auto}') &&
  loanStyles.includes('.site-header #localeSummary{box-sizing:border-box;height:44px;min-height:44px;max-height:44px}') &&
  loanStyles.includes('.site-header .locale-menu summary{appearance:none;-webkit-appearance:none;list-style:none;border:1px solid #c8dae4;border-radius:999px') &&
  sharedLayoutQa.includes("const loan = await metric('/loan-calculator/');") &&
  sharedLayoutQa.includes("Loan:'/loan-calculator/'") &&
  sharedLayoutQa.includes("page.locator('.site-header > .container.header-inner').evaluate") &&
  sharedLayoutQa.includes("document.querySelector('.site-header > .container.header-inner')") &&
  !sharedLayoutQa.includes("page.locator('.site-header .container').evaluate")
);
add('CORE9 loan: visitor runtime avoids lender APIs, eligibility logic and regulated-APR claims',
  !/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon\s*\(/.test(loanCore+loanApp+loanPdf) &&
  !/lender api|credit bureau|eligibility score/i.test(loanCore+loanApp) &&
  loanHtml.includes('Fees are not APR') && loanPdf.includes('not a regulated APR') && loanPdf.includes('It is not lender eligibility')
);
add('CORE9 loan: report uses the shared standard, annual amortization and Continue Planning with loan as current tool',
  loanHtml.indexOf('report-standard.js')>=0 && loanHtml.indexOf('loan-pdf-renderer.js')>loanHtml.indexOf('report-standard.js') &&
  loanPdf.includes('Loan / EMI Planning Report') && loanPdf.includes('Annual Amortization Summary') &&
  loanPdf.includes("currentTool:'loan'") && loanPdf.includes("filename:'carrowmont-loan-emi-report.pdf'") &&
  loanReportStandard.includes("key:'loan'") && loanReportStandard.includes("url:'carrowmont.com/loan-calculator/'")
);
add('CORE9 loan: shared report, plan-state and bridge files remain byte-identical across the nine core tools',
  standards.length===9 && standards.every(x=>x===loanReportStandard) &&
  sharedStateCopies.length===9 && sharedStateCopies.every(x=>x===loanState) &&
  sharedBridgeCopies.length===9 && sharedBridgeCopies.every(x=>x===loanBridge)
);
add('CORE9 loan: homepage and Tools Hub expose nine core tools while the directory contains nineteen total tools',
  mainHome.includes('data-core-tool-count="9"') && mainHome.includes('data-tool-id="loan"') && mainHome.includes('href="/loan-calculator/"') &&
  (mainHome.match(/data-tool-id=/g)||[]).length===9 &&
  loanTools.includes('data-directory-tool="loan"') && loanTools.includes('href="/loan-calculator/"') &&
  (loanTools.match(/data-directory-tool=/g)||[]).length===9 && (loanTools.match(/class="directory-tool-card/g)||[]).length===19 &&
  /"numberOfItems"\s*:\s*19/.test(loanTools)
);
add('CORE9 loan: country-demand profiles contain nine unique core IDs and loan terminology is country-aware without changing math',
  ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11'].every(profile=>{
    const m=mainSiteJs.match(new RegExp(`${profile}:\\s*Object\\.freeze\\(\\[([^\\]]+)\\]`));
    if(!m) return false;
    const ids=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
    return ids.length===9 && new Set(ids).size===9 && ids.includes('loan');
  }) && mainSiteJs.includes('function loanIdentity(') && mainSiteJs.includes('EMI Calculator') && mainSiteJs.includes('Loan Repayment Calculator')
);
add('CORE9 loan: sitemap and debt-learning journey publish one crawlable canonical loan route with current freshness',
  (loanSitemap.match(/<loc>https:\/\/carrowmont\.com\/loan-calculator\/<\/loc>/g)||[]).length===1 &&
  ((loanSitemap.match(/<loc>https:\/\/carrowmont\.com\/loan-calculator\/<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-17' &&
  (loanSitemap.match(/<loc>/g)||[]).length>=107 && loanDebtGuide.includes('href="/loan-calculator/"')
);
add('CORE9 loan: central QA registry, live-route preflight and dedicated browser tests protect the calculator',
  loanQaConfig.includes("key: 'loan-calculator'") && loanQaConfig.includes("path: '/loan-calculator/'") &&
  loanWorkflow.includes('/loan-calculator/') && loanQa.includes('standard payment fixture') && loanQa.includes('reverse principal formula') &&
  loanQa.includes('country controls loan terminology') && loanQa.includes('[1440, 390, 360]') && loanQa.includes('homepage, tools directory, sitemap and debt Learn guide')
);
add('CORE9 loan: smoke QA validates country-aware report CTA by selector instead of one static localized label',
  loanQaConfig.includes("requiredText: ['Copy Summary', 'Download CSV']") &&
  loanQaConfig.includes('reportButtonText: /^(?:Generate EMI \\/ Loan Report') &&
  loanQaConfig.includes('Generate Loan Repayment Report') &&
  loanQaConfig.includes('Generate Loan \\/ EMI Report') &&
  loanSmokeQa.includes('if (tool.reportButton)') && loanSmokeQa.includes('if (tool.reportButtonText)') &&
  loanSmokeQa.includes('toHaveText(tool.reportButtonText)')
);

const loanRegressionQa = [
  fs.readFileSync(new URL('../tests/13-learn-localization.spec.js', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../tests/26-rent-vs-buy-calculator.spec.js', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../tests/27-market-chain-reaction-explorer.spec.js', import.meta.url), 'utf8'),
  fs.readFileSync(new URL('../tests/28-mcr1-batch2-bond-equities-gold.spec.js', import.meta.url), 'utf8')
].join('\n');
add('CORE9 loan: legacy browser invariants are migrated from CORE8 counts before staged QA',
  loanRegressionQa.includes("'loan'") && loanRegressionQa.includes('toHaveCount(19)') &&
  loanRegressionQa.includes('nine-core homepage') && loanRegressionQa.includes('[data-core-tool-count="9"]') &&
  !loanRegressionQa.includes('[data-core-tool-count="8"]') && !loanRegressionQa.includes('toHaveCount(16)')
);


// GSEO2A: Privacy-first visitor runtime and no-consent analytics architecture - Snapshot 83 implementation.
const privacyAnalyticsRepos = [
  'budget-cash-flow-planner',
  'compound-interest-calculator',
  'financial-independence',
  'goal-planner',
  'inflation-calculator',
  'loan-calculator',
  'mortgage-payoff-calculator',
  'retirement-calculator',
  'sip-calculator'
];
const privacyAnalyticsCopies = privacyAnalyticsRepos.map(dir => read(`${dir}/analytics.js`));
const privacyAnalytics = privacyAnalyticsCopies[0];
const privacyPolicyHtml = read('draw004.github.io/privacy.html');
const privacyMainSiteJs = read('draw004.github.io/site.js');
const privacyRetirementPolicy = read('retirement-calculator/privacy.html');
const privacyFiGuideJs = read('draw004.github.io/financial-independence-number-by-spending.js');
const privacyFiApp = read('financial-independence/app.js');
const privacyInflationSite = read('inflation-calculator/site.js');
const privacyRetirementSite = read('retirement-calculator/site.js');
const privacyInflationConfig = read('inflation-calculator/site-config.js');
const privacyRetirementConfig = read('retirement-calculator/site-config.js');
const privacyHelper = fs.readFileSync(new URL('../helpers/common.js', import.meta.url), 'utf8');
const privacyQa = fs.readFileSync(new URL('../tests/31-privacy-analytics-trust.spec.js', import.meta.url), 'utf8');
const privacyFiQa = fs.readFileSync(new URL('../tests/09-fi-number-by-spending.spec.js', import.meta.url), 'utf8');
const forbiddenGaRuntime = /googletagmanager\.com|google-analytics\.com|gtag\s*\(|G-[A-Z0-9]{10}\b|carrowmont_analytics_consent/;

add('GSEO2A privacy: all nine tool repositories share one Cloudflare-only compatibility analytics implementation',
  privacyAnalyticsCopies.length===9 && privacyAnalyticsCopies.every(x=>x===privacyAnalytics) &&
  privacyAnalytics.includes('static.cloudflareinsights.com/beacon.min.js') &&
  privacyAnalytics.includes('provider: "cloudflare-aggregate"') &&
  privacyAnalytics.includes('track() {}') &&
  !forbiddenGaRuntime.test(privacyAnalytics)
);
add('GSEO2A privacy: main-site runtime has no consent popup or Google Analytics and retains aggregate Cloudflare measurement only',
  privacyMainSiteJs.includes('static.cloudflareinsights.com/beacon.min.js') &&
  privacyMainSiteJs.includes('provider: "cloudflare-aggregate"') &&
  !privacyMainSiteJs.includes('carrowmontAnalyticsConsent') &&
  !privacyMainSiteJs.includes('Analytics settings') &&
  !privacyMainSiteJs.includes('Continue without Google Analytics') &&
  !privacyMainSiteJs.includes('Allow Google Analytics') &&
  !forbiddenGaRuntime.test(privacyMainSiteJs)
);
add('GSEO2A privacy: visitor configuration and legacy site loaders contain no Google Analytics escape hatch',
  !forbiddenGaRuntime.test(privacyInflationSite) && !forbiddenGaRuntime.test(privacyRetirementSite) &&
  !privacyInflationConfig.includes('GA_MEASUREMENT_ID') && !privacyRetirementConfig.includes('GA_MEASUREMENT_ID') &&
  privacyInflationSite.includes('Analytics is handled only by analytics.js') &&
  privacyRetirementSite.includes('Analytics is handled only by analytics.js')
);
add('GSEO2A privacy: policy uses simple financial-data language and has no analytics-consent controls',
  privacyPolicyHtml.includes('Privacy by default:') &&
  privacyPolicyHtml.includes('<h2>Your financial information</h2>') &&
  privacyPolicyHtml.includes('Carrowmont does not use those financial values for advertising, profiling or website analytics.') &&
  privacyPolicyHtml.includes('<h2>Website analytics</h2>') &&
  privacyPolicyHtml.includes('Cloudflare Web Analytics') &&
  !/Google Analytics|Analytics settings|carrowmontAnalyticsConsent/.test(privacyPolicyHtml) &&
  privacyRetirementPolicy.includes('The financial assumptions you enter are processed in your browser.') &&
  !privacyRetirementPolicy.includes('does not intentionally transmit')
);
add('GSEO2A privacy: FI handoff keeps financial values out of newly generated URLs and scrubs the legacy query handoff',
  privacyFiGuideJs.includes("const FI_HANDOFF_KEY = 'carrowmont_fi_spending_handoff_v2';") &&
  privacyFiGuideJs.includes("const href = '/financial-independence/?cm_handoff=fi_spending_v2';") &&
  privacyFiGuideJs.includes('window.sessionStorage.setItem(FI_HANDOFF_KEY, JSON.stringify(payload))') &&
  !privacyFiGuideJs.includes("spendingMonthly: String(monthly)") &&
  privacyFiApp.includes("const FI_SPENDING_HANDOFF_KEY='carrowmont_fi_spending_handoff_v2';") &&
  privacyFiApp.includes("if(handoff==='fi_spending_v2')") &&
  privacyFiApp.includes("window.sessionStorage.removeItem(FI_SPENDING_HANDOFF_KEY)") &&
  privacyFiApp.includes("else if(handoff==='fi_spending_v1')") &&
  privacyFiApp.includes('scrubFinancialHandoffUrl();')
);
add('GSEO2A privacy: browser QA forbids the old popup and GA network while preserving legacy financial handoff cleanup',
  privacyQa.includes('first visit has no analytics popup and never loads Google Analytics') &&
  privacyQa.includes('googletagmanager\\.com|google-analytics\\.com') &&
  privacyQa.includes("toHaveCount(0)") &&
  privacyQa.includes("provider: 'cloudflare-aggregate'") &&
  privacyQa.includes('privacy policy explains financial-data protection in simple language') &&
  privacyQa.includes('legacy FI query handoff is consumed and financial values are scrubbed') &&
  privacyFiQa.includes('without putting financial values in the URL') &&
  privacyFiQa.includes("cm_handoff=fi_spending_v2") &&
  !privacyFiQa.includes("spendingMonthly=125000")
);

// GSEO2A: Sitewide search discoverability contract for every public tool and Learn article.
const gseo2aToolsHtml = read('draw004.github.io/tools.html');
const gseo2aLearnHub = read('draw004.github.io/learn.html');
const gseo2aSitemap = read('draw004.github.io/sitemap.xml');
const gseo2aCollection = jsonLdNode(gseo2aToolsHtml, 'CollectionPage');
const gseo2aToolItems = gseo2aCollection?.mainEntity?.itemListElement || [];
const gseo2aMetaContent = (html, name) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([:\w-]+)=["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
    if ((attrs.name || '').toLowerCase() === name.toLowerCase()) return attrs.content || '';
  }
  return '';
};
const gseo2aCanonical = html => {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([:\w-]+)=["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
    if ((attrs.rel || '').toLowerCase() === 'canonical') return attrs.href || '';
  }
  return '';
};
const gseo2aTitle = html => ((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
const gseo2aH1Count = html => (html.match(/<h1\b/gi) || []).length;
const gseo2aResolveUrl = url => {
  let pathname='';
  try { pathname = new URL(url).pathname; } catch { return ''; }
  const repoRoutes = [
    ['/sip-calculator/', 'sip-calculator'],
    ['/goal-planner/', 'goal-planner'],
    ['/financial-independence/', 'financial-independence'],
    ['/inflation-calculator/', 'inflation-calculator'],
    ['/retirement-calculator/', 'retirement-calculator'],
    ['/budget-cash-flow-planner/', 'budget-cash-flow-planner'],
    ['/mortgage-payoff-calculator/', 'mortgage-payoff-calculator'],
    ['/compound-interest-calculator/', 'compound-interest-calculator'],
    ['/loan-calculator/', 'loan-calculator']
  ];
  for (const [prefix, repo] of repoRoutes) {
    if (!pathname.startsWith(prefix)) continue;
    const rel = pathname.slice(prefix.length);
    return `${repo}/${rel || 'index.html'}`;
  }
  const rel = pathname.replace(/^\//,'') || 'index.html';
  return `draw004.github.io/${rel}`;
};
const gseo2aToolChecks = gseo2aToolItems.map(item => {
  const url = item?.url || item?.item?.url || item?.item || '';
  const file = gseo2aResolveUrl(url);
  const html = read(file);
  const robots = gseo2aMetaContent(html, 'robots').toLowerCase();
  return {
    url, file,
    ok: Boolean(html) && Boolean(gseo2aTitle(html)) && Boolean(gseo2aMetaContent(html, 'description')) &&
      gseo2aCanonical(html) === url && robots.includes('index') && robots.includes('follow') &&
      gseo2aH1Count(html) === 1 && gseo2aSitemap.includes(`<loc>${url}</loc>`)
  };
});
add('GSEO2A search: all 19 Tools Hub destinations have crawlable title, description, canonical, robots, one H1 and sitemap coverage',
  gseo2aToolItems.length === 19 && gseo2aToolChecks.every(x=>x.ok),
  gseo2aToolChecks.filter(x=>!x.ok).map(x=>`${x.url} -> ${x.file}`).join('; ')
);

const gseo2aMainDir = path.join(root, 'draw004.github.io');
const gseo2aRootHtmlFiles = fs.readdirSync(gseo2aMainDir).filter(name => name.endsWith('.html'));
const gseo2aEscapeRe = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const gseo2aInboundCounts = gseo2aToolItems.map(item => {
  const url = item?.url || item?.item?.url || item?.item || '';
  let pathname = '';
  try { pathname = new URL(url).pathname; } catch {}
  const target = gseo2aEscapeRe(pathname);
  const pattern = target ? new RegExp(`href=["']${target}(?:[?#][^"']*)?["']`, 'i') : null;
  const sources = pattern ? gseo2aRootHtmlFiles.filter(name => pattern.test(read(`draw004.github.io/${name}`))) : [];
  return { url, count: sources.length, sources };
});
add('GSEO2A search: every live Tools Hub destination has at least five contextual main-site discovery paths',
  gseo2aInboundCounts.length === 19 && gseo2aInboundCounts.every(x => x.count >= 5),
  gseo2aInboundCounts.filter(x => x.count < 5).map(x => `${x.url}=${x.count}`).join('; ')
);
const gseo2aLearnFiles = fs.readdirSync(gseo2aMainDir).filter(name => name.endsWith('.html')).filter(name => {
  const html = read(`draw004.github.io/${name}`);
  return html.includes('data-cm-learn-article="1"');
});
const gseo2aLearnChecks = gseo2aLearnFiles.map(name => {
  const html = read(`draw004.github.io/${name}`);
  const url = `https://carrowmont.com/${name}`;
  const robots = gseo2aMetaContent(html, 'robots').toLowerCase();
  const article = jsonLdNode(html, 'Article');
  return {
    name,
    title: gseo2aTitle(html),
    canonical: gseo2aCanonical(html),
    ok: Boolean(gseo2aTitle(html)) && Boolean(gseo2aMetaContent(html, 'description')) &&
      gseo2aCanonical(html) === url && robots.includes('index') && robots.includes('follow') &&
      gseo2aH1Count(html) === 1 && html.includes('guide-answer') && article?.mainEntityOfPage === url &&
      gseo2aLearnHub.includes(`href="/${name}"`) && gseo2aSitemap.includes(`<loc>${url}</loc>`)
  };
});
const gseo2aLearnTitles = gseo2aLearnChecks.map(x=>x.title.toLowerCase());
const gseo2aLearnCanonicals = gseo2aLearnChecks.map(x=>x.canonical);
add('GSEO2A search: every Learn article is indexable, independently useful, linked from Learn hub and covered by sitemap',
  gseo2aLearnFiles.length >= 75 && gseo2aLearnChecks.every(x=>x.ok) &&
  new Set(gseo2aLearnTitles).size === gseo2aLearnTitles.length &&
  new Set(gseo2aLearnCanonicals).size === gseo2aLearnCanonicals.length,
  gseo2aLearnChecks.filter(x=>!x.ok).map(x=>x.name).join(', ')
);
add('GSEO2A search: SIP, SWP, retirement and loan intents remain explicit while localization cannot erase the static search identity',
  sipHtml.includes('<title>SIP Calculator &amp; Recurring Investment Calculator | Carrowmont</title>') &&
  sipHtml.includes('<strong>SIP means Systematic Investment Plan.</strong>') &&
  read('sip-calculator/terminology.js').includes("closest?.('[data-cm-search-identity]')") &&
  read('retirement-calculator/withdrawal-calculator.html').includes('<title>SWP, Retirement Withdrawal &amp; Drawdown Calculator | Carrowmont</title>') &&
  read('retirement-calculator/withdrawal-calculator.html').includes('Systematic Withdrawal Plan (SWP)') &&
  gseoRetirementLandingHtml.includes('<title>Retirement Calculator &amp; Retirement Planner | Carrowmont</title>') &&
  gseoRetirementPlannerHtml.includes('<title>Detailed Retirement Planner | Carrowmont</title>') &&
  read('loan-calculator/index.html').includes('href="/how-is-loan-emi-calculated.html"') &&
  read('loan-calculator/index.html').includes('href="/loan-interest-rate-vs-term.html"') &&
  read('draw004.github.io/how-is-loan-emi-calculated.html').includes('href="/loan-calculator/"') &&
  read('draw004.github.io/loan-interest-rate-vs-term.html').includes('href="/loan-calculator/"')
);

const gseo2aToolsHubQa = fs.readFileSync(new URL('../tests/12-tools-hub.spec.js', import.meta.url), 'utf8');
const gseo2aSearchQa = fs.readFileSync(new URL('../tests/33-gseo2a-sitewide-search-visibility.spec.js', import.meta.url), 'utf8');
add('GSEO2A regression: Publisher browser expectations are migrated for 19 tools, current sitemap freshness, duplicate contextual CTAs and repeated Learn-hub viewport checks',
  gseo2aToolsHubQa.includes('exposes nineteen live tools') &&
  gseo2aToolsHubQa.includes("'/retirement-calculator/withdrawal-calculator.html'") &&
  gseo2aToolsHubQa.includes('itemListElement).toHaveLength(19)') &&
  gseo2aToolsHubQa.includes("match[1] >= '2026-10-19'") &&
  !gseo2aToolsHubQa.includes('itemListElement).toHaveLength(17)') &&
  (gseo2aSearchQa.match(/\.first\(\)\)\.toBeVisible\(\);/g)||[]).length >= 2 &&
  !gseo2aSearchQa.includes("gotoClean(page, '/learn.html#loans-and-debt')") &&
  gseo2aSearchQa.includes("window.location.hash = 'loans-and-debt'") &&
  read('draw004.github.io/sequence-of-returns-risk.html').includes('<div class="guide-note"><strong>Model a retirement withdrawal path:</strong>') &&
  read('draw004.github.io/sequence-of-returns-risk.html').includes('.gseo2a-wrap-link{color:var(--teal-dark);font-weight:900;white-space:normal;overflow-wrap:anywhere;word-break:normal}') &&
  read('draw004.github.io/sequence-of-returns-risk.html').includes('class="gseo2a-wrap-link" href="/retirement-calculator/withdrawal-calculator.html"') &&
  read('draw004.github.io/sequence-of-returns-risk.html').includes('class="gseo2a-wrap-link" href="/what-is-swp-systematic-withdrawal-plan.html"') &&
  !read('draw004.github.io/sequence-of-returns-risk.html').includes('<span class="action-label">MODEL A RETIREMENT WITHDRAWAL PATH</span>')
);

// RETIRE1 Retirement Withdrawal / Drawdown / SWP Calculator - Snapshot 80 production implementation - 2026-10-17.
const retire1Spec = read('draw004.github.io/docs/CARROWMONT_RETIRE1_RETIREMENT_WITHDRAWAL_DRAWDOWN_SWP_CALCULATOR_SPEC_FINAL.md');
const retire1Html = read('retirement-calculator/withdrawal-calculator.html');
const retire1Css = read('retirement-calculator/withdrawal-calculator.css');
const retire1Core = read('retirement-calculator/withdrawal-core.js');
const retire1App = read('retirement-calculator/withdrawal-calculator.js');
const retire1Pdf = read('retirement-calculator/withdrawal-pdf-renderer.js');
const retire1PlannerHtml = read('retirement-calculator/planner.html');
const retire1PlannerApp = read('retirement-calculator/app.js');
const retire1ToolSitemap = read('retirement-calculator/sitemap.xml');
const retire1MainSitemap = read('draw004.github.io/sitemap.xml');
const retire1Tools = read('draw004.github.io/tools.html');
const retire1MainJs = read('draw004.github.io/site.js');
const retire1LongevityLearn = read('draw004.github.io/how-long-will-retirement-savings-last.html');
const retire1SequenceLearn = read('draw004.github.io/sequence-of-returns-risk.html');
const retire1SwpLearn = read('draw004.github.io/what-is-swp-systematic-withdrawal-plan.html');
const retire1Qa = fs.readFileSync(new URL('../tests/32-retirement-withdrawal-drawdown.spec.js', import.meta.url), 'utf8');
const retire1SmokeQa = fs.readFileSync(new URL('../tests/01-smoke.spec.js', import.meta.url), 'utf8');
const retire1MortgageQa = fs.readFileSync(new URL('../tests/23-mortgage-localization-shared-plan-hotfix.spec.js', import.meta.url), 'utf8');
const retire1Helper = fs.readFileSync(new URL('../helpers/common.js', import.meta.url), 'utf8');
const retire1Workflow = readQa('.github/workflows/carrowmont-qa.yml');

let Retire1Core = null;
try {
  const sandbox={window:{}}; vm.createContext(sandbox); vm.runInContext(retire1Core,sandbox); Retire1Core=sandbox.window.CarrowmontWithdrawalCore;
} catch {}
const retire1Zero = Retire1Core?.calculate?.({mode:'runway',startingBalance:12000,startingWithdrawal:1000,annualReturn:0,inflationLinked:false,withdrawalGrowth:0,timing:'beginning',maxMonths:1200,startAge:60,useAge:false,targetMonths:360,targetEndingBalance:0});
const retire1Support = Retire1Core?.calculate?.({mode:'support',startingBalance:120000,startingWithdrawal:0,annualReturn:0,inflationLinked:false,withdrawalGrowth:0,timing:'beginning',targetMonths:120,startAge:60,useAge:false,targetEndingBalance:0});
const retire1Step = Retire1Core?.simulate?.({mode:'runway',startingBalance:50000,startingWithdrawal:1000,annualReturn:0,inflationLinked:true,withdrawalGrowth:10,timing:'beginning',maxMonths:24,startAge:60,horizonMonths:24});
const retire1Preserve = Retire1Core?.calculate?.({mode:'support',startingBalance:1000000,startingWithdrawal:0,annualReturn:6,inflationLinked:false,withdrawalGrowth:0,timing:'beginning',targetMonths:360,startAge:60,useAge:false,targetEndingBalance:250000});

add('RETIRE1: approved specification and one canonical indexable retirement-family calculator are present',
  retire1Spec.includes('CARROWMONT RETIRE1') && retire1Spec.includes('withdrawal-calculator.html') &&
  retire1Html.includes('<title>SWP, Retirement Withdrawal &amp; Drawdown Calculator | Carrowmont</title>') &&
  retire1Html.includes('<link rel="canonical" href="https://carrowmont.com/retirement-calculator/withdrawal-calculator.html"') &&
  retire1Html.includes('<meta name="robots" content="index,follow"') &&
  (retire1Html.match(/<h1\b/g)||[]).length===1 && Boolean(jsonLdNode(retire1Html,'WebApplication'))
);
add('RETIRE1: deterministic monthly engine protects zero-return runway, reverse solve, annual withdrawal steps and target ending balance',
  Boolean(Retire1Core) && retire1Core.includes('Math.pow(1 + annual, 1 / 12) - 1') &&
  retire1Zero?.ok===true && retire1Zero.result?.depletionMonth===12 && Math.abs(retire1Zero.result?.totalWithdrawals-12000)<0.001 &&
  retire1Support?.ok===true && Math.abs(retire1Support.startingWithdrawal-1000)<0.001 &&
  Math.abs(retire1Step?.schedule?.[11]?.plannedWithdrawal-1000)<0.001 && Math.abs(retire1Step?.schedule?.[12]?.plannedWithdrawal-1100)<0.001 &&
  retire1Preserve?.ok===true && Math.abs(retire1Preserve.result?.endingBalance-250000)<0.01 &&
  retire1Core.includes('for (let i = 0; i < 96; i += 1)')
);
add('RETIRE1: UI owns two focused solve modes, sensitivity, chart, annual schedule, CSV, Copy Summary and report actions',
  retire1Html.includes('id="runwayModeBtn"') && retire1Html.includes('id="supportModeBtn"') &&
  retire1Html.includes('id="withdrawalBalanceChart"') && retire1Html.includes('Return sensitivity — not a forecast') &&
  retire1Html.includes('id="annualScheduleBody"') && retire1Html.includes('id="copyBtn"') && retire1Html.includes('id="csvBtn"') && retire1Html.includes('id="reportBtn"') &&
  retire1App.includes('function buildSummary()') && retire1App.includes('function downloadCsv()') && retire1App.includes('function generateReport()')
);
add('RETIRE1: country-aware terminology uses SWP, withdrawal and drawdown without changing the calculation engine',
  retire1App.includes("if (code === 'IN') return { title:'Retirement SWP / Withdrawal Calculator'") &&
  retire1App.includes("if (code === 'GB' || code === 'IE') return { title:'Retirement Drawdown Calculator'") &&
  retire1App.includes("if (code === 'US' || code === 'CA') return { title:'Retirement Withdrawal Calculator'") &&
  retire1App.includes("if (code === 'AU' || code === 'NZ') return { title:'Retirement Withdrawal Calculator'") &&
  retire1App.includes("title:'Retirement Withdrawal & Drawdown Calculator'") &&
  !/\bregion\b|\bcurrency\b/.test(retire1Core.match(/function simulate[\s\S]*?function annualSummary/)?.[0] || '')
);
add('RETIRE1: retirement-planner handoff is explicit, one-time, reviewable and keeps financial values out of the URL',
  retire1PlannerHtml.includes('id="withdrawalPlannerBtn"') && retire1PlannerHtml.includes('href="withdrawal-calculator.html"') &&
  retire1PlannerApp.includes("sessionStorage.setItem('carrowmont_retirement_withdrawal_handoff_v1'") &&
  retire1PlannerApp.includes("window.location.href = 'withdrawal-calculator.html'") &&
  retire1App.includes("const HANDOFF_KEY = 'carrowmont_retirement_withdrawal_handoff_v1';") &&
  retire1App.includes('sessionStorage.removeItem(HANDOFF_KEY)') &&
  retire1Html.includes('id="useProjectedImport"') && retire1Html.includes('id="useTargetImport"') && retire1Html.includes('id="dismissImport"') &&
  !retire1PlannerApp.includes('withdrawal-calculator.html?')
);
add('RETIRE1: report is driven from the calculator result and includes chart/sensitivity, full schedule, methodology and Continue Planning',
  retire1Pdf.includes("header(ctx,model,'Annual Withdrawal Schedule')") && retire1Pdf.includes('Return sensitivity — not a forecast') &&
  retire1Pdf.includes("S().guidePage({reportTitle:'Retirement Withdrawal Report'") &&
  retire1Pdf.includes("S().continuePlanningPage({currentTool:'retirement'") &&
  retire1Pdf.includes('return [summaryPage(model),chartPage(model),...schedulePages(model),guidePage(model),continuePage()]') &&
  retire1Html.indexOf('report-standard.js') < retire1Html.indexOf('withdrawal-pdf-renderer.js')
);
add('RETIRE1: Tools Hub and retirement Learn journeys expose the live secondary tool without adding another homepage core card',
  retire1Tools.includes('id="retirement-income-tools"') && retire1Tools.includes('data-secondary-tool="retirement-withdrawal"') &&
  retire1Tools.includes('href="/retirement-calculator/withdrawal-calculator.html"') &&
  /"numberOfItems"\s*:\s*19/.test(retire1Tools) && (retire1Tools.match(/class="directory-tool-card/g)||[]).length===19 &&
  retire1MainJs.includes('function retirementWithdrawalIdentity(') &&
  retire1LongevityLearn.includes('href="/retirement-calculator/withdrawal-calculator.html"') &&
  retire1LongevityLearn.includes('href="/what-is-swp-systematic-withdrawal-plan.html"') &&
  retire1SequenceLearn.includes('href="/retirement-calculator/withdrawal-calculator.html"') &&
  retire1SwpLearn.includes('SWP stands for Systematic Withdrawal Plan') && retire1SwpLearn.includes('href="/retirement-calculator/withdrawal-calculator.html"') &&
  mainHome.includes('data-core-tool-count="9"') && (mainHome.match(/data-tool-id=/g)||[]).length===9 && !mainHome.includes('data-tool-id="retirement-withdrawal"')
);
add('RETIRE1: both retirement and main sitemaps publish exactly one current canonical route and changed public discovery pages are fresh',
  (retire1ToolSitemap.match(/<loc>https:\/\/carrowmont\.com\/retirement-calculator\/withdrawal-calculator\.html<\/loc>/g)||[]).length===1 &&
  (retire1MainSitemap.match(/<loc>https:\/\/carrowmont\.com\/retirement-calculator\/withdrawal-calculator\.html<\/loc>/g)||[]).length===1 &&
  ((retire1MainSitemap.match(/<loc>https:\/\/carrowmont\.com\/retirement-calculator\/withdrawal-calculator\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-18' &&
  ((retire1MainSitemap.match(/<loc>https:\/\/carrowmont\.com\/tools\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-18' &&
  ((retire1MainSitemap.match(/<loc>https:\/\/carrowmont\.com\/how-long-will-retirement-savings-last\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-18' &&
  ((retire1MainSitemap.match(/<loc>https:\/\/carrowmont\.com\/sequence-of-returns-risk\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-18' &&
  ((retire1MainSitemap.match(/<loc>https:\/\/carrowmont\.com\/what-is-swp-systematic-withdrawal-plan\.html<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)||[])[1]||'') >= '2026-10-18' &&
  (retire1MainSitemap.match(/<loc>/g)||[]).length>=107
);

const retire1FooterRepos = [
  'draw004.github.io','sip-calculator','goal-planner','financial-independence','inflation-calculator',
  'retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator','compound-interest-calculator','loan-calculator'
];
const retire1FooterLocales = retire1FooterRepos.map(dir => read(`${dir}/locale.js`));
add('RETIRE1: permanent compact footer runtime is shared across every public calculator surface and capped at five gateway links',
  retire1FooterLocales.length===10 && retire1FooterLocales.every(src =>
    src.includes('Carrowmont compact footer gateways - RETIRE1') &&
    src.includes("region === 'IN' || region === 'AU' || region === 'NZ'") && src.includes("region === 'US' || region === 'CA' || region === 'GB' || region === 'IE'") &&
    src.includes("['/tools.html','All financial tools','footer-all-tools']") && src.includes("['/retirement-calculator/','Retirement Planner','footer-retirement-link']") &&
    src.includes("['/budget-cash-flow-planner/','Budget & Cash Flow Planner','footer-budget-link']") &&
    src.includes("col.dataset.cmCompactTools = '1'") && src.includes('col.appendChild(a)')
  )
);
add('RETIRE1: dedicated browser QA protects formulas, localization, explicit handoff, privacy-safe URLs, report, discovery, footer and 1280/390/360 layout',
  retire1Qa.includes('monthly engine handles zero return') && retire1Qa.includes('reverse solve reuses forward engine') &&
  retire1Qa.includes('country controls SWP, drawdown and withdrawal terminology') &&
  retire1Qa.includes('keeps financial values out of the URL') && retire1Qa.includes('five-page PDF report') &&
  retire1Qa.includes('Tools Hub, Learn journeys and sitemap') && retire1Qa.includes('compact footer stays at five localized gateways') &&
  retire1Qa.includes('[1280, 390, 360]')
);
add('RETIRE1: Publisher regression locks migrate legacy footer, Learn, mortgage and privacy browser expectations',
  retire1SmokeQa.includes('permanent five gateway links') &&
  retire1SmokeQa.includes("['/tools.html','/sip-calculator/','/retirement-calculator/','/mortgage-payoff-calculator/','/budget-cash-flow-planner/']") &&
  retire1MortgageQa.includes(".site-footer .footer-housing-gateway") &&
  retire1LongevityLearn.includes('class="guide-action-first"') && retire1LongevityLearn.includes('href="/retirement-calculator/"') &&
  retire1LongevityLearn.includes('href="/retirement-calculator/withdrawal-calculator.html"') &&
  retire1Css.includes('.withdrawal-page [hidden]{display:none!important}') &&
  retire1Qa.includes("toHaveTitle('SWP, Retirement Withdrawal & Drawdown Calculator | Carrowmont')") &&
  (retire1Qa.match(/getByRole\('heading', \{ name: 'Return sensitivity — not a forecast', exact: true \}\)/g)||[]).length===2 &&
  !retire1Qa.includes("getByText('Return sensitivity — not a forecast', { exact: true })") &&
  retire1Qa.includes("getByText('Constant-return illustration, not a forecast.', { exact: true })") &&
  retire1Qa.includes("expect(url.pathname).toBe('/retirement-calculator/withdrawal-calculator.html')") &&
  retire1Qa.includes("expect(url.search).toBe('')") && retire1Qa.includes("expect(url.hash).toBe('')")
);
add('RETIRE1: QA storage isolation preserves the one-time retirement handoff across the planner-to-withdrawal navigation',
  retire1Helper.includes("const retirementHandoffKey = 'carrowmont_retirement_withdrawal_handoff_v1';") &&
  retire1Helper.includes('const retirementHandoff = sessionStorage.getItem(retirementHandoffKey);') &&
  retire1Helper.includes('if (retirementHandoff) sessionStorage.setItem(retirementHandoffKey, retirementHandoff);') &&
  retire1Helper.includes("const privacyHandoffKey = 'carrowmont_fi_spending_handoff_v2';")
);
add('RETIRE1: handoff browser QA creates a valid calculated Planner state before expecting staged balances',
  retire1Qa.includes("await setLocale(page, 'US', 'USD');") &&
  retire1Qa.includes("await setInput(page, '#currentSavings', 500000);") &&
  retire1Qa.includes("await setInput(page, '#currentMonthlyInvestment', 2000);") &&
  retire1Qa.includes("await setInput(page, '#quickMonthlyExpense', 6000);") &&
  retire1Qa.includes("await expect(page.locator('#projectedCorpus')).not.toHaveText('—');") &&
  retire1Qa.includes("await expect(page.locator('#requiredCorpus')).not.toHaveText('—');")
);
add('RETIRE1-SWP1: static calculator HTML clearly owns SWP intent in simple language without pretending to model a specific mutual fund',
  retire1Html.includes('SWP, Retirement Withdrawal &amp; Drawdown Calculator | Carrowmont') &&
  retire1Html.includes('Systematic Withdrawal Plan (SWP)') && retire1Html.includes('In India, SWP is a common name') &&
  retire1Html.includes("It does not model a specific mutual fund's NAV, exit load, tax treatment or future return.") &&
  retire1Html.includes('\"alternateName\":[\"SWP Calculator\",\"Systematic Withdrawal Plan Calculator\"') &&
  retire1Html.includes('href="/what-is-swp-systematic-withdrawal-plan.html"')
);
add('RETIRE1-SWP1: dedicated Learn page owns the explanatory query and links back to the existing canonical calculator',
  retire1SwpLearn.includes('<title>What Is an SWP? Systematic Withdrawal Plan | Carrowmont</title>') &&
  (retire1SwpLearn.includes('rel="canonical" href="https://carrowmont.com/what-is-swp-systematic-withdrawal-plan.html"') ||
   retire1SwpLearn.includes('href="https://carrowmont.com/what-is-swp-systematic-withdrawal-plan.html" rel="canonical"'))
);
add('RETIRE1-SWP1: Learn page is substantive, decision-focused and avoids fund recommendations or guaranteed outcomes',
  retire1SwpLearn.length > 20000 && retire1SwpLearn.includes('An SWP is a withdrawal method, not a promise of income.') &&
  retire1SwpLearn.includes('What Carrowmont') && retire1SwpLearn.includes('does <strong>not</strong> model a particular mutual fund') &&
  retire1SwpLearn.includes('NISM: Understanding mutual funds') && retire1SwpLearn.includes('SEBI Investor: Exit Load') &&
  !/best mutual fund|top fund|guaranteed return|guaranteed income/i.test(retire1SwpLearn)
);
add('RETIRE1-SWP1: browser QA protects the static SWP search signals and the bidirectional calculator-Learn journey',
  retire1Qa.includes('Systematic Withdrawal Plan') && retire1Qa.includes('what-is-swp-systematic-withdrawal-plan.html') &&
  retire1Qa.includes('SWP stands for Systematic Withdrawal Plan') && retire1Qa.includes('does not model a specific mutual fund')
);

add('RETIRE1: visitor runtime remains deterministic and privacy-first with no live market API, tax engine or regulated safe-withdrawal claim',
  !/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon\s*\(/.test(retire1Core+retire1App+retire1Pdf) &&
  !/guaranteed safe|safe withdrawal guarantee|tax engine|pension provider api/i.test(retire1Core+retire1App) &&
  retire1App.includes('Constant-return assumptions do not predict real market paths') &&
  retire1App.includes('does not calculate pension tax') && retire1App.includes('does not automatically apply statutory pension')
);


// HOME1 Home Affordability / Mortgage Borrowing Power Calculator - Snapshot 86 production implementation - 2026-10-19.
const home1Html = read('draw004.github.io/home-affordability-calculator.html');
const home1Css = read('draw004.github.io/home-affordability-calculator.css');
const home1Core = read('draw004.github.io/home-affordability-calculator-core.js');
const home1App = read('draw004.github.io/home-affordability-calculator.js');
const home1PdfExport = read('draw004.github.io/home-affordability-calculator-pdf-export.js');
const home1PdfRenderer = read('draw004.github.io/home-affordability-calculator-pdf-renderer.js');
const home1Tools = read('draw004.github.io/tools.html');
const home1LearnHub = read('draw004.github.io/learn.html');
const home1Sitemap = read('draw004.github.io/sitemap.xml');
const home1SiteJs = read('draw004.github.io/site.js');
const home1Qa = readQa('tests/34-home-affordability-calculator.spec.js');
const home1QaConfig = readQa('qa.config.js');
const home1LearnNames = ['how-much-home-can-i-afford.html','mortgage-affordability-vs-lender-approval.html','how-deposit-and-interest-rates-affect-home-affordability.html'];
const home1Learns = home1LearnNames.map(name => read(`draw004.github.io/${name}`));
const home1Impl = read('draw004.github.io/docs/CARROWMONT_HOME1_HOME_AFFORDABILITY_IMPLEMENTATION.md');

add('HOME1: canonical calculator is indexable with one H1, stable static search identity and WebApplication structured data',
  home1Html.includes('<title>Home Affordability Calculator | Carrowmont</title>') &&
  home1Html.includes('content="index,follow" name="robots"') || home1Html.includes('name="robots" content="index,follow"')
);
const home1CanonicalOk = /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/carrowmont\.com\/home-affordability-calculator\.html["']|<link[^>]+href=["']https:\/\/carrowmont\.com\/home-affordability-calculator\.html["'][^>]+rel=["']canonical["']/.test(home1Html);
add('HOME1: canonical, crawlable search language and explicit lender-approval separation are present',
  home1CanonicalOk && (home1Html.match(/<h1\b/gi)||[]).length===1 &&
  home1Html.includes('mortgage affordability calculator') && home1Html.includes('home-loan affordability calculator') && home1Html.includes('borrowing power calculator') &&
  home1Html.includes('Lender approval: not estimated') && home1Html.includes('No lender approval claim') &&
  jsonLdNodes(home1Html).some(node => node?.['@type']==='WebApplication' && node?.url==='https://carrowmont.com/home-affordability-calculator.html')
);

let home1CoreApi = null;
try {
  const sandbox = { module:{exports:{}}, exports:{}, console, globalThis:null };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(home1Core, sandbox, { filename:'home-affordability-calculator-core.js' });
  home1CoreApi=sandbox.module.exports;
} catch {}
const home1Fixture = home1CoreApi?.calculate?.({mode:'budget',takeHomeIncome:10000,essentialSpending:3000,existingDebt:500,protectedSavings:1000,freeBuffer:1000,deposit:20000,annualRate:6,termYears:20,ownershipCosts:500,targetHomePrice:100000,higherRateEnabled:true,higherRate:8,grossAnnualIncome:120000});
const home1Zero = home1CoreApi?.calculate?.({mode:'budget',takeHomeIncome:10000,essentialSpending:3000,existingDebt:500,protectedSavings:1000,freeBuffer:1000,deposit:20000,annualRate:0,termYears:1,ownershipCosts:500,higherRateEnabled:false,grossAnnualIncome:0});
const home1Target = home1CoreApi?.calculate?.({mode:'target',takeHomeIncome:10000,essentialSpending:3000,existingDebt:500,protectedSavings:1000,freeBuffer:1000,deposit:20000,targetHomePrice:300000,annualRate:6,termYears:20,ownershipCosts:500,higherRateEnabled:false,grossAnnualIncome:0});
add('HOME1: deterministic cash-flow-first engine supports reverse affordability, target-price checks, zero interest and higher-rate sensitivity',
  home1CoreApi?.METHODOLOGY_VERSION==='home-affordability-v1.0' && home1Fixture?.ok &&
  Math.abs(home1Fixture.base.paymentBudget-4000)<1e-8 && home1Fixture.base.homePrice>home1Fixture.base.loanAmount &&
  home1Fixture.higherRate?.homePrice < home1Fixture.base.homePrice && home1Zero?.ok && Math.abs(home1Zero.base.loanAmount-48000)<1e-8 &&
  home1Target?.ok && Math.abs(home1Target.base.loanAmount-280000)<1e-8 && home1Fixture.lenderApproval==='Not estimated by Carrowmont'
);
add('HOME1: calculator never substitutes a country-specific lender ratio for household cash flow',
  home1Core.includes('takeHomeIncome - a.essentialSpending - a.existingDebt - a.protectedSavings') &&
  home1Core.includes('a.freeBuffer - a.ownershipCosts') && home1Core.includes('incomeMultiple: a.grossAnnualIncome > 0') &&
  !/debt.?to.?income|loan.?to.?value|lender.?ratio|approval.?ratio/i.test(home1Core)
);
add('HOME1: visitor runtime keeps financial values local with no fetch/XHR/beacon, URL financial handoff or browser-value persistence',
  !/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon\s*\(/.test(home1Core+home1App+home1PdfRenderer) &&
  !/localStorage\.setItem|sessionStorage\.setItem|URLSearchParams|location\.search/.test(home1App) &&
  home1Html.includes('Carrowmont does not send the financial amounts you enter to website analytics.')
);
add('HOME1: country terminology is localized while the static title and canonical remain global',
  home1App.includes("Home Loan Affordability Calculator") && home1App.includes("Home Affordability Calculator") &&
  home1App.includes("Mortgage Affordability Calculator — How Much Can I Borrow?") && home1App.includes("Home Loan Borrowing Power Calculator") &&
  home1SiteJs.includes('function homeAffordabilityIdentity(regionCode)') && home1SiteJs.includes('applyHomeAffordabilityTerminology(regionCode)')
);
add('HOME1: tools directory grows to nineteen without changing the nine-core homepage architecture or compact footer',
  /"numberOfItems"\s*:\s*19/.test(home1Tools) && (home1Tools.match(/class="directory-tool-card/g)||[]).length===19 &&
  home1Tools.includes('data-secondary-tool="home-affordability"') && home1Tools.includes('href="/home-affordability-calculator.html"') &&
  !read('draw004.github.io/index.html').includes('data-tool-id="home-affordability"') &&
  !home1Html.includes('footer-home-affordability')
);
add('HOME1: all three Learn guides are substantive, indexable, direct-answer pages with Article schema and bidirectional calculator links',
  home1Learns.length===3 && home1Learns.every((html,i) => {
    const url=`https://carrowmont.com/${home1LearnNames[i]}`;
    const article=jsonLdNode(html,'Article');
    const text=(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z0-9#]+;/gi,' ').match(/\b[\w’'-]+\b/g)||[]);
    return html.includes('data-cm-learn-article="1"') && html.includes('guide-answer') && html.includes('href="/home-affordability-calculator.html"') &&
      gseo2aCanonical(html)===url && gseo2aMetaContent(html,'robots').toLowerCase().includes('index') && article?.mainEntityOfPage===url &&
      text.length>1000 && home1LearnHub.includes(`href="/${home1LearnNames[i]}"`) && home1Sitemap.includes(`<loc>${url}</loc>`);
  })
);
add('HOME1: calculator and three Learn canonicals are in sitemap and the new tool has at least five contextual main-site discovery sources',
  ['home-affordability-calculator.html',...home1LearnNames].every(name=>home1Sitemap.includes(`<loc>https://carrowmont.com/${name}</loc>`)) &&
  fs.readdirSync(path.join(root,'draw004.github.io')).filter(name=>name.endsWith('.html')).filter(name=>read(`draw004.github.io/${name}`).includes('href="/home-affordability-calculator.html"')).length>=5
);
add('HOME1: exact four-page report is generated from the same deterministic result object without a second financial engine',
  home1PdfExport.includes('window.CarrowmontHomeAffordabilityPdfExport') && home1PdfRenderer.includes("filename:'carrowmont-home-affordability-report.pdf'") &&
  home1PdfRenderer.includes('const canvases=[summaryPage(result,opt),cashFlowPage(result,opt),ratePage(result,opt),nextPage(result,opt)]') &&
  !/principalForPayment|paymentForPrincipal|Math\.pow\(1\+/.test(home1PdfRenderer)
);
add('HOME1: browser QA protects formulas, localization, privacy, exports, discovery and 1280/390/360 mobile safety',
  home1Qa.includes('cash-flow-first engine handles reverse affordability') && home1Qa.includes('financial inputs remain local') &&
  home1Qa.includes('exact four-page PDF') && home1Qa.includes('Tools Hub, Learn cluster, sitemap') && home1Qa.includes('[1280,390,360]') &&
  home1QaConfig.includes("path: '/home-affordability-calculator.html'") && home1QaConfig.includes("path: '/how-much-home-can-i-afford.html'")
);
add('HOME1: implementation record locks Snapshot 86, current privacy architecture and two-repository release scope',
  home1Impl.includes('Snapshot 86') && home1Impl.includes('No Google Analytics') && home1Impl.includes('No analytics popup') &&
  home1Impl.includes('draw004.github.io') && home1Impl.includes('carrowmont-qa') && home1Impl.includes('standalone first')
);


// SEARCH1 global site search contract - Snapshot 88 implementation.
const search1Html = read('draw004.github.io/search.html');
const search1Js = read('draw004.github.io/search.js');
const search1Core = read('draw004.github.io/search-core.js');
const search1Css = read('draw004.github.io/search.css');
const search1SiteJs = read('draw004.github.io/site.js');
const search1SiteCss = read('draw004.github.io/carrowmont.css');
const search1Learn = read('draw004.github.io/learn.html');
const search1Tools = read('draw004.github.io/tools.html');
const search1Privacy = read('draw004.github.io/privacy.html');
const search1Sitemap = read('draw004.github.io/sitemap.xml');
const search1Build = read('draw004.github.io/scripts/build-search-index.mjs');
const search1FixtureScript = read('draw004.github.io/scripts/search1-fixtures.mjs');
const search1Qa = readQa('tests/35-search1-global-site-search.spec.js');
const search1QaConfig = readQa('qa.config.js');
const search1Impl = read('draw004.github.io/docs/CARROWMONT_SEARCH1_GLOBAL_SITE_SEARCH_IMPLEMENTATION.md');
let search1Index = null;
let search1Pages = null;
let search1Aliases = null;
try { search1Index = JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json')); } catch {}
try { search1Pages = JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json')); } catch {}
try { search1Aliases = JSON.parse(read('draw004.github.io/data/carrowmont-search-aliases.json')); } catch {}
const search1Entries = Array.isArray(search1Index?.entries) ? search1Index.entries : [];
const search1SitemapPaths = [...search1Sitemap.matchAll(/<loc>https:\/\/carrowmont\.com([^<]*)<\/loc>/g)].map(match => match[1] || '/');
const search1EntryPaths = search1Entries.map(entry => entry?.url);
add('SEARCH1: noindex utility page has one stable canonical and no query-bearing search URL',
  search1Html.includes('<meta name="robots" content="noindex,follow">') &&
  search1Html.includes('<link rel="canonical" href="https://carrowmont.com/search.html">') &&
  !search1Sitemap.includes('https://carrowmont.com/search.html') &&
  !/search\.html\?q=|URLSearchParams|location\.search|location\.hash/.test(search1Html + search1Js)
);
add('SEARCH1: reviewed index and alias library are valid, deterministic and below the 250 KB V1 target',
  search1Index?.schema_version === 1 && search1Pages?.schema_version === 1 && search1Aliases?.schema_version === 1 &&
  search1Entries.length === 121 && new Set(search1EntryPaths).size === search1Entries.length &&
  search1Entries.every(entry => entry && /^\//.test(entry.url) && entry.title && entry.description && ['tool','guide','carrowmont'].includes(entry.type) && entry.category && Number.isInteger(entry.priority)) &&
  Buffer.byteLength(read('draw004.github.io/data/carrowmont-search-index.json'), 'utf8') < 250 * 1024 &&
  Array.isArray(search1Aliases?.groups) && search1Aliases.groups.length >= 10 &&
  search1Build.includes('SEARCH1 index check PASS') && search1Build.includes('duplicate canonical URL') && search1Build.includes('committed search index is stale')
);
add('SEARCH1: every sitemap URL is searchable exactly once and no internal/release path enters the index',
  search1SitemapPaths.length === search1Entries.length &&
  search1SitemapPaths.every(url => search1EntryPaths.includes(url)) &&
  search1EntryPaths.every(url => search1SitemapPaths.includes(url)) &&
  search1EntryPaths.every(url => !/\.(?:zip|md|json|ya?ml)$/i.test(url) && !url.includes('/docs/') && !url.includes('/.github/'))
);
let search1CoreApi = null;
try {
  const sandbox = { globalThis:null };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(search1Core, sandbox, { filename:'search-core.js' });
  search1CoreApi = sandbox.CarrowmontSearchCore;
} catch {}
const search1Result = (query, region='OTHER') => search1CoreApi?.search?.(search1Entries, search1Aliases, query, { region, limit:12 }) || [];
add('SEARCH1: deterministic matching protects SIP, EMI, remortgage, SWP, home-loan and empty-state behavior',
  search1CoreApi?.version === '1.0.0' &&
  search1Result('sip','IN')[0]?.url === '/sip-calculator/' &&
  search1Result('emi','IN')[0]?.url === '/loan-calculator/' &&
  search1Result('remortgage','GB')[0]?.url === '/mortgage-payoff-calculator/refinance-break-even.html' &&
  search1Result('swp','IN')[0]?.url === '/retirement-calculator/withdrawal-calculator.html' &&
  search1Result('home loan','IN').some(entry => entry.url === '/home-affordability-calculator.html') &&
  search1Result('how to make a budget','US')[0]?.url === '/how-to-make-a-budget.html' &&
  search1Result('investing for beginners','US')[0]?.url === '/investing-for-beginners.html' &&
  search1Result('etf','US')[0]?.url === '/what-is-an-etf.html' &&
  search1Result('index fund','US')[0]?.url === '/index-funds-explained.html' &&
  search1Result('credit score','US')[0]?.url === '/credit-score-explained.html' &&
  search1Result('credit rating','AU')[0]?.url === '/credit-score-explained.html' &&
  search1Result('debt consolidation','CA')[0]?.url === '/debt-consolidation-explained.html' &&
  search1Result('credit card interest','GB')[0]?.url === '/how-credit-card-interest-works.html' &&
  search1Result('apr vs interest rate','US')[0]?.url === '/apr-vs-interest-rate.html' &&
  search1Result('zzzzxyqnotatopic','OTHER').length === 0 &&
  (search1FixtureScript.match(/\{ name:/g)||[]).length === 22 &&
  search1FixtureScript.includes('investing for beginners finds the foundation guide') &&
  search1FixtureScript.includes('debt consolidation finds the total-cost guide') &&
  search1FixtureScript.includes('nonsense returns no misleading match')
);
add('SEARCH1: search words remain memory-only and are never placed in URLs, browser storage, cookies or analytics calls',
  !/localStorage|sessionStorage|document\.cookie|URLSearchParams|history\.(?:pushState|replaceState)|location\.(?:search|hash)/.test(search1Js) &&
  !/sendBeacon|XMLHttpRequest|WebSocket/.test(search1Js) &&
  search1Js.includes("fetch(INDEX_URL, { credentials: 'same-origin'") && search1Js.includes("fetch(ALIASES_URL, { credentials: 'same-origin'") &&
  !/https?:\/\//.test(search1Js) &&
  !/name=["'](?:q|query|search)["']/.test(search1Html + search1Learn + search1Tools) &&
  search1Privacy.includes('not added to the page URL') && search1Privacy.includes('not sent to an external search provider')
);
add('SEARCH1: header, Learn and Tools expose one consistent search path without replacing crawlable browse links',
  search1SiteJs.includes("href = '/search.html'") && search1SiteJs.includes('data-cm-search-link') &&
  search1SiteCss.includes('.desktop-nav .site-search-link') &&
  search1Learn.includes('id="learnSearchInput"') && search1Learn.includes('class="planning-categories"') &&
  search1Tools.includes('id="toolsSearchInput"') && search1Tools.includes('id="core-planning-tools"') &&
  search1Learn.includes('search-core.js?v=20261020-search1') && search1Tools.includes('search-core.js?v=20261020-search1') &&
  search1Css.includes('@media(max-width:760px)') && search1Css.includes('grid-template-columns:1fr')
);
add('SEARCH1: central QA protects index, aliases, privacy, navigation, embedded discovery and 1280/390/360 layouts',
  search1Qa.includes('deterministic aliases find tools and guides') &&
  search1Qa.includes('never enter URL, browser storage, cookies or network requests') &&
  search1Qa.includes('Learn and Tools keep their browse structure') &&
  search1Qa.includes('[1280, 390, 360]') &&
  search1QaConfig.includes("key: 'search', path: '/search.html'")
);
add('SEARCH1: implementation record locks Snapshot 88, two-repository scope and the Learn-first follow-up boundary',
  search1Impl.includes('Snapshot 88') && search1Impl.includes('draw004.github.io') && search1Impl.includes('carrowmont-qa') &&
  search1Impl.includes('No external search API') && search1Impl.includes('LEARN2A')
);


// LEARN2A-1 evergreen money-management and investing foundations - Snapshot 89 implementation.
const learn2a1Names = [
  'how-to-make-a-budget.html',
  'investing-for-beginners.html',
  'what-is-an-etf.html',
  'index-funds-explained.html'
];
const learn2a1Titles = [
  'How to Make a Budget That Works | Carrowmont',
  'Investing for Beginners: Simple Guide | Carrowmont',
  'What Is an ETF? Exchange-Traded Funds Explained | Carrowmont',
  'Index Funds Explained: Passive Investing | Carrowmont'
];
const learn2a1H1s = [
  'How to make a budget that fits your real life',
  'Investing for beginners: Understand the basics before choosing a product',
  'What is an ETF, and how does it work?',
  'What is an index fund, and what does it actually track?'
];
const learn2a1ToolLinks = [
  '/budget-cash-flow-planner/',
  '/sip-calculator/',
  '/sip-calculator/',
  '/compound-interest-calculator/'
];
const learn2a1Pages = learn2a1Names.map(name => read(`draw004.github.io/${name}`));
const learn2a1Hub = read('draw004.github.io/learn.html');
const learn2a1Sitemap = read('draw004.github.io/sitemap.xml');
const learn2a1Qa = readQa('tests/36-learn2a-evergreen-finance-batch1.spec.js');
const learn2a1QaConfig = readQa('qa.config.js');
const learn2a1Impl = read('draw004.github.io/docs/CARROWMONT_LEARN2A1_EVERGREEN_MONEY_INVESTING_FOUNDATIONS_IMPLEMENTATION.md');
const learn2a1VisibleWords = html => (html
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&[a-z0-9#]+;/gi,' ')
  .match(/\b[\w’'-]+\b/g) || []).length;
const learn2a1MainHtmlNames = fs.readdirSync(path.join(root,'draw004.github.io')).filter(name => name.endsWith('.html'));
const learn2a1InboundCount = publicPath => learn2a1MainHtmlNames
  .filter(name => !learn2a1Names.includes(name))
  .filter(name => read(`draw004.github.io/${name}`).includes(`href="/${publicPath}"`)).length;

add('LEARN2A-1: four unique evergreen guides are substantive, indexable Article pages with direct answers and accurate canonicals',
  learn2a1Pages.length === 4 && learn2a1Pages.every((html, index) => {
    const url = `https://carrowmont.com/${learn2a1Names[index]}`;
    const title = (html.match(/<title>([^<]*)<\/title>/i)||[])[1] || '';
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    const article = jsonLdNode(html,'Article');
    const breadcrumb = jsonLdNode(html,'BreadcrumbList');
    return title === learn2a1Titles[index] && h1s.length === 1 && h1s[0][1].replace(/<[^>]+>/g,'').trim() === learn2a1H1s[index] &&
      gseo2aCanonical(html) === url && gseo2aMetaContent(html,'robots').toLowerCase() === 'index,follow' &&
      article?.mainEntityOfPage === url && article?.datePublished === '2026-10-20' && article?.dateModified === '2026-10-20' &&
      Boolean(breadcrumb) && html.includes('class="guide-answer"') && learn2a1VisibleWords(html) > 1000;
  })
);
add('LEARN2A-1: every guide has plain-language teaching structure, worked comparison, trusted sources, editorial policy and a relevant tool journey',
  learn2a1Pages.every((html,index) =>
    html.includes('class="guide-action-first"') && html.includes(`href="${learn2a1ToolLinks[index]}"`) &&
    html.includes('class="guide-table-wrap"') && html.includes('class="guide-steps"') && html.includes('Common mistakes') &&
    html.includes('Questions to ask') && html.includes('class="reference-note"') &&
    (html.match(/class="source-list"[\s\S]*?<\/ul>/i)?.[0].match(/<a\s/gi)||[]).length >= 3 &&
    html.includes('href="/editorial-policy.html"') && html.includes('Educational information only.')
  )
);
add('LEARN2A-1: examples use current declarative localization and country-aware SIP or recurring-investment terminology without country doorway URLs',
  learn2a1Pages[0].includes('data-cm-money-inr="100000"') && learn2a1Pages[0].includes('data-cm-money-basis="monthly"') &&
  learn2a1Pages[1].includes('data-cm-money-inr="10000"') && learn2a1Pages[1].includes('data-cm-term="sip-calculator"') &&
  learn2a1Pages[2].includes('data-cm-term="sip-calculator"') &&
  learn2a1Pages.every(html => html.includes('locale.js?v=20261014-housing3') && html.includes('learn-localization.js?v=20261014-housing3')) &&
  learn2a1Names.every(name => !/\/(?:in|us|uk|ca|au|nz)\//i.test(name))
);
add('LEARN2A-1: Learn hub and contextual article network provide at least four natural inbound discovery paths per guide',
  learn2a1Hub.includes('data-category="budget"') && learn2a1Hub.includes('href="/how-to-make-a-budget.html"') &&
  ['investing-for-beginners.html','what-is-an-etf.html','index-funds-explained.html'].every(name => {
    const assets = (learn2a1Hub.match(/<section class="category-box" data-category="assets"[\s\S]*?<\/section>/)||[])[0] || '';
    return assets.includes(`href="/${name}"`);
  }) && learn2a1Names.every(name => learn2a1InboundCount(name) >= 4)
);
add('LEARN2A-1: sitemap and SEARCH1 contain the four canonicals exactly once with current lastmod and correct informational ownership',
  learn2a1Names.every(name => {
    const loc = `<loc>https://carrowmont.com/${name}</loc>`;
    return (learn2a1Sitemap.match(new RegExp(loc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length === 1 &&
      new RegExp(`${loc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*<lastmod>2026-10-20<\\/lastmod>`).test(learn2a1Sitemap) &&
      search1Entries.filter(entry => entry.url === `/${name}`).length === 1;
  }) && search1Entries.length === 121 &&
  search1Result('how to make a budget','US')[0]?.url === '/how-to-make-a-budget.html' &&
  search1Result('investing for beginners','US')[0]?.url === '/investing-for-beginners.html' &&
  search1Result('etf','US')[0]?.url === '/what-is-an-etf.html' &&
  search1Result('index fund','US')[0]?.url === '/index-funds-explained.html'
);
add('LEARN2A-1: central browser QA protects identity, localization, discovery, contextual links and 1280/390/360 overflow safety',
  learn2a1Qa.includes('four guides have unique indexable identities') &&
  learn2a1Qa.includes('country-aware examples and terminology change') &&
  learn2a1Qa.includes('at least three contextual inbound pages') &&
  learn2a1Qa.includes('[1280, 390, 360]') &&
  learn2a1QaConfig.includes("path: '/how-to-make-a-budget.html'") &&
  learn2a1QaConfig.includes("path: '/index-funds-explained.html'")
);
add('LEARN2A-1: implementation record locks Snapshot 89, simple language, two-repository scope and the pause before LEARN2A-2',
  learn2a1Impl.includes('Source Snapshot 89') && learn2a1Impl.includes('simple language') &&
  learn2a1Impl.includes('draw004.github.io') && learn2a1Impl.includes('carrowmont-qa') &&
  learn2a1Impl.includes('does not implement LEARN2A-2') && learn2a1Impl.includes('No calculator formula')
);



// LEARN2A-2 evergreen credit and borrowing foundations plus SEARCH1 layout refinement - Snapshot 90 implementation.
const learn2a2Names = [
  'credit-score-explained.html',
  'debt-consolidation-explained.html',
  'how-credit-card-interest-works.html',
  'apr-vs-interest-rate.html'
];
const learn2a2Titles = [
  'Credit Score Explained: What Affects It | Carrowmont',
  'Debt Consolidation Explained | Carrowmont',
  'How Credit-Card Interest Works | Carrowmont',
  'APR vs Interest Rate: The Difference | Carrowmont'
];
const learn2a2H1s = [
  'What is a credit score, and what can affect it?',
  'What is debt consolidation, and can a lower payment cost more?',
  'How does credit-card interest build up?',
  'APR vs interest rate: Why the cheaper-looking loan may not be cheaper'
];
const learn2a2Pages = learn2a2Names.map(name => read(`draw004.github.io/${name}`));
const learn2a2Qa = readQa('tests/37-learn2a-evergreen-finance-batch2.spec.js');
const learn2a2Impl = read('draw004.github.io/docs/CARROWMONT_LEARN2A2_CREDIT_BORROWING_SEARCH_LAYOUT_IMPLEMENTATION.md');
const learn2a2VisibleWords = html => (html
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&[a-z0-9#]+;/gi,' ')
  .match(/\b[\w’'-]+\b/g) || []).length;
const learn2a2InboundCount = publicPath => learn2a1MainHtmlNames
  .filter(name => !learn2a2Names.includes(name) && name !== 'learn.html')
  .filter(name => read(`draw004.github.io/${name}`).includes(`href="/${publicPath}"`)).length;

add('LEARN2A-2: four evergreen credit and borrowing guides are substantive, indexable Article pages with direct answers and accurate identities',
  learn2a2Pages.length === 4 && learn2a2Pages.every((html,index) => {
    const url = `https://carrowmont.com/${learn2a2Names[index]}`;
    const title = (html.match(/<title>([^<]*)<\/title>/i)||[])[1] || '';
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    const description = gseo2aMetaContent(html,'description');
    const article = jsonLdNode(html,'Article');
    const breadcrumb = jsonLdNode(html,'BreadcrumbList');
    return title === learn2a2Titles[index] && h1s.length === 1 && h1s[0][1].replace(/<[^>]+>/g,'').trim() === learn2a2H1s[index] &&
      description.length >= 110 && description.length <= 160 && gseo2aCanonical(html) === url && gseo2aMetaContent(html,'robots').toLowerCase() === 'index,follow' &&
      article?.mainEntityOfPage === url && article?.datePublished === '2026-10-20' && article?.dateModified === '2026-10-20' &&
      Boolean(breadcrumb) && html.includes('class="guide-answer"') && learn2a2VisibleWords(html) > 1000;
  })
);
add('LEARN2A-2: every guide teaches in simple language with a worked comparison, questions, trusted sources, editorial policy and relevant loan journey',
  learn2a2Pages.every(html =>
    html.includes('class="guide-action-first"') && html.includes('href="/loan-calculator/"') &&
    html.includes('class="guide-table-wrap"') && html.includes('class="guide-steps"') && html.includes('Questions to ask') &&
    html.includes('class="reference-note"') && (html.match(/class="source-list"[\s\S]*?<\/ul>/i)?.[0].match(/<a\s/gi)||[]).length >= 3 &&
    html.includes('href="/editorial-policy.html"') && html.includes('Educational information only.')
  ) &&
  learn2a2Pages[0].includes('different information or formulas') && learn2a2Pages[0].includes('never guarantees approval') &&
  learn2a2Pages[1].includes('a lower payment can result from a longer term') && learn2a2Pages[2].includes('minimum payment') &&
  learn2a2Pages[3].includes('exact legal calculation differs by country')
);
add('LEARN2A-2: examples and cautions use the established localization layer without pretending credit or disclosure rules are universal',
  learn2a2Pages.slice(1).every(html => html.includes('data-cm-money-inr=') && html.includes('data-cm-money-basis="monthly"')) &&
  learn2a2Pages.every(html => html.includes('locale.js?v=20261014-housing3') && html.includes('learn-localization.js?v=20261014-housing3')) &&
  learn2a2Pages[0].includes('score ranges, access rights and dispute procedures differ by country') &&
  learn2a2Pages[1].includes('insolvency and secured borrowing differs by country') &&
  learn2a2Pages[2].includes('differ by issuer and country') && learn2a2Pages[3].includes('local disclosure rules') &&
  learn2a2Names.every(name => !/\/(?:in|us|uk|ca|au|nz)\//i.test(name))
);
add('LEARN2A-2: Learn hub and contextual article network provide at least four natural inbound paths beyond the hub per guide',
  learn2a1Hub.includes('data-category="loans"') && learn2a1Hub.includes('<h2>Credit, Loans &amp; Debt</h2>') &&
  learn2a2Names.every(name => learn2a1Hub.includes(`href="/${name}"`) && learn2a2InboundCount(name) >= 4)
);
add('LEARN2A-2: sitemap and SEARCH1 contain 121 reviewed public pages and give the new guides correct informational ownership',
  learn2a2Names.every(name => {
    const loc = `<loc>https://carrowmont.com/${name}</loc>`;
    return (learn2a1Sitemap.match(new RegExp(loc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length === 1 &&
      new RegExp(`${loc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*<lastmod>2026-10-20<\\/lastmod>`).test(learn2a1Sitemap) &&
      search1Entries.filter(entry => entry.url === `/${name}`).length === 1;
  }) && search1Entries.length === 121 &&
  search1Result('credit score','US')[0]?.url === '/credit-score-explained.html' &&
  search1Result('credit rating','AU')[0]?.url === '/credit-score-explained.html' &&
  search1Result('debt consolidation','CA')[0]?.url === '/debt-consolidation-explained.html' &&
  search1Result('credit card interest','GB')[0]?.url === '/how-credit-card-interest-works.html' &&
  search1Result('apr vs interest rate','US')[0]?.url === '/apr-vs-interest-rate.html'
);
add('SEARCH1 layout refinement: compact hero places the primary search action above the fold while preserving responsive and privacy boundaries',
  search1Css.includes('.cm-search-page-hero .page-hero-inner{padding:46px 0 94px') &&
  search1Css.includes('.cm-search-page-section{position:relative;z-index:2;margin-top:-64px') &&
  search1Css.includes('.cm-search-page-section{margin-top:-48px;padding-bottom:54px}') &&
  search1Html.includes('search.css?v=20261020-learn2a2') && search1Learn.includes('search.css?v=20261020-learn2a2') && search1Tools.includes('search.css?v=20261020-learn2a2') &&
  search1Qa.includes('search action should be visible above the fold') && search1Qa.includes('[1280, 390, 360]') &&
  !/localStorage|sessionStorage|URLSearchParams/.test(search1Js)
);
add('LEARN2A-2: browser QA and implementation record protect identity, localization, discovery, layout and Snapshot 90 release boundaries',
  learn2a2Qa.includes('four guides have unique indexable identities') &&
  learn2a2Qa.includes('country-aware money examples change') &&
  learn2a2Qa.includes('at least four contextual inbound pages') &&
  learn2a2Qa.includes('[1280, 390, 360]') &&
  learn2a1QaConfig.includes("path: '/credit-score-explained.html'") && learn2a1QaConfig.includes("path: '/apr-vs-interest-rate.html'") &&
  learn2a2Impl.includes('Source Snapshot 90') && learn2a2Impl.includes('simple language') &&
  learn2a2Impl.includes('draw004.github.io') && learn2a2Impl.includes('carrowmont-qa') &&
  learn2a2Impl.includes('No external search API') && learn2a2Impl.includes('does not implement LEARN2B') &&
  learn2a2Impl.includes('does not') && learn2a2Impl.includes('calculator formula')
);


// LEARN3A UI, house-style and full-library audit - Snapshot 91.
const learn3Audit = read('draw004.github.io/docs/CARROWMONT_LEARN3_LIBRARY_QUALITY_AUDIT_SNAPSHOT91.md');
const learn3Impl = read('draw004.github.io/docs/CARROWMONT_LEARN3A_UI_HOUSE_STYLE_AND_LIBRARY_AUDIT_IMPLEMENTATION.md');
const learn3Standard = read('draw004.github.io/.github/LEARN-ARTICLE-STANDARD.md');
const learn3UiStandard = read('draw004.github.io/docs/CARROWMONT_SHARED_UI_STANDARD.md');
const learn3GuideEntries = search1Entries.filter(entry => entry.type === 'guide' && /^\/[^/]+\.html$/.test(entry.url));
const learn3HeadingColonFailures = [];
for (const entry of learn3GuideEntries) {
  const html = read(`draw004.github.io${entry.url}`);
  const publicHeadings = [
    ...html.matchAll(/<title>([\s\S]*?)<\/title>/gi),
    ...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)
  ].map(match => match[1]);
  for (const heading of publicHeadings) {
    if (/:\s*(?:<[^>]+>\s*)*[a-z]/.test(heading)) learn3HeadingColonFailures.push(`${entry.url}: ${heading}`);
  }
}
add('LEARN3A: Tools and Search expose explicit Home links on desktop and mobile navigation',
  /<nav class="desktop-nav"[\s\S]*?<a href="\/">Home<\/a>[\s\S]*?<\/nav>/.test(search1Tools) &&
  /<div class="mobile-nav-panel">[\s\S]*?<a href="\/">Home<\/a>[\s\S]*?<\/div>/.test(search1Tools) &&
  /<nav class="desktop-nav"[\s\S]*?<a href="\/">Home<\/a>[\s\S]*?<\/nav>/.test(search1Html) &&
  /<div class="mobile-nav-panel">[\s\S]*?<a href="\/">Home<\/a>[\s\S]*?<\/div>/.test(search1Html)
);
add('LEARN3A: Tools hero is compact and embedded search is pulled upward without decorative filler',
  search1SiteCss.includes('.tools-directory-hero .page-hero-inner{max-width:1220px;padding:50px 0 62px}') &&
  search1SiteCss.includes('body[data-cm-page="tools-directory"] .search-discovery-section{position:relative;z-index:2;margin-top:-36px') &&
  search1SiteCss.includes('.tools-directory-hero .page-hero-inner{padding:18px 0 22px}') &&
  search1SiteCss.includes('.tools-directory-hero-actions{display:none}') &&
  search1SiteCss.includes('body[data-cm-page="tools-directory"] .search-discovery-section{margin-top:-28px') &&
  search1SiteCss.includes('.cm-search-heading h2{margin-bottom:5px;font-size:21px;line-height:1.16}') &&
  search1Tools.includes('/carrowmont.css?v=20261020-learn3a-fix1') &&
  !search1Tools.includes('decorative-search') &&
  readQa('tests/12-tools-hub.spec.js').includes('tools search should appear above the fold')
);
add('LEARN3A: every current Learn title and H1-H6 heading follows colon capitalization',
  learn3GuideEntries.length === 83 && learn3HeadingColonFailures.length === 0,
  learn3HeadingColonFailures.slice(0,3).join(' | ')
);
add('LEARN3A: shared standards define colon capitalization without corrupting ordinary prose',
  learn3Standard.includes('Heading and title capitalization after a colon') &&
  learn3Standard.includes('must **not** force unnatural capitalization inside ordinary paragraph prose') &&
  learn3Standard.includes('current 83-guide library') &&
  learn3UiStandard.includes('Colon capitalization in public headings') &&
  learn3UiStandard.includes('Normal sentence grammar remains authoritative')
);
add('LEARN3A: complete 83-guide audit records practical quality gaps and controlled topic batches',
  learn3Audit.includes('**83** Learn articles were audited') &&
  learn3Audit.includes('worked-example') &&
  learn3Audit.includes('decision/checklist') &&
  learn3Audit.includes('LEARN3B') && learn3Audit.includes('LEARN3C') && learn3Audit.includes('LEARN3D') && learn3Audit.includes('LEARN3E') && learn3Audit.includes('LEARN3F') &&
  (learn3Audit.match(/^\| `[^`]+\.html` \|/gm) || []).length === 83
);
add('LEARN3A: implementation record keeps mass rewrites, calculators, search privacy and workflows out of scope',
  learn3Impl.includes('does not automatically rewrite all 83 Learn articles') &&
  learn3Impl.includes('No calculator formula') &&
  learn3Impl.includes('search privacy behavior') &&
  learn3Impl.includes('workflow file') &&
  readQa('tests/35-search1-global-site-search.spec.js').includes("path === '/tools.html' || path === SEARCH")
);


// LEARN3B-1 budget systems, pay cycles and cash flow - Snapshot 93.
const learn3b1Names = [
  '50-30-20-budget-rule.html',
  'budgeting-by-pay-frequency.html',
  'budgeting-with-irregular-income.html',
  'cash-flow-vs-income.html',
  'zero-based-budgeting.html',
  'pay-yourself-first-budgeting.html'
];
const learn3b1Titles = [
  '50/30/20 Budget Rule: How It Works | Carrowmont',
  'Budgeting by Pay Frequency: Weekly to Monthly | Carrowmont',
  'How to Budget With Irregular Income | Carrowmont',
  'Cash Flow vs Income: Why the Difference Matters | Carrowmont',
  'Zero-Based Budgeting: How It Works | Carrowmont',
  'Pay Yourself First: What It Means in a Budget | Carrowmont'
];
const learn3b1H1s = [
  'What is the 50/30/20 budget rule, and when should you adjust it?',
  'How do weekly, biweekly, fortnightly and monthly pay cycles change budgeting?',
  'How do you budget when your income changes every month?',
  'Cash flow vs income: Why earning more does not always mean saving more',
  'What is zero-based budgeting and how does it work?',
  'What does pay yourself first mean in a budget?'
];
const learn3b1Pages = learn3b1Names.map(name => read(`draw004.github.io/${name}`));
const learn3b1Impl = read('draw004.github.io/docs/CARROWMONT_LEARN3B1_BUDGET_SYSTEMS_PAY_CYCLES_CASH_FLOW_IMPLEMENTATION.md');
const learn3b1Qa = readQa('tests/38-learn3b-budget-systems-cash-flow.spec.js');
const learn3b1QaConfig = readQa('qa.config.js');
const learn3b1SearchInventory = read('draw004.github.io/data/carrowmont-search-pages.json');
const learn3b1SearchFixtures = read('draw004.github.io/scripts/search1-fixtures.mjs');
const learn3b1Localization = read('draw004.github.io/learn-localization.js');
const learn3b1Count = (html, pattern) => (html.match(pattern) || []).length;

add('LEARN3B-1: six established guides retain stable indexable identities, honest freshness and useful depth',
  learn3b1Pages.every((html, index) => {
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    const article = jsonLdNode(html,'Article');
    const breadcrumb = jsonLdNode(html,'BreadcrumbList');
    const url = `https://carrowmont.com/${learn3b1Names[index]}`;
    const description = gseo2aMetaContent(html,'description');
    return gseo2aTitle(html) === learn3b1Titles[index] && h1s.length === 1 && h1s[0][1].replace(/<[^>]+>/g,'').trim() === learn3b1H1s[index] &&
      description.length >= 110 && description.length <= 160 && gseo2aCanonical(html) === url && gseo2aMetaContent(html,'robots').toLowerCase() === 'index,follow' &&
      article?.mainEntityOfPage === url && article?.datePublished === '2026-09-27' && article?.dateModified === '2026-10-20' && Boolean(breadcrumb) &&
      html.includes('Published 27 September 2026 · Reviewed 20 October 2026') && html.includes('href="/editorial-policy.html"') &&
      html.includes('class="guide-answer"') && html.includes('class="guide-action-first"') && html.includes('href="/budget-cash-flow-planner/"') &&
      html.includes('Checklist:') && learn3b1Count(html,/class="guide-table-wrap"/g) >= 2 && learn3b1Count(html,/data-cm-money-inr=/g) >= 8 &&
      learn3b1Count(html,/<li><a href="https?:\/\//g) >= 4 && learn2a2VisibleWords(html) > 1000 &&
      html.includes('learn-localization.js?v=20261020-learn3b1');
  })
);
add('LEARN3B-1: page-specific lessons answer the approved practical questions without collapsing distinct search intent',
  learn3b1Pages[0].includes('starting framework, not a pass-or-fail test') && learn3b1Pages[0].includes('Textbook 50/30/20') && learn3b1Pages[0].includes('Give the 20% bucket more than one job') &&
  learn3b1Pages[1].includes('data-cm-term="two-week-pay-label"') && learn3b1Pages[1].includes('Typical pay periods in a year') && learn3b1Pages[1].includes('Assigning one month across two paydays') &&
  learn3b1Pages[2].includes('Use three income numbers') && learn3b1Pages[2].includes('Six-month average') && /tax (?:or|and) business obligations/i.test(learn3b1Pages[2]) &&
  learn3b1Pages[3].includes('Amount and timing are separate questions') && learn3b1Pages[3].includes('Credit is not liquidity') && learn3b1Pages[3].includes('Same income, very different cash flow') &&
  learn3b1Pages[4].includes('It does not mean spending everything or ending the month with a zero bank balance') && learn3b1Pages[4].includes('A complete zero-based month') && learn3b1Pages[4].includes('Use rollover rules') &&
  learn3b1Pages[5].includes('Priority is different from literal payment order') && learn3b1Pages[5].includes('A safe cash-flow waterfall') && learn3b1Pages[5].includes('data-cm-term="sip-calculator"')
);
add('LEARN3B-1: examples use the established money-localization layer and reviewed payday terminology',
  learn3b1Pages.every(html => html.includes('data-cm-money-inr=') && html.includes('data-cm-money-basis="monthly"')) &&
  learn3b1Localization.includes("if(key==='two-week-pay-label')") &&
  learn3b1Localization.includes("['US','CA'].includes(s.region)") && learn3b1Localization.includes("return 'Biweekly'") &&
  learn3b1Localization.includes("['GB','IE','AU','NZ'].includes(s.region)") && learn3b1Localization.includes("return 'Fortnightly'") &&
  learn3b1Localization.includes("return 'Every two weeks'")
);
add('LEARN3B-1: sitemap and SEARCH1 preserve 121 canonical public pages with accurate material-change dates and query ownership',
  learn3b1Names.every(name => {
    const loc = `<loc>https://carrowmont.com/${name}</loc>`;
    return new RegExp(`${loc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*<lastmod>2026-10-20<\\/lastmod>`).test(learn2a1Sitemap) &&
      search1Entries.filter(entry => entry.url === `/${name}`).length === 1;
  }) && search1Entries.length === 121 &&
  search1Result('50 30 20 budget','US')[0]?.url === '/50-30-20-budget-rule.html' &&
  search1Result('payday budget','US')[0]?.url === '/budgeting-by-pay-frequency.html' &&
  search1Result('variable income budget','CA')[0]?.url === '/budgeting-with-irregular-income.html' &&
  search1Result('cash flow vs income','OTHER')[0]?.url === '/cash-flow-vs-income.html' &&
  search1Result('every dollar budget','US')[0]?.url === '/zero-based-budgeting.html' &&
  search1Result('pay yourself first','AU')[0]?.url === '/pay-yourself-first-budgeting.html' &&
  learn3b1SearchInventory.includes('payday budget') && learn3b1SearchInventory.includes('variable income budget') &&
  learn3b1SearchFixtures.includes('payday budget finds pay-frequency planning')
);
add('LEARN3B-1: central browser QA protects identity, localization, search ownership, internal journeys and 1280/390/360 layouts',
  learn3b1Qa.includes('six rewritten guides retain stable identities') && learn3b1Qa.includes('country-aware money, payday and recurring-investment language adapt') &&
  learn3b1Qa.includes('each rewritten guide keeps the approved internal journey') && learn3b1Qa.includes('[1280, 390, 360]') &&
  learn3b1Names.every(name => learn3b1QaConfig.includes(`path: '/${name}'`))
);
add('LEARN3B-1: implementation record preserves global localization, stable URLs, truthful indexing signals and the LEARN3B-2 boundary',
  learn3b1Impl.includes('Source Snapshot 93') && learn3b1Impl.includes('one universal educational core') &&
  learn3b1Impl.includes('No unrelated sitemap date is refreshed') && learn3b1Impl.includes('does not guarantee crawling, indexing, ranking') &&
  learn3b1Impl.includes('does not change') && learn3b1Impl.includes('calculator formulas') && learn3b1Impl.includes('SEARCH1 query privacy') &&
  learn3b1Impl.includes('LEARN3B-1 does not rewrite the six LEARN3B-2 pages')
);

console.log('\nCarrowmont source contract check\n');
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length} PASS / ${failed.length} FAIL\n`);
process.exit(failed.length ? 1 : 0);
