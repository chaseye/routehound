/* GET /api/calendar?from=ORD&to=ICN&month=2027-01[&long=1]
 * Cheapest known economy price for each day of the month (Aviasales cached data). Used to spot cheap dates fast. */
import {tpCalendar, demoCalendar, cached, json, has, okCode, normEnv} from '../../public/assets/providers.js';

export async function onRequestGet(context) {
  const {request} = context;
  const env = normEnv(context.env);
  const u = new URL(request.url);
  const q = {from: (u.searchParams.get('from') || '').toUpperCase(), to: (u.searchParams.get('to') || '').toUpperCase(), month: u.searchParams.get('month')};
  if (!okCode(q.from) || !okCode(q.to) || !/^\d{4}-\d{2}$/.test(q.month || '')) return json({error: 'Use 3-letter airport codes and a YYYY-MM month.'}, 400);
  return cached(request, context, 60 * 60 * 6, async () => {
    if (!has(env, 'TRAVELPAYOUTS_TOKEN')) {
      const long = u.searchParams.get('long') === '1';
      return {query: q, days: demoCalendar(q, {from: long ? 'a' : 'x', to: long ? 'b' : 'x'}), sample: true};
    }
    try { return {query: q, days: await tpCalendar(env, q), sample: false}; }
    catch (e) { return {query: q, days: [], error: String(e.message || e), sample: false}; }
  });
}
