/* RouteHound price providers.
 * Every adapter returns normalized objects so the engine never needs to know where a price came from.
 *
 * Flight offer:  {provider, price, currency, airline, airlines, flightNumbers, depart, arrive, durationMin, stops,
 *                 cabin, from, to, date, ret, bookUrl, segments:[{from,to,depart,arrive,carrier,number}]}
 * Calendar day:  {date, price, currency, provider, transfers, airline}
 * Hotel:         {id, name, stars, rating, reviews, pricePerNight, total, currency, image, provider, link,
 *                 propertyToken, available, roomsLeft, freeCancel, sources:[{name, pricePerNight, total, link}]}
 *
 * Keys (Cloudflare env vars / secrets): DUFFEL_TOKEN, SERPAPI_KEY, TRAVELPAYOUTS_TOKEN, LITEAPI_KEY.
 * With no keys, `demo*` functions return clearly labeled sample prices so the site still works.
 */

export const CABIN = {
  duffel: {economy: 'economy', premium: 'premium_economy', business: 'business', first: 'first'},
  serp: {economy: 1, premium: 2, business: 3, first: 4},
};

const gf = (from, to, date, cabin, ret) => {
  const cab = {business: ' business class', first: ' first class', premium: '', economy: ' economy'}[cabin] || '';
  const q = ret ? `Flights to ${to} from ${from} on ${date} through ${ret}${cab}` : `One way flights to ${to} from ${from} on ${date}${cab}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
};
const kayak = (from, to, date, cabin, ret) =>
  `https://www.kayak.com/flights/${from}-${to}/${date}${ret ? '/' + ret : ''}${{business: '/business', premium: '/premium', first: '/first'}[cabin] || ''}?sort=price_a`;
const kayakMulti = (multi, cabin) =>
  `https://www.kayak.com/flights/${multi.map((m) => `${m.from}-${m.to}/${m.date}`).join('/')}${{business: '/business', premium: '/premium', first: '/first'}[cabin] || ''}?sort=price_a`;
export const bookLink = (o) => o.multi ? kayakMulti(o.multi, o.cabin) : (o.cabin === 'premium' ? kayak : gf)(o.from, o.to, o.date, o.cabin, o.ret);
/* q.multi = [{from, to, date}, ...] searches the whole trip as one multi-city ticket. */
export const parseMulti = (s) => (s || '').split(',').filter(Boolean).map((x) => { const [from, to, ...d] = x.split('-'); return {from: (from || '').toUpperCase(), to: (to || '').toUpperCase(), date: d.join('-')}; });

const isoDur = (s) => { // PT14H15M -> minutes
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(s || '') || [];
  return (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
};

/* ---------------- Duffel: live airline offers ---------------- */
export async function duffelFlights(env, q) {
  const slices = q.multi ? q.multi.map((m) => ({origin: m.from, destination: m.to, departure_date: m.date})) : [{origin: q.from, destination: q.to, departure_date: q.date}];
  if (q.ret && !q.multi) slices.push({origin: q.to, destination: q.from, departure_date: q.ret});
  const res = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=15000', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${env.DUFFEL_TOKEN}`, 'Duffel-Version': 'v2', 'Content-Type': 'application/json', 'Accept': 'application/json'},
    body: JSON.stringify({data: {slices, passengers: Array.from({length: q.adults || 1}, () => ({type: 'adult'})), cabin_class: CABIN.duffel[q.cabin] || 'economy', max_connections: 2}}),
  });
  if (!res.ok) throw new Error(`Duffel ${res.status}`);
  const body = await res.json();
  return (body.data?.offers || []).map((o) => {
    const segs = o.slices.flatMap((s) => s.segments);
    const first = o.slices[0];
    return {
      provider: 'Duffel', price: Math.round(+o.total_amount), currency: o.total_currency,
      airline: o.owner?.name, airlines: [...new Set(segs.map((s) => s.marketing_carrier?.name).filter(Boolean))],
      flightNumbers: segs.map((s) => `${s.marketing_carrier?.iata_code || ''}${s.marketing_carrier_flight_number || ''}`),
      depart: first.segments[0].departing_at, arrive: first.segments[first.segments.length - 1].arriving_at,
      durationMin: o.slices.reduce((t, s) => t + isoDur(s.duration), 0), stops: Math.max(...o.slices.map((s) => s.segments.length - 1)),
      cabin: q.cabin, from: q.from, to: q.to, date: q.date, ret: q.ret || null, multi: q.multi || null,
      segments: segs.map((s) => ({from: s.origin.iata_code, to: s.destination.iata_code, depart: s.departing_at, arrive: s.arriving_at, carrier: s.marketing_carrier?.name, number: s.marketing_carrier_flight_number})),
      bookUrl: null,
    };
  });
}

/* ---------------- SerpApi: Google Flights results + price insights ---------------- */
export async function serpFlights(env, q) {
  const p = new URLSearchParams({engine: 'google_flights', travel_class: String(CABIN.serp[q.cabin] || 1), adults: String(q.adults || 1), currency: 'USD', hl: 'en', api_key: env.SERPAPI_KEY});
  if (q.multi) {
    // Google shows the whole multi-city ticket price on the first-leg choices.
    p.set('type', '3');
    p.set('multi_city_json', JSON.stringify(q.multi.map((m) => ({departure_id: m.from, arrival_id: m.to, date: m.date}))));
  } else {
    p.set('type', q.ret ? '1' : '2'); p.set('departure_id', q.from); p.set('arrival_id', q.to); p.set('outbound_date', q.date);
    if (q.ret) p.set('return_date', q.ret);
  }
  const res = await fetch('https://serpapi.com/search.json?' + p);
  if (!res.ok) throw new Error(`SerpApi ${res.status}`);
  const b = await res.json();
  const list = [...(b.best_flights || []), ...(b.other_flights || [])];
  const offers = list.filter((f) => f.price).map((f) => ({
    provider: 'Google Flights', price: f.price, currency: 'USD',
    airline: f.flights?.[0]?.airline, airlines: [...new Set((f.flights || []).map((s) => s.airline))],
    flightNumbers: (f.flights || []).map((s) => s.flight_number), depart: f.flights?.[0]?.departure_airport?.time,
    arrive: f.flights?.[f.flights.length - 1]?.arrival_airport?.time, durationMin: f.total_duration, stops: (f.flights || []).length - 1,
    cabin: q.cabin, from: q.from, to: q.to, date: q.date, ret: q.ret || null, multi: q.multi || null,
    segments: (f.flights || []).map((s) => ({from: s.departure_airport?.id, to: s.arrival_airport?.id, depart: s.departure_airport?.time, arrive: s.arrival_airport?.time, carrier: s.airline, number: s.flight_number})),
    bookUrl: null,
  }));
  const pi = b.price_insights || null;
  return {offers, insights: pi && {lowest: pi.lowest_price, level: pi.price_level, typical: pi.typical_price_range}};
}

/* ---------------- Travelpayouts: cached cheapest prices per day (calendar) ---------------- */
export async function tpCalendar(env, q) {
  const p = new URLSearchParams({origin: q.from, destination: q.to, departure_at: q.month, group_by: 'departure_at', currency: 'usd', token: env.TRAVELPAYOUTS_TOKEN});
  const res = await fetch('https://api.travelpayouts.com/aviasales/v3/grouped_prices?' + p);
  if (!res.ok) throw new Error(`Travelpayouts ${res.status}`);
  const b = await res.json();
  return Object.entries(b.data || {}).map(([date, v]) => ({date: date.slice(0, 10), price: v.price, currency: 'USD', provider: 'Aviasales (cached)', transfers: v.transfers, airline: v.airline}));
}

/* ---------------- SerpApi: Google Hotels (prices across booking sites) ---------------- */
export async function serpHotels(env, q) {
  const p = new URLSearchParams({engine: 'google_hotels', q: `${q.city} hotels`, check_in_date: q.checkin, check_out_date: q.checkout,
    adults: String(q.adults || 1), currency: 'USD', hl: 'en', gl: 'us', sort_by: q.sort === 'rating' ? '8' : '3', api_key: env.SERPAPI_KEY});
  if (q.maxNight) p.set('max_price', String(q.maxNight));
  const res = await fetch('https://serpapi.com/search.json?' + p);
  if (!res.ok) throw new Error(`SerpApi hotels ${res.status}`);
  const b = await res.json();
  const nights = q.nights || 1;
  return (b.properties || []).filter((h) => h.rate_per_night?.extracted_lowest).map((h) => ({
    id: h.property_token, propertyToken: h.property_token, name: h.name, stars: h.extracted_hotel_class || null,
    rating: h.overall_rating || null, reviews: h.reviews || null, pricePerNight: h.rate_per_night.extracted_lowest,
    total: h.total_rate?.extracted_lowest || h.rate_per_night.extracted_lowest * nights, currency: 'USD',
    image: h.images?.[0]?.thumbnail || null, provider: 'Google Hotels', link: h.link || null, available: true,
    freeCancel: /free cancellation/i.test(JSON.stringify(h.amenities || [])) || null, roomsLeft: null, type: h.type || 'hotel',
    sources: (h.prices || []).map((s) => ({name: s.source, pricePerNight: s.rate_per_night?.extracted_lowest, link: s.link || null})),
  }));
}

/* Per-hotel prices on every booking site for the dates. */
export async function serpHotelPrices(env, q) {
  const p = new URLSearchParams({engine: 'google_hotels', q: q.name || 'hotel', property_token: q.token, check_in_date: q.checkin, check_out_date: q.checkout,
    adults: String(q.adults || 1), currency: 'USD', hl: 'en', gl: 'us', api_key: env.SERPAPI_KEY});
  const res = await fetch('https://serpapi.com/search.json?' + p);
  if (!res.ok) throw new Error(`SerpApi hotel ${res.status}`);
  const b = await res.json();
  const all = [...(b.featured_prices || []), ...(b.prices || [])];
  const seen = new Set();
  return all.filter((s) => s.source && !seen.has(s.source) && seen.add(s.source)).map((s) => ({
    name: s.source, pricePerNight: s.rate_per_night?.extracted_lowest ?? null, total: s.total_rate?.extracted_lowest ?? null,
    link: s.link || null, freeCancel: !!s.free_cancellation, official: !!s.official,
    rooms: (s.rooms || []).slice(0, 4).map((r) => ({name: r.name, pricePerNight: r.rate_per_night?.extracted_lowest ?? null, link: r.link || null})),
  })).sort((a, b) => (a.pricePerNight ?? 1e9) - (b.pricePerNight ?? 1e9));
}

/* ---------------- LiteAPI: live room availability and rates ---------------- */
export async function liteHotels(env, q) {
  const res = await fetch('https://api.liteapi.travel/v3.0/hotels/rates', {
    method: 'POST',
    headers: {'X-API-Key': env.LITEAPI_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json'},
    body: JSON.stringify({cityName: q.city, countryCode: q.country, checkin: q.checkin, checkout: q.checkout, currency: 'USD',
      guestNationality: q.nationality || 'US', occupancies: [{adults: q.adults || 1}], limit: 40, maxRatesPerHotel: 1, includeHotelData: true}),
  });
  if (!res.ok) throw new Error(`LiteAPI ${res.status}`);
  const b = await res.json();
  const hotels = new Map((b.hotels || []).map((h) => [h.id, h]));
  const nights = q.nights || 1;
  return (b.data || []).map((r) => {
    const rate = r.roomTypes?.[0]?.rates?.[0];
    const total = rate?.retailRate?.total?.[0]?.amount ?? r.roomTypes?.[0]?.offerRetailRate?.amount;
    const h = hotels.get(r.hotelId) || {};
    if (!total) return null;
    return {
      id: r.hotelId, name: h.name || r.hotelId, stars: h.stars || h.starRating || null, rating: h.rating || null, reviews: h.reviewCount || null,
      pricePerNight: Math.round(total / nights), total: Math.round(total), currency: 'USD', image: h.main_photo || h.thumbnail || null,
      provider: 'LiteAPI', link: null, available: true, roomsLeft: null, type: 'hotel',
      freeCancel: rate?.cancellationPolicies?.refundableTag === 'RFN', room: rate?.name || null, sources: [],
    };
  }).filter(Boolean).filter((h) => !q.maxNight || h.pricePerNight <= q.maxNight);
}

/* ---------------- Sample data (no keys) ---------------- */
const hash = (s) => { // FNV-1a plus a final avalanche so similar inputs give very different values
  let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967295; };
const CABIN_MULT = {economy: 1, premium: 2.2, business: 4.6, first: 7.5};
const DOW = [1.06, 0.98, 0.93, 0.95, 1.04, 1.08, 1.02]; // Sun..Sat: midweek tends to be cheaper
function baseFare(from, to, region) {
  const long = region.from !== region.to;
  return long ? 620 : 120;
}
export function demoFlights(q, region = {from: 'x', to: 'y'}) {
  if (q.multi) { // one ticket is usually much cheaper than the same flights bought separately
    const parts = q.multi.map((m) => demoFlights({...q, multi: null, from: m.from, to: m.to, date: m.date}, {from: 'a', to: m === q.multi[0] || m === q.multi[q.multi.length - 1] ? 'b' : 'a'})[0].price);
    const sum = parts.reduce((a, b) => a + b, 0);
    return Array.from({length: 5}, (_, i) => {
      const r = hash(`${q.multi.map((m) => m.from + m.to + m.date).join()}${q.cabin}${i}`);
      return {provider: 'Sample', price: Math.round(sum * (0.55 + r * 0.25)), currency: 'USD', airline: ['Korean Air', 'Cathay Pacific', 'Asiana', 'United', 'Delta'][i],
        airlines: [], flightNumbers: [], depart: q.multi[0].date, arrive: null, durationMin: 1900 + Math.round(r * 900), stops: 1 + Math.floor(r * 2),
        cabin: q.cabin, from: q.multi[0].from, to: q.multi[q.multi.length - 1].to, date: q.multi[0].date, ret: null, multi: q.multi, segments: [], bookUrl: null};
    }).sort((a, b) => a.price - b.price);
  }
  const dow = new Date(q.date + 'T00:00:00Z').getUTCDay();
  const base = baseFare(q.from, q.to, region) * CABIN_MULT[q.cabin || 'economy'] * DOW[dow] * (q.ret ? 1.85 : 1);
  const airlines = ['Korean Air', 'Cathay Pacific', 'United', 'ANA', 'EVA Air', 'Delta', 'Air Canada', 'Asiana', 'Japan Airlines', 'Philippine Airlines'];
  return Array.from({length: 6}, (_, i) => {
    const r = hash(`${q.from}${q.to}${q.date}${q.ret || ''}${q.cabin}${i}`);
    const stops = i === 0 ? 1 : i === 1 ? 0 : Math.floor(r * 3);
    const dur = (region.from !== region.to ? 840 : 150) + stops * (120 + Math.round(r * 240));
    return {provider: 'Sample', price: Math.round(base * (0.88 + r * 0.5) * (stops === 0 ? 1.18 : 1)), currency: 'USD',
      airline: airlines[Math.floor(r * airlines.length)], airlines: [], flightNumbers: [], depart: `${q.date} ${String(6 + Math.floor(r * 16)).padStart(2, '0')}:00`,
      arrive: null, durationMin: dur, stops, cabin: q.cabin, from: q.from, to: q.to, date: q.date, ret: q.ret || null, segments: [], bookUrl: null};
  }).sort((a, b) => a.price - b.price);
}
export function demoCalendar(q, region) {
  const [y, m] = q.month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({length: days}, (_, i) => {
    const date = `${q.month}-${String(i + 1).padStart(2, '0')}`;
    return {date, price: demoFlights({...q, date, cabin: 'economy'}, region)[0].price, currency: 'USD', provider: 'Sample', transfers: 1};
  });
}
export function demoHotels(q) {
  const kinds = ['Hotel', 'Inn', 'Suites', 'Residence', 'Hostel', 'Boutique Hotel', 'Apartments', 'Guesthouse'];
  const names = ['Harbor', 'Central', 'Garden', 'Riverside', 'Station', 'Old Town', 'Skyline', 'Lantern', 'Maple', 'Cedar', 'Pearl', 'Summit'];
  const sites = ['Booking.com', 'Agoda', 'Expedia', 'Hotels.com', 'Trip.com', 'Priceline'];
  const nights = q.nights || 1;
  return Array.from({length: 12}, (_, i) => {
    const r = hash(`${q.city}${q.checkin}${i}`);
    const stars = 2 + Math.floor(r * 4);
    const ppn = Math.round((35 + stars * 38) * (0.75 + r * 0.6));
    const sources = sites.map((s, j) => ({name: s, pricePerNight: Math.round(ppn * (0.94 + hash(`${s}${i}${q.city}`) * 0.16)), link: null}))
      .sort((a, b) => a.pricePerNight - b.pricePerNight);
    return {id: `demo-${i}`, name: `${q.city} ${names[i % names.length]} ${kinds[Math.floor(r * kinds.length)]}`, stars, rating: Math.round((3.4 + r * 1.5) * 10) / 10,
      reviews: 80 + Math.floor(r * 2400), pricePerNight: sources[0].pricePerNight, total: sources[0].pricePerNight * nights, currency: 'USD', image: null,
      provider: 'Sample', link: null, available: r > 0.08, roomsLeft: r < 0.3 ? 1 + Math.floor(r * 6) : null, freeCancel: r > 0.45, type: 'hotel', sources};
  }).filter((h) => !q.maxNight || h.pricePerNight <= q.maxNight).sort((a, b) => a.pricePerNight - b.pricePerNight);
}

/* ---------------- Shared helpers for the API routes ---------------- */
export function json(data, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store', 'Access-Control-Allow-Origin': '*'}});
}
/* Cache successful JSON answers at Cloudflare's edge so repeated searches cost nothing. */
export async function cached(request, ctx, ttl, make, env = {}) {
  const cache = globalThis.caches?.default;
  // The cache key includes which sources are on, so adding a key never serves results saved before it.
  const u = new URL(request.url);
  u.searchParams.delete('t');
  u.searchParams.set('_src', ['DUFFEL_TOKEN', 'SERPAPI_KEY', 'TRAVELPAYOUTS_TOKEN', 'LITEAPI_KEY'].map((k) => (env[k] ? 1 : 0)).join(''));
  const key = new Request(u.toString(), {method: 'GET'});
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const data = await make();
  const res = json(data, 200, data.sample ? 0 : ttl);
  if (cache && !data.error && !data.sample) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
export const has = (env, k) => !!(env && env[k]);
/* Accept key names in any case or spacing (SerpAPI_Key, serpapi-key, SERPAPI_KEY ...). */
const CANON = ['DUFFEL_TOKEN', 'SERPAPI_KEY', 'TRAVELPAYOUTS_TOKEN', 'LITEAPI_KEY'];
const squash = (k) => k.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function normEnv(env = {}) {
  const out = {...env};
  for (const k of Object.keys(env)) {
    const c = CANON.find((n) => squash(n) === squash(k));
    if (c && !out[c] && typeof env[k] === 'string') out[c] = env[k].trim();
  }
  return out;
}
export const okCode = (s) => /^[A-Z]{3}$/.test(s || '');
export const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
