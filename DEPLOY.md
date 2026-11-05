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
- Add affiliate IDs as they are approved (section 9).

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

## 9. Affiliate links, click tracking and earnings

Every outbound link goes through `https://<your-site>/go`, the same way Kayak and Skyscanner do it. The redirect
logs the click with its own ID (like `rhA1b2…`), adds your affiliate ID and that click ID to the partner link, then
sends the traveler straight to the partner, where the partner's referral cookie is set. Nothing to do per link.

**1. Add your affiliate IDs (no code change).** Cloudflare → your Pages project → Settings → Variables and Secrets →
Add variable `AFFILIATE_IDS`, one line of JSON, keys from `lib/partners.js`:

```
{"booking":{"aid":"1234567"},"agoda":{"cid":"1234567"},"getyourguide":{"partner_id":"ABC123"},
 "viator":{"pid":"P00012345","mcid":"42383"},"discovercars":{"a_aid":"yourname"},"12go":{"z":"1234567"},
 "kayak":{"template":"https://www.anrdoezrs.net/links/YOUR_PID/type/dlg/sid/{click}/{url}"},
 "tripcom":{"template":"https://tp.media/r?marker=YOUR_MARKER&p=PROGRAM&sub_id={click}&u={url}"}}
```

For network partners (CJ, Awin, Impact, Travelpayouts, Rakuten) copy the deep-link format from the network's link builder,
then put `{url}` where the destination goes and `{click}` in the sub-ID slot:

| Network | Sub-ID field that carries our click ID | Report column to import |
|---|---|---|
| Booking.com (direct) | `label` | Label |
| Agoda (direct) | `tag` | Tag |
| GetYourGuide | `cmp` | Campaign |
| Viator | `campaign` | Campaign |
| Discover Cars | `data1` | Data1 |
| 12Go | `sub_id` | Sub ID |
| CJ (Kayak, Priceline, Hotwire) | `sid` | SID |
| Awin (Trainline…) | `clickref` | Click Ref |
| Impact (Skyscanner…) | `subId1` | SubId1 |
| Travelpayouts (Trip.com, Kiwi, Omio…) | `sub_id` | Sub ID |
| Rakuten | `u1` | Member ID / U1 |

**2. Admin page.** Add variable `ADMIN_EMAILS` = your email (comma-separate several). Sign in on the site, then open
`/admin.html` (also linked from your account page). It shows clicks, commissions by status, earnings per click,
costs and net, and a "Worth chasing" list.

**3. Get commissions in (pick one or both).**
- *Weekly import (works with every program):* in each network, export Transactions/Commissions as CSV for the last 60–90 days and
  import it on the admin page. Re-importing updates statuses (pending → approved → paid, or reversed).
- *Automatic postback (where offered):* add Secret `POSTBACK_KEY` (a long random string). In the network's postback/webhook settings use
  `https://<your-site>/api/conversions/postback?key=POSTBACK_KEY&network=awin&click={clickref}&ref={transaction_id}&status={status}&sale={sale_amount}&commission={commission}`
  replacing the braces with that network's own macro names.

**4. Costs.** On the admin page add fixed monthly costs (SerpApi plan, domain, Resend…). Live price checks and emails are counted
automatically; set `COST_PER_LOOKUP` (default 0.025 = SerpApi Starter) and `COST_PER_EMAIL` (default 0) to match your plans.

**5. Disputes.** Travelers who come back from a partner site get an optional "Did you book?" prompt. Bookings they report with no
commission after 45 days are flagged; "Download dispute file" gives click ID, time and landing page for a missing-commission claim
(Awin, CJ, Impact and Booking.com all accept these). Keep the clicks export for at least the network's claim window (usually 90 days).
