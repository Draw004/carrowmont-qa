import fs from 'node:fs';
import path from 'node:path';

// SEOOPS1 is deliberately a crawl-management check, NOT data access control,
// an indexing-removal guarantee, or a security certification.
export function parseCarrowmontRobots(text) {
  if (typeof text !== 'string') return { rules: [], sitemap: '', errors: ['robots.txt missing'] };
  const rules = [];
  const errors = [];
  let inGenericGroup = false;
  let sitemap = '';
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.split('#')[0].trim();
    if (!stripped) continue;
    const match = stripped.match(/^([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) { errors.push('malformed robots.txt directive'); continue; }
    const key = match[1].toLowerCase();
    const value = match[2];
    if (key === 'user-agent') inGenericGroup = value === '*';
    else if (key === 'sitemap') sitemap = value;
    else if (inGenericGroup && (key === 'allow' || key === 'disallow')) {
      if (!value.startsWith('/')) errors.push(`invalid ${key} path`);
      else rules.push({ type: key, path: value });
    }
  }
  if (!rules.length) errors.push('generic user-agent crawl rules missing');
  return { rules, sitemap, errors };
}

// Longest prefix determines the rule in this deliberately simple policy.
// No wildcards/regex are used by the Carrowmont robots.txt in SEOOPS1.
export function isAllowedByCarrowmontRobots(urlPath, policy) {
  const pathname = new URL(urlPath, 'https://carrowmont.com').pathname;
  const matches = policy.rules.filter(r => pathname.startsWith(r.path));
  if (!matches.length) return true;
  matches.sort((a, b) => b.path.length - a.path.length || (a.type === 'allow' ? -1 : 1));
  return matches[0].type === 'allow';
}

export function compareSeoOps1Policy(robotsText, publicSitemapXml) {
  const findings = [];
  const policy = parseCarrowmontRobots(robotsText);
  findings.push(...policy.errors);
  if (policy.sitemap !== 'https://carrowmont.com/sitemap.xml') findings.push('canonical sitemap reference is missing or changed');
  for (const folder of ['/docs/', '/ops/']) {
    if (isAllowedByCarrowmontRobots(folder + 'test.txt', policy)) findings.push(`crawler can reach ${folder}`);
    if (!policy.rules.some(x => x.type === 'disallow' && x.path === folder)) findings.push(`explicit ${folder} disallow is missing`);
  }
  if (!policy.rules.some(x => x.type === 'allow' && x.path === '/')) findings.push('public site generic allow rule missing');
  const locMatches = [...String(publicSitemapXml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)];
  if (locMatches.length < 140) findings.push(`sitemap has unexpectedly few URLs (${locMatches.length})`);
  const publicPaths = locMatches.map(x => x[1].trim());
  if (new Set(publicPaths).size !== publicPaths.length) findings.push('duplicate sitemap URLs');
  for (const raw of publicPaths) {
    let url;
    try { url = new URL(raw); } catch { findings.push(`invalid sitemap URL: ${raw.slice(0, 60)}`); continue; }
    if (url.origin !== 'https://carrowmont.com') findings.push('noncanonical sitemap origin');
    if (!isAllowedByCarrowmontRobots(url.pathname, policy)) findings.push(`indexed public URL is blocked: ${url.pathname}`);
  }
  return findings;
}

export function runSeoOps1CrawlBoundaryContract(sourceRoot) {
  const website = path.join(sourceRoot, 'draw004.github.io');
  const qa = path.join(sourceRoot, 'carrowmont-qa');
  const read = rel => {
    try { return fs.readFileSync(path.join(website, rel), 'utf8'); } catch { return ''; }
  };
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');
  const problems = compareSeoOps1Policy(robots, sitemap);
  const docsPresent = fs.existsSync(path.join(website, 'docs', 'CARROWMONT_CURRENT_PROJECT_STATUS.md'));
  const registryPresent = fs.existsSync(path.join(website, 'ops', 'credential-expiry-registry.json'));
  const reviewPath = path.join(qa, 'docs', 'CARROWMONT_SEOOPS1_PUBLIC_CRAWL_BOUNDARIES_2026-11-28.md');
  const review = fs.existsSync(reviewPath) ? fs.readFileSync(reviewPath, 'utf8') : '';
  return [
    { name: 'robots.txt reserves operational docs and registry from ordinary search crawling but keeps public sitemap valid', ok: problems.length === 0, detail: problems.slice(0, 5).join('; ') },
    { name: 'existing status documents and automation registry remain available to source and scheduled scripts', ok: docsPresent && registryPresent },
    { name: 'crawl housekeeping documentation explicitly denies secrecy or indexing-removal guarantees', ok: review.includes('not access control') && review.includes('not a noindex guarantee') && review.includes('public GitHub repository') && review.includes('Google Search Console') && review.includes('Bing Webmaster Tools') },
  ];
}
