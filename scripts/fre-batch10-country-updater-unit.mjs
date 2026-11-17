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

const ref=JSON.parse(fs.readFileSync(path.join(root,'draw004.github.io/data/country-financial-reference.json'),'utf8'));
const observations={
  IN:{kind:'single',valuePct:5.25,asOf:'2026-11-17',sourceName:'Reserve Bank of India',sourceUrl:'https://www.rbi.org.in/'},
  US:{kind:'range',rangeMinPct:3.5,rangeMaxPct:3.75,asOf:'2026-11-17',sourceName:'Federal Reserve',sourceUrl:'https://www.federalreserve.gov/monetarypolicy/openmarket.htm'},
  GB:{kind:'single',valuePct:4,asOf:'2026-11-05',sourceName:'Bank of England',sourceUrl:'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp'},
  CA:{kind:'single',valuePct:2.5,asOf:'2026-11-13',sourceName:'Bank of Canada',sourceUrl:'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=10'},
  AU:{kind:'single',valuePct:4.85,asOf:'2026-11-04',sourceName:'Reserve Bank of Australia',sourceUrl:'https://www.rba.gov.au/statistics/cash-rate/'}
};
const applied=mod.applyObservations(ref,observations,'2026-11-17');
assert.equal(applied.changes.length,2);
assert.equal(applied.changes.find(x=>x.code==='IN').changeText,'-0.25 pp');
assert.equal(applied.changes.find(x=>x.code==='US').changeText,'lower -0.25 pp / upper -0.25 pp');
for(const code of ['IN','US','GB','CA','AU'])assert.deepEqual(applied.next.markets[code].inflationReference,ref.markets[code].inflationReference);
assert.equal(applied.next.markets.IN.policyRate.display,'5.25%');
assert.equal(applied.next.markets.US.policyRate.display,'3.50%-3.75%');

const runtime=fs.readFileSync(path.join(root,'draw004.github.io/assets/trust/carrowmont-trust.js'),'utf8');
assert.deepEqual(mod.extractEmbeddedReference(runtime),ref);
const replaced=mod.replaceEmbeddedReference(runtime,applied.next);
assert.deepEqual(mod.extractEmbeddedReference(replaced),applied.next);

assert.throws(()=>mod.applyObservations(ref,{...observations,IN:{...observations.IN,valuePct:8.25}},'2026-11-17'),/exceeds 2\.00 percentage points/);
assert.throws(()=>mod.applyObservations(ref,{...observations,IN:{...observations.IN,valuePct:5.25,asOf:'2026-10-01'}},'2026-11-17'),/older than stored/);

console.log('Batch 10 country-reference updater unit checks passed.');
