# Carrowmont visual review checklist

Automated tests catch calculation regressions, JavaScript errors, chart population, missing axis labels, broken links, overflow and report-download failures. A short human review should still be performed before a release.

## Desktop Chrome and Edge

- No heading, button, legend, chart label or value is clipped.
- Country/currency control is aligned and consistent.
- "Back to all Carrowmont tools" appears consistently.
- Result cards line up and long currency values do not escape their cards.
- Report buttons stay fully inside their result/action boxes.
- Chart legends, axes and permanent values remain readable without hover.
- Homepage investment-tool naming follows the country rule: India uses SIP Calculator; international views use Recurring Investment Calculator.
- Homepage "Want to build 1 Crore?" section begins close enough to the first viewport to be discoverable for India/INR.

## Mobile

- No horizontal scroll.
- Buttons stack cleanly and remain tap-friendly.
- Charts remain legible rather than compressed into unreadable labels.
- Navigation and locale selector do not overlap.

## PDFs - shared Carrowmont report standard

- All pages have consistent margins, typography and visual hierarchy.
- No clipped chart labels, values, table rows or methodology text.
- Every report contains a separate **Report Guide & Methodology** page.
- The guide page contains **How to read this report**, report-specific methodology, report-specific terminology, important assumptions/disclaimer, methodology details and `contact@carrowmont.com`.
- Every report contains a separate **Continue planning with Carrowmont** page.
- The investment-tool card is country-aware: **SIP Calculator** for India and **Recurring Investment Calculator** outside India.
- "Monthly Investment Calculator" is not used as the product identity outside the Learn content that has been intentionally deferred for a later SEO/content pass.
- Charts make sense on paper without hover.
- Financial Independence PDF charts show permanent printed values at the selected age.
- Retirement report key-value rows expand for wrapped labels; text does not touch divider lines or neighboring rows.
- SIP / Recurring Investment methodology rows wrap cleanly for long cadence wording such as Fortnightly / Every 2 Weeks.
- Final guide/tools pages are not awkwardly split or crowded.
- Download confirmation reads exactly: "Report has been downloaded."

A release is ready when automated QA is green and this checklist has no material visual defects.
