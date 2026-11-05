/* RouteHound data: airports, booking sources, deal programs, tourism boards, entry rules.
   Everything here is plain data so it can be edited without touching the app code. */

window.RH = window.RH || {};

/* IATA code -> [city, country code, city slug used by ground-transport sites] */
RH.AIRPORTS = {
  // North America
  ORD:['Chicago','US','chicago'], MDW:['Chicago','US','chicago'], JFK:['New York','US','new-york'], EWR:['Newark','US','new-york'], LGA:['New York','US','new-york'],
  LAX:['Los Angeles','US','los-angeles'], SFO:['San Francisco','US','san-francisco'], SEA:['Seattle','US','seattle'], BOS:['Boston','US','boston'],
  IAD:['Washington','US','washington'], DCA:['Washington','US','washington'], ATL:['Atlanta','US','atlanta'], DFW:['Dallas','US','dallas'],
  IAH:['Houston','US','houston'], MIA:['Miami','US','miami'], DEN:['Denver','US','denver'], SAN:['San Diego','US','san-diego'], LAS:['Las Vegas','US','las-vegas'],
  MSP:['Minneapolis','US','minneapolis'], DTW:['Detroit','US','detroit'], PHL:['Philadelphia','US','philadelphia'], HNL:['Honolulu','US','honolulu'],
  YYZ:['Toronto','CA','toronto'], YVR:['Vancouver','CA','vancouver'], YUL:['Montreal','CA','montreal'], MEX:['Mexico City','MX','mexico-city'], CUN:['Cancun','MX','cancun'],
  // East Asia
  ICN:['Seoul','KR','seoul'], GMP:['Seoul','KR','seoul'], PUS:['Busan','KR','busan'], CJU:['Jeju','KR','jeju'],
  NRT:['Tokyo','JP','tokyo'], HND:['Tokyo','JP','tokyo'], KIX:['Osaka','JP','osaka'], ITM:['Osaka','JP','osaka'], CTS:['Sapporo','JP','sapporo'],
  FUK:['Fukuoka','JP','fukuoka'], NGO:['Nagoya','JP','nagoya'], OKA:['Okinawa','JP','okinawa'], UKB:['Kobe','JP','kobe'],
  HKG:['Hong Kong','HK','hong-kong'], MFM:['Macau','MO','macau'], TPE:['Taipei','TW','taipei'], KHH:['Kaohsiung','TW','kaohsiung'],
  CAN:['Guangzhou','CN','guangzhou'], SZX:['Shenzhen','CN','shenzhen'], PEK:['Beijing','CN','beijing'], PKX:['Beijing','CN','beijing'],
  PVG:['Shanghai','CN','shanghai'], SHA:['Shanghai','CN','shanghai'], CTU:['Chengdu','CN','chengdu'], XIY:["Xi'an",'CN','xian'], HGH:['Hangzhou','CN','hangzhou'],
  KWL:['Guilin','CN','guilin'], CKG:['Chongqing','CN','chongqing'],
  // Southeast & South Asia
  BKK:['Bangkok','TH','bangkok'], DMK:['Bangkok','TH','bangkok'], HKT:['Phuket','TH','phuket'], CNX:['Chiang Mai','TH','chiang-mai'],
  SGN:['Ho Chi Minh City','VN','ho-chi-minh-city'], HAN:['Hanoi','VN','hanoi'], DAD:['Da Nang','VN','da-nang'],
  SIN:['Singapore','SG','singapore'], KUL:['Kuala Lumpur','MY','kuala-lumpur'], PEN:['Penang','MY','penang'],
  MNL:['Manila','PH','manila'], CEB:['Cebu','PH','cebu'], DPS:['Bali','ID','bali'], CGK:['Jakarta','ID','jakarta'],
  PNH:['Phnom Penh','KH','phnom-penh'], REP:['Siem Reap','KH','siem-reap'], DEL:['Delhi','IN','delhi'], BOM:['Mumbai','IN','mumbai'], CMB:['Colombo','LK','colombo'],
  // Middle East
  DXB:['Dubai','AE','dubai'], AUH:['Abu Dhabi','AE','abu-dhabi'], DOH:['Doha','QA','doha'], IST:['Istanbul','TR','istanbul'], TLV:['Tel Aviv','IL','tel-aviv'], AMM:['Amman','JO','amman'],
  // Europe
  LHR:['London','GB','london'], LGW:['London','GB','london'], STN:['London','GB','london'], EDI:['Edinburgh','GB','edinburgh'], DUB:['Dublin','IE','dublin'],
  CDG:['Paris','FR','paris'], ORY:['Paris','FR','paris'], NCE:['Nice','FR','nice'], AMS:['Amsterdam','NL','amsterdam'], BRU:['Brussels','BE','brussels'],
  FRA:['Frankfurt','DE','frankfurt'], MUC:['Munich','DE','munich'], BER:['Berlin','DE','berlin'], ZRH:['Zurich','CH','zurich'], GVA:['Geneva','CH','geneva'],
  VIE:['Vienna','AT','vienna'], INN:['Innsbruck','AT','innsbruck'], PRG:['Prague','CZ','prague'], BUD:['Budapest','HU','budapest'], WAW:['Warsaw','PL','warsaw'], KRK:['Krakow','PL','krakow'],
  FCO:['Rome','IT','rome'], MXP:['Milan','IT','milan'], VCE:['Venice','IT','venice'], NAP:['Naples','IT','naples'], FLR:['Florence','IT','florence'],
  MAD:['Madrid','ES','madrid'], BCN:['Barcelona','ES','barcelona'], AGP:['Malaga','ES','malaga'], PMI:['Palma','ES','palma'],
  LIS:['Lisbon','PT','lisbon'], OPO:['Porto','PT','porto'], ATH:['Athens','GR','athens'], JTR:['Santorini','GR','santorini'], JMK:['Mykonos','GR','mykonos'],
  CPH:['Copenhagen','DK','copenhagen'], ARN:['Stockholm','SE','stockholm'], OSL:['Oslo','NO','oslo'], HEL:['Helsinki','FI','helsinki'], KEF:['Reykjavik','IS','reykjavik'],
  DBV:['Dubrovnik','HR','dubrovnik'], SPU:['Split','HR','split'],
  // Africa
  CMN:['Casablanca','MA','casablanca'], RAK:['Marrakech','MA','marrakech'], FEZ:['Fes','MA','fes'], CAI:['Cairo','EG','cairo'], HRG:['Hurghada','EG','hurghada'],
  NBO:['Nairobi','KE','nairobi'], MBA:['Mombasa','KE','mombasa'], JRO:['Kilimanjaro','TZ','arusha'], ZNZ:['Zanzibar','TZ','zanzibar'], DAR:['Dar es Salaam','TZ','dar-es-salaam'],
  ADD:['Addis Ababa','ET','addis-ababa'], KGL:['Kigali','RW','kigali'], EBB:['Entebbe','UG','kampala'],
  JNB:['Johannesburg','ZA','johannesburg'], CPT:['Cape Town','ZA','cape-town'], DUR:['Durban','ZA','durban'], VFA:['Victoria Falls','ZW','victoria-falls'],
  LOS:['Lagos','NG','lagos'], ACC:['Accra','GH','accra'], DSS:['Dakar','SN','dakar'], TUN:['Tunis','TN','tunis'], MRU:['Mauritius','MU','mauritius'], SEZ:['Seychelles','SC','seychelles'],
  // Oceania & Latin America
  SYD:['Sydney','AU','sydney'], MEL:['Melbourne','AU','melbourne'], ADL:['Adelaide','AU','adelaide'], AKL:['Auckland','NZ','auckland'],
  GRU:['Sao Paulo','BR','sao-paulo'], GIG:['Rio de Janeiro','BR','rio-de-janeiro'], EZE:['Buenos Aires','AR','buenos-aires'], LIM:['Lima','PE','lima'],
  BOG:['Bogota','CO','bogota'], MDE:['Medellin','CO','medellin'], SCL:['Santiago','CL','santiago'], PDP:['Punta del Este','UY','punta-del-este'], PUJ:['Punta Cana','DO','punta-cana'],
};

RH.COUNTRY_NAMES = {US:'United States',CA:'Canada',MX:'Mexico',KR:'South Korea',JP:'Japan',HK:'Hong Kong',MO:'Macau',TW:'Taiwan',CN:'Mainland China',
  TH:'Thailand',VN:'Vietnam',SG:'Singapore',MY:'Malaysia',PH:'Philippines',ID:'Indonesia',KH:'Cambodia',IN:'India',LK:'Sri Lanka',
  AE:'United Arab Emirates',QA:'Qatar',TR:'Turkey',IL:'Israel',JO:'Jordan',GB:'United Kingdom',IE:'Ireland',FR:'France',NL:'Netherlands',BE:'Belgium',
  DE:'Germany',CH:'Switzerland',AT:'Austria',CZ:'Czechia',HU:'Hungary',PL:'Poland',IT:'Italy',ES:'Spain',PT:'Portugal',GR:'Greece',DK:'Denmark',
  SE:'Sweden',NO:'Norway',FI:'Finland',IS:'Iceland',HR:'Croatia',MA:'Morocco',EG:'Egypt',KE:'Kenya',TZ:'Tanzania',ET:'Ethiopia',RW:'Rwanda',UG:'Uganda',
  ZA:'South Africa',ZW:'Zimbabwe',NG:'Nigeria',GH:'Ghana',SN:'Senegal',TN:'Tunisia',MU:'Mauritius',SC:'Seychelles',AU:'Australia',NZ:'New Zealand',
  BR:'Brazil',AR:'Argentina',PE:'Peru',CO:'Colombia',CL:'Chile',UY:'Uruguay',DO:'Dominican Republic'};

RH.REGION = c => ({US:'na',CA:'na',MX:'na',KR:'kr',JP:'jp',HK:'cn',MO:'cn',CN:'cn',TW:'tw',
  TH:'sea',VN:'sea',SG:'sea',MY:'sea',PH:'sea',ID:'sea',KH:'sea',IN:'sa',LK:'sa',
  GB:'eu',IE:'eu',FR:'eu',NL:'eu',BE:'eu',DE:'eu',CH:'eu',AT:'eu',CZ:'eu',HU:'eu',PL:'eu',IT:'eu',ES:'eu',PT:'eu',GR:'eu',DK:'eu',SE:'eu',NO:'eu',FI:'eu',IS:'eu',HR:'eu',TR:'eu',
  MA:'af',EG:'af',KE:'af',TZ:'af',ET:'af',RW:'af',UG:'af',ZA:'af',ZW:'af',NG:'af',GH:'af',SN:'af',TN:'af',MU:'af',SC:'af',
  AE:'me',QA:'me',IL:'me',JO:'me',AU:'oc',NZ:'oc',BR:'la',AR:'la',PE:'la',CO:'la',CL:'la',UY:'la',DO:'la'})[c] || 'other';

/* Flight search sites. Each url(leg) returns a deep link; leg = {from,to,date,cabin,adults,ret?} */
RH.FLIGHT_SITES = [
  {name:'Google Flights', tag:'Meta-search', url:l=>{const cab={business:' business class',first:' first class',economy:' economy'}[l.cabin]||'';const q=l.ret?`Flights to ${l.to} from ${l.from} on ${l.date} through ${l.ret}${cab}`:`One way flights to ${l.to} from ${l.from} on ${l.date}${cab}`;return `https://www.google.com/travel/flights?q=${encodeURIComponent(q+(l.adults>1?` for ${l.adults} adults`:''))}`}},
  {name:'Kayak', tag:'Meta-search', url:l=>`https://www.kayak.com/flights/${l.from}-${l.to}/${l.date}${l.ret?'/'+l.ret:''}${{business:'/business',premium:'/premium',first:'/first'}[l.cabin]||''}/${l.adults}adults?sort=price_a`},
  {name:'Momondo', tag:'Meta-search', url:l=>`https://www.momondo.com/flight-search/${l.from}-${l.to}/${l.date}${l.ret?'/'+l.ret:''}${{business:'/business',premium:'/premium',first:'/first'}[l.cabin]||''}/${l.adults}adults?sort=price_a`},
  {name:'Skyscanner', tag:'Meta-search', url:l=>{const f=d=>d.slice(2).replace(/-/g,'');return `https://www.skyscanner.com/transport/flights/${l.from.toLowerCase()}/${l.to.toLowerCase()}/${f(l.date)}/${l.ret?f(l.ret)+'/':''}?cabinclass=${{business:'business',premium:'premiumeconomy',first:'first'}[l.cabin]||'economy'}&adultsv2=${l.adults}`}},
  {name:'Expedia', tag:'Travel agency', url:l=>{const f=d=>{const [y,m,dd]=d.split('-');return `${+m}/${+dd}/${y}`};return `https://www.expedia.com/Flights-Search?trip=${l.ret?'roundtrip':'oneway'}&leg1=from:${l.from},to:${l.to},departure:${f(l.date)}TANYT${l.ret?`&leg2=from:${l.to},to:${l.from},departure:${f(l.ret)}TANYT`:''}&passengers=adults:${l.adults}&options=cabinclass:${{business:'business',premium:'premium',first:'first'}[l.cabin]||'economy'}&mode=search`}},
  {name:'Priceline', tag:'Travel agency', url:l=>`https://www.priceline.com/m/fly/search/${l.from}-${l.to}-${l.date.replace(/-/g,'')}${l.ret?`/${l.to}-${l.from}-${l.ret.replace(/-/g,'')}`:''}/?cabin-class=${{business:'BUS',premium:'PEC',first:'FST'}[l.cabin]||'ECO'}&num-adults=${l.adults}`},
  {name:'Trip.com', tag:'Travel agency, strong in Asia', url:()=>'https://www.trip.com/flights/'},
  {name:'Kiwi.com', tag:'Self-transfer combos', url:()=>'https://www.kiwi.com/'},
  {name:'Travelocity', tag:'Travel agency', url:()=>'https://www.travelocity.com/Flights'},
  {name:'Hopper', tag:'Price prediction app', url:()=>'https://hopper.com/'},
];

/* Ground transport: global + regional. city(slug) deep links where the site supports them. */
RH.GROUND = {
  global:[
    {name:'Rome2rio', what:'Every way to get between two places, with times and price ranges', url:(a,b)=>`https://www.rome2rio.com/map/${encodeURIComponent(a)}/${encodeURIComponent(b)}`},
    {name:'Busbud', what:'Intercity buses worldwide', url:()=>'https://www.busbud.com/'},
    {name:'Bookaway', what:'Buses, vans and ferries in Asia, Latin America, Africa and Europe', url:()=>'https://www.bookaway.com/'},
    {name:'Direct Ferries', what:'Ferry routes worldwide', url:()=>'https://www.directferries.com/'},
  ],
  na:[{name:'Amtrak',what:'US trains',url:()=>'https://www.amtrak.com/'},{name:'Wanderu',what:'US buses and trains compared',url:()=>'https://www.wanderu.com/'},{name:'FlixBus',what:'Low-cost buses',url:()=>'https://www.flixbus.com/'},{name:'VIA Rail',what:'Canada trains',url:()=>'https://www.viarail.ca/'}],
  kr:[{name:'Korail (Let’s Korail)',what:'KTX high-speed and regular trains',url:()=>'https://www.letskorail.com/'},{name:'SRT',what:'High-speed trains from southern Seoul',url:()=>'https://etk.srail.kr/'},{name:'Kobus',what:'Express buses',url:()=>'https://www.kobus.co.kr/'},{name:'Korea Rail Pass',what:'Unlimited KTX pass for visitors (via Korail)',url:()=>'https://www.letskorail.com/'},{name:'12Go',what:'Trains, buses and ferries incl. Busan–Fukuoka ferry',url:(a,b)=>`https://12go.asia/en/travel/${a}/${b}`}],
  jp:[{name:'Japan Rail Pass',what:'Official JR Pass for visitors',url:()=>'https://japanrailpass.net/'},{name:'SmartEX',what:'Shinkansen tickets online',url:()=>'https://smart-ex.jp/en/'},{name:'Japan Bus Online',what:'Highway and night buses',url:()=>'https://japanbusonline.com/'},{name:'Willer Express',what:'Budget night buses',url:()=>'https://willerexpress.com/'},{name:'Klook',what:'Rail passes, airport trains, IC cards',url:()=>'https://www.klook.com/'}],
  cn:[{name:'Trip.com Trains',what:'China high-speed rail in English',url:()=>'https://www.trip.com/trains/'},{name:'12306 (China Railway)',what:'Official China rail booking',url:()=>'https://www.12306.cn/'},{name:'MTR',what:'Hong Kong metro, Airport Express, West Kowloon high-speed rail',url:()=>'https://www.mtr.com.hk/'},{name:'TurboJET',what:'Ferries Hong Kong ⇄ Macau ⇄ Shenzhen',url:()=>'https://www.turbojet.com.hk/'},{name:'Klook',what:'High-speed rail Hong Kong ⇄ mainland, passes',url:()=>'https://www.klook.com/'},{name:'12Go',what:'Trains and buses incl. Hong Kong ⇄ mainland',url:(a,b)=>`https://12go.asia/en/travel/${a}/${b}`}],
  tw:[{name:'Taiwan High Speed Rail',what:'THSR bullet trains',url:()=>'https://en.thsrc.com.tw/'},{name:'Taiwan Railway',what:'Local and express trains',url:()=>'https://www.railway.gov.tw/'},{name:'12Go',what:'Trains and buses',url:(a,b)=>`https://12go.asia/en/travel/${a}/${b}`}],
  sea:[{name:'12Go',what:'Buses, trains, ferries, vans across Southeast Asia',url:(a,b)=>`https://12go.asia/en/travel/${a}/${b}`},{name:'Bookaway',what:'Buses, vans and island ferries',url:()=>'https://www.bookaway.com/'},{name:'Easybook',what:'Buses and ferries in Malaysia and Singapore',url:()=>'https://www.easybook.com/'},{name:'Vietnam Railways',what:'Reunification Express',url:()=>'https://dsvn.vn/'},{name:'KTMB',what:'Malaysia trains',url:()=>'https://www.ktmb.com.my/'}],
  sa:[{name:'IRCTC',what:'Indian Railways',url:()=>'https://www.irctc.co.in/'},{name:'12Go',what:'Trains and buses',url:(a,b)=>`https://12go.asia/en/travel/${a}/${b}`},{name:'redBus',what:'Buses in India and beyond',url:()=>'https://www.redbus.in/'}],
  eu:[{name:'Omio',what:'Trains, buses and flights across Europe',url:()=>'https://www.omio.com/'},{name:'Trainline',what:'European rail tickets',url:()=>'https://www.thetrainline.com/'},{name:'Eurail / Interrail',what:'Multi-country rail passes',url:()=>'https://www.eurail.com/'},{name:'FlixBus',what:'Low-cost buses and trains',url:()=>'https://www.flixbus.com/'},{name:'Ferryhopper',what:'Greek islands, Italy, Croatia, Spain ferries',url:()=>'https://www.ferryhopper.com/'},{name:'BlaBlaCar',what:'Ride sharing and buses',url:()=>'https://www.blablacar.com/'}],
  af:[{name:'Bookaway',what:'Buses, shuttles and ferries in Africa',url:()=>'https://www.bookaway.com/'},{name:'Buupass',what:'Buses and trains in Kenya and East Africa',url:()=>'https://buupass.com/'},{name:'Intercape',what:'Long-distance buses in southern Africa',url:()=>'https://www.intercape.co.za/'},{name:'ONCF',what:'Morocco trains incl. Al Boraq high-speed',url:()=>'https://www.oncf.ma/'},{name:'CTM',what:'Morocco intercity buses',url:()=>'https://www.ctm.ma/'},{name:'Egyptian National Railways',what:'Egypt trains incl. Cairo–Luxor–Aswan',url:()=>'https://enr.gov.eg/'}],
  me:[{name:'Rome2rio',what:'Compare buses, trains and ferries',url:(a,b)=>`https://www.rome2rio.com/map/${a}/${b}`}],
  oc:[{name:'NSW TrainLink',what:'Australia regional trains',url:()=>'https://transportnsw.info/'},{name:'Greyhound Australia',what:'Long-distance buses',url:()=>'https://www.greyhound.com.au/'},{name:'InterCity NZ',what:'New Zealand buses',url:()=>'https://www.intercity.co.nz/'}],
  la:[{name:'Busbud',what:'Buses across Latin America',url:()=>'https://www.busbud.com/'},{name:'Bookaway',what:'Shuttles and ferries',url:()=>'https://www.bookaway.com/'},{name:'PeruRail',what:'Cusco ⇄ Machu Picchu trains',url:()=>'https://www.perurail.com/'}],
  other:[],
};

/* Lodging sites. s = {city, checkin, checkout, adults, maxNight (USD or 0)} */
RH.STAYS = [
  {name:'Google Hotels', tag:'Compares many sites', url:s=>`https://www.google.com/travel/search?q=${encodeURIComponent(`hotels in ${s.city} from ${s.checkin} to ${s.checkout}${s.maxNight?` under $${s.maxNight}`:''}`)}`},
  {name:'Booking.com', tag:'Hotels, apartments; Genius discounts', url:s=>`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(s.city)}&checkin=${s.checkin}&checkout=${s.checkout}&group_adults=${s.adults}&no_rooms=1${s.maxNight?`&nflt=${encodeURIComponent(`price=USD-0-${s.maxNight}-1`)}`:''}&order=price`},
  {name:'Agoda', tag:'Often cheapest in Asia', url:s=>`https://www.agoda.com/search?textToSearch=${encodeURIComponent(s.city)}&checkIn=${s.checkin}&los=${s.nights}&adults=${s.adults}&rooms=1${s.maxNight?`&priceTo=${s.maxNight}`:''}&sort=priceLowToHigh`},
  {name:'Expedia', tag:'Hotels, One Key rewards', url:s=>`https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(s.city)}&startDate=${s.checkin}&endDate=${s.checkout}&adults=${s.adults}&sort=PRICE_LOW_TO_HIGH`},
  {name:'Hotels.com', tag:'One Key rewards', url:s=>`https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(s.city)}&startDate=${s.checkin}&endDate=${s.checkout}&adults=${s.adults}&sort=PRICE_LOW_TO_HIGH`},
  {name:'Kayak Hotels', tag:'Meta-search', url:s=>`https://www.kayak.com/hotels/${encodeURIComponent(s.city)}/${s.checkin}/${s.checkout}/${s.adults}adults?sort=price_a`},
  {name:'Trip.com', tag:'Strong in China and Asia', url:()=>'https://www.trip.com/hotels/'},
  {name:'Priceline', tag:'Express Deals (hidden-name discounts)', url:()=>'https://www.priceline.com/hotels/'},
  {name:'Hotwire', tag:'Hot Rate hidden-name deals', url:()=>'https://www.hotwire.com/'},
  {name:'Trivago', tag:'Meta-search', url:()=>'https://www.trivago.com/'},
  {name:'Airbnb', tag:'Homes and rooms', url:s=>`https://www.airbnb.com/s/${encodeURIComponent(s.city)}/homes?checkin=${s.checkin}&checkout=${s.checkout}&adults=${s.adults}${s.maxNight?`&price_max=${s.maxNight}`:''}`},
  {name:'Vrbo', tag:'Whole homes', url:s=>`https://www.vrbo.com/search?destination=${encodeURIComponent(s.city)}&startDate=${s.checkin}&endDate=${s.checkout}&adults=${s.adults}`},
  {name:'Hostelworld', tag:'Hostels and budget stays', url:()=>'https://www.hostelworld.com/'},
  {name:'HotelTonight', tag:'Last-minute deals', url:()=>'https://www.hoteltonight.com/'},
  {name:'Ratepunk', tag:'Browser extension that compares hotel rates', url:()=>'https://www.ratepunk.com/'},
];
RH.STAYS_REGIONAL = {
  jp:[{name:'Rakuten Travel',tag:'Japan hotels and ryokan',url:()=>'https://travel.rakuten.com/'},{name:'Jalan',tag:'Japan domestic site',url:()=>'https://www.jalan.net/en/'}],
  kr:[{name:'Yanolja / NOL',tag:'Korea hotels and motels',url:()=>'https://www.yanolja.com/'}],
  cn:[{name:'Trip.com',tag:'Best China coverage',url:()=>'https://www.trip.com/hotels/'}],
  eu:[{name:'Hostelworld',tag:'Hostels',url:()=>'https://www.hostelworld.com/'}],
};

/* Memberships, cashback and deal alerts. social: searches on each platform for current promos. */
RH.DEALS = [
  {name:'Ratepunk', kind:'Price comparison', note:'Free extension that checks hotel and flight prices on other sites while you browse.', url:'https://www.ratepunk.com/'},
  {name:'Going', kind:'Flight deal alerts', note:'Free and paid tiers; Premium and Elite include business class deals.', url:'https://www.going.com/'},
  {name:'Dollar Flight Club', kind:'Flight deal alerts', note:'Free and paid tiers; premium cabin and mistake fare alerts.', url:'https://dollarflightclub.com/'},
  {name:'Thrifty Traveler Premium', kind:'Flight and award alerts', note:'Cash and points deals, strong on business class awards.', url:'https://thriftytraveler.com/'},
  {name:'Secret Flying', kind:'Error fares', note:'Free posts of mistake and sale fares worldwide.', url:'https://www.secretflying.com/'},
  {name:'The Flight Deal', kind:'Fare sales', note:'Free daily fare sales with booking instructions.', url:'https://www.theflightdeal.com/'},
  {name:'Jack’s Flight Club', kind:'Flight deal alerts', note:'Strong for UK and Europe departures.', url:'https://jacksflightclub.com/'},
  {name:'Travelzoo', kind:'Curated deals', note:'Hotel, cruise and package deals; free and member tiers.', url:'https://www.travelzoo.com/'},
  {name:'Booking.com Genius', kind:'Loyalty', note:'Free tiers with 10–20% off selected stays.', url:'https://www.booking.com/genius.html'},
  {name:'One Key (Expedia, Hotels.com, Vrbo)', kind:'Loyalty', note:'Shared rewards and member prices.', url:'https://www.expedia.com/welcome-one-key'},
  {name:'Agoda VIP', kind:'Loyalty', note:'Member prices after a few bookings.', url:'https://www.agoda.com/'},
  {name:'Priceline VIP', kind:'Loyalty', note:'Tiered discounts on hotels and cars.', url:'https://www.priceline.com/'},
  {name:'Trip.com Rewards', kind:'Loyalty', note:'Trip Coins and member deals.', url:'https://www.trip.com/'},
  {name:'Klook', kind:'Activities and transport deals', note:'Promo codes for rail, passes, tours in Asia and Europe.', url:'https://www.klook.com/'},
  {name:'Rakuten', kind:'Cashback', note:'Cash back on many travel sites when you start there.', url:'https://www.rakuten.com/'},
  {name:'TopCashback', kind:'Cashback', note:'Often higher travel cashback rates.', url:'https://www.topcashback.com/'},
  {name:'Costco Travel', kind:'Members-only packages', note:'Bundles for Costco members.', url:'https://www.costcotravel.com/'},
  {name:'AAA Travel', kind:'Member discounts', note:'Hotel and car discounts for AAA members.', url:'https://travel.aaa.com/'},
  {name:'Credit card travel portals', kind:'Points', note:'Chase Travel, Amex Travel, Capital One Travel: points and price-match perks.', url:'https://www.google.com/search?q=credit+card+travel+portal+comparison'},
];
RH.SOCIAL = [
  {name:'Instagram', url:q=>`https://www.instagram.com/explore/tags/${encodeURIComponent(q.replace(/[^a-z0-9]/gi,'').toLowerCase())}/`},
  {name:'TikTok', url:q=>`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`},
  {name:'YouTube', url:q=>`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`},
  {name:'Facebook', url:q=>`https://www.facebook.com/search/top?q=${encodeURIComponent(q)}`},
  {name:'X', url:q=>`https://x.com/search?q=${encodeURIComponent(q)}&f=live`},
  {name:'Pinterest', url:q=>`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`},
];

/* Official tourism boards */
RH.TOURISM = {KR:'https://english.visitkorea.or.kr/',JP:'https://www.japan.travel/en/',HK:'https://www.discoverhongkong.com/',MO:'https://www.macaotourism.gov.mo/',
  TW:'https://eng.taiwan.net.tw/',TH:'https://www.tourismthailand.org/',VN:'https://vietnam.travel/',SG:'https://www.visitsingapore.com/',MY:'https://www.malaysia.travel/',
  PH:'https://philippines.travel/',ID:'https://www.indonesia.travel/',GB:'https://www.visitbritain.com/',IE:'https://www.ireland.com/',FR:'https://www.france.fr/',
  IT:'https://www.italia.it/',ES:'https://www.spain.info/',PT:'https://www.visitportugal.com/',GR:'https://www.visitgreece.gr/',DE:'https://www.germany.travel/',
  NL:'https://www.holland.com/',CH:'https://www.myswitzerland.com/',AT:'https://www.austria.info/',IS:'https://www.visiticeland.com/',MA:'https://www.visitmorocco.com/',
  EG:'https://www.egypt.travel/',KE:'https://magicalkenya.com/',ZA:'https://www.southafrica.net/',TZ:'https://www.tanzaniatourism.go.tz/',RW:'https://www.visitrwanda.com/',
  AE:'https://www.visitdubai.com/',AU:'https://www.australia.com/',NZ:'https://www.newzealand.com/',MX:'https://www.visitmexico.com/',US:'https://www.visittheusa.com/'};

/* 2027 trends from published industry reports (summarized). */
RH.TRENDS = [
  {name:'Currency chasers', src:'Skyscanner 2027', note:'Picking places where your money goes further.'},
  {name:'Signal severance', src:'Skyscanner 2027', note:'Digital-detox trips in remote nature, such as Finnish Lapland.'},
  {name:'Grand odysseys', src:'Skyscanner 2027', note:'Ancient sites, sacred trails and historic ruins.'},
  {name:'Gym-cations', src:'Skyscanner 2027', note:'Hotels picked for their gyms and healthy breakfasts.'},
  {name:'Trip snacking', src:'Expedia Unpack ’27', note:'More frequent short breaks and one-night stays.'},
  {name:'Hobby hubs', src:'Expedia Unpack ’27', note:'Trips built around a passion: golf, food, music, crafts.'},
  {name:'Set-jetting', src:'Expedia Unpack ’27', note:'Visiting places seen in shows and films.'},
  {name:'TripMaxxing', src:'Priceline 2027', note:'Save on one part of a trip to splurge on another, the RouteHound way.'},
  {name:'Phone to table', src:'Priceline 2027', note:'Trips planned around food seen on social media.'},
];
RH.HOTSPOTS = ['Hyogo, Japan','Da Nang, Vietnam','Fes, Morocco','Innsbruck, Austria','Adelaide, Australia','Punta del Este, Uruguay','Miches, Dominican Republic','Helsinki and Kittilä, Finland'];

/* Entry requirements for US passports (summaries, Nov 2026). Others: official links + IATA. */
RH.ENTRY = {
  KR:{tag:'act',head:'No visa up to 90 days; K-ETA needed from Jan 1, 2027',links:[['K-ETA','https://www.k-eta.go.kr/']]},
  JP:{tag:'ok',head:'No visa up to 90 days; use Visit Japan Web',links:[['Visit Japan Web','https://vjw-lp.digital.go.jp/en/']]},
  HK:{tag:'ok',head:'No visa up to 90 days',links:[['HK Immigration','https://www.immd.gov.hk/eng/']]},
  MO:{tag:'ok',head:'No visa up to 30 days',links:[['Macau Public Security Police','https://www.fsm.gov.mo/psp/eng/']]},
  CN:{tag:'act',head:'Tourist (L) visa, or 10-day visa-free transit when arriving from one country/region and leaving to another',links:[['China visa (COVA)','https://consular.mfa.gov.cn/VISA/'],['National Immigration Administration','https://en.nia.gov.cn/']]},
  TW:{tag:'ok',head:'No visa up to 90 days',links:[['Bureau of Consular Affairs','https://www.boca.gov.tw/']]},
  PH:{tag:'act',head:'No visa up to 30 days; eTravel form within 72 hours',links:[['eTravel','https://etravel.gov.ph/']]},
  GB:{tag:'act',head:'Electronic Travel Authorisation (ETA) required',links:[['UK ETA','https://www.gov.uk/eta']]},
  EU:{tag:'act',head:'Schengen: no visa up to 90 days in 180; ETIAS authorization when it starts',links:[['EU Entry/Exit & ETIAS','https://travel-europe.europa.eu/']]},
  KE:{tag:'act',head:'Electronic Travel Authorisation (eTA) required',links:[['Kenya eTA','https://www.etakenya.go.ke/']]},
  IN:{tag:'act',head:'e-Visa required',links:[['Indian e-Visa','https://indianvisaonline.gov.in/evisa/']]},
  VN:{tag:'act',head:'e-Visa required',links:[['Vietnam e-Visa','https://evisa.gov.vn/']]},
  EG:{tag:'act',head:'Visa required (e-Visa or on arrival)',links:[['Egypt e-Visa','https://visa2egypt.gov.eg/']]},
  AU:{tag:'act',head:'ETA required',links:[['Australian ETA app','https://immi.homeaffairs.gov.au/']]},
  CA:{tag:'ok',head:'No visa or eTA for US citizens',links:[['Canada entry','https://www.canada.ca/en/immigration-refugees-citizenship.html']]},
};
RH.SCHENGEN = ['FR','NL','BE','DE','CH','AT','CZ','HU','PL','IT','ES','PT','GR','DK','SE','NO','FI','IS','HR'];
