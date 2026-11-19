import fs from 'node:fs';
import path from 'node:path';

// Focused UI/source contract. Financial results are tested by FRE2D and FRE12B1.
export function runFreBatch12B1UxContract(root) {
  const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
  const html = read('budget-cash-flow-planner/credit-card-payoff-calculator.html');
  const old = read('budget-cash-flow-planner/debt-payoff-calculator.html');
  const app = read('budget-cash-flow-planner/credit-card-decision-ux.js');
  const transfer = read('budget-cash-flow-planner/balance-transfer-decision.js');
  const css = read('budget-cash-flow-planner/credit-card-decision-ux.css');
  const standards = JSON.parse(read('draw004.github.io/docs/CARROWMONT_UI_LEGACY_EXCEPTIONS.json'));
  const tests = read('carrowmont-qa/tests/91-fre12b1-credit-card-ux.spec.js');
  const out=[];
  const add = (name, ok) => out.push({ name, ok:!!ok });
  add('Approved locale control has SVG globe, chevron, ARIA label and existing select fields',
    /<summary id="localeSummary" aria-label="Choose country and currency">/.test(html) &&
    html.includes('class="locale-globe"') && html.includes('class="locale-chevron"') &&
    ['localeMenu','regionSelect','currencySelect','localeCurrent'].every(x=>html.includes(`id="${x}"`)) &&
    !standards.exceptions.some(x=>x.repository==='budget-cash-flow-planner' && x.path==='credit-card-payoff-calculator.html'));
  add('One workspace and two accessible modes replace nested, stacked calculators',
    html.includes('id="tab-payoff" role="tab"') && html.includes('id="tab-transfer" role="tab"') &&
    html.includes('id="payoff" role="tabpanel"') && html.includes('id="balance-transfer" role="tabpanel"') &&
    html.includes('id="balance-transfer" role="tabpanel" aria-labelledby="tab-transfer" hidden') &&
    !html.includes('class="bt-expand"') && !html.includes('<details id="balance-transfer"') &&
    css.includes('.cc-decision-panel[hidden]') && css.includes('@media(max-width:650px)'));
  add('Single Methodology anchor and all IDs unique, header nav targets exist',
    (html.match(/id="methodology"/g) || []).length===1 &&
    (()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);return ids.length===new Set(ids).size})() &&
    ['calculator','methodology','balance-transfer'].every(x=>html.includes(`id="${x}"`)) &&
    html.includes('id="payoff-methodology"') && html.includes('id="transfer-methodology"'));
  add('First click and direct hash select before scrolling and Back restores selected mode',
    app.includes("location.hash === '#balance-transfer'") &&
    app.includes('panels[mode].scrollIntoView') && app.includes('history.pushState') &&
    app.includes("window.addEventListener('popstate',restoreLocation)") &&
    tests.includes('first transfer link click selects and scrolls') && tests.includes('direct transfer link, reload, Back'));
  add('Shared card numbers are synchronized without another financial or account engine',
    app.includes("['balance', 'btBalance']") && app.includes("['apr', 'btCurrentApr']") &&
    app.includes("['planned', 'btPayment']") && !/(?:localStorage|sessionStorage|fetch\s*\(|supabase|CarrowmontPlanSave)/i.test(app) &&
    html.includes('credit-card-payoff-core.js') && html.includes('balance-transfer-decision-core.js') &&
    transfer.includes("window.addEventListener('carrowmont:transfer-mode', render)"));
  add('Debt comparison provides an explicit accessible return path without sensitive URL parameters',
    html.includes('debt-payoff-calculator.html?from=credit-card') &&
    old.includes('id="creditCardReturnLink"') && old.includes("get('from')==='credit-card'") &&
    tests.includes('multiple-debts navigation supplies a reliable return route'));
  add('Only selected comparison prints; active selected result and promotional warning appear together',
    css.includes('@media print') && css.includes('.cc-decision-panel[hidden]') &&
    css.includes('.cc-method-wrap') && html.includes('id="btCaution"') &&
    transfer.includes('transfer.atIntroEnd > 0.005') && tests.includes('selected comparison only is printable'));
  add('Preserve existing indexed URL, report, locale semantics and My Carrowmont save boundary',
    html.includes('rel="canonical" href="https://carrowmont.com/budget-cash-flow-planner/credit-card-payoff-calculator.html"') &&
    html.includes('id="reportBtn"') && html.includes('id="calculateBtn"') &&
    html.includes('credit-card-payoff-pdf-renderer.js') &&
    read('budget-cash-flow-planner/credit-card-payoff-calculator.js').includes("CarrowmontPlanSave?.offer?.('credit-card-payoff')") &&
    html.toLowerCase().includes('changing currency changes the unit and number format. it does not convert entered amounts'));
  return out;
}
