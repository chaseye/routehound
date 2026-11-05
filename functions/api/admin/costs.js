/* Fixed monthly costs (admins only): GET ?month=YYYY-MM, POST {month, item, amount, note}, DELETE ?id= */
import {jsonRes, sameOrigin, newId} from '../../../lib/server.js';
import {requireAdmin} from '../../../lib/ledger.js';

export async function onRequestGet({request, env}) {
  const a = await requireAdmin(request, env);
  if (a.error) return a.error;
  const rows = (await a.DB.prepare('SELECT * FROM costs ORDER BY month DESC, item LIMIT 500').all()).results;
  return jsonRes({costs: rows});
}
export async function onRequestPost({request, env}) {
  if (!sameOrigin(request)) return jsonRes({error: 'Bad origin.'}, 403);
  const a = await requireAdmin(request, env);
  if (a.error) return a.error;
  const b = await request.json().catch(() => ({}));
  if (!/^\d{4}-\d{2}$/.test(b.month || '') || !b.item || !Number.isFinite(+b.amount)) return jsonRes({error: 'Need month (YYYY-MM), item and amount.'}, 400);
  const id = newId();
  await a.DB.prepare('INSERT INTO costs (id, month, item, amount, note) VALUES (?, ?, ?, ?, ?)').bind(id, b.month, String(b.item).slice(0, 60), +b.amount, String(b.note || '').slice(0, 200) || null).run();
  return jsonRes({ok: true, id});
}
export async function onRequestDelete({request, env}) {
  if (!sameOrigin(request)) return jsonRes({error: 'Bad origin.'}, 403);
  const a = await requireAdmin(request, env);
  if (a.error) return a.error;
  await a.DB.prepare('DELETE FROM costs WHERE id = ?').bind(new URL(request.url).searchParams.get('id') || '').run();
  return jsonRes({ok: true});
}
