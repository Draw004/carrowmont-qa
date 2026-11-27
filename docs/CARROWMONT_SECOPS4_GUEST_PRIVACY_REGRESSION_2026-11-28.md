# SECOPS4 / Batch 4: Guest Financial Input Privacy Regression

**Status: prepared for Publisher, not yet deployed or merged.**

## Intended outcome

Extend the earlier Search privacy assertion into the Ask and retirement-withdrawal guest journeys. Real financial input amounts must not travel in request URLs or bodies, URL parameters, cookies, or persistent browser state without the user's explicit choice. The specifically authorized, short-lived one-time retirement amount handoff is allowed only until the destination page consumes it and asks the user to review the amount.

## Scope and files

- `tests/110-secops4-guest-financial-privacy.spec.js`: two browser checks, run by the standard desktop Chrome, desktop Edge, and mobile Chromium Playwright projects.
- This document: describes the test evidence and important limits.
- No source-contract runner changes, no website, calculator, cloud account, database, endpoint, cookie configuration, analytics configuration, or financial formula change.

## Checks

1. Run a real Ask cash-shortfall guided questionnaire using distinct synthetic monetary values. After the model result renders, assert those values never appeared in recorded network request URLs or request bodies, current URL, document cookies, localStorage, or sessionStorage.
2. Start a retirement drawdown request with `1.5 crore` under an explicitly selected India/INR locale. Assert direct calculator navigation, a visible review panel, unchanged starting balance until approval, no values in request URLs/bodies or URL parameters, consumption of the temporary session handoff, and only then explicit application of 15,000,000 INR.

## Interpretation and limitations

- The standard QA helper suppresses Cloudflare's analytics ingestion during tests to avoid polluting site metrics. Passing the tests therefore does **not** independently verify the real, unstubbed production analytics payload or every possible third-party integration.
- Tests execute with guest access. They do not verify actual Supabase row-level security, authenticated saved-profile isolation, real users, or the state of historical Git revisions.
- A browser run against the Publisher's staged site is not the same as an independent production-browser run. Complete Publisher QA and then live-site QA are required before release closure.
- Browser session/local storage may legitimately contain currency, locale and explicitly approved guest data. These tests target only the chosen private synthetic amounts before explicit saving and the one-use handoff key.
- Sensitive values are not printed in release logs from real users; synthetic values are hardcoded in QA only.

## Next stage

After an owner-confirmed all-green Publisher run and review/merge, collect a new verified source snapshot, mark Batch 4 complete, update the A-Z handover, and retain the independent production/network and two-test-account security audit as open work.
