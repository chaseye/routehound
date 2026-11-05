/* RouteHound app: builds comparison links for flights, ground transport and stays from a typed itinerary. */
(function(){
  const $ = s => document.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (v != null) n.setAttribute(k, v);
    }
    kids.flat().forEach(k => n.append(k));
    return n;
  };
  const link = (text, href, cls) => el('a', {href, target:'_blank', rel:'noopener sponsored', class: cls || 'chip'}, text);
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const nice = s => new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', timeZone:'UTC'});
  const nightsBetween = (a, b) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 864e5));
  const city = c => (RH.AIRPORTS[c] || [c])[0];
  const country = c => (RH.AIRPORTS[c] || [])[1];
  const slug = c => (RH.AIRPORTS[c] || [, , c.toLowerCase()])[2];

  const SAMPLE = {
    legs: [
      {from:'ORD', to:'ICN', date:'2027-01-08', cabin:'business'},
      {from:'ICN', to:'CAN', date:'2027-01-13', cabin:'economy'},
      {from:'CAN', to:'HKG', date:'2027-01-18', cabin:'economy'},
      {from:'HKG', to:'ORD', date:'2027-01-24', cabin:'business'},
    ],
    adults: 1, budget: 6000, nightly: 150, flex: 2,
  };
  const store = {
    get(){ try { return JSON.parse(localStorage.getItem('rh-trip') || 'null'); } catch(e) { return null; } },
    set(v){ try { localStorage.setItem('rh-trip', JSON.stringify(v)); } catch(e) {} },
  };
  let trip = store.get() || JSON.parse(JSON.stringify(SAMPLE));
  const save = () => store.set(trip);
  const valid = l => /^[A-Z]{3}$/.test(l.from) && /^[A-Z]{3}$/.test(l.to) && /^\d{4}-\d{2}-\d{2}$/.test(l.date);

  /* ---------- Tabs ---------- */
  const TABS = ['plan', 'deals', 'explore', 'entry', 'partners'];
  function showTab(){
    const t = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'plan';
    TABS.forEach(id => { $('#' + id).hidden = id !== t; });
    document.querySelectorAll('.tabs a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + t ? 'page' : 'false'));
  }
  window.addEventListener('hashchange', showTab);

  /* ---------- Itinerary form ---------- */
  const CABINS = {business:'Business', premium:'Premium economy', economy:'Economy', first:'First'};
  function renderLegs(){
    const box = $('#legs'); box.replaceChildren();
    trip.legs.forEach((l, i) => {
      const row = el('div', {class:'leg'});
      const num = el('span', {class:'leg-n', text: String(i + 1).padStart(2, '0')});
      const mk = (id, label, input) => el('label', {class:'field', for:id}, el('span', {class:'lbl', text:label}), input);
      const from = el('input', {id:'from' + i, class:'code', maxlength:'3', value:l.from, 'aria-label':'From airport'});
      const to = el('input', {id:'to' + i, class:'code', maxlength:'3', value:l.to});
      const date = el('input', {id:'date' + i, type:'date', value:l.date});
      const cab = el('select', {id:'cab' + i}, Object.entries(CABINS).map(([k, v]) => { const o = el('option', {value:k, text:v}); if (k === l.cabin) o.selected = true; return o; }));
      const hint = el('span', {class:'leg-city', text: valid(l) ? `${city(l.from)} → ${city(l.to)}` : 'Use 3-letter airport codes'});
      const rm = el('button', {type:'button', class:'ghost', 'aria-label':`Remove leg ${i + 1}`, text:'Remove'});
      rm.disabled = trip.legs.length < 2;
      rm.addEventListener('click', () => { trip.legs.splice(i, 1); save(); renderLegs(); renderPlan(); });
      [from, to, date, cab].forEach(inp => inp.addEventListener('input', () => {
        l.from = from.value.trim().toUpperCase(); l.to = to.value.trim().toUpperCase(); l.date = date.value; l.cabin = cab.value;
        hint.textContent = valid(l) ? `${city(l.from)} → ${city(l.to)}` : 'Use 3-letter airport codes';
        save(); schedule();
      }));
      row.append(num, mk('from' + i, 'From', from), mk('to' + i, 'To', to), mk('date' + i, 'Date', date), mk('cab' + i, 'Seat', cab), rm, hint);
      box.append(row);
    });
  }
  let t = null; const schedule = () => { clearTimeout(t); t = setTimeout(renderPlan, 300); };

  function bindOptions(){
    ['adults', 'budget', 'nightly', 'flex'].forEach(k => {
      const inp = $('#' + k); inp.value = trip[k];
      inp.addEventListener('input', () => { trip[k] = +inp.value || 0; save(); schedule(); });
    });
    $('#add').addEventListener('click', () => {
      const last = trip.legs[trip.legs.length - 1] || {};
      trip.legs.push({from: last.to || '', to:'', date: last.date ? addDays(last.date, 3) : '', cabin:'economy'});
      save(); renderLegs(); renderPlan();
    });
    $('#reset').addEventListener('click', () => { trip = JSON.parse(JSON.stringify(SAMPLE)); save(); bindValues(); renderLegs(); renderPlan(); });
    $('#trip').addEventListener('submit', e => { e.preventDefault(); renderPlan(); $('#plan-out').scrollIntoView({behavior:'smooth', block:'start'}); });
  }
  function bindValues(){ ['adults', 'budget', 'nightly', 'flex'].forEach(k => { $('#' + k).value = trip[k]; }); }

  /* ---------- Plan output ---------- */
  function flightLinks(l, extra = {}){
    const leg = {...l, adults: Math.max(1, trip.adults || 1), ...extra};
    return RH.FLIGHT_SITES.map(s => link(s.name, s.url(leg), s.name === 'Google Flights' ? 'chip primary' : 'chip'));
  }
  function groundLinks(l){
    const r = RH.REGION(country(l.from)) === RH.REGION(country(l.to)) ? RH.REGION(country(l.to)) : null;
    const sites = [...(r ? RH.GROUND[r] || [] : []), ...RH.GROUND.global];
    const seen = new Set();
    return sites.filter(s => !seen.has(s.name) && seen.add(s.name)).map(s => {
      const href = s.url(s.name === 'Rome2rio' ? city(l.from) : slug(l.from), s.name === 'Rome2rio' ? city(l.to) : slug(l.to));
      return el('li', {}, link(s.name, href, 'textlink'), el('span', {class:'muted', text:' ' + s.what}));
    });
  }
  function stayLinks(stop){
    const regional = RH.STAYS_REGIONAL[RH.REGION(country(stop.code))] || [];
    const seen = new Set();
    return [...RH.STAYS, ...regional].filter(s => !seen.has(s.name) && seen.add(s.name)).map(s => link(s.name, s.url(stop), s.name === 'Google Hotels' ? 'chip primary' : 'chip'));
  }

  function renderPlan(){
    const out = $('#plan-out'); out.replaceChildren();
    const legs = trip.legs.filter(valid);
    if (!legs.length) { out.append(el('p', {class:'muted', text:'Add at least one leg with airport codes and a date.'})); return; }

    // Summary strip
    const home = legs[0].from, back = legs[legs.length - 1].to === home;
    const totalNights = back ? nightsBetween(legs[0].date, legs[legs.length - 1].date) : null;
    out.append(el('div', {class:'summary'},
      el('div', {}, el('span', {class:'lbl', text:'Route'}), el('strong', {class:'code', text: [legs[0].from, ...legs.map(l => l.to)].join(' → ')})),
      el('div', {}, el('span', {class:'lbl', text:'Dates'}), el('strong', {text:`${nice(legs[0].date)} – ${nice(legs[legs.length - 1].date)}`})),
      el('div', {}, el('span', {class:'lbl', text:'Nights'}), el('strong', {text: totalNights != null ? String(totalNights) : '—'})),
      el('div', {}, el('span', {class:'lbl', text:'Budget'}), el('strong', {text: trip.budget ? '$' + trip.budget.toLocaleString() + ' per person' : 'Not set'}))));

    // Legs
    legs.forEach((l, i) => {
      const card = el('section', {class:'card'});
      card.append(el('header', {class:'card-h'},
        el('h3', {}, el('span', {class:'code', text:`${l.from} → ${l.to}`}), ' ', el('span', {class:'muted', text:`${city(l.from)} to ${city(l.to)}`})),
        el('span', {class:'pill', text:`${nice(l.date)} · ${CABINS[l.cabin]}`})));
      card.append(el('h4', {text:'Fly'}), el('div', {class:'chips'}, flightLinks(l)));
      if (trip.flex) {
        const days = el('div', {class:'dates'});
        for (let k = -trip.flex; k <= trip.flex; k++) {
          const d = addDays(l.date, k);
          days.append(link(nice(d) + (k === 0 ? ' · yours' : ''), RH.FLIGHT_SITES[0].url({...l, date:d, adults: trip.adults}), 'date' + (k === 0 ? ' sel' : '')));
        }
        card.append(el('p', {class:'muted small', text:'Nearby dates on Google Flights. The weekday you fly can change the price a lot.'}), days);
      }
      card.append(el('h4', {text:'Train, bus or ferry instead'}), el('ul', {class:'ground'}, groundLinks(l)));
      out.append(card);

      // Stay between this leg and the next
      const next = legs[i + 1];
      if (next) {
        const nights = nightsBetween(l.date, next.date);
        if (nights > 0) {
          const stop = {code:l.to, city: city(l.to), checkin: l.date, checkout: next.date, nights, adults: Math.max(1, trip.adults || 1), maxNight: trip.nightly || 0};
          const s = el('section', {class:'card stay'});
          s.append(el('header', {class:'card-h'},
            el('h3', {}, 'Stay in ', el('span', {text: city(l.to)})),
            el('span', {class:'pill', text:`${nice(l.date)} – ${nice(next.date)} · ${nights} night${nights > 1 ? 's' : ''}`})));
          if (trip.nightly) s.append(el('p', {class:'muted small', text:`Budget up to $${trip.nightly}/night, about $${(trip.nightly * nights).toLocaleString()} here. Booking.com, Agoda and Airbnb links apply the cap.`}));
          s.append(el('div', {class:'chips'}, stayLinks(stop)));
          out.append(s);
        }
      }
    });

    // Strategies
    if (back && legs.length >= 2) {
      const first = legs[0], last = legs[legs.length - 1], A = first.to, Z = last.from;
      const st = el('section', {class:'card strat'});
      st.append(el('header', {class:'card-h'}, el('h3', {text:'Ticket strategies to compare'})));
      const rows = [
        ['Separate one-ways', 'Book each flight on its own (links above). Simple, and open-jaw routes avoid backtracking.', []],
        [`Round trip to ${city(A)}`, `Book ${home} ⇄ ${A} as one round trip, then a cheap one-way ${city(Z)} → ${city(A)} the day before you fly home.`,
          [...flightLinks({...first, to:A, ret:last.date}).slice(0, 3), link(`${Z} → ${A} one-way`, RH.FLIGHT_SITES[0].url({from:Z, to:A, date: addDays(last.date, -1), cabin:'economy', adults: trip.adults}))]],
        Z !== A ? [`Round trip to ${city(Z)}`, `Book ${home} ⇄ ${Z} as one round trip, then hop ${city(Z)} → ${city(A)} at the start.`,
          [...flightLinks({...first, to:Z, ret:last.date}).slice(0, 3), link(`${Z} → ${A} one-way`, RH.FLIGHT_SITES[0].url({from:Z, to:A, date: addDays(first.date, 2), cabin:'economy', adults: trip.adults}))]] : null,
      ].filter(Boolean);
      rows.forEach(([name, how, links]) => st.append(el('div', {class:'strat-row'}, el('h4', {text:name}), el('p', {class:'muted', text:how}), links.length ? el('div', {class:'chips'}, links) : '')));
      st.append(el('p', {class:'small warn', text:'Separate tickets aren’t protected if one flight is late: leave a buffer day before long flights, and check bag fees on low-cost airlines. Never skip the last leg of a round trip.'}));
      out.append(st);
    }
    renderExplore(); renderEntry();
  }

  /* ---------- Deals ---------- */
  function renderDeals(){
    const box = $('#deal-list'); box.replaceChildren();
    RH.DEALS.forEach(d => {
      const social = el('div', {class:'chips tight'}, RH.SOCIAL.slice(0, 4).map(s => link(s.name, s.url(d.name.split(' (')[0] + ' promo code'), 'chip small')));
      box.append(el('article', {class:'card deal'},
        el('header', {class:'card-h'}, el('h3', {}, link(d.name, d.url, 'textlink strong')), el('span', {class:'pill', text:d.kind})),
        el('p', {class:'muted', text:d.note}),
        el('span', {class:'lbl', text:'Find current promos'}), social));
    });
  }

  /* ---------- Explore: tourism boards, trends, videos ---------- */
  function renderExplore(){
    const codes = [...new Set(trip.legs.filter(valid).map(l => l.to).filter(c => c !== trip.legs[0].from))];
    const fam = $('#family').checked;
    const box = $('#explore-places'); box.replaceChildren();
    codes.forEach(c => {
      const name = city(c), cc = country(c);
      const q = `${name} travel ${fam ? 'family friendly' : 'guide'} 2027`;
      box.append(el('article', {class:'card'},
        el('header', {class:'card-h'}, el('h3', {text:name}), el('span', {class:'pill', text: RH.COUNTRY_NAMES[cc] || ''})),
        RH.TOURISM[cc] ? el('p', {}, link('Official tourism site', RH.TOURISM[cc], 'textlink strong')) : '',
        el('span', {class:'lbl', text: fam ? 'Family-friendly videos and posts' : 'Videos and posts'}),
        el('div', {class:'chips'}, RH.SOCIAL.map(s => link(s.name, s.url(s.name === 'Instagram' ? name + 'travel' : q)))),
        el('span', {class:'lbl', text:'Trending now'}),
        el('div', {class:'chips'}, [
          link('Hidden gems', RH.SOCIAL[2].url(`${name} hidden gems`)),
          link('Street food', RH.SOCIAL[1].url(`${name} street food`)),
          link('Budget tips', RH.SOCIAL[2].url(`${name} on a budget`)),
          link('Getting around', RH.SOCIAL[2].url(`${name} public transport guide`)),
        ])));
    });
  }
  function renderTrends(){
    $('#trend-list').replaceChildren(...RH.TRENDS.map(t => el('li', {}, el('strong', {text:t.name}), el('span', {class:'muted', text:` ${t.note} `}), el('span', {class:'src', text:t.src}))));
    $('#hotspots').replaceChildren(...RH.HOTSPOTS.map(h => link(h, RH.SOCIAL[2].url(h + ' travel guide'))));
  }

  /* ---------- Entry requirements ---------- */
  function renderEntry(){
    const us = $('#passport').value === 'US';
    const ccs = [...new Set(trip.legs.filter(valid).flatMap(l => [l.from, l.to]).map(country).filter(Boolean))].filter(c => c !== 'US' || !us);
    const box = $('#entry-list'); box.replaceChildren();
    ccs.forEach(cc => {
      const info = RH.ENTRY[cc] || (RH.SCHENGEN.includes(cc) ? RH.ENTRY.EU : null);
      const state = 'https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages.html';
      const card = el('article', {class:'card'},
        el('header', {class:'card-h'}, el('h3', {text: RH.COUNTRY_NAMES[cc] || cc}),
          el('span', {class:'pill ' + (us ? (info ? (info.tag === 'ok' ? 'ok' : 'act') : 'act') : 'act'), text: us ? (info && info.tag === 'ok' ? 'Nothing to apply for' : 'Check before you go') : 'Check for your passport'})),
        el('p', {text: us ? (info ? info.head : 'Check the official rules for US passports.') : 'Rules depend on your nationality.'}),
        el('div', {class:'chips'}, [...(info ? info.links.map(([t, u]) => link(t, u)) : []), us ? link('US State Dept country page', state) : '', link('IATA Travel Centre', 'https://www.iatatravelcentre.com/')].filter(Boolean)));
      box.append(card);
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    bindValues(); bindOptions(); renderLegs(); renderPlan(); renderDeals(); renderTrends(); showTab();
    $('#family').addEventListener('change', renderExplore);
    $('#passport').addEventListener('change', renderEntry);
    $('#year').textContent = new Date().getFullYear();
  });
})();
