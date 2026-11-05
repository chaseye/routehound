# RouteHound

Sniff out the cheapest way to fly, ride, sail and stay.

RouteHound takes a multi-city route, budget and nightly hotel cap, then searches real fares and hotel availability and recommends the smartest way to do the whole trip.

## What it does

- **Smart picks**: whole-trip totals (flights, trains and stays) for *your exact plan*, *cheapest overall*, *best value* (price vs. time and stops) and *most comfort within budget*, each with plain-language reasons ("fly Tue Jan 12 instead of Wed Jan 13", "take the high-speed train instead of flying, saves $91").
- **Dates**: cheapest fare for each day around your dates, then live searches on the most promising alternatives.
- **Nearby airports**: Midway for O'Hare, Gimpo for Incheon, Shenzhen or Macau for Hong Kong, and more.
- **Seat classes**: economy, premium economy, business and first side by side, and the best mix that fits your budget.
- **Ticket strategies**: round trip to one city plus a cheap regional hop, compared with separate one-ways in the same cabin.
- **Ground options**: typical fares and times for 30+ train, bus and ferry corridors (Guangzhou–Hong Kong rail, KTX, Shinkansen, Eurostar, Greek ferries, ONCF, Madaraka Express…).
- **Stays**: available hotels for your exact dates with nightly and total prices, ratings, free cancellation and rooms-left signals, plus each hotel's price on every booking site.
- **Deals, Explore, Visas & entry**: loyalty and cashback programs, destination videos and trends, and entry requirements per country.

## How it works

```
public/                 static site (Cloudflare Pages)
  assets/engine.js      search planning + recommendation engine (runs in the browser)
  assets/providers.js   price-source adapters, shared with the API
  assets/app.js         UI
functions/api/          Cloudflare Pages Functions (keep API keys server-side, cache results at the edge)
  flights.js            Duffel + Google Flights (SerpApi)
  calendar.js           cheapest fare per day (Travelpayouts / Aviasales, cached data)
  hotels.js             Google Hotels (SerpApi) + LiteAPI live room rates
  hotel-prices.js       one hotel's price on every booking site
  status.js             which sources are switched on
```

One search runs about 25–45 price lookups (exact dates, all cabins, stays, round-trip strategies), then a second round on the cheapest nearby dates and airports. Results are cached at Cloudflare's edge (flights 3 h, calendar 6 h, hotels 2 h) so repeat searches cost nothing.

Without API keys the site runs on clearly labeled **sample prices**, so it can be demoed anywhere.

## Price sources (free tiers to start)

| Source | What it gives | Sign up | Variable |
|---|---|---|---|
| Duffel | Live airline offers incl. premium cabins | duffel.com (test token is free) | `DUFFEL_TOKEN` |
| SerpApi | Google Flights + Google Hotels (prices across booking sites) | serpapi.com (250 searches/month free) | `SERPAPI_KEY` |
| Travelpayouts | Cheapest fare per day (cached), affiliate program | travelpayouts.com | `TRAVELPAYOUTS_TOKEN` |
| LiteAPI | Live hotel availability and room rates | liteapi.travel (free sandbox) | `LITEAPI_KEY` |

Each source is optional; RouteHound uses whichever keys are present.

## Deploy on Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick `chaseye/routehound`.
2. Build settings: framework **None**, build command empty, output directory **`public`**.
3. Settings → Variables and Secrets → add the keys above as **Secrets**.
4. Deploy. Every push to `main` redeploys.

## Local development

```sh
cp .dev.vars.example .dev.vars   # add your keys
npm run dev                      # http://localhost:8788
npm test                         # engine tests on sample prices
```

## Disclosure

Prices come from live airline and hotel data sources and can change; the booking site's price is final. Affiliate links may earn a commission and never change the order of results.
