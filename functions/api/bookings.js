/* POST /api/bookings {partner, order_ref, amount, currency} — a traveler tells us they booked after clicking out.
 * Matched to their latest click on that partner; used as evidence when a network misses a commission. */
import {partnerFor} from '../../lib/partners.js';
import {db, currentUser, jsonRes, sameOrigin, newId, allow, readCookie, VISITOR_COOKIE, clientIp} from '../../lib/server.js';

export async function onRequestPost({request, env}) {
  if (!sameOrigin(request)) return jsonRes({error: 'Bad origin.'}, 403);
  const DB = await db(env);
  if (!DB) return jsonRes({error: 'Not available.'}, 503);
  if (!(await allow(DB, `bk:${clientIp(request)}`, 10, 24 * 3600 * 1000))) return jsonRes({error: 'Too many reports today.'}, 429);
  const b = await request.json().catch(() => ({}));
  const vid = readCookie(request, VISITOR_COOKIE), user = await currentUser(request, DB);
  const partner = b.host ? (partnerFor(String(b.host).slice(0, 100))?.id || null) : (String(b.partner || '').slice(0, 30) || null);
  const click = await DB.prepare(`SELECT id FROM clicks WHERE (vid = ? OR (? IS NOT NULL AND user_id = ?)) AND (? IS NULL OR partner = ?) AND ts > ? ORDER BY ts DESC LIMIT 1`)
    .bind(vid || '-', user?.id || null, user?.id || null, partner, partner, Date.now() - 30 * 864e5).first();
  const amount = Number.isFinite(+b.amount) && +b.amount > 0 ? +b.amount : null;
  await DB.prepare('INSERT INTO user_bookings (id, ts, vid, user_id, click_id, partner, order_ref, amount, currency, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), Date.now(), vid || null, user?.id || null, click?.id || null, partner, String(b.order_ref || '').slice(0, 60) || null, amount,
      String(b.currency || 'USD').toUpperCase().slice(0, 3), String(b.note || '').slice(0, 200) || null).run();
  return jsonRes({ok: true, matchedClick: !!click});
}
