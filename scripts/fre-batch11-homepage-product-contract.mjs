import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runFreBatch11HomepageProductContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const home=read('draw004.github.io/index.html');
  const css=read('draw004.github.io/carrowmont.css');
  const site=read('draw004.github.io/site.js');
  const ask=read('draw004.github.io/assets/ask/ask-carrowmont.js');
  const spec=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH11_HOMEPAGE_PRODUCT_TRANSFORMATION.md');
  const ledger=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH11_ACCEPTANCE_LEDGER.md');
  const sitemap=read('draw004.github.io/sitemap.xml');
  const pagesText=read('draw004.github.io/data/carrowmont-search-pages.json');
  let pages=null;try{pages=JSON.parse(pagesText);}catch{}
  const browser=readQa('tests/76-fre11-homepage-product.spec.js');
  const qaCommon=readQa('helpers/common.js');
  const toolsHubBrowser=readQa('tests/12-tools-hub.spec.js');
  const newsletterBrowser=readQa('tests/55-newsletter1-money-in-real-life.spec.js');

  add('Batch 11 homepage leads with a labelled problem-first Ask entry',home.includes('data-home-decision-entry')&&home.includes('id="homeDecisionQuestion"')&&home.includes('What are you trying to figure out?')&&home.includes('Ask Carrowmont'));
  add('Batch 11 keeps all six established guided Ask decisions visible on the homepage',[
    'debt-vs-savings','car-affordability','mortgage-prepay-vs-invest','emergency-runway','cash-flow-shortfall','money-priorities'
  ].every(intent=>home.includes(`/ask-carrowmont.html?decision=${intent}`)));
  add('Batch 11 keeps a clear direct-calculator alternative and the nine established core tool cards',home.includes('Prefer to calculate yourself?')&&home.includes('data-home-tools-fallback')&&(home.match(/data-tool-id=/g)||[]).length===9&&home.includes('View all tools'));
  add('Batch 11 orders product story and My Carrowmont outcome before the calculator feature grid',home.indexOf('cm-product-story')<home.indexOf('cm-product-preview-section')&&home.indexOf('cm-product-preview-section')<home.indexOf('planning-section')&&home.includes('Illustrative example'));
  add('Batch 11 homepage-to-Ask free text uses a short-lived same-tab handoff rather than a URL query',site.includes("KEY='carrowmont_home_ask_handoff_v1'")&&site.includes('MAX_AGE_MS=15*60*1000')&&site.includes('sessionStorage.setItem(KEY')&&site.includes("window.location.assign('/ask-carrowmont.html')")&&!site.includes("window.location.assign('/ask-carrowmont.html?q="));
  add('Batch 11 Ask consumes the homepage handoff once, validates age and removes it before classification',ask.includes("HOME_ASK_HANDOFF_KEY='carrowmont_home_ask_handoff_v1'")&&ask.includes('HOME_ASK_HANDOFF_MAX_AGE_MS=15*60*1000')&&ask.includes('sessionStorage.removeItem(HOME_ASK_HANDOFF_KEY)')&&ask.includes('readHomeAskHandoff()')&&ask.includes("$('askQuestion').value=homeHandoff.query")&&ask.includes('startFromText()'));
  add('Batch 11 QA navigation isolation preserves the one-time homepage Ask handoff across the page transition',qaCommon.includes("homeAskHandoffKey = 'carrowmont_home_ask_handoff_v1'")&&qaCommon.includes('const homeAskHandoff = sessionStorage.getItem(homeAskHandoffKey)')&&qaCommon.includes('if (homeAskHandoff) sessionStorage.setItem(homeAskHandoffKey, homeAskHandoff)'));
  add('Batch 11 keeps the weekly newsletter immediately after the My Carrowmont preview and before direct calculator discovery',site.includes("var productPreview = main.querySelector('.cm-product-preview-section')")&&site.includes('main.insertBefore(section, productPreview.nextSibling)')&&newsletterBrowser.includes("previousElementSibling?.classList.contains('cm-product-preview-section')")&&newsletterBrowser.includes("nextElementSibling?.classList.contains('planning-section')"));
  add('Batch 11 historical Tools Hub QA targets the calculator-grid View all tools link rather than the earlier product-preview fallback',toolsHubBrowser.includes("page.locator('.planning-section a.text-link[href=\"/tools.html\"]')"));
  add('Batch 11 does not weaken direct Ask decisions or Batch 10B account-aware behavior',ask.includes("const decision=new URL(window.location.href).searchParams.get('decision')")&&ask.indexOf('if(decision && INTENT_COPY[decision])')<ask.indexOf('const homeHandoff=readHomeAskHandoff()')&&home.includes('Relevant current My Carrowmont details can be reused'));
  add('Batch 11 mobile styling stacks the question action and makes suggested decisions touch-scrollable',css.includes('.home-decision-entry')&&css.includes('.home-decision-input-row')&&css.includes('@media(max-width:700px)')&&css.includes('.home-decision-suggestions{display:flex;flex-wrap:nowrap;overflow-x:auto')&&css.includes('.home-decision-input-row{grid-template-columns:1fr}'));
  add('Batch 11 preserves approved hero performance assets and adds no new homepage script request',home.includes('carrowmont-hero-mobile.webp?v=20261113-hero4')&&home.includes('fetchpriority="high"')&&home.includes('loading="eager"')&&!home.includes('/assets/home/')&&home.includes('site.js?v=20261117-fre11')&&home.includes('carrowmont.css?v=20261117-fre11'));
  add('Batch 11 leaves public URL inventory unchanged and keeps Ask plus tool discovery indexable',Boolean(pages)&&pages.entries?.length===138&&(sitemap.match(/<loc>/g)||[]).length===138&&sitemap.includes('<loc>https://carrowmont.com/ask-carrowmont.html</loc>')&&sitemap.includes('<loc>https://carrowmont.com/tools.html</loc>'));
  add('Batch 11 stable docs avoid temporary post-release status wording and include the 14-dimension review',spec.includes('Stable release-record rule')&&!/Implemented for Publisher validation|release gates pending|PENDING all-green/i.test(spec+ledger)&&ledger.includes('14-dimension Change-Impact Matrix')&&ledger.includes('| Formulas / engines |')&&ledger.includes('| Architecture / rollback |'));
  add('Batch 11 browser QA protects privacy hierarchy direct tools and mobile geometry',browser.includes('free-text homepage question reaches Ask without a URL query')&&browser.includes('product story and My Carrowmont outcome precede the core tool grid')&&browser.includes('Prefer to calculate yourself')&&browser.includes('390')&&browser.includes('sessionStorage'));
  return checks;
}
