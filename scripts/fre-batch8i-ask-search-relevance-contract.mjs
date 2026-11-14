import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch8iAskSearchRelevanceContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(new URL('..',import.meta.url).pathname);
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const coreSource=read(main+'search-core.js');
  const aliases=JSON.parse(read(main+'data/carrowmont-search-aliases.json')||'{"groups":[],"topics":[],"intents":[]}');
  const pages=JSON.parse(read(main+'data/carrowmont-search-pages.json')||'{"entries":[]}');
  const index=JSON.parse(read(main+'data/carrowmont-search-index.json')||'{"entries":[]}');
  const builder=read(main+'scripts/build-search-index.mjs');
  const searchJs=read(main+'search.js');
  const askJs=read(main+'assets/ask/ask-carrowmont.js');
  const learnStandard=read(main+'.github/LEARN-ARTICLE-STANDARD.md');
  const htmlFiles=['ask-carrowmont.html','learn.html','search.html','tools.html'].map(name=>read(main+name));

  const sandbox={}; sandbox.globalThis=sandbox; vm.createContext(sandbox); vm.runInContext(coreSource,sandbox,{filename:'search-core.js'});
  const core=sandbox.CarrowmontSearchCore;
  const topicIds=new Set((aliases.topics||[]).map(x=>x.id));
  const intentIds=new Set((aliases.intents||[]).map(x=>x.id));

  add('8I uses a broad reviewed topic and intent taxonomy rather than gold-only query rules',
    aliases.topics?.length>=25&&aliases.intents?.length>=9&&topicIds.has('gold')&&topicIds.has('retirement')&&topicIds.has('debt')&&topicIds.has('budgeting')&&topicIds.has('home-mortgage')&&topicIds.has('inflation')&&topicIds.has('financial-independence')&&topicIds.has('car')&&topicIds.has('credit-profile')&&!coreSource.includes("queryNormalized.includes('gold')"));
  add('8I every indexed guide/tool has precomputed semantic topic coverage for future scale',
    index.entries?.length===138&&index.entries.filter(e=>e.type!=='carrowmont').every(e=>Array.isArray(e.semantic_topics)&&e.semantic_topics.length>0));
  add('8I semantic index stays within the existing reviewed public URL inventory',
    pages.entries?.length===138&&index.entries?.length===138&&new Set(pages.entries.map(e=>e.url)).size===138&&new Set(index.entries.map(e=>e.url)).size===138);
  add('8I builder enforces topic coverage and supports explicit topic/intent metadata for future pages',
    builder.includes('guide/tool must map to at least one reviewed search topic')&&builder.includes("for (const key of ['topics', 'intents'])")&&builder.includes('semantic_topics')&&builder.includes('semantic_intents'));
  add('8I Learn standard tells future content expansion how to join Ask/Search without ranking-code exceptions',
    learnStandard.includes('Ask & Search relevance metadata')&&learnStandard.includes('fails a new guide/tool build if it maps to no recognized topic')&&learnStandard.includes('instead of hard-coding a special query in `search-core.js`'));
  add('8I Ask requests intent-aware routing while Search keeps the broader shared result engine',
    askJs.includes("search(query,{limit:6,mode:'ask'})")&&searchJs.includes("opts.mode === 'ask'")&&coreSource.includes('function searchForAsk('));
  add('8I refreshed assets prevent stale relevance code after deployment',
    searchJs.includes("carrowmont-search-aliases.json?v=20261114-fre8i")&&htmlFiles.every(html=>html.includes('search-core.js?v=20261114-fre8i')&&html.includes('search.js?v=20261114-fre8i'))&&htmlFiles[0].includes('ask-carrowmont.js?v=20261114-fre8i'));

  function results(q,limit=12){return core.search(index.entries,aliases,q,{region:'IN',limit});}
  function ask(q,limit=3){return core.searchForAsk(index.entries,aliases,q,{region:'IN',limit});}
  function urls(list){return list.map(x=>x.url);}
  const semanticCases=[
    ['how to start investing in gold','/gold-as-an-investment.html',['/investing-for-beginners.html','/physical-gold-vs-gold-etf.html']],
    ['how to invest in gold','/gold-as-an-investment.html',['/why-central-banks-buy-gold.html','/physical-gold-vs-gold-etf.html']],
    ['starting retirement planning','/retirement-calculator/planner.html',['/retirement-calculator/']],
    ['how to calculate inflation','/inflation-calculator/',[]],
    ['how to pay debt faster','/budget-cash-flow-planner/debt-payoff-calculator.html',[]],
    ['how much emergency savings do i need','/emergency-fund-runway-calculator.html',['/emergency-fund-how-much.html']],
    ['how to improve credit score','/credit-score-explained.html',[]],
    ['mortgage refinance','/mortgage-payoff-calculator/refinance-break-even.html',[]],
    ['how much car can i afford','/car-affordability-auto-decision-calculator.html',[]],
    ['start financial independence planning','/financial-independence/',[]],
    ['compound growth calculator','/compound-interest-calculator/',[]],
    ['how to withdraw retirement money','/retirement-calculator/withdrawal-calculator.html',[]],
    ['research inflation purchasing power','/research/inflation-purchasing-power-monitor.html',[]]
  ];
  const failures=[];
  for(const [q,first,includes] of semanticCases){const r=results(q);const u=urls(r);if(u[0]!==first||includes.some(x=>!u.includes(x)))failures.push(`${q} => ${u.slice(0,5).join(', ')}`);}
  add('8I topic-wide semantic matrix covers investing, retirement, inflation, debt, emergency savings, credit, mortgages, cars, FI, compounding, withdrawals and Research',failures.length===0,failures.join(' | '));

  const askGoldStart=urls(ask('how to start investing in gold'));
  const askGoldBeginner=urls(ask('gold investing for beginners'));
  add('8I Ask combines specific topic and user intent so gold-start wording keeps both gold and beginner guidance',
    askGoldStart[0]==='/gold-as-an-investment.html'&&askGoldStart[1]==='/investing-for-beginners.html'&&askGoldBeginner[0]==='/gold-as-an-investment.html'&&askGoldBeginner[1]==='/investing-for-beginners.html');
  add('8I near-equivalent gold-investing wording keeps the same canonical direct page first',
    ['how to invest in gold','how to start investing in gold','gold investing for beginners','ways to invest in gold'].every(q=>results(q)[0]?.url==='/gold-as-an-investment.html'));
  add('8I nonsense still returns no misleading semantic match',results('zzzzxyqnotatopic').length===0);
  add('8I Ask-to-Search privacy handoff remains session-only and URL-free',
    askJs.includes("sessionStorage.setItem(SEARCH_HANDOFF_KEY")&&searchJs.includes('sessionStorage.removeItem(ASK_SEARCH_HANDOFF_KEY)')&&!searchJs.includes('URLSearchParams().set'));

  const legacyAskQa=readQa('tests/61-fre3b-ask-carrowmont.spec.js');
  add('8I legacy Ask browser QA follows the new semantic fallback copy instead of the retired 8F wording',
    legacyAskQa.includes("toContainText('Best Carrowmont matches')")&&legacyAskQa.includes("toContainText('Start here')")&&!legacyAskQa.includes("toContainText('Here is a good place to start')"));

  const browserQa=readQa('tests/69-fre8i-ask-search-relevance.spec.js');
  add('8I browser QA protects the user-reported gold wording regression and broader Search handoff',
    browserQa.includes('how to start investing in gold')&&browserQa.includes('Gold as an Investment: Risks and Role')&&browserQa.includes('Investing for Beginners: A Simple Starting Guide')&&browserQa.includes('how to calculate inflation')&&browserQa.includes('how to pay debt faster'));
  return checks;
}
