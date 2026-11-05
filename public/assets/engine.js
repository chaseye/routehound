/* RouteHound smart engine.
 * 1. planSearches(trip)            -> which price searches to run (bounded, cache-friendly)
 * 2. followUpSearches(trip, res)   -> second round: cheapest nearby dates and nearby airports found in round one
 * 3. recommend(trip, res)          -> ranked whole-trip picks with plain-language reasons
 * Works in the browser (window.RHEngine) and in Node tests (module.exports).
 */
(function (root) {
  const DAY = 864e5;
  const addDays = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const nights = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
  const dow = (s) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(s + 'T00:00:00Z').getUTCDay()];
  const nice = (s) => new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'});
  const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const GRADE = {economy: 1, premium: 2, business: 3, first: 4};
  const CABIN_NAME = {economy: 'economy', premium: 'premium economy', business: 'business', first: 'first'};

  /* Airports close enough to swap, with how you'd get between them. */
  const NEARBY = {
    ORD: ['MDW'], MDW: ['ORD'], JFK: ['EWR', 'LGA'], EWR: ['JFK'], LGA: ['JFK'], IAD: ['DCA'], DCA: ['IAD'], SFO: ['OAK', 'SJC'], LAX: ['BUR', 'LGB'],
    ICN: ['GMP'], GMP: ['ICN'], NRT: ['HND'], HND: ['NRT'], KIX: ['ITM', 'UKB'], ITM: ['KIX'], HKG: ['SZX', 'MFM'], SZX: ['HKG', 'CAN'], CAN: ['SZX', 'HKG'],
    MFM: ['HKG'], PVG: ['SHA'], SHA: ['PVG'], PEK: ['PKX'], PKX: ['PEK'], BKK: ['DMK'], DMK: ['BKK'], TPE: ['TSA'], LHR: ['LGW', 'STN'], LGW: ['LHR'],
    CDG: ['ORY'], ORY: ['CDG'], MXP: ['LIN', 'BGY'], FCO: ['CIA'], CMN: ['RAK'], DXB: ['DWC', 'SHJ'], IST: ['SAW'],
  };

  /* Ground corridors with typical fares (estimates; book links go to the operator or a reseller). */
  const GROUND = [
    {a: ['CAN'], b: ['HKG'], mode: 'High-speed train', op: 'Guangzhou South ⇄ Hong Kong West Kowloon', min: 50, price: 32, url: 'https://www.trip.com/trains/'},
    {a: ['SZX'], b: ['HKG'], mode: 'High-speed train', op: 'Shenzhen North/Futian ⇄ West Kowloon', min: 20, price: 12, url: 'https://www.trip.com/trains/'},
    {a: ['HKG'], b: ['MFM'], mode: 'Ferry', op: 'TurboJET Hong Kong ⇄ Macau', min: 60, price: 23, url: 'https://www.turbojet.com.hk/'},
    {a: ['HKG'], b: ['MFM'], mode: 'Bus', op: 'Hong Kong–Zhuhai–Macao Bridge shuttle', min: 45, price: 9, url: 'https://www.hzmbus.com/'},
    {a: ['ICN', 'GMP'], b: ['PUS'], mode: 'KTX train', op: 'Seoul ⇄ Busan', min: 160, price: 45, url: 'https://www.letskorail.com/'},
    {a: ['NRT', 'HND'], b: ['KIX', 'ITM', 'UKB'], mode: 'Shinkansen', op: 'Tokyo ⇄ Shin-Osaka', min: 150, price: 100, url: 'https://smart-ex.jp/en/'},
    {a: ['NRT', 'HND'], b: ['NGO'], mode: 'Shinkansen', op: 'Tokyo ⇄ Nagoya', min: 100, price: 75, url: 'https://smart-ex.jp/en/'},
    {a: ['KIX', 'ITM'], b: ['FUK'], mode: 'Shinkansen', op: 'Shin-Osaka ⇄ Hakata', min: 150, price: 110, url: 'https://smart-ex.jp/en/'},
    {a: ['PUS'], b: ['FUK'], mode: 'Ferry', op: 'Busan ⇄ Fukuoka (Queen Beetle / New Camellia)', min: 200, price: 90, url: 'https://12go.asia/'},
    {a: ['TPE'], b: ['KHH'], mode: 'High-speed train', op: 'Taipei ⇄ Zuoying (THSR)', min: 95, price: 50, url: 'https://en.thsrc.com.tw/'},
    {a: ['BKK', 'DMK'], b: ['CNX'], mode: 'Overnight train', op: 'Bangkok ⇄ Chiang Mai sleeper', min: 720, price: 35, url: 'https://12go.asia/'},
    {a: ['SIN'], b: ['KUL'], mode: 'Bus', op: 'Singapore ⇄ Kuala Lumpur coach', min: 330, price: 25, url: 'https://www.easybook.com/'},
    {a: ['HAN'], b: ['DAD'], mode: 'Train', op: 'Hanoi ⇄ Da Nang (Reunification Express)', min: 960, price: 45, url: 'https://12go.asia/'},
    {a: ['LHR', 'LGW', 'STN'], b: ['CDG', 'ORY'], mode: 'Eurostar', op: 'London St Pancras ⇄ Paris Nord', min: 140, price: 80, url: 'https://www.thetrainline.com/'},
    {a: ['CDG', 'ORY'], b: ['AMS'], mode: 'High-speed train', op: 'Paris ⇄ Amsterdam', min: 200, price: 70, url: 'https://www.omio.com/'},
    {a: ['CDG', 'ORY'], b: ['BRU'], mode: 'High-speed train', op: 'Paris ⇄ Brussels', min: 85, price: 45, url: 'https://www.omio.com/'},
    {a: ['MAD'], b: ['BCN'], mode: 'High-speed train', op: 'Madrid ⇄ Barcelona', min: 150, price: 40, url: 'https://www.omio.com/'},
    {a: ['FCO'], b: ['FLR'], mode: 'High-speed train', op: 'Rome ⇄ Florence', min: 95, price: 30, url: 'https://www.omio.com/'},
    {a: ['FCO'], b: ['MXP', 'LIN'], mode: 'High-speed train', op: 'Rome ⇄ Milan', min: 180, price: 45, url: 'https://www.omio.com/'},
    {a: ['FCO'], b: ['NAP'], mode: 'High-speed train', op: 'Rome ⇄ Naples', min: 70, price: 25, url: 'https://www.omio.com/'},
    {a: ['VIE'], b: ['BUD'], mode: 'Train', op: 'Vienna ⇄ Budapest', min: 160, price: 30, url: 'https://www.omio.com/'},
    {a: ['VIE'], b: ['PRG'], mode: 'Train', op: 'Vienna ⇄ Prague', min: 240, price: 30, url: 'https://www.omio.com/'},
    {a: ['ATH'], b: ['JTR'], mode: 'Ferry', op: 'Piraeus ⇄ Santorini', min: 330, price: 75, url: 'https://www.ferryhopper.com/'},
    {a: ['ATH'], b: ['JMK'], mode: 'Ferry', op: 'Piraeus ⇄ Mykonos', min: 150, price: 70, url: 'https://www.ferryhopper.com/'},
    {a: ['SPU'], b: ['DBV'], mode: 'Bus', op: 'Split ⇄ Dubrovnik', min: 270, price: 22, url: 'https://www.flixbus.com/'},
    {a: ['LIS'], b: ['OPO'], mode: 'Train', op: 'Lisbon ⇄ Porto (Alfa Pendular)', min: 175, price: 30, url: 'https://www.cp.pt/'},
    {a: ['CMN'], b: ['RAK'], mode: 'Train', op: 'Casablanca ⇄ Marrakech (ONCF)', min: 160, price: 13, url: 'https://www.oncf.ma/'},
    {a: ['CMN'], b: ['FEZ'], mode: 'Train', op: 'Casablanca ⇄ Fes (ONCF)', min: 250, price: 13, url: 'https://www.oncf.ma/'},
    {a: ['NBO'], b: ['MBA'], mode: 'Train', op: 'Nairobi ⇄ Mombasa (Madaraka Express)', min: 300, price: 25, url: 'https://metickets.krc.co.ke/'},
    {a: ['CAI'], b: ['LXR'], mode: 'Sleeper train', op: 'Cairo ⇄ Luxor', min: 600, price: 90, url: 'https://enr.gov.eg/'},
    {a: ['JNB'], b: ['DUR'], mode: 'Bus', op: 'Johannesburg ⇄ Durban (Intercape)', min: 540, price: 30, url: 'https://www.intercape.co.za/'},
  ];
  const groundFor = (from, to) => GROUND.filter((g) => (g.a.includes(from) && g.b.includes(to)) || (g.b.includes(from) && g.a.includes(to)));

  const legsOf = (trip) => trip.legs.filter((l) => /^[A-Z]{3}$/.test(l.from) && /^[A-Z]{3}$/.test(l.to) && /^\d{4}-\d{2}-\d{2}$/.test(l.date));
  const cabinsFor = (trip, l) => trip.compareCabins ? [...new Set([l.cabin, 'business', 'premium', 'economy'])] : [l.cabin];
  const returnsHome = (legs) => legs.length >= 2 && legs[0].from === legs[legs.length - 1].to;

  /* ---------- Round 1 ---------- */
  function planSearches(trip, place) {
    const legs = legsOf(trip), jobs = [];
    const long = (l) => (place ? place(l.from).region !== place(l.to).region : true) ? 1 : 0;
    legs.forEach((l, i) => {
      for (const c of cabinsFor(trip, l)) jobs.push({type: 'flights', leg: i, purpose: 'exact', q: {from: l.from, to: l.to, date: l.date, cabin: c, adults: trip.adults, long: long(l)}});
      if (trip.flex > 0) {
        const months = new Set([addDays(l.date, -trip.flex).slice(0, 7), addDays(l.date, trip.flex).slice(0, 7)]);
        months.forEach((m) => jobs.push({type: 'calendar', leg: i, q: {from: l.from, to: l.to, month: m, long: long(l)}}));
      }
    });
    // The whole trip as ONE multi-city ticket (often far cheaper than separate tickets),
    // and a version that leaves out legs you could do by train, bus or ferry.
    if (legs.length >= 2 && trip.strategies !== false) {
      const enc = (ls) => ls.map((l) => `${l.from}-${l.to}-${l.date}`).join(',');
      const airLegs = legs.filter((l) => !groundFor(l.from, l.to).length);
      const variants = [{variant: 'all', ls: legs}];
      if (airLegs.length >= 2 && airLegs.length < legs.length) variants.push({variant: 'air', ls: airLegs});
      for (const v of variants) for (const c of cabinsFor(trip, legs[0])) {
        jobs.push({type: 'flights', purpose: 'multicity', variant: v.variant, legIdx: v.ls.map((l) => legs.indexOf(l)), q: {multi: enc(v.ls), cabin: c, adults: trip.adults, long: 1}});
      }
    }
    if (trip.includeStays !== false) stopsOf(trip, place).forEach((s, i) => jobs.push({type: 'hotels', stop: i, q: {city: s.city, country: s.country, checkin: s.checkin, checkout: s.checkout, adults: trip.adults, max: trip.nightly || 0}}));
    if (returnsHome(legs) && trip.strategies !== false) {
      const first = legs[0], last = legs[legs.length - 1];
      for (const hub of [...new Set([first.to, last.from])]) {
        for (const c of cabinsFor(trip, first)) jobs.push({type: 'flights', purpose: 'roundtrip', hub, q: {from: first.from, to: hub, date: first.date, ret: last.date, cabin: c, adults: trip.adults, long: 1}});
      }
      if (first.to !== last.from) {
        jobs.push({type: 'flights', purpose: 'hop', hop: 'end', q: {from: last.from, to: first.to, date: addDays(last.date, -1), cabin: 'economy', adults: trip.adults, long: long({from: last.from, to: first.to})}});
        jobs.push({type: 'flights', purpose: 'hop', hop: 'start', q: {from: last.from, to: first.to, date: addDays(first.date, 2), cabin: 'economy', adults: trip.adults, long: long({from: last.from, to: first.to})}});
      }
    }
    return jobs;
  }

  /* Stops (where you sleep) come from consecutive legs. */
  function stopsOf(trip, place) {
    const legs = legsOf(trip), out = [];
    for (let i = 0; i < legs.length - 1; i++) {
      const n = nights(legs[i].date, legs[i + 1].date);
      if (n > 0) {
        const p = place ? place(legs[i].to) : {city: legs[i].to, country: ''};
        out.push({afterLeg: i, code: legs[i].to, city: p.city || legs[i].to, country: p.country || '', checkin: legs[i].date, checkout: legs[i + 1].date, nights: n});
      }
    }
    return out;
  }

  /* ---------- Round 2: cheapest nearby dates + nearby airports ---------- */
  function followUpSearches(trip, res) {
    const legs = legsOf(trip), jobs = [];
    legs.forEach((l, i) => {
      if (trip.flex > 0) {
        const cal = (res.calendar[i] || []).filter((d) => Math.abs(nights(l.date, d.date)) <= trip.flex && d.date !== l.date);
        cal.sort((a, b) => a.price - b.price).slice(0, 2).forEach((d) =>
          jobs.push({type: 'flights', leg: i, purpose: 'altdate', q: {from: l.from, to: l.to, date: d.date, cabin: l.cabin, adults: trip.adults, long: res.long?.[i] ?? 1}}));
      }
      if (trip.nearby) {
        const alts = [...(NEARBY[l.from] || []).map((f) => [f, l.to]), ...(NEARBY[l.to] || []).map((t) => [l.from, t])].slice(0, 2);
        alts.forEach(([f, t]) => jobs.push({type: 'flights', leg: i, purpose: 'altairport', q: {from: f, to: t, date: l.date, cabin: l.cabin, adults: trip.adults, long: res.long?.[i] ?? 1}}));
      }
    });
    return jobs;
  }

  /* ---------- Recommend ---------- */
  // res = {flights: [{job, data}], calendar: {legIdx: days[]}, hotels: {stopIdx: hotels[]}}
  function recommend(trip, res, place) {
    const legs = legsOf(trip);
    if (!legs.length) return null;
    const stops = stopsOf(trip, place);
    const vot = {economy: 18, premium: 30, business: 45, first: 60}; // $ value of an hour, for "best value"

    // Candidate options per leg: best offer per (date, from, to, cabin), plus ground.
    const opts = legs.map((l, i) => {
      const map = new Map();
      for (const {job, data} of res.flights) {
        if (job.leg !== i || !data?.offers?.length) continue;
        const best = data.offers[0], nonstop = data.offers.find((o) => o.stops === 0);
        const fastest = [...data.offers].sort((a, b) => a.durationMin - b.durationMin)[0];
        for (const o of [best, nonstop, fastest].filter(Boolean)) {
          const k = `${o.date}|${o.from}|${o.to}|${o.cabin}|${o.stops === 0 ? 'ns' : 'any'}`;
          if (!map.has(k) || map.get(k).price > o.price) map.set(k, {...o, kind: 'flight', leg: i, purpose: job.purpose, sample: !!data.sample});
        }
      }
      const dates = new Set([l.date, ...[...map.values()].map((o) => o.date)]);
      for (const g of groundFor(l.from, l.to)) for (const d of dates) {
        map.set(`ground|${g.op}|${d}`, {kind: 'ground', leg: i, mode: g.mode, op: g.op, price: g.price * (trip.adults || 1), durationMin: g.min, stops: 0,
          date: d, from: l.from, to: l.to, cabin: 'economy', bookUrl: g.url, estimate: true});
      }
      return [...map.values()];
    });

    // Nightly rate per stop: cheapest available within the cap (fallback: cheapest available).
    const stayPick = stops.map((s, i) => {
      const hs = (res.hotels[i] || []).filter((h) => h.available !== false);
      const decent = hs.filter((h) => !h.rating || h.rating >= (trip.minRating ?? 3.5));
      const base = decent.length ? decent : hs;
      const within = trip.nightly ? base.filter((h) => h.pricePerNight <= trip.nightly) : base;
      const pool = within.length ? within : base;
      const cheapest = [...pool].sort((a, b) => a.pricePerNight - b.pricePerNight)[0] || null;
      const value = [...pool].filter((h) => h.rating).sort((a, b) => (b.rating / Math.sqrt(b.pricePerNight)) - (a.rating / Math.sqrt(a.pricePerNight)))[0] || cheapest;
      return {stop: s, cheapest, value, overCap: !within.length && hs.length > 0};
    });
    const rateAfter = (legIdx, which = 'cheapest') => {
      const sp = stayPick.find((p) => p.stop.afterLeg === legIdx);
      return sp && sp[which] ? sp[which].pricePerNight * Math.ceil((trip.adults || 1) / 2) : 0;
    };

    // Dynamic programming over legs: state = date of the previous leg.
    function bestPath(score, allowed = () => true, stayWhich = 'cheapest') {
      let states = new Map([['start', {cost: 0, score: 0, picks: []}]]);
      for (let i = 0; i < legs.length; i++) {
        const next = new Map();
        for (const [prevDate, st] of states) {
          for (const o of opts[i]) {
            if (!allowed(o)) continue;
            if (prevDate !== 'start' && o.date < prevDate) continue;
            const n = prevDate === 'start' ? 0 : nights(prevDate, o.date);
            if (prevDate !== 'start' && i > 0 && n < 0) continue;
            const stay = prevDate === 'start' ? 0 : n * rateAfter(i - 1, stayWhich);
            const cost = st.cost + o.price + stay;
            const sc = st.score + score(o) + stay;
            const prev = next.get(o.date);
            if (!prev || prev.score > sc) next.set(o.date, {cost, score: sc, stay: (st.stay || 0) + stay, picks: [...st.picks, o]});
          }
        }
        states = next;
        if (!states.size) return null;
      }
      return [...states.values()].sort((a, b) => a.score - b.score)[0];
    }

    const exactAllowed = (o) => o.kind === 'flight' && o.purpose === 'exact' && o.cabin === legs[o.leg].cabin && o.from === legs[o.leg].from && o.to === legs[o.leg].to && o.date === legs[o.leg].date;
    const baseline = bestPath((o) => o.price, exactAllowed);
    const cheapest = bestPath((o) => o.price, (o) => o.kind === 'ground' || o.cabin === legs[o.leg].cabin);
    const value = bestPath((o) => o.price + (o.durationMin / 60) * vot[o.cabin || 'economy'] + o.stops * 60, (o) => o.kind === 'ground' || o.cabin === legs[o.leg].cabin, 'value');

    // Most comfortable within budget: try cabin assignments, highest total grade that fits.
    let comfort = null;
    if (trip.budget) {
      const choices = legs.map((l) => [...new Set(opts[legs.indexOf(l)].map((o) => o.kind === 'ground' ? 'ground' : o.cabin))]);
      let combos = [[]];
      choices.forEach((cs) => { combos = combos.flatMap((c) => cs.map((x) => [...c, x])).slice(0, 400); });
      for (const combo of combos) {
        const p = bestPath((o) => o.price, (o) => (o.kind === 'ground' ? 'ground' : o.cabin) === combo[o.leg]);
        if (!p || p.cost > trip.budget) continue;
        const grade = p.picks.reduce((g, o) => g + (o.kind === 'ground' ? 1 : GRADE[o.cabin]) * Math.max(1, o.durationMin / 60), 0);
        if (!comfort || grade > comfort.grade || (grade === comfort.grade && p.cost < comfort.cost)) comfort = {...p, grade};
      }
    }

    // Ticket strategies: round trip to a hub + hop + middle legs.
    const strategies = [];
    if (returnsHome(legs) && legs.length >= 2) {
      const first = legs[0], last = legs[legs.length - 1];
      const middle = cheapest ? cheapest.picks.slice(1, -1) : [];
      const midCost = middle.reduce((t, o) => t + o.price, 0) + (cheapest ? cheapest.stay : 0);
      const hop = (which) => res.flights.find((r) => r.job.purpose === 'hop' && r.job.hop === which)?.data?.offers?.[0];
      for (const r of res.flights.filter((x) => x.job.purpose === 'roundtrip' && x.data?.offers?.length)) {
        const rt = r.data.offers[0], h = r.job.hub === first.to ? hop('end') : hop('start');
        if (r.job.hub !== first.to && r.job.hub !== last.from) continue;
        const needsHop = first.to !== last.from;
        if (needsHop && !h) continue;
        strategies.push({name: `Round trip ${first.from} ⇄ ${r.job.hub}` + (needsHop ? ` + ${h.from} → ${h.to} hop` : ''), cabin: rt.cabin,
          total: rt.price + (needsHop ? h.price : 0) + midCost, stay: cheapest ? cheapest.stay : 0, parts: [rt, ...(needsHop ? [h] : []), ...middle], hub: r.job.hub, sample: !!r.data.sample});
      }
    }

    const explain = (p) => {
      if (!p || !baseline) return [];
      const why = [];
      p.picks.forEach((o, i) => {
        const b = baseline.picks[i], l = legs[i];
        if (o.kind === 'ground') { why.push(`Leg ${i + 1}: ${o.mode}, ${o.op}, instead of flying${b ? ` (${b.price > o.price ? 'saves ' + usd(b.price - o.price) : usd(o.price - b.price) + ' more'}, about ${Math.round(o.durationMin / 60 * 10) / 10} h)` : ''}${o.date !== l.date ? ` on ${nice(o.date)}` : ''}`); return; }
        if (o.date !== l.date) why.push(`Leg ${i + 1}: ${o.kind === 'ground' ? 'go' : 'fly'} ${nice(o.date)} instead of ${nice(l.date)}${i > 0 && i < legs.length - 1 ? ' (shifts how many nights you spend at each stop)' : ''}`);
        if (o.from !== l.from) why.push(`Leg ${i + 1}: depart ${o.from} instead of ${l.from}`);
        if (o.to !== l.to) why.push(`Leg ${i + 1}: land at ${o.to} instead of ${l.to}`);
        if (o.cabin !== l.cabin) why.push(`Leg ${i + 1}: ${CABIN_NAME[o.cabin]} instead of ${CABIN_NAME[l.cabin]}`);
        if (b && o.price < b.price && o.date === l.date && o.from === l.from && o.to === l.to && o.cabin === l.cabin && o.stops !== b.stops) why.push(`Leg ${i + 1}: ${o.stops === 0 ? 'nonstop' : o.stops + '-stop'} option`);
      });
      return why;
    };
    const pack = (id, title, p, blurb) => p && ({id, title, blurb, total: p.cost, flights: p.cost - (p.stay || 0), stay: p.stay || 0, picks: p.picks,
      saves: baseline ? baseline.cost - p.cost : 0, overBudget: trip.budget ? p.cost > trip.budget : false, reasons: explain(p),
      hours: Math.round(p.picks.reduce((t, o) => t + o.durationMin, 0) / 60), sample: p.picks.some((o) => o.sample)});

    const anySeat = bestPath((o) => o.price);
    const picks = [
      pack('baseline', 'Your exact plan', baseline, 'Your dates, airports and seats, cheapest fare on each leg.'),
      anySeat && cheapest && anySeat.cost < cheapest.cost - 1 ? pack('anyseat', 'Cheapest in any seat class', anySeat, 'Ignores your seat choice to show the lowest possible price.') : null,
      pack('cheapest', 'Cheapest with flexible dates', cheapest, 'Separate tickets, lowest total across nearby dates, nearby airports and ground options.'),
      pack('value', 'Best value', value, 'Balances price against travel time and stops.'),
      pack('comfort', 'Most comfort within budget', comfort, 'Highest seat class that keeps the whole trip under your budget.'),
    ].filter(Boolean);
    // One multi-city ticket (+ ground for any legs left out) + the stays on your dates.
    const stayCost = stayPick.reduce((t, sp) => t + (sp.cheapest ? sp.stop.nights * sp.cheapest.pricePerNight * Math.ceil((trip.adults || 1) / 2) : 0), 0);
    for (const r of res.flights.filter((x) => x.job.purpose === 'multicity' && x.data?.offers?.length)) {
      const t = r.data.offers[0], skipped = legs.map((l, i) => i).filter((i) => !r.job.legIdx.includes(i));
      const ground = skipped.map((i) => opts[i].filter((o) => o.kind === 'ground' && o.date === legs[i].date).sort((a, b) => a.price - b.price)[0]);
      if (ground.some((g) => !g)) continue;
      strategies.push({name: skipped.length ? `One ticket for the flights + ${ground.map((g) => g.mode.toLowerCase()).join(' + ')} for ${skipped.map((i) => `${legs[i].from}→${legs[i].to}`).join(', ')}` : 'One multi-city ticket for every flight',
        cabin: t.cabin, total: t.price + ground.reduce((a, g) => a + g.price, 0) + stayCost, stay: stayCost, parts: [t, ...ground], multicity: true, sample: !!r.data.sample});
    }
    strategies.sort((a, b) => a.total - b.total);
    const sepByCabin = {};
    strategies.forEach((s) => {
      const k = `${s.cabin}|${!!s.multicity}`;
      if (!(k in sepByCabin)) {
        // Same seat class, same dates, each flight bought on its own (ground allowed where the strategy uses it).
        const p = s.multicity
          ? bestPath((o) => o.price, (o) => o.date === legs[o.leg].date && (o.kind === 'ground' || o.cabin === s.cabin))
          : bestPath((o) => o.price, (o) => (o.leg === 0 || o.leg === legs.length - 1) ? (o.kind === 'flight' && o.cabin === s.cabin && o.date === legs[o.leg].date) : (o.kind === 'ground' || o.cabin === legs[o.leg].cabin));
        sepByCabin[k] = p ? p.cost : null;
      }
      s.separate = sepByCabin[k];
      s.vsSeparate = s.separate != null ? s.separate - s.total : null;
    });
    // Promote the best ticket combinations to smart picks when they beat the per-leg picks.
    const asPick = (id, title, blurb, st) => ({id, title, blurb, total: st.total, flights: st.total - (st.stay || 0), stay: st.stay || 0, picks: st.parts,
      saves: baseline ? baseline.cost - st.total : 0, overBudget: trip.budget ? st.total > trip.budget : false,
      reasons: [`Book: ${st.name}${st.cabin !== legs[0].cabin ? ` (${CABIN_NAME[st.cabin]})` : ''}`], hours: Math.round(st.parts.reduce((t, o) => t + (o.durationMin || 0), 0) / 60), sample: !!st.sample, strategy: true});
    const inCabin = strategies.find((st) => st.cabin === legs[0].cabin);
    if (inCabin && (!cheapest || inCabin.total < cheapest.cost)) picks.splice(1, 0, asPick('ticket', 'Cheapest ticket combination', 'Fewer, smarter tickets in your seat class: airlines often price these below separate flights.', inCabin));
    const anyStrat = strategies[0];
    if (anyStrat && anyStrat !== inCabin && (!anySeat || anyStrat.total < anySeat.cost)) picks.splice(1, 0, asPick('anyticket', 'Lowest price, any seat class', 'The cheapest way found to do this trip, whatever the seat.', anyStrat));
    // Comfort: a one-ticket fare in a higher class can fit the budget when separate tickets can't.
    if (trip.budget) {
      const fit = strategies.filter((st) => st.total <= trip.budget).sort((a, b) => GRADE[b.cabin] - GRADE[a.cabin] || a.total - b.total)[0];
      const ci = picks.findIndex((p) => p.id === 'comfort');
      const longGrade = (p) => Math.min(...p.picks.filter((o) => o.kind === 'flight' && (o.durationMin || 0) > 360).map((o) => GRADE[o.cabin] || 1), 9);
      if (fit && (ci === -1 || GRADE[fit.cabin] > longGrade(picks[ci]))) {
        const cp = asPick('comfort', 'Most comfort within budget', 'Highest seat class that keeps the whole trip under your budget.', fit);
        if (ci === -1) picks.push(cp); else picks[ci] = cp;
      }
    }
    const anyIdx = picks.findIndex((p) => p.id === 'anyseat');
    if (anyIdx > -1 && anyStrat && anyStrat.total < picks[anyIdx].total) picks.splice(anyIdx, 1);

    // Date insights from the calendar.
    const dateInsights = legs.map((l, i) => {
      const days = (res.calendar[i] || []).filter((d) => Math.abs(nights(l.date, d.date)) <= Math.max(3, trip.flex || 0));
      if (!days.length) return null;
      const yours = days.find((d) => d.date === l.date), low = [...days].sort((a, b) => a.price - b.price)[0];
      const byDow = {};
      days.forEach((d) => { (byDow[dow(d.date)] = byDow[dow(d.date)] || []).push(d.price); });
      return {leg: i, days, yours, low, cheaperBy: yours && low ? yours.price - low.price : 0};
    });

    return {picks, strategies, stays: stayPick, options: opts, dateInsights, legs, stops, baseline: picks[0] || null};
  }

  const api = {planSearches, followUpSearches, recommend, stopsOf, groundFor, NEARBY, GROUND, addDays, nights, nice, dow, usd, GRADE};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RHEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
