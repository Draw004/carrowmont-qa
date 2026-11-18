import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Batch 12 intentionally restores the compact homepage Ask entry that preceded
// the larger Batch 11 embedded form. This contract therefore preserves the
// Batch 11 product story/tool hierarchy while recognizing the approved rollback.
export function runFreBatch11HomepageProductContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const home=read('draw004.github.io/index.html');
  const site=read('draw004.github.io/site.js');
  const ask=read('draw004.github.io/ask-carrowmont.html');
  const sitemap=read('draw004.github.io/sitemap.xml');
  const pages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json')||'{"entries":[]}');
  const browser=readQa('tests/76-fre11-homepage-product.spec.js');

  add('Batch 11 product hierarchy keeps a compact Ask entry after the approved Batch 12 rollback',
    home.includes('data-home-ask-entry')&&home.includes('Not sure which tool to use?')&&home.includes('Ask Carrowmont')&&
    !home.includes('data-home-decision-entry')&&!home.includes('id="homeDecisionQuestion"'));
  add('Batch 11 guided decision UI is now correctly confined to the dedicated Ask page',
    ask.includes('id="askQuestion"')&&ask.includes('data-cm-page="ask-carrowmont"')&&
    !home.includes('/ask-carrowmont.html?decision=emergency-runway'));
  add('Batch 11 keeps the nine established core tool cards and View all tools discovery',
    (home.match(/data-tool-id=/g)||[]).length===9&&home.includes('View all tools'));
  add('Batch 11 keeps product story and My Carrowmont outcome before the calculator grid',
    home.indexOf('cm-product-story')<home.indexOf('cm-product-preview-section')&&home.indexOf('cm-product-preview-section')<home.indexOf('planning-section')&&home.includes('Illustrative example'));
  add('Batch 12 rollback removes the homepage free-text handoff writer while keeping Ask backward-compatible',
    !site.includes("sessionStorage.setItem(KEY")&&!home.includes('carrowmont_home_ask_handoff_v1'));
  add('Batch 11 preserves approved hero performance assets under the refreshed site runtime',
    home.includes('carrowmont-hero-mobile.webp?v=20261113-hero4')&&home.includes('fetchpriority="high"')&&home.includes('loading="eager"')&&home.includes('site.js?v=20261119-app-behavior-v5'));
  add('Batch 12 Learn expansion grows reviewed public inventory while Ask and Tools remain indexable',
    pages.entries?.length===145&&(sitemap.match(/<loc>/g)||[]).length===145&&sitemap.includes('<loc>https://carrowmont.com/ask-carrowmont.html</loc>')&&sitemap.includes('<loc>https://carrowmont.com/tools.html</loc>'));
  add('Batch 11 browser QA was updated to protect the compact Ask rollback rather than the retired embedded form',
    browser.includes('compact Ask entry')&&browser.includes('full Ask form stays on the Ask page')&&browser.includes('product story and My Carrowmont outcome'));
  return checks;
}
