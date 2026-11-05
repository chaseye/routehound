import assert from 'node:assert/strict';
import {affiliateUrl, allowedHost} from '../lib/partners.js';
import {parseCsv, mapRows, normStatus, brandPartner, toCsv} from '../lib/ledger.js';

const env = {AFFILIATE_IDS: JSON.stringify({booking: {aid: '123'}, kayak: {template: 'https://n.example/sid/{click}/{url}'}})};
let r = affiliateUrl('https://www.booking.com/hotel/x.html?a=1', 'rhABCDEFGH', env);
assert.equal(r.url, 'https://www.booking.com/hotel/x.html?a=1&aid=123&label=rhABCDEFGH'); assert.ok(r.tracked);
r = affiliateUrl('https://www.kayak.com/flights', 'rhX', env);
assert.equal(r.url, 'https://n.example/sid/rhX/https%3A%2F%2Fwww.kayak.com%2Fflights');
r = affiliateUrl('https://www.agoda.com/', 'rhX', env); assert.equal(r.tracked, false);
assert.ok(!allowedHost('evil.example')); assert.ok(!allowedHost('booking.com.evil.io')); assert.ok(allowedHost('secure.booking.com'));

const rows = parseCsv('Transaction ID,Click Ref,Advertiser,Status,Sale Amount,Commission\r\n"T1",rhAAAAAAAAAA,"Booking.com",Approved,"1,200.00",48\nT2,,KAYAK US,declined,90,1\n');
const m = mapRows(rows, 'awin');
assert.equal(m.length, 2); assert.equal(m[0].click_id, 'rhAAAAAAAAAA'); assert.equal(m[0].partner, 'booking'); assert.equal(m[0].network_ref, 'T1');
assert.equal(m[1].partner, 'kayak'); assert.equal(normStatus(m[1].status), 'reversed');
assert.equal(normStatus('Locked'), 'paid'); assert.equal(normStatus('open'), 'pending');
assert.equal(brandPartner('Nobody Inc'), null);
assert.equal(toCsv(['a', 'b'], [{a: 'x,y', b: 'q"'}]), 'a,b\n"x,y","q"""');
console.log('all ledger checks passed');
