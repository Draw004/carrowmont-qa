import {test, expect} from '@playwright/test';
import {checkReviewedSchema,checkBrowserAccountBoundary,checkReadOnlyAuditSql} from '../scripts/secops3-account-isolation-contract.mjs';

const minimal=()=>`create policy "own" on public.carrowmont_profiles for select to authenticated using ((select auth.uid()) = user_id);`;
const owners=['carrowmont_profiles','carrowmont_saved_scenarios'];
const verbs=['select','insert','update','delete'];
function fixture(){
  const ddl=[];
  for(const t of owners){
    ddl.push(`alter table public.${t} enable row level security;`);
    ddl.push(`revoke all on table public.${t} from anon, authenticated;`);
    ddl.push(`grant select, insert, update, delete on table public.${t} to authenticated;`);
    for(const op of verbs){
      const restriction=op==='select'||op==='delete'?'using ((select auth.uid()) = user_id)':op==='insert'?'with check ((select auth.uid()) = user_id)':'using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
      ddl.push(`create policy "${t}-${op}" on public.${t} for ${op} to authenticated ${restriction};`);
    }
  }
  return ddl.join('\n');
}

test.describe('SECOPS3 source-reviewed account isolation',()=>{
  test('[AUTO] owner-bound policy fixture passes review checks',()=>{
    expect(checkReviewedSchema(fixture())).toEqual([]);
  });
  test('[AUTO] missing profile RLS or missing insert ownership is rejected',()=>{
    const a=fixture().replace('alter table public.carrowmont_profiles enable row level security;','');
    expect(checkReviewedSchema(a).join(' ')).toContain('carrowmont_profiles: RLS is not enabled');
    const b=fixture().replace('with check ((select auth.uid()) = user_id)','with check (true)');
    expect(checkReviewedSchema(b).join(' ')).toContain('ownership condition missing');
  });
  test('[AUTO] no broad PUBLIC policy and no missing update check allowed',()=>{
    const a=fixture()+'\ncreate policy "leak" on public.carrowmont_profiles for select to public using (true);';
    expect(checkReviewedSchema(a).join(' ')).toMatch(/publicly accessible policy/);
    const b=fixture().replace('using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)','using ((select auth.uid()) = user_id)');
    expect(checkReviewedSchema(b).join(' ')).toMatch(/WITH CHECK condition missing/);
  });
  test('[AUTO] frontend regression catches missing explicit account owner filter and imported-choice guard',()=>{
    const client=`function loadCloudProfile(){return from('p').select().eq('user_id',user.id)}\n  }\nfunction deleteCloudProfile(){return from('p').delete().eq('user_id',user.id)}\n  }\nfunction listScenarios(){return from('s').select().eq('user_id',user.id)}\n  }\nfunction deleteScenario(){return from('s').delete().eq('user_id',user.id)}\n  }\nfunction saveCloudProfile(){return {user_id:user.id}}\nfunction saveScenario(){return {user_id:user.id}}\ngetUser()`;
    const config=`publishableKey:'sb_publishable_public_only'`;
    const ui=`entry.explicit!==true && 2*60*60*1000`;
    expect(checkBrowserAccountBoundary(client,config,ui)).toEqual([]);
    expect(checkBrowserAccountBoundary(client.replace(".eq('user_id',user.id)",''),config,ui).join(' ')).toContain('explicit current-user query filter');
    expect(checkBrowserAccountBoundary(client,`service_role:'secret_token'`,ui).join(' ')).toContain('privileged key-like setting');
    expect(checkBrowserAccountBoundary(client,config,'').join(' ')).toContain('explicit-choice guard');
  });
  test('[AUTO] live audit SQL must remain read-only and avoid private records',()=>{
    const safe="select * from pg_policies join pg_class on true where has_table_privilege('anon', 'public.x', 'SELECT')";
    expect(checkReadOnlyAuditSql(safe)).toEqual([]);
    expect(checkReadOnlyAuditSql(safe+'; update public.carrowmont_profiles set profile=null;').join(' ')).toContain('write or administrative');
    expect(checkReadOnlyAuditSql(safe+'; select * from public.carrowmont_profiles;').join(' ')).toContain('reads account records');
  });
});
