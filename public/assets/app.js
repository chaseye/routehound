/* RouteHound app: runs the price searches, asks the engine for smart picks, and renders results. */
import {demoFlights, demoCalendar, demoHotels, bookLink, parseMulti} from './providers.js';

const E = window.RHEngine, RH = window.RH;
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
  }
  kids.flat().forEach((k) => k != null && k !== false && n.append(k));
  return n;
};
const link = (text, href, cls = 'chip') => el('a', {href, target: '_blank', rel: 'noopener sponsored', class: cls}, text);
const usd = (v) => v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US');
const hrs = (m) => m == null ? '' : `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`;
const {nice, addDays, nights} = E;
const place = (c) => { const a = RH.AIRPORTS[c]; return a ? {city: a[0], country: a[1], region: RH.REGION(a[1])} : {city: c, country: '', region: 'other'}; };
const CABINS = {business: 'Business', premium: 'Premium economy', economy: 'Economy', first: 'First'};

/* ---------- Trip state ---------- */
const SAMPLE = {
  legs: [
    {from: 'ORD', to: 'ICN', date: '2027-01-08', cabin: 'business'},
    {from: 'ICN', to: 'CAN', date: '2027-01-13', cabin: 'economy'},
    {from: 'CAN', to: 'HKG', date: '2027-01-18', cabin: 'economy'},
    {from: 'HKG', to: 'ORD', date: '2027-01-24', cabin: 'business'},
  ],
  adults: 1, budget: 6500, nightly: 150, flex: 2, nearby: true, compareCabins: true, strategies: true,
};
const store = {
  get() { try { return JSON.parse(localStorage.getItem('rh-trip-v2') || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem('rh-trip-v2', JSON.stringify(v)); } catch (e) {} },
};
let trip = store.get() || structuredClone(SAMPLE);
const save = () => store.set(trip);
const valid = (l) => /^[A-Z]{3}$/.test(l.from) && /^[A-Z]{3}$/.test(l.to) && /^\d{4}-\d{2}-\d{2}$/.test(l.date);

/* ---------- Data access: same-origin API, or sample prices in the browser when there is no backend ---------- */
let backend = null; // null = unknown, false = no backend (sample mode), object = status
async function detectBackend() {
  try {
    const r = await fetch('/api/status', {headers: {Accept: 'application/json'}});
    backend = r.ok && (r.headers.get('content-type') || '').includes('json') ? await r.json() : false;
  } catch (e) { backend = false; }
  return backend;
}
const regionOf = (q) => ({from: q.long ? 'a' : 'x', to: q.long ? 'b' : 'x'});
async function call(job) {
  const q = job.q;
  if (!backend) {
    if (job.type === 'flights') { const qq = q.multi ? {...q, multi: parseMulti(q.multi)} : q; return {offers: demoFlights(qq, regionOf(qq)).map((o) => ({...o, bookUrl: bookLink(o)})), sample: true}; }
    if (job.type === 'calendar') return {days: demoCalendar(q, regionOf(q)), sample: true};
    return {hotels: demoHotels({...q, nights: nights(q.checkin, q.checkout), maxNight: q.max}), sample: true};
  }
  const path = {flights: 'flights', calendar: 'calendar', hotels: 'hotels'}[job.type];
  const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]));
  const r = await fetch(`/api/${path}?${p}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
}
async function runAll(jobs, onDone) {
  const out = []; let i = 0;
  const worker = async () => { while (i < jobs.length) { const j = jobs[i++]; try { out.push({job: j, data: await call(j)}); } catch (e) { out.push({job: j, data: null, error: e.message}); } onDone(); } };
  await Promise.all(Array.from({length: Math.min(6, jobs.length)}, worker));
  return out;
}

/* ---------- Form ---------- */
function renderLegs() {
  const box = $('#legs'); box.replaceChildren();
  trip.legs.forEach((l, i) => {
    const hint = el('span', {class: 'leg-city', text: valid(l) ? `${place(l.from).city} → ${place(l.to).city}` : 'Use 3-letter airport codes'});
    const inp = (id, attrs) => el('input', {id: id + i, ...attrs});
    const from = inp('from', {class: 'code', maxlength: '3', value: l.from}), to = inp('to', {class: 'code', maxlength: '3', value: l.to});
    const date = inp('date', {type: 'date', value: l.date});
    const cab = el('select', {id: 'cab' + i}, Object.entries(CABINS).map(([k, v]) => el('option', {value: k, selected: k === l.cabin ? '' : null, text: v})));
    [from, to, date, cab].forEach((x) => x.addEventListener('input', () => {
      Object.assign(l, {from: from.value.trim().toUpperCase(), to: to.value.trim().toUpperCase(), date: date.value, cabin: cab.value});
      hint.textContent = valid(l) ? `${place(l.from).city} → ${place(l.to).city}` : 'Use 3-letter airport codes'; save();
    }));
    const f = (id, label, input) => el('label', {class: 'field', for: id + i}, el('span', {class: 'lbl', text: label}), input);
    box.append(el('div', {class: 'leg'}, el('span', {class: 'leg-n', text: String(i + 1).padStart(2, '0')}),
      f('from', 'From', from), f('to', 'To', to), f('date', 'Date', date), f('cab', 'Seat', cab),
      el('button', {type: 'button', class: 'ghost', 'aria-label': `Remove leg ${i + 1}`, text: 'Remove', disabled: trip.legs.length < 2 ? '' : null,
        onclick: () => { trip.legs.splice(i, 1); save(); renderLegs(); }}), hint));
  });
}
function bindForm() {
  const nums = ['adults', 'budget', 'nightly', 'flex'], checks = ['nearby', 'compareCabins', 'strategies'];
  const fill = () => { nums.forEach((k) => { $('#' + k).value = trip[k]; }); checks.forEach((k) => { $('#' + k).checked = !!trip[k]; }); };
  fill();
  nums.forEach((k) => $('#' + k).addEventListener('input', (e) => { trip[k] = +e.target.value || 0; save(); }));
  checks.forEach((k) => $('#' + k).addEventListener('change', (e) => { trip[k] = e.target.checked; save(); }));
  $('#add').addEventListener('click', () => { const last = trip.legs.at(-1) || {}; trip.legs.push({from: last.to || '', to: '', date: last.date ? addDays(last.date, 3) : '', cabin: 'economy'}); save(); renderLegs(); });
  $('#reset').addEventListener('click', () => { trip = structuredClone(SAMPLE); save(); fill(); renderLegs(); });
  $('#trip').addEventListener('submit', (e) => { e.preventDefault(); search(); });
}

/* ---------- Search ---------- */
let lastRun = null;
async function search() {
  const legs = trip.legs.filter(valid);
  const out = $('#plan-out');
  if (!legs.length) { out.replaceChildren(el('p', {class: 'muted', text: 'Add at least one leg with airport codes and a date.'})); return; }
  const btn = $('#go'); btn.disabled = true;
  const bar = el('div', {class: 'progress'}, el('div', {class: 'progress-fill'})), msg = el('p', {class: 'muted small', text: 'Checking prices…'});
  out.replaceChildren(el('div', {class: 'card'}, el('h3', {text: 'Sniffing out prices'}), msg, bar));
  out.scrollIntoView({behavior: 'smooth', block: 'start'});
  if (backend === null) await detectBackend();

  const r1 = E.planSearches(trip, place);
  let total = r1.length, done = 0;
  const tick = () => { done++; bar.firstChild.style.width = `${Math.round(done / total * 100)}%`; msg.textContent = `Checked ${done} of ${total} price searches…`; };
  const res = {flights: [], calendar: {}, hotels: {}, errors: [], long: {}};
  legs.forEach((l, i) => { res.long[i] = place(l.from).region !== place(l.to).region ? 1 : 0; });
  const absorb = (rows) => rows.forEach(({job, data, error}) => {
    if (error) res.errors.push(`${job.type} ${job.q.from || job.q.city || ''}${job.q.to ? '→' + job.q.to : ''}: ${error}`);
    if (!data) return;
    if (job.type === 'flights') res.flights.push({job, data});
    else if (job.type === 'calendar') res.calendar[job.leg] = [...(res.calendar[job.leg] || []), ...(data.days || [])];
    else res.hotels[job.stop] = data.hotels || [];
  });
  absorb(await runAll(r1, tick));
  const r2 = E.followUpSearches(trip, res);
  total += r2.length;
  absorb(await runAll(r2, tick));
  const rec = E.recommend(trip, res, place);
  lastRun = {res, rec, at: new Date(), sample: !backend || res.flights.some((f) => f.data?.sample)};
  btn.disabled = false;
  renderResults();
  renderExplore(); renderEntry();
}

/* ---------- Results ---------- */
function renderResults() {
  const {res, rec, at, sample} = lastRun, out = $('#plan-out');
  out.replaceChildren();
  if (!rec) return;
  const srcs = backend ? [backend.flights?.duffel && 'Duffel', backend.flights?.googleFlights && 'Google Flights', backend.calendar?.aviasales && 'Aviasales', backend.hotels?.googleHotels && 'Google Hotels', backend.hotels?.liteapi && 'LiteAPI'].filter(Boolean) : [];
  out.append(el('div', {class: 'banner ' + (sample ? 'warn-b' : 'ok-b')},
    el('strong', {text: sample ? 'Sample prices' : 'Live prices'}),
    el('span', {text: sample ? ' — this copy isn’t connected to price sources yet, so numbers are realistic examples. Book links open real searches.' : ` from ${srcs.join(', ')}, checked ${at.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}. Fares change often; confirm on the booking site.`})));
  if (res.errors.length) out.append(el('p', {class: 'small warn', text: `${res.errors.length} search${res.errors.length > 1 ? 'es' : ''} failed and were skipped.`}));

  // Smart picks
  out.append(el('div', {class: 'section-h'}, el('div', {}, el('h2', {text: 'Smart picks'}), el('p', {class: 'muted', text: 'Whole-trip totals per person: flights, trains and stays. Each pick says what it changes from your plan.'}))));
  const grid = el('div', {class: 'picks'});
  rec.picks.forEach((p) => grid.append(pickCard(p, rec)));
  out.append(grid);

  // Strategies
  if (rec.strategies.length) {
    const t = el('table', {class: 'tbl'}, el('thead', {}, el('tr', {}, ['Strategy', 'Seat class', 'Trip total with stays', 'vs separate tickets', ''].map((h) => el('th', {text: h})))));
    const tb = el('tbody');
    rec.strategies.forEach((s) => tb.append(el('tr', {},
      el('td', {text: s.name}), el('td', {text: CABINS[s.cabin]}), el('td', {class: 'num', text: usd(s.total)}),
      el('td', {class: 'num ' + (s.vsSeparate > 0 ? 'good' : ''), text: s.vsSeparate == null ? '—' : s.vsSeparate > 0 ? `saves ${usd(s.vsSeparate)}` : `${usd(-s.vsSeparate)} more`}),
      el('td', {}, link(s.multicity ? 'Book ticket' : 'Book round trip', s.parts[0].bookUrl || bookLink(s.parts[0]), 'chip small')))));
    t.append(tb);
    out.append(el('div', {class: 'section-h'}, el('div', {}, el('h2', {text: 'Ticket strategies'}), el('p', {class: 'muted', text: 'One multi-city ticket, or a round trip plus a cheap regional hop, compared with buying each flight separately in the same seat class. Separate tickets aren’t protected if one is late, so leave a buffer day.'}))),
      el('div', {class: 'scroll'}, t));
  }

  // Per leg: dates, flights, ground
  out.append(el('div', {class: 'section-h'}, el('div', {}, el('h2', {text: 'Every leg, compared'}), el('p', {class: 'muted', text: 'Prices by date, cabin, nearby airports and ground options.'}))));
  rec.legs.forEach((l, i) => out.append(legCard(l, i, rec, res)));

  // Stays
  if (rec.stays.length) {
    out.append(el('div', {class: 'section-h'}, el('div', {}, el('h2', {text: 'Where to stay'}), el('p', {class: 'muted', text: `Available stays for your exact dates${trip.nightly ? `, up to ${usd(trip.nightly)} a night` : ''}. Compare each one across booking sites.`}))));
    rec.stays.forEach((sp, i) => out.append(stayCard(sp, i, res)));
  }
}

function pickCard(p, rec) {
  const itin = el('ol', {class: 'itin'});
  p.picks.forEach((o) => itin.append(el('li', {},
    el('span', {class: 'itin-d', text: nice(o.date)}),
    el('span', {class: 'code', text: o.multi ? o.multi.map((m) => `${m.from}→${m.to}`).join(' · ') : o.ret ? `${o.from} ⇄ ${o.to}` : `${o.from} → ${o.to}`}),
    el('span', {class: 'muted', text: o.multi ? ` one ticket · ${o.airline || ''} · ${CABINS[o.cabin]}` : o.kind === 'ground' ? ` ${o.mode} · ${hrs(o.durationMin)} · typical fare` : ` ${o.airline || ''} · ${CABINS[o.cabin]} · ${o.stops === 0 ? 'nonstop' : o.stops + ' stop' + (o.stops > 1 ? 's' : '')} · ${hrs(o.durationMin)}`}),
    el('span', {class: 'num', text: usd(o.price)}),
    link(o.kind === 'ground' ? 'Book' : 'Book', o.bookUrl || bookLink(o), 'chip small'))));
  rec.stays.forEach((sp) => {
    const h = p.id === 'value' ? sp.value : sp.cheapest;
    if (h) itin.append(el('li', {class: 'itin-stay'}, el('span', {class: 'itin-d', text: `${sp.stop.nights} nights`}), el('span', {text: `Stay in ${sp.stop.city}`}), el('span', {class: 'muted', text: ` ${h.name}${h.rating ? ` · ${h.rating}★ rating` : ''}`}), el('span', {class: 'num', text: `${usd(h.pricePerNight)}/night`}), el('span')));
  });
  const badge = p.id === 'baseline' ? null : p.saves > 0 ? el('span', {class: 'pill ok', text: `Saves ${usd(p.saves)}`}) : p.saves < 0 ? el('span', {class: 'pill', text: `${usd(-p.saves)} more`}) : null;
  return el('article', {class: 'card pick' + (p.id === 'cheapest' ? ' hero-pick' : '')},
    el('header', {class: 'card-h'}, el('h3', {text: p.title}), badge),
    el('div', {class: 'big'}, usd(p.total)),
    el('p', {class: 'muted small', text: `Flights & rides ${usd(p.flights)} · Stays ${usd(p.stay)} · about ${p.hours} h in transit`}),
    p.overBudget ? el('p', {class: 'small warn', text: `Over your ${usd(trip.budget)} budget`}) : null,
    el('p', {class: 'small', text: p.blurb}),
    p.reasons.length ? el('ul', {class: 'reasons'}, p.reasons.map((r) => el('li', {text: r}))) : null,
    el('details', {}, el('summary', {text: 'See the full plan'}), itin));
}

function legCard(l, i, rec, res) {
  const card = el('section', {class: 'card'});
  card.append(el('header', {class: 'card-h'}, el('h3', {}, el('span', {class: 'code', text: `${l.from} → ${l.to}`}), ' ', el('span', {class: 'muted', text: `${place(l.from).city} to ${place(l.to).city}`})),
    el('span', {class: 'pill', text: `${nice(l.date)} · ${CABINS[l.cabin]}`})));
  // Date strip
  const di = rec.dateInsights[i];
  if (di) {
    const span = Math.max(3, trip.flex || 0), days = [];
    for (let k = -span; k <= span; k++) days.push(addDays(l.date, k));
    const byDate = Object.fromEntries(di.days.map((d) => [d.date, d.price]));
    const low = Math.min(...days.map((d) => byDate[d] ?? Infinity));
    card.append(el('h4', {text: 'Cheapest economy fare by day'}), el('div', {class: 'dates'}, days.map((d) => {
      const p = byDate[d];
      return link([el('span', {class: 'd', text: nice(d)}), el('span', {class: 'p', text: p ? usd(p) : '—'})], bookLink({from: l.from, to: l.to, date: d, cabin: l.cabin}),
        'date' + (d === l.date ? ' sel' : '') + (p === low ? ' best' : ''));
    })));
    if (di.cheaperBy > 0) card.append(el('p', {class: 'small good', text: `${nice(di.low.date)} is ${usd(di.cheaperBy)} cheaper than your date in economy.`}));
  }
  // Offers table: cheapest per cabin/date/airport
  const rows = res.flights.filter((r) => r.job.leg === i && r.data?.offers?.length);
  if (rows.length) {
    const t = el('table', {class: 'tbl'}, el('thead', {}, el('tr', {}, ['Date', 'Route', 'Seat', 'Airline', 'Stops', 'Time', 'From', ''].map((h) => el('th', {text: h})))));
    const tb = el('tbody');
    rows.sort((a, b) => a.data.offers[0].price - b.data.offers[0].price).forEach(({job, data}) => {
      const best = data.offers[0], ns = data.offers.find((o) => o.stops === 0 && o !== best);
      for (const o of [best, ns].filter(Boolean)) {
        const tag = job.purpose === 'altdate' ? 'Nearby date' : job.purpose === 'altairport' ? 'Nearby airport' : null;
        tb.append(el('tr', {class: o === best ? '' : 'sub'},
          el('td', {text: nice(o.date)}), el('td', {}, el('span', {class: 'code', text: `${o.from}→${o.to}`}), tag ? el('span', {class: 'tag', text: tag}) : null),
          el('td', {text: CABINS[o.cabin]}), el('td', {text: o.airline || '—'}), el('td', {text: o.stops === 0 ? 'Nonstop' : String(o.stops)}),
          el('td', {text: hrs(o.durationMin)}), el('td', {class: 'num strong', text: usd(o.price)}),
          el('td', {}, link('Book', o.bookUrl || bookLink(o), 'chip small primary'))));
      }
    });
    t.append(tb);
    card.append(el('h4', {text: 'Flights found'}), el('div', {class: 'scroll'}, t));
  }
  // Ground
  const g = rec.options[i].filter((o) => o.kind === 'ground' && o.date === l.date);
  if (g.length) card.append(el('h4', {text: 'Train, bus or ferry instead'}), el('ul', {class: 'ground'}, g.map((o) =>
    el('li', {}, el('strong', {text: o.mode}), ` ${o.op} · about ${hrs(o.durationMin)} · typically ${usd(o.price)} `, link('Book', o.bookUrl, 'chip small')))));
  // Other sites
  const leg = {...l, adults: trip.adults || 1};
  card.append(el('h4', {text: 'Check on other sites'}), el('div', {class: 'chips'}, RH.FLIGHT_SITES.map((s) => link(s.name, s.url(leg), 'chip small'))));
  return card;
}

function stayCard(sp, i, res) {
  const s = sp.stop, hotels = res.hotels[i] || [];
  const card = el('section', {class: 'card stay'});
  card.append(el('header', {class: 'card-h'}, el('h3', {text: `Stay in ${s.city}`}), el('span', {class: 'pill', text: `${nice(s.checkin)} – ${nice(s.checkout)} · ${s.nights} night${s.nights > 1 ? 's' : ''}`})));
  if (sp.overCap) card.append(el('p', {class: 'small warn', text: `Nothing available under ${usd(trip.nightly)} a night for these dates; showing the cheapest available.`}));
  if (!hotels.length) card.append(el('p', {class: 'muted', text: 'No availability returned for these dates. Try the sites below.'}));
  const list = el('div', {class: 'hotels'});
  hotels.slice(0, 8).forEach((h) => {
    const sites = el('div', {class: 'sites'});
    const showSites = (arr) => sites.replaceChildren(arr.length ? el('table', {class: 'tbl compact'}, el('tbody', {}, arr.map((x) => el('tr', {},
      el('td', {text: x.name}), el('td', {class: 'num', text: x.pricePerNight != null ? `${usd(x.pricePerNight)}/night` : '—'}),
      el('td', {text: x.freeCancel ? 'Free cancellation' : ''}),
      el('td', {}, link('Book', x.link || `https://www.google.com/travel/search?q=${encodeURIComponent(`${h.name} ${s.city}`)}`, 'chip small')))))) : el('p', {class: 'muted small', text: 'No per-site prices returned.'}));
    const compare = el('button', {type: 'button', class: 'small-btn', text: 'Compare booking sites', onclick: async () => {
      compare.disabled = true;
      if (h.sources?.length) { showSites(h.sources); return; }
      sites.replaceChildren(el('p', {class: 'muted small', text: 'Checking each site…'}));
      try {
        const r = await fetch(`/api/hotel-prices?${new URLSearchParams({token: h.propertyToken || '', name: h.name, checkin: s.checkin, checkout: s.checkout, adults: trip.adults || 1})}`);
        const d = await r.json(); showSites(d.sites || []);
      } catch (e) { sites.replaceChildren(el('p', {class: 'muted small', text: 'Couldn’t load per-site prices.'})); }
    }});
    const isPick = h === sp.cheapest ? 'Cheapest' : h === sp.value ? 'Best value' : null;
    list.append(el('article', {class: 'hotel' + (h.available === false ? ' sold' : '')},
      h.image ? el('img', {src: h.image, alt: '', loading: 'lazy'}) : el('div', {class: 'img-ph', 'aria-hidden': 'true'}, s.city.slice(0, 1)),
      el('div', {class: 'h-body'},
        el('div', {class: 'h-top'}, el('strong', {text: h.name}), isPick ? el('span', {class: 'pill ok', text: isPick}) : null),
        el('p', {class: 'muted small', text: [h.stars ? `${h.stars}-star` : null, h.rating ? `${h.rating} rating${h.reviews ? ` (${h.reviews.toLocaleString()} reviews)` : ''}` : null, h.freeCancel ? 'Free cancellation' : null].filter(Boolean).join(' · ')}),
        h.available === false ? el('p', {class: 'small warn', text: 'Sold out for these dates'}) : el('p', {class: 'small' + (h.roomsLeft ? ' warn' : ''), text: h.roomsLeft ? `Only ${h.roomsLeft} room${h.roomsLeft > 1 ? 's' : ''} left at this price` : 'Available for your dates'}),
        el('div', {class: 'h-price'}, el('span', {class: 'big-s', text: `${usd(h.pricePerNight)}`}), el('span', {class: 'muted small', text: ` / night · ${usd(h.total)} total`})),
        el('div', {class: 'chips'}, compare, link('Book', h.link || h.sources?.[0]?.link || `https://www.google.com/travel/search?q=${encodeURIComponent(`${h.name} ${s.city}`)}`, 'chip small primary')),
        sites)));
  });
  card.append(list);
  const stop = {code: s.code, city: s.city, checkin: s.checkin, checkout: s.checkout, nights: s.nights, adults: trip.adults || 1, maxNight: trip.nightly || 0};
  const regional = RH.STAYS_REGIONAL[RH.REGION(s.country)] || [];
  card.append(el('h4', {text: 'Search more sites'}), el('div', {class: 'chips'}, [...RH.STAYS, ...regional].map((x) => link(x.name, x.url(stop), 'chip small'))));
  return card;
}

/* ---------- Deals / Explore / Entry (unchanged ideas, refreshed) ---------- */
function renderDeals() {
  $('#deal-list').replaceChildren(...RH.DEALS.map((d) => el('article', {class: 'card deal'},
    el('header', {class: 'card-h'}, el('h3', {}, link(d.name, d.url, 'textlink strong')), el('span', {class: 'pill', text: d.kind})),
    el('p', {class: 'muted', text: d.note}), el('span', {class: 'lbl', text: 'Find current promos'}),
    el('div', {class: 'chips tight'}, RH.SOCIAL.slice(0, 4).map((s) => link(s.name, s.url(d.name.split(' (')[0] + ' promo code'), 'chip small'))))));
}
function renderExplore() {
  const legs = trip.legs.filter(valid), home = legs[0]?.from;
  const codes = [...new Set(legs.map((l) => l.to).filter((c) => c !== home))];
  const fam = $('#family').checked;
  $('#explore-places').replaceChildren(...codes.map((c) => {
    const {city, country} = place(c), q = `${city} travel ${fam ? 'family friendly' : 'guide'} 2027`;
    return el('article', {class: 'card'}, el('header', {class: 'card-h'}, el('h3', {text: city}), el('span', {class: 'pill', text: RH.COUNTRY_NAMES[country] || ''})),
      RH.TOURISM[country] ? el('p', {}, link('Official tourism site', RH.TOURISM[country], 'textlink strong')) : null,
      el('span', {class: 'lbl', text: fam ? 'Family-friendly videos and posts' : 'Videos and posts'}),
      el('div', {class: 'chips'}, RH.SOCIAL.map((s) => link(s.name, s.url(s.name === 'Instagram' ? city + 'travel' : q), 'chip small'))),
      el('span', {class: 'lbl', text: 'Trending topics'}),
      el('div', {class: 'chips'}, [['Hidden gems', 2], ['Street food', 1], ['On a budget', 2], ['Getting around', 2]].map(([t, si]) => link(t, RH.SOCIAL[si].url(`${city} ${t.toLowerCase()}`), 'chip small'))));
  }));
}
function renderTrends() {
  $('#trend-list').replaceChildren(...RH.TRENDS.map((t) => el('li', {}, el('strong', {text: t.name}), el('span', {class: 'muted', text: ` ${t.note} `}), el('span', {class: 'src', text: t.src}))));
  $('#hotspots').replaceChildren(...RH.HOTSPOTS.map((h) => link(h, RH.SOCIAL[2].url(h + ' travel guide'), 'chip small')));
}
function renderEntry() {
  const us = $('#passport').value === 'US';
  const ccs = [...new Set(trip.legs.filter(valid).flatMap((l) => [l.from, l.to]).map((c) => place(c).country).filter(Boolean))].filter((c) => !(us && c === 'US'));
  const state = 'https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages.html';
  $('#entry-list').replaceChildren(...ccs.map((cc) => {
    const info = RH.ENTRY[cc] || (RH.SCHENGEN.includes(cc) ? RH.ENTRY.EU : null), ok = us && info?.tag === 'ok';
    return el('article', {class: 'card'}, el('header', {class: 'card-h'}, el('h3', {text: RH.COUNTRY_NAMES[cc] || cc}), el('span', {class: 'pill ' + (ok ? 'ok' : 'act'), text: ok ? 'Nothing to apply for' : us ? 'Check before you go' : 'Check for your passport'})),
      el('p', {text: us ? (info ? info.head : 'Check the official rules for US passports.') : 'Rules depend on your nationality.'}),
      el('div', {class: 'chips'}, [...(info ? info.links.map(([t, u]) => link(t, u, 'chip small')) : []), us ? link('US State Dept', state, 'chip small') : null, link('IATA Travel Centre', 'https://www.iatatravelcentre.com/', 'chip small')].filter(Boolean)));
  }));
}

/* ---------- Tabs & boot ---------- */
const TABS = ['plan', 'deals', 'explore', 'entry', 'partners'];
function showTab() {
  const t = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'plan';
  TABS.forEach((id) => { $('#' + id).hidden = id !== t; });
  document.querySelectorAll('.tabs a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + t ? 'page' : 'false'));
}
window.addEventListener('hashchange', showTab);
bindForm(); renderLegs(); renderDeals(); renderTrends(); renderExplore(); renderEntry(); showTab();
$('#family').addEventListener('change', renderExplore);
$('#passport').addEventListener('change', renderEntry);
$('#year').textContent = new Date().getFullYear();
detectBackend().then((b) => {
  const live = b && [b.flights?.duffel, b.flights?.googleFlights, b.hotels?.googleHotels, b.hotels?.liteapi].some(Boolean);
  const badge = $('#live-badge');
  badge.textContent = live ? 'Live prices' : 'Sample prices';
  badge.className = 'pill ' + (live ? 'ok' : 'act');
  search();
});
