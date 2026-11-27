import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectPublicSource} from '../scripts/public-source-hygiene-contract.mjs';

// SECOPS1 tests are local-only, with fake credentials in disposable fixtures.
// No external HTTP calls, no production data and no real credentials.
const makeFixture=()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'carrowmont-secops1-'));
  const site=path.join(root,'draw004.github.io');fs.mkdirSync(site);
  return {root,site};
};

test.describe('SECOPS1 public-source hygiene guard',()=>{
  test('[AUTO] public Supabase keys and operational metadata do not falsely trigger secret warnings',()=>{
    const {root,site}=makeFixture();
    try{
      fs.mkdirSync(path.join(site,'assets','account'),{recursive:true});
      fs.mkdirSync(path.join(site,'ops'),{recursive:true});
      fs.writeFileSync(path.join(site,'assets','account','supabase-config.js'),"export const config = { publishableKey: 'sb_publishable_qa_safe', enabled: true };\n");
      fs.writeFileSync(path.join(site,'ops','credential-expiry-registry.json'),JSON.stringify({credentials:[{secret_name:'CARROWMONT_REPO_TOKEN',expires_on:'2027-09-22'}]}));
      fs.writeFileSync(path.join(site,'.env.example'),'SUPABASE_URL=https://example.invalid\n');
      expect(inspectPublicSource(site)).toEqual([]);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
  });

  test('[AUTO] an accidentally committed environment file is rejected',()=>{
    const {root,site}=makeFixture();
    try{
      fs.writeFileSync(path.join(site,'.env.production'),'ONLY_SYNTHETIC=example');
      expect(inspectPublicSource(site)).toEqual(expect.arrayContaining([expect.objectContaining({path:'.env.production',rule:'unreviewed environment file'})]));
    }finally{fs.rmSync(root,{recursive:true,force:true});}
  });

  test('[AUTO] recognisable private tokens, key blocks and privileged JWTs are rejected without printing their values',()=>{
    const {root,site}=makeFixture();
    try{
      const fakeToken='ghp_'+'Q'.repeat(40);
      const payload=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url');
      const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
      const fakeJwt=`${header}.${payload}.${'A'.repeat(36)}`;
      fs.writeFileSync(path.join(site,'safe.js'),`const a='${fakeToken}';const b='${fakeJwt}';`);
      fs.writeFileSync(path.join(site,'private.txt'),'-----BEGIN PRIVATE KEY-----\\nsynthetic marker only');
      const actual=inspectPublicSource(site);
      expect(actual.map(x=>x.rule)).toEqual(expect.arrayContaining(['GitHub token','privileged JWT payload','private key block']));
      expect(JSON.stringify(actual)).not.toContain(fakeToken);
      expect(JSON.stringify(actual)).not.toContain(fakeJwt);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
  });
});
