import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadCompoundCore(file) {
  const code = fs.readFileSync(file, 'utf8');
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox.window.CarrowmontCompoundCore;
}

export function runFreSavingsGrowthContract(root) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
  const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

  const AdapterContract = require(path.join(root, 'draw004.github.io/assets/fre/engine-adapters.js'));
  const SavingsAdapters = require(path.join(root, 'draw004.github.io/assets/fre/savings-growth-engine-adapters.js'));
  const SipCore = require(path.join(root, 'sip-calculator/core.js'));
  const CompoundCore = loadCompoundCore(path.join(root, 'compound-interest-calculator/core.js'));
  const registry = AdapterContract.createRegistry();
  SavingsAdapters.registerAll(registry, { recurringInvestment: SipCore, compoundInterest: CompoundCore });

  add('reuses the existing Recurring Investment and Compound Interest cores', registry.has('recurring-investment') && registry.has('compound-interest'));

  const recurring = registry.run('recurring-investment', {
    currency: 'USD',
    inputs: { state: { mode: 'growth', years: 10, currentSavings: 10000, monthlySIP: 500, contributionFrequency: 'monthly', annualReturn: 7, annualStepUp: 0 } }
  });
  const recurringDirect = SipCore.result({ mode: 'growth', years: 10, currentSavings: 10000, monthlySIP: 500, contributionFrequency: 'monthly', annualReturn: 7, annualStepUp: 0 });
  add('Recurring Investment adapter preserves deterministic projection parity', Math.abs(recurring.metrics.projectedValue - recurringDirect.projection.portfolio) < 1e-8 && Math.abs(recurring.metrics.totalInvested - recurringDirect.projection.totalInvested) < 1e-8);

  const compoundState = { principal: 10000, annualRate: 7, years: 10, compounding: 'monthly', contributionEnabled: true, contribution: 500, contributionFrequency: 'monthly', contributionTiming: 'end', inflationEnabled: true, inflation: 3 };
  const compound = registry.run('compound-interest', { currency: 'USD', inputs: { state: compoundState } });
  const compoundDirect = CompoundCore.calculate(compoundState);
  add('Compound Interest adapter preserves deterministic calculation parity', compound.raw.ok === true && Math.abs(compound.metrics.endingValue - compoundDirect.endingValue) < 1e-8 && Math.abs(compound.metrics.growth - compoundDirect.growth) < 1e-8);

  const router = read('draw004.github.io/assets/fre/intent-router.js');
  add('existing intent routes already use the two supporting growth engines', router.includes("engineIds:['budget-cash-flow','debt-payoff','compound-interest']") && router.includes("engineIds:['goal-planner','recurring-investment']") && router.includes("engineIds:['recurring-investment']"));

  const tools = read('draw004.github.io/tools.html');
  add('Batch 2E adds no duplicate visible Savings Growth calculator', /"numberOfItems"\s*:\s*23/.test(tools) && (tools.match(/class="directory-tool-card/g) || []).length === 23 && !/Savings Growth Calculator/i.test(tools));

  const catalog = read('draw004.github.io/assets/fre/engine-catalog.js');
  add('engine catalog keeps both existing engines READY_WITH_ADAPTER', catalog.includes("id:'recurring-investment', api:'CarrowmontSIPCore', status:'READY_WITH_ADAPTER'") && catalog.includes("id:'compound-interest', api:'CarrowmontCompoundCore', status:'READY_WITH_ADAPTER'"));

  const registryDoc = JSON.parse(read('draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V8.json'));
  add('Engine Registry V8 closes Batch 2 with no new public engine', registryDoc.schema_version === 8 && registryDoc.engines?.length === 26 && registryDoc.batch_2_status === 'COMPLETE' && registryDoc.engines.some(e => e.id === 'recurring-investment' && e.status === 'READY_WITH_ADAPTER') && registryDoc.engines.some(e => e.id === 'compound-interest' && e.status === 'READY_WITH_ADAPTER'));

  const qaConfig = fs.readFileSync(path.join(qaRoot, 'qa.config.js'), 'utf8');
  add('public-page inventory remains at or above the post-Batch-2D level', Number((qaConfig.match(/search1ExpectedPublicPages\s*=\s*(\d+)/)||[])[1]) >= 136);

  return checks;
}
