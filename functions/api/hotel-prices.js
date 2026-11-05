/* GET /api/hotel-prices?token=<property_token>&name=...&checkin=...&checkout=...&adults=1
 * One hotel's price on every booking site for the dates, cheapest first, with room options. */
import {spendLookup} from '../../lib/server.js';
import {serpHotelPrices, cached, json, has, okDate, normEnv} from '../../public/assets/providers.js';

export async function onRequestGet(context) {
  const {request} = context;
  const env = normEnv(context.env);
  const u = new URL(request.url);
  const q = {token: u.searchParams.get('token') || '', name: (u.searchParams.get('name') || '').slice(0, 120),
    checkin: u.searchParams.get('checkin'), checkout: u.searchParams.get('checkout'), adults: Math.min(9, Math.max(1, +u.searchParams.get('adults') || 1))};
  if (!q.token || !okDate(q.checkin) || !okDate(q.checkout)) return json({error: 'Missing hotel or dates.'}, 400);
  if (!has(env, 'SERPAPI_KEY')) return json({query: q, sites: [], sample: true, note: 'Per-site prices need a SerpApi key.'});
  return cached(request, context, 60 * 60 * 2, async () => {
    const budget = await spendLookup(request, env, 1);
    if (!budget.ok) return {query: q, sites: [], error: budget.message, limited: budget.why};
    try { return {query: q, sites: await serpHotelPrices(env, q), sample: false, checkedAt: new Date().toISOString()}; }
    catch (e) { return {query: q, sites: [], error: String(e.message || e)}; }
  }, env);
}
