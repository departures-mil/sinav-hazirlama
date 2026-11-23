'use strict';
// 1.9.4 — Üretilmiş soru arşivi. Sözlükten (sozluk.js) ve dil bilgisi tablolarından binlerce İngilizce ve havacılık
// terimi sorusu üretir; bank-data.js'teki el yazımı arşive eklenir. Üretim deterministiktir (aynı sürümde aynı id'ler),
// böylece "daha önce getirildi" kayıtları geçerli kalır.
// Seviye: 1 = Öğrenci, 2 = Orta, 3 = İleri. Doğru seçenek her zaman ilk sıradadır (eklenirken karıştırılır).
(function () {
  const S = window.SOZLUK; if (!S) return;
  const M = (tr, en, ar) => ({ tr, en, ar });
  const same = (s) => ({ tr: s, en: s, ar: s });
  // deterministik karıştırma (xorshift)
  let seed = 20261123;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickN = (arr, n, not) => { const out = []; const seen = new Set(not || []); let tries = 0; while (out.length < n && tries++ < 200) { const x = arr[Math.floor(rnd() * arr.length)]; const k = typeof x === 'string' ? x : x[0]; if (!seen.has(k)) { seen.add(k); out.push(x); } } return out; };
  const out = [];
  let n = 0;
  const push = (lvl, topic, sub, text, options) => {
    const seen = new Set(); const o = [];
    options.forEach((x) => { const k = String(x.en || x.tr).trim().toLowerCase(); if (!k || seen.has(k)) return; seen.add(k); o.push(x); });
    if (o.length < 5) return;
    out.push({ id: 'g' + (++n), lvl, topic, sub, text, options: o.slice(0, 5), correct: 0 });
  };

  /* ---------- sözlük seviyeleri ---------- */
  const GEN = S.GEN;
  const i2 = GEN.findIndex((x) => x[0] === 'abandon'), i3 = GEN.findIndex((x) => x[0] === 'accelerate');
  const lvlOf = (i) => (i < i2 ? 1 : i < i3 ? 2 : 3);
  const byLvl = { 1: GEN.slice(0, i2), 2: GEN.slice(i2, i3), 3: GEN.slice(i3) };
  const main = (s) => String(s).split('/')[0].trim();

  /* ---------- 1) Kelime anlamı: İngilizce → Türkçe / Arapça ---------- */
  GEN.forEach((w, i) => {
    const lvl = lvlOf(i);
    const pool = byLvl[lvl].length > 30 ? byLvl[lvl] : GEN;
    const d = pickN(pool, 4, [w[0]]);
    push(lvl, 'eng', 'vocab',
      M(`"${w[0]}" kelimesinin Türkçe anlamı nedir?`, `What does "${w[0]}" mean in Turkish?`, `ما معنى كلمة "${w[0]}" بالتركية؟`),
      [w, ...d].map((x) => same(main(x[1]))));
    const d2 = pickN(pool, 4, [w[0]]);
    push(lvl, 'eng', 'vocab',
      M(`"${w[0]}" kelimesinin Arapça anlamı nedir?`, `What does "${w[0]}" mean in Arabic?`, `ما معنى كلمة "${w[0]}" بالعربية؟`),
      [w, ...d2].map((x) => same(main(x[2]))));
    // ters yön: anlamı verilen kelimenin İngilizcesi
    const d3 = pickN(pool, 4, [w[0]]);
    push(lvl, 'eng', 'vocab',
      M(`"${main(w[1])}" anlamına gelen İngilizce kelime hangisidir?`, `Which English word means "${main(w[1])}" (Turkish) / "${main(w[2])}" (Arabic)?`, `ما الكلمة الإنجليزية التي تعني "${main(w[2])}"؟`),
      [w, ...d3].map((x) => same(x[0])));
  });

  /* ---------- 2) Havacılık terimleri ---------- */
  const AV = S.AV;
  AV.forEach((w, i) => {
    const lvl = i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3;
    const d = pickN(AV, 4, [w[0]]);
    push(lvl, 'uav', 'term',
      M(`Havacılık terimi "${w[0]}" ne anlama gelir?`, `What does the aviation term "${w[0]}" mean?`, `ما معنى مصطلح الطيران "${w[0]}"؟`),
      [w, ...d].map((x) => M(main(x[1]), main(x[1]), main(x[2]))));
    const d2 = pickN(AV, 4, [w[0]]);
    push(lvl, 'uav', 'term',
      M(`"${main(w[1])}" teriminin İngilizce karşılığı hangisidir?`, `Which is the English term for "${main(w[1])}" / "${main(w[2])}"?`, `ما المصطلح الإنجليزي المقابل لـ "${main(w[2])}"؟`),
      [w, ...d2].map((x) => same(x[0])));
  });

  /* ---------- 3) Eş / zıt anlam ---------- */
  const allWords = GEN.map((x) => x[0]);
  S.SYN.forEach(([a, b]) => {
    const d = pickN(allWords, 4, [a, b]);
    push(2, 'eng', 'synonym', M(`"${a}" kelimesine anlamca en yakın olanı seçin.`, `Choose the word closest in meaning to "${a}".`, `اختر الكلمة الأقرب في المعنى إلى "${a}".`), [b, ...d].map(same));
  });
  S.OPP.forEach(([a, b]) => {
    const d = pickN(allWords, 4, [a, b]);
    push(1, 'eng', 'antonym', M(`"${a}" kelimesinin zıt anlamlısını seçin.`, `Choose the opposite of "${a}".`, `اختر عكس كلمة "${a}".`), [b, ...d].map(same));
    const d2 = pickN(allWords, 4, [a, b]);
    push(1, 'eng', 'antonym', M(`"${b}" kelimesinin zıt anlamlısını seçin.`, `Choose the opposite of "${b}".`, `اختر عكس كلمة "${b}".`), [a, ...d2].map(same));
  });

  /* ---------- 4) Dil bilgisi ---------- */
  const GAP = (lvl, sub, sentence, correct, wrong) => {
    const opts = [correct, ...shuffle(wrong.filter((x) => x !== correct)).slice(0, 4)];
    if (opts.length < 5) return;
    push(lvl, 'eng', sub, M('Boşluğa uygun seçeneği işaretleyin:\n' + sentence, 'Choose the correct option to fill the gap:\n' + sentence, 'اختر الخيار الصحيح لملء الفراغ:\n' + sentence), opts.map(same));
  };
  // fiil tablosu: [yalın, geçmiş, 3. hâl, 3. tekil, -ing]
  const V = [['go', 'went', 'gone', 'goes', 'going'], ['see', 'saw', 'seen', 'sees', 'seeing'], ['take', 'took', 'taken', 'takes', 'taking'], ['eat', 'ate', 'eaten', 'eats', 'eating'], ['write', 'wrote', 'written', 'writes', 'writing'], ['drive', 'drove', 'driven', 'drives', 'driving'], ['fly', 'flew', 'flown', 'flies', 'flying'], ['begin', 'began', 'begun', 'begins', 'beginning'], ['break', 'broke', 'broken', 'breaks', 'breaking'], ['bring', 'brought', 'brought', 'brings', 'bringing'], ['build', 'built', 'built', 'builds', 'building'], ['buy', 'bought', 'bought', 'buys', 'buying'], ['catch', 'caught', 'caught', 'catches', 'catching'], ['choose', 'chose', 'chosen', 'chooses', 'choosing'], ['come', 'came', 'come', 'comes', 'coming'], ['do', 'did', 'done', 'does', 'doing'], ['draw', 'drew', 'drawn', 'draws', 'drawing'], ['drink', 'drank', 'drunk', 'drinks', 'drinking'], ['fall', 'fell', 'fallen', 'falls', 'falling'], ['feel', 'felt', 'felt', 'feels', 'feeling'], ['find', 'found', 'found', 'finds', 'finding'], ['forget', 'forgot', 'forgotten', 'forgets', 'forgetting'], ['get', 'got', 'got', 'gets', 'getting'], ['give', 'gave', 'given', 'gives', 'giving'], ['have', 'had', 'had', 'has', 'having'], ['hear', 'heard', 'heard', 'hears', 'hearing'], ['hold', 'held', 'held', 'holds', 'holding'], ['keep', 'kept', 'kept', 'keeps', 'keeping'], ['know', 'knew', 'known', 'knows', 'knowing'], ['leave', 'left', 'left', 'leaves', 'leaving'], ['lose', 'lost', 'lost', 'loses', 'losing'], ['make', 'made', 'made', 'makes', 'making'], ['meet', 'met', 'met', 'meets', 'meeting'], ['pay', 'paid', 'paid', 'pays', 'paying'], ['put', 'put', 'put', 'puts', 'putting'], ['read', 'read', 'read', 'reads', 'reading'], ['ride', 'rode', 'ridden', 'rides', 'riding'], ['run', 'ran', 'run', 'runs', 'running'], ['say', 'said', 'said', 'says', 'saying'], ['sell', 'sold', 'sold', 'sells', 'selling'], ['send', 'sent', 'sent', 'sends', 'sending'], ['sit', 'sat', 'sat', 'sits', 'sitting'], ['sleep', 'slept', 'slept', 'sleeps', 'sleeping'], ['speak', 'spoke', 'spoken', 'speaks', 'speaking'], ['spend', 'spent', 'spent', 'spends', 'spending'], ['stand', 'stood', 'stood', 'stands', 'standing'], ['swim', 'swam', 'swum', 'swims', 'swimming'], ['teach', 'taught', 'taught', 'teaches', 'teaching'], ['tell', 'told', 'told', 'tells', 'telling'], ['think', 'thought', 'thought', 'thinks', 'thinking'], ['throw', 'threw', 'thrown', 'throws', 'throwing'], ['understand', 'understood', 'understood', 'understands', 'understanding'], ['wear', 'wore', 'worn', 'wears', 'wearing'], ['win', 'won', 'won', 'wins', 'winning'], ['land', 'landed', 'landed', 'lands', 'landing'], ['check', 'checked', 'checked', 'checks', 'checking'], ['charge', 'charged', 'charged', 'charges', 'charging'], ['plan', 'planned', 'planned', 'plans', 'planning'], ['stop', 'stopped', 'stopped', 'stops', 'stopping'], ['try', 'tried', 'tried', 'tries', 'trying'], ['study', 'studied', 'studied', 'studies', 'studying'], ['carry', 'carried', 'carried', 'carries', 'carrying'], ['watch', 'watched', 'watched', 'watches', 'watching'], ['fix', 'fixed', 'fixed', 'fixes', 'fixing'], ['use', 'used', 'used', 'uses', 'using'], ['open', 'opened', 'opened', 'opens', 'opening'], ['start', 'started', 'started', 'starts', 'starting'], ['finish', 'finished', 'finished', 'finishes', 'finishing'], ['work', 'worked', 'worked', 'works', 'working'], ['arrive', 'arrived', 'arrived', 'arrives', 'arriving']];
  const OBJ = { go: 'to the airfield', see: 'the new drone', take: 'the battery', eat: 'lunch', write: 'the report', drive: 'to the field', fly: 'the trainer', begin: 'the lesson', break: 'the propeller', bring: 'the transmitter', build: 'a wing', buy: 'a charger', catch: 'the bus', choose: 'a flight mode', come: 'to class', do: 'the checklist', draw: 'a map', drink: 'tea', fall: 'asleep', feel: 'tired', find: 'the lost drone', forget: 'the battery', get: 'a license', give: 'a briefing', have: 'a problem', hear: 'the alarm', hold: 'the model', keep: 'the logbook', know: 'the rules', leave: 'early', lose: 'the signal', make: 'a plan', meet: 'the instructor', pay: 'the fee', put: 'the battery in', read: 'the manual', ride: 'a bike', run: 'to the car', say: 'hello', sell: 'the old plane', send: 'an email', sit: 'down', sleep: 'well', speak: 'English', spend: 'two hours', stand: 'here', swim: 'in the lake', teach: 'the students', tell: 'the truth', think: 'about it', throw: 'the glider', understand: 'the lesson', wear: 'a jacket', win: 'the race', land: 'safely', check: 'the propeller', charge: 'the battery', plan: 'the mission', stop: 'the motor', try: 'again', study: 'aerodynamics', carry: 'the case', watch: 'the video', fix: 'the servo', use: 'the simulator', open: 'the box', start: 'the engine', finish: 'the test', work: 'hard', arrive: 'on time' };
  const SUBJ = [['I', 0], ['You', 0], ['He', 1], ['She', 1], ['We', 0], ['They', 0], ['The pilot', 1], ['My brother', 1], ['The students', 0], ['Our instructor', 1], ['The team', 1], ['Ali and Ahmad', 0]];
  const TIMES_PAST = ['Yesterday', 'Last week', 'Two days ago', 'Last month', 'In 2019', 'This morning'];
  const TIMES_HAB = ['every day', 'on Mondays', 'usually', 'twice a week', 'at the weekend'];
  const be = (s3, plural, subj) => (subj === 'I' ? 'am' : s3 ? 'is' : 'are');
  const wasw = (s3, subj) => (subj === 'I' || s3 ? 'was' : 'were');
  const hashave = (s3) => (s3 ? 'has' : 'have');
  V.forEach((v, vi) => {
    const [base, past, pp, s3f, ing] = v;
    const obj = OBJ[base] || '';
    const subA = SUBJ[vi % SUBJ.length], subB = SUBJ[(vi * 5 + 3) % SUBJ.length], subC = SUBJ[(vi * 7 + 1) % SUBJ.length];
    const forms = [base, past, pp, s3f, ing];
    // geçmiş zaman
    GAP(1, 'tense', `${TIMES_PAST[vi % TIMES_PAST.length]} ${subA[0].toLowerCase() === 'i' ? 'I' : subA[0].toLowerCase()} ____ ${obj}.`, past, [...forms, 'will ' + base, 'is ' + ing]);
    // geniş zaman
    const s3 = subB[1] === 1;
    GAP(1, 'tense', `${subB[0]} ____ ${obj} ${TIMES_HAB[vi % TIMES_HAB.length]}.`, s3 ? s3f : base, [...forms, 'is ' + ing, 'are ' + ing]);
    // şimdiki zaman
    GAP(1, 'tense', `Look! ${subC[0]} ____ ${obj} right now.`, `${be(subC[1] === 1, false, subC[0])} ${ing}`, [`${be(subC[1] === 1, false, subC[0])} ${ing}`, base, past, s3f, `${be(subC[1] === 1, false, subC[0])} ${base}`, pp]);
    // yakın geçmiş
    GAP(2, 'tense', `${subA[0]} ${hashave(subA[1] === 1)} already ____ ${obj}.`, pp, [...forms, 'will ' + base]);
    // gelecek zaman
    GAP(1, 'tense', `Tomorrow ${subB[0].toLowerCase() === 'i' ? 'I' : subB[0].toLowerCase()} ____ ${obj}.`, 'will ' + base, ['will ' + base, past, 'will ' + past, s3f, pp, 'will ' + ing]);
    // past continuous
    GAP(2, 'tense', `${subC[0]} ____ ${obj} when the phone rang.`, `${wasw(subC[1] === 1, subC[0])} ${ing}`, [`${wasw(subC[1] === 1, subC[0])} ${ing}`, past, `${hashave(subC[1] === 1)} ${pp}`, base, `${be(subC[1] === 1, false, subC[0])} ${ing}`, pp]);
    // past perfect
    GAP(3, 'tense', `By the time we arrived, ${subA[0].toLowerCase() === 'i' ? 'I' : subA[0].toLowerCase()} had already ____ ${obj}.`, pp, [...forms, 'will ' + base]);
    // edilgen (geçişli fiiller)
    if (!['go', 'come', 'fall', 'sleep', 'arrive', 'sit', 'stand', 'run', 'swim', 'work', 'feel'].includes(base)) {
      GAP(2, 'passive', `The ${obj.replace(/^(the|a|an) /, '')} ____ by the technician yesterday.`, 'was ' + pp, ['was ' + pp, past, 'is ' + ing, 'has ' + pp, 'were ' + ing, base]);
      GAP(3, 'passive', `${obj.replace(/^(the|a|an) /, '').replace(/^\w/, (c) => c.toUpperCase())} must ____ before every flight.`, 'be ' + pp, ['be ' + pp, 'been ' + pp, 'being ' + base, 'to ' + past, 'be ' + ing, pp]);
    }
    // soru cümlesi (did)
    GAP(1, 'question', `____ ${subB[0].toLowerCase() === 'i' ? 'I' : subB[0].toLowerCase()} ${base} ${obj} yesterday?`, 'Did', ['Did', 'Does', 'Do', 'Was', 'Were', 'Has']);
    // olumsuz
    GAP(1, 'negative', `${subC[0]} ____ ${base} ${obj} last night.`, "didn't", ["didn't", "doesn't", "don't", "wasn't", "hasn't", "isn't"]);
    GAP(1, 'negative', `${subA[0]} ____ ${base} ${obj} ${TIMES_HAB[(vi + 2) % TIMES_HAB.length]}.`, subA[1] === 1 ? "doesn't" : "don't", ["doesn't", "don't", "didn't", "isn't", "aren't", "hasn't"]);
  });
  // sıfat dereceleri
  const ADJ = [['big', 'bigger', 'biggest'], ['small', 'smaller', 'smallest'], ['fast', 'faster', 'fastest'], ['slow', 'slower', 'slowest'], ['high', 'higher', 'highest'], ['low', 'lower', 'lowest'], ['long', 'longer', 'longest'], ['short', 'shorter', 'shortest'], ['heavy', 'heavier', 'heaviest'], ['light', 'lighter', 'lightest'], ['easy', 'easier', 'easiest'], ['hot', 'hotter', 'hottest'], ['cold', 'colder', 'coldest'], ['good', 'better', 'best'], ['bad', 'worse', 'worst'], ['far', 'farther', 'farthest'], ['safe', 'safer', 'safest'], ['cheap', 'cheaper', 'cheapest'], ['strong', 'stronger', 'strongest'], ['early', 'earlier', 'earliest'], ['late', 'later', 'latest'], ['wide', 'wider', 'widest'], ['thin', 'thinner', 'thinnest'], ['happy', 'happier', 'happiest'], ['busy', 'busier', 'busiest'], ['expensive', 'more expensive', 'most expensive'], ['important', 'more important', 'most important'], ['difficult', 'more difficult', 'most difficult'], ['dangerous', 'more dangerous', 'most dangerous'], ['comfortable', 'more comfortable', 'most comfortable'], ['reliable', 'more reliable', 'most reliable'], ['efficient', 'more efficient', 'most efficient'], ['stable', 'more stable', 'most stable'], ['powerful', 'more powerful', 'most powerful'], ['accurate', 'more accurate', 'most accurate'], ['careful', 'more careful', 'most careful'], ['modern', 'more modern', 'most modern'], ['popular', 'more popular', 'most popular'], ['little', 'less', 'least'], ['many', 'more', 'most']];
  const THINGS = ['this drone', 'the new battery', 'my plane', 'the red glider', 'the quadcopter', 'the old transmitter', 'this motor', 'our runway', 'the small camera', 'the training model'];
  ADJ.forEach((a, i) => {
    const t1 = THINGS[i % THINGS.length], t2 = THINGS[(i + 3) % THINGS.length];
    const wrongs = [a[0], a[1], a[2], 'more ' + a[0], 'most ' + a[0], a[0] + 'er', a[0] + 'est', 'the ' + a[1], 'as ' + a[0]];
    GAP(1, 'comparative', `${t1.replace(/^\w/, (c) => c.toUpperCase())} is ____ than ${t2}.`, a[1], wrongs);
    GAP(1, 'superlative', `${t1.replace(/^\w/, (c) => c.toUpperCase())} is the ____ of all.`, a[2], wrongs);
    GAP(2, 'comparative', `${t1.replace(/^\w/, (c) => c.toUpperCase())} is as ____ as ${t2}.`, a[0], wrongs);
  });
  // çoğullar
  const PL = [['child', 'children'], ['man', 'men'], ['woman', 'women'], ['foot', 'feet'], ['tooth', 'teeth'], ['mouse', 'mice'], ['person', 'people'], ['leaf', 'leaves'], ['knife', 'knives'], ['life', 'lives'], ['box', 'boxes'], ['bus', 'buses'], ['city', 'cities'], ['baby', 'babies'], ['battery', 'batteries'], ['sheep', 'sheep'], ['fish', 'fish'], ['aircraft', 'aircraft'], ['potato', 'potatoes'], ['watch', 'watches'], ['wing', 'wings'], ['propeller', 'propellers'], ['antenna', 'antennas'], ['radius', 'radii'], ['analysis', 'analyses'], ['criterion', 'criteria'], ['phenomenon', 'phenomena'], ['datum', 'data']];
  PL.forEach(([s, p], i) => {
    const w = [p, s + 's', s + 'es', s, s.replace(/y$/, 'ies'), s + 'ren', s.slice(0, -1) + 'ves', 'the ' + s];
    GAP(i < 20 ? 1 : 3, 'plural', `There are three ____ in the hangar.`, p, w);
    GAP(i < 20 ? 1 : 3, 'plural', `How many ____ do you see?`, p, w);
  });
  // a / an / the / —
  const AN = ['engine', 'aircraft', 'instructor', 'airport', 'hour', 'umbrella', 'apple', 'orange', 'idea', 'exam', 'ESC', 'IMU', 'old plane', 'easy lesson', 'emergency'];
  const A = ['drone', 'battery', 'pilot', 'university', 'uniform', 'one-day course', 'European pilot', 'propeller', 'runway', 'checklist', 'servo', 'map', 'hangar', 'lesson', 'useful tool'];
  AN.forEach((w) => GAP(1, 'article', `We need ____ ${w}.`, 'an', ['an', 'a', 'the', '—', 'some', 'any']));
  A.forEach((w) => GAP(1, 'article', `This is ____ ${w}.`, 'a', ['a', 'an', 'the', '—', 'some', 'any']));
  // edatlar
  const PREP = [['The plane is ____ the runway.', 'on'], ['The battery is ____ the box.', 'in'], ['We fly ____ Saturdays.', 'on'], ['The lesson starts ____ 9 o\'clock.', 'at'], ['She was born ____ 2005.', 'in'], ['The drone flew ____ the trees.', 'over'], ['Put the charger ____ the table.', 'on'], ['He is afraid ____ flying.', 'of'], ['We arrived ____ the airfield early.', 'at'], ['The camera is attached ____ the gimbal.', 'to'], ['The pilot is responsible ____ the aircraft.', 'for'], ['Look ____ the horizon, not at the model.', 'at'], ['The class is ____ the morning.', 'in'], ['We walked ____ the hangar to the field.', 'from'], ['The signal was lost ____ the flight.', 'during'], ['Turn the model ____ the left.', 'to'], ['I have been waiting ____ two hours.', 'for'], ['I have been here ____ Monday.', 'since'], ['The drone is ____ the wind now.', 'against'], ['Divide the group ____ two teams.', 'into'], ['The wing is made ____ foam.', 'of'], ['Connect the servo ____ channel 2.', 'to'], ['We are interested ____ aviation.', 'in'], ['The instructor depends ____ the checklist.', 'on'], ['Keep the drone ____ sight.', 'in'], ['Fly ____ the limits of the field.', 'within'], ['The glider climbed ____ the cloud.', 'towards'], ['The report is due ____ Friday.', 'by'], ['The pilots talked ____ the weather.', 'about'], ['It is similar ____ the old model.', 'to'], ['Compared ____ last year, we fly more.', 'with'], ['She is good ____ landing.', 'at'], ['Stay away ____ the propeller.', 'from'], ['Hold the stick ____ both hands.', 'with'], ['The failsafe works ____ the signal is lost.', 'when'], ['Land ____ the battery gets low.', 'before'], ['Check the weather ____ every flight.', 'before'], ['We flew ____ the morning and rested ____ noon.', 'in / at'], ['The mission was finished ____ time.', 'on'], ['Walk ____ the road to the field.', 'along']];
  const PREPS = ['on', 'in', 'at', 'of', 'to', 'for', 'from', 'with', 'by', 'over', 'under', 'during', 'since', 'into', 'about', 'towards', 'within', 'against', 'along', 'before', 'when', 'in / at'];
  PREP.forEach(([s, c]) => GAP(2, 'preposition', s, c, PREPS));
  // kiplikler, koşullar, soru ekleri, bağlaçlar, miktar
  const MISC = [
    [2, 'modal', 'You ____ wear safety glasses in the workshop. It is a rule.', 'must', ['must', 'might', 'could', 'would', 'may not', 'needn\'t']],
    [2, 'modal', 'The battery is low. We ____ land now.', 'should', ['should', 'wouldn\'t', 'can\'t', 'might not', 'needn\'t', 'used to']],
    [2, 'modal', '____ I use your charger, please?', 'May', ['May', 'Must', 'Should', 'Would', 'Shall', 'Need']],
    [2, 'modal', 'He ____ fly very well when he was ten.', 'could', ['could', 'can', 'may', 'must', 'should', 'will']],
    [2, 'modal', 'You ____ bring your own radio; we have spare ones.', 'don\'t have to', ['don\'t have to', 'mustn\'t', 'can\'t', 'shouldn\'t', 'won\'t', 'may not']],
    [2, 'modal', 'The sky is dark. It ____ rain soon.', 'might', ['might', 'must not', 'can', 'should', 'would', 'shall']],
    [3, 'modal', 'The drone crashed. The pilot ____ have checked the battery.', 'should', ['should', 'must', 'can', 'will', 'may', 'need']],
    [3, 'modal', 'The GPS was off; the aircraft ____ have known its position.', 'can\'t', ['can\'t', 'must', 'should', 'might', 'ought to', 'would']],
    [2, 'conditional', 'If the wind ____ strong, we will not fly.', 'is', ['is', 'will be', 'was', 'were', 'would be', 'has been']],
    [2, 'conditional', 'If you charge the battery now, it ____ ready by noon.', 'will be', ['will be', 'is', 'was', 'would be', 'has been', 'be']],
    [2, 'conditional', 'If I ____ a bigger field, I would fly a larger model.', 'had', ['had', 'have', 'will have', 'would have', 'has', 'having']],
    [3, 'conditional', 'If we had checked the servo, the crash ____ happened.', 'wouldn\'t have', ['wouldn\'t have', 'won\'t have', 'didn\'t', 'hasn\'t', 'wouldn\'t', 'hadn\'t']],
    [3, 'conditional', 'Unless the weather ____, the exam will be postponed.', 'improves', ['improves', 'will improve', 'improved', 'would improve', 'improve', 'has improved']],
    [3, 'conditional', 'I wish I ____ more time to practise on the simulator.', 'had', ['had', 'have', 'will have', 'would have', 'having', 'has']],
    [2, 'tag', 'You are the instructor, ____?', 'aren\'t you', ['aren\'t you', 'are you', 'isn\'t it', 'don\'t you', 'weren\'t you', 'do you']],
    [2, 'tag', 'He didn\'t land safely, ____?', 'did he', ['did he', 'didn\'t he', 'does he', 'was he', 'had he', 'is he']],
    [2, 'tag', 'They have finished the checklist, ____?', 'haven\'t they', ['haven\'t they', 'have they', 'didn\'t they', 'don\'t they', 'aren\'t they', 'hadn\'t they']],
    [2, 'tag', 'Let\'s start the engine, ____?', 'shall we', ['shall we', 'will we', 'do we', 'don\'t we', 'shan\'t we', 'are we']],
    [1, 'quantity', 'There isn\'t ____ fuel left in the tank.', 'much', ['much', 'many', 'a few', 'few', 'several', 'every']],
    [1, 'quantity', 'How ____ propellers do we have?', 'many', ['many', 'much', 'a lot', 'little', 'any', 'some']],
    [1, 'quantity', 'We have ____ spare batteries, but not many.', 'a few', ['a few', 'a little', 'much', 'any', 'every', 'none']],
    [1, 'quantity', 'Is there ____ wind today?', 'any', ['any', 'some', 'many', 'a few', 'every', 'much of']],
    [2, 'quantity', '____ pilot must sign the logbook.', 'Every', ['Every', 'All', 'Much', 'Many', 'Any of', 'Few']],
    [2, 'conjunction', 'We landed early ____ the battery was low.', 'because', ['because', 'although', 'so that', 'unless', 'until', 'whereas']],
    [2, 'conjunction', '____ it was windy, the flight went well.', 'Although', ['Although', 'Because', 'So', 'Unless', 'Therefore', 'Since']],
    [2, 'conjunction', 'Check the propeller ____ you fly.', 'before', ['before', 'until', 'while', 'so', 'although', 'unless']],
    [3, 'conjunction', 'Keep the altitude ____ the battery reaches 30%.', 'until', ['until', 'while', 'unless', 'because', 'although', 'whereas']],
    [3, 'conjunction', 'The flight was cancelled ____ the fog.', 'due to', ['due to', 'because', 'although', 'despite of', 'however', 'so that']],
    [3, 'conjunction', '____ the risk, the team completed the mission.', 'Despite', ['Despite', 'Although', 'Because of', 'However', 'Even', 'Unless']],
    [2, 'gerund', 'I enjoy ____ gliders in the evening.', 'flying', ['flying', 'to fly', 'fly', 'flew', 'flown', 'to flying']],
    [2, 'gerund', 'She wants ____ a new drone.', 'to buy', ['to buy', 'buying', 'buy', 'bought', 'to buying', 'buys']],
    [2, 'gerund', 'Don\'t forget ____ the battery before the flight.', 'to charge', ['to charge', 'charging', 'charge', 'charged', 'to charging', 'charges']],
    [3, 'gerund', 'The instructor suggested ____ the mission in two parts.', 'splitting', ['splitting', 'to split', 'split', 'splits', 'to splitting', 'splitted']],
    [3, 'gerund', 'He stopped ____ because the signal was weak.', 'flying', ['flying', 'to fly', 'fly', 'flown', 'flew', 'to flying']],
    [2, 'relative', 'The pilot ____ landed first won the prize.', 'who', ['who', 'which', 'whose', 'where', 'when', 'what']],
    [2, 'relative', 'This is the field ____ we usually fly.', 'where', ['where', 'which', 'who', 'whose', 'what', 'when']],
    [2, 'relative', 'The drone ____ camera broke is in the workshop.', 'whose', ['whose', 'who', 'which', 'where', 'that', 'whom']],
    [3, 'relative', 'The report, ____ was written yesterday, explains the crash.', 'which', ['which', 'that', 'who', 'whose', 'what', 'where']],
    [3, 'reported', 'The instructor said that the exam ____ on Monday.', 'would be', ['would be', 'will be', 'is', 'be', 'has been', 'being']],
    [3, 'reported', 'She asked me ____ the battery.', 'if I had charged', ['if I had charged', 'did I charge', 'if I charge', 'that I charged', 'have I charged', 'whether I charging']],
    [3, 'reported', 'He told us ____ near the propeller.', 'not to stand', ['not to stand', 'don\'t stand', 'to not standing', 'no standing', 'not stand', 'that not stand']],
    [1, 'pronoun', 'This transmitter is ____. I bought it last year.', 'mine', ['mine', 'my', 'me', 'I', 'myself', 'our']],
    [1, 'pronoun', 'Give the battery to ____; he needs it.', 'him', ['him', 'he', 'his', 'himself', 'her', 'they']],
    [1, 'pronoun', 'The students fixed the wing ____.', 'themselves', ['themselves', 'theirselves', 'them', 'their', 'theirs', 'they']],
    [1, 'pronoun', '____ drone is this? — It is Ayşe\'s.', 'Whose', ['Whose', 'Who', 'Which', 'What', 'Whom', 'Where']],
    [1, 'be', 'The pilots ____ ready for the flight.', 'are', ['are', 'is', 'am', 'be', 'was', 'been']],
    [1, 'be', 'There ____ a strong wind yesterday.', 'was', ['was', 'were', 'is', 'are', 'be', 'been']],
    [1, 'be', 'I ____ a student pilot.', 'am', ['am', 'is', 'are', 'be', 'was', 'were']],
    [1, 'be', 'The weather ____ good last week.', 'wasn\'t', ['wasn\'t', 'weren\'t', 'isn\'t', 'aren\'t', 'not was', 'didn\'t']],
    [2, 'adverb', 'He landed the model very ____.', 'carefully', ['carefully', 'careful', 'care', 'carefulness', 'more careful', 'carefuly']],
    [2, 'adverb', 'The drone flies ____ than the plane.', 'more slowly', ['more slowly', 'slowlier', 'slow', 'slowest', 'slowly', 'most slowly']],
    [2, 'adverb', 'She ____ checks the battery before flying.', 'always', ['always', 'ever', 'yet', 'already', 'still', 'never ago']],
    [2, 'adverb', 'Have you ____ flown a VTOL?', 'ever', ['ever', 'never', 'yet', 'already', 'still', 'always']],
    [2, 'adverb', 'We haven\'t finished the checklist ____.', 'yet', ['yet', 'already', 'ever', 'still', 'just', 'since']],
    [3, 'inversion', '____ had we taken off when the alarm sounded.', 'Hardly', ['Hardly', 'Only', 'Never', 'Rarely', 'Seldom', 'Not until']],
    [3, 'inversion', 'Not only ____ the battery, but he also replaced the propeller.', 'did he check', ['did he check', 'he checked', 'he did check', 'checked he', 'does he check', 'he checks']],
    [3, 'collocation', 'The pilot ____ a decision to abort the landing.', 'made', ['made', 'did', 'took up', 'gave', 'put', 'held']],
    [3, 'collocation', 'Please ____ attention to the wind direction.', 'pay', ['pay', 'make', 'do', 'give', 'take', 'put']],
    [3, 'collocation', 'We ____ the risk of losing the signal into account.', 'took', ['took', 'made', 'did', 'gave', 'put', 'got']],
    [3, 'phrasal', 'The engine ____ down during the climb.', 'broke', ['broke', 'went', 'came', 'put', 'took', 'turned']],
    [3, 'phrasal', 'Please ____ off the transmitter after landing.', 'turn', ['turn', 'take', 'put', 'make', 'give', 'look']],
    [3, 'phrasal', 'We had to ____ off the flight because of fog.', 'call', ['call', 'turn', 'take', 'give', 'set', 'bring']],
    [3, 'phrasal', 'The team ____ up a new checklist for the VTOL.', 'drew', ['drew', 'made', 'took', 'put', 'brought', 'gave']],
  ];
  MISC.forEach(([lvl, sub, s, c, w]) => GAP(lvl, sub, s, c, w));

  // sözlük: çevrimdışı çeviri ve kelime testi için
  window.QBANK_GEN = { v: '2026.11.23', questions: out };
})();
