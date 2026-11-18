import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch12UxSearchLearnContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const home=read(main+'index.html');
  const site=read(main+'site.js');
  const searchCore=read(main+'search-core.js');
  const searchJs=read(main+'search.js');
  const searchHtml=read(main+'search.html');
  const askHtml=read(main+'ask-carrowmont.html');
  const askJs=read(main+'assets/ask/ask-carrowmont.js');
  const myPage=read(main+'my-carrowmont.html');
  const planJs=read(main+'assets/account/carrowmont-financial-plan.js');
  const myCss=read(main+'assets/dashboard/my-carrowmont.css');
  const learn=read(main+'learn.html');
  const learnStandard=read(main+'.github/LEARN-ARTICLE-STANDARD.md');
  const implementation=read(main+'docs/CARROWMONT_FRE_BATCH12_UX_SEARCH_LEARN_IMPLEMENTATION.md');
  const acceptance=read(main+'docs/CARROWMONT_FRE_BATCH12_ACCEPTANCE_LEDGER.md');
  const sitemap=read(main+'sitemap.xml');
  const pages=JSON.parse(read(main+'data/carrowmont-search-pages.json')||'{"entries":[]}');
  const index=JSON.parse(read(main+'data/carrowmont-search-index.json')||'{"entries":[]}');
  const aliases=JSON.parse(read(main+'data/carrowmont-search-aliases.json')||'{"groups":[],"topics":[],"intents":[]}');

  add('FRE12 homepage restores the compact Ask entry and removes the embedded Ask form',
    home.includes('data-home-ask-entry')&&home.includes('Not sure which tool to use?')&&home.includes('href="/ask-carrowmont.html"')&&
    !home.includes('data-home-decision-entry')&&!home.includes('id="homeDecisionQuestion"'));

  add('FRE12 mobile nav has one route-controlled active style and no permanently highlighted Ask tab',
    site.includes('.mobile1-nav-item[aria-current="page"]{color:#08766e;background:#eaf7f5}')&&
    site.includes("if (active === item.key) node.setAttribute('aria-current', 'page')")&&
    !site.includes('.mobile1-nav-item[data-mobile1-nav="ask"]{color:')&&
    !site.includes('.mobile1-nav-item[data-mobile1-nav="ask"][aria-current="page"]'));

  let core=null;
  try{const sandbox={};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(searchCore,sandbox);core=sandbox.CarrowmontSearchCore;}catch{}
  const correct=q=>core?.correctQuery?.(index.entries,aliases,q,{region:'IN'})?.query||'';
  const suggest=q=>core?.suggest?.(index.entries,aliases,q,{region:'IN',limit:6})||[];
  add('FRE12 Search corrects common finance typos and predicts useful partial queries locally',
    core?.version==='1.2.0'&&correct('retirment')==='retirement'&&correct('mutal fund')==='mutual fund'&&correct('mortage')==='mortgage'&&
    suggest('re').some(x=>/retirement/i.test(x.text||x.title||''))&&searchJs.includes('MIN_SUGGEST_LENGTH = 2'));
  add('FRE12 credit-card payoff intent selects the payoff calculator while balance-transfer questions select the new guide',
    !pages.entries.find(e=>e.url==='/balance-transfer-credit-card.html')?.intents?.includes('payoff')&&
    !index.entries.find(e=>e.url==='/balance-transfer-credit-card.html')?.semantic_intents?.some(x=>x.id==='payoff'&&x.strength>=6)&&
    core?.search?.(index.entries,aliases,'how to reduce credit card debt',{region:'IN',limit:1})?.[0]?.url==='/budget-cash-flow-planner/credit-card-payoff-calculator.html'&&
    core?.search?.(index.entries,aliases,'credit card balance transfer',{region:'IN',limit:1})?.[0]?.url==='/balance-transfer-credit-card.html');
  add('FRE12 My Carrowmont report model keeps stable v1.0 contract after presentation-only improvements',
    planJs.includes("const VERSION='carrowmont-financial-plan-v1.0'")&&
    planJs.includes('data-mycm-plan-jump=')&&
    planJs.includes('function jumpToArea('));

  add('FRE12 Search and Ask expose browser spelling help plus accessible local autocomplete without an external query provider',
    searchJs.includes("input.setAttribute('autocorrect', 'on')")&&searchJs.includes("input.setAttribute('spellcheck', 'true')")&&searchJs.includes("input.setAttribute('aria-autocomplete', 'list')")&&
    searchJs.includes('Keep typing, or choose a suggestion.')&&askHtml.includes('autocorrect="on"')&&askHtml.includes('aria-autocomplete="list"')&&askHtml.includes('id="askPredictive"')&&
    askJs.includes('CarrowmontSearch.suggest')&&askJs.includes('CarrowmontSearch.correct')&&!/https?:\/\//.test(searchJs));

  add('FRE12 My Carrowmont attention summary names flagged areas and jumps, focuses and highlights the selected destination',
    planJs.includes('mycm-plan-overview-links')&&planJs.includes('data-mycm-plan-jump=')&&planJs.includes('function jumpToArea(')&&planJs.includes("target.focus({preventScroll:true})")&&
    planJs.includes("target.classList.add('mycm-plan-area-focus')")&&planJs.includes("overview.setAttribute('aria-label'")&&
    myCss.includes('.mycm-plan-area{scroll-margin-top:112px}')&&myCss.includes('@media(prefers-reduced-motion:reduce){.mycm-plan-area-focus'));

  add('FRE12 PWA launch polish is Carrowmont-side, lightweight, dismisses on readiness and respects reduced motion',
    myPage.includes('cm-pwa-launching')&&myPage.includes("searchParams.get('source')==='pwa'")&&myPage.includes('class="cm-pwa-boot"')&&
    myPage.includes('requestAnimationFrame(release)')&&myPage.includes('window.setTimeout(release,900)')&&
    myCss.includes('@keyframes cm-pwa-c-breathe')&&myCss.includes('@keyframes cm-pwa-dot')&&myCss.includes('@media(prefers-reduced-motion:reduce){.cm-pwa-boot-mark'));

  const newGuides=[
    'mutual-funds-explained.html','pay-off-debt-or-invest.html','balance-transfer-credit-card.html','where-to-keep-short-term-savings.html',
    'what-to-do-with-a-lump-sum.html','early-retirement-planning.html','how-much-save-for-retirement-each-month.html'
  ];
  const visibleWords=html=>(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z0-9#]+;/gi,' ').match(/\b[\w’'-]+\b/g)||[]).length;
  const guideFailures=[];
  for(const name of newGuides){
    const html=read(main+name); const url='https://carrowmont.com/'+name;
    const sources=(html.match(/class="source-list"[\s\S]*?<\/ul>/i)?.[0].match(/<a\b/gi)||[]).length;
    const ok=Boolean(html)&&html.includes('data-cm-learn-article="1"')&&html.includes('learn-article.css?v=20261022-presentation2')&&html.includes('<strong>30-second answer</strong>')&&
      html.includes('Frequently asked questions')&&sources>=3&&visibleWords(html)>=1000&&learn.includes(`href="/${name}"`)&&sitemap.includes(`<loc>${url}</loc>`)&&
      pages.entries.some(e=>e.url===`/${name}`&&e.type==='guide')&&index.entries.some(e=>e.url===`/${name}`&&Array.isArray(e.semantic_topics)&&e.semantic_topics.length>0);
    if(!ok)guideFailures.push(name);
  }
  add('FRE12 seven new Learn guides meet depth, evidence, discovery, sitemap and semantic-search requirements',guideFailures.length===0,guideFailures.join(', '));

  const goalGuide=read(main+'planning-life-goals.html');
  add('FRE12 prioritizing multiple financial goals deepens the existing guide instead of creating a competing URL',
    goalGuide.includes('Prioritize multiple goals with a funding ladder')&&goalGuide.includes('A four-stage priority framework')&&goalGuide.includes('Use floor, target and stretch amounts')&&
    pages.entries.some(e=>e.url==='/planning-life-goals.html'&&e.aliases?.includes('how to prioritize financial goals'))&&
    !pages.entries.some(e=>/prioritiz.*financial.*goal/i.test(e.url)));

  add('FRE12 Learn expansion has exactly one reviewed sitemap/search entry per public URL',
    pages.entries.length===145&&index.entries.length===145&&(sitemap.match(/<loc>/g)||[]).length===145&&
    new Set(pages.entries.map(e=>e.url)).size===145&&new Set(index.entries.map(e=>e.url)).size===145);

  add('FRE12 Learn governance permanently requires understanding-first teaching and a content-collision review before new URLs',
    learnStandard.includes('**Version:** 2.3')&&learnStandard.includes('### Understanding-first editorial rule')&&
    learnStandard.includes('What is it?')&&learnStandard.includes('How does it work?')&&learnStandard.includes('What can go wrong?')&&
    learnStandard.includes('concept -> worked example -> change an assumption -> explain the effect')&&
    learnStandard.includes('### Existing-library and content-collision review')&&
    learnStandard.includes('improve that page rather than create a competing URL'));

  add('FRE12 implementation and acceptance records preserve formula safety and staged-browser/human-review gates',
    implementation.includes('does **not** change financial formulas')&&implementation.includes('1289 PASS / 0 FAIL')&&implementation.includes('85 / 85 PASS')&&
    implementation.includes('human PR review/merge')&&acceptance.includes('No calculator repository is modified by this release')&&
    acceptance.includes('REQUIRED AT PUBLISHER'));

  return checks;
}
