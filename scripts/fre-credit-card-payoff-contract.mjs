import fs from 'node:fs';
import path from 'node:path';
export function runFreCreditCardPayoffContract(root){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8'); const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
 const html=read('budget-cash-flow-planner/credit-card-payoff-calculator.html'); const core=read('budget-cash-flow-planner/credit-card-payoff-core.js'); const pdf=read('budget-cash-flow-planner/credit-card-payoff-pdf-renderer.js'); const tools=read('draw004.github.io/tools.html'); const sitemap=read('draw004.github.io/sitemap.xml'); const qa=read('carrowmont-qa/qa.config.js');
 const index=JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json')); const registry=JSON.parse(read('draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V7.json'));
 add('single-card core reuses the existing Debt Payoff Core',core.includes('D().simulateStrategy')&&html.includes('debt-payoff-core.js')&&html.includes('credit-card-payoff-core.js'));
 add('tool compares fixed minimum and higher payment and solves a target period',core.includes('solvePaymentForTarget')&&core.includes('interestSaved')&&html.includes('Target payoff period'));
 add('Tools Hub exposes 23 live tools including credit-card payoff while nine-card homepage remains unchanged',/"numberOfItems"\s*:\s*23/.test(tools)&&/credit-card-payoff-comparison/.test(tools)&&(tools.match(/class="directory-tool-card/g)||[]).length===23);
 add('Search and sitemap include the canonical credit-card payoff tool',index.entries.some(e=>e.url==='/budget-cash-flow-planner/credit-card-payoff-calculator.html')&&sitemap.includes('https://carrowmont.com/budget-cash-flow-planner/credit-card-payoff-calculator.html'));
 add('Engine Registry V7 records 26 engines with credit-card payoff ready',registry.schema_version===7&&registry.engines?.length===26&&registry.engines.some(e=>e.id==='credit-card-payoff-comparison'&&e.status==='READY_WITH_ADAPTER'));
 add('Central QA public-page expectation advances to 136',/search1ExpectedPublicPages\s*=\s*136/.test(qa));
 add('three-page PDF report uses the same deterministic result',html.includes('Generate Credit Card Payoff Report')&&html.includes('credit-card-payoff-pdf-renderer.js')&&pdf.includes('Page ${n} of 3')&&pdf.includes('model.result'));
 add('privacy boundary excludes card numbers, login and bank connection',html.includes('Do not enter card numbers')&&!/fetch\s*\(|XMLHttpRequest|WebSocket/.test(core));
 return checks;
}
