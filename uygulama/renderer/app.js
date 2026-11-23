// Sınav Hazırlama Sistemi – arayüz mantığı
const api = window.api;
const LK = ['tr', 'en', 'ar'];
const t = window.t;
window.__app = {};
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const newId = () => (Date.now().toString(36) + uid() + uid()).slice(0, 24);
const MOBILE = api.platform === 'android';
const ML = (v) => ({ tr: '', en: '', ar: '', ...(v || {}) });

const DEFAULT_SETTINGS = {
  optionCount: 5, columns: 1, fontSize: 12, font: 'Times New Roman',
  showInfo: true, markCorrect: true, keyAtEnd: true, pageNumbers: true, inlineShort: true,
  scenNewPage: false, scenLines: 4,
  margins: { top: 1.8, bottom: 1.8, left: 1.8, right: 1.8 },
  tplMargins: { top: 3.5, bottom: 2.5, left: 2, right: 2 },
};

/* ------------------------------------------------------------------ durum */
let exam = newExam();
let filePath = null;
let dirty = false;
let template = null;
const selected = new Set();
const undoStack = [];
const prefs = loadPrefs();
window.prefs = prefs;

function newExam() {
  return {
    app: 'sinav-hazirlama', version: 2, id: newId(), school: ML(), title: ML(), instructions: ML(), questions: [],
    scenarios: [], scenNote: ML(), vocab: { title: ML(), pointsEach: 1, cols: { ar: true, tr: false }, items: [], okWords: { en: [], ar: [], tr: [] } },
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}
function newScenQ(points) {
  return { id: uid(), text: ML(), answer: ML(), points: points == null ? 5 : points, lines: S().scenLines };
}
function newScenario(points) {
  return { id: uid(), title: ML(), text: ML(), questions: [newScenQ(points)] };
}
function newVocabItem() { return { id: uid(), term: '', meaning: '', tr: '' }; }
function newQuestion() {
  return { id: uid(), text: ML(), options: [0, 1, 2, 3, 4].map(() => ML()), correct: -1 };
}
function normalizeExam(e) {
  const x = newExam();
  if (/^[A-Za-z0-9]{6,40}$/.test(e.id || '')) x.id = e.id;
  x.school = ML(e.school); x.title = ML(e.title); x.instructions = ML(e.instructions);
  x.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(e.settings || {}) };
  x.settings.margins = { ...DEFAULT_SETTINGS.margins, ...(e.settings && e.settings.margins) };
  x.settings.tplMargins = { ...DEFAULT_SETTINGS.tplMargins, ...(e.settings && e.settings.tplMargins) };
  x.questions = (e.questions || []).map((q) => {
    const opts = (q.options || []).slice(0, 5).map(ML);
    while (opts.length < 5) opts.push(ML());
    return { id: q.id || uid(), text: ML(q.text), options: opts, correct: Number.isInteger(q.correct) ? q.correct : -1, ghost: !!q.ghost, tag: QTAGS.includes(q.tag) ? q.tag : '' };
  });
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
  x.scenarios = (e.scenarios || []).map((sc) => ({
    id: sc.id || uid(), title: ML(sc.title), text: ML(sc.text),
    questions: (sc.questions || []).map((q) => ({ id: q.id || uid(), text: ML(q.text), answer: ML(q.answer), points: num(q.points, 5), lines: num(q.lines, 4) })),
  }));
  x.scenNote = ML(e.scenNote);
  const v = e.vocab || {};
  // cols: hangi anlam sütunları açık (kapalı sütunun verisi saklanır); okWords: "Doğru" denen kelimeler (yazım denetimi atlar)
  const ok = v.okWords || {};
  x.vocab = {
    title: ML(v.title), pointsEach: num(v.pointsEach, 1),
    cols: { ar: !v.cols || v.cols.ar !== false, tr: !!(v.cols && v.cols.tr) },
    okWords: { en: [...new Set(ok.en || [])], ar: [...new Set(ok.ar || [])], tr: [...new Set(ok.tr || [])] },
    items: (v.items || []).map((it) => ({
      id: it.id || uid(), term: it.term || '',
      meaning: typeof it.meaning === 'string' ? it.meaning : LK.map((k) => (it.meaning || {})[k]).find(Boolean) || '',
      tr: typeof it.tr === 'string' ? it.tr : '',
      ...(it.verified ? { verified: it.verified } : {}), ...(it.trVerified ? { trVerified: it.trVerified } : {}), ...(it.off ? { off: true } : {}),
      ...(typeof it.av === 'boolean' ? { av: it.av } : {}), // elle verilen havacılık işareti (✈): true ekli, false kaldırılmış
    })),
  };
  if (!x.vocab.cols.ar && !x.vocab.cols.tr) x.vocab.cols.ar = true;
  return x;
}
function loadPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('prefs') || '{}'); } catch { /* yok */ }
  return { uiLang: 'tr', contentLang: 'tr', syncLang: true, includeBody: false, tab: 'test', updAtStart: true, ...p };
}
function savePrefs() { try { localStorage.setItem('prefs', JSON.stringify(prefs)); } catch { /* yok */ } }

const S = () => exam.settings;
const CL = () => prefs.contentLang;
const letters = (lang) => window.LETTERS[lang || CL()];
const isAnswered = (q) => q.correct >= 0 && q.correct < S().optionCount;
// Hayalet soru (1.9.4): listede durur, okunup düzenlenebilir ama numaralanmaz, sayılmaz, çıktıya ve cevap anahtarına girmez.
const liveQs = () => exam.questions.filter((q) => !q.ghost);
const qNumber = (q) => { let n = 0; for (const x of exam.questions) { if (!x.ghost) n++; if (x === q) return x.ghost ? 0 : n; } return 0; };
const qAtNumber = (n) => liveQs()[n - 1];
// Soru seviyesi etiketi (1.9.4): Öğrenci / Stajyer / Eğitmen / Uzman. Çıktıda ve listede süzmek için.
const QTAGS = ['ogr', 'stj', 'egt', 'uzm'];
const tagName = (k) => (k ? t('tag_' + k) : t('tagNone'));
let qFilter = ''; // '' = hepsi, 'none' = etiketsiz, yoksa etiket
const tagMatch = (q, f) => !f || (f === 'none' ? !q.tag : q.tag === f);
const visibleQs = () => exam.questions.filter((q) => tagMatch(q, qFilter));

/* ------------------------------------------------------------------ kayıt / geri al */
let saveTimer = null;
function changed() {
  dirty = true;
  updateFileName();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.writeAutosave({ exam, filePath, dirty }), 700);
  cloudDirty();
}
let textSnapArmed = true;
function snap() {
  undoStack.push(JSON.stringify(exam));
  if (undoStack.length > 150) undoStack.shift();
}
function snapText() {
  if (textSnapArmed) { snap(); textSnapArmed = false; }
  clearTimeout(snapText.t);
  snapText.t = setTimeout(() => { textSnapArmed = true; }, 1200);
}
function undo() {
  const s = undoStack.pop();
  if (!s) return;
  exam = normalizeExam(JSON.parse(s));
  renderAll();
  changed();
}

function updateFileName() {
  const name = filePath ? filePath.split(/[\\/]/).pop() : t('untitled');
  $('#fileName').textContent = name + (dirty ? ' •' : '');
  document.title = t('appTitle') + ' – ' + name;
}

async function saveExam(as) {
  let p = filePath;
  if (as || !p) {
    const docs = (exam.title[CL()] || exam.title.tr || 'sinav').replace(/[\\/:*?"<>|]/g, '').slice(0, 60) || 'sinav';
    p = await api.saveDialog({ defaultPath: docs + '.sinav', filters: [{ name: 'Sınav', extensions: ['sinav'] }, { name: 'JSON', extensions: ['json'] }] });
    if (!p) return false;
  }
  await api.writeExam(p, exam);
  filePath = p; dirty = false;
  updateFileName();
  api.writeAutosave({ exam, filePath, dirty });
  if (MOBILE) savedToast(p); else toast(t('saved') + ': ' + p.split(/[\\/]/).pop(), 'ok');
  return true;
}
async function openExam() {
  const p = await api.openDialog({ filters: [{ name: 'Sınav', extensions: ['sinav', 'json'] }] });
  if (!p) return;
  try {
    const data = await api.readExam(p);
    snap();
    exam = normalizeExam(data);
    filePath = p; dirty = false;
    selected.clear();
    renderAll();
    api.writeAutosave({ exam, filePath, dirty });
    cloudSoon();
  } catch (e) { toast(t('error') + ': ' + e.message, 'err'); }
}
async function newExamAction() {
  if ((exam.questions.length || exam.scenarios.length || exam.vocab.items.length) && !(await confirmBox(t('confirmNew')))) return;
  snap();
  const keep = exam.settings;
  exam = newExam();
  exam.settings = keep;
  filePath = null; selected.clear();
  renderAll(); changed();
}

/* ------------------------------------------------------------------ arayüz dili */
function fillLangSelect(sel, value) {
  sel.innerHTML = LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('');
  sel.value = value;
}
function applyUiLang() {
  window.UI_LANG = prefs.uiLang;
  document.documentElement.lang = prefs.uiLang;
  document.documentElement.dir = prefs.uiLang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  fillLangSelect($('#uiLang'), prefs.uiLang);
  fillLangSelect($('#contentLang'), prefs.contentLang);
  updateFileName();
}

/* ------------------------------------------------------------------ çizim */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function otherLangText(ml) {
  const cl = CL();
  for (const k of LK) if (k !== cl && ml[k] && ml[k].trim()) return `[${k.toUpperCase()}] ${ml[k]}`;
  return '';
}
function bindML(el, ml, phKey, onInput) {
  const cl = CL();
  el.value = ml[cl] || '';
  el.dir = cl === 'ar' ? 'rtl' : 'auto';
  const other = !ml[cl] ? otherLangText(ml) : '';
  el.placeholder = other || (phKey ? t(phKey) : '');
  el.classList.toggle('ph-other', !!other);
  if (other) el.title = t('missingTr');
  el.oninput = () => { snapText(); ml[cl] = el.value; changed(); if (onInput) onInput(); };
}

function renderExamInfo() {
  bindML($('#fSchool'), exam.school);
  bindML($('#fTitle'), exam.title, 'examTitlePh');
  bindML($('#fInstr'), exam.instructions, 'instructionsPh');
}

function langBadges(q) {
  return LK.map((k) => {
    const has = (q.text[k] || '').trim() && q.options.slice(0, S().optionCount).every((o) => (o[k] || '').trim());
    return `<span class="${has ? 'has' : ''}" title="${t('langStatus')}">${k.toUpperCase()}</span>`;
  }).join('');
}

function questionCard(q, i) {
  const card = document.createElement('section');
  card.className = 'card q' + (q.ghost ? ' ghost' : '');
  card.id = 'q-' + q.id;
  const n = S().optionCount;
  const L = letters();
  card.innerHTML = `
    <div class="qhead">
      <input type="checkbox" class="qsel" ${selected.has(q.id) ? 'checked' : ''}>
      <div class="qnum" title="${q.ghost ? t('ghostNum') : t('moveTo')}">${q.ghost ? '👻' : qNumber(q)}</div>
      <span class="qstatus"></span>
      <span class="qlangs">${langBadges(q)}</span>
      <select class="qtag${q.tag ? ' on' : ''}" title="${esc(t('tagTip'))}"><option value="">${esc(t('tagNone'))}</option>${QTAGS.map((k) => `<option value="${k}" ${q.tag === k ? 'selected' : ''}>${esc(t('tag_' + k))}</option>`).join('')}</select>
      <div class="qtools">
        <button data-a="up" title="${t('moveUp')}">↑</button>
        <button data-a="down" title="${t('moveDown')}">↓</button>
        <button data-a="moveto" title="${t('moveTo')}">#⇅ ${t('move')}</button>
        <button data-a="dup" title="${t('duplicate')}">⧉</button>
        <button data-a="shuffle" title="${t('shuffleOptions')}">⇄</button>
        <button data-a="tr" title="${t('translate')}">🌐 ${t('translate')}</button>
        <button data-a="ghost" class="ghostbtn${q.ghost ? ' on' : ''}" title="${t(q.ghost ? 'ghostOffTip' : 'ghostOnTip')}">👻 ${t(q.ghost ? 'ghostOff' : 'ghostOn')}</button>
        <button data-a="del" class="del" title="${t('delete')}">🗑</button>
      </div>
    </div>
    <textarea class="stem" rows="2"></textarea>
    <div class="opts">${Array.from({ length: n }, (_, k) => `
      <div class="opt" data-k="${k}">
        <button class="letter" title="${t('markCorrect')}">${L[k]}</button>
        <input type="text">
        <button class="mv" data-m="up" title="${t('moveUp')}">▲</button>
        <button class="mv" data-m="down" title="${t('moveDown')}">▼</button>
        <button class="mv" data-m="clr" title="${t('clearOption')}">✕</button>
      </div>`).join('')}
    </div>
    <div class="qfoot"><button data-a="insert">＋ ${t('insertBelow')}</button></div>`;

  const refreshBadges = () => { $('.qlangs', card).innerHTML = langBadges(q); };
  bindML($('.stem', card), q.text, 'stemPh', refreshBadges);
  card.querySelectorAll('.opt').forEach((row) => {
    const k = +row.dataset.k;
    bindML($('input', row), q.options[k], null, refreshBadges);
    $('input', row).placeholder = $('input', row).placeholder || `${t('optionPh')} ${L[k]}`;
    $('.letter', row).onclick = () => { snap(); q.correct = q.correct === k ? -1 : k; refreshCorrect(card, q); updateSide(); changed(); };
    row.querySelectorAll('.mv').forEach((b) => {
      b.onclick = () => {
        const m = b.dataset.m;
        if (m === 'clr') { snap(); q.options[k] = ML(); if (q.correct === k) q.correct = -1; return rerenderCard(q); }
        const j = m === 'up' ? k - 1 : k + 1;
        if (j < 0 || j >= n) return;
        snap(); swapOptions(q, k, j); rerenderCard(q, j);
      };
    });
  });
  $('.qsel', card).onchange = (e) => { if (e.target.checked) selected.add(q.id); else selected.delete(q.id); updateSide(); };
  card.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => questionAction(b.dataset.a, q); });
  $('.qnum', card).onclick = () => { if (!q.ghost) moveToModal(q); };
  $('.qtag', card).onchange = (e) => { snap(); q.tag = e.target.value; e.target.classList.toggle('on', !!q.tag); updateSide(); changed(); };
  refreshCorrect(card, q);
  return card;
}

function refreshCorrect(card, q) {
  const L = letters();
  card.querySelectorAll('.opt').forEach((row) => row.classList.toggle('correct', +row.dataset.k === q.correct));
  const st = $('.qstatus', card);
  const ok = isAnswered(q);
  st.className = 'qstatus ' + (ok ? 'ok' : 'bad');
  st.textContent = ok ? `✓ ${t('answer')}: ${L[q.correct]}` : `⚠ ${t('noAnswer')}`;
  if (q.ghost) { st.className = 'qstatus ghost'; st.textContent = `👻 ${t('ghostStatus')}` + (ok ? ` · ${L[q.correct]}` : ''); }
  card.classList.toggle('done', ok);
  card.classList.toggle('missing', !ok);
}

function rerenderCard(q, focusOpt) {
  const i = exam.questions.indexOf(q);
  const old = document.getElementById('q-' + q.id);
  const fresh = questionCard(q, i);
  old.replaceWith(fresh);
  if (focusOpt != null) $(`.opt[data-k="${focusOpt}"] input`, fresh).focus();
  updateSide(); changed();
}

function swapOptions(q, a, b) {
  [q.options[a], q.options[b]] = [q.options[b], q.options[a]];
  if (q.correct === a) q.correct = b; else if (q.correct === b) q.correct = a;
}
function shuffleQuestionOptions(q) {
  const n = S().optionCount;
  const idx = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const old = q.options.slice(0, n);
  for (let i = 0; i < n; i++) q.options[i] = old[idx[i]];
  if (q.correct >= 0 && q.correct < n) q.correct = idx.indexOf(q.correct);
}

async function questionAction(a, q) {
  const list = exam.questions;
  const i = list.indexOf(q);
  if (a === 'up' || a === 'down') {
    const j = a === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    snap(); [list[i], list[j]] = [list[j], list[i]];
    renderList(); changed(); scrollToQ(q.id);
  } else if (a === 'dup') {
    snap(); const c = JSON.parse(JSON.stringify(q)); c.id = uid(); list.splice(i + 1, 0, c);
    renderList(); changed(); scrollToQ(c.id);
  } else if (a === 'insert') {
    snap(); const c = newQuestion(); list.splice(i + 1, 0, c);
    renderList(); changed(); scrollToQ(c.id, true);
  } else if (a === 'shuffle') {
    snap(); shuffleQuestionOptions(q); rerenderCard(q);
  } else if (a === 'ghost') {
    setGhost([q], !q.ghost);
  } else if (a === 'del') {
    if (!(await confirmBox(t('confirmDeleteOne', { n: q.ghost ? '👻' : qNumber(q) })))) return;
    snap(); list.splice(i, 1); selected.delete(q.id); renderList(); changed();
  } else if (a === 'tr') {
    await translateQuestion(q);
  } else if (a === 'moveto') {
    moveToModal(q);
  }
}

// Hayalet yap / geri getir
function setGhost(qs, on) {
  const list = qs.filter((q) => !!q.ghost !== on);
  if (!list.length) return;
  snap();
  list.forEach((q) => { q.ghost = on; });
  renderList(); changed();
  toast(t(on ? 'ghostMade' : 'ghostBack', { n: list.length }), 'ok', [{ label: t('undo'), onClick: () => undo() }]);
}
// Soruyu sıra numarasıyla taşı: 95 -> 40 ise 40..94 birer sıra aşağı kayar; "yer değiştir" seçilirse yalnızca ikisi yer değiştirir
function moveQuestionTo(q, to, swap) {
  const list = exam.questions;
  const from = list.indexOf(q);
  const target = qAtNumber(to);
  const j = target ? list.indexOf(target) : -1;
  const fromN = qNumber(q);
  if (from < 0 || j < 0 || j === from) return false;
  snap();
  if (swap) [list[from], list[j]] = [list[j], list[from]];
  else { list.splice(from, 1); list.splice(j, 0, q); }
  renderList(); changed(); scrollToQ(q.id);
  toast(t(swap ? 'swapped' : 'movedTo', { a: fromN, b: to }), 'ok');
  return true;
}
function moveToModal(q) {
  const max = liveQs().length;
  const n = qNumber(q);
  if (max < 2 || !n) return;
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="help">${esc(t('moveToHelp'))}</p>
    <label class="f"><span>${esc(t('moveToLabel', { max }))}</span><input class="in" id="mvTo" type="number" min="1" max="${max}" step="1" inputmode="numeric"></label>
    <label class="chk"><input type="checkbox" id="mvSwap"> ${esc(t('moveToSwap'))}</label>
    <div id="mvMsg" style="font-size:13px;color:#c0392b;min-height:18px"></div>`;
  const go = (close) => {
    const v = parseInt($('#mvTo', body).value, 10);
    if (!(v >= 1 && v <= max)) { $('#mvMsg', body).textContent = t('moveToBad', { max }); return; }
    if (v !== n) moveQuestionTo(q, v, $('#mvSwap', body).checked);
    close();
  };
  const m = modal({
    title: t('moveToTitle', { n }), body,
    buttons: [{ label: t('cancel'), onClick: (c) => c() }, { label: t('move'), cls: 'primary', onClick: (c) => go(c) }],
  });
  m.el.querySelector('.modal').style.width = 'min(440px, 92vw)';
  const inp = $('#mvTo', body);
  inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(m.close); } };
  setTimeout(() => inp.focus(), 30);
}

function renderList() {
  const box = $('#qList');
  box.innerHTML = '';
  const frag = document.createDocumentFragment();
  exam.questions.forEach((q, i) => { const c = questionCard(q, i); if (!tagMatch(q, qFilter)) c.style.display = 'none'; frag.appendChild(c); });
  box.appendChild(frag);
  $('#emptyMsg').style.display = exam.questions.length ? 'none' : '';
  const fb = $('#filterBar');
  if (fb) { const vis = visibleQs().length; fb.style.display = qFilter ? '' : 'none'; $('#filterInfo').textContent = t('filterInfo', { n: vis, l: qFilter === 'none' ? t('tagNone') : tagName(qFilter) }); }
  updateSide();
}

function updateSide() {
  document.querySelector('.sidetools').style.display = prefs.tab === 'test' ? '' : 'none';
  updateTabCounts();
  if (prefs.tab === 'scen') return updateSideScen();
  if (prefs.tab === 'vocab') return updateSideVocab();
  const qs = liveQs();
  const ghosts = exam.questions.filter((q) => q.ghost);
  const L = letters();
  const ans = qs.filter(isAnswered).length;
  $('#stats').innerHTML = `
    <div class="stat"><b>${qs.length}</b><span>${t('total')}</span></div>
    <div class="stat ok"><b>${ans}</b><span>${t('answered')}</span></div>
    <div class="stat bad"><b>${qs.length - ans}</b><span>${t('missing')}</span></div>` +
    (ghosts.length ? `<div class="stat ghost" id="statGhost" title="${esc(t('ghostStatTip'))}"><b>${ghosts.length}</b><span>👻 ${t('ghostStat')}</span></div>` : '');
  if ($('#statGhost')) { let gi = 0; $('#statGhost').onclick = () => { const g = exam.questions.filter((q) => q.ghost); if (!g.length) return; scrollToQ(g[gi % g.length].id); gi++; }; }
  $('#navGrid').innerHTML = qs.map((q, i) => `<button class="nav ${isAnswered(q) ? 'ok' : 'bad'} ${selected.has(q.id) ? 'sel' : ''} ${tagMatch(q, qFilter) ? '' : 'off'}" data-id="${q.id}" title="${q.tag ? esc(tagName(q.tag)) : ''}">${i + 1}<small>${isAnswered(q) ? L[q.correct] : '–'}</small></button>`).join('');
  const fs = $('#qFilter');
  if (fs) {
    const cnt = (f) => exam.questions.filter((q) => tagMatch(q, f)).length;
    fs.innerHTML = `<option value="">${esc(t('filterAll'))} (${exam.questions.length})</option>` + QTAGS.map((k) => `<option value="${k}">${esc(t('tag_' + k))} (${cnt(k)})</option>`).join('') + `<option value="none">${esc(t('tagNone'))} (${cnt('none')})</option>`;
    fs.value = qFilter;
    const ts = $('#tagSel');
    if (ts) ts.innerHTML = `<option value="-">…</option>` + QTAGS.map((k) => `<option value="${k}">${esc(t('tag_' + k))}</option>`).join('') + `<option value="">${esc(t('tagClear'))}</option>`;
  }
  $('#navGrid').querySelectorAll('.nav').forEach((b) => { b.onclick = () => { if (b.classList.contains('off')) { qFilter = ''; renderList(); } scrollToQ(b.dataset.id); }; });
  // ana cevap anahtarı (listenin sonunda)
  const n = S().optionCount;
  $('#keyGrid').innerHTML = qs.map((q, i) => `<div class="kcell ${isAnswered(q) ? '' : 'none'}"><b data-id="${q.id}">${i + 1}.</b><select data-id="${q.id}"><option value="-1">–</option>${L.slice(0, n).map((l, k) => `<option value="${k}" ${q.correct === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('');
  $('#keyGrid').querySelectorAll('select').forEach((s) => {
    s.onchange = () => {
      const q = exam.questions.find((x) => x.id === s.dataset.id);
      snap(); q.correct = +s.value;
      const card = document.getElementById('q-' + q.id);
      if (card) refreshCorrect(card, q);
      updateSide(); changed();
    };
  });
  $('#keyGrid').querySelectorAll('b').forEach((b) => { b.onclick = () => scrollToQ(b.dataset.id); });
  $('#keyPanel').style.display = qs.length ? '' : 'none';
}

function scrollToQ(id, focus) {
  const el = document.getElementById('q-' + id);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.animate([{ boxShadow: '0 0 0 3px #1f5fbf' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
  if (focus) $('.stem', el).focus();
}

function renderAll() {
  applyUiLang();
  if (MOBILE) renderSettingsInline();
  renderExamInfo();
  applyTab();
  renderList();
  renderScenarios();
  renderVocab();
  updateSide();
}

/* ------------------------------------------------------------------ sekmeler */
function applyTab() {
  const tab = prefs.tab || 'test';
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  fitAllTA();
  // telefonda üç bölüm alt alta durur (kaydırmalı sekme yok); düğmeler ilgili bölüme götürür
  $('#testPane').style.display = MOBILE || tab === 'test' ? '' : 'none';
  $('#scenPane').style.display = MOBILE || tab === 'scen' ? '' : 'none';
  $('#vocabPane').style.display = MOBILE || tab === 'vocab' ? '' : 'none';
}
function updateTabCounts() {
  $('#cntTest').textContent = liveQs().length;
  $('#cntScen').textContent = exam.scenarios.length;
  $('#cntVocab').textContent = vocabCountText();
}
function setTab(tab) {
  prefs.tab = tab; savePrefs(); applyTab(); updateSide();
  if (MOBILE) $({ test: '#testPane', scen: '#scenPane', vocab: '#vocabPane' }[tab]).scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* ------------------------------------------------------------------ senaryolar */
const scenPoints = (sc) => sc.questions.reduce((a, q) => a + (+q.points || 0), 0);
// kapatılan (off) kelimeler listede kalır ama hiçbir çıktıya, sayıya ve puana girmez
const VCOLS = () => exam.vocab.cols;
const itemHasText = (it, cols = VCOLS()) => !!((it.term || '').trim() || (cols.ar && (it.meaning || '').trim()) || (cols.tr && (it.tr || '').trim()));
const vocabFilled = () => exam.vocab.items.filter((it) => !it.off && itemHasText(it));
const vocabOffCount = () => exam.vocab.items.filter((it) => it.off).length;
const vocabCountText = () => { const n = exam.vocab.items.length, off = vocabOffCount(); return off ? `${n - off}/${n}` : String(n); };
const vocabPoints = () => vocabFilled().length * (+exam.vocab.pointsEach || 0);
const fmtPts = (n) => String(Math.round(n * 100) / 100).replace('.', prefs.uiLang === 'tr' ? ',' : '.');

function scenBadges(sc) {
  return LK.map((k) => {
    const has = (sc.text[k] || '').trim() && sc.questions.every((q) => (q.text[k] || '').trim() || (q.answer[k] || '').trim());
    return `<span class="${has ? 'has' : ''}">${k.toUpperCase()}</span>`;
  }).join('');
}

function scenarioCard(sc, i) {
  const card = document.createElement('section');
  card.className = 'card scen';
  card.id = 's-' + sc.id;
  card.innerHTML = `
    <div class="qhead">
      <div class="qnum scn">${t('scenario')} ${i + 1}</div>
      <input type="text" class="stitle">
      <span class="qstatus ok spts"></span>
      <span class="qlangs">${scenBadges(sc)}</span>
      <div class="qtools">
        <button data-a="up" title="${t('moveUp')}">↑</button>
        <button data-a="down" title="${t('moveDown')}">↓</button>
        <button data-a="dup" title="${t('duplicate')}">⧉</button>
        <button data-a="tr" title="${t('translate')}">🌐 ${t('translate')}</button>
        <button data-a="ghost" class="ghostbtn${q.ghost ? ' on' : ''}" title="${t(q.ghost ? 'ghostOffTip' : 'ghostOnTip')}">👻 ${t(q.ghost ? 'ghostOff' : 'ghostOn')}</button>
        <button data-a="del" class="del" title="${t('delete')}">🗑</button>
      </div>
    </div>
    <textarea class="stext" rows="4"></textarea>
    <div class="sqs">${sc.questions.map((q, k) => `
      <div class="sq" data-k="${k}">
        <div class="sqrow">
          <span class="sqnum">${k + 1}.</span>
          <textarea class="sqtext" rows="2"></textarea>
          <label class="mini">${t('points')}<input type="number" class="sqpts" min="0" step="0.5" value="${q.points}"></label>
          <label class="mini">${t('answerLines')}<input type="number" class="sqlines" min="0" max="30" value="${q.lines}"></label>
          <div class="sqtools">
            <button data-m="up" title="${t('moveUp')}">▲</button>
            <button data-m="down" title="${t('moveDown')}">▼</button>
            <button data-m="del" class="del" title="${t('delete')}">🗑</button>
          </div>
        </div>
        <div class="sqans"><span>✓ ${t('expectedAnswer')}</span><textarea class="sqanswer" rows="2"></textarea></div>
      </div>`).join('')}
    </div>
    <div class="qfoot"><button data-a="addq">${t('addScenQ')}</button></div>`;
  const refresh = () => { $('.qlangs', card).innerHTML = scenBadges(sc); $('.spts', card).textContent = `Σ ${fmtPts(scenPoints(sc))} ${t('points').toLowerCase()}`; };
  bindML($('.stitle', card), sc.title, 'scenTitlePh', () => { refresh(); });
  bindML($('.stext', card), sc.text, 'scenTextPh', refresh);
  card.querySelectorAll('.sq').forEach((row) => {
    const k = +row.dataset.k;
    const q = sc.questions[k];
    bindML($('.sqtext', row), q.text, 'scenQPh', refresh);
    bindML($('.sqanswer', row), q.answer, 'scenAnsPh', refresh);
    $('.sqpts', row).oninput = (e) => { snapText(); q.points = Math.max(0, parseFloat(e.target.value) || 0); refresh(); updateSide(); changed(); };
    $('.sqlines', row).oninput = (e) => { snapText(); q.lines = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)); changed(); };
    row.querySelectorAll('[data-m]').forEach((b) => {
      b.onclick = async () => {
        const m = b.dataset.m;
        if (m === 'del') {
          if (sc.questions.length === 1 && !(await confirmBox(t('confirmDeleteScen', { n: i + 1 })))) return;
          snap(); sc.questions.splice(k, 1);
          if (!sc.questions.length) { exam.scenarios.splice(exam.scenarios.indexOf(sc), 1); renderScenarios(); } else rerenderScen(sc);
          changed(); return;
        }
        const j = m === 'up' ? k - 1 : k + 1;
        if (j < 0 || j >= sc.questions.length) return;
        snap(); [sc.questions[k], sc.questions[j]] = [sc.questions[j], sc.questions[k]]; rerenderScen(sc); changed();
      };
    });
  });
  card.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => scenAction(b.dataset.a, sc); });
  refresh();
  return card;
}
function rerenderScen(sc, focusLast) {
  const old = document.getElementById('s-' + sc.id);
  const fresh = scenarioCard(sc, exam.scenarios.indexOf(sc));
  old.replaceWith(fresh);
  if (focusLast) { const ts = fresh.querySelectorAll('.sqtext'); ts[ts.length - 1].focus(); }
  updateSide();
}
async function scenAction(a, sc) {
  const list = exam.scenarios;
  const i = list.indexOf(sc);
  if (a === 'up' || a === 'down') {
    const j = a === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    snap(); [list[i], list[j]] = [list[j], list[i]]; renderScenarios(); changed(); scrollToEl('s-' + sc.id);
  } else if (a === 'dup') {
    snap(); const c = JSON.parse(JSON.stringify(sc)); c.id = uid(); c.questions.forEach((q) => { q.id = uid(); });
    list.splice(i + 1, 0, c); renderScenarios(); changed(); scrollToEl('s-' + c.id);
  } else if (a === 'del') {
    if (!(await confirmBox(t('confirmDeleteScen', { n: i + 1 })))) return;
    snap(); list.splice(i, 1); renderScenarios(); changed();
  } else if (a === 'addq') {
    snap(); const last = sc.questions[sc.questions.length - 1];
    sc.questions.push(newScenQ(last ? last.points : 5)); rerenderScen(sc, true); changed();
  } else if (a === 'tr') {
    await translateFields([sc.title, sc.text, ...sc.questions.flatMap((q) => [q.text, q.answer])], document.getElementById('s-' + sc.id));
    rerenderScen(sc); changed();
  }
}
function renderTplInfo() {
  $('#scenTplInfo').textContent = template ? t('scenTplOn', { n: template.name }) : t('scenTplOff');
  $('#scenTplInfo').className = template ? 'on' : '';
}
function renderScenarios() {
  renderTplInfo();
  const box = $('#sList');
  box.innerHTML = '';
  const frag = document.createDocumentFragment();
  exam.scenarios.forEach((sc, i) => frag.appendChild(scenarioCard(sc, i)));
  box.appendChild(frag);
  $('#scenEmpty').style.display = exam.scenarios.length ? 'none' : '';
  bindML($('#fScenNote'), exam.scenNote, 'scenNotePh');
  updateSide();
}
function updateSideScen() {
  const sc = exam.scenarios;
  const nq = sc.reduce((a, s) => a + s.questions.length, 0);
  const total = sc.reduce((a, s) => a + scenPoints(s), 0);
  $('#stats').innerHTML = `
    <div class="stat"><b>${sc.length}</b><span>${t('scenCount')}</span></div>
    <div class="stat"><b>${nq}</b><span>${t('scenQCount')}</span></div>
    <div class="stat ok"><b>${fmtPts(total)}</b><span>${t('points')}</span></div>`;
  $('#navGrid').innerHTML = sc.map((s, i) => {
    const ok = s.questions.every((q) => (q.answer[CL()] || '').trim() || LK.some((k) => (q.answer[k] || '').trim()));
    return `<button class="nav ${ok ? 'ok' : 'bad'}" data-id="s-${s.id}">S${i + 1}<small>${fmtPts(scenPoints(s))}</small></button>`;
  }).join('');
  $('#navGrid').querySelectorAll('.nav').forEach((b) => { b.onclick = () => scrollToEl(b.dataset.id); });
  // puan tablosu
  const rows = sc.map((s, i) => `<tr><td>${t('scenario')} ${i + 1}</td><td>${esc(s.title[CL()] || otherLangText(s.title))}</td><td>${s.questions.length}</td><td><b>${fmtPts(scenPoints(s))}</b></td></tr>`).join('');
  const vp = vocabPoints();
  $('#scenSummaryTable').innerHTML = sc.length ? `<table class="ptable"><thead><tr><th>#</th><th>${t('scenTitlePh').replace(/\s*\(.*\)/, '')}</th><th>${t('scenQCount')}</th><th>${t('points')}</th></tr></thead><tbody>${rows}
    ${vp ? `<tr><td colspan="3">${esc(exam.vocab.title[CL()] || t('tabVocab'))}</td><td><b>${fmtPts(vp)}</b></td></tr>` : ''}
    <tr class="tot"><td colspan="3">${t('totalPoints')}</td><td><b>${fmtPts(total + vp)}</b></td></tr></tbody></table>` : '';
  $('#scenSummary').style.display = sc.length ? '' : 'none';
}
function scrollToEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.animate([{ boxShadow: '0 0 0 3px #1f5fbf' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
}

/* ------------------------------------------------------------------ kelime testi */
// Alanlar: kelime (İngilizce) her zaman; Arapça ve Türkçe anlam sütunları açılıp kapatılabilir
const VF = [
  { k: 'term', lang: 'en', cls: 'vterm', td: 'ct' },
  { k: 'meaning', lang: 'ar', col: 'ar', cls: 'vmean', td: 'cm', ver: 'verified' },
  { k: 'tr', lang: 'tr', col: 'tr', cls: 'vtr', td: 'cr', ver: 'trVerified' },
];
const activeFields = () => VF.filter((f) => !f.col || VCOLS()[f.col]);
const fieldName = (f) => t({ term: 'vocabColEn', meaning: 'vocabColAr', tr: 'vocabColTr' }[f.k]);
let vocabOnlyWarn = false;

/* ---- yazım denetimi (internetsiz, Web Worker içinde) ---- */
const LS_OK = 'spell.ok';
function okWords(lang) {
  let g = [];
  try { g = (JSON.parse(localStorage.getItem(LS_OK) || '{}')[lang]) || []; } catch { /* yok */ }
  return [...new Set([...(exam.vocab.okWords[lang] || []), ...g])];
}
function addOkWord(lang, w) {
  const x = lang === 'en' ? w.toLowerCase() : lang === 'tr' ? w.toLocaleLowerCase('tr') : w.replace(/[ً-ْٰـ]/g, '');
  const L = exam.vocab.okWords[lang];
  if (!L.includes(x)) L.push(x);
  try { const o = JSON.parse(localStorage.getItem(LS_OK) || '{}'); o[lang] = [...new Set([...(o[lang] || []), x])].slice(-5000); localStorage.setItem(LS_OK, JSON.stringify(o)); } catch { /* yok */ }
}
let spellTimer = null, spellBusy = false;
function scheduleSpell(ms = 500) {
  clearTimeout(spellTimer);
  spellTimer = setTimeout(runSpell, ms);
}
async function runSpell() {
  if (!window.Spell || spellBusy) { if (spellBusy) scheduleSpell(800); return; }
  spellBusy = true;
  let any = false;
  try {
    for (const f of activeFields()) {
      const texts = [...new Set(exam.vocab.items.map((it) => (it[f.k] || '').trim()).filter(Boolean))];
      const todo = texts.filter((x) => Spell.peek(f.lang, x) === undefined);
      if (!todo.length) continue;
      if (!Spell.ready(f.lang)) setSpellNote(t('spellLoading'));
      await Spell.check(f.lang, todo);
      any = true;
    }
  } catch (e) { console.error('yazım denetimi', e); }
  spellBusy = false;
  setSpellNote('');
  if (any) refreshVocabWarnings();
}
function setSpellNote(s) { const el = $('#vocabSpellNote'); if (el) el.textContent = s; }

/* ---- çevrimiçi anlam denetimi ve öneriler (çeviri servisiyle) ---- */
// anahtar: dil|kelime|anlam -> { alts: [], ok }  (cihazda saklanır, aynı kelime tekrar sorulmaz)
const LS_MT = 'vocab.mt2';
const mtCache = new Map();
try { Object.entries(JSON.parse(localStorage.getItem(LS_MT) || '{}')).forEach(([k, v]) => mtCache.set(k, v)); } catch { /* yok */ }
let mtSaveTimer = null;
function mtSave() {
  clearTimeout(mtSaveTimer);
  mtSaveTimer = setTimeout(() => {
    const ents = [...mtCache.entries()].slice(-4000);
    try { localStorage.setItem(LS_MT, JSON.stringify(Object.fromEntries(ents))); } catch { /* yer yok */ }
  }, 1000);
}
const mtKey = (lang, term, mean) => `${lang}\u0001${term.trim().toLowerCase()}\u0001${mean.trim()}`;
const mtOf = (f, it) => mtCache.get(mtKey(f.lang, it.term || '', it[f.k] || ''));
const sameText = (a, b, lang) => {
  const n = (x) => (lang === 'ar' ? window.VocabTools.normAr(x) : String(x || '').toLocaleLowerCase('tr').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim());
  return n(a) === n(b);
};

function vocabWarnings() {
  const items = exam.vocab.items;
  const cols = VCOLS();
  const res = window.VocabTools.checkItems(items, cols);
  const add = (i, w) => { if (!res.has(i)) res.set(i, []); res.get(i).push(w); };
  items.forEach((it, i) => {
    for (const f of activeFields()) {
      const val = (it[f.k] || '').trim();
      if (!val) {
        // boş anlam: çeviri önerisiyle doldurulabilir
        const r = f.col && (it.term || '').trim() ? mtOf(f, it) : null;
        if (r && r.alts && r.alts.length) add(i, { code: 'vwFill', level: 'sug', vars: { f: fieldName(f) }, f, sugs: r.alts.slice(0, 4), mt: true });
        continue;
      }
      // yazım
      const sp = window.Spell ? Spell.peek(f.lang, val, okWords(f.lang)) : undefined;
      (sp || []).forEach((b) => {
        if (b.kind === 'bad') add(i, { code: 'vwSpell', level: 'warn', vars: { w: b.w, f: fieldName(f) }, f, word: b.w, sugs: b.sugs, spell: true });
        else if (b.kind === 'alt') add(i, { code: 'vwSpellAlt', level: 'sug', vars: { w: b.w, f: fieldName(f) }, f, word: b.w, sugs: b.sugs, spell: true });
        else add(i, { code: 'vwSpellUnk', level: 'info', vars: { w: b.w, f: fieldName(f) }, f, word: b.w, sugs: [], spell: true });
      });
      // anlam (çeviri servisi)
      if (!f.col || !(it.term || '').trim()) continue;
      const r = mtOf(f, it);
      if (!r) continue;
      const alts = (r.alts || []).filter((a) => a && !sameText(a, val, f.lang)).slice(0, 4);
      if (!r.ok && it[f.ver] !== it[f.k]) add(i, { code: 'vwMT', level: 'warn', vars: { s: alts.join(' · ') || '—', f: fieldName(f) }, f, sugs: alts, mt: true });
      else if (alts.length) add(i, { code: 'vwMTSug', level: 'sug', vars: { f: fieldName(f) }, f, sugs: alts, mt: true });
    }
  });
  return res;
}
const LV = { err: ['⛔', 'e'], warn: ['⚠', 'w'], info: ['ℹ', 'i'], sug: ['💡', 's'] };
// metindeki kelimeyi (büyük/küçük harf farkı gözetmeden) öneriyle değiştirir; baş harf büyüklüğü korunur
const replaceWord = (text, w, s) => {
  const esc2 = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}])(${esc2})(?=$|[^\\p{L}])`, 'iu');
  return text.replace(re, (m, pre, hit) => {
    const cap = hit[0] !== hit[0].toLocaleLowerCase('tr');
    return pre + (cap ? s[0].toLocaleUpperCase('tr') + s.slice(1) : s);
  });
};
// uyarının ait olduğu alan (kutunun rengini yalnızca o alanda değiştirmek için)
const WARN_FIELD = { vwNotArabic: 'meaning', vwLatinInMeaning: 'meaning', vwUnsure: 'meaning', vwEmptyMeaning: 'meaning', vwSame: 'meaning', vwLong: 'meaning', vwDupMeaning: 'meaning', vwEmptyTr: 'tr', vwTrArabic: 'tr', vwTrSame: 'tr', vwDupTr: 'tr', vwEmptyTerm: 'term', vwDupTerm: 'term', vwSimilar: 'term', vwTermArabic: 'term' };
function refreshVocabWarnings() {
  const v = exam.vocab;
  const res = vocabWarnings();
  let ne = 0, nw = 0, ni = 0, ns = 0;
  const showSug = prefs.vocabSug !== false;
  document.querySelectorAll('#vocabRows tr.vrow').forEach((tr) => {
    const i = +tr.dataset.i;
    const it = v.items[i];
    const ws = res.get(i) || [];
    const top = ws.some((w) => w.level === 'err') ? 'err' : ws.some((w) => w.level === 'warn') ? 'warn' : ws.some((w) => w.level === 'info') ? 'info' : '';
    if (top === 'err') ne++; else if (top === 'warn') nw++; else if (top === 'info') ni++;
    const hasSug = ws.some((w) => w.level === 'sug');
    if (hasSug) ns++;
    tr.className = 'vrow ' + top + (it && it.off ? ' voff' : '');
    VF.forEach((f) => {
      const inp = $('.' + f.cls, tr);
      if (!inp) return;
      const lv = ws.filter((w) => (w.f ? w.f.k : WARN_FIELD[w.code]) === f.k).map((w) => w.level);
      inp.classList.toggle('fe', lv.includes('err'));
      inp.classList.toggle('fw', !lv.includes('err') && lv.includes('warn'));
    });
    const cell = $('td.vw', tr);
    const icon = top && top !== 'info' ? top : hasSug && showSug ? 'sug' : top;
    cell.innerHTML = icon ? `<span title="${esc(ws.map((w) => t(w.code, w.vars)).join('\n'))}">${LV[icon][0]}</span>` : '';
    const msg = tr.nextElementSibling;
    const shown = ws.filter((w) => w.level !== 'info' && (w.level !== 'sug' || showSug));
    msg.style.display = shown.length && (!vocabOnlyWarn || (top && top !== 'info')) ? '' : 'none';
    $('.msgs', msg).innerHTML = shown.map((w, wi) => {
      const chips = (w.sugs || []).map((sg, si) => `<button class="chip" data-x="sug" data-wi="${wi}" data-si="${si}" dir="auto">${esc(sg)}</button>`).join('');
      const okb = w.spell ? `<button data-x="okw" data-wi="${wi}">✓ ${t('vocabMarkOk')}</button>` : w.code === 'vwMT' ? `<button data-x="okm" data-wi="${wi}">✓ ${t('vocabMarkOk')}</button>` : '';
      const del = w.code === 'vwDupTerm' ? ` <button data-x="del">🗑 ${t('delete')}</button>` : '';
      return `<div class="${LV[w.level][1]}">${LV[w.level][0]} ${esc(t(w.code, w.vars))}${chips ? ` <span class="chips">${chips}</span>` : ''} ${okb}${del}</div>`;
    }).join('');
    msg.querySelectorAll('[data-x]').forEach((b) => {
      b.onclick = () => {
        const w = shown[+b.dataset.wi];
        snap();
        if (b.dataset.x === 'sug') {
          const sg = w.sugs[+b.dataset.si];
          if (w.spell) it[w.f.k] = replaceWord(it[w.f.k], w.word, sg);
          else { it[w.f.k] = sg; it[w.f.ver] = sg; }
          renderVocab();
        } else if (b.dataset.x === 'okw') { addOkWord(w.f.lang, w.word); refreshVocabWarnings(); }
        else if (b.dataset.x === 'okm') { it[w.f.ver] = it[w.f.k]; refreshVocabWarnings(); }
        else if (b.dataset.x === 'del') { v.items.splice(i, 1); renderVocab(); }
        changed();
      };
    });
    if (vocabOnlyWarn) tr.style.display = top && top !== 'info' ? '' : 'none'; else tr.style.display = '';
  });
  const box = $('#vocabWarn');
  if (!v.items.length) { box.innerHTML = ''; return; }
  const prog = box.querySelector('.progress');
  const lbl = box.querySelector('.plbl');
  box.innerHTML = `<div class="vsum">🔍 <span>${t('vocabWarnSum', { e: `<b class="e">${ne}</b>`, w: `<b class="w">${nw}</b>`, i: `<b class="i">${ni}</b>` })}${ns ? ` · 💡 ${t('vocabSugCount', { n: ns })}` : ''}</span>
    <span class="spellnote" id="vocabSpellNote"></span>
    <label><input type="checkbox" id="vShowSug" ${showSug ? 'checked' : ''}> ${t('vocabShowSug')}</label>
    <label><input type="checkbox" id="vOnlyWarn" ${vocabOnlyWarn ? 'checked' : ''}> ${t('vocabOnlyWarn')}</label></div>`;
  if (prog) box.appendChild(prog);
  if (lbl) box.appendChild(lbl);
  $('#vOnlyWarn').onchange = (e) => { vocabOnlyWarn = e.target.checked; refreshVocabWarnings(); };
  $('#vShowSug').onchange = (e) => { prefs.vocabSug = e.target.checked; savePrefs(); refreshVocabWarnings(); };
}
function vocabFieldChanged() { refreshVocabWarnings(); renderVocabLevels(); scheduleSpell(); scheduleMT(); }
function renderVocab() {
  const v = exam.vocab;
  const cols = VCOLS();
  const fs = activeFields();
  bindML($('#fVocabTitle'), v.title, 'vocabTitlePh');
  $('#fVocabPts').value = v.pointsEach;
  $('#fVocabPts').oninput = (e) => { snapText(); v.pointsEach = Math.max(0, parseFloat(e.target.value) || 0); updateSide(); changed(); };
  $('#vcAr').checked = cols.ar; $('#vcTr').checked = cols.tr;
  $('#vocabHead').innerHTML = `<th>#</th><th class="von"><div class="vonhead">${t('vocabOnCol')}</div><label class="sw" title="${esc(t('vocabMasterTip'))}"><input type="checkbox" id="vonAll"><span></span></label></th>${fs.map((f) => `<th>${esc(f.k === 'term' ? t('vocabTerm') : fs.length > 2 || f.k === 'tr' ? fieldName(f) : t('vocabMeaning'))}</th>`).join('')}<th class="vw"></th><th></th>`;
  const body = $('#vocabRows');
  body.className = 'c' + fs.length;
  body.innerHTML = v.items.map((it, i) => `<tr class="vrow${it.off ? ' voff' : ''}" data-i="${i}"><td class="n">${i + 1}</td><td class="von"><label class="sw" title="${esc(t(it.off ? 'vocabOffTip' : 'vocabOnTip'))}"><input type="checkbox" class="vonc"${it.off ? '' : ' checked'}><span></span></label></td>${fs.map((f) => `<td class="${f.td}">${f.k === 'term' ? '<div class="oxwrap"><input type="text" class="vterm" dir="auto"><span class="oxb"></span></div>' : `<input type="text" class="${f.cls}" dir="auto">`}</td>`).join('')}<td class="vw"></td>
    <td class="vt"><button data-m="up">▲</button><button data-m="down">▼</button><button data-m="del" class="del">🗑</button></td></tr><tr class="vmsg" style="display:none"><td></td><td colspan="${fs.length + 3}"><div class="msgs"></div></td></tr>`).join('');
  body.querySelectorAll('tr.vrow').forEach((tr) => {
    const i = +tr.dataset.i;
    const it = v.items[i];
    fs.forEach((f) => {
      const inp = $('.' + f.cls, tr);
      inp.value = it[f.k] || '';
      inp.placeholder = t({ term: 'vocabTermPh', meaning: 'vocabMeanPh', tr: 'vocabTrPh' }[f.k]);
      inp.oninput = () => { snapText(); it[f.k] = inp.value; if (f.k === 'term') oxBadge(tr, inp.value, it); changed(); };
      if (f.k === 'term') oxBadge(tr, inp.value, it);
      inp.onchange = vocabFieldChanged;
    });
    const on = $('.vonc', tr);
    on.onchange = () => {
      snap();
      if (on.checked) delete it.off; else it.off = true;
      tr.classList.toggle('voff', !!it.off);
      on.parentElement.title = t(it.off ? 'vocabOffTip' : 'vocabOnTip');
      updateTabCounts(); updateSide(); updateVocabBar(); changed();
    };
    tr.querySelectorAll('[data-m]').forEach((b) => {
      b.onclick = () => {
        const m = b.dataset.m;
        snap();
        if (m === 'del') v.items.splice(i, 1);
        else {
          const j = m === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= v.items.length) return;
          [v.items[i], v.items[j]] = [v.items[j], v.items[i]];
        }
        renderVocab(); changed();
      };
    });
  });
  $('#vocabEmpty').style.display = v.items.length ? 'none' : '';
  $('#btnVocabCheck').disabled = !v.items.length;
  $('#btnVocabDedupe').disabled = !v.items.length;
  updateVocabBar();
  refreshVocabWarnings();
  updateSide();
  if (v.items.length) { scheduleSpell(); scheduleMT(); }
}
function vocabSetCol(col, on) {
  const cols = VCOLS();
  if (!on && !(col === 'ar' ? cols.tr : cols.ar)) { toast(t('vocabColNeedOne'), 'warn'); renderVocab(); return; }
  snap();
  cols[col] = on;
  renderVocab(); changed();
}
// boş anlamları ilk öneriyle doldurur (geri alınabilir)
function vocabFillEmpty() {
  const fill = [];
  activeFields().filter((f) => f.col).forEach((f) => exam.vocab.items.forEach((it) => {
    if ((it.term || '').trim() && !(it[f.k] || '').trim()) { const r = mtOf(f, it); if (r && r.alts && r.alts[0]) fill.push([it, f, r.alts[0]]); }
  }));
  if (!fill.length) return toast(t('vocabFillNone'), 'warn');
  snap();
  fill.forEach(([it, f, s]) => { it[f.k] = s; });
  renderVocab(); changed();
  toast(t('vocabFilled', { n: fill.length }), 'ok', [{ label: t('undo'), onClick: () => undo() }], 7000);
}
// Oxford derecesi (A1–C1), Oxford 3000 anahtar kelime işareti ve havacılık/RC terimi işareti (✈); yalnızca ekranda, çıktıya girmez
function oxBadge(tr, term, it) {
  const b = $('.oxb', tr);
  if (!b) return;
  const r = window.oxfordLevel ? window.oxfordLevel(term) : null;
  const auto = window.isAviationTerm ? window.isAviationTerm(term) : false;
  const av = it && typeof it.av === 'boolean' ? it.av : auto;
  b.className = 'oxb' + (r ? ' l' + r.lvl : '');
  b.innerHTML = `<i class="av${av ? '' : ' ghost'}">✈</i>` + (r ? `${r.list === 3000 ? '<i>🔑</i>' : ''}<b>${r.lvl}</b>` : '');
  b.title = [t(av ? 'avTip' : 'avAddTip'), av ? t('avToggleTip') : '', r ? t(r.list === 3000 ? 'oxTip3' : r.list === 5000 ? 'oxTip5' : 'c2Tip', { w: r.word, l: r.lvl }) : ''].filter(Boolean).join('\n');
  if (!it) return;
  // kutuya tıklayınca ✈ eklenir / kaldırılır; otomatik sonuçla aynıysa elle seçim silinir
  b.onclick = () => {
    snap();
    const next = !av;
    if (next === auto) delete it.av; else it.av = next;
    oxBadge(tr, it.term, it);
    changed();
  };
}
function updateVocabBar() {
  const n = exam.vocab.items.length, off = vocabOffCount();
  const empties = activeFields().filter((f) => f.col).reduce((a, f) => a + exam.vocab.items.filter((it) => (it.term || '').trim() && !(it[f.k] || '').trim() && (mtOf(f, it) || {}).alts?.length).length, 0);
  $('#btnVocabFill').style.display = empties ? '' : 'none';
  $('#btnVocabFill').textContent = t('vocabFill', { n: empties });
  $('#btnVocabAllOn').disabled = !off;
  $('#btnVocabAllOff').disabled = !n || off === n;
  $('#vocabActive').textContent = n ? t('vocabActive', { a: n - off, n }) : '';
  renderVocabLevels();
  // başlıktaki ana anahtar: hepsi açıksa açık, hepsi kapalıysa kapalı, karışıksa ara durum
  const all = $('#vonAll');
  if (all) {
    all.checked = !!n && off === 0;
    all.indeterminate = off > 0 && off < n;
    all.disabled = !n;
    all.onchange = () => vocabSetAll(off === n);
  }
}
function vocabSetAll(on) {
  snap();
  exam.vocab.items.forEach((it) => { if (on) delete it.off; else it.off = true; });
  renderVocab(); updateTabCounts(); changed();
}
// Seviye çubuğu (A1–C1 Oxford, C2 Octanove, listede olmayanlar "Diğer"): seviyeye tıklayınca o seviyedeki kelimeler aktif olur
const VLVLS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'x'];
const itemLvl = (it) => { const r = window.oxfordLevel ? window.oxfordLevel(it.term) : null; return r ? r.lvl : 'x'; };
const lvlName = (l) => (l === 'x' ? t('vlvlOther') : l);
function renderVocabLevels() {
  const box = $('#vocabLevels');
  if (!box) return;
  const items = exam.vocab.items.filter((it) => (it.term || '').trim());
  if (!items.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = '';
  const st = Object.fromEntries(VLVLS.map((l) => [l, { n: 0, a: 0 }]));
  items.forEach((it) => { const s = st[itemLvl(it)] || st.x; s.n++; if (!it.off) s.a++; });
  const only = prefs.vocabLvlOnly !== false;
  box.innerHTML = `<b>${esc(t('vlvlTitle'))}</b>` + VLVLS.filter((l) => st[l].n || l === 'C2').map((l) => {
    const s = st[l];
    const cls = !s.n ? 'none' : s.a === s.n ? 'full' : s.a ? 'part' : 'none';
    const tip = t('vlvlTip', { l: lvlName(l), a: s.a, n: s.n }) + (l === 'x' ? '\n' + t('vlvlOtherTip') : '');
    return `<button class="lvchip l${l} ${cls}" data-l="${l}" title="${esc(tip)}">${esc(lvlName(l))}<small>${s.a}/${s.n}</small></button>`;
  }).join('') +
    `<button class="lvchip all" data-l="*">${esc(t('vlvlAll'))}</button>
    <label class="lvonly"><input type="checkbox" id="vlvlOnly"${only ? ' checked' : ''}> ${esc(t('vlvlOnly'))}</label>
    <span class="hint">${esc(t('vlvlNote'))}</span>`;
  box.querySelectorAll('.lvchip').forEach((b) => { b.onclick = () => vocabSetLevel(b.dataset.l); });
  $('#vlvlOnly', box).onchange = (e) => { prefs.vocabLvlOnly = e.target.checked; savePrefs(); };
}
function vocabSetLevel(l) {
  if (l === '*') return vocabSetAll(true);
  const items = exam.vocab.items;
  const only = prefs.vocabLvlOnly !== false;
  const mine = items.filter((it) => (it.term || '').trim() && itemLvl(it) === l);
  if (!mine.length) return;
  const others = items.filter((it) => !mine.includes(it));
  const allOn = mine.every((it) => !it.off);
  snap();
  let msg;
  if (only) {
    if (allOn && others.every((it) => it.off)) { items.forEach((it) => { delete it.off; }); msg = t('vocabActive', { a: items.length, n: items.length }); } // ikinci tıklama: hepsi açık
    else { mine.forEach((it) => { delete it.off; }); others.forEach((it) => { it.off = true; }); msg = t('vlvlDone', { l: lvlName(l), n: mine.length }); }
  } else if (allOn) { mine.forEach((it) => { it.off = true; }); msg = t('vlvlOff', { l: lvlName(l), n: mine.length }); }
  else { mine.forEach((it) => { delete it.off; }); msg = t('vlvlDone', { l: lvlName(l), n: mine.length }); }
  renderVocab(); updateTabCounts(); changed();
  toast(msg, 'ok', [{ label: t('undo'), onClick: () => undo() }]);
}
function updateSideVocab() {
  const v = exam.vocab;
  const off = vocabOffCount();
  $('#stats').innerHTML = `
    <div class="stat"><b>${v.items.length - off}${off ? `<small>/${v.items.length}</small>` : ''}</b><span>${t('vocabItems')}</span></div>
    <div class="stat"><b>${fmtPts(+v.pointsEach || 0)}</b><span>${t('vocabEach')}</span></div>
    <div class="stat ok"><b>${fmtPts(vocabPoints())}</b><span>${t('points')}</span></div>`;
  $('#navGrid').innerHTML = '';
}
async function vocabDedupe() {
  const r = window.VocabTools.dedupeList(exam.vocab.items);
  if (!r.removed.length) return toast(t('vocabNoDup'), 'ok');
  snap(); exam.vocab.items = r.kept; renderVocab(); changed();
  toast(t('vocabDeduped', { n: r.removed.length }), 'ok');
}
// Kelime listesi kaynağı: Word/Excel/CSV ana süreçte, PDF ve görseller arayüzde (pdf.js + internetsiz metin tanıma) okunur.
// Görselden oluşan Word belgelerinin içindeki resimler de tanınır.
async function readVocabSource(p, progress) {
  const ext = (p.split('.').pop() || '').toLowerCase();
  const DS = window.DocScan;
  const prog = (x) => progress(x.stage === 'ocr'
    ? t('vocabOcrProgress', { p: Math.round((x.p || 0) * 100), n: x.page, m: x.pages })
    : t('vocabPdfProgress', { n: x.page, m: x.pages }));
  if (ext === 'pdf') { progress(t('vocabReading')); return DS.fromPdf(await api.readBinary(p), { pdfjs: await getPdfjs(), onProgress: prog }); }
  if (DS.isImage(ext)) { progress(t('vocabOcrStart')); return DS.fromImage(await api.readBinary(p), ext, { onProgress: prog }); }
  const sheets = await api.readTable(p);
  const rows = sheets.reduce((a, x) => a + x.rows.length, 0);
  if (ext === 'docx' && rows < 3) {
    const imgs = await docxImages(await api.readBinary(p));
    if (imgs.length) {
      const out = [];
      for (let i = 0; i < imgs.length; i++) {
        progress(t('vocabOcrStart') + (imgs.length > 1 ? ` (${i + 1}/${imgs.length})` : ''));
        const sh = await DS.fromImage(imgs[i].data, imgs[i].ext, { onProgress: (x) => prog({ ...x, page: i + 1, pages: imgs.length }) });
        sh.forEach((x) => { x.name = `${t('vocabImage')} ${i + 1}`; out.push(x); });
      }
      if (out.length > 1) out.unshift({ name: t('vocabAllImages'), rows: out.flatMap((x) => x.rows), ocr: true });
      return [...out, ...sheets];
    }
  }
  return sheets;
}
async function docxImages(bytes) {
  if (!window.JSZip) {
    const lib = api.libBase || new URL('../node_modules/', import.meta.url).href;
    await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = lib + 'jszip/dist/jszip.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
  }
  const zip = await window.JSZip.loadAsync(bytes);
  const files = Object.keys(zip.files).filter((n) => /^word\/media\/.+\.(png|jpe?g|bmp|gif|webp)$/i.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const out = [];
  for (const n of files) {
    const data = await zip.file(n).async('uint8array');
    if (data.length > 15000) out.push({ data, ext: n.split('.').pop().toLowerCase() }); // küçük simgeler atlanır
  }
  return out;
}
function vocabImportModal() {
  const V = window.VocabTools;
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="help">${t('vocabImportHelp')}</p>
    <div class="row">
      <button class="btn primary" id="viFile">${t('vocabChooseFile')}</button>
      <span id="viName" style="color:var(--muted);font-size:13px"></span>
    </div>
    <div class="row" id="viCols" style="display:none">
      <label style="display:flex;gap:6px;align-items:center" id="viSheetBox">${t('vocabSheet')} <select class="in" id="viSheet" style="width:auto"></select></label>
      <label style="display:flex;gap:6px;align-items:center">${t('vocabTermCol')} <select class="in" id="viTerm" style="width:auto"></select></label>
      <label style="display:flex;gap:6px;align-items:center">${t('vocabMeanCol')} <select class="in" id="viMean" style="width:auto"></select></label>
      <label style="display:flex;gap:6px;align-items:center">${t('vocabTrCol')} <select class="in" id="viTr" style="width:auto"></select></label>
      <label class="chk" style="margin:0"><input type="checkbox" id="viHead"> ${t('vocabHasHeader')}</label>
    </div>
    <div class="summary" id="viSum"></div>
    <div class="vdups" id="viDups"></div>
    <div class="vprev" id="viPrev" style="display:none"></div>`;
  let sheets = [], built = null;
  const colName = (rows, c, head) => `${String.fromCharCode(65 + c)}${head >= 0 && rows[head][c] ? ': ' + rows[head][c] : ''}`;
  const rebuild = () => {
    const sh = sheets[+$('#viSheet', body).value] || sheets[0];
    if (!sh) return;
    const rows = sh.rows;
    const header = $('#viHead', body).checked ? (rows.__header >= 0 ? rows.__header : 0) : -1;
    const term = +$('#viTerm', body).value, meaning = +$('#viMean', body).value, tr = +$('#viTr', body).value;
    built = V.buildItems(rows, { header, term, meaning, tr }, exam.vocab.items);
    const checks = V.checkItems(built.items, { ar: meaning >= 0, tr: tr >= 0 });
    let e = 0, w = 0, i = 0;
    checks.forEach((ws) => { const lv = ws.map((x) => x.level); if (lv.includes('err')) e++; else if (lv.includes('warn')) w++; else i++; });
    const exist = built.duplicates.filter((d) => d.existing).length;
    const alone = exist ? V.buildItems(rows, { header, term, meaning, tr }, []) : null;
    $('#viSum', body).innerHTML = `${t('vocabWillImport', { n: built.items.length })} ${built.duplicates.length ? t('vocabDupRemoved', { n: built.duplicates.length, e: exist }) : ''}${alone ? `<br>${t('vocabIfReplace', { n: alone.items.length, d: alone.duplicates.length })}` : ''}<br>${t('vocabWarnSum', { e, w, i })}${$('#viSum', body).dataset.ocr ? `<br>🔍 ${t('vocabOcrNote')}` : ''}`;
    const diff = built.duplicates.filter((d) => d.differs);
    $('#viDups', body).innerHTML = diff.length ? `${t('vocabDupDiffers', { n: diff.length })}<br>${diff.slice(0, 40).map((d) => `• <b>${esc(d.term)}</b> — ${t('vocabKept')}: <bdi>${esc(d.keptMeaning)}</bdi> · ${t('vocabDropped')}: <bdi>${esc(d.meaning)}</bdi>`).join('<br>')}` : '';
    const width = Math.max(...rows.map((r) => r.length));
    $('#viPrev', body).style.display = '';
    $('#viPrev', body).innerHTML = `<table><thead><tr><th>#</th>${Array.from({ length: width }, (_, c) => `<th>${esc(colName(rows, c, header))}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 60).map((r, ri) => `<tr class="${ri === header ? 'h' : ''}"><td>${ri + 1}</td>${Array.from({ length: width }, (_, c) => `<td class="${c === term ? 't' : c === meaning ? 'm' : c === tr ? 'r' : ''}" dir="auto">${esc(r[c] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };
  const loadSheet = () => {
    const sh = sheets[+$('#viSheet', body).value] || sheets[0];
    const rows = sh.rows;
    const d = V.detectColumns(rows);
    rows.__header = d.header;
    const width = Math.max(...rows.map((r) => r.length));
    const opts = Array.from({ length: width }, (_, c) => `<option value="${c}">${esc(colName(rows, c, d.header))}</option>`).join('');
    $('#viTerm', body).innerHTML = opts;
    $('#viMean', body).innerHTML = `<option value="-1">${t('colNone')}</option>` + opts;
    $('#viTr', body).innerHTML = `<option value="-1">${t('colNone')}</option>` + opts;
    $('#viTerm', body).value = d.term; $('#viMean', body).value = d.meaning; $('#viTr', body).value = d.tr;
    $('#viHead', body).checked = d.header >= 0;
    rebuild();
  };
  $('#viFile', body).onclick = async () => {
    const p = await api.openDialog({ filters: [
      { name: 'Word / Excel / PDF / ' + t('vocabImages'), extensions: ['docx', 'doc', 'xlsx', 'xls', 'xlsm', 'ods', 'odt', 'csv', 'txt', 'pdf', ...window.DocScan.IMG_EXT] },
    ] });
    if (!p) return;
    const fname = p.split(/[\\/]/).pop();
    $('#viName', body).textContent = '⏳ ' + fname;
    try {
      sheets = (await readVocabSource(p, (msg) => { $('#viName', body).textContent = '⏳ ' + fname + ' — ' + msg; })).filter((x) => x.rows.length);
      $('#viName', body).textContent = (sheets.some((x) => x.ocr) ? '🔍 ' : '📄 ') + fname;
      if (sheets.some((x) => x.ocr)) $('#viName', body).title = t('vocabOcrNote');
      if (!sheets.length) { $('#viSum', body).textContent = t('vocabNothingFound'); return; }
      if (sheets.some((x) => x.ocr)) $('#viSum', body).dataset.ocr = '1'; else delete $('#viSum', body).dataset.ocr;
      $('#viSheet', body).innerHTML = sheets.map((x, i) => `<option value="${i}">${esc(x.name)} (${x.rows.length})</option>`).join('');
      $('#viSheetBox', body).style.display = sheets.length > 1 ? '' : 'none';
      $('#viCols', body).style.display = '';
      loadSheet();
    } catch (e) {
      $('#viName', body).textContent = '';
      toast(/OLD_FORMAT/.test(e.message) ? t('oldFormatErr') : t('error') + ': ' + e.message, 'err', [], 9000);
    }
  };
  $('#viSheet', body).onchange = loadSheet;
  ['#viTerm', '#viMean', '#viTr', '#viHead'].forEach((id) => { $(id, body).onchange = rebuild; });
  const apply = (replace) => (close) => {
    if (!built) return;
    if (!replace && !built.items.length) { close(); toast(t('vocabAllDup'), 'warn', [], 6000); return; }
    snap();
    const v = exam.vocab;
    let res = built;
    if (replace) {
      // listenin yerine: mevcut listeye göre değil, yalnızca dosyanın kendi içindeki tekrarlar
      const sh = sheets[+$('#viSheet', body).value] || sheets[0];
      res = V.buildItems(sh.rows, { header: $('#viHead', body).checked ? (sh.rows.__header >= 0 ? sh.rows.__header : 0) : -1, term: +$('#viTerm', body).value, meaning: +$('#viMean', body).value, tr: +$('#viTr', body).value }, []);
      v.items = [];
    }
    v.items = v.items.filter((it) => (it.term || '').trim() || (it.meaning || '').trim() || (it.tr || '').trim()); // boş satırlar atılır
    res.items.forEach((x) => { const n = newVocabItem(); n.term = x.term; n.meaning = x.meaning; n.tr = x.tr || ''; v.items.push(n); });
    // dosyada Türkçe sütun varsa Türkçe sütunu açılır; Arapça hiç yoksa Arapça sütunu kapanır (veri silinmez)
    if (res.items.some((x) => x.tr)) v.cols.tr = true;
    if (v.cols.tr && !v.items.some((it) => (it.meaning || '').trim())) v.cols.ar = false;
    if (!LK.some((k) => (v.title[k] || '').trim())) LK.forEach((k) => { v.title[k] = t('lbl_vocabTitle', null, k); });
    prefs.tab = 'vocab'; savePrefs();
    renderAll(); changed(); close();
    toast(t('vocabImported', { n: res.items.length, d: res.duplicates.length }), 'ok', [], 6000);
  };
  modal({
    title: t('vocabImportTitle'), body, wide: true,
    buttons: [
      { label: t('cancel'), onClick: (c) => c() },
      { label: t('vocabReplace'), cls: 'danger', onClick: apply(true) },
      { label: t('vocabAppend'), cls: 'primary', onClick: apply(false) },
    ],
  });
}
// Çevrimiçi anlam denetimi: kelime makineyle çevrilir, verilen anlam geri çevrilir ve karşılaştırılır.
// Sonuçlar öneri olarak gösterilir; seçilmeyen öneri hiçbir şeyi değiştirmez. Değişen kelimeler arka planda kendiliğinden denetlenir.
let mtTimer = null, mtRunning = false, mtOfflineUntil = 0;
function scheduleMT(ms = 3000) {
  clearTimeout(mtTimer);
  mtTimer = setTimeout(() => { if (Date.now() >= mtOfflineUntil) vocabCheck(false); }, ms);
}
async function vocabCheck(manual = true) {
  if (mtRunning) { if (manual) toast(t('vocabChecking', { d: '…', t: '' }), ''); return; }
  const V = window.VocabTools;
  const fields = activeFields().filter((f) => f.col);
  const jobs = []; // { f, it }
  for (const f of fields) {
    for (const it of exam.vocab.items) {
      if (it.off || !(it.term || '').trim()) continue; // anlamı boş olanlara da öneri gelir
      if (manual || !mtOf(f, it)) jobs.push({ f, it });
    }
  }
  if (!jobs.length) { if (manual) toast(t('vocabCheckDone', { n: 0 }), 'ok'); return; }
  mtRunning = true;
  const btn = $('#btnVocabCheck');
  btn.disabled = true;
  let prog = null, lbl = null;
  if (manual) {
    const box = $('#vocabWarn');
    prog = document.createElement('div'); prog.className = 'progress'; prog.innerHTML = '<div></div>';
    lbl = document.createElement('div'); lbl.className = 'plbl'; lbl.style.cssText = 'font-size:12px;color:var(--muted)';
    box.appendChild(prog); box.appendChild(lbl);
  }
  const one = async (text, from, to) => (await translateText(text, from, to)) || '';
  const many = async (arr, from, to) => {
    const joined = arr.map((x) => x.replace(/\n/g, ' ')).join('\n');
    const out = (await one(joined, from, to)).split('\n').map((x) => x.trim());
    if (out.length === arr.length) return out;
    const r = [];
    for (const x of arr) r.push(await one(x, from, to));
    return r;
  };
  const judge = (f, term, mean, mt, back) => (f.lang === 'ar' ? V.judge(term, mean, mt, back).ok : V.judgeTr(term, mean, mt, back).ok);
  const B = 25;
  const batches = [];
  for (const f of fields) {
    const js = jobs.filter((j) => j.f === f);
    for (let i = 0; i < js.length; i += B) batches.push({ f, items: js.slice(i, i + B).map((j) => j.it) });
  }
  let failed = 0;
  const res = new Map(); // key -> { f, it, mt, back, ok }
  await runPool(batches.map(({ f, items }) => async () => {
    try {
      const filled = items.filter((x) => (x[f.k] || '').trim());
      const [mts, backs] = await Promise.all([many(items.map((x) => x.term), 'en', f.lang), filled.length ? many(filled.map((x) => x[f.k]), f.lang, 'en') : []]);
      items.forEach((it, k) => {
        const val = (it[f.k] || '').trim();
        res.set(mtKey(f.lang, it.term, it[f.k] || ''), { f, it, mt: mts[k], ok: !val || judge(f, it.term, val, mts[k], backs[filled.indexOf(it)] || '') });
      });
    } catch (e) { failed++; }
  }), 3, (d, tot) => { if (prog) { prog.firstChild.style.width = (100 * d / tot) + '%'; lbl.textContent = t('vocabChecking', { d: Math.min(jobs.length, d * B), t: jobs.length }); } });
  // sözlük karşılıkları (eş anlamlılar): şüpheliler ve makine çevirisi farklı olanlar için öneri listesi
  if (api.translateDict) {
    const need = [...res.values()].filter((r) => (r.it[r.f.k] || '').trim() && (!r.ok || !sameText(r.mt, r.it[r.f.k], r.f.lang))).slice(0, manual ? 250 : 60);
    await runPool(need.map((r) => async () => {
      try {
        const [fw, bw] = await Promise.all([dictLookup({ text: r.it.term, from: 'en', to: r.f.lang }), r.ok ? null : dictLookup({ text: r.it[r.f.k], from: r.f.lang, to: 'en' })]);
        const alts = [fw.text, ...(fw.alts || [])].filter(Boolean);
        if (!r.ok) r.ok = alts.some((a) => judge(r.f, r.it.term, r.it[r.f.k], a, '')) || (bw && [bw.text, ...(bw.alts || [])].some((b) => judge(r.f, r.it.term, r.it[r.f.k], '', b)));
        r.alts = alts;
      } catch (e) { /* ilk sonuç geçerli */ }
    }), 3, (d, tot) => { if (lbl) lbl.textContent = t('vocabChecking', { d, t: tot }); });
  }
  for (const [k, r] of res) {
    // yanlış yazı sistemindeki öneriler atılır (Türkçe sütuna Arapça harfli öneri gelmesin, tersi de)
    const script = (x) => (r.f.lang === 'ar' ? V.isAr(x) : !/[\u0600-\u06FF]/.test(x));
    const alts = [...new Set([r.mt, ...(r.alts || [])].map((x) => String(x || '').trim()).filter((x) => x && script(x) && x.toLowerCase() !== r.it.term.trim().toLowerCase()))].slice(0, 5);
    mtCache.delete(k); mtCache.set(k, { alts, ok: r.ok });
  }
  mtSave();
  mtRunning = false;
  btn.disabled = !exam.vocab.items.length;
  if (prog) { prog.remove(); lbl.remove(); }
  if (failed && failed === batches.length) {
    mtOfflineUntil = Date.now() + 120000; // internet yok: iki dakika sonra yeniden denenir
    if (manual) toast(t('translateErr'), 'err', [], 7000);
  } else if (manual) {
    const bad = [...res.values()].filter((r) => !r.ok && (r.it[r.f.k] || '').trim() && r.it[r.f.ver] !== r.it[r.f.k]).length;
    if (bad) vocabOnlyWarn = true;
    toast(t('vocabCheckDone', { n: bad }) + (failed ? ` (${t('translateErr')})` : ''), bad ? 'warn' : 'ok', [], 7000);
  }
  refreshVocabWarnings();
  // denetim sürerken değişen kelimeler varsa onlar da sıraya girer
  if (!manual && exam.vocab.items.some((it) => !it.off && (it.term || '').trim() && fields.some((f) => !mtOf(f, it)))) scheduleMT(5000);
  updateVocabBar();
}

/* ------------------------------------------------------------------ modal / bildirim */
window.modal = (...a) => modal(...a);
function modal({ title, body, buttons = [], wide, onClose }) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><header><h2></h2><button class="x">✕</button></header><div class="body"></div><footer></footer></div>`;
  $('h2', bd).textContent = title;
  if (typeof body === 'string') $('.body', bd).innerHTML = body; else $('.body', bd).appendChild(body);
  const close = () => { if (FIND.bar && FIND.root && bd.contains(FIND.root)) findClose(false); bd.remove(); if (onClose) onClose(); };
  $('.x', bd).onclick = close;
  buttons.forEach((b) => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls || '');
    el.textContent = b.label;
    if (b.id) el.id = b.id;
    el.onclick = () => b.onClick(close, el);
    $('footer', bd).appendChild(el);
  });
  if (!buttons.length) $('footer', bd).remove();
  $('#modalRoot').appendChild(bd);
  return { el: bd, close, body: $('.body', bd) };
}
function confirmBox(msg) {
  return new Promise((res) => {
    const m = modal({
      title: t('appTitle'), body: `<p style="font-size:15px;margin:4px 0;white-space:pre-line">${esc(msg)}</p>`,
      buttons: [{ label: t('cancel'), onClick: (c) => { res(false); c(); } }, { label: t('ok'), cls: 'primary', onClick: (c) => { res(true); c(); } }],
      onClose: () => res(false),
    });
    m.el.querySelector('.modal').style.width = 'min(480px, 92vw)';
  });
}
function toast(msg, type = '', actions = [], ms = 4500) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);
  actions.forEach((a) => { const b = document.createElement('button'); b.textContent = a.label; b.onclick = a.onClick; el.appendChild(b); });
  $('#toasts').appendChild(el);
  if (MOBILE) [...$('#toasts').children].slice(0, -2).forEach((x) => x.remove()); // telefonda en fazla iki bildirim
  if (ms > 0) setTimeout(() => el.remove(), actions.length ? ms * 2 : ms);
  return el;
}


/* ------------------------------------------------------------------ sayfa içi arama (Ctrl+F) */
// Sorular, şıklar, senaryolar ve kelime listesindeki yazı alanlarında arar; büyük/küçük harf ve İ/ı farkı gözetmez.
const FIND = { bar: null, q: '', i: -1, hits: [], timer: null };
const fnorm = (x) => String(x || '').replace(/[İIı]/g, 'i').toLowerCase();
function findFields() {
  return [...document.querySelectorAll('#editor textarea, #editor input[type="text"], #editor input:not([type])')];
}
// 1.9.8: açık bir pencere (örn. Otomatik soru getir / Arşiv) varsa arama o pencerenin görünen yazısında yapılır
function findRoot() {
  const m = document.querySelector('#modalRoot .backdrop:last-child .modal .body');
  return m || null;
}
function findUnmark(root) {
  (root || document).querySelectorAll('mark.fmark').forEach((mk) => {
    const par = mk.parentNode; if (!par) return;
    par.replaceChild(document.createTextNode(mk.textContent), mk); par.normalize();
  });
}
function findCollectDom(root, q) {
  const hits = [];
  const vis = new Map();
  const visible = (el) => {
    if (vis.has(el)) return vis.get(el);
    let ok = true;
    for (let e = el; e && e !== root; e = e.parentElement) {
      const st = e.style;
      if (st && st.display === 'none') { ok = false; break; }
      if (vis.has(e)) { ok = vis.get(e); break; }
    }
    vis.set(el, ok); return ok;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|BUTTON|MARK)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
      if (!visible(p)) return NodeFilter.FILTER_REJECT;
      return fnorm(n.nodeValue).includes(q) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
  for (const n of nodes) {
    const text = n.nodeValue, low = fnorm(text);
    if (low.length !== text.length) { // İ/ı dönüşümü uzunluğu bozmaz ama güvenli olsun
      hits.push({ el: n.parentElement, pos: 0, node: n }); continue;
    }
    const frag = document.createDocumentFragment();
    let last = 0, p = low.indexOf(q);
    while (p >= 0) {
      if (p > last) frag.appendChild(document.createTextNode(text.slice(last, p)));
      const mk = document.createElement('mark'); mk.className = 'fmark findhit'; mk.textContent = text.slice(p, p + q.length);
      frag.appendChild(mk); hits.push({ el: mk, pos: p, key: n.parentElement });
      last = p + q.length; p = low.indexOf(q, last);
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    n.parentNode.replaceChild(frag, n);
  }
  return hits;
}
function findCollect() {
  const q = fnorm(FIND.q);
  const hits = [];
  document.querySelectorAll('.findhit, .findcur').forEach((el) => el.classList.remove('findhit', 'findcur'));
  findUnmark();
  if (!q) return hits;
  const root = findRoot();
  if (root) { FIND.root = root; return findCollectDom(root, q); }
  FIND.root = null;
  for (const el of findFields()) {
    const v = fnorm(el.value);
    let p = v.indexOf(q), any = false;
    while (p >= 0) { hits.push({ el, pos: p }); any = true; p = v.indexOf(q, p + Math.max(1, q.length)); }
    if (any) el.classList.add('findhit');
  }
  return hits;
}
function findPaneOf(el) {
  const p = el.closest('#testPane, #scenPane, #vocabPane');
  return p ? { testPane: 'test', scenPane: 'scen', vocabPane: 'vocab' }[p.id] : null;
}
function findShow(step) {
  const prev = FIND.hits[FIND.i];
  FIND.hits = findCollect();
  const n = FIND.hits.length;
  const cnt = $('.findcnt', FIND.bar);
  FIND.bar.classList.toggle('none', !!FIND.q && !n);
  if (!n) { FIND.i = -1; cnt.textContent = FIND.q ? t('findNone') : ''; return; }
  // aynı yerde kal, sonra adım at
  let i = prev ? FIND.hits.findIndex((h) => (h.key ? h.key === prev.key : h.el === prev.el) && h.pos === prev.pos) : -1;
  if (i < 0) i = step < 0 ? n - 1 : 0; else i = (i + step + n) % n;
  if (step === 0 && FIND.i < 0) i = 0;
  FIND.i = i;
  const h = FIND.hits[i];
  h.el.classList.add('findcur');
  if (!FIND.root) {
    const tab = findPaneOf(h.el);
    if (tab && !MOBILE && tab !== (prefs.tab || 'test')) setTab(tab);
  }
  h.el.scrollIntoView({ block: 'center' });
  cnt.textContent = `${i + 1} / ${n}`;
}
// pencere listesi yeniden çizildiğinde (süzgeç, sekme) vurguları tazele
function findRefresh() {
  if (!FIND.bar || !FIND.q) return;
  clearTimeout(FIND.rt); FIND.rt = setTimeout(() => { if (FIND.bar) findShow(0); }, 30);
}
function findClose(focusHit) {
  if (!FIND.bar) return;
  const h = FIND.hits[FIND.i];
  FIND.bar.remove(); FIND.bar = null;
  document.querySelectorAll('.findhit, .findcur').forEach((el) => el.classList.remove('findhit', 'findcur'));
  findUnmark(); FIND.root = null;
  if (focusHit && h && !h.key && document.body.contains(h.el)) {
    h.el.focus();
    try { h.el.setSelectionRange(h.pos, h.pos + FIND.q.length); } catch { /* yok */ }
  }
}
function findOpen() {
  if (FIND.bar) { const inp = $('input', FIND.bar); inp.focus(); inp.select(); return; }
  const bar = document.createElement('div');
  bar.className = 'findbar';
  bar.innerHTML = `<span class="ic">🔍</span><input type="text" spellcheck="false"><span class="findcnt"></span>
    <button data-f="prev" title="${esc(t('findPrev'))}">▲</button><button data-f="next" title="${esc(t('findNext'))}">▼</button><button data-f="x" title="${esc(t('close'))}">✕</button>`;
  document.body.appendChild(bar);
  if (!MOBILE) {
    const mr = findRoot();
    const tb = mr ? mr.closest('.modal').querySelector('header') : document.querySelector('.topbar');
    if (tb) bar.style.top = (Math.round(tb.getBoundingClientRect().bottom) + (mr ? 2 : 8)) + 'px';
    if (mr) bar.style.right = Math.max(18, Math.round(window.innerWidth - mr.closest('.modal').getBoundingClientRect().right) + 10) + 'px';
  }
  FIND.bar = bar; FIND.i = -1; FIND.hits = [];
  const inp = $('input', bar);
  inp.placeholder = t('findPh');
  // seçili bir metin varsa onunla başla
  const ae = document.activeElement;
  let pre = '';
  if (ae && /INPUT|TEXTAREA/.test(ae.tagName) && ae.selectionEnd > ae.selectionStart) pre = ae.value.slice(ae.selectionStart, ae.selectionEnd);
  else pre = String(window.getSelection() || '');
  inp.value = (pre.includes('\n') ? '' : pre) || FIND.q;
  FIND.q = inp.value;
  inp.oninput = () => { clearTimeout(FIND.timer); FIND.timer = setTimeout(() => { FIND.q = inp.value; FIND.i = -1; FIND.hits = []; findShow(0); }, 120); };
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(FIND.timer); if (FIND.q !== inp.value) { FIND.q = inp.value; FIND.i = -1; FIND.hits = []; findShow(0); } else findShow(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); findClose(true); }
  };
  bar.querySelectorAll('button').forEach((b) => {
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = () => { const f = b.dataset.f; if (f === 'x') findClose(false); else { FIND.q = inp.value; findShow(f === 'prev' ? -1 : 1); } };
  });
  inp.focus(); inp.select();
  if (FIND.q) findShow(0);
}

/* ------------------------------------------------------------------ çeviri */
// tek kelime sözlük: çevrimiçi Google sözlüğü; olmazsa yerleşik sözlük (1.9.4)
async function dictLookup(o) {
  try { if (navigator.onLine === false) throw new Error('offline'); return await api.translateDict(o); } catch (e) {
    const d = window.Ceviri && window.Ceviri.dict(o.text, o.from, o.to);
    if (d) return d;
    throw e;
  }
}
async function translateText(text, from, to) {
  if (window.Ceviri) return window.Ceviri.translate(text, from, to);
  return api.translate({ text, from, to });
}
async function runPool(tasks, n, onProgress, ctl) {
  let i = 0, done = 0, failed = 0;
  const worker = async () => {
    while (i < tasks.length && !(ctl && ctl.stop)) {
      const task = tasks[i++];
      try { await task(); } catch (e) { failed++; }
      done++; onProgress && onProgress(done, tasks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return { done, failed };
}
function collectFields() {
  const f = [exam.school, exam.title, exam.instructions];
  exam.questions.forEach((q) => { f.push(q.text); q.options.forEach((o) => f.push(o)); });
  exam.scenarios.forEach((sc) => { f.push(sc.title, sc.text); sc.questions.forEach((q) => f.push(q.text, q.answer)); });
  f.push(exam.scenNote, exam.vocab.title);
  return f;
}
function bestSource(ml, preferred) {
  if ((ml[preferred] || '').trim()) return preferred;
  return LK.find((k) => (ml[k] || '').trim()) || null;
}
async function translateQuestion(q) {
  const cl = CL();
  const fields = [q.text, ...q.options.slice(0, S().optionCount)];
  const tasks = [];
  fields.forEach((ml) => {
    const src = bestSource(ml, cl);
    if (!src) return;
    LK.filter((k) => k !== src && !(ml[k] || '').trim()).forEach((to) => {
      tasks.push(async () => { ml[to] = await translateText(ml[src], src, to); });
    });
  });
  if (!tasks.length) return toast(t('translateNoSource'), 'warn');
  snap();
  const card = document.getElementById('q-' + q.id);
  card.style.opacity = '.55';
  const r = await runPool(tasks, 4);
  card.style.opacity = '';
  rerenderCard(q);
  if (r.failed) toast(t('translateErr'), 'err'); else toast(t('translatedQ'), 'ok');
}
async function translateFields(fields, el) {
  const cl = CL();
  const tasks = [];
  fields.forEach((ml) => {
    const src = bestSource(ml, cl);
    if (!src) return;
    LK.filter((k) => k !== src && !(ml[k] || '').trim()).forEach((to) => {
      tasks.push(async () => { ml[to] = await translateText(ml[src], src, to); });
    });
  });
  if (!tasks.length) { toast(t('translateNoSource'), 'warn'); return false; }
  snap();
  if (el) el.style.opacity = '.55';
  const r = await runPool(tasks, 4);
  if (el) el.style.opacity = '';
  if (r.failed) toast(t('translateErr'), 'err'); else toast(t('translateDone', { n: tasks.length }), 'ok');
  return true;
}
function questionFields(qs) {
  const n = S().optionCount;
  const f = [];
  qs.forEach((q) => { f.push(q.text); q.options.slice(0, n).forEach((o) => f.push(o)); });
  return f;
}
// "3-10, 15, 20-22" -> soru listesi
function parseQRange(txt, max) {
  const out = new Set();
  for (const part of String(txt || '').split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part);
    if (!m) return null;
    let a = +m[1], b = m[2] ? +m[2] : a;
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > max) return null;
    for (let k = a; k <= b; k++) out.add(k - 1);
  }
  return out.size ? [...out].sort((x, y) => x - y) : null;
}
function translateAllModal(preset) {
  const nSel = exam.questions.filter((q) => selected.has(q.id)).length;
  const max = liveQs().length;
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="help">${t('translateHelp')}</p>
    <div style="margin:6px 0 4px;font-size:12px;color:var(--muted)">${esc(t('trScope'))}</div>
    <div class="trscope">
      <label class="chk"><input type="radio" name="trScope" value="all"> ${esc(t('trScopeAll'))}</label>
      <label class="chk"><input type="radio" name="trScope" value="q"> ${esc(t('trScopeQ'))} (${max})</label>
      <label class="chk"><input type="radio" name="trScope" value="sel" ${nSel ? '' : 'disabled'}> ${esc(t('trScopeSel', { n: nSel }))}</label>
      <label class="chk"><input type="radio" name="trScope" value="range" ${max ? '' : 'disabled'}> ${esc(t('trScopeRange'))}
        <input class="in" id="trRange" type="text" placeholder="1-${Math.max(1, max)}" style="width:140px;margin-left:6px;padding:4px 8px"></label>
    </div>
    <label class="f"><span>${t('sourceLang')}</span><select class="in" id="trSrc">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
    <div style="margin:10px 0 4px;font-size:12px;color:var(--muted)">${t('targetLangs')}</div>
    <div class="row">${LK.map((k) => `<label class="chk"><input type="checkbox" class="trTo" value="${k}"> ${window.LANGS[k]}</label>`).join('')}</div>
    <label class="chk"><input type="checkbox" id="trOver"> ${t('overwrite')}</label>
    <div class="progress"><div id="trBar"></div></div>
    <div id="trMsg" style="font-size:13px;color:var(--muted)"></div>`;
  const scopeDef = preset || (nSel ? 'sel' : 'all');
  body.querySelector(`input[name="trScope"][value="${scopeDef}"]`).checked = true;
  $('#trRange', body).onfocus = () => { body.querySelector('input[name="trScope"][value="range"]').checked = true; };
  const src = $('#trSrc', body);
  src.value = CL();
  const syncTargets = () => body.querySelectorAll('.trTo').forEach((c) => { c.disabled = c.value === src.value; c.checked = c.value !== src.value; });
  src.onchange = syncTargets; syncTargets();
  let ctl = null;
  const m = modal({
    title: t('translateTitle'), body,
    onClose: () => { if (ctl) ctl.stop = true; },
    buttons: [{ label: t('close'), onClick: (c) => c() }, {
      label: t('start'), cls: 'primary', onClick: async (c, btn) => {
        if (ctl) { ctl.stop = true; btn.disabled = true; return; } // çalışırken düğme "Durdur" olur
        const from = src.value;
        const tos = [...body.querySelectorAll('.trTo:checked')].map((x) => x.value).filter((x) => x !== from);
        const over = $('#trOver', body).checked;
        const scope = (body.querySelector('input[name="trScope"]:checked') || {}).value || 'all';
        let fields;
        if (scope === 'all') fields = collectFields();
        else if (scope === 'q') fields = questionFields(exam.questions);
        else if (scope === 'sel') fields = questionFields(exam.questions.filter((q) => selected.has(q.id)));
        else {
          const idx = parseQRange($('#trRange', body).value, max);
          if (!idx) { $('#trMsg', body).textContent = t('trRangeBad', { max }); return; }
          fields = questionFields(idx.map((k) => liveQs()[k]));
        }
        const tasks = [];
        fields.forEach((ml) => {
          if (!(ml[from] || '').trim()) return;
          tos.forEach((to) => { if (over || !(ml[to] || '').trim()) tasks.push(async () => { ml[to] = await translateText(ml[from], from, to); }); });
        });
        if (!tasks.length) { $('#trMsg', body).textContent = t('translateDone', { n: 0 }); return; }
        ctl = { stop: false };
        snap();
        btn.textContent = t('stop'); btn.classList.remove('primary');
        body.querySelectorAll('input, select').forEach((x) => { x.disabled = true; });
        const r = await runPool(tasks, 5, (d, tot) => {
          $('#trBar', body).style.width = (100 * d / tot) + '%';
          $('#trMsg', body).textContent = t('translating', { d, t: tot });
        }, ctl);
        const stopped = ctl.stop;
        ctl = null;
        btn.disabled = false; btn.textContent = t('start'); btn.classList.add('primary');
        body.querySelectorAll('input, select').forEach((x) => { x.disabled = false; });
        syncTargets();
        if (!nSel) body.querySelector('input[name="trScope"][value="sel"]').disabled = true;
        renderAll(); changed();
        $('#trMsg', body).textContent = stopped ? t('trStopped', { d: r.done, t: tasks.length })
          : r.failed ? `${t('translateErr')} (${r.failed}/${tasks.length})` : t('translateDone', { n: tasks.length });
      },
    }],
  });
  return m;
}

/* ------------------------------------------------------------------ otomatik getirme ve arşiv */
const BK_TOPICS = { q: ['uav', 'eng', 'vocab', 'oxf', 'mine'], s: ['uav', 'eng', 'mine'] };
const bkTopicName = (k, kind) => t({ uav: 'bkTuav', eng: kind === 's' ? 'bkTengR' : 'bkTeng', vocab: 'bkTvocab', oxf: 'bkToxf', mine: 'bkTmine', ai: 'bkTabAi' }[k] || 'bkTmine');
const mlPick = (ml) => (ml && (ml[CL()] || ml.en || ml.tr || ml.ar)) || '';
const mlDir = (ml) => (ml && ml[CL()] ? (CL() === 'ar' ? 'rtl' : 'ltr') : 'auto');
// arşiv sorusunu sınav sorusuna çevirir: seçenekler karıştırılır, seçenek sayısı ayara uyar
function bankToQuestion(bq) {
  const q = newQuestion();
  if (bq.tag && QTAGS.includes(bq.tag)) q.tag = bq.tag;
  Object.assign(q.text, ML(bq.text));
  const n = Math.max(2, Math.min(5, S().optionCount || 5));
  const opts = bq.options.map((o, i) => ({ o, ok: i === bq.correct })).filter((x) => mlPick(x.o) || x.ok);
  const right = opts.find((x) => x.ok);
  const arr = window.Bank.shuffle([right, ...window.Bank.shuffle(opts.filter((x) => !x.ok)).slice(0, n - 1)]);
  q.options = arr.map((x) => ML(x.o));
  while (q.options.length < 5) q.options.push(ML());
  q.correct = arr.indexOf(right);
  return q;
}
function bankToScenario(bs, pts) {
  const s2 = newScenario(pts);
  Object.assign(s2.title, ML(bs.title)); Object.assign(s2.text, ML(bs.text));
  s2.questions = (bs.questions || []).map((q) => { const nq = newScenQ(pts); Object.assign(nq.text, ML(q.text)); Object.assign(nq.answer, ML(q.answer)); return nq; });
  if (!s2.questions.length) s2.questions = [newScenQ(pts)];
  return s2;
}
// sınavdaki öğeyi arşiv biçimine çevirir
const examQToBank = (q, lvl) => ({ lvl, topic: 'mine', text: ML(q.text), options: q.options.slice(0, S().optionCount).map(ML), correct: q.correct });
const examSToBank = (s, lvl) => ({ lvl, topic: 'mine', title: ML(s.title), text: ML(s.text), questions: s.questions.map((q) => ({ text: ML(q.text), answer: ML(q.answer) })) });
const lastScenPts = () => { const l = exam.scenarios[exam.scenarios.length - 1]; return l && l.questions.length ? +l.questions[l.questions.length - 1].points || 5 : 5; };

window.bankModal = (...a) => bankModal(...a);
async function bankModal(kind, startTab = 'auto', preset = '') {
  const B = window.Bank;
  const isQ = kind === 'q';
  const topics = BK_TOPICS[kind];
  const pk = isQ ? 'bkTopicsQ' : 'bkTopicsS';
  const selTopics = new Set(prefs[pk] || (isQ ? ['uav', 'eng'] : ['uav', 'eng']));
  const lvlOpts = (all) => (all ? `<option value="0">${esc(t('bkLAll'))}</option>` : '') + [1, 2, 3].map((l) => `<option value="${l}">${esc(t('bkL' + l))}</option>`).join('');
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="bktabs"><button data-t="auto">${esc(t('bkTabAuto'))}</button><button data-t="arch">${esc(t('bkTabArch'))}</button>${isQ ? `<button data-t="ai">${esc(t('bkTabAi'))}</button>` : ''}</div>
    <div class="bkstatus" id="bkStatus">${esc(t('bkChecking'))}</div>
    <div class="bkpane" data-p="auto">
      <div class="row bkopts">
        <label>${esc(t('bkLevel'))} <select class="in" id="bkLvl">${lvlOpts(false)}</select></label>
        <label>${esc(t('bkCount'))} <input type="number" id="bkCnt" min="1" max="50"></label>
        ${isQ ? '' : `<label>${esc(t('bkPts'))} <input type="number" id="bkPts" min="0" step="0.5"></label>`}
        <button class="btn primary" id="bkGo">${esc(t('bkFetch'))}</button>
        <button class="btn" id="bkAgain" style="display:none">${esc(t('bkRefetch'))}</button>
      </div>
      <div class="row bktopics"><b>${esc(t('bkTopic'))}:</b> ${topics.map((k) => `<label><input type="checkbox" data-k="${k}"${selTopics.has(k) ? ' checked' : ''}> ${esc(bkTopicName(k, kind))}</label>`).join('')}</div>
      <p class="hint" style="margin:0 0 6px;font-size:12px;color:var(--muted)">${esc(t(isQ ? 'bkHint' : 'bkHintS'))}</p>
      <div class="bkinfo" id="bkInfo"></div>
      <div class="bklist" id="bkRes"></div>
    </div>
    <div class="bkpane" data-p="arch">
      <div class="row bkarch">
        <label>${esc(t('bkSource'))} <select class="in" id="baSrc"><option value="all">${esc(t('bkSrcAll'))}</option><option value="bank">${esc(t('bkSrcBank'))}</option><option value="mine">${esc(t('bkTmine'))}</option></select></label>
        <label>${esc(t('bkLevel'))} <select class="in" id="baLvl">${lvlOpts(true)}</select></label>
        <label>${esc(t('bkTopic'))} <select class="in" id="baTop"><option value="">${esc(t('bkTall'))}</option>${['uav', 'eng', 'vocab', 'oxf', 'mine'].filter((k) => isQ || (k !== 'vocab' && k !== 'oxf')).map((k) => `<option value="${k}">${esc(bkTopicName(k, kind))}</option>`).join('')}</select></label>
        <input type="text" id="baQ" placeholder="${esc(t('bkSearch'))}" style="width:200px">
        <button class="btn" id="baFind" title="${esc(t('bkFindTip'))}">🔍 ${esc(t('bkFind'))}</button>
      </div>
      <div class="row bkarch">
        <button class="btn" id="baSave">${esc(t('bkSaveExam'))}</button>
        <label>${esc(t('bkSaveLvl'))} <select class="in" id="baSaveLvl">${lvlOpts(false)}</select></label>
      </div>
      <div class="bkinfo" id="bkAInfo"></div>
      <div class="bklist" id="bkAList"></div>
    </div>
    ${isQ ? `<div class="bkpane" data-p="ai">
      <p class="hint" style="margin:0 0 6px;font-size:12px;color:var(--muted)">${esc(t('aiGenHint'))}</p>
      <textarea id="aiSubj" rows="4" dir="auto" style="width:100%;box-sizing:border-box" placeholder="${esc(t('aiSubjectPh'))}"></textarea>
      <div class="row bkopts">
        <label>${esc(t('bkLevel'))} <select class="in" id="aiLvl">${lvlOpts(false)}</select></label>
        <label>${esc(t('aiTag'))} <select class="in" id="aiTagSel"><option value="">${esc(t('tagNone'))}</option>${QTAGS.map((k) => `<option value="${k}">${esc(t('tag_' + k))}</option>`).join('')}</select></label>
        <label>${esc(t('bkCount'))} <input type="number" id="aiCnt" min="1" max="30" value="10"></label>
        <button class="btn primary" id="aiGo">${esc(t('aiGen'))}</button>
      </div>
      <div class="bkinfo" id="aiInfo"></div>
      <div class="bklist" id="aiRes"></div>
    </div>` : ''}`;
  const lvlSel = $('#bkLvl', body);
  lvlSel.value = String(prefs.bkLvl || 2);
  $('#baSaveLvl', body).value = String(prefs.bkLvl || 2);
  $('#bkCnt', body).value = isQ ? (prefs.bkCntQ || 10) : (prefs.bkCntS || 2);
  if (!isQ) $('#bkPts', body).value = lastScenPts();
  let tab = startTab;
  const lists = { auto: [], arch: [], ai: [] }; // görünen öğeler
  const checked = { auto: new Set(), arch: new Set(), ai: new Set() };
  let addBtn = null;
  const updAdd = () => { if (addBtn) { const n = checked[tab].size; addBtn.textContent = t('bkAdd', { n }); addBtn.disabled = !n; } };
  const setTab = (x) => {
    tab = x;
    body.querySelectorAll('.bktabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === x));
    body.querySelectorAll('.bkpane').forEach((p) => { p.style.display = p.dataset.p === x ? '' : 'none'; });
    if (x === 'arch') renderArch(); else findRefresh();
    updAdd();
  };
  body.querySelectorAll('.bktabs button').forEach((b) => { b.onclick = () => setTab(b.dataset.t); });

  const examSigs = () => new Set((isQ ? exam.questions : exam.scenarios).map((x) => B.sig(x.text)));
  const L = (k) => letters()[k];
  const itemHtml = (it, i, pane, extra = {}) => {
    const lv = it.lvl ? `<span class="l${it.lvl}">${esc(t('bkL' + it.lvl))}</span>` : '';
    const tags = `<div class="tags">${lv}<span>${esc(bkTopicName(it.topic, kind))}</span>${it.sub ? `<span>${esc(t('sub_' + it.sub) === 'sub_' + it.sub ? it.sub : t('sub_' + it.sub))}</span>` : ''}${it.tag ? `<span class="tagc">${esc(tagName(it.tag))}</span>` : ''}${it.src === 'mine' ? `<span class="mine">${esc(t('bkTmine'))}</span>` : ''}${extra.used ? `<span>${esc(t('bkUsed'))}</span>` : ''}${extra.inExam ? `<span>${esc(t('bkInExam'))}</span>` : ''}</div>`;
    let inner;
    if (isQ) {
      inner = `<div class="s" dir="${mlDir(it.text)}">${esc(mlPick(it.text))}</div>` + it.options.map((o, k) => mlPick(o) ? `<div class="o${k === it.correct ? ' c' : ''}" dir="auto">${L(k)}) ${esc(mlPick(o))}${k === it.correct ? ' ✓' : ''}</div>` : '').join('');
    } else {
      inner = `<div class="s" dir="${mlDir(it.title)}">${esc(mlPick(it.title))}</div><div class="tx" dir="${mlDir(it.text)}">${esc(mlPick(it.text))}</div>` +
        it.questions.map((q, k) => `<div class="o" dir="auto"><b>${k + 1}.</b> ${esc(mlPick(q.text))}</div><div class="o c" dir="auto">✓ ${esc(mlPick(q.answer))}</div>`).join('');
    }
    const del = it.src === 'mine' && pane === 'arch' ? `<button class="del" data-del="${i}" title="${esc(t('bkDelMine'))}">🗑</button>` : '';
    return `<div class="bkitem${extra.inExam ? ' dim' : ''}"><input type="checkbox" data-i="${i}"${checked[pane].has(it) ? ' checked' : ''}><div class="bd">${tags}${inner}</div>${del}</div>`;
  };
  const bindList = (box, pane) => {
    box.querySelectorAll('input[data-i]').forEach((c) => {
      c.onchange = () => { const it = lists[pane][+c.dataset.i]; if (c.checked) checked[pane].add(it); else checked[pane].delete(it); updAdd(); };
    });
    box.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const it = lists[pane][+b.dataset.del];
        if (!(await confirmBox(t('bkDelMine') + '?'))) return;
        await B.delMine(kind, it.id); checked[pane].delete(it); renderArch();
      };
    });
  };

  /* --- otomatik --- */
  let st = null;
  const status = () => {
    if (!st) return;
    // 1.9.5: internete ulaşıldıysa yerleşik arşiv de "çevrimiçi" sayılır (çevrimiçi arşiv yoksa ya da daha eskiyse)
    $('#bkStatus', body).textContent = t(st.source === 'online' ? 'bkOnline' : st.source === 'cache' ? 'bkCache' : st.online ? 'bkBuiltinOn' : 'bkBuiltin', { v: st.v });
  };
  const go = async () => {
    const lvl = +lvlSel.value;
    const cnt = Math.max(1, Math.min(50, parseInt($('#bkCnt', body).value, 10) || (isQ ? 10 : 2)));
    const tops = [...body.querySelectorAll('.bktopics input:checked')].map((c) => c.dataset.k);
    prefs.bkLvl = lvl; prefs[pk] = tops; if (isQ) prefs.bkCntQ = cnt; else prefs.bkCntS = cnt; savePrefs();
    $('#baSaveLvl', body).value = String(lvl);
    const info = $('#bkInfo', body);
    const res = $('#bkRes', body);
    if (!tops.length) { info.textContent = t('bkNone'); return; }
    $('#bkGo', body).disabled = true;
    try {
      if (!st) st = await B.load();
      const mine = await B.getMine();
      const sigs = examSigs();
      const src = isQ ? st.bank.questions : st.bank.scenarios;
      const mineL = isQ ? mine.questions : mine.scenarios;
      // her konu için pay (kalan, diğer konulardan tamamlanır)
      const quota = tops.map((_, i) => Math.floor(cnt / tops.length) + (i < cnt % tops.length ? 1 : 0));
      const out = [];
      const notes = [];
      const pools = {};
      for (let i = 0; i < tops.length; i++) {
        const k = tops[i];
        if (k === 'vocab') {
          const all = exam.vocab.items.filter((it) => !it.off && (it.term || '').trim()).map((it) => ({ term: it.term.trim(), ar: (it.meaning || '').trim(), tr: (it.tr || '').trim(), lvl }));
          const okAll = all.filter((x) => x.ar || x.tr);
          if (okAll.length < 5) { notes.push(t('bkNeedVocab')); continue; }
          const want = B.LVL_CEFR[lvl];
          let cand = okAll.filter((x) => { const r = window.oxfordLevel ? window.oxfordLevel(x.term) : null; return r ? want.includes(r.lvl) : lvl === 3; });
          if (cand.length < quota[i]) cand = okAll;
          out.push(...B.vocabQuestions(okAll, quota[i], cand).filter((q) => !sigs.has(B.sig(q.text))));
        } else if (k === 'oxf') {
          if (navigator.onLine === false) { notes.push(t('bkNeedNet')); continue; }
          const qs = await B.oxfordQuestions(lvl, quota[i], ['ar', 'tr'], (d, tt) => { info.textContent = t('bkGen', { d, t: tt }); });
          if (qs.length) {
            const [a] = await B.addMine('q', qs.map((q) => ({ ...q, lvl, topic: 'oxf' })));
            if (a) notes.push(t('bkAutoSaved', { n: a }));
          } else notes.push(t('bkNeedNet'));
          out.push(...qs);
        } else {
          pools[k] = k === 'mine' ? mineL.filter((x) => !x.lvl || x.lvl === lvl) : src.filter((x) => x.lvl === lvl && x.topic === k);
          out.push(...B.pick(pools[k], quota[i], sigs));
        }
      }
      // eksik kalırsa hazır havuzlardan tamamla
      if (out.length < cnt) {
        const rest = Object.values(pools).flat().filter((x) => !out.includes(x));
        out.push(...B.pick(rest, cnt - out.length, sigs));
      }
      const poolAll = Object.values(pools).flat();
      if (poolAll.length) { const used = B.usedSet(); notes.unshift(t('bkPool', { n: poolAll.length, u: poolAll.filter((x) => !used.has(x.id)).length })); }
      lists.auto = out; checked.auto = new Set(out);
      info.textContent = notes.join(' · ');
      res.innerHTML = out.length ? out.map((it, i) => itemHtml(it, i, 'auto')).join('') : `<div class="empty">${esc(t('bkNone'))}</div>`;
      bindList(res, 'auto'); findRefresh();
      $('#bkAgain', body).style.display = out.length ? '' : 'none';
    } catch (e) { info.textContent = t('error') + ': ' + e.message; }
    $('#bkGo', body).disabled = false;
    updAdd();
  };
  $('#bkGo', body).onclick = go;
  $('#bkAgain', body).onclick = () => { B.markUsed(lists.auto.map((x) => x.id)); go(); };

  /* --- arşiv --- */
  const renderArch = async () => {
    if (!st) return;
    const mine = await B.getMine();
    const srcSel = $('#baSrc', body).value, lv = +$('#baLvl', body).value, top = $('#baTop', body).value;
    const q = $('#baQ', body).value.trim().toLocaleLowerCase('tr');
    const bankL = isQ ? st.bank.questions : st.bank.scenarios;
    const mineL = isQ ? mine.questions : mine.scenarios;
    let all = (srcSel === 'mine' ? [] : bankL).concat(srcSel === 'bank' ? [] : mineL);
    if (lv) all = all.filter((x) => x.lvl === lv);
    if (top) all = all.filter((x) => x.topic === top);
    if (q) all = all.filter((x) => JSON.stringify([x.text, x.title, x.options, x.questions]).toLocaleLowerCase('tr').includes(q));
    const sigs = examSigs(), used = B.usedSet();
    const shown = all.slice(0, 600);
    lists.arch = shown;
    checked.arch = new Set([...checked.arch].filter((x) => shown.includes(x)));
    $('#bkAInfo', body).textContent = t('bkShown', { n: all.length }) + (all.length > shown.length ? ' ' + t('bkMore', { n: all.length - shown.length }) : '');
    const box = $('#bkAList', body);
    box.innerHTML = shown.length ? shown.map((it, i) => itemHtml(it, i, 'arch', { used: used.has(it.id), inExam: sigs.has(B.sig(it.text)) })).join('') : `<div class="empty">${esc(t('bkNone'))}</div>`;
    bindList(box, 'arch'); findRefresh();
    updAdd();
  };
  ['#baSrc', '#baLvl', '#baTop'].forEach((s) => { $(s, body).onchange = renderArch; });
  $('#baFind', body).onclick = () => findOpen();
  $('#baQ', body).oninput = () => { clearTimeout(renderArch.tm); renderArch.tm = setTimeout(renderArch, 250); };
  $('#baSave', body).onclick = async () => {
    const lvl = +$('#baSaveLvl', body).value;
    const items = isQ ? exam.questions.filter((x) => isAnswered(x) && mlPick(x.text).trim()).map((x) => examQToBank(x, lvl))
      : exam.scenarios.filter((x) => mlPick(x.text).trim() || mlPick(x.title).trim()).map((x) => examSToBank(x, lvl));
    if (!items.length) return toast(t('bkNone'), 'warn');
    const [a, s] = await B.addMine(kind, items);
    toast(t('bkSaved', { n: a, s }), 'ok');
    $('#baSrc', body).value = 'mine'; renderArch();
  };

  /* --- yapay zeka --- */
  if (isQ) {
    const subj = $('#aiSubj', body);
    if (preset) subj.value = preset;
    $('#aiLvl', body).value = String(prefs.bkLvl || 2);
    if (prefs.aiTag) $('#aiTagSel', body).value = prefs.aiTag;
    $('#aiGo', body).onclick = async () => {
      const info = $('#aiInfo', body), res = $('#aiRes', body);
      const subject = subj.value.trim();
      if (!subject) { info.textContent = t('aiSubjectPh'); subj.focus(); return; }
      if (!window.AI || !window.AI.ready()) { info.textContent = t('aiNoKey'); return; }
      const lvl = +$('#aiLvl', body).value, tag = $('#aiTagSel', body).value, cnt = parseInt($('#aiCnt', body).value, 10) || 10;
      prefs.aiTag = tag; savePrefs();
      $('#aiGo', body).disabled = true; info.textContent = t('aiThinking'); res.innerHTML = '';
      try {
        const qs = await window.AI.generateQuestions({ subject, lvl, tag, count: cnt, optionCount: S().optionCount });
        if (!qs.length) throw new Error('empty');
        const [a] = await B.addMine('q', qs.map((q) => ({ ...q, topic: 'ai' })));
        lists.ai = qs; checked.ai = new Set(qs);
        info.textContent = a ? t('bkAutoSaved', { n: a }) : '';
        res.innerHTML = qs.map((it, i) => itemHtml(it, i, 'ai')).join('');
        bindList(res, 'ai'); findRefresh();
      } catch (e) { info.textContent = t('aiGenErr', { e: e.message }); }
      $('#aiGo', body).disabled = false; updAdd();
    };
  }

  /* --- ekle --- */
  const add = (close) => {
    const items = lists[tab].filter((x) => checked[tab].has(x));
    if (!items.length) return;
    snap();
    let firstId = null;
    if (isQ) {
      items.forEach((it) => { const q = bankToQuestion(it); if (!firstId) firstId = q.id; exam.questions.push(q); });
      prefs.tab = 'test';
    } else {
      const pts = isQ ? 5 : Math.max(0, parseFloat($('#bkPts', body).value) || lastScenPts());
      items.forEach((it) => exam.scenarios.push(bankToScenario(it, pts)));
      prefs.tab = 'scen';
    }
    savePrefs();
    B.markUsed(items.map((x) => x.id));
    if (qFilter) qFilter = '';
    renderAll(); changed(); close();
    if (firstId) setTimeout(() => scrollToQ(firstId), 50);
    toast(t('bkAdded', { n: items.length }), 'ok', [{ label: t('undo'), onClick: () => undo() }]);
  };
  const m = modal({
    title: isQ ? t('autoQ') : t('autoS'), body, wide: true,
    buttons: [{ label: t('cancel'), onClick: (c) => c() }, { label: t('bkAdd', { n: 0 }), cls: 'primary', id: 'bkAddBtn', onClick: add }],
  });
  addBtn = $('#bkAddBtn', m.el);
  setTab(startTab);
  st = await B.load(true);
  status();
  if (tab === 'arch') renderArch();
}

/* ------------------------------------------------------------------ içe aktarma */
function importModal() {
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="help" id="imHelp"></p>
    <div class="row">
      <button class="btn" id="imFile">📄 ${t('chooseFile')}</button>
      <button class="btn" id="imTidy">🧹 ${t('cleanText')}</button>
      <button class="btn primary" id="imParse">🔍 ${t('parse')}</button>
      <label style="display:flex;gap:6px;align-items:center">${t('importMode')}
        <select class="in" id="imMode" style="width:auto"><option value="test">${t('modeTest')}</option><option value="scen">${t('modeScen')}</option></select></label>
      <label style="margin-inline-start:auto;display:flex;gap:6px;align-items:center">${t('importLang')}
        <select class="in" id="imLang" style="width:auto">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
    </div>
    <div class="importgrid">
      <textarea id="imText" dir="auto" placeholder="${esc(t('pasteHere'))}"></textarea>
      <div><div class="summary" id="imSum"></div><div class="warnlist" id="imWarn"></div><div class="preview" id="imPrev"></div></div>
    </div>`;
  $('#imLang', body).value = CL();
  $('#imMode', body).value = prefs.tab === 'scen' || prefs.tab === 'vocab' ? 'scen' : 'test';
  let parsed = null;
  let footer = null;
  const mode = () => $('#imMode', body).value;
  const syncMode = () => {
    $('#imHelp', body).textContent = mode() === 'scen' ? t('importScenHelp') : t('importHelp');
    if (footer) {
      footer.querySelector('[data-b="1"]').textContent = mode() === 'scen' ? t('replaceScen') : t('replaceQuestions');
    }
  };
  const latin = () => { const l = $('#imLang', body).value; return l === 'ar' ? (prefs.contentLang !== 'ar' ? prefs.contentLang : 'tr') : l; };
  const doParseScen = () => {
    parsed = window.parseScenarios($('#imText', body).value, latin());
    const sc = parsed.scenarios;
    const nq = sc.reduce((a, x) => a + x.questions.length, 0);
    const na = sc.reduce((a, x) => a + x.questions.filter((q) => Object.values(q.answer).some(Boolean)).length, 0);
    let sum = sc.length ? t('scenParsed', { s: sc.length, q: nq, a: na }) : t('nothingParsed');
    if (parsed.vocab && parsed.vocab.items.length) sum += ' · ' + t('vocabParsed', { n: parsed.vocab.items.length, p: parsed.vocabPoints || exam.vocab.pointsEach });
    $('#imSum', body).textContent = sum;
    $('#imWarn', body).innerHTML = parsed.warnings.slice(0, 50).map((w) => `<div>⚠ ${esc(t(w.key, w.vars))}</div>`).join('');
    const blk = (ml) => Object.entries(ml).filter(([, v]) => v).map(([k, v]) => `<div dir="${k === 'ar' ? 'rtl' : 'ltr'}">${esc(v)}</div>`).join('');
    const pts = parsed.points != null ? parsed.points : null;
    $('#imPrev', body).innerHTML = sc.map((x, i) => `<div class="pq"><div class="s">${t('scenario')} ${i + 1}${blk(x.title) ? ' — ' : ''}${blk(x.title)}</div>
      <div style="white-space:pre-wrap;color:var(--muted)">${blk(x.text)}</div>
      ${x.questions.map((q, k) => `<div class="o"><b>${k + 1}.</b> ${blk(q.text)}${pts != null ? ` <small>(${fmtPts(pts / x.questions.length)} ${t('points').toLowerCase()})</small>` : ''}<div class="o c" style="white-space:pre-wrap">${blk(q.answer) || '⚠'}</div></div>`).join('')}</div>`).join('') +
      (parsed.vocab ? `<div class="pq"><div class="s">${blk(parsed.vocab.title)}</div>${parsed.vocab.items.map((it, i) => `<div class="o">${i + 1}. ${esc(it.term)} — <span dir="rtl">${esc(it.meaning.ar || '')}</span></div>`).join('')}</div>` : '');
    $('#imPrev', body).dir = 'auto';
  };
  const doParseTest = () => {
    const lang = $('#imLang', body).value;
    const L = letters(lang);
    parsed = window.parseQuestions($('#imText', body).value);
    const qs = parsed.questions;
    $('#imSum', body).textContent = qs.length ? t('parsedN', { n: qs.length, a: qs.filter((q) => q.correct >= 0).length }) : t('nothingParsed');
    $('#imWarn', body).innerHTML = parsed.warnings.slice(0, 50).map((w) => `<div>⚠ ${esc(t(w.key, w.vars))}</div>`).join('');
    $('#imPrev', body).innerHTML = qs.map((q, i) => `<div class="pq ${q.correct < 0 ? 'bad' : ''}"><div class="s">${i + 1}. ${esc(q.text)}</div>${q.options.map((o, k) => o ? `<div class="o ${q.correct === k ? 'c' : ''}">${L[k]}) ${esc(o)}${q.correct === k ? ' ✓' : ''}</div>` : '').join('')}</div>`).join('');
    $('#imPrev', body).dir = lang === 'ar' ? 'rtl' : 'ltr';
  };
  const doParse = () => (mode() === 'scen' ? doParseScen() : doParseTest());
  $('#imFile', body).onclick = async () => {
    const p = await api.openDialog({ filters: [{ name: 'TXT / DOCX', extensions: ['txt', 'docx'] }] });
    if (!p) return;
    try {
      const txt = await api.readImportFile(p);
      $('#imText', body).value = txt;
      const arN = (txt.match(/[؀-ۿ]/g) || []).length;
      if (window.hasScenarios(txt)) {
        $('#imMode', body).value = 'scen';
        // iki dilli belgede Latin harfli kısmın dili (İngilizce/Türkçe): satır çoğunluğuna göre
        let trHits = 0, enHits = 0;
        txt.split('\n').forEach((l) => {
          if (/[؀-ۿ]/.test(l)) return;
          if (/[çğışöüÇĞİŞÖÜ]|\b(ve|bir|için|ile|olabilir|nedir|nasıl|ne|mi|mı)\b/.test(l)) trHits++;
          else if (/\b(the|and|what|you|is|are|of|to|with|should)\b/i.test(l)) enHits++;
        });
        $('#imLang', body).value = enHits > trHits ? 'en' : 'tr';
      } else if (arN > txt.length * 0.2) $('#imLang', body).value = 'ar';
      syncMode(); doParse();
    } catch (e) { toast(t('error') + ': ' + e.message, 'err'); }
  };
  $('#imTidy', body).onclick = () => { $('#imText', body).value = window.tidyText($('#imText', body).value); doParse(); };
  $('#imParse', body).onclick = doParse;
  $('#imLang', body).onchange = () => parsed && doParse();
  $('#imMode', body).onchange = () => { syncMode(); if ($('#imText', body).value.trim()) doParse(); };
  const applyScen = (replace, close) => {
    doParseScen();
    const sc = parsed.scenarios;
    if (!sc.length && !(parsed.vocab && parsed.vocab.items.length)) return;
    snap();
    if (replace) exam.scenarios = [];
    sc.forEach((x) => {
      const s2 = newScenario(5);
      Object.assign(s2.title, x.title); Object.assign(s2.text, x.text);
      const per = parsed.points != null ? Math.round((parsed.points / x.questions.length) * 100) / 100 : 5;
      s2.questions = x.questions.map((q) => {
        const nq = newScenQ(per);
        Object.assign(nq.text, q.text); Object.assign(nq.answer, q.answer);
        return nq;
      });
      exam.scenarios.push(s2);
    });
    if (Object.values(parsed.note).some(Boolean) && (replace || !LK.some((k) => (exam.scenNote[k] || '').trim()))) exam.scenNote = ML(parsed.note);
    if (parsed.vocab && parsed.vocab.items.length) {
      const v = exam.vocab;
      if (replace) v.items = [];
      parsed.vocab.items.forEach((it) => { const n = newVocabItem(); n.term = it.term; n.meaning = it.meaning.ar || (it.meaning.tr ? '' : Object.values(it.meaning).find(Boolean)) || ''; n.tr = it.meaning.tr || ''; v.items.push(n); });
      if (v.items.some((it) => it.tr)) v.cols.tr = true;
      if (v.cols.tr && !v.items.some((it) => (it.meaning || '').trim())) v.cols.ar = false;
      if (!LK.some((k) => (v.title[k] || '').trim())) Object.assign(v.title, parsed.vocab.title);
      if (parsed.vocabPoints != null) v.pointsEach = parsed.vocabPoints;
    }
    // başlık ve açıklama boşsa belgenin giriş satırlarından al
    const pre = parsed.preamble;
    const lgOf = (l) => (/[؀-ۿ]/.test(l) ? 'ar' : latin());
    const plain = (l) => l && l.length < 50 && !/[:…]|\.{3}|puan|point|علامة|درجة/i.test(l);
    if (!LK.some((k) => (exam.title[k] || '').trim()) && pre.length) {
      let i = pre.findIndex((l) => /sınav|sinav|exam|test|اختبار|امتحان/i.test(l) && l.length < 120);
      if (i < 0) i = pre.findIndex(plain);
      if (i >= 0) {
        const tl = [plain(pre[i - 1]) && lgOf(pre[i - 1]) === lgOf(pre[i]) ? pre[i - 1] : '', pre[i], plain(pre[i + 1]) && lgOf(pre[i + 1]) === lgOf(pre[i]) ? pre[i + 1] : ''].filter(Boolean).join(' – ');
        exam.title[lgOf(pre[i])] = tl;
      }
    }
    if (!LK.some((k) => (exam.instructions[k] || '').trim())) {
      const ins = pre.filter((l) => /puan|point|علامة|درجة/i.test(l) && !/…|\.{3}/.test(l));
      ins.forEach((l) => { const k = lgOf(l); exam.instructions[k] = exam.instructions[k] ? exam.instructions[k] + '\n' + l : l; });
    }
    const lang = $('#imLang', body).value;
    if (lang !== prefs.contentLang) { prefs.contentLang = lang; savePrefs(); }
    prefs.tab = sc.length ? 'scen' : 'vocab'; savePrefs();
    renderAll(); changed(); close();
    toast(t('scenImportDone', { n: sc.length }), 'ok');
  };
  const apply = (replace) => (close) => {
    if (mode() === 'scen') return applyScen(replace, close);
    doParseTest();
    if (!parsed || !parsed.questions.length) return;
    const lang = $('#imLang', body).value;
    snap();
    if (replace) { exam.questions = []; selected.clear(); }
    parsed.questions.forEach((pq) => {
      const q = newQuestion();
      q.text[lang] = pq.text;
      pq.options.forEach((o, k) => { q.options[k][lang] = o; });
      q.correct = pq.correct;
      exam.questions.push(q);
    });
    if (lang !== prefs.contentLang) { prefs.contentLang = lang; savePrefs(); }
    prefs.tab = 'test'; savePrefs();
    renderAll(); changed();
    close();
    toast(t('importDone', { n: parsed.questions.length }), 'ok');
  };
  const m = modal({
    title: t('importTitle'), body, wide: true,
    buttons: [
      { label: t('cancel'), onClick: (c) => c() },
      { label: t('replaceQuestions'), cls: 'danger', onClick: apply(true) },
      { label: t('appendQuestions'), cls: 'primary', onClick: apply(false) },
    ],
  });
  footer = (m && m.footer) || body.closest('.modal')?.querySelector('footer');
  if (footer) footer.querySelectorAll('button').forEach((b, i) => { b.dataset.b = i; });
  syncMode();
}

/* ------------------------------------------------------------------ şablon */
let pdfjs = null;
async function getPdfjs() {
  if (!pdfjs) {
    const lib = api.libBase || new URL('../node_modules/', import.meta.url).href;
    pdfjs = await import(lib + 'pdfjs-dist/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = lib + 'pdfjs-dist/build/pdf.worker.min.mjs';
  }
  return pdfjs;
}
async function renderTemplateImages() {
  const bytes = await api.readTemplateBg();
  if (!bytes) return;
  const lib = await getPdfjs();
  const doc = await lib.getDocument({ data: bytes }).promise;
  const urls = [];
  for (let p = 1; p <= Math.min(2, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = 1654 / vp0.width; // ~200 dpi A4
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    urls.push(canvas.toDataURL('image/png'));
  }
  const meta = await api.getTemplate();
  const auto = await detectTemplateBands(urls, meta);
  template = await api.setTemplateImages(urls, auto);
}
// Şablon resminde üst bilgi (logo, başlık çizgisi) ve alt bilginin kapladığı alanı bulur.
// Döner: { first: {top, bottom}, other: {top, bottom} } (cm; içerik bu sınırların içinde kalmalı)
async function detectTemplateBands(urls, meta) {
  if (!urls || !urls.length || !meta) return null;
  const pageWcm = (meta.widthPt / 72) * 2.54;
  const one = (url) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H).data;
      const ink = new Uint32Array(H);
      for (let y = 0; y < H; y++) {
        let n = 0;
        for (let x = 0; x < W; x += 2) {
          const i = (y * W + x) * 4;
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum < 200 && d[i + 3] > 128) n++;
        }
        ink[y] = n;
      }
      const pxPerCm = W / pageWcm;
      const minInk = Math.max(2, W / 2 * 0.003);
      const gap = Math.round(1.0 * pxPerCm);
      const has = (y) => ink[y] >= minInk;
      // üstten ilk mürekkep bloğu (aralarında 1 cm'den kısa boşluk olan satırlar tek blok sayılır)
      let top = 0;
      let y = 0;
      while (y < H * 0.3 && !has(y)) y++;
      if (y < H * 0.3) {
        let last = y, empty = 0;
        for (; y < H * 0.45; y++) {
          if (has(y)) { last = y; empty = 0; } else if (++empty > gap) break;
        }
        top = (last + 1) / pxPerCm;
      }
      let bottom = 0;
      y = H - 1;
      while (y > H * 0.7 && !has(y)) y--;
      if (y > H * 0.7) {
        let last = y, empty = 0;
        for (; y > H * 0.55; y--) {
          if (has(y)) { last = y; empty = 0; } else if (++empty > gap) break;
        }
        bottom = (H - last) / pxPerCm;
      }
      const r = (v) => Math.round(v * 10) / 10;
      resolve({ top: top ? r(top + 0.5) : 0, bottom: bottom ? r(bottom + 0.4) : 0 });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  const first = await one(urls[0]);
  const other = urls[1] ? await one(urls[1]) : first;
  if (!first) return null;
  return { first, other: other || first, v: 1 };
}
// Eski sürümde yüklenmiş şablonlarda otomatik sınırlar yoksa şimdi hesapla
async function ensureTemplateAuto() {
  if (!template || (template.auto && template.auto.v)) return;
  try {
    const urls = await api.readTemplateImages();
    const auto = await detectTemplateBands(urls, template);
    if (auto) template = await api.setTemplateAuto(auto);
  } catch { /* şablon resmi yoksa kullanıcı kenar boşlukları geçerli */ }
}
// Çıktıda kullanılacak kenar boşlukları: kullanıcı değeri ile şablonun üst/alt bilgisinden hesaplanan değerin büyüğü
function effectiveMargins() {
  const s = S();
  if (!template) return { ...s.margins, firstExtra: 0 };
  const m = { ...s.tplMargins };
  const a = template.auto;
  let firstExtra = 0;
  if (a) {
    m.top = Math.max(m.top, a.other.top);
    m.bottom = Math.max(m.bottom, a.first.bottom, a.other.bottom);
    firstExtra = Math.max(0, Math.round((a.first.top - m.top) * 10) / 10);
  }
  m.firstExtra = firstExtra;
  return m;
}

async function templateModal() {
  template = await api.getTemplate();
  await ensureTemplateAuto();
  const body = document.createElement('div');
  const draw = async () => {
    const imgs = template ? await api.readTemplateImages() : [];
    const methodKey = template ? { pdf: 'methodPdf', word: 'methodWord', libreoffice: 'methodLibre', html: 'methodHtml' }[template.method] : '';
    const m = S().tplMargins;
    body.innerHTML = `
      <p class="help">${t('templateHelp')}</p>
      <div class="row">
        <button class="btn primary" id="tpLoad">📄 ${t('loadTemplate')}</button>
        ${template ? `<button class="btn danger" id="tpRemove">🗑 ${t('removeTemplate')}</button>` : ''}
      </div>
      <label class="chk"><input type="checkbox" id="tpBody" ${prefs.includeBody ? 'checked' : ''}> ${t('includeBody')}</label>
      <div id="tpStatus" class="status ${template ? 'ok' : ''}">${template ? `✓ ${t('templateLoaded')}: <b>${esc(template.name)}</b> — ${t('templateMethod')}: ${t(methodKey)}` : t('noTemplate')}</div>
      <div class="tplbox">${imgs.map((src, i) => `<div class="thumb"><img src="${src}"><div>${i === 0 ? t('firstPage') : t('otherPages')}</div></div>`).join('')}</div>
      <div style="margin-top:14px;font-size:13px;color:var(--muted)">${t('contentMargins')}</div>
      <div class="margins">${['top', 'bottom', 'left', 'right'].map((k) => `<label>${t(k)}<input type="number" step="0.1" min="0" max="10" data-m="${k}" value="${m[k]}"></label>`).join('')}</div>
      ${template && template.auto ? `<div class="status ok">📏 ${t('autoMargins', { a: fmtPts(template.auto.first.top), b: fmtPts(template.auto.other.top), c: fmtPts(Math.max(template.auto.first.bottom, template.auto.other.bottom)) })}</div>` : ''}`;
    body.querySelectorAll('[data-m]').forEach((inp) => { inp.onchange = () => { S().tplMargins[inp.dataset.m] = Math.max(0, parseFloat(inp.value) || 0); changed(); }; });
    $('#tpBody', body).onchange = (e) => { prefs.includeBody = e.target.checked; savePrefs(); };
    $('#tpLoad', body).onclick = async () => {
      const p = await api.openDialog({ filters: [{ name: 'PDF / DOCX', extensions: ['pdf', 'docx'] }] });
      if (!p) return;
      const st = $('#tpStatus', body);
      st.className = 'status'; st.textContent = t('templateProcessing');
      body.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        template = await api.importTemplate(p, { includeBody: prefs.includeBody });
        await renderTemplateImages();
        template = await api.getTemplate();
        await draw();
        cloudTemplateChanged();
      } catch (e) {
        st.className = 'status'; st.textContent = t('error') + ': ' + e.message;
        body.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      }
    };
    if ($('#tpRemove', body)) $('#tpRemove', body).onclick = async () => { await api.removeTemplate(); template = null; await draw(); cloudTemplateChanged(); };
  };
  await draw();
  modal({ title: t('templateTitle'), body, buttons: [{ label: t('close'), cls: 'primary', onClick: (c) => c() }], onClose: renderTplInfo });
}

function savedToast(p) {
  const name = p.split(/[\\/]/).pop();
  toast(MOBILE ? t('savedDownloads', { p: name }) : t('exportedTo', { p: name }), 'ok', [
    { label: t('openFile'), onClick: () => api.openPath(p) },
    { label: MOBILE ? t('shareFile') : t('showFolder'), onClick: () => api.showItem(p) },
  ]);
}

/* ------------------------------------------------------------------ çıktı */
function buildModel(variant, lang, opts = {}) {
  const s = S();
  const sections = opts.sections || { test: true, scen: true, vocab: true };
  const lang2 = opts.lang2 && opts.lang2 !== lang ? opts.lang2 : null;
  let missing = 0;
  const pick = (ml) => {
    const v = (ml[lang] || '').trim();
    if (v) return v;
    const alt = LK.map((k) => (ml[k] || '').trim()).find(Boolean);
    if (alt) { missing++; return alt; }
    return '';
  };
  const pick2 = (ml) => (lang2 ? (ml[lang2] || '').trim() : '');
  const lbl = (lg) => ({
    name: t('lbl_name', null, lg), number: t('lbl_number', null, lg), class: t('lbl_class', null, lg), score: t('lbl_score', null, lg),
    page: t('lbl_page', null, lg), answerKey: t('lbl_answerKey', null, lg), teacherCopy: t('lbl_teacherCopy', null, lg),
    scenario: t('lbl_scenario', null, lg), points: t('lbl_points', null, lg), answer: t('lbl_answer', null, lg), total: t('lbl_total', null, lg),
    question: t('lbl_question', null, lg), vocab: t('lbl_vocab', null, lg), term: t('lbl_term', null, lg), meaning: t('lbl_meaning', null, lg),
    testPart: t('lbl_testPart', null, lg), scenPart: t('lbl_scenPart', null, lg), section: t('lbl_section', null, lg), count: t('lbl_count', null, lg),
    testKey: t('lbl_testKey', null, lg), noAnswer: t('noAnswerText', null, lg),
  });
  const scenarios = sections.scen ? exam.scenarios.map((sc, i) => ({
    n: i + 1, title: pick(sc.title), title2: pick2(sc.title), text: pick(sc.text), text2: pick2(sc.text), points: scenPoints(sc),
    questions: sc.questions.map((q, k) => ({
      n: k + 1, text: pick(q.text), text2: pick2(q.text), answer: pick(q.answer), answer2: pick2(q.answer), points: +q.points || 0, lines: +q.lines || 0,
    })),
  })) : [];
  const v = exam.vocab;
  const filled = vocabFilled();
  const vocab = sections.vocab && filled.length ? {
    // başlık bu dilde yoksa çıktı dilindeki varsayılan başlık
    title: (v.title[lang] || '').trim() || t('lbl_vocabTitle', null, lang), pointsEach: +v.pointsEach || 0, total: vocabPoints(),
    items: filled.map((it, i) => ({ n: i + 1, term: it.term, meaning: v.cols.ar ? it.meaning : '', tr: v.cols.tr ? (it.tr || '') : '' })),
    // anlam sütunları: tek sütunda "Anlamı", ikisi birlikteyse dil adlarıyla
    cols: [v.cols.ar && 'meaning', v.cols.tr && 'tr'].filter(Boolean).map((k, _, a) => ({ key: k, label: a.length > 1 ? t(k === 'tr' ? 'lbl_colTr' : 'lbl_colAr', null, lang) : t('lbl_meaning', null, lang) })),
  } : null;
  const questions = sections.test ? liveQs().filter((q) => tagMatch(q, opts.tag || '')).map((q, i) => ({
    n: i + 1, stem: pick(q.text), options: q.options.slice(0, s.optionCount).map(pick),
    correct: isAnswered(q) ? q.correct : -1,
  })) : [];
  const scenTotal = scenarios.reduce((a, x) => a + x.points, 0);
  const model = {
    variant, lang, rtl: lang === 'ar', lang2, rtl2: lang2 === 'ar',
    font: s.font, fontSize: s.fontSize, columns: s.columns, optionCount: s.optionCount,
    showInfo: s.showInfo, markCorrect: s.markCorrect, keyAtEnd: s.keyAtEnd, pageNumbers: s.pageNumbers, inlineShort: s.inlineShort,
    scenNewPage: s.scenNewPage,
    school: pick(exam.school), title: pick(exam.title), instructions: pick(exam.instructions),
    letters: window.LETTERS[lang],
    labels: lbl(lang), labels2: lang2 ? lbl(lang2) : null,
    sections, questions, scenarios, vocab,
    scenNote: scenarios.length ? pick(exam.scenNote) : '', scenNote2: scenarios.length ? pick2(exam.scenNote) : '',
    // test sorularının puanı bilinmediğinden toplam yalnızca senaryo + kelime için
    totals: { test: null, all: questions.length ? null : scenTotal + (vocab ? vocab.total : 0) },
    margins: effectiveMargins(),
  };
  model.missingTranslations = missing;
  return model;
}
function fileBase(variant, lang, sections) {
  const title = (exam.title[lang] || exam.title.tr || exam.title.en || 'sinav').trim();
  const safe = title.replace(/[\\/:*?"<>|\n\r]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'sinav';
  const part = sections && !sections.test && sections.scen ? '-senaryo' : '';
  return `${safe}${part}-${t({ student: 'fileStudent', teacher: 'fileTeacher', key: 'fileKey' }[variant], null, prefs.uiLang)}-${lang}`;
}
async function doOutput(variant, kind, lang, opts = {}) {
  const model = buildModel(variant, lang, opts);
  const fname = fileBase(variant, lang, opts.sections) + (model.lang2 ? '-' + model.lang2 : '');
  const busy = toast(t('exporting'), '', [], 2000);
  void busy;
  try {
    let r;
    if (kind === 'docx') {
      r = await api.makeDocx({ model, fileName: fname });
    } else {
      r = await api.makePdf({
        html: window.buildHtml(model), pageNumbers: model.pageNumbers, footerLabel: model.labels.page,
        margins: model.margins, action: kind === 'preview' ? 'preview' : 'save', fileName: fname,
      });
    }
    if (model.missingTranslations) toast(t('missingTranslations', { n: model.missingTranslations, lang: window.LANGS[lang] }), 'warn', [], 7000);
    if (r && r.path) savedToast(r.path);
  } catch (e) {
    toast(t('error') + ': ' + e.message, 'err', [], 9000);
  }
}
async function outputModal() {
  template = await api.getTemplate();
  await ensureTemplateAuto();
  const body = document.createElement('div');
  const missing = liveQs().filter((q) => !isAnswered(q)).length;
  const has = { test: liveQs().length > 0, scen: exam.scenarios.length > 0, vocab: vocabFilled().length > 0 };
  if (!has.test && !has.scen && !has.vocab) has.test = true;
  const secs = [['test', 'tabTest', liveQs().length], ['scen', 'tabScen', exam.scenarios.length], ['vocab', 'tabVocab', vocabFilled().length]];
  body.innerHTML = `
    <p class="help">${t('outputHint')}</p>
    <div class="row"><label style="display:flex;gap:8px;align-items:center">${t('outputLang')}
      <select class="in" id="outLang" style="width:auto">${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
      <label style="display:flex;gap:8px;align-items:center" id="outLang2Box">${t('secondLang')}
      <select class="in" id="outLang2" style="width:auto"><option value="">${t('none')}</option>${LK.map((k) => `<option value="${k}">${window.LANGS[k]}</option>`).join('')}</select></label>
      <span style="color:var(--muted);font-size:12px">🖼 ${template ? esc(template.name) : t('noTemplate')}</span></div>
    <div class="row"><label style="display:flex;gap:8px;align-items:center">${esc(t('outTag'))}
      <select class="in" id="outTag" style="width:auto"><option value="">${esc(t('filterAll'))} (${liveQs().length})</option>${QTAGS.map((k) => `<option value="${k}">${esc(t('tag_' + k))} (${liveQs().filter((q) => q.tag === k).length})</option>`).join('')}<option value="none">${esc(t('tagNone'))} (${liveQs().filter((q) => !q.tag).length})</option></select></label></div>
    <div style="font-size:12px;color:var(--muted)">${t('outputContent')}</div>
    <div class="outsec">${secs.map(([k, l, n]) => `<label class="chk"><input type="checkbox" class="outSec" value="${k}" ${has[k] ? 'checked' : ''} ${n ? '' : 'disabled'}> ${t(l)} (${n})</label>`).join('')}</div>
    ${missing ? `<div class="status" id="outMissing">⚠ ${t('answersMissingWarn', { n: missing })}</div>` : ''}
    <table class="outtable">${[['student', 'studentVersion', '🧑‍🎓'], ['teacher', 'teacherVersion', '🧑‍🏫'], ['key', 'keyOnly', '🔑']].map(([v, k, ic]) => `
      <tr><td>${ic} ${t(k)}</td><td>
        <button class="btn" data-v="${v}" data-k="preview">👁 ${t('preview')}</button>
        <button class="btn" data-v="${v}" data-k="pdf">📄 ${t('pdf')}</button>
        <button class="btn" data-v="${v}" data-k="docx">📝 ${t('word')}</button>
      </td></tr>`).join('')}</table>`;
  $('#outLang', body).value = CL();
  $('#outTag', body).value = qFilter && qFilter !== 'none' ? qFilter : (qFilter || '');
  const sections = () => {
    const o = {};
    body.querySelectorAll('.outSec').forEach((c) => { o[c.value] = c.checked && !c.disabled; });
    return o;
  };
  const sync = () => {
    const sc = sections();
    $('#outLang2Box', body).style.display = sc.scen ? '' : 'none';
    if ($('#outMissing', body)) $('#outMissing', body).style.display = sc.test ? '' : 'none';
  };
  body.querySelectorAll('.outSec').forEach((c) => { c.onchange = sync; });
  sync();
  body.querySelectorAll('[data-v]').forEach((b) => {
    b.onclick = async () => {
      const sc = sections();
      if (!sc.test && !sc.scen && !sc.vocab) return toast(t('nothingToOutput'), 'warn');
      body.querySelectorAll('[data-v]').forEach((x) => { x.disabled = true; });
      await doOutput(b.dataset.v, b.dataset.k, $('#outLang', body).value, { sections: sc, lang2: sc.scen ? $('#outLang2', body).value : '', tag: $('#outTag', body).value });
      body.querySelectorAll('[data-v]').forEach((x) => { x.disabled = false; });
    };
  });
  modal({ title: t('outputTitle'), body, buttons: [{ label: t('close'), onClick: (c) => c() }] });
}

/* ------------------------------------------------------------------ ayarlar */
function settingsForm() {
  const s = S();
  const body = document.createElement('div');
  const fonts = ['Times New Roman', 'Arial', 'Calibri', 'Cambria', 'Tahoma', 'Segoe UI', 'Traditional Arabic', 'Arial Unicode MS'];
  body.innerHTML = `
    <div class="setgrid">
      <label class="f"><span>${t('optionCount')}</span><select class="in" id="stOpt"><option value="5">5 (A–E)</option><option value="4">4 (A–D)</option></select></label>
      <label class="f"><span>${t('columns')}</span><select class="in" id="stCols"><option value="1">1</option><option value="2">2</option></select></label>
      <label class="f"><span>${t('fontFamily')}</span><select class="in" id="stFont">${fonts.map((f) => `<option>${f}</option>`).join('')}</select></label>
      <label class="f"><span>${t('fontSize')}</span><input type="number" id="stSize" min="8" max="20" step="0.5"></label>
    </div>
    <div id="stWarn"></div>
    <label class="chk"><input type="checkbox" id="stInfo"> ${t('showInfo')}</label>
    <label class="chk"><input type="checkbox" id="stInline"> ${t('inlineShort')}</label>
    <label class="chk"><input type="checkbox" id="stMark"> ${t('markInTeacher')}</label>
    <label class="chk"><input type="checkbox" id="stKey"> ${t('keyAtEnd')}</label>
    <label class="chk"><input type="checkbox" id="stPage"> ${t('pageNumbers')}</label>
    <label class="chk"><input type="checkbox" id="stSync"> ${t('syncLang')}</label>
    <div style="margin-top:12px;font-size:13px;color:var(--muted)">${t('scenSettings')}</div>
    <label class="chk"><input type="checkbox" id="stScenPage"> ${t('scenNewPage')}</label>
    <label class="f" style="max-width:420px"><span>${t('scenLines')}</span><input type="number" id="stScenLines" min="0" max="30"></label>
    <div style="margin-top:12px;font-size:13px;color:var(--muted)">${t('pageMargins')}</div>
    <div class="margins">${['top', 'bottom', 'left', 'right'].map((k) => `<label>${t(k)}<input type="number" step="0.1" min="0" max="10" data-m="${k}" value="${s.margins[k]}"></label>`).join('')}</div>
    ${APPINFO.canUpdate ? updSettingsHtml() : ''}
    <div class="verline"><span>${esc(versionText())}</span>${APPINFO.canUpdate ? `<button class="btn primary" id="stUpdNow">🔄 ${t('updCheck')}</button>` : ''}${APPINFO.canPatch ? `<button class="btn" id="stUpd">${t('updLoad')}</button>` : ''}</div>`;
  if (window.AI) body.appendChild(window.AI.settingsSection());     // Ayarlar > Yapay Zeka (1.9.4)
  if (window.Ceviri) { const st = window.Ceviri.stats(); const d = document.createElement('p'); d.className = 'hint trstats'; d.textContent = t('trStats', { m: st.memory, d: st.dictionary, a: st.aviation }); body.appendChild(d); }
  if (window.Kullanim) body.appendChild(window.Kullanim.kart());   // Ayarlar > Kullanım Limitleri
  body.appendChild(contactSection());
  if ($('#stUpd', body)) $('#stUpd', body).onclick = updateModal;
  if ($('#stUpdNow', body)) $('#stUpdNow', body).onclick = runUpdate;
  $('#stOpt', body).value = String(s.optionCount);
  $('#stCols', body).value = String(s.columns);
  $('#stFont', body).value = s.font;
  $('#stSize', body).value = s.fontSize;
  $('#stInfo', body).checked = s.showInfo;
  $('#stInline', body).checked = s.inlineShort;
  $('#stMark', body).checked = s.markCorrect;
  $('#stKey', body).checked = s.keyAtEnd;
  $('#stPage', body).checked = s.pageNumbers;
  $('#stSync', body).checked = prefs.syncLang;
  if (APPINFO.canUpdate) updSettingsFill(body);
  $('#stScenPage', body).checked = s.scenNewPage;
  $('#stScenLines', body).value = s.scenLines;
  const warnE = () => {
    const n = exam.questions.filter((q) => q.correct === 4).length;
    $('#stWarn', body).innerHTML = (+$('#stOpt', body).value === 4 && n) ? `<div class="status">⚠ ${t('optionCountWarn', { n })}</div>` : '';
  };
  $('#stOpt', body).onchange = warnE; warnE();
  const apply = () => {
    snap();
    s.optionCount = +$('#stOpt', body).value;
    s.columns = +$('#stCols', body).value;
    s.font = $('#stFont', body).value;
    s.fontSize = Math.min(20, Math.max(8, parseFloat($('#stSize', body).value) || 12));
    s.showInfo = $('#stInfo', body).checked;
    s.inlineShort = $('#stInline', body).checked;
    s.markCorrect = $('#stMark', body).checked;
    s.keyAtEnd = $('#stKey', body).checked;
    s.pageNumbers = $('#stPage', body).checked;
    body.querySelectorAll('[data-m]').forEach((inp) => { s.margins[inp.dataset.m] = Math.max(0, parseFloat(inp.value) || 0); });
    s.scenNewPage = $('#stScenPage', body).checked;
    s.scenLines = Math.max(0, Math.min(30, parseInt($('#stScenLines', body).value, 10) || 0));
    prefs.syncLang = $('#stSync', body).checked;
    if (APPINFO.canUpdate) updSettingsRead(body);
    savePrefs();
  };
  return { body, apply };
}
/* ------------------------------------------------------------------ admin iletişim */
// Öneri ve talepler yöneticiye iletilir. Alıcı adres programda yer almaz: mesaj güncelleme projesine yazılır,
// yöneticinin aktarım betiği oradan alıp yöneticiye e-posta olarak gönderir. Gönderilemeyen mesaj saklanır, sonra yeniden denenir.
const CONTACT_Q = 'contact.outbox';
const contactTopics = ['contactTopicIdea', 'contactTopicReq', 'contactTopicBug', 'contactTopicOther'];
function contactPayload(f) {
  return {
    konu: f.topic, ad: f.name, donus: f.reply, mesaj: f.text,
    surum: APPINFO.version || '', platform: MOBILE ? 'android' : 'masaustu', cihaz: deviceName, dil: prefs.uiLang || 'tr',
    zaman: new Date().toISOString(),
  };
}
async function contactFlush() {
  const q = CL0.store.get(CONTACT_Q) || [];
  if (!q.length) return 0;
  const left = [];
  let sent = 0;
  for (const m of q) {
    try { await CL0.sendContact(m); sent++; } catch { left.push(m); }
  }
  CL0.store.set(CONTACT_Q, left.length ? left : null);
  return sent;
}
function contactSection() {
  const box = document.createElement('section');
  box.className = 'contactbox';
  box.innerHTML = `
    <h4>✉ ${esc(t('contactTitle'))}</h4>
    <p class="contactlead">${esc(t('contactLead'))}</p>
    <div class="setgrid">
      <label class="f"><span>${esc(t('contactName'))}</span><input class="in" id="ctName" type="text" maxlength="100" dir="auto"></label>
      <label class="f"><span>${esc(t('contactReply'))}</span><input class="in" id="ctReply" type="text" maxlength="150" dir="auto"></label>
      <label class="f"><span>${esc(t('contactTopic'))}</span><select class="in" id="ctTopic">${contactTopics.map((k) => `<option value="${k}">${esc(t(k))}</option>`).join('')}</select></label>
    </div>
    <label class="f"><span>${esc(t('contactMsg'))}</span><textarea class="in" id="ctText" rows="5" maxlength="4000" dir="auto" placeholder="${esc(t('contactMsgPh'))}"></textarea></label>
    <div class="contactfoot"><span class="hint" id="ctInfo">${esc(t('contactPrivacy'))}</span><button class="btn primary" id="ctSend">${esc(t('contactSend'))}</button></div>`;
  // telefonda ayar kartı her değişiklikte ayarları uygular; bu bölümün alanları ayar değildir
  ['change', 'input'].forEach((ev) => box.addEventListener(ev, (e) => e.stopPropagation()));
  const info = $('#ctInfo', box);
  const say = (msg, cls) => { info.textContent = msg; info.className = 'hint ' + (cls || ''); };
  $('#ctSend', box).onclick = async () => {
    const text = $('#ctText', box).value.trim();
    if (text.length < 10) { say(t('contactTooShort'), 'err'); $('#ctText', box).focus(); return; }
    const last = CL0.store.get('contact.last') || 0;
    if (Date.now() - last < 60000) { say(t('contactWait'), 'err'); return; }
    const m = contactPayload({
      topic: window.I18N[$('#ctTopic', box).value][0], name: $('#ctName', box).value.trim(), reply: $('#ctReply', box).value.trim(), text,
    });
    const btn = $('#ctSend', box);
    btn.disabled = true; say(t('contactSending'));
    try {
      await CL0.sendContact(m);
      say(t('contactSent'), 'ok');
      toast(t('contactSent'), 'ok');
      contactFlush().catch(() => {});
    } catch (e) {
      const q = CL0.store.get(CONTACT_Q) || [];
      q.push(m); CL0.store.set(CONTACT_Q, q.slice(-20));
      say(t('contactQueued'), 'warn');
    }
    CL0.store.set('contact.last', Date.now());
    $('#ctText', box).value = '';
    btn.disabled = false;
  };
  return box;
}
function settingsModal() {
  if (MOBILE) { renderSettingsInline(); $('#settingsCard').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const { body, apply } = settingsForm();
  modal({
    title: t('settingsTitle'), body,
    buttons: [{ label: t('cancel'), onClick: (c) => c() }, {
      label: t('ok'), cls: 'primary', onClick: (c) => { apply(); renderAll(); changed(); c(); },
    }],
  });
}
// Telefonda ayarlar ayrı pencere yerine ana ekranda durur; her değişiklik hemen uygulanır
function renderSettingsInline() {
  const card = $('#settingsCard');
  if (!card) return;
  const { body, apply } = settingsForm();
  card.innerHTML = `<h3>⚙ ${esc(t('settingsTitle'))}</h3>`;
  card.appendChild(body);
  body.addEventListener('change', () => {
    apply();
    renderExamInfo(); renderList(); renderScenarios(); renderVocab(); updateSide();
    changed();
  });
}

/* ------------------------------------------------------------------ bulut eşitleme */
// Açık sınav, her değişiklikten kısa süre sonra buluta gönderilir; diğer cihazdaki değişiklikler
// açılışta, uygulamaya dönüldüğünde ve düzenli aralıklarla alınır. Şablon da eşitlenir.
const CL0 = window.Cloud;
let deviceName = MOBILE ? 'Telefon' : 'Bilgisayar';
let APPINFO = {};
const versionText = () => APPINFO.version ? `${t('version')} ${APPINFO.version}${APPINFO.patch ? ` (${t('updPatched', { b: APPINFO.baseVersion })})` : ''}` : '';

/* ------------------------------------------------------------------ masaüstü yama (güncelleme) */
const updErr = (r) => (window.I18N['updErr_' + r.code] ? t('updErr_' + r.code, { v: r.arg }) : t('updFail') + ' (' + r.code + ')');
async function updateModal() {
  if (!APPINFO.canPatch) return;
  const body = document.createElement('div');
  body.innerHTML = `<p style="margin:0 0 8px"><b>${esc(versionText())}</b></p>
    <p class="hint">${t('updHint')}</p>
    <div id="updInfo"></div>`;
  const m = modal({
    title: t('updTitle'), body,
    buttons: [
      ...(APPINFO.patch ? [{ label: t('updRemove'), cls: 'danger', onClick: async (c) => {
        if (!(await confirmBox(t('updRemoveAsk', { b: APPINFO.baseVersion })))) return;
        await api.removePatch(); c(); askRelaunch(t('updRemoved', { b: APPINFO.baseVersion }));
      } }] : []),
      { label: t('cancel'), onClick: (c) => c() },
      { label: t('updPick'), cls: 'primary', onClick: async (c) => {
        const f = await api.openDialog({ title: t('updTitle'), filters: [{ name: t('updFile'), extensions: ['sinavyama'] }] });
        if (!f) return;
        const info = await api.inspectPatch(f);
        if (!info.ok) { $('#updInfo', body).innerHTML = `<div class="status err">⛔ ${esc(updErr(info))}</div>`; return; }
        if (!(await confirmBox(t('updAsk', { v: info.version }) + (info.notes ? '\n\n' + info.notes : '')))) return;
        const r = await api.installPatch(f);
        if (!r.ok) { $('#updInfo', body).innerHTML = `<div class="status err">⛔ ${esc(updErr(r))}</div>`; return; }
        c(); askRelaunch(t('updDone', { v: r.version }));
      } },
    ],
  });
  m.el.querySelector('.modal').style.width = 'min(560px, 92vw)';
}
/* ------------------------------------------------------------------ tek tıkla güncelleme (Firebase) */
// Yayıncı yeni sürümü updates/{kanal} belgesine koyar; düğmeye basınca indirilir, imzası denetlenir, kurulur ve program yeniden başlar.
const UPD_CH = MOBILE ? 'android' : 'desktop';
const cmpVer = (a, b) => {
  const x = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0), y = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
};
let updHead = null, updBusy = false;
const updNewer = (h) => !!(h && !h.disabled && cmpVer(h.version, APPINFO.version) > 0);
// telefonda yeni dosyalar uygulamanın yerel (Java) sürümüyle uyumlu olmalı; masaüstünde ana kurulum yeterince yeni olmalı
const updFits = (h) => (MOBILE ? (+h.minNative || 0) <= (+APPINFO.nativeLevel || 0) : !h.minBase || cmpVer(APPINFO.baseVersion || APPINFO.version, h.minBase) >= 0);
function renderUpdBtn() {
  const b = $('#btnUpdate');
  if (!b) return;
  b.style.display = APPINFO.canUpdate ? '' : 'none';
  b.classList.toggle('has', !!updHead);
  $('.lbl', b).textContent = updHead ? t('updNow', { v: updHead.version }) : t('updCheck');
  b.title = updHead ? t('updNowTip', { v: updHead.version }) : t('updCheckTip');
}
async function checkUpdate(manual) {
  if (!APPINFO.canUpdate) return null;
  if (!CL0.updateReady) {
    if (manual) toast(t('updNoCloud'), 'warn', [{ label: t('cloud'), onClick: () => cloudModal() }], 9000);
    return null;
  }
  try {
    const h = await CL0.updateHead(UPD_CH);
    updHead = updNewer(h) && updFits(h) ? h : null;
    if (!manual && updHead) updNotify(updHead);
    if (!manual && !updHead && updNewer(h) && !updFits(h) && updNotified !== 'full-' + h.version) { updNotified = 'full-' + h.version; toast('🔔 ' + t(MOBILE ? 'updNeedApk' : 'updNeedFull', { v: h.version }), 'warn', [], 15000); }
    if (manual && updNewer(h) && !updFits(h)) toast(t(MOBILE ? 'updNeedApk' : 'updNeedFull', { v: h.version }), 'warn', [], 15000);
    else if (manual && !updHead) toast(t('updLatest', { v: APPINFO.version }), 'ok');
  } catch (e) {
    if (manual) toast(t('updFail') + ' ' + cloudMsg(e), 'err', [], 9000);
  }
  renderUpdBtn();
  return updHead;
}
/* yeni sürüm bildirimi (Ayarlar → Güncelleme bildirimleri) */
// prefs.updAtStart: program her açıldığında yeni sürüme bakılır; varsa bildirim gösterilir.
// Aynı sürüm için bir oturumda bir kez haber verilir.
let updNotified = '', updToastEl = null;
// 1.8.0: güncelleme denetimi açılışta her zaman yapılır (ayar kaldırıldı)
function updSettingsHtml() { return ''; }
function updSettingsFill() { /* yok */ }
function updSettingsRead() { /* yok */ }
function updNotify(h) {
  if (!h || updNotified === h.version || updBusy) return;
  updNotified = h.version;
  if (updToastEl) updToastEl.remove();
  const msg = t('updAvail', { v: h.version }) + (h.notes ? ' — ' + String(h.notes).split('\n')[0].slice(0, 140) : '');
  updToastEl = toast('🔔 ' + msg, 'ok', [
    { label: t('updNowBtn'), onClick: () => { if (updToastEl) updToastEl.remove(); updToastEl = null; runUpdate(); } },
    { label: t('updLater'), onClick: () => { if (updToastEl) updToastEl.remove(); updToastEl = null; } },
  ], 15000); // 30 sn görünür; üstteki "Güncelle → sürüm" düğmesi vurgulu kalır
  // masaüstünde sistem bildirimi de gösterilir (program arkadayken de görülsün)
  if (!MOBILE && typeof Notification !== 'undefined') {
    try {
      const n = new Notification(t('updNotifyHead'), { body: msg, silent: false });
      n.onclick = () => { try { if (api.focusWin) api.focusWin(); else window.focus(); } catch { /* yok */ } };
    } catch { /* bildirim desteklenmiyor */ }
  }
}
async function sha256Hex(bytes) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('');
}
// Tek tık: varsa yeni sürümü indirir, kurar ve programı yeniden başlatır
async function runUpdate() {
  if (updBusy) return;
  const h = updHead || await checkUpdate(true);
  if (!h) return;
  updBusy = true;
  const btn = $('#btnUpdate');
  btn.disabled = true;
  const m = modal({
    title: t('updTitle'),
    body: `<p style="margin:0 0 8px"><b>${esc(t('updGetting', { v: h.version }))}</b></p>${h.notes ? `<p class="hint" style="white-space:pre-line">${esc(h.notes)}</p>` : ''}
      <div class="progress"><div></div></div><p class="hint" id="updSt">${esc(t('updDownloading'))}</p>`,
  });
  m.el.querySelector('.x').style.display = 'none';
  m.el.querySelector('.modal').style.width = 'min(520px, 92vw)';
  const bar = m.el.querySelector('.progress div');
  const st = (k) => { m.el.querySelector('#updSt').textContent = t(k); };
  try {
    const mbf = (x) => (x / 1048576).toFixed(1).replace('.', window.UI_LANG === 'en' ? '.' : ',');
    const b64 = await CL0.getUpdate(UPD_CH, h, (d, n, sp) => {
      bar.style.width = Math.round(80 * d / n) + '%';
      const el = m.el.querySelector('#updSt');
      if (el) el.textContent = `%${Math.round(100 * d / n)} — ${mbf(d)} / ${mbf(n)} MB · ${mbf(n - d)} MB · ${sp >= 1048576 ? mbf(sp) + ' MB/s' : Math.round(sp / 1024) + ' KB/s'}`;
    });
    if (h.sha) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (await sha256Hex(bytes) !== h.sha) throw Object.assign(new Error('BADHASH'), { upd: { code: 'BADHASH', arg: '' } });
    }
    st('updInstalling'); bar.style.width = '90%';
    const r = MOBILE ? await api.installOta(b64) : await api.installPatchData(b64);
    if (!r || !r.ok) throw Object.assign(new Error((r && r.code) || 'FAIL'), { upd: r || { code: 'FAIL' } });
    st('updRestarting'); bar.style.width = '100%';
    // açık sınav kaydedilir (ve buluta gönderilir), sonra program yeni sürümle yeniden açılır
    clearTimeout(saveTimer);
    await api.writeAutosave({ exam, filePath, dirty });
    if (CL0.ready && syncRec(exam.id).dirty) { try { await cloudPush(); } catch { /* sonra gönderilir */ } }
    setTimeout(() => api.relaunch(), 700);
  } catch (e) {
    m.close();
    toast(e.upd ? updErr(e.upd) : t('updFail') + ' ' + cloudMsg(e), 'err', [], 12000);
    updBusy = false;
    btn.disabled = false;
  }
}
async function askRelaunch(msg) {
  if (await confirmBox(msg + ' ' + t('updRestartAsk'))) {
    clearTimeout(saveTimer);
    await api.writeAutosave({ exam, filePath, dirty });
    api.relaunch();
  }
}
let cloudState = 'off';
let cloudBusy = false;
let cloudPushTimer = null;
let cloudSeq = 0; // her değişiklikte artar; gönderim sırasında değişiklik olduysa yeniden gönderilir
const syncRecs = () => CL0.store.get('cloud.sync') || {};
const syncRec = (id) => syncRecs()[id] || {};
function setSyncRec(id, rec) {
  const all = syncRecs();
  if (rec) all[id] = rec; else delete all[id];
  CL0.store.set('cloud.sync', all);
}
const cloudAuto = () => prefs.cloudAuto !== false;
const examName = (x) => (LK.map((k) => (x.title[k] || '').trim()).find(Boolean)) || t('untitled');
const examInfoText = (x) => t('cloudInfo', { q: x.questions.length, s: x.scenarios.length, v: x.vocab.items.filter((it) => (it.term || '').trim()).length });
const cloudMsg = (e) => (e && e.code && window.I18N['cloudErr_' + e.code] ? t('cloudErr_' + e.code) : t('error') + ': ' + (e && e.message));

function setCloudState(st, err) {
  cloudState = CL0.ready ? st : 'off';
  const b = $('#btnCloud');
  if (!b) return;
  b.dataset.st = cloudState;
  const key = { off: 'cloudOff', ok: 'cloudOk', busy: 'cloudBusy', error: 'cloudError', pending: 'cloudPending' }[cloudState] || 'cloudOff';
  b.title = t(key) + (err ? ' – ' + cloudMsg(err) : '');
  const box = $('#cloudStatus');
  if (box) box.textContent = t(key) + (err ? ' – ' + cloudMsg(err) : '');
}
function cloudFail(e) {
  if (e && e.code === 'OFFLINE') { setCloudState('pending', e); return; }
  setCloudState('error', e);
  if (e && e.code === 'SESSION') toast(cloudMsg(e), 'warn', [{ label: t('cloud'), onClick: cloudModal }], 8000);
}
function cloudDirty() {
  cloudSeq++;
  if (!CL0.ready) return;
  const r = syncRec(exam.id);
  if (!r.dirty) setSyncRec(exam.id, { ...r, dirty: true });
  if (!cloudAuto()) return;
  if (cloudState !== 'busy') setCloudState('pending');
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => cloudPush(), 2500);
}
// Açık sınavı gönderir. Bulutta başka cihazın yaptığı, henüz alınmamış bir değişiklik varsa
// o sürüm "çakışma kopyası" olarak ayrıca saklanır; hiçbir sürüm kaybolmaz.
async function cloudPush(force, attempt = 0) {
  if (!CL0.ready) return;
  if (cloudBusy) { clearTimeout(cloudPushTimer); cloudPushTimer = setTimeout(() => cloudPush(force), 1500); return; }
  const ex = exam;
  const id = ex.id;
  const rec = syncRec(id);
  if (!force && rec.rev && !rec.dirty) return;
  const empty = !ex.questions.length && !ex.scenarios.length && !ex.vocab.items.some((it) => (it.term || '').trim()) && !LK.some((k) => (ex.title[k] || '').trim());
  if (empty && !rec.rev) return; // boş yeni sınav buluta gönderilmez
  cloudBusy = true;
  setCloudState('busy');
  const seq = cloudSeq;
  let retry = false;
  try {
    const head = await CL0.examHead(id);
    if (head && !head.deleted && head._updateTime !== rec.rev) {
      const other = await CL0.getExam(id);
      if (other && JSON.stringify(normalizeExam(other.exam)) !== JSON.stringify(ex)) {
        const copy = normalizeExam(other.exam);
        copy.id = newId();
        await CL0.putExam(copy.id, copy, { name: `${examName(copy)} (${t('cloudConflictCopy')} – ${head.device || '?'})`, device: head.device || '', updatedAt: Date.now(), info: examInfoText(copy) }, 0);
        toast(t('cloudConflict'), 'warn', [], 10000);
      }
    }
    // koşullu yazma: okuduğumuzdan beri başka cihaz yazdıysa reddedilir ve baştan denenir
    const rev = await CL0.putExam(id, ex, { name: examName(ex), device: deviceName, updatedAt: Date.now(), info: examInfoText(ex) }, head ? head.parts : 0, head ? head._updateTime : null);
    setSyncRec(id, { rev, dirty: ex !== exam || cloudSeq !== seq });
    setCloudState('ok');
  } catch (e) {
    if (e.code === 'CONFLICT' && attempt < 3) retry = true; else cloudFail(e);
  } finally {
    cloudBusy = false;
  }
  if (retry) return cloudPush(true, attempt + 1);
  if (ex === exam && syncRec(id).dirty && cloudAuto() && cloudState === 'ok') cloudDirty();
}
// Buluttaki yeni sürümleri alır (önce şablon, sonra açık sınav)
async function cloudPull() {
  if (!CL0.ready || cloudBusy) return;
  cloudBusy = true;
  setCloudState('busy');
  let pushNeeded = false;
  try {
    await templateSync();
    const id = exam.id;
    const rec = syncRec(id);
    const head = await CL0.examHead(id);
    if (head && !head.deleted && head._updateTime !== rec.rev) {
      if (!rec.dirty) {
        const r = await CL0.getExam(id);
        if (r && exam.id === id) {
          snap();
          const keepPath = filePath;
          exam = normalizeExam(r.exam);
          exam.id = id;
          filePath = keepPath;
          renderAll();
          api.writeAutosave({ exam, filePath, dirty });
          setSyncRec(id, { rev: r.head._updateTime, dirty: false });
          toast(t('cloudPulled', { d: head.device || '?' }), 'ok');
        }
      } else pushNeeded = true;
    } else if (!head || head.deleted || rec.dirty || !rec.rev) pushNeeded = cloudAuto();
    setCloudState('ok');
  } catch (e) {
    cloudFail(e);
  } finally {
    cloudBusy = false;
  }
  if (pushNeeded) await cloudPush(true);
}
// Buluttaki bütün sınavların yerel kopyası: günde bir kez, yalnızca okuma (buluta hiçbir şey yazılmaz)
async function cloudBackup() {
  if (!CL0.ready || !api.cloudBackupWrite) return;
  try {
    const last = await api.cloudBackupLast();
    const m = last && /^bulut-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/.exec(last);
    if (m && Date.now() - Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) < 20 * 3600000) return;
    const list = await CL0.listExams();
    const exams = [];
    for (const d of list) {
      try { const r = await CL0.getExam(d._id); if (r) exams.push({ id: d._id, name: d.name || '', device: d.device || '', updatedAt: d.updatedAt || 0, exam: r.exam }); } catch { /* bu sınav sonra */ }
    }
    if (exams.length || !list.length) await api.cloudBackupWrite({ app: 'sinav-hazirlama', created: new Date().toISOString(), user: (CL0.user && CL0.user.email) || '', count: exams.length, exams });
  } catch { /* yedek sonra yeniden denenir */ }
}
let cloudSoonTimer = null;
function cloudSoon() { clearTimeout(cloudSoonTimer); cloudSoonTimer = setTimeout(cloudPull, 400); }

// Şablon: son eşitlenen bulut sürümü (rev) ve yerel damga (stamp) ile karşılaştırılır
async function templateSync() {
  const local = await api.getTemplate();
  const localStamp = local ? (local.stamp || 'eski') : '';
  const rec = CL0.store.get('cloud.tpl') || {};
  const head = await CL0.templateHead();
  const cloudChanged = head && head._updateTime !== rec.rev;
  const localChanged = localStamp !== (rec.stamp || '');
  if (head && cloudChanged) {
    if (head.removed) {
      if (local && !localChanged) { await api.removeTemplate(); template = null; renderTplInfo(); }
      CL0.store.set('cloud.tpl', { rev: head._updateTime, stamp: local && localChanged ? 'x' : '' });
      if (local && localChanged) await templatePush();
      return;
    }
    if (head.stamp && head.stamp === localStamp) { CL0.store.set('cloud.tpl', { rev: head._updateTime, stamp: localStamp }); return; }
    if (!localChanged || !local) {
      const raw = await CL0.getTemplate(head);
      if (raw) {
        await api.importTemplateRaw(raw);
        template = await api.getTemplate();
        renderTplInfo();
        CL0.store.set('cloud.tpl', { rev: head._updateTime, stamp: template ? (template.stamp || 'eski') : '' });
        toast(t('cloudTplPulled'), 'ok');
      }
      return;
    }
  }
  if ((!head && local) || (head && localChanged && (local || !head.removed))) await templatePush();
}
async function templatePush() {
  const raw = await api.exportTemplateRaw();
  if (raw && !raw.meta.stamp) raw.meta.stamp = 'eski';
  const rev = await CL0.putTemplate(raw);
  CL0.store.set('cloud.tpl', { rev, stamp: raw ? raw.meta.stamp : '' });
}
async function cloudTemplateChanged() {
  if (!CL0.ready || !cloudAuto()) return;
  while (cloudBusy) await new Promise((r) => setTimeout(r, 300));
  cloudBusy = true;
  setCloudState('busy');
  try { await templatePush(); setCloudState('ok'); } catch (e) { cloudFail(e); } finally { cloudBusy = false; }
}

async function openCloudExam(id) {
  if (CL0.ready && syncRec(exam.id).dirty) await cloudPush(true);
  const r = await CL0.getExam(id);
  if (!r) return;
  snap();
  exam = normalizeExam(r.exam);
  exam.id = id;
  filePath = null; dirty = false;
  selected.clear();
  setSyncRec(id, { rev: r.head._updateTime, dirty: false });
  renderAll();
  api.writeAutosave({ exam, filePath, dirty });
  toast(t('cloudOpened', { n: examName(exam) }), 'ok');
}

function cloudModal() {
  const body = document.createElement('div');
  body.className = 'cloudbox';
  let m = null;
  const busy = (on) => body.querySelectorAll('button, input, textarea').forEach((b) => { b.disabled = on; });
  const err = (e) => { const x = $('#clErr', body); if (x) { x.textContent = cloudMsg(e); x.style.display = ''; } };
  const draw = async () => {
    const cfg = CL0.config, user = CL0.user;
    if (!cfg) {
      body.innerHTML = `
        <p class="help">${esc(t('cloudIntro'))}</p>
        <label class="f"><span>${esc(t('cloudPasteCfg'))}</span>
        <textarea id="clCfg" rows="7" dir="ltr" placeholder="const firebaseConfig = {&#10;  apiKey: &quot;AIza…&quot;,&#10;  projectId: &quot;…&quot;,&#10;  …&#10;};"></textarea></label>
        <div class="status" id="clErr" style="display:none"></div>
        <div class="row"><button class="btn primary" id="clSaveCfg">${esc(t('cloudSaveCfg'))}</button></div>
        <p class="help">${esc(t('cloudGuide'))}</p>`;
      $('#clSaveCfg', body).onclick = () => {
        try { CL0.setConfig(CL0.parseConfig($('#clCfg', body).value)); draw(); } catch (e) { err(e); }
      };
      return;
    }
    if (!user) {
      body.innerHTML = `
        <p class="help">${esc(t('cloudIntro'))}</p>
        <div class="status ok">☁ ${esc(t('cloudProject'))}: <b>${esc(cfg.projectId)}</b></div>
        <div class="grid2">
          <label class="f"><span>${esc(t('cloudEmail'))}</span><input type="text" id="clEmail" dir="ltr" autocomplete="username" inputmode="email" value="${esc(CL0.store.get('cloud.lastEmail') || '')}"></label>
          <label class="f"><span>${esc(t('cloudPassword'))}</span><input type="password" id="clPass" dir="ltr" autocomplete="current-password"></label>
        </div>
        <div class="status" id="clErr" style="display:none"></div>
        <div class="row">
          <button class="btn primary" id="clIn">${esc(t('cloudSignIn'))}</button>
          <button class="btn" id="clUp">${esc(t('cloudSignUp'))}</button>
          <button class="btn" id="clForgot">${esc(t('cloudForgot'))}</button>
          <button class="btn" id="clCfgChange">${esc(t('cloudChangeCfg'))}</button>
        </div>`;
      const go = async (create) => {
        const email = $('#clEmail', body).value.trim(), pass = $('#clPass', body).value;
        busy(true);
        try {
          await CL0.signIn(email, pass, create);
          CL0.store.set('cloud.lastEmail', email);
          await draw();
          await cloudPull();
          await drawList();
        } catch (e) { busy(false); err(e); }
      };
      $('#clIn', body).onclick = () => go(false);
      $('#clUp', body).onclick = () => go(true);
      $('#clPass', body).onkeydown = (e) => { if (e.key === 'Enter') go(false); };
      $('#clForgot', body).onclick = async () => {
        try { await CL0.resetPassword($('#clEmail', body).value.trim()); toast(t('cloudResetSent'), 'ok'); } catch (e) { err(e); }
      };
      $('#clCfgChange', body).onclick = () => { CL0.setConfig(null); draw(); };
      return;
    }
    body.innerHTML = `
      <div class="status ok">☁ ${esc(t('cloudSignedIn'))}: <b>${esc(user.email)}</b> — ${esc(t('cloudProject'))}: <b>${esc(cfg.projectId)}</b></div>
      <div class="row">
        <label class="chk"><input type="checkbox" id="clAuto" ${cloudAuto() ? 'checked' : ''}> ${esc(t('cloudAuto'))}</label>
        <button class="btn primary" id="clSync">⟳ ${esc(t('cloudSyncNow'))}</button>
        <span id="cloudStatus" class="clst"></span>
      </div>
      <div class="status" id="clErr" style="display:none"></div>
      <h4>${esc(t('cloudExams'))}</h4>
      <div id="clList" class="cllist">…</div>
      <h4>${esc(t('cloudCode'))}</h4>
      <p class="help">${esc(t('cloudCodeHint'))}</p>
      <div class="row"><input type="text" id="clCode" dir="ltr" readonly value="${esc(CL0.shareCode())}"><button class="btn" id="clCopy">${esc(t('copy'))}</button></div>
      <div class="row" style="margin-top:12px"><button class="btn danger" id="clOut">${esc(t('cloudSignOut'))}</button></div>`;
    setCloudState(cloudState);
    $('#clAuto', body).onchange = (e) => { prefs.cloudAuto = e.target.checked; savePrefs(); if (e.target.checked) cloudSoon(); };
    $('#clSync', body).onclick = async () => {
      busy(true);
      await cloudPull();
      if (syncRec(exam.id).dirty) await cloudPush(true);
      busy(false);
      if (cloudState === 'error') err(new Error($('#btnCloud').title));
      await drawList();
    };
    $('#clCopy', body).onclick = async () => {
      const inp = $('#clCode', body);
      inp.select();
      try { await navigator.clipboard.writeText(inp.value); } catch { document.execCommand('copy'); }
      toast(t('copied'), 'ok', [], 2000);
    };
    $('#clOut', body).onclick = () => { CL0.signOut(); setCloudState('off'); draw(); };
    await drawList();
  };
  const drawList = async () => {
    const box = $('#clList', body);
    if (!box) return;
    let list;
    try { list = await CL0.listExams(); } catch (e) { box.textContent = ''; err(e); return; }
    if (!list.length) { box.innerHTML = `<div class="empty">${esc(t('cloudEmptyList'))}</div>`; return; }
    const fmt = (ms) => { try { return new Date(ms).toLocaleString(prefs.uiLang === 'ar' ? 'ar' : prefs.uiLang); } catch { return ''; } };
    box.innerHTML = list.map((d) => `
      <div class="clrow ${d._id === exam.id ? 'cur' : ''}">
        <div class="cltxt"><b dir="auto">${esc(d.name || t('untitled'))}</b>${d._id === exam.id ? ` <em>(${esc(t('cloudCurrent'))})</em>` : ''}
          <small>${esc(d.info || '')} · ${esc(d.device || '')} · ${esc(fmt(d.updatedAt))}</small></div>
        <div class="clbtn">${d._id === exam.id ? '' : `<button class="btn primary" data-open="${d._id}">${esc(t('cloudOpen'))}</button>`}
          <button class="btn danger" data-del="${d._id}">${esc(t('cloudDelete'))}</button></div>
      </div>`).join('');
    box.querySelectorAll('[data-open]').forEach((b) => {
      b.onclick = async () => {
        busy(true);
        try { await openCloudExam(b.dataset.open); if (m) m.close(); } catch (e) { busy(false); err(e); }
      };
    });
    box.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const d = list.find((x) => x._id === b.dataset.del);
        if (!(await confirmBox(t('cloudConfirmDelete', { n: d.name || t('untitled') })))) return;
        try {
          await CL0.deleteExam(d._id);
          if (d._id === exam.id) setSyncRec(exam.id, null);
          await drawList();
        } catch (e) { err(e); }
      };
    });
  };
  m = modal({ title: t('cloudTitle'), body, wide: true, buttons: [{ label: t('close'), cls: 'primary', onClick: (c) => c() }] });
  draw();
}

/* ------------------------------------------------------------------ toplu işlemler */
async function deleteSelected() {
  if (!selected.size) return;
  if (!(await confirmBox(t('confirmDelete', { n: selected.size })))) return;
  snap();
  exam.questions = exam.questions.filter((q) => !selected.has(q.id));
  selected.clear(); renderList(); changed();
}
async function shuffleQuestions() {
  if (exam.questions.length < 2 || !(await confirmBox(t('confirmShuffleQ')))) return;
  snap();
  const a = exam.questions;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  renderList(); changed();
}
async function shuffleAllOptions() {
  if (!exam.questions.length || !(await confirmBox(t('confirmShuffleO')))) return;
  snap(); exam.questions.forEach(shuffleQuestionOptions); renderList(); changed();
}

/* ------------------------------------------------------------------ bağlantılar */
/* ------------------------------------------------------------------ kendiliğinden uzayan metin kutuları */
// Soru, senaryo ve beklenen cevap kutuları içerik kadar uzar; yazılan her şey kaydırmadan görünür
const GROW_SEL = 'textarea.stem, textarea.stext, textarea.sqtext, textarea.sqanswer, #fInstr, #fScenNote';
function fitTA(el) {
  if (!el.offsetParent) return; // gizli sekmedeki kutular sekme açılınca ayarlanır
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + el.offsetHeight - el.clientHeight) + 'px';
}
let fitPending = false;
function fitAllTA() {
  if (fitPending) return;
  fitPending = true;
  requestAnimationFrame(() => { fitPending = false; document.querySelectorAll(GROW_SEL).forEach(fitTA); });
}
function wireAutoGrow() {
  document.addEventListener('input', (e) => { if (e.target.matches && e.target.matches(GROW_SEL)) fitTA(e.target); }, true);
  new MutationObserver(fitAllTA).observe($('#editor'), { childList: true, subtree: true });
  window.addEventListener('resize', fitAllTA);
  fitAllTA();
}

function wire() {
  wireAutoGrow();
  $('#btnNew').onclick = newExamAction;
  $('#btnOpen').onclick = openExam;
  $('#btnSave').onclick = () => saveExam(false);
  $('#btnSaveAs').onclick = () => saveExam(true);
  $('#btnImport').onclick = importModal;
  $('#btnTemplate').onclick = templateModal;
  $('#btnTranslateAll').onclick = () => translateAllModal();
  $('#btnTrSel').onclick = () => translateAllModal(exam.questions.some((q) => selected.has(q.id)) ? 'sel' : 'q');
  $('#btnOutput').onclick = outputModal;
  $('#btnSettings').onclick = settingsModal;
  $('#btnAdvisor').onclick = () => window.AI && window.AI.advisorModal();
  $('#btnCloud').onclick = cloudModal;
  $('#btnUndo').onclick = undo;
  $('#btnFind').onclick = findOpen;
  $('#btnFull').onclick = () => api.toggleFullscreen();
  $('#btnQuit').onclick = async () => { await api.writeAutosave({ exam, filePath, dirty }); api.quit(); };
  $('#btnAddQ').onclick = () => { snap(); const q = newQuestion(); exam.questions.push(q); renderList(); changed(); scrollToQ(q.id, true); };
  document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => setTab(b.dataset.tab); });
  $('#btnScenTpl').onclick = templateModal;
  $('#btnAutoQ').onclick = () => bankModal('q', 'auto');
  $('#btnArchQ').onclick = () => bankModal('q', 'arch');
  $('#btnAutoQTop').onclick = () => bankModal('q', 'auto');
  $('#btnArchQTop').onclick = () => bankModal('q', 'arch');
  $('#btnAiQTop').onclick = () => bankModal('q', 'ai');
  $('#btnAutoS').onclick = () => bankModal('s', 'auto');
  $('#btnArchS').onclick = () => bankModal('s', 'arch');
  $('#btnAddScen').onclick = () => {
    snap();
    const last = exam.scenarios[exam.scenarios.length - 1];
    const pts = last && last.questions.length ? last.questions[last.questions.length - 1].points : 5;
    const sc = newScenario(pts); exam.scenarios.push(sc); renderScenarios(); changed(); scrollToEl('s-' + sc.id);
    const el = document.getElementById('s-' + sc.id); if (el) $('.stext', el).focus();
  };
  const addVocab = (n) => {
    snap();
    for (let i = 0; i < n; i++) exam.vocab.items.push(newVocabItem());
    renderVocab(); changed();
    const rows = document.querySelectorAll('#vocabRows .vterm');
    if (rows.length) rows[rows.length - n].focus();
  };
  $('#btnAddVocab').onclick = () => addVocab(1);
  $('#btnVocabImport').onclick = vocabImportModal;
  $('#btnVocabCheck').onclick = vocabCheck;
  $('#btnVocabDedupe').onclick = vocabDedupe;
  $('#btnVocabAllOn').onclick = () => vocabSetAll(true);
  $('#btnUpdate').onclick = runUpdate;
  $('#btnVocabFill').onclick = vocabFillEmpty;
  $('#vcAr').onchange = (e) => vocabSetCol('ar', e.target.checked);
  $('#vcTr').onchange = (e) => vocabSetCol('tr', e.target.checked);
  $('#btnVocabAllOff').onclick = () => vocabSetAll(false);
  $('#btnAddVocab10').onclick = () => addVocab(10);
  $('#btnSelAll').onclick = () => { exam.questions.forEach((q) => selected.add(q.id)); renderList(); };
  $('#qFilter').onchange = (e) => { qFilter = e.target.value; renderList(); };
  $('#btnFilterOff').onclick = () => { qFilter = ''; renderList(); };
  $('#btnSelVis').onclick = () => { selected.clear(); visibleQs().forEach((q) => selected.add(q.id)); renderList(); toast(t('selVisDone', { n: selected.size }), 'ok'); };
  $('#tagSel').onchange = (e) => {
    const v = e.target.value; e.target.value = '';
    if (v === '-') return;
    const qs = exam.questions.filter((q) => selected.has(q.id));
    if (!qs.length) return toast(t('ghostNoSel'), 'warn');
    snap(); qs.forEach((q) => { q.tag = v; }); renderList(); changed();
    toast(t('tagSetDone', { n: qs.length, l: tagName(v) }), 'ok', [{ label: t('undo'), onClick: () => undo() }]);
  };
  $('#btnGhostSel').onclick = () => {
    const qs = exam.questions.filter((q) => selected.has(q.id));
    if (!qs.length) return toast(t('ghostNoSel'), 'warn');
    // seçilenlerin hepsi hayaletse geri getir, değilse hayalet yap
    setGhost(qs, !qs.every((q) => q.ghost));
  };
  $('#btnSelNone').onclick = () => { selected.clear(); renderList(); };
  $('#btnDelSel').onclick = deleteSelected;
  $('#btnShuffleQ').onclick = shuffleQuestions;
  $('#btnShuffleO').onclick = shuffleAllOptions;
  $('#uiLang').onchange = (e) => {
    prefs.uiLang = e.target.value;
    if (prefs.syncLang) prefs.contentLang = e.target.value;
    savePrefs(); renderAll();
  };
  $('#contentLang').onchange = (e) => { prefs.contentLang = e.target.value; savePrefs(); renderAll(); };
  document.addEventListener('keydown', (e) => {
    const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveExam(e.shiftKey); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openExam(); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'p') { e.preventDefault(); outputModal(); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); findOpen(); }
    else if (e.key === 'F3') { e.preventDefault(); if (FIND.bar) findShow(e.shiftKey ? -1 : 1); else findOpen(); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); undo(); }
    else if (e.key === 'Escape') { const m = document.querySelector('.backdrop:last-child .x'); if (m) m.click(); else if (FIND.bar) findClose(false); }
  });
  window.addEventListener('beforeunload', () => { api.writeAutosave({ exam, filePath, dirty }); });
  // Android: geri tuşu açık pencereyi kapatır; uygulama arka plana giderken kayıt hemen yazılır
  window.__back = () => {
    const x = document.querySelector('#modalRoot .backdrop:last-child .x');
    if (x) { x.click(); return true; }
    if (FIND.bar) { findClose(false); return true; }
    return false;
  };
  window.__flush = () => { clearTimeout(saveTimer); api.writeAutosave({ exam, filePath, dirty }); if (syncRec(exam.id).dirty) cloudPush(); };
  window.__resume = () => cloudSoon();
  window.addEventListener('focus', () => { if (CL0.ready && Date.now() - (window.__lastPull || 0) > 20000) { window.__lastPull = Date.now(); cloudSoon(); } });
  setInterval(() => { if (CL0.ready && !document.hidden) cloudPull(); }, 60000);
}

async function init() {
  document.body.classList.toggle('mobile', MOBILE);
  document.documentElement.classList.toggle('mobile', MOBILE);
  try {
    const info = await api.appInfo();
    if (info && info.device) deviceName = info.device;
    APPINFO = info || {};
    if (APPINFO.version) { $('#appVer').textContent = 'v' + APPINFO.version; $('#appVer').title = versionText(); }
    if (APPINFO.canUpdate) { $('#appVer').classList.add('click'); $('#appVer').onclick = runUpdate; }
    if (APPINFO.patchDisabled) toast(t('updDisabled'), 'err', [], 12000);
    if (api.updateStarted) api.updateStarted(); // yeni sürüm sorunsuz açıldı
  } catch { /* yok */ }
  wire();
  const saved = await api.readAutosave();
  if (saved && saved.exam) {
    exam = normalizeExam(saved.exam);
    filePath = saved.filePath || null;
    dirty = !!saved.dirty;
  }
  template = await api.getTemplate();
  renderAll();
  setCloudState(CL0.ready ? 'ok' : 'off');
  if (CL0.ready) cloudSoon();
  renderUpdBtn();
  // açılışta yeni sürüm her zaman denetlenir; varsa bildirim gelir
  window.checkUpdate = checkUpdate;
  setTimeout(() => checkUpdate(false), 3000);
  setTimeout(() => cloudBackup(), 20000);
  setTimeout(() => contactFlush().catch(() => {}), 8000);
}
init();
