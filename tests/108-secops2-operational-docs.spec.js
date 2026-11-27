import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {comparePublicDocumentInventory} from '../scripts/secops2-operational-docs-contract.mjs';

function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cm-secops2-'));
  const site=path.join(root,'draw004.github.io');
  fs.mkdirSync(path.join(site,'docs'),{recursive:true});
  fs.writeFileSync(path.join(site,'docs','test.md'),'Public test only');
  const inventory={schema_version:1,repository:'draw004.github.io',privacy_caution:'Files are in the public GitHub repository',documents:[{path:'docs/test.md',triage:'historic_spec_implementation_or_acceptance'}],file_count:1};
  return {root,site,inventory};
}

test.describe('SECOPS2 public operational document inventory',()=>{
  test('[AUTO] existing public documents are completely cataloged',()=>{
    const x=fixture();try{expect(comparePublicDocumentInventory(x.site,x.inventory)).toEqual([]);}finally{fs.rmSync(x.root,{recursive:true,force:true});}
  });
  test('[AUTO] newly added public setup documents need explicit inventory review',()=>{
    const x=fixture();try{
      fs.writeFileSync(path.join(x.site,'docs','NEW_SERVICE_SETUP.md'),'Public only');
      expect(comparePublicDocumentInventory(x.site,x.inventory).join(' ')).toContain('unreviewed public document: docs/NEW_SERVICE_SETUP.md');
    }finally{fs.rmSync(x.root,{recursive:true,force:true});}
  });
  test('[AUTO] missing, duplicated and unsafe inventory paths are rejected',()=>{
    const x=fixture();try{
      x.inventory.documents.push({path:'docs/test.md',triage:'historical_unknown'});
      x.inventory.documents.push({path:'../private/secret.txt',triage:'operational_setup_review'});
      expect(comparePublicDocumentInventory(x.site,x.inventory).join(' ')).toMatch(/duplicate catalog paths/);
      expect(comparePublicDocumentInventory(x.site,x.inventory).join(' ')).toMatch(/invalid catalog path/);
    }finally{fs.rmSync(x.root,{recursive:true,force:true});}
  });
  test('[AUTO] catalog is an exposure-triage ledger, not a private-repository guarantee',()=>{
    const x=fixture();try{
      x.inventory.privacy_caution='private inaccessible';
      expect(comparePublicDocumentInventory(x.site,x.inventory).join(' ')).toContain('public repository disclosure warning absent');
    }finally{fs.rmSync(x.root,{recursive:true,force:true});}
  });
});
