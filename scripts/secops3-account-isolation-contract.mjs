import fs from 'node:fs';
import path from 'node:path';

// SECOPS3: source policy regression only. Live Supabase catalog and two-account
// isolation still require separately authorized verification; admin SQL sessions
// are not equivalent to signed-in end-user policy execution.
const tables=['carrowmont_profiles','carrowmont_saved_scenarios'];
const operations=['select','insert','update','delete'];
const read=(root,rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const compact=t=>String(t).replace(/--[^\n]*/g,' ').replace(/\s+/g,' ').toLowerCase();

export function checkReviewedSchema(sql){
  const issues=[]; const src=compact(sql);
  for(const table of tables){
    if(!src.includes(`alter table public.${table} enable row level security;`)) issues.push(`${table}: RLS is not enabled`);
    if(!src.includes(`revoke all on table public.${table} from anon, authenticated;`)) issues.push(`${table}: expected default grants reset is absent`);
    if(!src.includes(`grant select, insert, update, delete on table public.${table} to authenticated;`)) issues.push(`${table}: authenticated CRUD grants missing`);
  }
  for(const policy of src.matchAll(/create policy\s+"[^"]+"\s+on public\.(\w+)\s+for\s+(select|insert|update|delete)\s+to\s+authenticated\b([\s\S]*?);/g)){
    const [,table,op,body]=policy; if(!tables.includes(table))continue;
    const normalized=body.replace(/\s+/g,' ');
    const owner=/auth\.uid\s*\(\s*\)/.test(normalized)&&/\buser_id\b/.test(normalized)&&/=\s*user_id/.test(normalized);
    if(!owner)issues.push(`${table}.${op}: ownership condition missing`);
    if((op==='select'||op==='update'||op==='delete')&&!/\busing\b/.test(normalized))issues.push(`${table}.${op}: USING condition missing`);
    if((op==='insert'||op==='update')&&!/\bwith check\b/.test(normalized))issues.push(`${table}.${op}: WITH CHECK condition missing`);
  }
  for(const table of tables)for(const op of operations){
    const match=new RegExp(`create policy\\s+"[^"]+"\\s+on public\\.${table}\\s+for\\s+${op}\\s+to\\s+authenticated\\b`,'i');
    if(!match.test(src))issues.push(`${table}.${op}: authenticated owner-only policy missing`);
  }
  if(/create policy\s+.*?\s+to\s+(?:public|anon)\b/i.test(src))issues.push('SQL declares publicly accessible policy');
  return [...new Set(issues)];
}
export function checkBrowserAccountBoundary(client,config,dashboard){
  const issues=[];
  if(!/publishableKey\s*:\s*['"]sb_publishable_/.test(config))issues.push('frontend is not explicitly configured with a publishable key');
  if(/(?:service_role|sb_secret_|supabase_service_key|secret[_-]?key)\s*[:=]\s*['"][^'"]+['"]/i.test(config))issues.push('privileged key-like setting in frontend config');
  if(!client.includes('getUser()'))issues.push('verified getUser authentication call missing');
  for(const fn of ['loadCloudProfile','saveCloudProfile','deleteCloudProfile','listScenarios','saveScenario','deleteScenario']){
    if(!client.includes(`function ${fn}(`))issues.push(`${fn} function missing`);
  }
  const required=[
    ["loadCloudProfile",/\.eq\(['"]user_id['"],\s*user\.id\)/],
    ["deleteCloudProfile",/\.eq\(['"]user_id['"],\s*user\.id\)/],
    ["listScenarios",/\.eq\(['"]user_id['"],\s*user\.id\)/],
    ["deleteScenario",/\.eq\(['"]user_id['"],\s*user\.id\)/],
  ];
  for(const [fn,predicate] of required){
    const start=client.indexOf(`function ${fn}(`);const next=start>=0?client.indexOf('\n  }',start):-1;
    const body=start>=0?client.slice(start,next>start?next:undefined):'';
    if(!predicate.test(body))issues.push(`${fn} lacks explicit current-user query filter`);
  }
  if(!/user_id\s*:\s*user\.id/.test(client))issues.push('current-user ownership not set on save payload');
  if(!dashboard.includes('entry.explicit!==true'))issues.push('staged plan import missing explicit-choice guard');
  if(!dashboard.includes('2*60*60*1000'))issues.push('staged plan import missing two-hour expiry');
  return issues;
}
export function checkReadOnlyAuditSql(sql){
  const src=sql.replace(/--[^\n]*/g,' ').trim();
  const disallowed=/\b(insert|update|delete|truncate|drop|alter|create|grant|revoke|copy|execute|do|call)\b/i;
  const unquoted=src.replace(/'(?:''|[^'])*'/g, "''");
  const errors=[];
  if(disallowed.test(unquoted))errors.push('live catalog audit contains a write or administrative command');
  if(!/\bpg_policies\b/i.test(src)||!/\bpg_class\b/i.test(src))errors.push('live catalog query does not inspect both policy and RLS catalogs');
  if(!/has_table_privilege\s*\(\s*'anon'/i.test(src))errors.push('live catalog query does not inspect effective anon grants');
  if(/\bfrom\s+(?:public\.)?carrowmont_(?:profiles|saved_scenarios)\b/i.test(src))errors.push('live catalog query reads account records');
  return errors;
}
export function runSecops3AccountIsolationContract(sourceRoot){
  const sql=read(sourceRoot,'draw004.github.io/docs/CARROWMONT_FRE_BATCH7_SUPABASE_SCHEMA.sql');
  const client=read(sourceRoot,'draw004.github.io/assets/account/carrowmont-account.js');
  const config=read(sourceRoot,'draw004.github.io/assets/account/supabase-config.js');
  const dashboard=read(sourceRoot,'draw004.github.io/assets/account/my-carrowmont-account.js');
  const audit=read(sourceRoot,'carrowmont-qa/docs/CARROWMONT_SECOPS3_READ_ONLY_CATALOG_AUDIT.sql');
  const guide=read(sourceRoot,'carrowmont-qa/docs/CARROWMONT_SECOPS3_ACCOUNT_ISOLATION_REVIEW_2026-11-27.md');
  const schema=checkReviewedSchema(sql),browser=checkBrowserAccountBoundary(client,config,dashboard),readonly=checkReadOnlyAuditSql(audit);
  return [
    {name:'reviewed Supabase schema retains owner-only authenticated CRUD RLS policies on both saved-data tables',ok:schema.length===0,detail:schema.slice(0,6).join('; ')},
    {name:'browser client retains public key, authenticated ownership filters and explicit staging boundary',ok:browser.length===0,detail:browser.slice(0,6).join('; ')},
    {name:'owner-only catalog verification query is read-only and does not inspect private account rows',ok:readonly.length===0,detail:readonly.slice(0,6).join('; ')},
    {name:'security review distinguishes static assurance from unverified deployed RLS and two-account isolation',ok:guide.includes('not proof of production RLS')&&guide.includes('two synthetic accounts')&&guide.includes('Do not upload real user data')}
  ];
}
