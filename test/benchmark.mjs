// Live price benchmark: does RouteHound find fares at least as good as known real bookings?
// Run against the deployed site:  node test/benchmark.mjs https://routehound.pages.dev
const site = (process.argv[2] || '').replace(/\/$/, '');
if (!site) { console.error('Usage: node test/benchmark.mjs https://<your-site>'); process.exit(1); }

const CASES = [
  {
    name: 'ORD → ICN → HKG → ORD, economy, one ticket (JustFly, checked Nov 5 2026)',
    target: 1165.95, // Air Canada ORD-YYZ-ICN Jan 8, Cathay CX411 ICN-HKG Jan 13, HKG-ORD Jan 24
    path: '/api/flights?cabin=economy&multi=ORD-ICN-2027-01-08,ICN-HKG-2027-01-13,HKG-ORD-2027-01-24',
  },
  {name: 'ORD → ICN one-way economy Jan 8 (Google Flights, Nov 5 2026)', target: 490, path: '/api/flights?from=ORD&to=ICN&date=2027-01-08&cabin=economy'},
  {name: 'HKG → ORD one-way economy Jan 24 (Google Flights, Nov 5 2026)', target: 618, path: '/api/flights?from=HKG&to=ORD&date=2027-01-24&cabin=economy'},
];

let fails = 0;
for (const c of CASES) {
  const r = await fetch(site + c.path);
  const d = await r.json();
  const best = d.offers?.[0];
  if (d.sample) { console.log(`SKIP  ${c.name}: site is on sample prices (no API key).`); continue; }
  if (!best) { console.log(`FAIL  ${c.name}: no offers (${d.error || r.status})`); fails++; continue; }
  const diff = best.price - c.target, pct = Math.round(diff / c.target * 100);
  const ok = pct <= 10; // within 10% of the known fare (fares move daily)
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: found $${best.price} (${best.airline}, ${best.provider}) vs $${c.target} → ${diff <= 0 ? 'cheaper by $' + Math.round(-diff) : '$' + Math.round(diff) + ' more (' + pct + '%)'}`);
}
process.exit(fails ? 1 : 0);
