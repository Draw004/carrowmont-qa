import fs from 'node:fs';
import path from 'node:path';

// SECOPS2: classify public-repo documents before moving/removing any file.
// An inventory is NOT access control, a Git-history audit, or proof of data isolation.
const normalize = p => p.replaceAll('\\', '/');
const allowedCategories = new Set([
  'operational_setup_review',
  'source_methodology_or_research',
  'historic_spec_implementation_or_acceptance',
  'public_credential_metadata_review',
]);
const listFiles = dir => {
  if (!fs.existsSync(dir)) return [];
  const out=[];
  const walk = folder => {
    for (const entry of fs.readdirSync(folder,{withFileTypes:true})) {
      if (entry.isSymbolicLink()) continue;
      const full=path.join(folder,entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(normalize(path.relative(dir,full)));
    }
  };
  walk(dir);
  return out.sort();
};

export function comparePublicDocumentInventory(siteRoot, inventory) {
  const problems=[];
  if (!inventory || !Array.isArray(inventory.documents)) return ['missing inventory documents'];
  if (inventory.schema_version !== 1 || inventory.repository !== 'draw004.github.io') problems.push('invalid inventory schema/repository');
  if (!inventory.privacy_caution?.includes('public GitHub repository')) problems.push('public repository disclosure warning absent');
  const paths=inventory.documents.map(x=>x?.path);
  const duplicates=paths.filter((x,i)=>paths.indexOf(x)!==i);
  if(duplicates.length) problems.push('duplicate catalog paths: '+[...new Set(duplicates)].join(', '));
  for(const x of inventory.documents){
    const rel=x?.path;
    if (typeof rel !== 'string' || rel.startsWith('/') || rel.includes('..') || !/^(?:docs\/|ops\/credential-expiry-registry\.json$)/.test(rel)) {
      problems.push('invalid catalog path'); continue;
    }
    if(!allowedCategories.has(x.triage)) problems.push('invalid triage for '+rel);
  }
  const live=listFiles(path.join(siteRoot,'docs')).map(x=>'docs/'+x);
  if (fs.existsSync(path.join(siteRoot,'ops','credential-expiry-registry.json'))) live.push('ops/credential-expiry-registry.json');
  const expected=new Set(live);
  const listed=new Set(paths);
  for(const p of expected) if(!listed.has(p)) problems.push('unreviewed public document: '+p);
  for(const p of listed) if(!expected.has(p)) problems.push('inventory references missing document: '+p);
  if (inventory.file_count!==inventory.documents.length) problems.push('inventory count differs');
  return problems;
}

export function runSecops2OperationalDocsContract(sourceRoot) {
  const site=path.join(sourceRoot,'draw004.github.io');
  const qa=path.join(sourceRoot,'carrowmont-qa');
  const load = p => fs.existsSync(p) ? fs.readFileSync(p,'utf8') : '';
  const inventoryPath=path.join(qa,'docs','CARROWMONT_SECOPS2_PUBLIC_DOCUMENT_INVENTORY.json');
  let catalog=null;
  try { catalog=JSON.parse(load(inventoryPath)); } catch { /* missing or malformed catalog */ }
  const findings=comparePublicDocumentInventory(site,catalog);
  const status=load(path.join(site,'docs','CARROWMONT_CURRENT_PROJECT_STATUS.md'));
  const roadmap=load(path.join(site,'docs','CARROWMONT_FRE_MASTER_ROADMAP_STATUS.md'));
  const newChat=load(path.join(site,'docs','CARROWMONT_NEW_CHAT_START_HERE.txt'));
  const policy=load(path.join(qa,'docs','CARROWMONT_SECOPS2_OPERATIONAL_DOCUMENT_REVIEW_2026-11-27.md'));
  return [
    {name:'public-repo operational documents have a complete reviewed inventory without suppressing exposure facts',ok:findings.length===0 && catalog?.documents?.length>=200,detail:findings.slice(0,6).join('; ')},
    {name:'current project and roadmap describe Wave 2 as completed and preserve original 13B/14 deferrals',ok:status.includes('Wave 2 is COMPLETE AND DEPLOYED') && roadmap.includes('Ask Intent Alignment & Coverage Wave 2 (COMPLETE') && status.includes('Batch 13B') && status.includes('ON HOLD') && roadmap.includes('Batch 14')},
    {name:'new-account instructions distinguish deployed features from proposed numbered batches',ok:newChat.includes('Wave 2 is deployed and closed') && newChat.includes('Batch 1 SECOPS1 are complete') && newChat.includes('Batch 2 is operational document/state review') && newChat.includes('SNAPSHOT-MANIFEST.txt')},
    {name:'operational document review states public exposure, source dependencies and untested risks without claiming privacy certification',ok:policy.includes('public GitHub repository') && policy.includes('credential-expiry-registry.json') && policy.includes('historical Git revisions') && policy.includes('not an access-control mechanism')},
  ];
}
