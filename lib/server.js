/* Server-only helpers: database, sessions, rate limits and email.
 * Needs (Cloudflare Pages settings):
 *   D1 binding named DB              — accounts, saved trips, price history
 *   RESEND_API_KEY (secret)          — sends sign-in links and price alerts
 *   EMAIL_FROM (variable, optional)  — e.g. "RouteHound <alerts@yourdomain.com>"
 *   TRACK_SECRET (secret)            — lets the scheduled price check run
 */

export const SESSION_COOKIE = 'rh_session';
const DAY = 864e5;

export function jsonRes(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers}});
}

/* ---------- crypto ---------- */
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
export async function sha256(s) { return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
export const newId = () => randomToken(12);

/* ---------- database ---------- */
let ready = false;
export async function db(env) {
  if (!env.DB) return null;
  if (!ready) {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL, verified_at INTEGER)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, ip TEXT)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, trip_json TEXT NOT NULL, target_price INTEGER,
        last_price INTEGER, best_price INTEGER, last_checked INTEGER, alerts INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS price_history (trip_id TEXT NOT NULL, checked_at INTEGER NOT NULL, price INTEGER NOT NULL, airline TEXT, source TEXT)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, window_start INTEGER NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS clicks (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, vid TEXT, user_id TEXT, partner TEXT, network TEXT,
        host TEXT NOT NULL, dest TEXT NOT NULL, tracked INTEGER NOT NULL DEFAULT 0, placement TEXT, search_id TEXT, route TEXT, cabin TEXT,
        price_shown INTEGER, country TEXT, ip_hash TEXT, bot INTEGER NOT NULL DEFAULT 0)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS conversions (id TEXT PRIMARY KEY, click_id TEXT, partner TEXT, network TEXT, network_ref TEXT,
        status TEXT NOT NULL DEFAULT 'pending', sale_amount REAL, commission REAL, currency TEXT DEFAULT 'USD', booked_at INTEGER,
        updated_at INTEGER NOT NULL, source TEXT, raw TEXT, UNIQUE(network, network_ref))`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_bookings (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, vid TEXT, user_id TEXT, click_id TEXT,
        partner TEXT, order_ref TEXT, amount REAL, currency TEXT, note TEXT)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS usage_daily (day TEXT NOT NULL, metric TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, metric))`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS costs (id TEXT PRIMARY KEY, month TEXT NOT NULL, item TEXT NOT NULL, amount REAL NOT NULL, note TEXT)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS clicks_ts ON clicks(ts)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS conv_click ON conversions(click_id)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS trips_user ON trips(user_id)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS hist_trip ON price_history(trip_id, checked_at)`),
    ]);
    ready = true;
  }
  return env.DB;
}

/* Fixed-window rate limit. Returns true when the call is allowed. */
export async function allow(DB, key, max, windowMs) {
  const now = Date.now();
  const row = await DB.prepare('SELECT n, window_start FROM rate_limits WHERE k = ?').bind(key).first();
  if (!row || now - row.window_start > windowMs) {
    await DB.prepare('INSERT INTO rate_limits (k, n, window_start) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = 1, window_start = excluded.window_start').bind(key, now).run();
    return true;
  }
  if (row.n >= max) return false;
  await DB.prepare('UPDATE rate_limits SET n = n + 1 WHERE k = ?').bind(key).run();
  return true;
}

/* ---------- sessions ---------- */
export function readCookie(request, name) {
  const m = (request.headers.get('Cookie') || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
export function sessionCookie(value, maxAgeSec) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
export async function createSession(DB, userId) {
  const token = randomToken(32);
  await DB.prepare('INSERT INTO sessions (id_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), userId, Date.now() + 30 * DAY, Date.now()).run();
  return token;
}
export async function currentUser(request, DB) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || !DB) return null;
  return DB.prepare('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ?')
    .bind(await sha256(token), Date.now()).first();
}

/* Reject cross-site writes: browsers send Origin on POST/DELETE. */
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}
export const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';
export const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/* ---------- email ---------- */
export async function sendEmail(env, {to, subject, html, text}) {
  // Local testing only: print the email instead of sending it. Never set DEV_EMAIL_LOG in production.
  if (env.DEV_EMAIL_LOG === '1') { console.log(`[dev email] to=${to} subject=${subject}\n${text}`); return; }
  if (!env.RESEND_API_KEY) throw new Error('Email is not set up (RESEND_API_KEY missing).');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: env.EMAIL_FROM || 'RouteHound <onboarding@resend.dev>', to: [to], subject, html, text}),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  try { await addUsage(await db(env), 'emails', 1); } catch (e) { /* ledger is best-effort */ }
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export function emailLayout(title, bodyHtml) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:auto;color:#13231e">
    <p style="font-weight:800;font-size:20px;margin:0 0 16px">RouteHound</p>
    <h1 style="font-size:18px;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}
    <p style="color:#566a63;font-size:12px;margin-top:24px">You received this because this address was used on RouteHound. If that wasn’t you, ignore this email.</p></div>`;
}
export {esc};

/* ---------- Search budget (protects the paid price APIs) ----------
 * Each live lookup that misses the cache costs one paid search. Limits per day:
 *   DAILY_SEARCH_LIMIT  whole site            (default 200)
 *   ANON_DAILY_LOOKUPS  per visitor (by IP)   (default 25  ≈ 2 quick searches)
 *   USER_DAILY_LOOKUPS  per signed-in user    (default 120 ≈ 3 deep searches)
 * Cached answers are free and never counted. */
export async function spendLookup(request, env, n = 1) {
  const DB = await db(env);
  if (!DB) return {ok: true};
  const day = new Date().toISOString().slice(0, 10), W = 26 * 3600 * 1000;
  const user = await currentUser(request, DB);
  const site = +env.DAILY_SEARCH_LIMIT || 200;
  const per = user ? (+env.USER_DAILY_LOOKUPS || 120) : (+env.ANON_DAILY_LOOKUPS || 25);
  const who = user ? `u:${user.id}` : `ip:${clientIp(request)}`;
  const peek = async (k) => (await DB.prepare('SELECT n FROM rate_limits WHERE k = ?').bind(k).first())?.n || 0;
  if (await peek(`site:${day}`) + n > site) return {ok: false, why: 'site', message: 'RouteHound has used today’s live price checks. Showing booking links instead; live prices return tomorrow.'};
  if (await peek(`look:${who}:${day}`) + n > per) return {ok: false, why: 'user', signedIn: !!user,
    message: user ? 'You’ve used today’s live price checks. They reset tomorrow.' : 'You’ve used today’s free live price checks. Sign in (free) for more, or try again tomorrow.'};
  await addUsage(DB, 'live_checks', n);
  for (const k of [`site:${day}`, `look:${who}:${day}`]) {
    await DB.prepare('INSERT INTO rate_limits (k, n, window_start) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET n = n + excluded.n').bind(k, n, Date.now()).run();
  }
  return {ok: true};
}

/* ---------- Bot check on sign-in (Cloudflare Turnstile, free; optional) ---------- */
export async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method: 'POST',
    body: new URLSearchParams({secret: env.TURNSTILE_SECRET, response: token, remoteip: ip})});
  return !!(await r.json()).success;
}

/* ---------- Usage ledger (what the site consumed each day) ---------- */
export async function addUsage(DB, metric, n = 1) {
  if (!DB || !n) return;
  const day = new Date().toISOString().slice(0, 10);
  await DB.prepare('INSERT INTO usage_daily (day, metric, n) VALUES (?, ?, ?) ON CONFLICT(day, metric) DO UPDATE SET n = n + excluded.n').bind(day, metric, n).run();
}

/* ---------- Admins (comma-separated ADMIN_EMAILS) ---------- */
export function isAdmin(user, env) {
  if (!user) return false;
  return (env.ADMIN_EMAILS || '').toLowerCase().split(',').map((e) => e.trim()).filter(Boolean).includes(user.email.toLowerCase());
}
export const VISITOR_COOKIE = 'rh_vid';
export function visitorCookie(v) { return `${VISITOR_COOKIE}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${400 * 24 * 3600}`; }
