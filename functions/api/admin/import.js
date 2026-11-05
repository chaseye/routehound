/* POST /api/admin/import {network, csv}  (admins only)
 * Paste or upload a network's transaction/commission report (CSV). Rows are matched to clicks by our click ID
 * (the sub-ID column) and updated in place on re-import, so you can import the same report every week. */
import {jsonRes, sameOrigin} from '../../../lib/server.js';
import {requireAdmin, parseCsv, mapRows, upsertConversion} from '../../../lib/ledger.js';

export async function onRequestPost({request, env}) {
  if (!sameOrigin(request)) return jsonRes({error: 'Bad origin.'}, 403);
  const a = await requireAdmin(request, env);
  if (a.error) return a.error;
  const b = await request.json().catch(() => ({}));
  const network = String(b.network || 'unknown').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) || 'unknown';
  const rows = parseCsv(String(b.csv || '').slice(0, 2_000_000));
  if (rows.length < 2) return jsonRes({error: 'No rows found. Include the header row.'}, 400);
  const mapped = mapRows(rows, network).slice(0, 5000);
  let imported = 0, matched = 0, skipped = 0;
  for (const m of mapped) {
    if (m.click_id && !/^rh[A-Za-z0-9_-]{8,}$/.test(m.click_id)) m.click_id = null; // only our own IDs
    const r = await upsertConversion(a.DB, m);
    if (r.skipped) skipped++; else { imported++; if (r.matched) matched++; }
  }
  return jsonRes({ok: true, imported, matched, unmatched: imported - matched, skipped,
    columns: rows[0], note: skipped ? 'Rows without a transaction ID or click ID were skipped.' : undefined});
}
