# Carrowmont visual review checklist

Automated tests catch calculation regressions, JavaScript errors, chart population, missing axis labels, broken links, overflow and report-download failures. A short human review should still be performed before a release.

## Desktop Chrome and Edge

- No heading, button, legend, chart label or value is clipped.
- Country/currency control is aligned and consistent.
- "Back to all Carrowmont tools" appears consistently.
- Result cards line up and long INR values do not escape their cards.
- Report buttons stay fully inside their result/action boxes.
- Chart legends, axes and permanent values remain readable without hover.
- Homepage "Want to build 1 Crore?" section begins close enough to the first viewport to be discoverable.

## Mobile

- No horizontal scroll.
- Buttons stack cleanly and remain tap-friendly.
- Charts remain legible rather than compressed into unreadable labels.
- Navigation and locale selector do not overlap.

## PDFs

- All pages have consistent margins.
- No clipped chart labels or values.
- Charts make sense on paper without hover.
- Goal and Retirement reports contain the "Continue planning with Carrowmont" tools page.
- Final page/section is not awkwardly split.
- Download confirmation reads exactly: "Report has been downloaded."

A release is ready when automated QA is green and this checklist has no material visual defects.
