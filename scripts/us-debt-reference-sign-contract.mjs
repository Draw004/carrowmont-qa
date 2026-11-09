import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseOutputs(text) {
  const out = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function fixturePayload(recordDate, debtHeldByPublic, totalPublicDebtOutstanding) {
  return {
    data: [{
      record_date: recordDate,
      debt_held_public_amt: String(debtHeldByPublic),
      tot_pub_debt_out_amt: String(totalPublicDebtOutstanding)
    }],
    meta: {
      labels: {
        debt_held_public_amt: 'Debt Held by the Public',
        tot_pub_debt_out_amt: 'Total Public Debt Outstanding'
      }
    }
  };
}

function runCase(root, name, nextPublic, nextTotal, expectedPublic, expectedTotal) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `carrowmont-us-debt-${name}-`));
  try {
    const referencePath = path.join(temp, 'reference.json');
    const payloadPath = path.join(temp, 'payload.json');
    const outputPath = path.join(temp, 'github-output.txt');
    fs.writeFileSync(referencePath, JSON.stringify({
      schemaVersion: 1,
      dataset: 'Debt to the Penny',
      asOfDate: '2026-11-01',
      debtHeldByPublic: 1000,
      totalPublicDebtOutstanding: 2000,
      sourceName: 'U.S. Treasury FiscalData — Debt to the Penny',
      sourceUrl: 'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/',
      apiUrl: 'fixture',
      retrievedAt: '2026-11-01T00:00:00.000Z'
    }, null, 2));
    fs.writeFileSync(payloadPath, JSON.stringify(fixturePayload('2026-11-02', nextPublic, nextTotal), null, 2));
    fs.writeFileSync(outputPath, '');

    const updater = path.join(root, 'draw004.github.io', 'scripts', 'update-us-debt-reference.mjs');
    const result = spawnSync(process.execPath, [updater], {
      cwd: path.join(root, 'draw004.github.io'),
      env: {
        ...process.env,
        REFERENCE_PATH: referencePath,
        TREASURY_PAYLOAD_PATH: payloadPath,
        GITHUB_OUTPUT: outputPath
      },
      encoding: 'utf8'
    });
    const outputs = parseOutputs(fs.readFileSync(outputPath, 'utf8'));
    return {
      ok: result.status === 0 && outputs.public_change_pct === expectedPublic && outputs.total_change_pct === expectedTotal,
      detail: result.status === 0
        ? `public=${outputs.public_change_pct || 'missing'}, total=${outputs.total_change_pct || 'missing'}`
        : `exit=${result.status}: ${result.stderr || result.stdout}`
    };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export function runUsDebtReferenceSignContract(root) {
  const cases = [
    ['increase', 1010, 2020, '+1.0000', '+1.0000'],
    ['decrease', 990, 1980, '-1.0000', '-1.0000'],
    ['unchanged', 1000, 2000, '0.0000', '0.0000']
  ];
  return cases.map(([name, nextPublic, nextTotal, expectedPublic, expectedTotal]) => {
    const result = runCase(root, name, nextPublic, nextTotal, expectedPublic, expectedTotal);
    return {
      name: `US debt updater preserves ${name} percentage direction`,
      ok: result.ok,
      detail: result.detail
    };
  });
}
