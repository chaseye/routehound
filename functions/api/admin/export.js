/* GET /api/admin/export?kind=clicks|dispute|conversions&partner=&from=&to=  (admins only) → CSV download.
 * clicks:   every click with its ID, time, partner and landing page — attach to a missing-commission claim.
 * dispute:  traveler-reported bookings with no commission after 45 days, with the matching click.
 * conversions: the commission ledger. */
import {requireAdmin, toCsv, range} from '../../../lib/ledger.js';

export async function onRequestGet({request, env}) {
  const a = await requireAdmin(request, env);
  if (a.error) return a.error;
  const q = new URL(request.url).searchParams, {from, to, t0, t1} = range(q);
  const partner = q.get('partner') || null, kind = q.get('kind') || 'clicks';
  const iso = (t) => (t ? new Date(t).toISOString() : '');
  let cols, rows;
  if (kind === 'conversions') {
    cols = ['booked_at', 'partner', 'network', 'network_ref', 'click_id', 'status', 'sale_amount', 'commission', 'currency', 'source'];
    rows = (await a.DB.prepare(`SELECT * FROM conversions WHERE booked_at >= ? AND booked_at < ? AND (? IS NULL OR partner = ?) ORDER BY booked_at`).bind(t0, t1, partner, partner).all()).results
      .map((r) => ({...r, booked_at: iso(r.booked_at)}));
  } else if (kind === 'dispute') {
    cols = ['reported_at', 'partner', 'order_ref', 'amount', 'currency', 'click_id', 'click_time', 'landing_url'];
    rows = (await a.DB.prepare(`SELECT b.ts, b.partner, b.order_ref, b.amount, b.currency, b.click_id, k.ts AS kts, k.dest FROM user_bookings b
      LEFT JOIN clicks k ON k.id = b.click_id WHERE b.ts < ? AND (? IS NULL OR b.partner = ?)
      AND NOT EXISTS (SELECT 1 FROM conversions c WHERE (b.click_id IS NOT NULL AND c.click_id = b.click_id) OR (b.order_ref IS NOT NULL AND c.network_ref = b.order_ref))
      ORDER BY b.ts`).bind(Date.now() - 45 * 864e5, partner, partner).all()).results
      .map((r) => ({reported_at: iso(r.ts), partner: r.partner, order_ref: r.order_ref, amount: r.amount, currency: r.currency, click_id: r.click_id, click_time: iso(r.kts), landing_url: r.dest}));
  } else {
    cols = ['click_id', 'clicked_at', 'partner', 'network', 'tracked', 'placement', 'route', 'cabin', 'price_shown', 'country', 'landing_url'];
    rows = (await a.DB.prepare(`SELECT * FROM clicks WHERE ts >= ? AND ts < ? AND bot = 0 AND (? IS NULL OR partner = ?) ORDER BY ts LIMIT 50000`).bind(t0, t1, partner, partner).all()).results
      .map((r) => ({click_id: r.id, clicked_at: iso(r.ts), partner: r.partner || r.host, network: r.network, tracked: r.tracked ? 'yes' : 'no', placement: r.placement,
        route: r.route, cabin: r.cabin, price_shown: r.price_shown, country: r.country, landing_url: r.dest}));
  }
  return new Response(toCsv(cols, rows), {headers: {'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="routehound-${kind}${partner ? '-' + partner : ''}-${from}-to-${to}.csv"`}});
}
