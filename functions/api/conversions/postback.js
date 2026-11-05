/* Server-to-server postback from an affiliate network or brand.
 * GET or POST /api/conversions/postback?key=<POSTBACK_KEY>&network=awin&click={clickref}&ref={transaction_id}
 *      &status={status}&sale={sale_amount}&commission={commission}&currency={currency}&date={date}
 * Put this URL, with the network's own macros in braces, in each network's postback/webhook settings. */
import {db, jsonRes} from '../../../lib/server.js';
import {upsertConversion} from '../../../lib/ledger.js';

async function handle({request, env}) {
  const u = new URL(request.url);
  if (!env.POSTBACK_KEY || u.searchParams.get('key') !== env.POSTBACK_KEY) return jsonRes({error: 'Unauthorized.'}, 401);
  const DB = await db(env);
  if (!DB) return jsonRes({error: 'Database not set up.'}, 503);
  let p = Object.fromEntries(u.searchParams);
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    const body = ct.includes('json') ? await request.json().catch(() => ({})) : Object.fromEntries(new URLSearchParams(await request.text()));
    p = {...p, ...body};
  }
  const r = await upsertConversion(DB, {click_id: p.click || p.click_id || p.subid || p.sub_id || p.clickref || null, network: (p.network || 'unknown').slice(0, 30),
    network_ref: p.ref || p.transaction_id || p.order_id || null, status: p.status, sale: p.sale, commission: p.commission, currency: p.currency, date: p.date,
    partner: p.partner || null, source: 'postback', raw: p});
  return jsonRes(r);
}
export const onRequestGet = handle;
export const onRequestPost = handle;
