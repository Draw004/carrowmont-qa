import fs from 'node:fs';
import path from 'node:path';

export function runFreBatch12SeoIndexingCloseoutContract(root) {
  const out = [];
  const add = (name, ok, detail='') => out.push({ name, ok: !!ok, detail });
  const read = rel => {
    const p = path.join(root, rel);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  };

  const sitemap = read('draw004.github.io/sitemap.xml');
  const searchPagesRaw = read('draw004.github.io/data/carrowmont-search-pages.json');
  const searchHtml = read('draw004.github.io/search.html');
  const status = read('draw004.github.io/docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const roadmap = read('draw004.github.io/docs/CARROWMONT_FRE_MASTER_ROADMAP_STATUS.md');
  const closeout = read('draw004.github.io/docs/CARROWMONT_BATCH12_SEO_INDEXING_CLOSEOUT.md');

  let searchEntries = [];
  try { searchEntries = JSON.parse(searchPagesRaw).entries || []; } catch {}
  const locs = [...sitemap.matchAll(/<loc>(https:\/\/carrowmont\.com[^<]*)<\/loc>/g)].map(m => m[1]);
  add('sitemap and Search inventory remain 145 unique public URLs',
    locs.length === 145 && new Set(locs).size === 145 && searchEntries.length === 145 && new Set(searchEntries.map(x=>x.url)).size === 145,
    `sitemap=${locs.length}/${new Set(locs).size}; search=${searchEntries.length}/${new Set(searchEntries.map(x=>x.url)).size}`);

  add('internal Search remains noindex,follow and excluded from sitemap/Search inventory',
    /<meta[^>]+name=["']robots["'][^>]+content=["']noindex,follow["']/i.test(searchHtml) &&
    !sitemap.includes('https://carrowmont.com/search.html') &&
    !searchEntries.some(x => x.url === '/search.html'));

  const intendedNoindex = ['404.html','search.html','newsletter-confirmed.html'];
  const noindexInSitemap = [];
  for (const name of intendedNoindex) {
    const html = read(`draw004.github.io/${name}`);
    if (/noindex/i.test(html) && sitemap.includes(`https://carrowmont.com/${name}`)) noindexInSitemap.push(name);
  }
  add('intentional Main noindex pages are not submitted in sitemap', noindexInSitemap.length === 0, noindexInSitemap.join(', '));

  const repoPrefixes = [
    ['/sip-calculator/','sip-calculator'],
    ['/goal-planner/','goal-planner'],
    ['/financial-independence/','financial-independence'],
    ['/inflation-calculator/','inflation-calculator'],
    ['/retirement-calculator/','retirement-calculator'],
    ['/budget-cash-flow-planner/','budget-cash-flow-planner'],
    ['/mortgage-payoff-calculator/','mortgage-payoff-calculator'],
    ['/compound-interest-calculator/','compound-interest-calculator'],
    ['/loan-calculator/','loan-calculator'],
  ];
  const sitemapPageIssues = [];
  for (const url of locs) {
    const pathname = url.replace('https://carrowmont.com','') || '/';
    let repo = 'draw004.github.io';
    let rel = pathname.replace(/^\//,'') || 'index.html';
    for (const [prefix,name] of repoPrefixes) {
      if (pathname.startsWith(prefix)) {
        repo = name;
        rel = pathname.slice(prefix.length) || 'index.html';
        break;
      }
    }
    const abs = path.join(root, repo, rel);
    if (!fs.existsSync(abs)) { sitemapPageIssues.push(`${url}: missing source`); continue; }
    const html = fs.readFileSync(abs,'utf8');
    const robotsMeta = html.match(/<meta[^>]+(?:name=["']robots["'][^>]*|content=["'][^"']*noindex[^"']*["'][^>]*)>/i)?.[0] || '';
    if (/noindex/i.test(robotsMeta)) sitemapPageIssues.push(`${url}: noindex`);
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] || '';
    if (!canonical || canonical.replace(/\/$/,'') !== url.replace(/\/$/,'')) sitemapPageIssues.push(`${url}: canonical=${canonical || 'missing'}`);
  }
  add('all 145 sitemap URLs map to indexable source pages with matching canonicals', sitemapPageIssues.length === 0, sitemapPageIssues.slice(0,8).join('; '));

  const expectedLastmod = new Map([
    ['https://carrowmont.com/','2026-11-18'],
    ['https://carrowmont.com/learn.html','2026-11-20'],
    ['https://carrowmont.com/tools.html','2026-11-21'],
    ['https://carrowmont.com/ask-carrowmont.html','2026-11-22'],
    ['https://carrowmont.com/my-carrowmont.html','2026-11-22'],
    ['https://carrowmont.com/emergency-fund-runway-calculator.html','2026-11-21'],
    ['https://carrowmont.com/financial-independence/','2026-11-22'],
    ['https://carrowmont.com/mortgage-payoff-calculator/','2026-11-22'],
    ['https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html','2026-11-22'],
  ]);
  const freshnessFailures = [];
  for (const [url,date] of expectedLastmod) {
    const esc = url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const m = sitemap.match(new RegExp(`<loc>${esc}<\\/loc>\\s*<lastmod>([^<]+)<\\/lastmod>`));
    if (!m || m[1] !== date) freshnessFailures.push(`${url}=${m?.[1] || 'missing'} expected ${date}`);
  }
  add('Batch 12 materially changed sitemap entries carry reconciled significant-update dates', freshnessFailures.length === 0, freshnessFailures.join('; '));

  add('Batch 12 remains recorded complete while Batch 13A stays sandbox-only and live 13B remains gated',
    status.includes('Batch 12') && status.includes('SEO/indexing closeout are complete') &&
    roadmap.includes('| 12B | Wider Resolution Library & Opportunity Engine. **Completed.**') &&
    status.includes('Batch 13A Connected Financial Data Readiness') && status.includes('production feature flag OFF') &&
    status.includes('Batch 13B live provider pilot') && status.includes('not approved yet') &&
    status.includes('Repository branch cleanup') && status.includes('deferred'));

  const supportAssets = [
    'docs/research/mortgage-affordability-monitor-methodology.md',
    'data/research/mortgage-affordability-monitor.json',
    'docs/research/emergency-savings-resilience-methodology.md',
    'data/research/mortgage-affordability-monitor.csv',
    'data/research/emergency-savings-resilience.json',
  ];
  add('research support assets seen as crawled-not-indexed stay out of the public sitemap',
    supportAssets.every(rel => !sitemap.includes(`https://carrowmont.com/${rel}`)));

  add('orphan root planner/FAQ URLs reported by Bing stay out of sitemap and Search inventory',
    !sitemap.includes('https://carrowmont.com/planner.html') &&
    !sitemap.includes('https://carrowmont.com/faq.html') &&
    !searchEntries.some(x => x.url === '/planner.html' || x.url === '/faq.html'));

  const rentBuyHtml = read('draw004.github.io/rent-vs-buy-home.html');
  add('Rent vs Buy recovery candidate remains canonical, internally indexable and submitted in sitemap',
    sitemap.includes('https://carrowmont.com/rent-vs-buy-home.html') &&
    /<link(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["']https:\/\/carrowmont\.com\/rent-vs-buy-home\.html["'])[^>]*>/i.test(rentBuyHtml));

  const googleQueue = [...closeout.matchAll(/^\d+\. `https:\/\/carrowmont\.com\//gm)];
  add('closeout documents a selective 15-URL Google inspection/indexing queue', googleQueue.length === 15, `queue=${googleQueue.length}`);
  add('current console evidence is documented without treating intentional redirect/noindex states as defects',
    closeout.includes('139 indexed / 11 not indexed') &&
    closeout.includes('159 indexed, 1 warning, 8 excluded') &&
    closeout.includes('Discovered - currently not indexed') &&
    closeout.includes('Keep them as 404s rather than creating speculative redirects'));
  add('closeout explicitly preserves one existing IndexNow mechanism and forbids indexing search.html',
    closeout.includes('do not add a second one') && closeout.includes('Do not request Google indexing for internal Search') && closeout.includes('search.html` intentionally remains `noindex,follow`'));

  return out;
}
