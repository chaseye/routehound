/* Outbound links. When the site runs on Cloudflare (with functions), every external link is sent through
 * RouteHound's /go redirect at click time. /go logs the click with its own ID, adds the affiliate ID and that
 * click ID (affiliate IDs live server-side in lib/partners.js), then sends the traveler straight to the partner,
 * which sets its referral cookie. Without a backend (plain static copy) links open directly.
 *
 * Context sent with each click: placement (which part of the page), route, seat class, price shown, search ID.
 */
(function () {
  const PRICE = /\$\s?([\d,]+)/;
  const placementOf = (a) => {
    const t = a.closest('[data-pl]');
    if (t) return t.dataset.pl;
    const s = a.closest('section[id]');
    return s ? s.id : 'other';
  };
  const priceOf = (a) => {
    if (a.dataset.price) return a.dataset.price;
    const row = a.closest('li, tr, .card');
    const n = row && row.querySelector('.num');
    const m = n && PRICE.exec(n.textContent);
    return m ? m[1].replace(/,/g, '') : '';
  };
  let pending = null; // last tracked partner click, for the "did you book?" prompt

  function goUrl(a) {
    const ctx = window.RH_CTX || {};
    const q = new URLSearchParams({u: a.href, pl: placementOf(a)});
    if (ctx.s) q.set('s', ctx.s);
    if (ctx.r) q.set('r', ctx.r);
    if (ctx.c) q.set('c', ctx.c);
    const p = priceOf(a);
    if (p) q.set('p', p);
    return '/go?' + q.toString();
  }
  function handler(e) {
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (!a || !window.RH_BACKEND) return;
    let u;
    try { u = new URL(a.href); } catch (err) { return; }
    if (u.origin === location.origin) return;
    a.dataset.dest = a.dataset.dest || a.href;
    a.href = goUrl(a);
    if (a.rel.includes('sponsored')) pending = {host: u.hostname.replace(/^www\./, ''), at: Date.now()};
    // Put the real address back afterwards so hovering/copying shows the partner site.
    setTimeout(() => { a.href = a.dataset.dest; }, 500);
  }
  document.addEventListener('click', handler, true);
  document.addEventListener('auxclick', handler, true);

  /* When the traveler comes back to the tab after a few minutes on a partner site, offer an optional
   * "I booked this" note. It is evidence if a network misses a commission, and helps us see what converts. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !pending || Date.now() - pending.at < 90 * 1000 || document.querySelector('.booked-ask')) return;
    const p = pending; pending = null;
    const box = document.createElement('div');
    box.className = 'booked-ask card';
    box.innerHTML = `<p><strong>Did you book on ${p.host.replace(/[<>&"]/g, '')}?</strong> Optional — it helps keep RouteHound free.</p>
      <form><input name="order_ref" placeholder="Confirmation number (optional)" maxlength="60">
      <input name="amount" type="number" min="0" step="1" placeholder="Total paid, USD (optional)">
      <div class="chips"><button class="primary" type="submit">Yes, I booked</button><button type="button" data-x>No / not yet</button></div></form>`;
    document.body.append(box);
    box.querySelector('[data-x]').onclick = () => box.remove();
    box.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await fetch('/api/bookings', {method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({host: p.host, order_ref: f.get('order_ref'), amount: f.get('amount')})});
      } catch (err) { /* optional */ }
      box.innerHTML = '<p><strong>Thanks!</strong> Have a great trip.</p>';
      setTimeout(() => box.remove(), 2500);
    };
  });
})();
