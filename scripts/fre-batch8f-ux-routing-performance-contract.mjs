import fs from 'node:fs';
import path from 'node:path';

export function runFreBatch8fUxRoutingPerformanceContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok,detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const home=read(main+'index.html'); const css=read(main+'carrowmont.css');
  const learn=read(main+'learn.html'); const search=read(main+'search.js'); const searchCss=read(main+'search.css');
  const ask=read(main+'ask-carrowmont.html'); const askJs=read(main+'assets/ask/ask-carrowmont.js');
  const research=read(main+'research.html'); const privacy=read(main+'privacy.html'); const site=read(main+'site.js');
  const qaCommon=read('carrowmont-qa/helpers/common.js');
  add('homepage removes the redundant Explore freely strip while keeping the connected journey',!home.includes('Explore freely.') && /cm-product-journey/.test(home) && ['Plan','Keep','Track','Understand'].every(x=>home.includes('>'+x+'</h3>')));
  add('mobile navigation keeps the established My Money label',site.includes("{ key: 'my', label: 'My Money', href: '/my-carrowmont.html' }"));
  add('hero keeps the approved responsive assets but loads them early with the new cache version',home.includes('20261113-hero4') && home.includes('fetchpriority="high"') && home.includes('loading="eager"') && (home.match(/rel="preload" as="image"/g)||[]).length===3);
  for(const [name,limit] of [['carrowmont-hero.webp',190000],['carrowmont-hero-laptop.webp',190000],['carrowmont-hero-mobile.webp',150000]]){const p=path.join(root,main+name);add(name+' is materially lighter',fs.existsSync(p)&&fs.statSync(p).size<limit,String(fs.existsSync(p)?fs.statSync(p).size:'missing'));}
  add('Ask is a traffic controller and no longer exposes backlog language',/Best Carrowmont matches/.test(ask) && /guided money decision/.test(ask) && /CarrowmontSearch\.search/.test(askJs) && /carrowmont_search_handoff_v1/.test(askJs) && !/not available yet|has not been built yet|still growing/i.test(ask));
  add('Ask uses a private same-session handoff to full Search',/sessionStorage\.setItem\(SEARCH_HANDOFF_KEY/.test(askJs) && /See all search results/.test(ask) && !/\?q=|URLSearchParams/.test(askJs));
  add('QA cleaner preserves the Ask-to-Search handoff across navigation',/carrowmont_search_handoff_v1/.test(qaCommon) && /if \(searchHandoff\) sessionStorage\.setItem\(searchHandoffKey, searchHandoff\)/.test(qaCommon));
  add('Search distinguishes Learn Tool and Research result types',/return 'Research'/.test(search) && /return 'Tool'/.test(search) && /return 'Learn'/.test(search));
  add('explicit Search actions reveal a query-labelled result heading while live typing stays put',/Results for/.test(search) && /revealResults/.test(search) && /runWidgetSearch\(widget, input\.value, \{ reveal: true \}\)/.test(search) && /runDebounced = debounce\(function \(\) \{ runWidgetSearch\(widget, input\.value\); \}/.test(search));
  add('Search consumes Ask handoff once without URL query state',/sessionStorage\.removeItem\(ASK_SEARCH_HANDOFF_KEY\)/.test(search) && /ASK_SEARCH_HANDOFF_MAX_AGE_MS/.test(search));
  add('Learn presents Search as a compact utility',/Find something in Carrowmont/.test(learn) && /Search guides, tools and research using everyday words/.test(learn) && /search is a fast utility/.test(searchCss));
  add('Research is global-ready while every current study remains honestly scoped to the United States',/Each study clearly shows the country or market it covers/.test(research) && (research.match(/>UNITED STATES</g)||[]).length===3 && !/LIVE . UNITED STATES/.test(research));
  add('Privacy keeps technical disclosure but shortens the front layer',/privacy-summary-grid/.test(privacy) && /More technical details about My Carrowmont/.test(privacy) && /Brevo processes the authentication email delivery/.test(privacy) && /Supabase/.test(privacy));
  add('8F documentation, continuity amendment and Engine Registry V20 exist',Boolean(read(main+'docs/CARROWMONT_FRE_BATCH8F_UX_ROUTING_PERFORMANCE_CLEANUP.md')) && Boolean(read(main+'docs/CARROWMONT_FRE_BATCH8F_ACCEPTANCE_LEDGER.md')) && /Batch 8F — UX Simplification, Routing & Performance Cleanup/.test(read(main+'docs/CARROWMONT_FRE_BATCH8_CONTINUITY_AMENDMENT.md')) && /fre_batch8f/.test(read(main+'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V20.json')));
  return checks;
}
