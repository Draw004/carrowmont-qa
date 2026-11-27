# Carrowmont SECOPS3: Saved-account isolation safeguards

**Batch 3 / 27 November 2026 — prepared, Publisher pending.**

This release locks the reviewed schema and browser account-query boundaries into source QA. It provides a read-only live database catalog query. This is **not proof of production RLS**, account isolation, or the absence of leaks.

## Reviewed implementation

- `draw004.github.io/docs/CARROWMONT_FRE_BATCH7_SUPABASE_SCHEMA.sql`: profiles and saved scenarios each have SELECT/INSERT/UPDATE/DELETE policies restricted to `authenticated` with ownership conditions on `user_id`; RLS enabled. Source review does **not** establish that production has the same effective policies.
- `draw004.github.io/assets/account/supabase-config.js`: browser publishable key is deliberately public, never use a service_role or sb_secret_ key in browser.
- `draw004.github.io/assets/account/carrowmont-account.js`: account-specific reads, writes, and deletes use the verified signed-in user. Server RLS remains the essential trust boundary, not client-side query filters.
- `draw004.github.io/assets/account/my-carrowmont-account.js`: explicitly staged plan save with expiry prevents silent plan import.
- New QA contracts and synthetic tests reject removal of owner-only policies, loss of RLS, broad role policies, missing client filters, and accidental live-account-record access in the catalog-review query.

## Owner-only read-only verification of deployed catalog

1. Sign in to the correct Supabase project using its official dashboard with appropriate owner permissions. Do not paste passwords or tokens into ChatGPT.
2. In the SQL editor, review `carrowmont-qa/docs/CARROWMONT_SECOPS3_READ_ONLY_CATALOG_AUDIT.sql` and run it ONLY after verifying it remains read-only. It queries database metadata, never financial profile rows.
3. Expect **exactly two tables**, `rls_enabled=true`, all four `anon_can_* = false`, four distinct owner policy operations with at least one `authenticated` policy each, `broad_role_policies=0`, and `policies_refer_to_auth_uid=true`. The query only summarizes conditions; inspect the full effective policy expressions and additional policy composition if unexpected rows appear.
4. Do not change live security policies as part of this batch. If results deviate, stop and arrange a separately reviewed remediation.

## Still required: independent two-account test

With permission and **two synthetic accounts** created solely for this purpose, verify A cannot read/update/delete B's saved profile or scenarios, and vice versa, including guessed identifiers, sign-out/sign-in, export and delete. Use only synthetic values and review browser network requests for accidental financial-input transmission. **Do not upload real user data** or credentials.

The Supabase SQL editor normally runs with elevated privileges. Its successful catalog query cannot substitute for signed-in end-user RLS tests. Do not claim a penetration test was completed.

## Release scope / non-changes

Only `carrowmont-qa` QA scripts, tests and documents change. No live website assets, financial engines, Supabase tables, permissions, authentication providers or production datasets are modified. This is a preventive assurance milestone, not a certification.

Official references: https://supabase.com/docs/guides/database/postgres/row-level-security and https://www.postgresql.org/docs/current/view-pg-policies.html
