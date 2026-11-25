import fs from 'node:fs';
import path from 'node:path';

export function runLearnHub2Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const html=read(main+'learn.html');
  const js=read(main+'learn-hub2.js');
  const css=read(main+'learn-hub2.css');
  const status=read(main+'docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const roadmap=read(main+'docs/CARROWMONT_FRE_MASTER_ROADMAP_STATUS.md');
  const impl=read(main+'docs/CARROWMONT_LEARN_HUB2_IMPLEMENTATION.md');
  const ledger=read(main+'docs/CARROWMONT_LEARN_HUB2_ACCEPTANCE_LEDGER.md');
  const browser=read('carrowmont-qa/tests/100-learn-hub2.spec.js');
  const legacyBrowser=read('carrowmont-qa/tests/77-fre12-ux-search-learn.spec.js');
  const topicUrls=Array.from(html.matchAll(/<a class="category-topic" href="([^"]+)"/g),m=>m[1]);
  const categories=Array.from(html.matchAll(/<section class="category-box(?: [^"]*)?"[^>]*data-category="([^"]+)"/g),m=>m[1]);

  add('Learn Hub 2.0 replaces the embedded all-site Search UI with a dedicated educational discovery surface',
    html.includes('class="learn2-discovery-section"') && html.includes('id="learn2SearchInput"') && html.includes('Search Learn') && html.includes('Search all Carrowmont →') && !html.includes('data-cm-search-root'));
  add('Learn Hub 2.0 exposes six situation-first entry points without presenting them as personalized advice',
    (html.match(/data-learn-situation=/g)||[]).length===6 && html.includes('Get my money organised') && html.includes('Reduce debt and borrowing pressure') && html.includes('Plan for a home') && html.includes('Start or improve investing') && html.includes('Prepare for retirement or FI') && html.includes('Understand markets and inflation') && html.includes('not a required financial order or personalized advice'));
  add('Learn Hub 2.0 keeps the expanded complete static source library as progressive-enhancement and SEO/no-JS fallback',
    new Set(topicUrls).size===108 && categories.length===11 && html.includes('Interactive Learn discovery needs JavaScript. The full topic library remains available below.') && css.includes('body.learn-hub2-ready .learn-hub-section .planning-categories{display:none}'));
  add('Learn Hub 2.0 builds topic counts and related-tool routes from the existing source library rather than a duplicated hand-maintained inventory',
    js.includes("qa('.planning-categories .category-box')") && js.includes("qa('.category-topic',category.box)") && js.includes("q('.category-tool-link',box)") && js.includes('category.count') && js.includes('Related calculator: '));
  add('Learn Hub 2.0 offers All/Start/Explain/Compare/Plan learning-style filters with semantic-intent reuse and cautious title fallback',
    ['data-learn-intent="all"','data-learn-intent="start"','data-learn-intent="explain"','data-learn-intent="compare"','data-learn-intent="plan"'].every(token=>html.includes(token)) && js.includes('semantic_intents') && js.includes("ids.has('compare')") && js.includes("ids.has('explain')") && js.includes("['plan','calculate','payoff','afford','timing']"));
  add('Learn Hub 2.0 reuses the local SearchCore ranking, typo correction and suggestions only against Learn-library candidates',
    js.includes('core().correctQuery(entries,state.aliases') && js.includes('core().search(entries,state.aliases') && js.includes('core().suggest(entries,state.aliases') && js.includes("type:'guide'") && !/\b(fetch|XMLHttpRequest|WebSocket)\b/.test(js));
  add('Learn Hub 2.0 makes privacy and scope explicit and keeps global Search as the separate tools/research route',
    html.includes("Your words are not sent to an external search provider") && html.includes('For calculators, research and everything else, use the full Carrowmont Search.') && html.includes('href="/search.html"'));
  add('Learn Hub 2.0 limits visual page length with a desktop result pane and returns to normal page scrolling on mobile',
    css.includes('.learn2-results-scroll{') && css.includes('max-height:650px') && css.includes('overflow-y:auto') && css.includes('scrollbar-gutter:stable') && css.includes('.learn2-results-scroll{max-height:none;overflow:visible') && css.includes('.learn2-situations{display:flex') && css.includes('.learn2-chip-row{flex-wrap:nowrap') && css.includes('grid-template-columns:minmax(0,1fr)') && css.includes('min-width:0;max-width:100%'));
  add('Learn Hub 2.0 preserves established Learn topic hashes and routes the shared topic banner into the enhanced topic state',
    js.includes("'home-loans':'home'") && js.includes("'loans-and-debt':'loans'") && js.includes("'market-mechanics':'macro'") && js.includes("raw.indexOf('topic-')===0") && js.includes("[data-cm-learn-topic-nav] a[data-cm-learn-topic]") && browser.includes('legacy Learn topic hashes and shared topic banner activate the enhanced hub'));
  add('Learn Hub 2.0 refreshes localized source labels after country changes instead of freezing India/global terminology',
    js.includes("window.addEventListener('carrowmont:localechange'") && js.includes('buildLibrary(data);render();') && html.includes('learn-localization.js'));
  add('Learn Hub 2.0 removes unverified popularity wording while preserving editorial starting points',
    !html.includes('POPULAR PLANNING QUESTIONS') && html.includes('COMMON PLANNING QUESTIONS') && html.includes('Editorial starting points'));
  add('Learn Hub 2.0 browser QA covers desktop containment, Learn-only typo search, topic tools, situation filters and mobile scrolling',
    browser.includes('contained right-edge result scroller') && browser.includes('guide-only, typo tolerant') && browser.includes('related calculator') && browser.includes('situation and learning-style controls') && browser.includes('mobile Learn uses normal page scrolling') && legacyBrowser.includes('remain in the source library'));
  add('Learn Hub 2.0 continuity preserves benchmark rationale and allows the roadmap to progress beyond the completed Evergreen phase',
    Boolean(impl&&ledger) && impl.includes('External benchmark research') && impl.includes('MoneyHelper') && impl.includes('Moneysmart') && impl.includes('Consumer Financial Protection Bureau') && impl.includes('Fidelity') && impl.includes('Vanguard') && impl.includes('NerdWallet') && impl.includes('without copying') && impl.includes('No new public URLs') && ledger.includes('Publisher -> merge -> QA -> Guard -> Source Snapshot') && status.includes('Learn Hub 2.0') && status.includes('completed and deployed') && roadmap.includes('Evergreen Learn Wave 1') && roadmap.includes('Measurement / next-priority review'));
  add('Learn Hub 2.0 preserves deferred high-risk roadmap boundaries',
    status.includes('Batch 13B') && status.includes('ON HOLD') && status.includes('Batch 14') && /traffic\/usage-gated|TRAFFIC-GATED/i.test(status));
  return checks;
}
