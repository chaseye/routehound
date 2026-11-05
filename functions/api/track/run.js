/* POST /api/track/run  (Authorization: Bearer <TRACK_SECRET>)
 * Re-prices the saved trips checked longest ago and emails users when a price drops.
 * Called by the scheduled GitHub Action. Each run handles up to `limit` trips (default 8). */
import {db, jsonRes, sendEmail, emailLayout, esc, addUsage} from '../../../lib/server.js';
import {priceTrip} from '../../../lib/track.js';

const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');

export async function onRequestPost({request, env}) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.TRACK_SECRET || auth !== `Bearer ${env.TRACK_SECRET}`) return jsonRes({error: 'Unauthorized.'}, 401);
  const DB = await db(env);
  if (!DB) return jsonRes({error: 'Database not set up.'}, 503);
  const limit = Math.min(30, +new URL(request.url).searchParams.get('limit') || 8); // max paid lookups this run
  const today = new Date().toISOString().slice(0, 10), now = Date.now();
  const {results} = await DB.prepare(`SELECT t.*, u.email FROM trips t JOIN users u ON u.id = t.user_id
    WHERE t.last_checked IS NULL OR t.last_checked < ? ORDER BY COALESCE(t.last_checked, 0) LIMIT 300`).bind(now - 20 * 3600 * 1000).all();
  // Check less often when departure is far away: >60 days out every 3 days, otherwise daily.
  const due = results.filter((t) => {
    const trip = JSON.parse(t.trip_json), dep = trip.legs[0]?.date || '';
    if (dep < today) return false;
    const daysOut = (Date.parse(dep) - now) / 864e5;
    return !t.last_checked || now - t.last_checked >= (daysOut > 60 ? 70 : 20) * 3600 * 1000;
  });
  // Everyone watching the same route, dates, seat and party size shares one lookup.
  const groups = new Map();
  for (const t of due) {
    const trip = JSON.parse(t.trip_json);
    const key = JSON.stringify([trip.legs.map((l) => [l.from, l.to, l.date, l.cabin]), trip.adults || 1]);
    if (!groups.has(key)) groups.set(key, {trip, trips: []});
    groups.get(key).trips.push(t);
  }
  const report = [];
  let lookups = 0;
  const site = new URL(request.url).origin;
  for (const {trip, trips} of groups.values()) {
    if (lookups >= limit) break;
    lookups++;
    await addUsage(DB, 'live_checks', 1);
    let p = null;
    try { p = await priceTrip(env, trip); } catch (e) { report.push({trips: trips.length, error: String(e.message || e)}); continue; }
    if (!p) { report.push({trips: trips.length, skipped: 'no price'}); continue; }
    for (const t of trips) {
      const best = Math.min(p.price, t.best_price ?? Infinity);
      await DB.batch([
        DB.prepare('UPDATE trips SET last_price = ?, best_price = ?, last_checked = ? WHERE id = ?').bind(p.price, best, now, t.id),
        DB.prepare('INSERT INTO price_history (trip_id, checked_at, price, airline, source) VALUES (?, ?, ?, ?, ?)').bind(t.id, now, p.price, p.airline || null, p.source || null),
      ]);
      const dropped = t.last_price && p.price <= t.last_price * 0.95;
      const hitTarget = t.target_price && p.price <= t.target_price && !(t.last_price && t.last_price <= t.target_price);
      if (t.alerts && (dropped || hitTarget)) {
        const why = hitTarget ? `It’s now at or under your target of ${usd(t.target_price)}.` : `That’s ${usd(t.last_price - p.price)} less than the last check.`;
        try {
          await sendEmail(env, {to: t.email, subject: `Price drop: ${t.name} is now ${usd(p.price)}`,
            text: `${t.name} is now ${usd(p.price)}${p.airline ? ` on ${p.airline}` : ''}. ${why}\n\nSee it: ${site}/#account`,
            html: emailLayout(`${t.name} is now ${usd(p.price)}`, `<p>${p.airline ? `On ${esc(p.airline)}. ` : ''}${esc(why)}</p>
              <p><a href="${esc(site)}/#account" style="color:#e2581c;font-weight:700">See your tracked trips</a></p>`)});
        } catch (e) { /* alert failed; price is still saved */ }
      }
    }
    report.push({trips: trips.length, price: p.price});
  }
  return jsonRes({due: due.length, routes: groups.size, lookupsUsed: lookups, report});
}
