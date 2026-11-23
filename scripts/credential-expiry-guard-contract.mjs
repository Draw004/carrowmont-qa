import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Validation of public metadata and issue decisions. No network, secrets or live writes.
export async function runCredentialExpiryGuardContract(root) {
  const checks=[];
  const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
  const site=path.join(root,'draw004.github.io');
  const read=(p)=>fs.readFileSync(path.join(site,p),'utf8');
  const registryPath='ops/credential-expiry-registry.json';
  const corePath='scripts/carrowmont-credential-expiry-core.mjs';
  const cliPath='scripts/carrowmont-credential-expiry-guard.mjs';
  const workflowPath='.github/workflows/carrowmont-credential-expiry-guard.yml';
  const docPath='docs/CARROWMONT_CREDENTIAL_EXPIRY_GUARD.md';
  const statusPath='docs/CARROWMONT_CURRENT_PROJECT_STATUS.md';
  const expected=[registryPath,corePath,cliPath,workflowPath,docPath];
  add('guard source and renewal guide exist',expected.every(p=>fs.existsSync(path.join(site,p))));
  if (!expected.every(p=>fs.existsSync(path.join(site,p)))) return checks;
  let registry;
  try {registry=JSON.parse(read(registryPath));}
  catch { add('credential registry JSON is valid',false); return checks; }
  add('credential registry JSON is valid',true);
  const {validateRegistry,classifyCredential,daysRemaining,parseIsoDay,ISSUE_MARKER,issueBody,
    nextIssueAction,extractIssueStage}=await import(pathToFileURL(path.join(site,corePath)).href);
  const {syncIssue,probeExistingPat}=await import(pathToFileURL(path.join(site,cliPath)).href);
  let credential;
  try{ credential=validateRegistry(registry); add('registry schema, secret alias, owner repo and review data validated',true); }
  catch(e){ add('registry schema, secret alias, owner repo and review data validated',false,e.message);return checks; }
  add('token expiry matches owner-reviewed GitHub date 2027-09-22',credential.expires_on==='2027-09-22');
  add('warnings are exactly 90, 60, 30, 14, 7 days',credential.reminder_days.join(',')==='90,60,30,14,7');
  add('expiry metadata includes no raw credential secret or token ID',
    !/github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9_]+/.test(read(registryPath)) &&
    !/token_value|access_token|private_key|token_id/.test(read(registryPath)));
  add('90-day warning boundary',classifyCredential(credential,'2027-06-23').stage==='clear' &&
    classifyCredential(credential,'2027-06-24').stage==='warning-90');
  add('60-day warning boundary',classifyCredential(credential,'2027-07-23').stage==='warning-90' &&
    classifyCredential(credential,'2027-07-24').stage==='warning-60');
  add('30-day warning boundary',classifyCredential(credential,'2027-08-23').stage==='warning-30');
  add('14-day warning boundary',classifyCredential(credential,'2027-09-08').stage==='warning-14');
  add('7-day warning boundary',classifyCredential(credential,'2027-09-15').stage==='warning-7');
  add('missed schedule escalates to current stage',classifyCredential(credential,'2027-08-25').stage==='warning-30');
  add('expiry day and overdue are urgent',classifyCredential(credential,'2027-09-22').stage==='expires-today' &&
    classifyCredential(credential,'2027-09-23').stage==='expired' &&
    classifyCredential(credential,'2027-09-23').critical);
  add('early revoked/permission-reduced credential alerts immediately',
    classifyCredential(credential,'2026-11-20','access-failed').stage==='access-failed' &&
    classifyCredential(credential,'2026-11-20','access-failed').alert);
  add('inconclusive network probe does not falsely label credential invalid',
    classifyCredential(credential,'2026-11-20','unverified').stage==='probe-unverified' &&
    !classifyCredential(credential,'2026-11-20','unverified').alert);
  add('public issue contains dated renewal steps without secret values',
    issueBody(credential,classifyCredential(credential,'2027-09-15')).includes(ISSUE_MARKER) &&
    issueBody(credential,classifyCredential(credential,'2027-09-15')).includes('2027-09-22') &&
    !issueBody(credential,classifyCredential(credential,'2027-09-15')).includes('CARROWMONT_REPO_TOKEN'));
  const fakeIssue={number:9,state:'open',body:issueBody(credential,classifyCredential(credential,'2027-06-24'))};
  add('identical repeated scheduled run does not duplicate issue/comments',
    nextIssueAction(fakeIssue,classifyCredential(credential,'2027-06-24'))==='none');
  add('severity upgrade edits existing issue, not a second issue',
    nextIssueAction(fakeIssue,classifyCredential(credential,'2027-07-24'))==='escalate');
  add('expired or renewed state uses reopening/closing rather than duplicates',
    nextIssueAction({...fakeIssue,state:'closed'},classifyCredential(credential,'2027-08-23'))==='reopen' &&
    nextIssueAction(fakeIssue,classifyCredential(credential,'2026-11-20'))==='close');
  add('issue stage metadata can be reconstructed after future ChatGPT account change',
    extractIssueStage(fakeIssue.body)==='warning-90');
  add('invalid date is rejected by parser',
    (()=>{try{parseIsoDay('2027-02-30');return false}catch{return true}})());
  add('invalid credential registry structure is rejected',
    (()=>{try{validateRegistry({...registry,credentials:[{...credential,token_value:'bad'}]});return false}catch{return true}})() &&
    (()=>{try{validateRegistry({...registry,private_token:'bad'});return false}catch{return true}})());

  const issueStore=[];
  const comments=[];
  const mockRequest=async (url,_token,method='GET',body)=>{
    const issueEndpoint='/repos/Draw004/draw004.github.io/issues';
    if(method==='GET' && url.startsWith(issueEndpoint+'?')) return issueStore.map(i=>({...i}));
    if(method==='POST' && url===issueEndpoint) {
      const issue={number:issueStore.length+1,state:'open',...body}; issueStore.push(issue);return {...issue};
    }
    const match=url.match(/\/issues\/(\d+)(\/comments)?$/);
    if(match && method==='POST' && match[2]) {comments.push(body);return {id:comments.length};}
    if(match && method==='PATCH') {
      const target=issueStore.find(i=>i.number===Number(match[1]));
      if(!target)throw new Error('mock issue missing');
      Object.assign(target,body);return {...target};
    }
    throw new Error('Unrecognized mock issue operation '+method+' '+url);
  };
  const repo='Draw004/draw004.github.io';
  const warning90=classifyCredential(credential,'2027-06-24');
  const warning60=classifyCredential(credential,'2027-07-24');
  const clear=classifyCredential(credential,'2026-11-20');
  const actions=[];
  actions.push((await syncIssue(repo,'fake-issues-only',warning90,mockRequest)).action);
  actions.push((await syncIssue(repo,'fake-issues-only',warning90,mockRequest)).action);
  actions.push((await syncIssue(repo,'fake-issues-only',warning60,mockRequest)).action);
  actions.push((await syncIssue(repo,'fake-issues-only',warning60,mockRequest)).action);
  actions.push((await syncIssue(repo,'fake-issues-only',clear,mockRequest)).action);
  actions.push((await syncIssue(repo,'fake-issues-only',clear,mockRequest)).action);
  actions.push((await syncIssue(repo,'fake-issues-only',warning60,mockRequest)).action);
  add('mock GitHub issue lifecycle creates, deduplicates, escalates, closes, reopens',
    actions.join(',')==='create,none,escalate,none,close,none,reopen' &&
    issueStore.length===1 && comments.length===1 && issueStore[0].state==='open');

  const probeMissing=await probeExistingPat('');
  const probeGood=await probeExistingPat('placeholder',async(_url)=>({status:200,headers:new Map(),json:async()=>({permissions:{push:true}})}));
  const probeDenied=await probeExistingPat('placeholder',async(_url)=>({status:200,headers:new Map(),json:async()=>({permissions:{push:false}})}));
  const probeApiDown=await probeExistingPat('placeholder',async()=>({status:503,headers:new Map()}));
  add('PAT health checker uses permissions, not public repository readability',
    probeMissing==='access-failed' && probeGood==='ok' && probeDenied==='access-failed' && probeApiDown==='unverified');

  const workflow=read(workflowPath);
  add('guard scheduled daily and manually runnable only from Main',
    workflow.includes("cron: '23 5 * * *'") && workflow.includes('workflow_dispatch:') &&
    workflow.includes("github.repository == 'Draw004/draw004.github.io'"));
  add('guard issues use independent GITHUB_TOKEN and least privilege',
    workflow.includes('issues: write') && workflow.includes('contents: read') &&
    workflow.includes('GITHUB_TOKEN: ${{ github.token }}') &&
    workflow.includes('CARROWMONT_REPO_TOKEN: ${{ secrets.CARROWMONT_REPO_TOKEN }}') &&
    workflow.includes('persist-credentials: false'));
  const cli=read(cliPath);
  add('apply path refuses accidental non-default-branch writes',
    cli.includes("process.env.GITHUB_REF !== 'refs/heads/main'") &&
    cli.includes("repo !== 'Draw004/draw004.github.io'"));
  add('guard source cannot inadvertently print raw token or log HTTP API response body',
    !cli.includes('console.log(secret)') && !cli.includes('console.log(process.env.CARROWMONT_REPO_TOKEN)') &&
    !cli.includes('response.text()'));
  const doc=read(docPath);
  add('renewal guide includes new-account handover, independent backup and security scope',
    doc.includes('24 June 2027') && doc.includes('60 days of inactivity') &&
    doc.includes('Workflows: read/write') && doc.includes('`CARROWMONT_RELEASE_TOKEN`'));
  const currentStatus=read(statusPath);
  add('current status records an authoritative all-green baseline and deployed credential guard state',
    currentStatus.includes('Authoritative green source snapshot:** `carrowmont-source-snapshot - ') &&
    currentStatus.includes('Snapshot SHA-256:') &&
    currentStatus.includes('Credential Expiry Guard v1:** deployed') &&
    currentStatus.includes('Workflows: read/write') &&
    currentStatus.includes('normal security baseline'));
  add('standards index links authoritative expiry guard instructions',
    read('docs/CARROWMONT_STANDARDS_INDEX.md').includes('CARROWMONT_CREDENTIAL_EXPIRY_GUARD.md'));
  return checks;
}
