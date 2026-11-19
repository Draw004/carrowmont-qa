import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carrowmont development standards gate v1.0. No dependencies, no network, no secrets.
// Existing exceptions are reported as debt, never silently grandfathered on change.
const REPOS = new Set([
  'draw004.github.io', 'sip-calculator', 'goal-planner',
  'financial-independence', 'inflation-calculator', 'retirement-calculator',
  'budget-cash-flow-planner', 'mortgage-payoff-calculator',
  'compound-interest-calculator', 'loan-calculator', 'carrowmont-qa'
]);
const TOOL_REPOS = new Set([...REPOS].filter(x => !['draw004.github.io','carrowmont-qa'].includes(x)));
const REVIEW_KEYS = ['shared_ui','country_currency','deep_links','return_routes','responsive','print','privacy','seo'];
const LOCALE_RULES = ['locale_globe', 'locale_chevron', 'locale_accessible_label', 'locale_fields'];
const read = file => fs.readFileSync(file, 'utf8');
const hasClass = (html, className) => new RegExp(`class=["'][^"']*\\b${className}\\b`).test(html);
const hasId = (html, id) => new RegExp(`\\bid=["']${id}["']`).test(html);

function localeSummary(html) {
  const start = html.search(/<details\b[^>]*class=["'][^"']*\blocale-menu\b/i);
  if (start < 0) return null;
  const remainder = html.slice(start);
  return remainder.match(/<summary\b[^>]*>[\s\S]*?<\/summary>/i)?.[0] || '';
}

export function inspectHtml(html, repo, file, { strict = false } = {}) {
  const issues = [];
  const summary = localeSummary(html);
  if (summary !== null) {
    const tool = TOOL_REPOS.has(repo);
    const globe = tool ? hasClass(summary, 'locale-globe') : hasClass(summary, 'locale-icon');
    const chevron = tool ? hasClass(summary, 'locale-chevron') : hasClass(summary, 'chevron');
    if (!globe || !/<svg\b/i.test(summary)) issues.push('locale_globe');
    if (!chevron || !/<svg\b/i.test(summary)) issues.push('locale_chevron');
    if (!/aria-label=["']Choose country and currency["']/i.test(summary)) issues.push('locale_accessible_label');
    if (tool && !['localeSummary','localeCurrent','regionSelect','currencySelect'].every(x => hasId(html, x))) {
      issues.push('locale_fields');
    }
    if (!tool && !['localeCountryLabel','localeCurrencyLabel'].every(x => hasId(html, x))) {
      issues.push('locale_fields');
    }
  }
  if (TOOL_REPOS.has(repo) && /<header\b[^>]*class=["'][^"']*\bsite-header\b/i.test(html)) {
    // Global shell on every NEW or CHANGED tool page; historically local navigation
    // is inventoried as debt, not a template for future releases.
    if (!hasClass(html,'cm-global-header')) issues.push('legacy_tool_header');
    else {
      const nav = html.match(/<nav\b[^>]*class=["'][^"']*\bcm-global-nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
      const hrefs = [...nav.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/g)].map(x => x[1]);
      const expected=['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html','/learn.html','/research.html','/search.html'];
      if (JSON.stringify(hrefs) !== JSON.stringify(expected)) issues.push('global_nav_destinations');
      if ((nav.match(/aria-current=["']page["']/g)||[]).length !== 1 || !/<a\b[^>]*href=["']\/tools\.html["'][^>]*aria-current=["']page["']/i.test(nav)) issues.push('global_nav_active_state');
      if (!/<nav\b[^>]*class=["'][^"']*cm-global-bottom-nav/.test(html) || !/<a\b[^>]*href=["']\/tools\.html["'][^>]*aria-current=["']page["']/i.test(html.match(/<nav\b[^>]*class=["'][^"']*cm-global-bottom-nav["'][^>]*>[\s\S]*?<\/nav>/)?.[0]||'')) issues.push('global_nav_mobile_state');
      if (!html.includes('/assets/ui/carrowmont-global-header.css') || !html.includes('/assets/ui/carrowmont-global-header.js')) issues.push('global_nav_shared_assets');
    }
  }
  if (strict && TOOL_REPOS.has(repo) && /<html\b/i.test(html) && /<main\b/i.test(html) &&
      !/<header\b[^>]*class=["'][^"']*\bcm-global-header\b/i.test(html)) issues.push('missing_global_header');
  if (strict && /<html\b/i.test(html) && /<main\b/i.test(html)) {
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    if (ids.length !== new Set(ids).size) issues.push('duplicate_ids');
    if (!/<title>[^<]+<\/title>/i.test(html)) issues.push('missing_title');
    if (!/<meta\s+name=["']description["']/i.test(html)) issues.push('missing_description');
    if (!/<meta\s+name=["']robots["'][^>]*noindex/i.test(html) && !/<link\s+rel=["']canonical["']/i.test(html)) {
      issues.push('missing_canonical');
    }
    if (summary !== null && TOOL_REPOS.has(repo)) {
      if (!hasClass(html,'site-header') || !hasClass(html,'brand')) issues.push('missing_shared_tool_header');
      if (!/href=["']\/tools\.html["']/.test(html) || !/href=["']\/["']/.test(html)) issues.push('missing_shared_tool_navigation');
    }
    // Only static in-page hashes can be verified here. JS-managed focus/scroll
    // and cross-tool return journeys also require browser acceptance tests.
    const anchors = [...html.matchAll(/<a\b[^>]*\bhref=["']#([^"'\s]*)["'][^>]*>/gi)]
      .map(m => m[1]).filter(x => x && !x.startsWith('!'));
    if (anchors.some(id => !hasId(html, id))) issues.push('unresolved_in_page_anchor');
  }
  return [...new Set(issues)].sort();
}

export function auditStandards(root, { manifest = null } = {}) {
  const errors = [], warnings = [], checks = [];
  const exceptionsFile = path.join(root,'draw004.github.io/docs/CARROWMONT_UI_LEGACY_EXCEPTIONS.json');
  if (!fs.existsSync(exceptionsFile)) return { errors:['Missing UI legacy-exceptions registry'], warnings, checks };
  const exceptions = JSON.parse(read(exceptionsFile)).exceptions;
  const accepted = new Map(exceptions.map(e => [e.repository+'/'+e.path, new Set(e.violations)]));
  const seenExceptions = new Set();
  const headerExceptions = new Map((JSON.parse(read(exceptionsFile)).global_header_exceptions || []).map(e => [e.repository+'/'+e.path,'legacy_tool_header']));
  const seenHeaders = new Set();
  const modifiedHtml = new Set();
  if (manifest) {
    if (manifest.schema_version !== 1 || !Array.isArray(manifest.repositories)) errors.push('Invalid publisher manifest');
    for (const repo of manifest.repositories || []) {
      if (!REPOS.has(repo.name)) { errors.push(`Unknown repo: ${repo.name}`); continue; }
      for (const file of repo.files || []) {
        if (file.path.endsWith('.html')) modifiedHtml.add(repo.name+'/'+file.path);
      }
    }
    if (modifiedHtml.size) {
      for (const key of REVIEW_KEYS) {
        if (manifest.standards_review?.[key] !== true) errors.push(`Manifest standards_review.${key} must be true for changed HTML`);
      }
    }
  }
  for (const repo of [...TOOL_REPOS,'draw004.github.io']) {
    const base = path.join(root,repo);
    if (!fs.existsSync(base)) { errors.push('Missing repository: '+repo); continue; }
    const visit = dir => {
      for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
        if (item.name === '.git' || item.name === 'node_modules') continue;
        const full = path.join(dir,item.name);
        if (item.isDirectory()) { visit(full); continue; }
        if (!item.name.endsWith('.html')) continue;
        const rel = path.relative(base,full).split(path.sep).join('/');
        const key = repo+'/'+rel;
        const strict = modifiedHtml.has(key);
        const html = read(full);
        const issues = inspectHtml(html,repo,rel,{strict});
        const allowed = new Set(accepted.get(key) || []);
        if (headerExceptions.has(key)) allowed.add(headerExceptions.get(key));
        for (const issue of issues) {
          if (allowed.has(issue) && !strict) {
            warnings.push(`${key}: known legacy issue ${issue}; must be fixed when page is changed`);
            seenExceptions.add(key+':'+issue);
            if (issue === 'legacy_tool_header') seenHeaders.add(key);
          } else errors.push(`${key}: ${issue}${strict ? ' (modified page)' : ' (unexpected baseline drift)'}`);
        }
        if (strict) checks.push(`${key}: changed HTML audited`);
      }
    };
    visit(base);
  }
  for (const key of headerExceptions.keys()) {
    if (!seenHeaders.has(key) && !modifiedHtml.has(key)) errors.push(`Stale global-header exception: ${key}`);
  }
  for (const [key, violations] of accepted) {
    for (const issue of violations) {
      if (!LOCALE_RULES.includes(issue)) errors.push(`Unknown legacy exception code: ${key}: ${issue}`);
      else if (!seenExceptions.has(key+':'+issue) && !modifiedHtml.has(key)) errors.push(`Stale or incorrect legacy exception: ${key}: ${issue}`);
    }
  }
  const required = [
    'CARROWMONT_DEVELOPMENT_START_HERE.md',
    'CARROWMONT_CURRENT_PROJECT_STATUS.md',
    'CARROWMONT_STANDARDS_INDEX.md',
    'CARROWMONT_MASTER_CONTINUITY_HANDBOOK.md',
    'CARROWMONT_NEW_CHAT_START_HERE.txt'
  ];
  for (const doc of required) {
    const p=path.join(root,'draw004.github.io/docs',doc);
    if (!fs.existsSync(p) || read(p).length < 250) errors.push('Missing/incomplete continuity file: '+doc);
  }
  return { errors, warnings, checks };
}

export function runDevelopmentStandardsContract(root) {
  const results = [];
  const audit = auditStandards(root);
  results.push({name:'standards index, current status and handover exist',ok:!audit.errors.some(x=>x.includes('continuity file'))});
  results.push({name:'known legacy selector deviations are explicitly inventoried',ok:!audit.errors.length,
    detail: `${audit.warnings.length} known legacy deviations tracked; changing those pages requires correction`});
  const good = `<html><head><title>Test</title><meta name="description" content="Test"><link rel="canonical" href="https://carrowmont.com/test.html"></head><body><header class="site-header cm-global-header"><a class="brand" href="/">CARROWMONT</a><nav class="cm-global-nav"><a href="/">Home</a><a href="/my-carrowmont.html">My Carrowmont</a><a href="/tools.html" aria-current="page">Tools</a><a href="/ask-carrowmont.html">Ask</a><a href="/learn.html">Learn</a><a href="/research.html">Research</a><a href="/search.html">Search</a></nav><nav class="cm-global-bottom-nav"><a href="/tools.html" aria-current="page">Tools</a></nav><link href="/assets/ui/carrowmont-global-header.css"><script src="/assets/ui/carrowmont-global-header.js"></script><details class="locale-menu"><summary id="localeSummary" aria-label="Choose country and currency"><span class="locale-globe"><svg></svg></span><span id="localeCurrent">India</span><span class="locale-chevron"><svg></svg></span></summary><select id="regionSelect"></select><select id="currencySelect"></select></details></header><main id="content"><a href="#content">Jump</a></main></body></html>`;
  const wrong = good.replace('<span class="locale-globe"><svg></svg></span>','').replace('<span class="locale-chevron"><svg></svg></span>','');
  results.push({name:'deliberately broken locale icons fail strict markup QA',ok:inspectHtml(good,'goal-planner','test.html',{strict:true}).length === 0 && inspectHtml(wrong,'goal-planner','test.html',{strict:true}).includes('locale_globe') && inspectHtml(wrong,'goal-planner','test.html',{strict:true}).includes('locale_chevron')});
  const badHeader = good.replace('cm-global-header','legacy-header');
  const missingTool = good.replace('<a href="/tools.html" aria-current="page">Tools</a>','');
  results.push({name:'modified tool pages with legacy headers or missing global nav fail strict gate',ok:
    inspectHtml(badHeader,'goal-planner','test.html',{strict:true}).includes('legacy_tool_header') &&
    inspectHtml(missingTool,'goal-planner','test.html',{strict:true}).includes('global_nav_destinations')});
  const strippedHeader = good.replace('site-header cm-global-header','site-header legacy');
  results.push({name:'changed tool missing canonical global header cannot pass',ok:
    inspectHtml(strippedHeader,'goal-planner','test.html',{strict:true}).includes('missing_global_header')});
  const brokenAnchor = good.replace('href="#content"','href="#missing"');
  results.push({name:'broken internal anchor and duplicate IDs fail strict QA',ok:inspectHtml(brokenAnchor,'goal-planner','test.html',{strict:true}).includes('unresolved_in_page_anchor') && inspectHtml(good.replace('<main id="content">','<main id="content"><div id="content"></div>'),'goal-planner','test.html',{strict:true}).includes('duplicate_ids')});
  const publisher = read(path.join(root,'draw004.github.io/.github/workflows/carrowmont-batch-pr-publisher.yml'));
  results.push({name:'Publisher runs the standards gate before full source/browser tests',ok:publisher.includes('Run Carrowmont standards preflight') && publisher.indexOf('Run Carrowmont standards preflight') < publisher.indexOf('Run Carrowmont source contract') && publisher.includes('development-standards-gate.mjs')});
  const status=read(path.join(root,'draw004.github.io/docs/CARROWMONT_CURRENT_PROJECT_STATUS.md'));
  results.push({name:'handover preserves original Batch 12/13 numbering and the snapshot precedence',ok:status.includes('Batch 12B') && status.includes('Batch 13') && status.includes('SNAPSHOT-MANIFEST.txt')});
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = value => { const idx=process.argv.indexOf(value); return idx<0 ? null : process.argv[idx+1]; };
  const root = flag('--root') || process.env.SOURCE_ROOT;
  if (!root) { console.error('Usage: node development-standards-gate.mjs --root /path/to/combined/source [--manifest /path/to/release-manifest.json]'); process.exit(2); }
  let manifest;
  try { manifest = flag('--manifest') ? JSON.parse(read(flag('--manifest'))) : null; }
  catch (e) { console.error('Unable to read release manifest:',e.message); process.exit(2); }
  const result = auditStandards(path.resolve(root), {manifest});
  console.log('Carrowmont Development Standards Gate');
  for (const w of result.warnings) console.log('KNOWN DEBT:',w);
  for (const c of result.checks) console.log('CHECKED:',c);
  for (const e of result.errors) console.error('FAIL:',e);
  console.log(`Standards gate: ${result.errors.length ? 'FAILED' : 'PASS'} | ${result.warnings.length} legacy issue(s) tracked | ${result.checks.length} changed HTML page(s) checked`);
  process.exit(result.errors.length ? 1 : 0);
}
