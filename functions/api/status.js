/* GET /api/status: which live price sources are switched on (never exposes keys). */
import {json, has} from '../../public/assets/providers.js';

export function onRequestGet({env}) {
  return json({
    flights: {duffel: has(env, 'DUFFEL_TOKEN'), googleFlights: has(env, 'SERPAPI_KEY')},
    calendar: {aviasales: has(env, 'TRAVELPAYOUTS_TOKEN')},
    hotels: {googleHotels: has(env, 'SERPAPI_KEY'), liteapi: has(env, 'LITEAPI_KEY')},
  });
}
