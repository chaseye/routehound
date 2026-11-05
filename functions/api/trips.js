/* Saved trips for the signed-in user.
 * GET    /api/trips              — list with latest and best prices
 * GET    /api/trips?history=ID   — price history for one trip
 * POST   /api/trips {name, trip, targetPrice}
 * DELETE /api/trips?id=ID */
import {db, currentUser, jsonRes, sameOrigin, newId, allow} from '../../lib/server.js';
import {priceTrip} from '../../lib/track.js';

async function auth(request, env) {
  const DB = await db(env);
  if (!DB) return {error: jsonRes({error: 'Accounts aren’t set up yet.'}, 503)};
  const user = await currentUser(request, DB);
  if (!user) return {error: jsonRes({error: 'Sign in first.'}, 401)};
  return {DB, user};
}

export async function onRequestGet({request, env}) {
  const {DB, user, error} = await auth(request, env);
  if (error) return error;
  const hist = new URL(request.url).searchParams.get('history');
  if (hist) {
    const own = await DB.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(hist, user.id).first();
    if (!own) return jsonRes({error: 'Not found.'}, 404);
    const {results} = await DB.prepare('SELECT checked_at, price, airline FROM price_history WHERE trip_id = ? ORDER BY checked_at').bind(hist).all();
    return jsonRes({history: results});
  }
  const {results} = await DB.prepare('SELECT id, name, trip_json, target_price, last_price, best_price, last_checked, alerts, created_at FROM trips WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  return jsonRes({trips: results.map((t) => ({...t, trip: JSON.parse(t.trip_json), trip_json: undefined}))});
}

export async function onRequestPost({request, env}) {
  if (!sameOrigin(request)) return jsonRes({error: 'Bad origin.'}, 403);
  const {DB, user, error} = await auth(request, env);
  if (error) return error;
  let b = {};
  try { b = await request.json(); } catch (e) { return jsonRes({error: 'Send JSON.'}, 400); }
  const legs = Array.isArray(b.trip?.legs) ? b.trip.legs.slice(0, 6).map((l) => ({from: String(l.from).slice(0, 3).toUpperCase(), to: String(l.to).slice(0, 3).toUpperCase(),
    date: String(l.date).slice(0, 10), cabin: ['economy', 'premium', 'business', 'first'].includes(l.cabin) ? l.cabin : 'economy'})) : [];
  if (!legs.length) return jsonRes({error: 'Add a route first.'}, 400);
  const {results} = await DB.prepare('SELECT COUNT(*) AS n FROM trips WHERE user_id = ?').bind(user.id).all();
  if (results[0].n >= 10) return jsonRes({error: 'You can track up to 10 trips. Remove one first.'}, 400);
  if (!(await allow(DB, `save:${user.id}`, 20, 24 * 3600 * 1000))) return jsonRes({error: 'Too many saves today.'}, 429);
  const trip = {legs, adults: Math.min(9, Math.max(1, +b.trip.adults || 1))};
  const id = newId(), now = Date.now();
  const name = String(b.name || legs.map((l) => l.from).concat(legs.at(-1).to).join(' → ')).slice(0, 80);
  const target = Number.isFinite(+b.targetPrice) && +b.targetPrice > 0 ? Math.round(+b.targetPrice) : null;
  await DB.prepare('INSERT INTO trips (id, user_id, name, trip_json, target_price, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, user.id, name, JSON.stringify(trip), target, now).run();
  // First price right away so the list isn't empty.
  try {
    const p = await priceTrip(env, trip);
    if (p) {
      await DB.batch([
        DB.prepare('UPDATE trips SET last_price = ?, best_price = ?, last_checked = ? WHERE id = ?').bind(p.price, p.price, now, id),
        DB.prepare('INSERT INTO price_history (trip_id, checked_at, price, airline, source) VALUES (?, ?, ?, ?, ?)').bind(id, now, p.price, p.airline || null, p.source || null),
      ]);
    }
  } catch (e) { /* the daily check will try again */ }
  return jsonRes({ok: true, id});
}

export async function onRequestDelete({request, env}) {
  if (!sameOrigin(request)) return jsonRes({error: 'Bad origin.'}, 403);
  const {DB, user, error} = await auth(request, env);
  if (error) return error;
  const id = new URL(request.url).searchParams.get('id');
  const own = await DB.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!own) return jsonRes({error: 'Not found.'}, 404);
  await DB.batch([DB.prepare('DELETE FROM price_history WHERE trip_id = ?').bind(id), DB.prepare('DELETE FROM trips WHERE id = ?').bind(id)]);
  return jsonRes({ok: true});
}
