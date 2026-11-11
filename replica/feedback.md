# Competitor feedback: RouteHound

Run: 2026-11-11 (app-improver, monthly pass). First feedback file for this repo.

**Method and sample size:** 11 verbatim quotes from 7 public pages (Trustpilot review pages for Kayak, Skyscanner,
Hopper and Expedia, plus FlyerTalk and the Rick Steves forum for Google Flights). I fetched every page and checked each
quote a second time as an exact substring. Typos are the reviewers'. This is a small, focused sample on one question:
**is the price you see the price you pay?** It is not a statistically representative survey. Trustpilot pages are
paginated by recency, so a quote can move to a later page over time.

Not used: `trustpilot.com/review/www.kayak.com`, `/hopper.com` and `/www.skyscanner.net` (fetch permission timed out),
plus anything I couldn't confirm word for word.

## Theme 1: the price shown isn't the price at checkout (8 of 11 quotes)

| Competitor | Quote | Rating · date | Source |
|---|---|---|---|
| Kayak | "Sometimes atractive prices are not real when you try to buy" | 4★ · Sep 10, 2026 | [Trustpilot kayak.com p5](https://www.trustpilot.com/review/kayak.com?page=5) |
| Kayak | "The website uses third party websites that jack up the prices unfairly." | 1★ · Sep 8, 2026 | [Trustpilot kayak.com p5](https://www.trustpilot.com/review/kayak.com?page=5) |
| Kayak (agent reached via Kayak; review names Kiwi.com) | "…lies the tucket prices and when I book the ticket it changes at the last step" | 1★ · Nov 3, 2026 | [Trustpilot kayak.com p6 (CA)](https://ca.trustpilot.com/review/kayak.com?page=6) |
| Skyscanner | "the prices consistently go up for the exact same dates." | 5★ · Aug 25, 2026 | [Trustpilot skyscanner.com.sg p2](https://ca.trustpilot.com/review/skyscanner.com.sg?page=2) |
| Google Flights | "G Flights is using cached information or cached search results that is out of date" | forum reply, 2019 | [FlyerTalk](https://www.flyertalk.com/forum/british-airways-executive-club/1990692-google-flights-quotes-accurate.html) |
| Google Flights | "It can be hit and miss with some of the more complex routings on Google Flights" | forum reply | [FlyerTalk](https://www.flyertalk.com/forum/british-airways-executive-club/1990692-google-flights-quotes-accurate.html) |
| Hopper | "I was quoted $530 for a return ticket but charged $1381 for two people." | 1★ · Nov 2, 2025 | [Trustpilot hopper.com p7](https://www.trustpilot.com/review/hopper.com?page=7) |
| Expedia | "using Expedia ultimately cost me considerably more than I expected" | 1★ · Sep 24, 2026 | [Trustpilot expedia.com p7](https://www.trustpilot.com/review/www.expedia.com?page=7) |

## Theme 2: fees and what's included (1 quote)

| Competitor | Quote | Rating · date | Source |
|---|---|---|---|
| Expedia | "Expedia said my fee included seat selection, delta said the opposite on both flights" | 3★ · Sep 23, 2026 | [Trustpilot expedia.com p7](https://www.trustpilot.com/review/www.expedia.com?page=7) |

## Theme 3: multi-city vs separate tickets (2 quotes)

| Competitor | Quote | Rating · date | Source |
|---|---|---|---|
| Google Flights | "costs $1,000 more than booking Pgh to Rome and London to Pgh, then adding a separate booking for Pisa to London" | forum post · Aug 24, 2025 | [Rick Steves forum](https://community.ricksteves.com/travel-forum/transportation/multi-city-trips-on-google-flights-be-aware) |
| Kayak | "Expedia offered a cheaper price and better flight times for round trip flights to the same destination and origin." | 1★ · Sep 10, 2026 | [Trustpilot kayak.com p5](https://www.trustpilot.com/review/kayak.com?page=5) |

## What this means for RouteHound

- **Trust in the number is the main complaint.** RouteHound's rule ("never show a sample price as a real one; label
  every source") is a real differentiator, but only if the labels hold up in every key setup and the "checked at" time
  is true. See `replica/improvements.md`, 2026-11-11.
- **Multi-city vs separate tickets** is exactly what RouteHound's ticket strategies compare. Keep that comparison
  like-for-like (see the "Needs your call" item about mixed seat classes).
- **Fees:** a short "before bag and seat fees" note would answer Theme 2 without a new data source.
