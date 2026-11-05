# RouteHound

Sniff out the cheapest way to fly, ride, sail and stay.

RouteHound is a static travel-comparison site. You type a multi-city route once and it lines up:

- **Flights**: Google Flights, Kayak, Momondo, Skyscanner, Expedia, Priceline, Trip.com, Kiwi.com, Travelocity, Hopper, with nearby-date links and round-trip-plus-hop strategies.
- **Trains, buses and ferries**: Rome2rio, 12Go, Omio, Trainline, FlixBus, Bookaway, Ferryhopper and regional operators (Korail, JR, China rail, MTR, ONCF, Buupass and more).
- **Stays**: Google Hotels, Booking.com, Agoda, Expedia, Hotels.com, Kayak, Trip.com, Priceline, Hotwire, Trivago, Airbnb, Vrbo, Hostelworld, HotelTonight, Ratepunk, plus regional sites, with a nightly budget cap where the site supports it.
- **Deals**: alert clubs, loyalty programs and cashback portals, with links to find current promo codes on social platforms.
- **Explore**: official tourism boards, video and post searches on YouTube, TikTok, Instagram, Facebook, X and Pinterest (with a family-friendly option), and 2027 travel trends.
- **Visas and entry**: per-country requirements with official links.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Deploy on GitHub Pages

Settings → Pages → Build and deployment → Deploy from a branch → `main` / root. Pages on a private repository needs a paid GitHub plan; on a free plan, make the repository public or deploy to Netlify, Cloudflare Pages or Vercel instead.

## Editing sources

All sites, airports, tourism boards and entry rules live in `assets/data.js`. Add a site by adding one object with a `name` and a `url` function. Affiliate tracking parameters can be added inside those `url` functions once partner programs approve you.

## Disclosure

RouteHound links to each site's live search; prices come from those sites. Affiliate links may earn a commission and never change the order of results.
