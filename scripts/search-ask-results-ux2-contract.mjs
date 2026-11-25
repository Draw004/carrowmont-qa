import fs from 'node:fs';
import path from 'node:path';

export function runSearchAskResultsUx2Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const searchJs=read(main+'search.js');
  const searchCss=read(main+'search.css');
  const askJs=read(main+'assets/ask/ask-carrowmont.js');
  const askCss=read(main+'assets/ask/ask-carrowmont.css');
  const status=read(main+'docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const roadmap=read(main+'docs/CARROWMONT_FRE_MASTER_ROADMAP_STATUS.md');
  const continuity=read(main+'docs/CARROWMONT_MASTER_CONTINUITY_HANDBOOK.md');
  const uxDoc=read(main+'docs/CARROWMONT_SEARCH_ASK_RESULTS_UX2.md');

  add('Search result card is one real anchor so the visible CTA area is genuinely clickable and keyboard reachable',
    searchJs.includes("link.dataset.searchResultLink = ''")&&searchJs.includes("action.dataset.searchResultAction = ''")&&
    searchJs.includes("link.setAttribute('aria-label'")&&searchCss.includes('.cm-search-result-card:focus-visible'));
  add('Desktop Search uses side-by-side Tools and Learn panes with right-edge independent scrollers',
    searchCss.includes('grid-template-areas:"tools learn"')&&searchCss.includes('.cm-search-result-group-tool{grid-area:tools}')&&
    searchCss.includes('.cm-search-result-group-guide{grid-area:learn}')&&searchCss.includes('overflow-y:auto')&&
    searchCss.includes('direction:ltr')&&searchCss.includes('scrollbar-gutter:stable'));
  add('Mobile Search uses counted Tools and Learn tabs with normal page scrolling instead of dual nested scrollers',
    searchJs.includes("tabs.setAttribute('role', 'tablist')")&&searchJs.includes('data.mobileActive')===false&&
    searchJs.includes('primary.dataset.mobileActive')&&searchCss.includes('.cm-search-result-tab[aria-selected="true"]')&&
    searchCss.includes('max-height:none;overflow:visible;padding-right:0;scrollbar-gutter:auto'));
  add('Best Match remains relevance-driven rather than forced by content type',
    searchJs.includes("bestMatch: entry === bestEntry")&&searchJs.includes("'Best match'")&&
    searchJs.includes('DIRECT_MATCH_LEAD = 200')&&searchJs.includes('ownsSpecificQuery(first, shownQuery)'));
  add('Research and Other stays below the primary desktop discovery area',
    searchJs.includes("if (grouped.other.entries.length) widget.results.appendChild(resultGroupSection(grouped.other, first))")&&
    searchCss.includes('.cm-search-result-group-other{margin-top:16px'));
  add('Ask fallback keeps compact grouped cards but exposes real card/CTA links and Best Match',
    askJs.includes("a.dataset.askRouteResultLink=''")&&askJs.includes("action.dataset.askRouteAction=''")&&
    askJs.includes("best.textContent='Best match'")&&askCss.includes('.ask-route-best-match'));
  add('Shared Search and Ask assets are cache-busted on every interactive entry page',
    ['search.html','tools.html','learn.html','ask-carrowmont.html'].every(name=>(read(main+name).includes('search.js?v=20261123-searchux2')||read(main+name).includes('search.js?v=20261125-askwave2')))&&
    ['search.html','tools.html','learn.html'].every(name=>read(main+name).includes('search.css?v=20261123-searchux2'))&&
    (read(main+'ask-carrowmont.html').includes('ask-carrowmont.js?v=20261123-searchux2')||read(main+'ask-carrowmont.html').includes('ask-carrowmont.js?v=20261124-askwave1')||read(main+'ask-carrowmont.html').includes('ask-carrowmont.js?v=20261125-askwave2'))&&(read(main+'ask-carrowmont.html').includes('ask-carrowmont.css?v=20261123-searchux2')||read(main+'ask-carrowmont.html').includes('ask-carrowmont.css?v=20261124-askwave1')));
  add('Continuity and roadmap lock UX2 before any Batch 13B pilot',
    status.includes('Search + Ask Results UX2')&&status.includes('scrollbar on the right edge')&&
    roadmap.includes('Search + Ask Results UX2')&&roadmap.includes('Before 13B')&&uxDoc.includes('right edge of that pane'));
  add('Post-snapshot live interaction verification is now a mandatory release-close rule',
    continuity.includes('Post-snapshot live verification is mandatory')&&continuity.includes('before marking the item CLOSED')&&
    uxDoc.includes('deployed Carrowmont.com behavior must be checked again'));
  add('Search UX2 does not alter Search index or public URL inventory',
    !searchJs.includes('carrowmont-search-pages.json')&&uxDoc.includes('does not change Search ranking formulas')&&uxDoc.includes('public URLs'));
  return checks;
}
