/* Prices a saved trip the cheapest sensible way: one multi-city ticket for its flights
 * (legs with a train/bus/ferry corridor are left to the ground option). 1 API search per trip. */
import {serpFlights, duffelFlights, normEnv} from '../public/assets/providers.js';
import '../public/assets/engine.js';

export async function priceTrip(rawEnv, trip) {
  const env = normEnv(rawEnv);
  const E = globalThis.RHEngine;
  const legs = (trip.legs || []).filter((l) => /^[A-Z]{3}$/.test(l.from) && /^[A-Z]{3}$/.test(l.to) && /^\d{4}-\d{2}-\d{2}$/.test(l.date));
  if (!legs.length) return null;
  const ground = legs.filter((l) => E.groundFor(l.from, l.to).length);
  const air = legs.filter((l) => !ground.includes(l));
  const groundCost = ground.reduce((t, l) => t + Math.min(...E.groundFor(l.from, l.to).map((g) => g.price)), 0) * (trip.adults || 1);
  const cabin = (air[0] || legs[0]).cabin || 'economy';
  const q = air.length >= 2
    ? {multi: air.map(({from, to, date}) => ({from, to, date})), from: air[0].from, to: air.at(-1).to, date: air[0].date, cabin, adults: trip.adults || 1}
    : {...(air[0] || legs[0]), cabin, adults: trip.adults || 1};
  let offers = [];
  if (env.SERPAPI_KEY) offers = (await serpFlights(env, q)).offers;
  else if (env.DUFFEL_TOKEN) offers = await duffelFlights(env, q);
  else return null;
  const best = offers.sort((a, b) => a.price - b.price)[0];
  if (!best) return null;
  return {price: best.price + groundCost, airline: best.airline, source: best.provider, groundCost};
}
