# Carrowmont Automated QA Framework v1.0

This package gives Carrowmont a repeatable QA process for the five live tools plus the key main-site pages. It is designed for a non-developer workflow: run it locally with one file, or put it in a small GitHub repository and use GitHub Actions.

## What it checks automatically

- All five calculator pages load successfully.
- Browser JavaScript and console errors are captured.
- Required labels/buttons/navigation are present.
- "Back to all Carrowmont tools" is present on every tool.
- No page-level horizontal overflow on desktop/mobile.
- Report buttons remain inside their action boxes.
- Financial Independence X-axis age labels stay inside the visible SVG.
- Financial Independence and Inflation charts contain permanent printed values, not hover-only values.
- Goal, Retirement and SIP charts contain visible axis/value text.
- Independent formula checks for SIP, Inflation, Goal cost and Financial Independence.
- Approved regression fixtures for Goal Planner and Retirement Planner.
- Every report downloads as a real PDF.
- Every report uses the exact success text: "Report has been downloaded."
- Goal and Retirement PDFs include the "Continue planning with Carrowmont" page.
- Same-origin internal links are checked for 4xx/5xx responses.
- The main homepage, About, Learn and Methodology pages are smoke-tested.
- Full-page screenshots are produced for human visual review.

## Result format

After each run, open `qa-summary.md`. Each test is reported as:

- `PASS` - automated check passed.
- `FAIL` - automated check failed and needs attention.
- `VISUAL REVIEW REQUIRED` - a screenshot has been generated for the short human review.

The detailed browser report is in `playwright-report/index.html`.

## Easiest way on Windows

1. Install Node.js 22 or later once from the official Node.js website.
2. Keep this folder anywhere on your PC.
3. Double-click `RUN-QA-WINDOWS.bat`.
4. The first run installs the test dependencies. Later runs are faster.
5. Read `qa-summary.md` when the run finishes.

Chrome and Edge should be installed on the PC. The suite tests both desktop browsers and a simulated mobile Chromium viewport.

## Recommended GitHub setup

Create a small repository named something like `carrowmont-qa` and upload this package to its root. The included `.github/workflows/carrowmont-qa.yml` runs every day and can also be started manually from GitHub Actions > Carrowmont Automated QA > Run workflow.

The workflow tests the live site at `https://carrowmont.com`. You do not need to copy the QA files into every calculator repository.

## Run commands

```text
npm install
npm run qa
```

Useful targeted runs:

```text
npm run qa:chrome
npm run qa:edge
npm run qa:mobile
npm run qa:reports
```

To test another deployment or staging URL:

Windows PowerShell:

```text
$env:BASE_URL="https://example.com"; npm run qa
```

Mac/Linux:

```text
BASE_URL=https://example.com npm run qa
```

## Optional source-code contract check

If you have one local folder containing the five tool source folders (`financial-independence`, `goal-planner`, `inflation-calculator`, `retirement-calculator`, `sip-calculator`), run:

Windows PowerShell:

```text
$env:SOURCE_ROOT="C:\path\to\carrowmont_tools_standardization"; npm run source-check
```

Mac/Linux:

```text
SOURCE_ROOT=/path/to/carrowmont_tools_standardization npm run source-check
```

This checks source-level standards such as button wording, download messages, FI chart coordinate height, printed chart values and Goal/Retirement cross-tool report pages.

## When a test fails

1. Open `qa-summary.md` first.
2. Open `playwright-report/index.html` for the failing test.
3. Look in `test-results` for failure screenshots/traces.
4. Fix the relevant tool only.
5. Re-run QA before uploading or deploying again.

## Release rule

For Carrowmont v1.x releases, use this simple gate:

- No automated `FAIL` results.
- Review the generated visual screenshots.
- Complete `VISUAL-REVIEW-CHECKLIST.md`.

This keeps manual QA short while preserving a human check for visual polish.


## v1.1 reliability update

The CI suite now prepares deterministic valid calculator fixtures before chart/report checks, explicitly selects India/INR for print-value checks, uses a visible homepage heading locator, and collapses Playwright retries so a retried test is reported once. This prevents non-India zero-default startup states from being misreported as chart defects.
