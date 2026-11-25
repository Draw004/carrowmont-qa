import fs from 'node:fs';
import path from 'node:path';

export function runAutomationFallbackHardening2Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const us=read(main+'.github/workflows/update-us-debt-reference.yml');
  const gold=read(main+'.github/workflows/update-gold-macro-reference.yml');
  const country=read(main+'.github/workflows/update-country-financial-reference.yml');
  const doc=read(main+'docs/CARROWMONT_AUTOMATION_FALLBACK_HARDENING2.md');
  const handover=read(main+'docs/CARROWMONT_GITHUB_AUTOMATION_HANDOVER.md');

  const weekly=(src,cron,prefix)=>src.includes(`FALLBACK_CRON: "${cron}"`) && src.includes(`BRANCH_PREFIX: "${prefix}"`) &&
    src.includes('id: weekly_guard') && src.includes('EVENT_NAME: ${{ github.event_name }}') && src.includes('EVENT_SCHEDULE: ${{ github.event.schedule }}') &&
    src.includes('--state closed') && src.includes('--json headRefName,url,mergedAt') && src.includes('.mergedAt >= $start') &&
    src.includes("steps.weekly_guard.outputs.skip != 'true'") && src.includes('workflow_dispatch:');

  add('US Debt Tuesday trigger is a true catch-up run guarded by a same-week merged updater PR check', weekly(us,'47 8 * * 2','automation/us-debt-reference-') && us.includes('cron: "23 6 * * 1"'));
  add('Gold Tuesday trigger is a true catch-up run guarded by a same-week merged updater PR check', weekly(gold,'43 15 * * 2','automation/gold-macro-reference-') && gold.includes('cron: "25 14 * * 1"'));
  add('Both weekly updaters retain the existing open-PR guard after the merged-this-week guard',
    us.includes('Check for an existing debt-reference PR') && us.includes('--state open') && gold.includes('Check for an existing gold-reference PR') && gold.includes('--state open'));
  add('Monday and manual runs bypass the merged-this-week catch-up guard rather than suppressing intentional recovery',
    [us,gold].every(src=>src.includes('if [[ "$EVENT_NAME" != "schedule" || "$EVENT_SCHEDULE" != "$FALLBACK_CRON" ]]') && src.includes('Primary/manual run: weekly fallback guard does not apply.')));
  add('Country Saturday catch-up remains material-change-driven and is not incorrectly suppressed by a same-week merged guard',
    country.includes('cron: "35 22 * * 1-5"') && country.includes('cron: "53 7 * * 6"') && !country.includes('id: weekly_guard') && country.includes("steps.refresh.outputs.changed != 'true'"));
  add('Fallback correction and Country exception are durable in handover documentation',
    Boolean(doc&&handover) && (doc.includes('catch-up-only')||doc.includes('does not create a second weekly update')) && /duplicate|second weekly/i.test(doc) && handover.includes('catch-up-only') && handover.includes('Country References'));
  return checks;
}
