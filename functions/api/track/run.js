/* POST /api/track/run  (Authorization: Bearer <TRACK_SECRET>)
 * Re-prices the saved trips checked longest ago and emails users when a price drops.
 * Called by the scheduled GitHub Action. Each run handles up to `limit` trips (default 8). */
import {db, jsonRes, sendEmail, emailLayout, esc} from '../../../lib/server.js';
import {priceTrip} from '../../../lib/track.js';

const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');

export async function onRequestPost({request, env}) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.TRACK_SECRET || auth !== `Bearer ${env.TRACK_SECRET}`) return jsonRes({error: 'Unauthorized.'}, 401);
  const DB = await db(env);
  if (!DB) return jsonRes({error: 'Database not set up.'}, 503);
  const limit = Math.min(20, +new URL(request.url).searchParams.get('limit') || 8);
  const today = new Date().toISOString().slice(0, 10);
  const {results} = await DB.prepare(`SELECT t.*, u.email FROM trips t JOIN users u ON u.id = t.user_id
    WHERE t.last_checked IS NULL OR t.last_checked < ? ORDER BY COALESCE(t.last_checked, 0) LIMIT ?`).bind(Date.now() - 20 * 3600 * 1000, limit).all();
  const report = [];
  for (const t of results) {
    const trip = JSON.parse(t.trip_json);
    if ((trip.legs[0]?.date || '') < today) { report.push({id: t.id, skipped: 'trip already started'}); continue; }
    try {
      const p = await priceTrip(env, trip);
      if (!p) { report.push({id: t.id, skipped: 'no price'}); continue; }
      const now = Date.now(), best = Math.min(p.price, t.best_price ?? Infinity);
      await DB.batch([
        DB.prepare('UPDATE trips SET last_price = ?, best_price = ?, last_checked = ? WHERE id = ?').bind(p.price, best, now, t.id),
        DB.prepare('INSERT INTO price_history (trip_id, checked_at, price, airline, source) VALUES (?, ?, ?, ?, ?)').bind(t.id, now, p.price, p.airline || null, p.source || null),
      ]);
      const dropped = t.last_price && p.price <= t.last_price * 0.95;
      const hitTarget = t.target_price && p.price <= t.target_price && !(t.last_price && t.last_price <= t.target_price);
      if (t.alerts && (dropped || hitTarget)) {
        const site = new URL(request.url).origin;
        const why = hitTarget ? `It’s now at or under your target of ${usd(t.target_price)}.` : `That’s ${usd(t.last_price - p.price)} less than the last check.`;
        await sendEmail(env, {to: t.email, subject: `Price drop: ${t.name} is now ${usd(p.price)}`,
          text: `${t.name} is now ${usd(p.price)}${p.airline ? ` on ${p.airline}` : ''}. ${why}\n\nSee it: ${site}/#account`,
          html: emailLayout(`${t.name} is now ${usd(p.price)}`, `<p>${p.airline ? `On ${esc(p.airline)}. ` : ''}${esc(why)}</p>
            <p><a href="${esc(site)}/#account" style="color:#e2581c;font-weight:700">See your tracked trips</a></p>`)});
      }
      report.push({id: t.id, price: p.price, alerted: !!(t.alerts && (dropped || hitTarget))});
    } catch (e) { report.push({id: t.id, error: String(e.message || e)}); }
  }
  return jsonRes({checked: report.length, report});
}
