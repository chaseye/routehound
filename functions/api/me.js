/* GET /api/me — who is signed in (or 401). Also says whether accounts are set up. */
import {db, currentUser, jsonRes} from '../../lib/server.js';

export async function onRequestGet({request, env}) {
  const DB = await db(env);
  if (!DB || (!env.RESEND_API_KEY && env.DEV_EMAIL_LOG !== '1')) return jsonRes({available: false}, 200);
  const user = await currentUser(request, DB);
  return user ? jsonRes({available: true, email: user.email}) : jsonRes({available: true, email: null}, 200);
}
