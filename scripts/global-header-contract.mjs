import fs from 'node:fs';import path from 'node:path';
export function runGlobalHeaderContract(root){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const main=read('draw004.github.io/index.html');
 const page=read('budget-cash-flow-planner/credit-card-payoff-calculator.html');
 const gate=read('carrowmont-qa/scripts/development-standards-gate.mjs');
 const exceptions=JSON.parse(read('draw004.github.io/docs/CARROWMONT_UI_LEGACY_EXCEPTIONS.json'));
 const css=read('draw004.github.io/assets/ui/carrowmont-global-header.css');
 const js=read('draw004.github.io/assets/ui/carrowmont-global-header.js');
 const tests=read('carrowmont-qa/tests/92-global-header-parity.spec.js');
 const record=(name,ok)=>({name,ok:!!ok});
 const hrefs=(html,cls)=>{
   const start=html.indexOf(`<nav class="${cls}"`);
   if(start<0)return [];
   const finish=html.indexOf('</nav>',start);
   const nav=html.slice(start,finish>start?finish:undefined);
   return [...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(x=>x[1]);
 };
 const expected=['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html','/learn.html','/research.html','/search.html'];
 return [
 record('Global primary navigation matches main site in destination order',JSON.stringify(hrefs(main,'desktop-nav'))===JSON.stringify(expected) && JSON.stringify(hrefs(page,'cm-global-nav'))===JSON.stringify(expected)),
 record('Tool page selects Tools, never permanently Ask',page.includes('href="/tools.html" aria-current="page"') && !page.includes('href="/ask-carrowmont.html" aria-current="page"') && page.includes('cm-global-bottom-nav')),
 record('Tool shell uses shared stylesheet, static markup and accessible currency controls',page.includes('/assets/ui/carrowmont-global-header.css') && page.includes('/assets/ui/carrowmont-global-header.js') && page.includes('id="localeSummary" aria-label="Choose country and currency"') && css.includes('.cm-global-nav') && js.includes('cmCompactCurrency')),
 record('Methodology is contextual; duplicate intro link removed',page.includes('class="cm-tool-context-method"') && !page.includes('class="bt-intro-link"') && !page.includes('class="chips"')),
 record('Legacy header inventory is explicit, not automatically exempt for changed pages',Array.isArray(exceptions.global_header_exceptions) && !exceptions.global_header_exceptions.some(x=>x.path==='credit-card-payoff-calculator.html') && gate.includes("issues.push('legacy_tool_header')") && gate.includes('modifiedHtml.has(key)')),
 record('Canonical shell remains covered by mobile+desktop browser regression',tests.includes('mobile tool header') && tests.includes('main site and credit card decision'))
 ];
}
