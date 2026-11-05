/* GET /api/status: which live price sources are switched on (never exposes keys). */
import {json, has, normEnv} from '../../public/assets/providers.js';

export function onRequestGet(context) {
  const env = normEnv(context.env);
  return json({
    flights: {duffel: has(env, 'DUFFEL_TOKEN'), googleFlights: has(env, 'SERPAPI_KEY')},
    calendar: {aviasales: has(env, 'TRAVELPAYOUTS_TOKEN')},
    hotels: {googleHotels: has(env, 'SERPAPI_KEY'), liteapi: has(env, 'LITEAPI_KEY')},
    // Names only (never values) of settings that look like keys, to catch typos like "SERP_API_KEY".
    keyNamesSeen: Object.keys(env || {}).filter((k) => /key|token|serp|duffel|lite|travel/i.test(k)).sort(),
  });
}
