# Deploy RouteHound with live prices

About 30–45 minutes. Everything below is free to start.

## 1. Let Claude push the code to GitHub
Install the Claude GitHub app and give it access to `chaseye/routehound`:
https://github.com/apps/claude/installations/select_target

## 2. Get the price-source keys

| # | Service | Sign up | Where the key is | Variable name |
|---|---|---|---|---|
| 1 | SerpApi (Google Flights + Google Hotels, real prices) | https://serpapi.com/users/sign_up | https://serpapi.com/manage-api-key | `SERPAPI_KEY` |
| 2 | Travelpayouts (cheapest fare per day, affiliate earnings) | https://www.travelpayouts.com/ | Profile → API token | `TRAVELPAYOUTS_TOKEN` |
| 3 | LiteAPI (live hotel rooms and rates) | https://dashboard.liteapi.travel/ | Dashboard → API keys (sandbox key starts with `sand_`) | `LITEAPI_KEY` |
| 4 | Duffel (airline offers, bookable) | https://app.duffel.com/join | Developers → Access tokens | `DUFFEL_TOKEN` |

Notes
- SerpApi alone is enough for real flight and hotel prices. The free plan has 250 searches a month; one full RouteHound search uses up to ~45, but cached results are reused for 2–6 hours.
- Duffel **test** tokens (`duffel_test_…`) return a simulated airline ("Duffel Airways"), not real fares. Real fares need a **live** token, which Duffel enables after account verification; it charges per confirmed order. Leave `DUFFEL_TOKEN` empty until then so test offers don't mix with real ones.
- LiteAPI sandbox keys are for testing; switch to the production key once your account is approved.

## 3. Create the Cloudflare Pages site
1. Sign up: https://dash.cloudflare.com/sign-up
2. Workers & Pages → Create → Pages → **Connect to Git** → authorize GitHub → pick `chaseye/routehound`.
3. Build settings: Framework preset **None**, Build command *(empty)*, Build output directory **`public`**. Save and Deploy.
4. Project → Settings → **Variables and Secrets** → Add, type **Secret**, for Production (and Preview if you want):
   `SERPAPI_KEY`, `TRAVELPAYOUTS_TOKEN`, `LITEAPI_KEY` (and `DUFFEL_TOKEN` once live).
5. Deployments → **Retry deployment** (secrets apply on the next deploy).

Your site is at `https://routehound.pages.dev` (or the name Cloudflare assigns).

## 4. Check it's live
1. Open `https://<your-site>.pages.dev/api/status`. Each source you added should say `true`.
2. Open the site and run a search. The banner should say **Live prices from …**.
3. If a source fails, the results say how many searches were skipped. Cloudflare → your project → Functions → **Real-time logs** shows the error.

## 5. Automatic launch and refresh
- **Deploys:** every push to `main` redeploys automatically; pull requests get preview URLs.
- **Prices:** fetched live on each search and cached at the edge (flights 3 h, fare calendar 6 h, hotels 2 h), so they refresh on their own.
- **Optional custom domain:** Project → Custom domains → Set up a domain (e.g. routehound.com).

## 6. When traffic grows
- Upgrade SerpApi (Starter $25/1,000 searches, Developer $75/5,000).
- Switch Duffel to live and LiteAPI to production.
- Add affiliate IDs (Travelpayouts, Booking.com, Expedia, Agoda) to the book links in `public/assets/data.js` and `public/assets/providers.js`.

## 7. Accounts, email verification and price alerts

1. **Database:** Cloudflare → Storage & Databases → D1 → Create database, name it `routehound`.
   Then your Pages project → Settings → Bindings → Add → D1 database: Variable name `DB`, database `routehound`.
   (Tables are created automatically on first use.)
2. **Email:** sign up at https://resend.com → API Keys → Create. Add it in Cloudflare as Secret `RESEND_API_KEY`.
   - Until you verify your own domain in Resend, emails only go to your own Resend account address (good for testing).
   - To email everyone: buy a domain, verify it in Resend (Domains → Add), then add variable `EMAIL_FROM` = `RouteHound <alerts@yourdomain.com>`.
3. **Daily price check:** make up a long random string. Add it in Cloudflare as Secret `TRACK_SECRET`,
   and in GitHub → repo Settings → Secrets and variables → Actions → New secret `TRACK_SECRET` (same value).
   If your site isn't `https://routehound.pages.dev`, add a GitHub variable `SITE_URL` with its address.
4. **Daily deal on the home page:** add GitHub secret `SERPAPI_KEY` (same key as Cloudflare).
5. Retry the latest deployment so the new settings apply.

Security built in: one-time sign-in links (15 min, single use, stored hashed), HttpOnly/Secure/SameSite cookies,
same-origin checks on every change, rate limits on sign-in requests, a hidden bot trap field, and no account-existence leaks.

## 8. Cost controls (all optional; sensible defaults are built in)

Add these as Cloudflare **variables** to tune spending. Cached answers are always free and never counted.

| Variable | Default | Meaning |
|---|---|---|
| `DAILY_SEARCH_LIMIT` | 200 | Live price checks the whole site may use per day. Above it, results show booking links only. |
| `ANON_DAILY_LOOKUPS` | 25 | Per visitor (by IP) per day — about 2–3 Quick searches. |
| `USER_DAILY_LOOKUPS` | 120 | Per signed-in user per day. |

Quick search (default) uses ~6–10 checks; Deep search up to ~45. Saved-trip tracking shares one check across everyone
watching the same trip and checks trips more than 60 days away every 3 days instead of daily.

**Bot protection on sign-in (free):** Cloudflare dashboard → Turnstile → Add widget for your site.
Add the site key as variable `TURNSTILE_SITE_KEY` and the secret as Secret `TURNSTILE_SECRET`.

## 9. Affiliate IDs
Paste each partner ID into `public/assets/affiliates.js` once approved (or ask Claude to). Every outbound link to that
partner is tagged automatically when clicked. Network links (CJ, Awin, Impact, Travelpayouts) go under `templates`.
