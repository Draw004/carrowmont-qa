# My Carrowmont — exact attention navigation

Date: 27 November 2026. Baseline: `carrowmont-source-snapshot - 2026-11-27T000032.111.zip` (all green, owner confirmed).

## Problem and boundaries

The Your Financial Plan overview already showed clickable area summaries. The separate saved-plan Progress header gave only counts, so it did not identify the actual saved plans needing review. In addition, the Financial Plan overview hid 'Worth reviewing' whenever any area needed attention, and a grouped area such as Retirement could show its worst plan while leaving other flagged plans undiscoverable. This is a presentation/navigation change only: no calculation, saving, Supabase security, account profile, currency, or score logic changes.

## Implemented behavior

- The Financial Plan top overview displays all areas needing attention *and* areas worth reviewing, simultaneously, with meaningful labels. Raw financial-fact areas jump to their Financial Plan area card. For aggregated plan areas, each individually flagged saved journey is named and the button targets the exact saved-plan Progress card.
- Aggregated areas (e.g. Retirement, with both retirement planning and withdrawal plans) also show a short 'Saved plans to review' button list rather than silently collapsing everything to one issue.
- The Progress section count remains visible and is followed by named 'Jump to a plan...' buttons for all saved-plan statuses requiring attention or review.
- Clicking or using keyboard activation scrolls the *same page* to the exact card, moves keyboard focus, and briefly highlights it. Reduced-motion preference is respected. No financial values are inserted into URLs or transmitted on navigation.
- No saved-plan state or prompt status is changed. Existing tool-opening actions and the 'Not now' logic are not changed.

## Acceptance cases

1. A negative monthly cash-flow area jumps to `mycm-plan-area-cash-flow`.
2. Retirement readiness and retirement withdrawal are separate affected saved plans; each jumps to its distinct Progress card.
3. A stale Financial Independence plan remains discoverable under Worth reviewing, even when another area needs attention.
4. The Progress summary has one accessible named button for each affected saved plan; keyboard and touch activation work.
5. On mobile at widths 390 and 360 px, nothing overflows; focus feedback remains visible and doesn't trigger external navigation.
6. Empty-state and on-track-only accounts are not given invented attention links.
7. Saved profile, stored scenarios, row-level access and plan report payloads stay unchanged.

## Validation and deployment

The Publisher must run `tests/104-mycm-attention-navigation.spec.js` on its staged site plus the full Chrome/Edge/mobile QA and source-contract checks. Unit-level local browser DOM simulation is not equivalent to a live signed-in account test. After merge, confirm with a test account that clicking a top overview retirement-withdrawal issue and a Progress summary link lands on the intended card on Carrowmont.com in a normal desktop browser and a real phone. Do not use a real user's private data in screenshots.

## Security and recovery

Only existing signed-in scenarios are read and locally rendered; the new links are buttons without external `href` or account-write operations. If production behavior deviates, revert the two JS files, My Carrowmont HTML, CSS, and query-string asset versions as a single PR; keep the last owner-confirmed all-green snapshot as rollback baseline. Public-repository operational documentation exposure and live Supabase RLS account-isolation testing remain separate audit items and are not claimed fixed in this UX batch.
