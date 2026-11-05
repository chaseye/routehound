/* GET /go?u=<destination>&pl=<placement>&s=<search id>&r=<route>&c=<cabin>&p=<price shown>
 * Logs the click, adds the affiliate ID and our click ID, and sends the traveler to the partner.
 * The partner (or its affiliate network) sets its referral cookie when the traveler lands there. */
import {db, newId, sha256, readCookie, currentUser, clientIp, randomToken, visitorCookie, VISITOR_COOKIE} from '../lib/server.js';
import {allowedHost, affiliateUrl} from '../lib/partners.js';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget|python|httpclient/i;

export async function onRequestGet({request, env, waitUntil}) {
  const q = new URL(request.url).searchParams;
  let dest;
  try { dest = new URL(q.get('u') || ''); } catch (e) { return new Response('Bad link.', {status: 400}); }
  if (!/^https?:$/.test(dest.protocol) || !allowedHost(dest.hostname)) return new Response('This link isn’t allowed.', {status: 400});

  const clickId = 'rh' + newId();
  const {url, partner, tracked} = affiliateUrl(dest.toString(), clickId, env);
  const headers = new Headers({Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'origin', 'X-Robots-Tag': 'noindex'});
  let vid = readCookie(request, VISITOR_COOKIE);
  if (!vid || !/^[A-Za-z0-9_-]{16,}$/.test(vid)) { vid = randomToken(12); headers.append('Set-Cookie', visitorCookie(vid)); }

  const log = async () => {
    const DB = await db(env);
    if (!DB) return;
    const user = await currentUser(request, DB).catch(() => null);
    const day = new Date().toISOString().slice(0, 10);
    const num = (v) => (Number.isFinite(+v) && +v > 0 ? Math.round(+v) : null);
    const clip = (v, n) => (v ? String(v).slice(0, n) : null);
    await DB.prepare(`INSERT INTO clicks (id, ts, vid, user_id, partner, network, host, dest, tracked, placement, search_id, route, cabin, price_shown, country, ip_hash, bot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(clickId, Date.now(), vid, user?.id || null, partner?.id || null, partner?.network || null,
      dest.hostname.toLowerCase(), dest.toString().slice(0, 1500), tracked ? 1 : 0, clip(q.get('pl'), 40), clip(q.get('s'), 40), clip(q.get('r'), 80),
      clip(q.get('c'), 12), num(q.get('p')), request.cf?.country || null, await sha256(`${clientIp(request)}|${day}`), BOT.test(request.headers.get('User-Agent') || '') ? 1 : 0).run();
  };
  waitUntil(log().catch(() => {}));
  return new Response(null, {status: 302, headers});
}
