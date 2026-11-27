-- Carrowmont SECOPS3: READ ONLY database catalog review.
-- For the authorized Supabase owner. Do not share raw account data or credentials.
-- This checks deployed catalog settings only. It DOES NOT test two-account
-- cross-access; run separate synthetic-account end-to-end verification.
-- Do not change role, bypass RLS, or select saved planning records.
with relevant_tables as (
  select c.oid, c.relname as table_name, c.relrowsecurity as rls_enabled,
         has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
         has_table_privilege('anon', c.oid, 'INSERT') as anon_can_insert,
         has_table_privilege('anon', c.oid, 'UPDATE') as anon_can_update,
         has_table_privilege('anon', c.oid, 'DELETE') as anon_can_delete
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('carrowmont_profiles','carrowmont_saved_scenarios')
    and c.relkind in ('r','p')
),
policy_counts as (
  select p.tablename as table_name,
         count(*) filter (where p.cmd='SELECT' and 'authenticated'=any(p.roles)) as select_policies,
         count(*) filter (where p.cmd='INSERT' and 'authenticated'=any(p.roles)) as insert_policies,
         count(*) filter (where p.cmd='UPDATE' and 'authenticated'=any(p.roles)) as update_policies,
         count(*) filter (where p.cmd='DELETE' and 'authenticated'=any(p.roles)) as delete_policies,
         count(*) filter (where 'anon'=any(p.roles) or 'public'=any(p.roles)) as broad_role_policies,
         bool_and((p.qual is null or p.qual like '%auth.uid%') and (p.with_check is null or p.with_check like '%auth.uid%')) as policies_refer_to_auth_uid
  from pg_policies p
  where p.schemaname='public' and p.tablename in ('carrowmont_profiles','carrowmont_saved_scenarios')
  group by p.tablename
)
select t.table_name, t.rls_enabled,
       t.anon_can_select, t.anon_can_insert,t.anon_can_update,t.anon_can_delete,
       coalesce(p.select_policies,0) as select_policies,
       coalesce(p.insert_policies,0) as insert_policies,
       coalesce(p.update_policies,0) as update_policies,
       coalesce(p.delete_policies,0) as delete_policies,
       coalesce(p.broad_role_policies,0) as broad_role_policies,
       coalesce(p.policies_refer_to_auth_uid,false) as policies_refer_to_auth_uid
from relevant_tables t left join policy_counts p using (table_name)
order by table_name;
