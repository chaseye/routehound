/* Partner registry: which outbound sites RouteHound may send people to, how to add your affiliate ID,
 * and which URL parameter carries our click ID so commissions can be matched back to clicks.
 *
 * Fill `params` / `template` once a program approves you. Leave empty to send people without tracking.
 * subid: the parameter each network/brand reports back in its conversion data (check each dashboard).
 * template: a network deep link; {url} = encoded destination, {click} = our click ID.
 */
export const PARTNERS = [
  // ---- Hotels ----
  {id: 'booking', name: 'Booking.com', hosts: ['booking.com'], network: 'direct', params: {aid: ''}, subid: 'label'},
  {id: 'agoda', name: 'Agoda', hosts: ['agoda.com'], network: 'direct', params: {cid: ''}, subid: 'tag'},
  {id: 'expedia', name: 'Expedia', hosts: ['expedia.com'], network: 'expedia', params: {}, subid: null, template: ''},
  {id: 'hotelscom', name: 'Hotels.com', hosts: ['hotels.com'], network: 'expedia', params: {}, subid: null, template: ''},
  {id: 'vrbo', name: 'Vrbo', hosts: ['vrbo.com'], network: 'expedia', params: {}, subid: null, template: ''},
  {id: 'tripcom', name: 'Trip.com', hosts: ['trip.com'], network: 'travelpayouts', params: {}, subid: null, template: ''},
  {id: 'hostelworld', name: 'Hostelworld', hosts: ['hostelworld.com'], network: 'travelpayouts', params: {}, subid: null, template: ''},
  {id: 'priceline', name: 'Priceline', hosts: ['priceline.com'], network: 'cj', params: {}, subid: null, template: ''},
  {id: 'hotwire', name: 'Hotwire', hosts: ['hotwire.com'], network: 'cj', params: {}, subid: null, template: ''},
  {id: 'airbnb', name: 'Airbnb', hosts: ['airbnb.com'], network: 'none', params: {}, subid: null},
  {id: 'hoteltonight', name: 'HotelTonight', hosts: ['hoteltonight.com'], network: 'none', params: {}, subid: null},
  {id: 'trivago', name: 'Trivago', hosts: ['trivago.com'], network: 'none', params: {}, subid: null},
  // ---- Flights ----
  {id: 'google', name: 'Google Flights/Hotels', hosts: ['google.com'], network: 'none', params: {}, subid: null},
  {id: 'kayak', name: 'Kayak', hosts: ['kayak.com'], network: 'cj', params: {}, subid: null, template: ''},
  {id: 'momondo', name: 'Momondo', hosts: ['momondo.com'], network: 'cj', params: {}, subid: null, template: ''},
  {id: 'skyscanner', name: 'Skyscanner', hosts: ['skyscanner.com'], network: 'impact', params: {}, subid: null, template: ''},
  {id: 'kiwi', name: 'Kiwi.com', hosts: ['kiwi.com'], network: 'travelpayouts', params: {}, subid: null, template: ''},
  {id: 'travelocity', name: 'Travelocity', hosts: ['travelocity.com'], network: 'expedia', params: {}, subid: null, template: ''},
  {id: 'hopper', name: 'Hopper', hosts: ['hopper.com'], network: 'none', params: {}, subid: null},
  // ---- Ground ----
  {id: 'omio', name: 'Omio', hosts: ['omio.com'], network: 'travelpayouts', params: {}, subid: null, template: ''},
  {id: '12go', name: '12Go', hosts: ['12go.asia'], network: 'direct', params: {z: ''}, subid: 'sub_id'},
  {id: 'trainline', name: 'Trainline', hosts: ['thetrainline.com'], network: 'awin', params: {}, subid: null, template: ''},
  {id: 'rome2rio', name: 'Rome2rio', hosts: ['rome2rio.com'], network: 'none', params: {}, subid: null},
  // ---- Activities, cars, insurance, eSIM ----
  {id: 'getyourguide', name: 'GetYourGuide', hosts: ['getyourguide.com'], network: 'direct', params: {partner_id: ''}, subid: 'cmp'},
  {id: 'viator', name: 'Viator', hosts: ['viator.com'], network: 'direct', params: {pid: '', mcid: '', medium: 'link'}, subid: 'campaign'},
  {id: 'klook', name: 'Klook', hosts: ['klook.com'], network: 'direct', params: {aid: ''}, subid: null},
  {id: 'discovercars', name: 'Discover Cars', hosts: ['discovercars.com'], network: 'direct', params: {a_aid: ''}, subid: 'data1'},
  {id: 'safetywing', name: 'SafetyWing', hosts: ['safetywing.com'], network: 'direct', params: {referenceID: ''}, subid: null},
  {id: 'airalo', name: 'Airalo', hosts: ['airalo.com'], network: 'direct', params: {}, subid: null, template: ''},
];

/* Network deep-link formats with the click ID slot, for reference when filling `template`:
 *   Awin:          https://www.awin1.com/cread.php?awinmid=MID&awinaffid=YOUR_ID&clickref={click}&ued={url}
 *   CJ:            https://www.anrdoezrs.net/links/YOUR_PID/type/dlg/sid/{click}/{url}
 *   Impact:        https://<brand>.pxf.io/c/YOUR_ID/AD_ID/CAMPAIGN?subId1={click}&u={url}
 *   Travelpayouts: https://tp.media/r?marker=YOUR_MARKER&p=PROGRAM_ID&sub_id={click}&u={url}
 *   Rakuten:       https://click.linksynergy.com/deeplink?id=YOUR_ID&mid=MID&u1={click}&murl={url}
 * Always copy the exact format from your own dashboard's link builder.
 */

/* Every other site RouteHound links to (tourism boards, rail operators, visas…) that /go may redirect to. */
export const EXTRA_HOSTS = [
  'letskorail.com', 'srail.kr', 'kobus.co.kr', 'japanrailpass.net', 'smart-ex.jp', 'japanbusonline.com', 'willerexpress.com',
  '12306.cn', 'mtr.com.hk', 'turbojet.com.hk', 'hzmbus.com', 'thsrc.com.tw', 'railway.gov.tw', 'easybook.com', 'dsvn.vn', 'ktmb.com.my',
  'irctc.co.in', 'redbus.in', 'eurail.com', 'flixbus.com', 'ferryhopper.com', 'blablacar.com', 'buupass.com', 'intercape.co.za',
  'oncf.ma', 'ctm.ma', 'enr.gov.eg', 'metickets.krc.co.ke', 'transportnsw.info', 'greyhound.com.au', 'intercity.co.nz', 'perurail.com',
  'amtrak.com', 'wanderu.com', 'viarail.ca', 'busbud.com', 'bookaway.com', 'directferries.com', 'cp.pt', 'rakuten.com', 'travel.rakuten.com',
  'jalan.net', 'yanolja.com', 'ratepunk.com', 'going.com', 'dollarflightclub.com', 'thriftytraveler.com', 'secretflying.com',
  'theflightdeal.com', 'jacksflightclub.com', 'travelzoo.com', 'topcashback.com', 'costcotravel.com', 'aaa.com',
  // tourism boards
  'visitkorea.or.kr', 'japan.travel', 'discoverhongkong.com', 'macaotourism.gov.mo', 'taiwan.net.tw', 'tourismthailand.org', 'vietnam.travel',
  'visitsingapore.com', 'malaysia.travel', 'philippines.travel', 'indonesia.travel', 'visitbritain.com', 'ireland.com', 'france.fr', 'italia.it',
  'spain.info', 'visitportugal.com', 'visitgreece.gr', 'germany.travel', 'holland.com', 'myswitzerland.com', 'austria.info', 'visiticeland.com',
  'visitmorocco.com', 'egypt.travel', 'magicalkenya.com', 'southafrica.net', 'tanzaniatourism.go.tz', 'visitrwanda.com', 'visitdubai.com',
  'australia.com', 'newzealand.com', 'visitmexico.com', 'visittheusa.com',
  // entry requirements
  'k-eta.go.kr', 'vjw-lp.digital.go.jp', 'immd.gov.hk', 'fsm.gov.mo', 'consular.mfa.gov.cn', 'nia.gov.cn', 'boca.gov.tw', 'etravel.gov.ph',
  'gov.uk', 'travel-europe.europa.eu', 'etakenya.go.ke', 'indianvisaonline.gov.in', 'evisa.gov.vn', 'visa2egypt.gov.eg',
  'immi.homeaffairs.gov.au', 'canada.ca', 'travel.state.gov', 'iatatravelcentre.com',
  // video and social searches
  'youtube.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'x.com', 'pinterest.com',
];

/* Typical payout as a share of the booking value, used only to flag commissions that look too low.
 * Rough public figures; replace with the rates in your own contracts. */
export const EXPECTED_RATE = {booking: 0.04, agoda: 0.05, expedia: 0.03, hotelscom: 0.04, vrbo: 0.02, tripcom: 0.04, hostelworld: 0.05,
  priceline: 0.02, getyourguide: 0.08, viator: 0.08, klook: 0.03, discovercars: 0.06, '12go': 0.05, omio: 0.03, trainline: 0.01,
  kiwi: 0.03, safetywing: 0.1, airalo: 0.1};

export function partnerFor(host) {
  host = host.toLowerCase();
  return PARTNERS.find((p) => p.hosts.some((h) => host === h || host.endsWith('.' + h))) || null;
}
export function allowedHost(host) {
  host = host.toLowerCase();
  return !!partnerFor(host) || EXTRA_HOSTS.some((h) => host === h || host.endsWith('.' + h)) || host.endsWith('.gov');
}

/* Your affiliate IDs can live in a Cloudflare variable instead of this file, so no code change is needed:
 *   AFFILIATE_IDS = {"booking": {"aid": "1234567"}, "kayak": {"template": "https://www.anrdoezrs.net/links/PID/type/dlg/sid/{click}/{url}"}}
 * Keys are partner ids above; values set params (by name) and/or template. Variable values win over this file. */
export function withEnvIds(p, env) {
  if (!p || !env?.AFFILIATE_IDS) return p;
  let all;
  try { all = typeof env.AFFILIATE_IDS === 'string' ? JSON.parse(env.AFFILIATE_IDS) : env.AFFILIATE_IDS; } catch (e) { return p; }
  const o = all?.[p.id];
  if (!o || typeof o !== 'object') return p;
  const {template, subid, ...params} = o;
  return {...p, params: {...p.params, ...params}, template: template ?? p.template, subid: subid ?? p.subid};
}

/* Build the affiliate URL for a destination, embedding our click ID where the partner reports it back. */
export function affiliateUrl(dest, clickId, env) {
  const u = new URL(dest), p = withEnvIds(partnerFor(u.hostname), env);
  if (!p) return {url: u.toString(), partner: null, tracked: false};
  if (p.template) return {url: p.template.replace('{url}', encodeURIComponent(u.toString())).replace('{click}', encodeURIComponent(clickId)), partner: p, tracked: true};
  let tracked = false;
  for (const [k, v] of Object.entries(p.params || {})) if (v) { u.searchParams.set(k, v); tracked = true; }
  if (tracked && p.subid) u.searchParams.set(p.subid, clickId);
  return {url: u.toString(), partner: p, tracked};
}
