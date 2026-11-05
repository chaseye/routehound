/* GET /api/hotels?city=Seoul&country=KR&checkin=2027-01-09&checkout=2027-01-13&adults=1[&max=150][&sort=price|rating]
 * Available stays with prices for the dates: Google Hotels (prices across booking sites) and LiteAPI (live room rates). */
import {serpHotels, liteHotels, demoHotels, cached, json, has, okDate} from '../../public/assets/providers.js';

export async function onRequestGet(context) {
  const {request, env} = context;
  const u = new URL(request.url);
  const q = {city: (u.searchParams.get('city') || '').slice(0, 60), country: (u.searchParams.get('country') || '').toUpperCase().slice(0, 2),
    checkin: u.searchParams.get('checkin'), checkout: u.searchParams.get('checkout'), adults: Math.min(9, Math.max(1, +u.searchParams.get('adults') || 1)),
    maxNight: +u.searchParams.get('max') || 0, sort: u.searchParams.get('sort') || 'price'};
  if (!q.city || !okDate(q.checkin) || !okDate(q.checkout) || q.checkout <= q.checkin) return json({error: 'Give a city and check-in before check-out (YYYY-MM-DD).'}, 400);
  q.nights = Math.round((Date.parse(q.checkout) - Date.parse(q.checkin)) / 864e5);

  return cached(request, context, 60 * 60 * 2, async () => {
    const live = has(env, 'SERPAPI_KEY') || has(env, 'LITEAPI_KEY');
    if (!live) return {query: q, hotels: demoHotels(q), sources: ['Sample'], sample: true, checkedAt: new Date().toISOString()};
    const jobs = [];
    if (has(env, 'SERPAPI_KEY')) jobs.push(serpHotels(env, q));
    if (has(env, 'LITEAPI_KEY') && q.country) jobs.push(liteHotels(env, q));
    const settled = await Promise.allSettled(jobs);
    const hotels = [], errors = [];
    settled.forEach((s) => s.status === 'fulfilled' ? hotels.push(...s.value) : errors.push(String(s.reason?.message || s.reason)));
    // Merge the same property seen by both sources: keep both prices as sources.
    const byName = new Map();
    for (const h of hotels) {
      const k = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const prev = byName.get(k);
      if (!prev) { byName.set(k, h); continue; }
      const extra = {name: h.provider === 'LiteAPI' ? 'RouteHound rate (LiteAPI)' : h.provider, pricePerNight: h.pricePerNight, link: h.link};
      prev.sources = [...(prev.sources || []), extra];
      if (h.pricePerNight < prev.pricePerNight) { prev.pricePerNight = h.pricePerNight; prev.total = h.total; }
    }
    const list = [...byName.values()].sort((a, b) => q.sort === 'rating' ? (b.rating || 0) - (a.rating || 0) : a.pricePerNight - b.pricePerNight).slice(0, 30);
    return {query: q, hotels: list, sources: [...new Set(hotels.map((h) => h.provider))], errors, sample: false, checkedAt: new Date().toISOString(),
      error: !list.length && errors.length ? errors.join('; ') : undefined};
  });
}
