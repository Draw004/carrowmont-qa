# SECOPS1 - Public source hygiene and preventive credential checks

## Purpose

Carrowmont currently uses a public GitHub website repository and GitHub Pages. Some historical implementation documents and non-secret operational metadata are public. This batch adds automated controls against accidentally committing high-confidence private credentials; **it does not make any existing file private**.

## Changes and safeguards

- `.gitignore` in `draw004.github.io` discourages staging local `.env` files, private key containers, SSH keys and local databases. `.env.example` and `.env.sample` can remain public.
- A source-contract check scans the current public website working tree and fails on suspicious filename types and selected high-confidence token signatures. It never includes token values in its output.
- Dedicated Playwright unit tests use isolated synthetic examples and confirm the guard does not mistake a public Supabase publishable key or non-secret expiry metadata for a confidential token.
- The guard is invoked during the Publisher's existing source-contract stage, before review PR creation.

## Critical limitations

1. `.gitignore` does not remove or protect already tracked material or Git history.
2. Existing `docs/` and `ops/credential-expiry-registry.json` remain public and accessible on GitHub; do not call this change a security remediation of those records.
3. A regex scan is not a security audit, penetration test, Git-history scan, or proof against credential leaks.
4. Only owner-approved, authorized testing may assess Supabase Row Level Security and account isolation.
5. Moving internal operational documents to a private repository requires validating Publisher, scheduled automation, multi-repo guard and snapshot references before deletion. Do not delete or relocate them blindly.
6. Public/client-side keys that are designed for browser use (e.g. Supabase publishable) are allowed; actual service-role secrets must never be public.
7. Search-engine robots directives are NOT authentication or a confidentiality mechanism; don't use them as a replacement for private access.

## Release and acceptance

Scope: `draw004.github.io/.gitignore`, `carrowmont-qa/scripts/source-contract.mjs`, `carrowmont-qa/scripts/public-source-hygiene-contract.mjs`, `carrowmont-qa/tests/107-public-source-hygiene.spec.js`, and this document. No financial formulas, HTML, routing, CSS, SEO URLs, account permissions or live server configuration change.

Run source-contract and targeted SECOPS1 Playwright tests locally, plus full Publisher QA. After owner merge, use a new all-green Source Snapshot and update the account-transfer handover to mark Batch 1 as complete.
