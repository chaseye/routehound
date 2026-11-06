# RouteHound

Finds the cheapest smart way to do a whole multi-city trip: flights, trains, ferries and hotels, with plain-language
recommendations, affiliate links routed through `/go` with click IDs, and a commission ledger. Live at https://routehound.pages.dev.
Every push to `main` deploys.

## Stack (keep it)
- Cloudflare **Pages**: static site in `public/`, API in `functions/` (Pages Functions), shared server code in `lib/`.
- `public/assets/engine.js` (search planning and recommendations) runs in the browser; `providers.js` is shared with the API.
- D1 (SQLite) binding `DB` for accounts, trips, click tracking and the ledger. Email: Resend.
- Price sources: SerpApi, Travelpayouts, LiteAPI, Duffel. Without keys the site shows clearly labeled sample prices.
- Settings and secrets are listed in `DEPLOY.md` and `.dev.vars.example`.

## Commands
- `npm test`: engine and ledger tests. `npm run dev`: local Pages with Wrangler.
- `scripts/daily-deal.mjs` runs from GitHub Actions (`.github/workflows`).

## Rules that matter here
- Never show a sample price as a real one; label every source.
- Affiliate links go through `/go`; keep disclosures visible.
- Respect each price source's terms and rate limits; cache at the edge.

## Replica skills (`.claude/skills/replica-*`)
RouteHound is an original app, not a clone. When using these skills:
- Use the stack above. Don't switch to Next.js, Vercel, Supabase or Stripe unless asked.
- `replica-architect`, `replica-backend`: review and extend what's here, not a new plan from scratch.
- `replica-design`: tokens live in the CSS in `public/`. To use `contrast.py`, write them to `replica/design/tokens.json` first.
- `replica-test`: plans go in `replica/`; add automated cases to `test/` in the existing style, not Playwright unless asked.
- `replica-entrepreneur`: research competitors' public reviews (Google Flights, Kayak, Skyscanner, Hopper, Expedia). Every quote real and linked.
- `replica-launch`: landing page, pricing and store listing.
- `replica-deploy`: skip the parity (`parity.py`) and rebrand sweep (`sweep.py`) gates; they are for clones. Use `npm test` instead. Hosting is Cloudflare Pages, not Vercel.
- Write working files to `replica/` at the repo root. It is not deployed (only `public/` is).

## Enhance, never replace
Improvements build on what's here. Don't remove, rename or rewrite existing features, copy or flows unless the owner
asks; propose those under "Needs your call" in `replica/improvements.md` instead. New work goes on a branch with a PR;
never merge your own PR.

## Growth kit (`MARKETING.md`)
- Weekly: the `growth-week` skill with the `promoter` and `ad-maker` agents builds `marketing/queue/<week>/` and opens a
  `growth/<monday>` PR. Merging it is the owner's approval; `.github/workflows/post-social.yml` then posts Facebook and Instagram.
- Monthly: the `app-improver` agent proposes and builds additive improvements on `improve/<date>`.
- Ads claim only `marketing/brand.json` facts and real features; `npm run growth:lint -- <campaign>` must pass.
- No paid ads, no automated posting to Reddit, LinkedIn, TikTok or groups (drafts only), no fake reviews or numbers.
