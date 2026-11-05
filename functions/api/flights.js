/* GET /api/flights?from=ORD&to=ICN&date=2027-01-08&cabin=business[&ret=2027-01-24][&adults=1][&long=1]
 * Live offers from Duffel and Google Flights (SerpApi), merged and sorted by price. Sample data when no keys are set. */
import {duffelFlights, serpFlights, demoFlights, cached, json, has, okCode, okDate, bookLink, parseMulti} from '../../public/assets/providers.js';

export async function onRequestGet(context) {
  const {request, env} = context;
  const u = new URL(request.url);
  const q = {from: (u.searchParams.get('from') || '').toUpperCase(), to: (u.searchParams.get('to') || '').toUpperCase(),
    date: u.searchParams.get('date'), ret: u.searchParams.get('ret') || null, cabin: u.searchParams.get('cabin') || 'economy',
    adults: Math.min(9, Math.max(1, +u.searchParams.get('adults') || 1))};
  const multi = parseMulti(u.searchParams.get('multi'));
  if (multi.length) {
    if (multi.length < 2 || multi.length > 6 || multi.some((m) => !okCode(m.from) || !okCode(m.to) || !okDate(m.date))) return json({error: 'Multi-city needs 2–6 legs like ORD-ICN-2027-01-08.'}, 400);
    Object.assign(q, {multi, from: multi[0].from, to: multi[multi.length - 1].to, date: multi[0].date, ret: null});
  }
  if (!okCode(q.from) || !okCode(q.to) || !okDate(q.date) || (q.ret && !okDate(q.ret))) return json({error: 'Use 3-letter airport codes and YYYY-MM-DD dates.'}, 400);
  if (!['economy', 'premium', 'business', 'first'].includes(q.cabin)) return json({error: 'Unknown cabin.'}, 400);

  return cached(request, context, 60 * 60 * 3, async () => {
    const live = has(env, 'DUFFEL_TOKEN') || has(env, 'SERPAPI_KEY');
    if (!live) {
      const long = u.searchParams.get('long') === '1';
      const offers = demoFlights(q, {from: long ? 'a' : 'x', to: long ? 'b' : 'x'}).map((o) => ({...o, bookUrl: bookLink(o)}));
      return {query: q, offers, insights: null, sources: ['Sample'], sample: true, checkedAt: new Date().toISOString()};
    }
    const jobs = [];
    if (has(env, 'DUFFEL_TOKEN')) jobs.push(duffelFlights(env, q).then((offers) => ({offers})));
    if (has(env, 'SERPAPI_KEY')) jobs.push(serpFlights(env, q));
    const settled = await Promise.allSettled(jobs);
    const offers = [], errors = [];
    let insights = null;
    settled.forEach((s) => {
      if (s.status === 'fulfilled') { offers.push(...s.value.offers); insights = insights || s.value.insights || null; }
      else errors.push(String(s.reason?.message || s.reason));
    });
    // Same flights from two sources: keep the cheaper one.
    const best = new Map();
    for (const o of offers) {
      const k = o.flightNumbers.join('-') || `${o.airline}-${o.depart}-${o.stops}`;
      if (!best.has(k) || best.get(k).price > o.price) best.set(k, o);
    }
    const list = [...best.values()].map((o) => ({...o, bookUrl: o.bookUrl || bookLink(o)})).sort((a, b) => a.price - b.price).slice(0, 25);
    return {query: q, offers: list, insights, sources: [...new Set(list.map((o) => o.provider))], errors, sample: false, checkedAt: new Date().toISOString(),
      error: !list.length && errors.length ? errors.join('; ') : undefined};
  });
}
