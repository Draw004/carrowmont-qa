import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);

export function runFreMoneyPrioritiesContract(root) {
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const main=path.join(root,'draw004.github.io');
  const file=path.join(main,'assets/fre/money-priorities.js');
  add('Money Priorities deterministic rule engine exists',fs.existsSync(file));
  if(!fs.existsSync(file)) return checks;

  const Budget=require(path.join(root,'budget-cash-flow-planner/core.js'));
  const Emergency=require(path.join(main,'emergency-fund-runway-core.js'));
  const Goal=require(path.join(root,'goal-planner/core.js'));
  const Priority=require(path.join(main,'assets/fre/priority-framework.js'));
  const MoneyPriorities=require(file);
  const api=MoneyPriorities.create({budget:Budget,emergency:Emergency,goal:Goal,priority:Priority});

  add('priority framework remains locked to Stabilize Protect Reduce Build Grow Optimize',Priority.STAGES.map(x=>x.label).join(' > ')==='Stabilize > Protect > Reduce > Build > Grow > Optimize');

  const fixture={
    monthlyIncome:6000,essentialExpenses:2500,flexibleExpenses:1000,monthlyDebtPayments:400,
    emergencySavings:1000,emergencyTargetMonths:3,debtBalance:5000,highestDebtAprPct:18,
    assumedLongTermReturnPct:5,retirementSavings:10000,retirementMonthlyContribution:0,
    goalTargetAmount:12000,goalCurrentSavings:2000,goalYearsAway:2,goalMonthlyContribution:200
  };
  const result=api.evaluate(fixture,{currency:'USD'});
  add('Money Priorities returns exactly three ranked moves',result.priorityMoves?.length===3);
  add('Protect Reduce Build are ranked in locked stage order for the representative fixture',result.priorityMoves?.map(x=>x.stage).join('|')==='protect|reduce|build');
  add('first recommendation is derived from the first ranked move',result.recommendation?.headline==='Your first priority: Protect'&&result.recommendation?.action===result.priorityMoves?.[0]?.action);
  add('each move exposes impact rationale numbers assumptions and change factors',result.priorityMoves?.every(move=>move.impact&&move.rationale&&move.numbersUsed&&Array.isArray(move.assumptions)&&Array.isArray(move.whatCouldChange)&&move.whatCouldChange.length));
  add('cash flow emergency runway and goal funding come from deterministic engine trace',result.trace?.map(x=>x.engineId).join('|')==='budget-cash-flow|emergency-fund-runway|goal-planner'&&Number.isFinite(result.importantNumbers.cashFlowRemaining)&&Number.isFinite(result.importantNumbers.emergencyRunwayMonths)&&Number.isFinite(result.importantNumbers.goalFundingPct));
  add('Money Priorities does not use an opaque overall score',!('score' in result)&&!('overallScore' in result)&&!/overallScore|financialHealthScore/.test(fs.readFileSync(file,'utf8')));

  const stabilize=api.evaluate({...fixture,monthlyIncome:3000,essentialExpenses:2500,flexibleExpenses:800,monthlyDebtPayments:300,emergencySavings:10000},{currency:'USD'});
  add('negative monthly cash flow deterministically promotes Stabilize to first priority',stabilize.priorityMoves?.[0]?.stage==='stabilize'&&stabilize.recommendation?.headline==='Your first priority: Stabilize');

  const source=fs.readFileSync(file,'utf8');
  add('Money Priorities makes no network or persistence calls',!/(?:localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|WebSocket)/.test(source));

  const ask=require(path.join(main,'assets/fre/ask-carrowmont-mvp.js'));
  add('Ask Carrowmont exposes Money Priorities as the sixth controlled journey',ask.SUPPORTED?.length===6&&ask.SUPPORTED?.some(x=>x.intent==='money-priorities')&&ask.classify('What should I focus on first?')?.intent==='money-priorities');

  const tools=fs.readFileSync(path.join(main,'tools.html'),'utf8');
  add('Batch 5 preserves the 23-tool directory',/"numberOfItems"\s*:\s*23/.test(tools)&&(tools.match(/class="directory-tool-card/g)||[]).length===23);
  const pages=JSON.parse(fs.readFileSync(path.join(main,'data/carrowmont-search-pages.json'),'utf8'));
  const index=JSON.parse(fs.readFileSync(path.join(main,'data/carrowmont-search-index.json'),'utf8'));
  const askEntry=pages.entries?.find(e=>e.url==='/ask-carrowmont.html');
  add('Batch 5 keeps public inventory at 137 while adding Money Priorities discovery terms',pages.entries?.length===137&&index.entries?.length===137&&askEntry?.keywords?.includes('money priorities')&&askEntry?.aliases?.includes('what should i focus on first'));

  const registry=JSON.parse(fs.readFileSync(path.join(main,'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V11.json'),'utf8'));
  add('Engine Registry V11 records Batch 5 without adding a calculator engine',registry.schema_version===11&&registry.engines?.length===26&&registry.fre_batch5?.ask_journey==='money-priorities'&&registry.fre_batch5?.controlled_journey_count===6&&registry.fre_batch5?.public_tool_count===23);
  add('Batch 5 documentation and acceptance ledger exist',fs.existsSync(path.join(main,'docs/CARROWMONT_FRE_BATCH5_MONEY_PRIORITIES.md'))&&/14-dimension change-impact matrix/.test(fs.readFileSync(path.join(main,'docs/CARROWMONT_FRE_BATCH5_ACCEPTANCE_LEDGER.md'),'utf8')));
  return checks;
}
