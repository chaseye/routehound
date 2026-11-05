// Run: node test/engine.test.mjs   (uses sample prices, no network)
import assert from 'node:assert/strict';
import {demoFlights, demoCalendar, demoHotels, parseMulti} from '../public/assets/providers.js';
await import('../public/assets/engine.js');
const E = globalThis.RHEngine;

const place = (c) => ({ORD: {city: 'Chicago', country: 'US', region: 'na'}, ICN: {city: 'Seoul', country: 'KR', region: 'kr'},
  CAN: {city: 'Guangzhou', country: 'CN', region: 'cn'}, HKG: {city: 'Hong Kong', country: 'HK', region: 'cn'}, GMP: {city: 'Seoul', country: 'KR', region: 'kr'},
  SZX: {city: 'Shenzhen', country: 'CN', region: 'cn'}, MDW: {city: 'Chicago', country: 'US', region: 'na'}, MFM: {city: 'Macau', country: 'MO', region: 'cn'}}[c] || {city: c, country: '', region: 'x'});

const trip = {legs: [
  {from: 'ORD', to: 'ICN', date: '2027-01-08', cabin: 'business'},
  {from: 'ICN', to: 'CAN', date: '2027-01-13', cabin: 'economy'},
  {from: 'CAN', to: 'HKG', date: '2027-01-18', cabin: 'economy'},
  {from: 'HKG', to: 'ORD', date: '2027-01-24', cabin: 'business'}],
  adults: 1, budget: 6500, nightly: 150, flex: 2, nearby: true, compareCabins: true};

const region = (q) => ({from: place(q.from).region, to: place(q.to).region});
const run = (job) => job.type === 'flights' ? {offers: demoFlights(job.q.multi ? {...job.q, multi: parseMulti(job.q.multi)} : job.q, region(job.q)), sample: true}
  : job.type === 'calendar' ? {days: demoCalendar(job.q, region(job.q))} : {hotels: demoHotels({...job.q, nights: E.nights(job.q.checkin, job.q.checkout), maxNight: job.q.max})};

const res = {flights: [], calendar: {}, hotels: {}};
const r1 = E.planSearches(trip, place);
for (const j of r1) {
  const d = run(j);
  if (j.type === 'flights') res.flights.push({job: j, data: d});
  else if (j.type === 'calendar') res.calendar[j.leg] = [...(res.calendar[j.leg] || []), ...d.days];
  else res.hotels[j.stop] = d.hotels;
}
const r2 = E.followUpSearches(trip, res);
for (const j of r2) res.flights.push({job: j, data: run(j)});
console.log(`searches: round 1 = ${r1.length}, round 2 = ${r2.length}`);

const out = E.recommend(trip, res, place);
assert.ok(out.picks.length >= 3, 'has picks');
const base = out.picks.find((p) => p.id === 'baseline'), cheap = out.picks.find((p) => p.id === 'cheapest');
assert.ok(cheap.total <= base.total, 'cheapest never costs more than the exact plan');
for (const p of out.picks) {
  for (let i = 1; i < p.picks.length; i++) assert.ok(p.picks[i].date >= p.picks[i - 1].date, `${p.id}: legs stay in order`);
}
assert.ok(out.picks.find((p) => p.id === 'comfort').total <= trip.budget, 'comfort pick fits the budget');
assert.ok(out.options[2].some((o) => o.kind === 'ground'), 'Guangzhou to Hong Kong offers the train');
assert.equal(out.stops.length, 3, 'three stays');
assert.ok(out.strategies.some((s) => s.multicity), 'prices the trip as one multi-city ticket');
assert.ok(out.strategies.some((s) => s.multicity && /train/i.test(s.name)), 'multi-city variant that takes the train for Guangzhou to Hong Kong');
for (const p of out.picks) console.log(`${p.title}: ${E.usd(p.total)} (flights ${E.usd(p.flights)} + stays ${E.usd(p.stay)}), saves ${E.usd(p.saves)}\n   ${p.reasons.join('\n   ') || '(no changes)'}`);
for (const s of out.strategies) console.log(`Strategy ${s.name} [${s.cabin}]: ${E.usd(s.total)} vs separate one-ways ${E.usd(s.separate)} (${s.vsSeparate >= 0 ? 'saves ' + E.usd(s.vsSeparate) : E.usd(-s.vsSeparate) + ' more'})`);
console.log('all engine checks passed');
