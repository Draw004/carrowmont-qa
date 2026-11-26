# Carrowmont Research freshness + SEO URL integrity (26 Nov 2026)

## Scope and source

Prepared against the owner-confirmed all-green source snapshot `carrowmont-source-snapshot - 2026-11-26T213045.972.zip`. This is a staged, unmerged Publisher update; do not treat it as deployed until all QA/PRs merge and the owner confirms live behavior.

Official reference checks on 26 November 2026: Freddie Mac PMMS 30-year fixed 7.21% as of 25 Nov; U.S. Census/HUD October 2026 new-home median price $391,300 published 25 Nov; U.S. BLS October 2026 CPI-U +0.4% seasonally adjusted over the month published 10 Nov; next CPI release scheduled 10 Dec. These observations are NOT substituted into the original October/September study charts, models or data downloads.

Primary sources: https://www.freddiemac.com/pmms ; https://www.census.gov/construction/nrs/current/index.html ; https://www.bls.gov/news.release/archives/cpi_11102026.htm ; https://www.bls.gov/schedule/news_release/cpi.htm.

## SEO URL audit results (151 sitemap URLs)

- Canonical paths checked: **151**; unique sitemap URLs: **151**; Search index destinations: **151**; identical sets.
- Maximum path length: **62 characters**, maximum absolute URL length **84** characters. No pathname exceeds 70, 90, 100 or the preventative new-route cap of 120 characters.
- Missing HTML source, title, meta description, canonical or unique H1 for indexed routes: **zero**. Duplicate titles or duplicated descriptions within the sitemap: **zero**.
- Potential editorial optimization candidates (not errors): **8** titles over 65 characters and **4** meta descriptions over 180 characters; snippets are dynamic and Google does not mandate those cutoffs. Prioritize these only when Search Console shows a real query/CTR opportunity; avoid arbitrary mass changes.
- No indexed route was renamed. Consequently no redirect, canonical rewrite, sitemap removal or Search/Ask internal-link remapping is required.

## Implemented safeguards

- Two Research pages now clearly separate archived study figures from newer official releases, with dated sources.
- Browser-local date check shows a review-due warning (mortgage: 2 Dec 2026; inflation: 10 Dec 2026), without automatic external fetching or pretending to update the study.
- Open Graph descriptions no longer present superseded readings as a current snapshot; the two articles have updated November editorial modification dates and sitemap `lastmod` values without changing their canonical URLs.
- JSON downloads annotate the new official-source status separately from the immutable historical calculation fields; charts/CSV and locked formulas stay unchanged.
- Playwright test 103 protects display, canonical/structured-data dates, source status, mobile/desktop overflow, and 151-URL sitemap / Search-index parity.
- Source contract preserves the original dataset checks and protects the new review-note and SEO checks.

## Editorial / operations follow-up

This release **does not** automate acquisition, validation or full chart/data regeneration. On each review-due date, someone must use official sources to determine whether a new full study edition is warranted. The browser notice is a reader-protection guard, not an automated source updater. Future SEO work should be driven by verified Search Console clicks, indexed pages, CTR and real-world page performance; these metrics were not available in the snapshot.
