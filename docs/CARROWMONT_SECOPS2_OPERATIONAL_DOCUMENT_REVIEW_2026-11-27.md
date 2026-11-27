# SECOPS2 - Operational documentation disclosure and continuity review

**Review date:** 27 November 2026. **Status:** prepared for Publisher; NOT merged until the owner confirms an all-green post-merge source snapshot.

## Verified conditions and limits

- The website repository `Draw004/draw004.github.io` is a **public GitHub repository**. Source files under `docs/` and `ops/` are readable through GitHub, irrespective of website search-engine indexing, Jekyll exclusions, or any future robots.txt settings. This review is **not an access-control mechanism** and cannot make those files private.
- The current snapshot has 218 files under `draw004.github.io/docs/` and one intentionally public `ops/credential-expiry-registry.json`. The reviewed inventory has 219 rows. The registry contains a secret *name* and expiry metadata, not the token value; its layout is used by an existing credential-expiry workflow and QA contract. Do not remove, rename or redact it without a coordinated migration and tested automation replacement.
- The operational setup class includes continuity files, Supabase and OAuth instructions, GitHub automation handover, the schema, and the credential-expiry guard guide. Their public visibility is a disclosure-management concern, not confirmation of breached accounts.
- A current-source high-confidence credential scanner was added in SECOPS1, but no independent scan of **historical Git revisions**, deployed secrets, Supabase tenant separation, authenticated network traffic or actual backend permissions has been performed in this batch. Do not imply clearance or compromise.
- The source continuity files previously identified Ask Intent Alignment Wave 2 as active review. Batch 2 updates their **current** status to complete while retaining the original historical evidence as history. Current exact SHAs always come from the newest owner-confirmed all-green `SNAPSHOT-MANIFEST.txt`, not from status notes.

## Inventory and safety gates

`CARROWMONT_SECOPS2_PUBLIC_DOCUMENT_INVENTORY.json` records each source-relative public document path and its **triage** category. It is a filename-level review list, not proof that every content line is appropriate for public release. The new source contract rejects uncatalogued new `docs/` items and unsafe or missing inventory paths, requiring maintainers to review the index when docs are added, moved, or deleted. There are no new financial calculations, UI changes or new public HTML URLs.

Triage categories: `operational_setup_review`, `historic_spec_implementation_or_acceptance`, `source_methodology_or_research`, and `public_credential_metadata_review`. A category does not itself imply confidentiality. Current public operational documentation must not be described as restricted.

## Do not perform without explicit approval

1. **Do not delete** current docs, status files, SQL schema or the expiry registry solely because they are publicly readable: the source contracts and operational guard reference them.
2. **Do not change** repository visibility, hosting, CNAME/DNS, the Publisher workflow or GitHub secrets in this release.
3. For a future private-repo + external-host migration, first inventory and rewire consumers of `docs/` and `ops/` files; test source contract, country/reference automation, Publisher, deployment, QA and snapshots; then cut over only with owner authorization.
4. If a real privileged secret is later found in current or historical source, revoke/rotate it using official provider access first, then remove/clean exposure with an approved incident plan. Removing a Git file does not erase copies or historical commits.

## Acceptance

- SHA-checked manifest, full source-contract suite, Development Standards Gate and SECOPS2 fixtures run before Publisher.
- Publisher stages and tests changed website/QA repository source; owner reviews PRs and merges only when green.
- Post-merge live QA, Multi-Repo Guard and new owner-confirmed all-green Source Snapshot must precede any change of status to COMPLETE.
- Update the separate A-Z handover with Batch 2 merge details and the new manifest. Until then, mark Batch 2 PENDING.
