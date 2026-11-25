import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch12B2ShortTermSavingsContract(root) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({name, ok: !!ok, detail});
  const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
  const page = read('draw004.github.io/emergency-fund-runway-calculator.html');
  const css = read('draw004.github.io/short-term-savings-comparison.css');
  const app = read('draw004.github.io/short-term-savings-comparison.js');
  const coreSource = read('draw004.github.io/short-term-savings-comparison-core.js');
  const tools = read('draw004.github.io/tools.html');
  const guide = read('draw004.github.io/where-to-keep-short-term-savings.html');
  const sitemap = read('draw004.github.io/sitemap.xml');
  const inventory = JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json'));
  const index = JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json'));
  const anchor = '/emergency-fund-runway-calculator.html#short-term-savings-comparison';

  add('Comparison is embedded in the established Emergency Fund and Runway tool rather than adding a 24th public tool',
    page.includes('id="short-term-savings-comparison"') &&
    page.includes('short-term-savings-comparison-core.js') &&
    page.includes('short-term-savings-comparison.js') &&
    page.includes('short-term-savings-comparison.css') &&
    !sitemap.includes('short-term-savings-comparison.html'));
  add('Public directory and Search inventory remain locked at 23 tools and 151 indexed URLs',
    (tools.match(/class="directory-tool-card/g) || []).length === 23 &&
    inventory.entries.length === 151 && index.entries.length === 151);
  add('Tools and Learn route directly to the focused comparison anchor',
    tools.includes(`href="${anchor}"`) && guide.includes(`href="${anchor}"`) &&
    page.includes('href="#short-term-savings-comparison"'));
  add('Modified Learn guide retains canonical and description metadata in standards-compatible order',
    guide.includes('<meta name="description" content="Compare savings accounts') &&
    guide.includes('<link rel="canonical" href="https://carrowmont.com/where-to-keep-short-term-savings.html"') &&
    guide.includes('Reviewed 20 November 2026'));
  add('Search metadata gives the existing tool short-term comparison ownership without introducing a new URL', (() => {
    const entry = inventory.entries.find(e => e.url === '/emergency-fund-runway-calculator.html');
    return !!entry && entry.type === 'tool' && entry.keywords.includes('short term savings comparison') &&
      entry.aliases.includes('compare short term savings options') && entry.intents.includes('compare');
  })());
  add('A direct short-term savings comparison query resolves to the existing tool while keeping the educational guide discoverable', (() => {
    const searchSandbox = {};
    searchSandbox.globalThis = searchSandbox;
    vm.createContext(searchSandbox);
    vm.runInContext(read('draw004.github.io/search-core.js'), searchSandbox);
    const search = searchSandbox.CarrowmontSearchCore;
    const aliases = JSON.parse(read('draw004.github.io/data/carrowmont-search-aliases.json'));
    const results = search.search(index.entries, aliases, 'short term savings comparison', {region:'US', limit:12});
    const urls = results.map(r => r.url);
    return urls[0] === '/emergency-fund-runway-calculator.html' && urls.includes('/where-to-keep-short-term-savings.html');
  })());
  add('No what-if amounts are sent, stored or auto-saved by the short-term comparison',
    !/(?:localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|CarrowmontPlanSave|saveProfile|supabase)/i.test(app + coreSource));
  add('Comparison explicitly avoids live-rate and provider claims',
    page.includes('Carrowmont does not fetch current bank, fund or government-security rates') &&
    page.includes('does not recommend a provider') &&
    page.includes('live rates, taxes, fees, deposit-protection limits, provider eligibility, early-withdrawal penalties') &&
    guide.includes('Carrowmont does not fetch live rates or recommend a provider'));
  add('Country terminology is localized while currency changes remain display-only',
    app.includes('Fixed deposit (FD)') && app.includes('Certificate of deposit (CD)') &&
    app.includes('Term deposit / GIC') && app.includes('Fixed-term savings account') &&
    page.includes('changing currency changes the unit and number format. It does not convert entered amounts'));
  add('Comparison supports copy, CSV and scoped print without replacing the existing emergency-fund report',
    page.includes('id="stsCopySummaryBtn"') && page.includes('id="stsDownloadCsvBtn"') && page.includes('id="stsPrintBtn"') &&
    app.includes("document.body.classList.add('sts-printing')") && css.includes('body.sts-printing') &&
    page.includes('id="generateReportBtn"'));

  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(coreSource, sandbox);
  const C = sandbox.CarrowmontShortTermSavingsCore;
  const approx = (a, b, tol = 0.01) => Number.isFinite(a) && Math.abs(a - b) <= tol;
  const byId = (result, id) => result.options.find(o => o.id === id);
  const sample = {
    amountNow: 100000, goalAmount: 110000, horizonMonths: 12, instantAccessAmount: 20000,
    monthlyContribution: 500, goalFlexibility: 'fixed', savingsRatePct: 3,
    termRatePct: 4, termMonths: 12, fundYieldPct: 3.5,
    governmentYieldPct: 3.8, governmentTermMonths: 12
  };
  const r = C.calculate(sample);
  add('Deterministic 12-month example produces expected projections across all four option types',
    r.ok && r.methodologyVersion === 'short-term-savings-comparison-v1.0' &&
    approx(byId(r,'savings').projectedTotal, 109124.79) &&
    approx(byId(r,'term-deposit').projectedTotal, 109950.83) &&
    approx(byId(r,'money-market-fund').projectedTotal, 109536.87) &&
    approx(byId(r,'government-bill').projectedTotal, 109785.02));
  add('Instant-access reserve is separated before comparing the lockable balance',
    r.accessReserve === 20000 && r.lockableAmount === 80000 && r.totalPlannedContributions === 6000);
  add('Money-market or cash fund remains conditional rather than being presented as a protected guaranteed deposit',
    byId(r,'money-market-fund').status === 'conditional' &&
    r.warnings.some(w => w.includes('investment product') && w.includes('protected bank deposit')));
  add('Term deposit that matures after the goal is excluded from deadline value rather than assuming early sale', (() => {
    const x = C.calculate({...sample, termMonths: 24});
    const o = byId(x,'term-deposit');
    return o.status === 'mismatch' && o.projectedTotal === null && o.maturesByGoal === false &&
      x.warnings.some(w => w.includes('fixed/term deposit matures after the goal date'));
  })());
  add('Government bill that matures after the goal is excluded from deadline value and warns about early-sale price risk', (() => {
    const x = C.calculate({...sample, governmentTermMonths: 24});
    const o = byId(x,'government-bill');
    return o.status === 'mismatch' && o.projectedTotal === null && o.maturesByGoal === false &&
      x.warnings.some(w => w.includes('selling before maturity'));
  })());
  add('Monthly contributions stay in the accessible savings layer rather than being silently added to a locked product', (() => {
    const noMonthly = C.calculate({...sample, monthlyContribution: 0});
    const withMonthly = byId(r,'term-deposit').projectedTotal;
    const withoutMonthly = byId(noMonthly,'term-deposit').projectedTotal;
    const expectedAccessibleContrib = C.futureContributions(500, 3, 12);
    return approx(withMonthly - withoutMonthly, expectedAccessibleContrib);
  })());
  add('Goal gap is calculated as goal minus projected value and is not converted into a recommendation',
    approx(byId(r,'term-deposit').goalGap, 49.17) && r.highestModeledValueOptionId === 'term-deposit' &&
    app.includes('scenario') && !/recommended provider|best provider/i.test(app));
  add('Blank rates do not cause Carrowmont to invent returns', (() => {
    const x = C.calculate({...sample, savingsRatePct:'', termRatePct:'', fundYieldPct:'', governmentYieldPct:''});
    return x.options.every(o => o.projectedTotal === null) && x.highestModeledValueOptionId === null &&
      x.warnings.some(w => w.includes('Enter the accessible savings rate'));
  })());
  add('Invalid inputs fail visibly instead of silently clamping the access reserve above current savings', (() => {
    const x = C.calculate({...sample, instantAccessAmount: 120000});
    return !x.ok && x.errors.some(e => e.includes('cannot exceed')) && x.options.length === 0;
  })());
  add('All-current-savings-as-access-reserve leaves no amount silently available for lock-up comparisons', (() => {
    const x = C.calculate({...sample, instantAccessAmount: 100000});
    return x.lockableAmount === 0 && ['term-deposit','money-market-fund','government-bill'].every(id => byId(x,id).status === 'no-lockable') &&
      x.warnings.some(w => w.includes('no remaining amount'));
  })());
  return checks;
}
