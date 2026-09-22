import fs from 'node:fs';

export default class CarrowmontReporter {
  constructor() {
    this.rows = new Map();
    this.started = new Date().toISOString();
  }

  onTestEnd(test, result) {
    const title = test.titlePath().slice(1).join(' > ');
    const isVisual = title.includes('[VISUAL]');
    let status;
    if (isVisual && result.status === 'passed') status = 'VISUAL REVIEW REQUIRED';
    else if (result.status === 'passed') status = 'PASS';
    else if (result.status === 'skipped') status = 'SKIPPED';
    else status = 'FAIL';
    this.rows.set(title, {
      title,
      status,
      durationMs: result.duration,
      error: result.error?.message || ''
    });
  }

  onEnd(result) {
    const rows = [...this.rows.values()];
    const automated = rows.filter(r => r.status !== 'VISUAL REVIEW REQUIRED' && r.status !== 'SKIPPED');
    const passed = automated.filter(r => r.status === 'PASS').length;
    const failed = automated.filter(r => r.status === 'FAIL').length;
    const visual = rows.filter(r => r.status === 'VISUAL REVIEW REQUIRED').length;
    const lines = [
      '# Carrowmont Automated QA Summary',
      '',
      `Run started: ${this.started}`,
      `Overall Playwright result: ${result.status}`,
      '',
      `Automated checks: ${passed} PASS / ${failed} FAIL`,
      `Visual review items: ${visual}`,
      '',
      '| Status | Test |',
      '|---|---|',
      ...rows.map(r => `| ${r.status} | ${String(r.title).replace(/\|/g, '\\|')} |`),
      '',
      failed ? '## Failures' : '## Failures\n\nNone.',
      ...rows.filter(r => r.status === 'FAIL').flatMap(r => ['', `### ${r.title}`, '', '```', r.error || 'Unknown failure', '```'])
    ];
    fs.writeFileSync('qa-summary.md', lines.join('\n'));
    fs.writeFileSync('qa-results.json', JSON.stringify({ started: this.started, ended: new Date().toISOString(), rows }, null, 2));
  }
}
