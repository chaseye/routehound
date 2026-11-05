/* GET /api/admin/report?from=YYYY-MM-DD&to=YYYY-MM-DD  (admins only)
 * Clicks, commissions and costs side by side, plus the problems worth chasing. */
import {jsonRes} from '../../../lib/server.js';
import {requireAdmin, range} from '../../../lib/ledger.js';
import {PARTNERS, EXPECTED_RATE} from '../../../lib/partners.js';

export async function onRequestGet({request, env}) {
  const a = await requireAdmin(request, env);
  if (a.error) return a.error;
  const {DB} = a, {from, to, t0, t1} = range(new URL(request.url).searchParams);
  const all = async (sql, ...b) => (await DB.prepare(sql).bind(...b).all()).results || [];

  const clicks = await all(`SELECT COALESCE(partner, host) AS partner, partner IS NOT NULL AS known, SUM(tracked) AS tracked, COUNT(*) AS clicks,
    COUNT(DISTINCT vid) AS visitors FROM clicks WHERE ts >= ? AND ts < ? AND bot = 0 GROUP BY 1, 2 ORDER BY clicks DESC`, t0, t1);
  const placements = await all(`SELECT COALESCE(placement, 'other') AS placement, COUNT(*) AS clicks FROM clicks WHERE ts >= ? AND ts < ? AND bot = 0 GROUP BY 1 ORDER BY 2 DESC`, t0, t1);
  const bots = (await DB.prepare('SELECT COUNT(*) AS n FROM clicks WHERE ts >= ? AND ts < ? AND bot = 1').bind(t0, t1).first())?.n || 0;
  const conv = await all(`SELECT COALESCE(partner, 'unknown') AS partner, status, COUNT(*) AS n, SUM(COALESCE(sale_amount, 0)) AS sales, SUM(COALESCE(commission, 0)) AS commission
    FROM conversions WHERE booked_at >= ? AND booked_at < ? GROUP BY 1, 2`, t0, t1);
  const usage = await all('SELECT metric, SUM(n) AS n FROM usage_daily WHERE day >= ? AND day <= ? GROUP BY metric', from, to);
  const fixed = await all('SELECT id, month, item, amount, note FROM costs WHERE month >= ? AND month <= ? ORDER BY month, item', from.slice(0, 7), to.slice(0, 7));

  // Per-partner table
  const byP = {};
  const row = (p) => (byP[p] ||= {partner: p, clicks: 0, tracked: 0, visitors: 0, bookings: 0, sales: 0, pending: 0, approved: 0, paid: 0, reversed: 0});
  clicks.forEach((c) => Object.assign(row(c.partner), {clicks: c.clicks, tracked: c.tracked, visitors: c.visitors, known: !!c.known}));
  conv.forEach((c) => { const r = row(c.partner); if (c.status !== 'reversed') { r.bookings += c.n; r.sales += c.sales; } r[c.status] += c.commission; });
  const partners = Object.values(byP).map((r) => {
    const earned = r.pending + r.approved + r.paid;
    return {...r, earned, epc: r.clicks ? earned / r.clicks : 0, convRate: r.clicks ? r.bookings / r.clicks : 0,
      effRate: r.sales ? earned / r.sales : null, name: PARTNERS.find((p) => p.id === r.partner)?.name || r.partner};
  }).sort((x, y) => y.earned - x.earned || y.clicks - x.clicks);

  // Money
  const u = Object.fromEntries(usage.map((x) => [x.metric, x.n]));
  const perLookup = env.COST_PER_LOOKUP != null && env.COST_PER_LOOKUP !== '' ? +env.COST_PER_LOOKUP : 0.025; // SerpApi Starter ≈ $25 / 1,000
  const perEmail = +env.COST_PER_EMAIL || 0;
  const variable = (u.live_checks || 0) * perLookup + (u.emails || 0) * perEmail;
  const fixedTotal = fixed.reduce((s, c) => s + c.amount, 0);
  const sum = (k) => partners.reduce((s, p) => s + p[k], 0);
  const money = {pending: sum('pending'), approved: sum('approved'), paid: sum('paid'), reversed: sum('reversed'), variableCost: variable, fixedCost: fixedTotal,
    perLookup, perEmail};
  money.confirmed = money.approved + money.paid;
  money.netConfirmed = money.confirmed - variable - fixedTotal;
  money.netIfPendingClears = money.confirmed + money.pending - variable - fixedTotal;
  const totalClicks = sum('clicks');
  money.costPerClick = totalClicks ? (variable + fixedTotal) / totalClicks : null;
  money.epc = totalClicks ? (money.confirmed + money.pending) / totalClicks : null;

  // Problems worth chasing
  const flags = [];
  const prog = (id) => PARTNERS.find((p) => p.id === id);
  partners.forEach((r) => {
    const p = prog(r.partner);
    if (p && p.network !== 'none' && r.clicks >= 5 && r.tracked === 0)
      flags.push({level: 'money', partner: r.name, text: `${r.clicks} clicks went to ${r.name} without an affiliate ID. Add your ID to the AFFILIATE_IDS variable once approved.`});
    if (r.tracked >= 50 && r.bookings === 0)
      flags.push({level: 'check', partner: r.name, text: `${r.tracked} tracked clicks and no reported bookings. Check the ID is right and the network is reporting; long trips can take 30–60 days to show.`});
    const exp = EXPECTED_RATE[r.partner];
    if (exp && r.effRate != null && r.sales > 200 && r.effRate < exp * 0.5)
      flags.push({level: 'dispute', partner: r.name, text: `Paying ${(r.effRate * 100).toFixed(1)}% of bookings vs about ${(exp * 100).toFixed(0)}% expected. Compare with your contract.`});
    const gross = r.pending + r.approved + r.paid + r.reversed;
    if (gross > 50 && r.reversed / gross > 0.3)
      flags.push({level: 'check', partner: r.name, text: `${Math.round(r.reversed / gross * 100)}% of commission was reversed (cancellations). Ask the network for reasons.`});
  });
  const unmatched = await DB.prepare(`SELECT COUNT(*) AS n, SUM(COALESCE(commission, 0)) AS c FROM conversions c WHERE booked_at >= ? AND booked_at < ?
    AND (click_id IS NULL OR NOT EXISTS (SELECT 1 FROM clicks k WHERE k.id = c.click_id))`).bind(t0, t1).first();
  if (unmatched?.n) flags.push({level: 'check', partner: '—', text: `${unmatched.n} commissions ($${(unmatched.c || 0).toFixed(2)}) don't match a RouteHound click. Usually the network isn't passing back our click ID; check the sub-ID field.`});
  const missing = await all(`SELECT b.id, b.ts, b.partner, b.order_ref, b.amount, b.click_id FROM user_bookings b
    WHERE b.ts < ? AND b.ts >= ? AND NOT EXISTS (SELECT 1 FROM conversions c WHERE (b.click_id IS NOT NULL AND c.click_id = b.click_id)
      OR (b.order_ref IS NOT NULL AND c.network_ref = b.order_ref)) ORDER BY b.ts DESC LIMIT 200`, Date.now() - 45 * 864e5, t0 - 60 * 864e5);
  if (missing.length) flags.push({level: 'dispute', partner: '—', text: `${missing.length} bookings travelers told us about have no commission after 45 days. Download the dispute file and file missing-commission claims.`});
  const reported = (await DB.prepare('SELECT COUNT(*) AS n FROM user_bookings WHERE ts >= ? AND ts < ?').bind(t0, t1).first())?.n || 0;

  return jsonRes({from, to, totals: {clicks: totalClicks, bots, visitors: sum('visitors'), bookings: sum('bookings'), sales: sum('sales'), reported},
    money, usage: u, fixed, partners, placements, flags, missing});
}
