/* Commission ledger: normalize network data, upsert conversions, admin auth, CSV helpers. */
import {db, currentUser, isAdmin, jsonRes, newId} from './server.js';
import {PARTNERS} from './partners.js';

export function normStatus(s) {
  s = String(s || '').toLowerCase();
  if (/paid|settled|locked/.test(s)) return 'paid';
  if (/approv|confirm|valid|accept|complete/.test(s)) return 'approved';
  if (/declin|reject|cancel|revers|void|refund|invalid/.test(s)) return 'reversed';
  return 'pending';
}
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : null; };
const when = (v) => { const t = Date.parse(v); return Number.isFinite(t) ? t : null; };

export async function upsertConversion(DB, c) {
  const click = c.click_id ? await DB.prepare('SELECT id, partner, network FROM clicks WHERE id = ?').bind(c.click_id).first() : null;
  const partner = c.partner || click?.partner || null, network = c.network || click?.network || 'unknown';
  const ref = c.network_ref || (c.click_id ? `click:${c.click_id}` : null);
  if (!ref) return {skipped: 'no reference'};
  await DB.prepare(`INSERT INTO conversions (id, click_id, partner, network, network_ref, status, sale_amount, commission, currency, booked_at, updated_at, source, raw)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(network, network_ref) DO UPDATE SET status = excluded.status, sale_amount = COALESCE(excluded.sale_amount, sale_amount),
      commission = COALESCE(excluded.commission, commission), click_id = COALESCE(excluded.click_id, click_id), partner = COALESCE(excluded.partner, partner),
      updated_at = excluded.updated_at, raw = excluded.raw`)
    .bind(newId(), c.click_id || null, partner, network, ref, normStatus(c.status), num(c.sale), num(c.commission), (c.currency || 'USD').toUpperCase().slice(0, 3),
      when(c.date) || Date.now(), Date.now(), c.source || 'postback', JSON.stringify(c.raw || {}).slice(0, 4000)).run();
  return {ok: true, matched: !!click};
}

/* Match an advertiser name from a network report ("Booking.com", "KAYAK US", "GetYourGuide") to our partner id. */
export function brandPartner(brand) {
  const b = String(brand).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!b) return null;
  return PARTNERS.find((p) => [p.id, p.name, ...p.hosts.map((h) => h.split('.')[0])].map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .some((x) => x.length >= 3 && (b === x || b.startsWith(x)))) || null;
}
const PICK = {
  click_id: ['click_id', 'clickref', 'click_ref', 'sid', 'subid', 'sub_id', 'subid1', 'sub id', 'u1', 'label', 'tag', 'cmp', 'campaign', 'data1', 'epi'],
  network_ref: ['transaction_id', 'transaction id', 'order_id', 'order id', 'order_ref', 'booking_id', 'booking id', 'reference', 'commission_id', 'action_id', 'id'],
  status: ['status', 'state', 'commission_status', 'transaction_status', 'action_status'],
  sale: ['sale_amount', 'sale amount', 'sale', 'order_value', 'order value', 'amount', 'price', 'booking_value', 'revenue'],
  commission: ['commission', 'commission_amount', 'commission amount', 'payout', 'earnings', 'publisher_commission', 'your commission'],
  currency: ['currency', 'currency_code'],
  date: ['transaction_date', 'date', 'booking_date', 'action_date', 'created', 'click_date'],
  partner: ['advertiser', 'advertiser_name', 'merchant', 'brand', 'program'],
};
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
export function mapRows(rows, network) {
  const key = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
  const head = rows[0].map((h) => h.trim().toLowerCase()), keys = head.map(key);
  const col = Object.fromEntries(Object.entries(PICK).map(([k, names]) => [k, names.map((n) => keys.indexOf(key(n))).find((i) => i > -1)]));
  return rows.slice(1).map((r) => {
    const get = (k) => (col[k] != null ? (r[col[k]] || '').trim() : '');
    const brand = get('partner');
    const p = brand ? brandPartner(brand) : null;
    return {click_id: get('click_id') || null, network_ref: get('network_ref') || null, status: get('status'), sale: get('sale'), commission: get('commission'),
      currency: get('currency') || 'USD', date: get('date'), partner: p?.id || null, network, source: 'import', raw: Object.fromEntries(head.map((h, i) => [h, r[i]]))};
  });
}

export async function requireAdmin(request, env) {
  const DB = await db(env);
  if (!DB) return {error: jsonRes({error: 'Database not set up.'}, 503)};
  const user = await currentUser(request, DB);
  if (!isAdmin(user, env)) return {error: jsonRes({error: 'Admins only.'}, 403)};
  return {DB, user};
}
export const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');

export const range = (q) => {
  const today = new Date().toISOString().slice(0, 10);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') || '') ? q.get('to') : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : new Date(Date.parse(to) - 29 * 864e5).toISOString().slice(0, 10);
  return {from, to, t0: Date.parse(from), t1: Date.parse(to) + 864e5};
};
