import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runFreBatch8jMyCarrowmontVisualAppContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const page=read(main+'my-carrowmont.html');
  const dash=read(main+'assets/dashboard/my-carrowmont.js');
  const css=read(main+'assets/dashboard/my-carrowmont.css');
  const accountUi=read(main+'assets/account/my-carrowmont-account.js');
  const site=read(main+'site.js');
  const manifest=JSON.parse(read(main+'carrowmont.webmanifest')||'{}');
  const pages=JSON.parse(read(main+'data/carrowmont-search-pages.json')||'{"entries":[]}');
  const index=JSON.parse(read(main+'data/carrowmont-search-index.json')||'{"entries":[]}');

  add('8J adds a visual money snapshot above the existing detail cards without replacing edit sections',
    page.includes('id="mycmVisualOverview"')&&page.includes('See the shape of your money in seconds.')&&page.includes('id="mycmCashFlowCard"')&&page.includes('id="mycmEmergencyCard"')&&page.includes('id="mycmDebtCard"'));
  add('8J monthly money wheel shows essentials other spending debt and money left as distinct readable segments',
    dash.includes('function moneyWheel(')&&dash.includes('Essentials ${esc(money(essential))}')&&dash.includes('Other ${esc(money(flexible))}')&&dash.includes('Debt ${esc(money(debt.value))}')&&dash.includes('Left ${esc(money(remaining))}')&&css.includes('.mycm-wheel-legend'));
  add('8J emergency colour is tied to the user selected target while debt ratio stays explicitly neutral',
    dash.includes("toneName=raw>=100?'good':raw>=75?'near':'review'")&&dash.includes("progressRing(ratio==null?0:ratio,'neutral'")&&dash.includes('This is context, not a good/bad score. Colour is not used to judge the debt ratio.'));
  add('8J visual progress has text and aria labels so colour is never the only meaning',
    dash.includes('role="img" aria-label=')&&dash.includes('Emergency savings are ${number(raw,0)} percent of the selected target')&&dash.includes("'Debt payments use '+number(ratio,1)+' percent of monthly income'"));
  add('8J planning discovery covers every account-backed/saved decision journey without crowding the first view',
    ['budget-cash-flow','emergency-runway','debt-payoff','credit-card-payoff','loan-emi','mortgage-payoff','retirement','goal','financial-independence','recurring-investment','retirement-withdrawal','car-affordability'].every(j=>dash.includes(`journey:'${j}'`))&&dash.includes('missing.slice(0,6)')&&dash.includes('See ${rest.length} more planning areas'));
  add('8J saved journeys are removed from Add to My Carrowmont discovery after account scenarios load',
    accountUi.includes("carrowmont:mycm-scenarios-ready")&&accountUi.includes('journeys:rows.map(row=>row?.journey).filter(Boolean)')&&dash.includes("window.addEventListener('carrowmont:mycm-scenarios-ready'")&&dash.includes('!savedJourneys.has(area.journey)'));
  add('8J install card starts hidden and appears only after this browser exposes an actionable install prompt',
    page.includes('data-cm-pwa-card aria-labelledby="mycmAppAccessTitle" hidden')&&site.includes('hideInstallCard();')&&site.includes("window.addEventListener('beforeinstallprompt'")&&site.includes('showInstallCard();button.hidden=false;'));
  add('8J standalone/app mode never shows the install card and browser-specific duplicate installs are explained honestly',
    site.includes('if(!button||standalone()) return;')&&site.includes("if(standalone()) markInstalled();")&&page.includes('Already installed? Open Carrowmont from your apps, Start menu or taskbar instead.')&&site.includes('Already installed elsewhere? Open that app instead to avoid a second browser-specific install.'));
  add('8J preserves the stable PWA identity so existing installs are not intentionally forked into a second app',
    manifest.id==='/my-carrowmont.html'&&manifest.start_url==='/my-carrowmont.html?source=pwa'&&manifest.display==='standalone');
  add('8J dashboard and PWA asset cache keys are refreshed together',
    page.includes('my-carrowmont.css?v=20261115-fre8k4')&&page.includes('my-carrowmont.js?v=20261115-fre8k')&&page.includes('my-carrowmont-account.js?v=20261115-fre8k')&&page.includes('site.js?v=20261115-fre8jv3'));
  add('8J mobile CSS keeps the visual summary and discovery cards single-column without horizontal overflow pressure',
    css.includes('@media(max-width:660px)')&&css.includes('.mycm-visual-grid{grid-template-columns:1fr}')&&css.includes('.mycm-add-grid-primary,.mycm-add-grid-more{grid-template-columns:1fr}'));
  add('8J retains the 8G saved-plan explanation and all three focused update actions',
    page.includes('<details class="mycm-plan-model">')&&['current-details','saved-plan','what-if','progress-history'].every(key=>page.includes(`data-mycm-plan-concept="${key}"`))&&dash.includes("action('Update monthly money','monthly',true)")&&dash.includes("action('Update savings','emergency',true)")&&dash.includes("action('Update debt','debt',true)"));
  add('8J creates no new public URL or search inventory entry',pages.entries?.length===138&&index.entries?.length===138);
  const browserQa=readQa('tests/70-fre8j-my-carrowmont-visual-app.spec.js');
  add('8J browser QA protects money wheel target progress neutral debt discovery filtering and install-event visibility',
    browserQa.includes('32,650')&&browserQa.includes('79%')&&browserQa.includes('27.9%')&&browserQa.includes('mycm-add-grid-primary')&&browserQa.includes('beforeinstallprompt'));
  add('8J V2 install card hidden state cannot be overridden by the flex layout',
    css.includes('.mycm-app-access[hidden]{display:none!important}'));
  add('8J V2 planning discovery uses exact journey identifiers so Retirement and Retirement withdrawals stay distinct',
    dash.includes('data-mycm-journey=')&&browserQa.includes('data-mycm-journey=\"retirement\"')&&browserQa.includes('data-mycm-journey=\"retirement-withdrawal\"'));

  add('8J V3 keeps four canonical saved-plan concepts uniquely visible while the explanation remains collapsed',
    page.includes('<details class="mycm-plan-model">')&&!page.includes('<details class="mycm-plan-model" open>')&&
    ['current-details','saved-plan','what-if','progress-history'].every(key=>(page.match(new RegExp(`data-mycm-plan-concept=\"${key}\"`,'g'))||[]).length===1)&&
    css.includes('.mycm-plan-model-concepts>span'));

  add('8J V2 signed-in layout prioritizes the money dashboard while account and plan explanations remain available on demand',
    page.includes('class="mycm-account-signed-details"')&&page.includes('<details class="mycm-plan-model">')&&accountUi.includes("document.body.classList.toggle('mycm-authenticated'")&&css.includes('body.mycm-authenticated .mycm-account')&&browserQa.includes('money dashboard appears early'));
  return checks;
}
