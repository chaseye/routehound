// Finds a trip where one multi-city ticket beats buying the same flights separately,
// and writes it to public/deal.json for the home page example.
// Runs from GitHub Actions on a schedule (see .github/workflows/daily-deal.yml).
// Cost: 1 + number of legs SerpApi searches per run (4 for a 3-leg trip).
import {writeFile, readFile} from 'node:fs/promises';
import {serpFlights, bookLink} from '../public/assets/providers.js';

const env = {SERPAPI_KEY: process.env.SERPAPI_KEY};
if (!env.SERPAPI_KEY) { console.log('No SERPAPI_KEY; keeping the current deal.'); process.exit(0); }

// Popular multi-city loops. Dates are set relative to today (about 9 weeks out, leaving on a Friday).
const CANDIDATES = [
  {title: 'Seoul + Hong Kong from Chicago', route: [['ORD', 'ICN', 0], ['ICN', 'HKG', 5], ['HKG', 'ORD', 16]]},
  {title: 'Tokyo + Bangkok from Los Angeles', route: [['LAX', 'HND', 0], ['HND', 'BKK', 6], ['BKK', 'LAX', 14]]},
  {title: 'London + Rome from New York', route: [['JFK', 'LHR', 0], ['LHR', 'FCO', 5], ['FCO', 'JFK', 12]]},
  {title: 'Paris + Barcelona from Chicago', route: [['ORD', 'CDG', 0], ['CDG', 'BCN', 5], ['BCN', 'ORD', 11]]},
  {title: 'Marrakech + Lisbon from New York', route: [['JFK', 'RAK', 0], ['RAK', 'LIS', 6], ['LIS', 'JFK', 12]]},
  {title: 'Nairobi + Cape Town from Atlanta', route: [['ATL', 'NBO', 0], ['NBO', 'CPT', 6], ['CPT', 'ATL', 14]]},
  {title: 'Taipei + Osaka from San Francisco', route: [['SFO', 'TPE', 0], ['TPE', 'KIX', 5], ['KIX', 'SFO', 12]]},
  {title: 'Singapore + Bali from Los Angeles', route: [['LAX', 'SIN', 0], ['SIN', 'DPS', 5], ['DPS', 'LAX', 13]]},
  {title: 'Athens + Istanbul from Chicago', route: [['ORD', 'ATH', 0], ['ATH', 'IST', 6], ['IST', 'ORD', 12]]},
];

const iso = (d) => d.toISOString().slice(0, 10);
const start = new Date(); start.setUTCDate(start.getUTCDate() + 63);
while (start.getUTCDay() !== 5) start.setUTCDate(start.getUTCDate() + 1); // next Friday ~9 weeks out
const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
const pick = CANDIDATES[dayOfYear % CANDIDATES.length];
const legs = pick.route.map(([from, to, off]) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + off); return {from, to, date: iso(d)}; });

const cabin = 'economy';
const multi = await serpFlights(env, {multi: legs, from: legs[0].from, to: legs.at(-1).to, date: legs[0].date, cabin, adults: 1});
const one = multi.offers.sort((a, b) => a.price - b.price)[0];
const parts = [];
for (const l of legs) {
  const r = await serpFlights(env, {...l, cabin, adults: 1});
  const best = r.offers.sort((a, b) => a.price - b.price)[0];
  parts.push(best ? {from: l.from, to: l.to, date: l.date, price: best.price, airline: best.airline} : {from: l.from, to: l.to, date: l.date, price: null});
}
const separate = parts.every((p) => p.price) ? parts.reduce((t, p) => t + p.price, 0) : null;
if (!one || !separate) { console.log(`No complete prices for ${pick.title}; keeping the current deal.`); process.exit(0); }

const savings = separate - one.price;
const prev = JSON.parse(await readFile('public/deal.json', 'utf8').catch(() => '{}'));
const prevAgeDays = prev.checkedAt ? (Date.now() - Date.parse(prev.checkedAt)) / 864e5 : 99;
// Keep a bigger saving from the last few days; otherwise publish the new one.
if (savings <= 0 || (prev.savings > savings && prevAgeDays < 4)) { console.log(`${pick.title}: saves $${savings}; keeping current deal.`); process.exit(0); }

const deal = {
  title: pick.title, checkedAt: new Date().toISOString(), cabin, adults: 1, legs,
  oneTicket: {price: one.price, airline: one.airline, stops: one.stops, bookUrl: bookLink({...one, multi: legs, cabin})},
  separate: {total: separate, parts}, savings,
};
await writeFile('public/deal.json', JSON.stringify(deal, null, 2) + '\n');
console.log(`New deal: ${pick.title}, one ticket $${one.price} vs $${separate} separately (saves $${savings}).`);
