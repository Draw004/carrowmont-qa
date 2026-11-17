import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.env.SOURCE_ROOT;
if(!root)throw new Error('SOURCE_ROOT is required.');
const updaterPath=path.join(root,'draw004.github.io/scripts/update-country-financial-reference.mjs');
const mod=await import(`${pathToFileURL(updaterPath).href}?qa=${Date.now()}`);

assert.equal(mod.formatSignedPp(0.25),'+0.25');
assert.equal(mod.formatSignedPp(-0.25),'-0.25');
assert.equal(mod.formatSignedPp(0),'0.00');
assert.equal(mod.comparePolicy({kind:'single',valuePct:5.5,asOf:'2026-11-16'},{kind:'single',valuePct:5.25,asOf:'2026-11-17'}).changeText,'-0.25 pp');
assert.equal(mod.comparePolicy({kind:'range',rangeMinPct:3.75,rangeMaxPct:4,asOf:'2026-10-29'},{kind:'range',rangeMinPct:3.5,rangeMaxPct:3.75,asOf:'2026-12-10'}).changeText,'lower -0.25 pp / upper -0.25 pp');

assert.deepEqual(mod.parseRbi('<div>Policy Repo Rate : 5.50%</div><div>(As at 1.00pm of November 16, 2026)</div>','2026-11-17'),{kind:'single',valuePct:5.5,asOf:'2026-11-16'});
assert.deepEqual(mod.parseRbi('<div>Policy Repo Rate : 5.50%</div>','2026-11-17'),{kind:'single',valuePct:5.5,asOf:'2026-11-17'});
assert.deepEqual(mod.parseFed('<h2>2026</h2><table><tr><th>Date</th><th>Increase</th><th>Decrease</th><th>Level (%)</th></tr><tr><td>October 29</td><td>0</td><td>25</td><td>3.50-3.75</td></tr></table>',2026),{kind:'range',rangeMinPct:3.5,rangeMaxPct:3.75,asOf:'2026-10-29'});
assert.deepEqual(mod.parseBoe('<h1>Current official Bank Rate</h1><div>4%</div><table><tr><td>05 Nov 26</td><td>4.00</td></tr></table>'),{kind:'single',valuePct:4,asOf:'2026-11-05'});
assert.deepEqual(mod.parseBoc({observations:[{d:'2026-11-12',V39079:{v:'2.50'}},{d:'2026-11-13',V39079:{v:'2.50'}}]}),{kind:'single',valuePct:2.5,asOf:'2026-11-13'});
assert.deepEqual(mod.parseRba('<div>Effective Date Change% points Cash rate target % Related Documents 4 Nov 2026 +0.25 4.85 Statement 30 Sep 2026 +0.25 4.60</div>'),{kind:'single',valuePct:4.85,asOf:'2026-11-04'});
assert.deepEqual(mod.parseBoj('<div>Interest Rate Applied to the Complementary Deposit Facility 1.25% since September 24, 2026</div><div>The Bank will encourage the uncollateralized overnight call rate to remain at around 1.25 percent.</div>'),{kind:'single',valuePct:1.25,asOf:'2026-09-24'});
assert.deepEqual(mod.parseBok('<div>변경일자 기준금리 2026 08월 27일 3.00 2026 07월 16일 2.75</div>'),{kind:'single',valuePct:3,asOf:'2026-08-27'});
assert.deepEqual(mod.parseEcb('<div>Date (with effect from) Deposit facility Main refinancing operations Marginal lending facility 2026 16 Sep. 2.50 2.65 - 2.90 2026 17 Jun. 2.25 2.40 - 2.65</div>'),{kind:'single',valuePct:2.5,asOf:'2026-09-16'});
assert.throws(()=>mod.parseBoj('<div>Interest Rate Applied to the Complementary Deposit Facility 1.00% since September 24, 2026</div><div>The Bank will encourage the uncollateralized overnight call rate to remain at around 1.25 percent.</div>'),/does not match/);

const ref=JSON.parse(fs.readFileSync(path.join(root,'draw004.github.io/data/country-financial-reference.json'),'utf8'));
assert.deepEqual(mod.SUPPORTED_MARKETS,['IN','US','GB','CA','AU','JP','KR','FR','IT']);
assert.deepEqual(mod.SOURCES.EA.markets,['FR','IT']);
const observations={
  IN:{kind:'single',valuePct:5.25,asOf:'2026-11-17',sourceName:'Reserve Bank of India',sourceUrl:'https://www.rbi.org.in/'},
  US:{kind:'range',rangeMinPct:3.5,rangeMaxPct:3.75,asOf:'2026-11-17',sourceName:'Federal Reserve',sourceUrl:'https://www.federalreserve.gov/monetarypolicy/openmarket.htm'},
  GB:{kind:'single',valuePct:4,asOf:'2026-11-05',sourceName:'Bank of England',sourceUrl:'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp'},
  CA:{kind:'single',valuePct:2.5,asOf:'2026-10-28',sourceName:'Bank of Canada',sourceUrl:'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=10'},
  AU:{kind:'single',valuePct:4.85,asOf:'2026-11-04',sourceName:'Reserve Bank of Australia',sourceUrl:'https://www.rba.gov.au/statistics/cash-rate/'},
  JP:{kind:'single',valuePct:1.5,asOf:'2026-11-17',sourceName:'Bank of Japan',sourceUrl:'https://www.boj.or.jp/en/'},
  KR:{kind:'single',valuePct:2.75,asOf:'2026-11-17',sourceName:'Bank of Korea',sourceUrl:'https://www.bok.or.kr/portal/singl/baseRate/list.do?menuNo=200656'},
  EA:{kind:'single',valuePct:2.75,asOf:'2026-11-17',sourceName:'European Central Bank',sourceUrl:'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html'}
};
const applied=mod.applyObservations(ref,observations,'2026-11-17');
assert.equal(applied.changes.length,5);
assert.equal(applied.changes.find(x=>x.code==='IN').changeText,'-0.25 pp');
assert.equal(applied.changes.find(x=>x.code==='US').changeText,'lower -0.25 pp / upper -0.25 pp');
assert.equal(applied.changes.find(x=>x.code==='JP').changeText,'+0.25 pp');
assert.equal(applied.changes.find(x=>x.code==='KR').changeText,'-0.25 pp');
assert.equal(applied.changes.find(x=>x.code==='EA').changeText,'+0.25 pp');
assert.deepEqual(applied.changes.find(x=>x.code==='EA').markets,['FR','IT']);
for(const code of mod.SUPPORTED_MARKETS)assert.deepEqual(applied.next.markets[code].inflationReference,ref.markets[code].inflationReference);
assert.equal(applied.next.markets.IN.policyRate.display,'5.25%');
assert.equal(applied.next.markets.US.policyRate.display,'3.50%-3.75%');
assert.equal(applied.next.markets.JP.policyRate.display,'1.50%');
assert.equal(applied.next.markets.KR.policyRate.display,'2.75%');
assert.equal(applied.next.markets.FR.policyRate.display,'2.75%');
assert.equal(applied.next.markets.IT.policyRate.display,'2.75%');
assert.equal(applied.next.markets.FR.policyRate.asOf,applied.next.markets.IT.policyRate.asOf);

const runtime=fs.readFileSync(path.join(root,'draw004.github.io/assets/trust/carrowmont-trust.js'),'utf8');
assert.deepEqual(mod.extractEmbeddedReference(runtime),ref);
const replaced=mod.replaceEmbeddedReference(runtime,applied.next);
assert.deepEqual(mod.extractEmbeddedReference(replaced),applied.next);

assert.throws(()=>mod.applyObservations(ref,{...observations,IN:{...observations.IN,valuePct:8.25}},'2026-11-17'),/exceeds 2\.00 percentage points/);
assert.throws(()=>mod.applyObservations(ref,{...observations,IN:{...observations.IN,valuePct:5.25,asOf:'2026-10-01'}},'2026-11-17'),/older than stored/);
const badShared=JSON.parse(JSON.stringify(ref));badShared.markets.IT.policyRate.valuePct=2.25;badShared.markets.IT.policyRate.display='2.25%';
assert.throws(()=>mod.applyObservations(badShared,observations,'2026-11-17'),/Shared jurisdiction EA stored market references are out of sync/);

console.log('Batch 10 country-reference updater unit checks passed.');
