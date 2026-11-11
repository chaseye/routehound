# RouteHound improvements

Newest run first. Ranked by impact, then effort. "Additive" = can be built without the owner's yes.

## 2026-11-11

Inputs read: CLAUDE.md, README.md, DEPLOY.md (it has no "What's next" section), git log, `npm test` (passes on main;
there is no `test:e2e`), `origin/growth/2026-11-09` queue notes, and new competitor research in `replica/feedback.md`
(11 verified quotes). Not present: `replica/feedback.md` (created this run), `replica/fixes.md`,
`marketing/results.md`, `marketing/posted.json`, `marketing/queue/` on main (only on the unmerged growth branch).
I tried the app at phone width (390px) in headless Chrome: no backend (all sample), a mocked SerpApi-only backend, and
a mocked Duffel-only backend.

| # | Idea | Evidence | Impact | Effort | Additive? | Status |
|---|---|---|---|---|---|---|
| 1 | **Label mixed live and sample prices.** When only some keys are set, say exactly which prices are samples: results banner, each pick, fares-by-day, flights table and stay cards. Header badge reads "Partly live prices". | Bug. The results banner decided live vs sample from flights only (`app.js` `renderResults`). DEPLOY.md adds keys one at a time; with only `SERPAPI_KEY` the fares by day are sample but showed under "Live prices", including "Mon … is $X cheaper than your date". With only `DUFFEL_TOKEN`, trip totals included sample hotel stays under "Live prices". This breaks the CLAUDE.md rule "Never show a sample price as a real one" and the growth post's claim that "anything that isn't live is labeled as an example" (`growth/2026-11-09` LinkedIn draft). Theme 1 in feedback.md (8 quotes) | H | M | yes | **Built** |
| 2 | **Honest "checked at" time.** Use the oldest real fetch time of the live answers and show its age ("checked 3:10 PM (about 2 h ago)"). | Bug. The banner printed the browser's current time, but answers come from the edge cache for up to 3 h (flights), 2 h (hotels) or 6 h (calendar) (`cached()` TTLs). The APIs already return `checkedAt`. Quote: "G Flights is using cached information or cached search results that is out of date" ([FlyerTalk](https://www.flyertalk.com/forum/british-airways-executive-club/1990692-google-flights-quotes-accurate.html)) | H | S | yes | **Built** |
| 3 | **Name the source on each section** (flights table, stays, fares by day), and say that fares by day are cached fares that can be a few days old. | CLAUDE.md: "label every source". Aviasales data is cached (`provider: 'Aviasales (cached)'`) but was shown with no label. Quote: "Sometimes atractive prices are not real when you try to buy" ([Kayak, Trustpilot](https://www.trustpilot.com/review/kayak.com?page=5)) | M | S | yes | **Built** |
| 4 | Flag Duffel **test-token** offers ("Duffel Airways") as test or sample prices, or refuse them, when `DUFFEL_TOKEN` starts with `duffel_test_`. | DEPLOY.md: test tokens "return a simulated airline … not real fares"; today the guard is only a note asking the owner to leave the key empty | M | S | yes | Next |
| 5 | "Fares shown before bag and seat fees" line on picks and the flights table. | "Expedia said my fee included seat selection, delta said the opposite on both flights" ([Expedia, Trustpilot](https://www.trustpilot.com/review/www.expedia.com?page=7)); Hopper "$530 … charged $1381" ([Trustpilot](https://www.trustpilot.com/review/hopper.com?page=7)) | M | S | yes | Next |
| 6 | Stale-results nudge: if the results tab stays open more than about an hour, show "These prices are over an hour old" next to the checked time. | Same as #2; builds on `E.ago()` | M | S | yes | Next |
| 7 | One-ticket strategies are priced in the **first leg's** seat class for every leg. With a mixed plan (business / economy / economy / business), "vs separate tickets" can't be priced, so it shows "—" (engine test prints `$0`), and the one-ticket pick compares business-everywhere against the user's mixed plan. | `engine.js` `planSearches` uses `cabinsFor(trip, legs[0])` for `multicity`; `npm test` output "vs separate one-ways $0". Theme 3 in feedback.md | M | M | needs your call (changes which picks appear) | Proposed |
| 8 | Footer copy says "Prices come from live airline and hotel data sources" even when the copy runs on sample prices. | `public/index.html` footer; badge and banner say "Sample prices" | M | S | needs your call (existing copy) | Proposed |
| 9 | Check whether LiteAPI **sandbox** keys (`sand_…`, which DEPLOY.md suggests) return real rates. If they don't, label them like #4. | DEPLOY.md key table; unverified, needs a look at LiteAPI's docs or account | M | S | needs your call (guide and labeling policy) | Proposed |
| 10 | Engine test console prints "saves $-44" and "$0" for an unpriced comparison (the UI is already correct). | `npm test` output | L | S | yes | Next |

### Built this run (branch `improve/2026-11-11`)
- `public/assets/engine.js`: new pure helpers `sourceSummary(res)`, `liveLevel(status)`, `oldestCheck(times)` and `ago(date)`, exported on `RHEngine`. No existing function changed.
- `public/assets/app.js`:
  - Each response's real `checkedAt` is recorded.
  - When sources are mixed, a "Some prices are samples" banner lists the live and sample parts.
  - Each pick notes "Includes sample prices for …".
  - Leg cards tag "Sample prices" on fares-by-day and flights where they apply, and name the source when live.
  - Stay cards say whether stays are samples or name their source.
  - The header badge gains a third state, "Partly live prices".
  - With all sources on or all off, the existing banner text is unchanged except for the true check time.
- `test/sources.test.mjs` (added to `npm test`).

### Test plan (replica-test)
- Automated (`node test/sources.test.mjs`) covers:
  - all sample, all live, SerpApi only (sample calendar) and Duffel only (sample stays)
  - empty or failed searches
  - the badge level for each key mix
  - the oldest-check time and "ago" wording
- Manual, phone width 390px, headless Chrome, with `public/` served statically and `/api/*` mocked:
  - no backend: banner unchanged ("Sample prices — this copy isn't connected…"), no extra notes
  - SerpApi only: badge "Partly live prices", banner names Google Flights and Google Hotels and says fares by day are samples, 4 "Sample prices" tags on fares by day
  - Duffel only: banner lists stays and fares by day as samples, picks say "Includes sample prices for stays", stay cards carry the sample note
  - no horizontal overflow (scrollWidth 390) and no new console errors in any case
- Not covered by automation: real provider responses (no keys in CI). After merge, check the live site once with the keys it has.

### Needs your call
- #7: price one-ticket strategies in each leg's own seat class (or label the comparison) for mixed-class plans.
- #8: footer wording in sample mode.
- #9: whether LiteAPI sandbox rates count as live.
- The new badge state "Partly live prices" (built, because it's a labeling fix). Say if you'd rather keep two states.
