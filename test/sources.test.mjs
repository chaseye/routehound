// Run: node test/sources.test.mjs   (no network)
// Rule: never show a sample price as a real one; label every source. Keys are added one at a time
// (DEPLOY.md), so a search can mix live and sample prices. These checks keep the labels honest.
import assert from 'node:assert/strict';
import {demoFlights, demoCalendar, demoHotels} from '../public/assets/providers.js';
await import('../public/assets/engine.js');
const E = globalThis.RHEngine;

const q = {from: 'ORD', to: 'ICN', date: '2027-01-08', cabin: 'economy'};
const sampleFlights = {job: {type: 'flights', leg: 0}, data: {offers: demoFlights(q), sample: true}};
const liveFlights = {job: {type: 'flights', leg: 0}, data: {offers: demoFlights(q).map((o) => ({...o, provider: 'Google Flights'})), sample: false, checkedAt: '2026-11-11T09:00:00Z'}};
const sampleDays = demoCalendar({from: 'ORD', to: 'ICN', month: '2027-01'}, {from: 'a', to: 'b'});
const liveDays = sampleDays.map((d) => ({...d, provider: 'Aviasales (cached)'}));
const sampleStays = demoHotels({city: 'Seoul', checkin: '2027-01-08', checkout: '2027-01-13', nights: 5});
const liveStays = sampleStays.map((h) => ({...h, provider: 'Google Hotels'}));

// 1. Nothing connected: everything is sample, nothing is mixed.
let s = E.sourceSummary({flights: [sampleFlights], calendar: {0: sampleDays}, hotels: {0: sampleStays}});
assert.equal(s.allSample, true, 'all sample');
assert.equal(s.mixed, false, 'all sample is not mixed');
assert.deepEqual(s.sampleParts, ['flights', 'stays', 'fares by day']);

// 2. Everything connected: live, with the real source names.
s = E.sourceSummary({flights: [liveFlights], calendar: {0: liveDays}, hotels: {0: liveStays}});
assert.equal(s.anySample, false, 'all live has no sample');
assert.equal(s.mixed, false, 'all live is not mixed');
assert.deepEqual(s.flights.sources, ['Google Flights']);
assert.deepEqual(s.calendar.sources, ['Aviasales (cached)']);
assert.deepEqual(s.hotels.sources, ['Google Hotels']);

// 3. SerpApi only (DEPLOY.md step 1): live flights and stays, sample fares by day. Must be flagged.
s = E.sourceSummary({flights: [liveFlights], calendar: {0: sampleDays}, hotels: {0: liveStays}});
assert.equal(s.mixed, true, 'SerpApi-only search is mixed');
assert.equal(s.calendar.sample, true, 'fares by day are sample');
assert.equal(s.calendar.live, false, 'sample fares by day are never called live');
assert.deepEqual(s.sampleParts, ['fares by day']);
assert.deepEqual(s.liveParts, ['flights', 'stays']);

// 4. Duffel only: live flights, sample stays. Totals include sample stays, so they must be flagged.
s = E.sourceSummary({flights: [liveFlights], calendar: {}, hotels: {0: sampleStays, 1: sampleStays}});
assert.equal(s.mixed, true, 'Duffel-only search is mixed');
assert.deepEqual(s.sampleParts, ['stays']);
assert.equal(s.calendar.found, false, 'no calendar asked for, none reported');

// 5. Failed or empty searches don't count as live or sample.
s = E.sourceSummary({flights: [{job: {}, data: null}, {job: {}, data: {offers: []}}], calendar: {}, hotels: {0: []}});
assert.equal(s.anyLive || s.anySample, false, 'empty results are neither live nor sample');

// 6. Header badge: all three kinds live = live; some = partial; none = sample.
const st = (d, g, h, l, a) => ({flights: {duffel: d, googleFlights: g}, hotels: {googleHotels: h, liteapi: l}, calendar: {aviasales: a}});
assert.equal(E.liveLevel(st(false, true, true, false, true)), 'live');
assert.equal(E.liveLevel(st(false, true, true, false, false)), 'partial', 'SerpApi without Travelpayouts is partial');
assert.equal(E.liveLevel(st(true, false, false, false, false)), 'partial', 'Duffel only is partial');
assert.equal(E.liveLevel(st(false, false, false, false, false)), 'sample');
assert.equal(E.liveLevel(null), 'sample', 'no backend is sample');

// 7. "Checked at" uses when prices were really fetched (edge cache keeps answers for hours), not page time.
const now = new Date('2026-11-11T12:00:00Z');
const at = E.oldestCheck(['2026-11-11T11:40:00Z', '2026-11-11T09:30:00Z', 'not a date'], now);
assert.equal(at.toISOString(), '2026-11-11T09:30:00.000Z', 'oldest real check time');
assert.equal(E.oldestCheck([], now), now, 'falls back when no live answers');
assert.equal(E.ago(new Date('2026-11-11T11:59:30Z'), now), 'just now');
assert.equal(E.ago(new Date('2026-11-11T11:35:00Z'), now), '25 min ago');
assert.equal(E.ago(at, now), 'about 3 h ago');
assert.equal(E.ago(new Date('2026-11-08T12:00:00Z'), now), '3 days ago');

console.log('all source-label checks passed');
