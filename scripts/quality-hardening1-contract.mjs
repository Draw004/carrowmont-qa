import fs from 'node:fs';
import path from 'node:path';

const TOOL_ROUTES = Object.freeze({
  '/sip-calculator/':'sip-calculator',
  '/goal-planner/':'goal-planner',
  '/financial-independence/':'financial-independence',
  '/inflation-calculator/':'inflation-calculator',
  '/retirement-calculator/':'retirement-calculator',
  '/budget-cash-flow-planner/':'budget-cash-flow-planner',
  '/mortgage-payoff-calculator/':'mortgage-payoff-calculator',
  '/compound-interest-calculator/':'compound-interest-calculator',
  '/loan-calculator/':'loan-calculator'
});

function htmlFiles(dir){
  const out=[];
  if(!fs.existsSync(dir)) return out;
  const walk=current=>{
    for(const entry of fs.readdirSync(current,{withFileTypes:true})){
      const full=path.join(current,entry.name);
      if(entry.isDirectory()) walk(full);
      else if(entry.isFile()&&entry.name.endsWith('.html')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function stripQueryHash(value){
  return String(value||'').split('#',1)[0].split('?',1)[0];
}

function localTargetExists(root, sourceFile, raw){
  const value=String(raw||'').trim();
  if(!value||value.startsWith('#')||/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(value)) return true;
  let target=stripQueryHash(value);
  if(!target) return true;
  try{ target=decodeURIComponent(target); }catch(_err){}
  const main=path.join(root,'draw004.github.io');
  if(target.startsWith('/')){
    if(target==='/') return fs.existsSync(path.join(main,'index.html'));
    for(const [prefix,repo] of Object.entries(TOOL_ROUTES)){
      if(target.startsWith(prefix)){
        const rest=target.slice(prefix.length);
        const base=path.join(root,repo);
        const resolved=rest?path.join(base,rest):path.join(base,'index.html');
        return fs.existsSync(resolved)||(fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory()&&fs.existsSync(path.join(resolved,'index.html')));
      }
    }
    const resolved=path.join(main,target.slice(1));
    return fs.existsSync(resolved)||(fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory()&&fs.existsSync(path.join(resolved,'index.html')));
  }
  const resolved=path.resolve(path.dirname(sourceFile),target);
  return fs.existsSync(resolved)||(fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory()&&fs.existsSync(path.join(resolved,'index.html')));
}

function brokenInternalTargets(root){
  const main=path.join(root,'draw004.github.io');
  const broken=[];
  const attr=/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for(const file of htmlFiles(main)){
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(attr)){
      const value=match[1];
      if(!localTargetExists(root,file,value)) broken.push(`${path.relative(main,file)} -> ${stripQueryHash(value)}`);
    }
  }
  return [...new Set(broken)].sort();
}

export function runQualityHardening1Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const us=read(main+'.github/workflows/update-us-debt-reference.yml');
  const gold=read(main+'.github/workflows/update-gold-macro-reference.yml');
  const country=read(main+'.github/workflows/update-country-financial-reference.yml');
  const status=read(main+'docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const roadmap=read(main+'docs/CARROWMONT_FRE_MASTER_ROADMAP_STATUS.md');
  const start=read(main+'docs/CARROWMONT_DEVELOPMENT_START_HERE.md');
  const newChat=read(main+'docs/CARROWMONT_NEW_CHAT_START_HERE.txt');
  const implementation=read(main+'docs/CARROWMONT_QUALITY_HARDENING1_IMPLEMENTATION.md');
  const handbook=read(main+'docs/CARROWMONT_MASTER_CONTINUITY_HANDBOOK.md');
  const broken=brokenInternalTargets(root);

  add('site-wide static internal destination audit has no broken local href/src targets',broken.length===0,broken.join('; '));
  add('US debt updater has primary Monday run plus independently timed Tuesday fallback and remains manual-dispatchable',
    us.includes('cron: "23 6 * * 1"')&&us.includes('cron: "47 8 * * 2"')&&us.includes('workflow_dispatch:')&&us.includes('automation/us-debt-reference-')&&us.includes('id: weekly_guard')&&us.includes('mergedAt'));
  add('Gold macro updater has primary Monday run plus independently timed Tuesday fallback without changing protected-PR behavior',
    gold.includes('cron: "25 14 * * 1"')&&gold.includes('cron: "43 15 * * 2"')&&gold.includes('workflow_dispatch:')&&gold.includes('automation/gold-macro-reference-')&&gold.includes('id: weekly_guard')&&gold.includes('mergedAt'));
  add('Country reference updater keeps weekday checks and adds Saturday catch-up for a dropped Friday schedule',
    country.includes('cron: "35 22 * * 1-5"')&&country.includes('cron: "53 7 * * 6"')&&country.includes('workflow_dispatch:')&&country.includes('automation/country-financial-reference-'));
  add('roadmap and portable handover explicitly put Batch 13B on hold and traffic-gate Batch 14',
    status.includes('Batch 13B')&&status.includes('ON HOLD')&&status.includes('Batch 14')&&status.includes('traffic')&&
    roadmap.includes('ON HOLD')&&roadmap.includes('traffic')&&start.includes('ON HOLD')&&newChat.includes('ON HOLD'));
  add('hardening closeout and next improvement sequence are durable in repository documentation rather than chat memory',
    status.includes('Quality Audit & Hardening Release 1')&&status.includes('completed and deployed')&&
    status.includes('Ask Carrowmont Expansion Wave 1')&&status.includes('Learn Hub 2.0')&&status.includes('completed and deployed')&&
    status.includes('Evergreen Learn Expansion Wave 1')&&status.includes('active controlled review release')&&implementation.includes('Deployment closeout')&&implementation.includes('account-independent handover')&&
    implementation.includes('**Release state:** **complete and deployed.**'));
  add('snapshot authority is manifest-based and cannot enter a self-referential current-filename loop',
    status.includes('Snapshot authority rule:')&&status.includes('SNAPSHOT-MANIFEST.txt')&&
    handbook.includes('Current code authority:')&&handbook.includes('intentionally does not pin a current snapshot filename/hash')&&
    start.includes('Status/handbook files must not be used as a substitute for the manifest')&&
    newChat.includes('do not expect the status/handbook documents to mirror the newest snapshot filename/hash')&&
    !status.includes('Authoritative green source snapshot:**')&&!status.includes('**Snapshot SHA-256:**')&&
    !handbook.includes('Authoritative baseline snapshot:**')&&!handbook.includes('**Snapshot SHA-256:**'));
  return checks;
}
