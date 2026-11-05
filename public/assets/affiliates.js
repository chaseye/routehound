/* Affiliate settings. Paste your IDs after each program approves you; empty values leave links untouched.
 * Every outbound link is checked when clicked, so new links anywhere on the site are tracked automatically.
 *
 * params:    add query parameters for that site (name → your ID)
 * templates: wrap the link in a network's deep-link format; put {url} where the encoded destination goes.
 *            Copy the exact format from the network's link builder (Awin, CJ, Impact, Travelpayouts …).
 */
window.RH_AFFILIATES = {
  params: {
    'booking.com':     {aid: ''},                         // Booking.com Affiliate Partner Programme
    'agoda.com':       {cid: ''},                         // Agoda Partners
    'getyourguide.com':{partner_id: ''},                  // GetYourGuide Partner Program
    'viator.com':      {pid: '', mcid: '', medium: ''},   // Viator Affiliate Program
    'klook.com':       {aid: ''},                         // Klook Affiliate
    'discovercars.com':{a_aid: ''},                       // Discover Cars Affiliate
    'safetywing.com':  {referenceID: ''},                 // SafetyWing Ambassador
    'airalo.com':      {},                                // Airalo Partners (usually via a template)
  },
  templates: {
    // Examples (replace with the exact format your network gives you):
    // 'kayak.com':   'https://www.anrdoezrs.net/links/YOUR_CJ_PID/type/dlg/{url}',
    // 'expedia.com': 'https://YOUR-EXPEDIA-CREATOR-LINK?url={url}',
    // 'trip.com':    'https://tp.media/r?marker=YOUR_MARKER&p=YOUR_PROGRAM_ID&u={url}',
  },
};

(function () {
  const cfg = window.RH_AFFILIATES;
  const match = (host, table) => Object.keys(table).find((d) => host === d || host.endsWith('.' + d));
  function rewrite(href) {
    let u;
    try { u = new URL(href); } catch (e) { return href; }
    if (u.origin === location.origin) return href;
    const host = u.hostname.toLowerCase();
    const t = match(host, cfg.templates);
    if (t && cfg.templates[t]) return cfg.templates[t].replace('{url}', encodeURIComponent(u.toString()));
    const p = match(host, cfg.params);
    if (p) for (const [k, v] of Object.entries(cfg.params[p])) if (v) u.searchParams.set(k, v);
    return u.toString();
  }
  window.RH_AFFILIATES.rewrite = rewrite;
  // Rewrite on click (and middle-click) so every link on the page is covered.
  const handler = (e) => {
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (a) a.href = rewrite(a.href);
  };
  document.addEventListener('click', handler, true);
  document.addEventListener('auxclick', handler, true);
})();
