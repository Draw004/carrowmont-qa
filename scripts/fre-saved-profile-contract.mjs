import fs from 'node:fs';
import path from 'node:path';

export function runFreSavedProfileContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const main=path.join(root,'draw004.github.io');
  const configFile=path.join(main,'assets/account/supabase-config.js');
  const clientFile=path.join(main,'assets/account/carrowmont-account.js');
  const uiFile=path.join(main,'assets/account/my-carrowmont-account.js');
  const pageFile=path.join(main,'my-carrowmont.html');
  const sqlFile=path.join(main,'docs/CARROWMONT_FRE_BATCH7_SUPABASE_SCHEMA.sql');
  const setupFile=path.join(main,'docs/CARROWMONT_FRE_BATCH7_SUPABASE_SETUP.md');
  const ledgerFile=path.join(main,'docs/CARROWMONT_FRE_BATCH7A_ACCEPTANCE_LEDGER.md');
  const implFile=path.join(main,'docs/CARROWMONT_FRE_BATCH7A_OPTIONAL_LOGIN_FOUNDATION.md');
  const registryFile=path.join(main,'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V13.json');
  add('Batch 7A account foundation files exist',[configFile,clientFile,uiFile,pageFile,sqlFile,setupFile,ledgerFile,implFile,registryFile].every(fs.existsSync));
  if(![configFile,clientFile,uiFile,pageFile,sqlFile].every(fs.existsSync)) return checks;

  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const ui=fs.readFileSync(uiFile,'utf8');
  const page=fs.readFileSync(pageFile,'utf8');
  const sql=fs.readFileSync(sqlFile,'utf8');
  const setup=fs.readFileSync(setupFile,'utf8');
  const ledger=fs.readFileSync(ledgerFile,'utf8');

  add('account saving is configuration-gated and disabled by default',config.includes('enabled: false')&&config.includes("url: ''")&&config.includes("publishableKey: ''")&&ui.includes('if(!root||!Account.isConfigured()) return;'));
  add('disabled configuration performs no Supabase SDK request',client.includes('if(!isConfigured()) return null;')&&client.includes("const SDK_SRC='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'")&&!page.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js'));
  add('passwordless email magic-link auth is the only frontend sign-in path',client.includes('signInWithOtp')&&client.includes('emailRedirectTo')&&!client.includes('signInWithPassword')&&!client.includes('password:'));
  add('authenticated identity is validated with getUser before cloud access',client.includes('client.auth.getUser()')&&client.includes("throw new Error('Sign in before saving My Carrowmont.')"));
  add('guest profile is never uploaded automatically',page.includes('Nothing is uploaded until I explicitly choose to save')&&ui.includes("$('mycmSaveCloud').addEventListener('click'")&&client.includes('stageGuestProfile')&&client.includes('saveCloudProfile'));
  add('cloud and browser profiles never auto-merge or silently overwrite',page.includes('Carrowmont never auto-merges browser and account profiles')&&page.includes('Save this browser profile to account')&&page.includes('Load saved profile')&&!ui.includes('saveCloudProfile(profile); // auto'));
  add('signed-in user can export delete saved profile and sign out',page.includes('Export account data')&&page.includes('Delete saved cloud profile')&&page.includes('Sign out')&&client.includes('exportAccountData')&&client.includes('deleteCloudProfile')&&client.includes('signOut'));
  add('saved scenario API boundary exists without adding a public journey',client.includes('listScenarios')&&client.includes('saveScenario')&&client.includes('deleteScenario')&&config.includes("scenarioTable: 'carrowmont_saved_scenarios'"));
  add('RLS schema protects profile and scenario rows with auth.uid()',sql.includes('enable row level security')&&sql.includes('carrowmont_profiles')&&sql.includes('carrowmont_saved_scenarios')&&(sql.match(/auth\.uid\(\)/g)||[]).length>=8&&sql.includes('on delete cascade'));
  add('database grants are least-privilege and anonymous access is not granted',sql.includes('revoke all on table public.carrowmont_profiles from anon, authenticated')&&sql.includes('grant select, insert, update, delete on table public.carrowmont_profiles to authenticated')&&sql.includes('revoke all on table public.carrowmont_saved_scenarios from anon, authenticated'));
  add('frontend and setup docs forbid service-role secrets',!/(service_role\s*[:=]\s*['\"][A-Za-z0-9._-]+)/i.test(config+'\n'+client+'\n'+ui)&&setup.includes('Never copy a `service_role` key into the website'));
  add('My Carrowmont account UI is present but hidden until configured',page.includes('id="mycmAccount"')&&page.includes('Save My Carrowmont for later')&&page.includes('hidden')&&page.includes('/assets/account/supabase-config.js')&&page.includes('/assets/account/carrowmont-account.js')&&page.includes('/assets/account/my-carrowmont-account.js'));
  add('Batch 7A leaves public inventory and calculator count unchanged',JSON.parse(fs.readFileSync(path.join(main,'data/carrowmont-search-pages.json'),'utf8')).entries?.length===138&&/"numberOfItems"\s*:\s*23/.test(fs.readFileSync(path.join(main,'tools.html'),'utf8')));
  const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
  add('Engine Registry V13 records configuration-gated account boundaries',registry.schema_version===13&&registry.registry_id==='carrowmont-fre-engine-registry-v13'&&registry.fre_batch7a?.status==='FOUNDATION_READY_CONFIGURATION_GATED'&&registry.fre_batch7a?.public_tool_count===23&&registry.fre_batch7a?.search_public_page_count===138);
  add('Batch 7A ledger protects guest-first optional-login boundaries',ledger.includes('Guest-first dashboard still works')&&ledger.includes('Guest financial values are never uploaded automatically')&&ledger.includes('Existing cloud data is never silently overwritten')&&ledger.includes('Frontend contains no service-role secret')&&ledger.includes('Production activation requires real Supabase Free project'));
  add('activation checklist requires RLS schema and fresh release gates',setup.includes('run `docs/CARROWMONT_FRE_BATCH7_SUPABASE_SCHEMA.sql`')&&setup.includes('allowed redirect URL')&&setup.includes('Publisher, Automated QA, Multi-Repo Guard'));
  return checks;
}
