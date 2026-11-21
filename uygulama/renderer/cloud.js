'use strict';
// Bulut eşitleme (Firebase): e-posta ile giriş (Identity Toolkit REST) ve Firestore REST.
// Firebase SDK gerekmez; masaüstünde ve telefonda aynı kod çalışır.
// Veri düzeni: users/{uid}/exams/{sınavId} (+ parts/{n}), users/{uid}/meta/template, users/{uid}/tplchunks/{dosya~n}
(function () {
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok */ } },
  };
  let cfg = store.get('cloud.cfg');
  let user = store.get('cloud.user');

  const fail = (code, msg) => { const e = new Error(msg || code); e.code = code; return e; };

  /* ---------------- yapılandırma ---------------- */
  // Firebase konsolundaki "firebaseConfig" metni, JSON ya da SINAV1: paylaşım kodu kabul edilir
  function parseConfig(text) {
    const s = String(text || '').trim();
    let o = null;
    if (/^SINAV1:/i.test(s)) {
      try { o = JSON.parse(decodeURIComponent(escape(atob(s.slice(7).trim())))); } catch { o = null; }
    } else {
      const pick = (k) => { const m = new RegExp(`["']?${k}["']?\\s*[:=]\\s*["']([^"']+)["']`).exec(s); return m ? m[1].trim() : ''; };
      o = { apiKey: pick('apiKey'), projectId: pick('projectId') };
    }
    if (!o || !o.apiKey || !o.projectId) throw fail('BAD_CONFIG');
    if (!/^[A-Za-z0-9_\-]{20,}$/.test(o.apiKey) || !/^[a-z0-9][a-z0-9\-]{3,}$/.test(o.projectId)) throw fail('BAD_CONFIG');
    const out = { apiKey: o.apiKey, projectId: o.projectId };
    if (o.emu) out.emu = o.emu; // yalnızca testler için (yerel Firebase emülatörü)
    return out;
  }
  function shareCode(c) {
    const x = c || cfg;
    if (!x) return '';
    return 'SINAV1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ apiKey: x.apiKey, projectId: x.projectId, ...(x.emu ? { emu: x.emu } : {}) }))));
  }
  function setConfig(c) {
    const changedProject = !cfg || !c || cfg.projectId !== c.projectId || cfg.apiKey !== c.apiKey;
    cfg = c;
    store.set('cloud.cfg', c);
    if (changedProject) signOut();
  }

  /* ---------------- adresler ---------------- */
  const authUrl = (p) => (cfg.emu ? `${cfg.emu.auth}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com') + `/v1/${p}?key=${encodeURIComponent(cfg.apiKey)}`;
  const tokenUrl = () => (cfg.emu ? `${cfg.emu.auth}/securetoken.googleapis.com` : 'https://securetoken.googleapis.com') + `/v1/token?key=${encodeURIComponent(cfg.apiKey)}`;
  const dbRoot = () => `projects/${cfg.projectId}/databases/(default)/documents`;
  const fsUrl = (p) => (cfg.emu ? cfg.emu.fs : 'https://firestore.googleapis.com') + `/v1/${p}`;

  async function request(url, opts) {
    let r;
    try { r = await fetch(url, opts); } catch (e) { throw fail('OFFLINE', e.message); }
    const text = await r.text();
    let j = null;
    try { j = text ? JSON.parse(text) : null; } catch { j = null; }
    return { status: r.status, ok: r.ok, j, text };
  }

  /* ---------------- giriş ---------------- */
  function authError(j, status) {
    const msg = (j && j.error && (j.error.message || '')) || ('HTTP ' + status);
    const code = msg.split(/[ :]/)[0];
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) return fail('BAD_API_KEY', msg);
    if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED|PASSWORD_LOGIN_DISABLED/.test(msg)) return fail('AUTH_DISABLED', msg);
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(msg)) return fail('BAD_LOGIN', msg);
    if (/EMAIL_EXISTS/.test(msg)) return fail('EMAIL_EXISTS', msg);
    if (/WEAK_PASSWORD/.test(msg)) return fail('WEAK_PASSWORD', msg);
    if (/INVALID_EMAIL|MISSING_EMAIL/.test(msg)) return fail('BAD_EMAIL', msg);
    if (/TOO_MANY_ATTEMPTS/.test(msg)) return fail('TOO_MANY', msg);
    if (/TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(msg)) return fail('SESSION', msg);
    return fail(code || 'AUTH', msg);
  }
  function keepUser(j, email) {
    user = {
      uid: j.localId || j.user_id, email: email || (user && user.email) || j.email || '',
      idToken: j.idToken || j.id_token, refreshToken: j.refreshToken || j.refresh_token,
      exp: Date.now() + (parseInt(j.expiresIn || j.expires_in, 10) || 3600) * 1000,
    };
    store.set('cloud.user', user);
    return user;
  }
  async function signIn(email, password, create) {
    if (!cfg) throw fail('NO_CONFIG');
    const r = await request(authUrl(create ? 'accounts:signUp' : 'accounts:signInWithPassword'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!r.ok) throw authError(r.j, r.status);
    return keepUser(r.j, email);
  }
  async function resetPassword(email) {
    if (!cfg) throw fail('NO_CONFIG');
    const r = await request(authUrl('accounts:sendOobCode'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    });
    if (!r.ok) throw authError(r.j, r.status);
    return true;
  }
  function signOut() { user = null; store.set('cloud.user', null); }
  async function idToken() {
    if (!cfg || !user) throw fail('NO_USER');
    if (Date.now() < user.exp - 120000) return user.idToken;
    const r = await request(tokenUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(user.refreshToken),
    });
    if (!r.ok) {
      const e = authError(r.j, r.status);
      if (e.code === 'SESSION') signOut();
      throw e;
    }
    keepUser(r.j);
    return user.idToken;
  }

  /* ---------------- Firestore ---------------- */
  const enc = (v) => {
    if (v == null) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    return { stringValue: String(v) };
  };
  const dec = (f) => {
    if (!f) return undefined;
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return parseInt(f.integerValue, 10);
    if ('doubleValue' in f) return f.doubleValue;
    if ('booleanValue' in f) return f.booleanValue;
    return null;
  };
  const fieldsOf = (o) => { const f = {}; Object.keys(o).forEach((k) => { f[k] = enc(o[k]); }); return f; };
  const docOut = (d) => {
    if (!d) return null;
    const o = { _id: d.name.split('/').pop(), _updateTime: d.updateTime };
    Object.keys(d.fields || {}).forEach((k) => { o[k] = dec(d.fields[k]); });
    return o;
  };
  function dbError(r) {
    const msg = (r.j && r.j.error && r.j.error.message) || ('HTTP ' + r.status);
    const st = r.j && r.j.error && r.j.error.status;
    if (r.status === 401 || st === 'UNAUTHENTICATED') return fail('SESSION', msg);
    if (st === 'PERMISSION_DENIED' && /has not been used|is disabled|SERVICE_DISABLED/i.test(msg)) return fail('NO_DB', msg);
    if (st === 'PERMISSION_DENIED') return fail('RULES', msg);
    if (st === 'NOT_FOUND' && /database .*(does not exist|not found)/i.test(msg)) return fail('NO_DB', msg);
    if (st === 'FAILED_PRECONDITION' && /database .*(does not exist|not found)|Datastore Mode|Cloud Datastore/i.test(msg)) return fail('NO_DB', msg);
    return fail(st || 'DB', msg);
  }
  async function db(method, path, body) {
    const tok = await idToken();
    const r = await request(fsUrl(path), {
      method, headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const noDb = r.j && r.j.error && /database .*(does not exist|not found)|has not been used|is disabled/i.test(r.j.error.message || '');
    if (r.status === 404 && method === 'GET' && !noDb) return null;
    if (!r.ok) throw dbError(r);
    return r.j || {};
  }
  const userPath = () => `${dbRoot()}/users/${user.uid}`;
  // Birden çok yazma tek seferde (10 MB sınırına göre gruplanır); dönen: her yazmanın updateTime değeri
  async function commit(writes) {
    const times = [];
    let group = [], size = 0;
    const flush = async () => {
      if (!group.length) return;
      const j = await db('POST', `${dbRoot()}:commit`, { writes: group });
      (j.writeResults || []).forEach((w) => times.push(w.updateTime || j.commitTime));
      group = []; size = 0;
    };
    for (const w of writes) {
      const s = JSON.stringify(w).length;
      if (group.length && (size + s > 8 * 1024 * 1024 || group.length >= 450)) await flush();
      group.push(w); size += s;
    }
    await flush();
    return times;
  }
  const upd = (path, fields) => ({ update: { name: path, fields: fieldsOf(fields) } });
  const del = (path) => ({ delete: path });

  async function listAll(path, mask) {
    const out = [];
    let token = '';
    do {
      const q = [`pageSize=300`, ...(mask || []).map((m) => 'mask.fieldPaths=' + m), ...(token ? ['pageToken=' + encodeURIComponent(token)] : [])].join('&');
      const j = await db('GET', `${path}?${q}`);
      if (!j) break;
      (j.documents || []).forEach((d) => out.push(docOut(d)));
      token = j.nextPageToken || '';
    } while (token);
    return out;
  }

  /* ---------------- sınavlar ---------------- */
  const CHUNK = 300000; // karakter (Arapça metin dahil 1 MB belge sınırının altında kalır)
  function split(str, n) { const a = []; for (let i = 0; i < str.length; i += n) a.push(str.slice(i, i + n)); return a.length ? a : ['']; }

  async function listExams() {
    const docs = await listAll(`${userPath()}/exams`, ['name', 'device', 'updatedAt', 'info', 'deleted']);
    return docs.filter((d) => !d.deleted).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  async function examHead(id) {
    return docOut(await db('GET', `${userPath()}/exams/${id}?mask.fieldPaths=updatedAt&mask.fieldPaths=device&mask.fieldPaths=parts&mask.fieldPaths=name&mask.fieldPaths=deleted`));
  }
  async function getExam(id) {
    const d = docOut(await db('GET', `${userPath()}/exams/${id}`));
    if (!d || d.deleted) return null;
    let data = d.data || '';
    if (d.parts > 0) {
      const parts = await listAll(`${userPath()}/exams/${id}/parts`);
      parts.sort((a, b) => +a._id - +b._id);
      data = parts.slice(0, d.parts).map((p) => p.d || '').join('');
    }
    return { head: d, exam: JSON.parse(data) };
  }
  // expect: son bilinen bulut sürümü (updateTime) ya da null (belge yok olmalı); başka cihaz araya girdiyse CONFLICT
  async function putExam(id, exam, meta, prevParts, expect) {
    const json = JSON.stringify(exam);
    const base = `${userPath()}/exams/${id}`;
    const writes = [];
    let parts = 0;
    if (json.length > CHUNK) {
      const chunks = split(json, CHUNK);
      parts = chunks.length;
      chunks.forEach((c, i) => writes.push(upd(`${base}/parts/${i}`, { d: c })));
    }
    for (let i = parts; i < (prevParts || 0); i++) writes.push(del(`${base}/parts/${i}`));
    const main = upd(base, { ...meta, parts, data: parts ? '' : json, deleted: false });
    if (expect !== undefined) main.currentDocument = expect ? { updateTime: expect } : { exists: false };
    writes.unshift(main); // koşullu yazma ilk grupta olmalı
    let times;
    try { times = await commit(writes); } catch (e) {
      if (/FAILED_PRECONDITION|NOT_FOUND|ALREADY_EXISTS/.test(e.code)) throw fail('CONFLICT', e.message);
      throw e;
    }
    return times[0];
  }
  async function deleteExam(id) {
    const base = `${userPath()}/exams/${id}`;
    const head = await examHead(id);
    const writes = [];
    for (let i = 0; i < ((head && head.parts) || 0); i++) writes.push(del(`${base}/parts/${i}`));
    writes.push(del(base));
    await commit(writes);
  }

  /* ---------------- şablon ---------------- */
  const TCHUNK = 900000;
  async function templateHead() {
    return docOut(await db('GET', `${userPath()}/meta/template`));
  }
  async function putTemplate(raw) {
    const head = await templateHead();
    const old = head && head.files ? JSON.parse(head.files) : [];
    const writes = [];
    const files = [];
    if (raw) {
      Object.keys(raw.files).forEach((name) => {
        const chunks = split(raw.files[name], TCHUNK);
        files.push({ name, parts: chunks.length });
        chunks.forEach((c, i) => writes.push(upd(`${userPath()}/tplchunks/${name}~${i}`, { d: c })));
      });
    }
    old.forEach((f) => {
      const now = files.find((x) => x.name === f.name);
      for (let i = now ? now.parts : 0; i < f.parts; i++) writes.push(del(`${userPath()}/tplchunks/${f.name}~${i}`));
    });
    writes.push(upd(`${userPath()}/meta/template`, raw
      ? { removed: false, stamp: raw.meta.stamp || '', meta: JSON.stringify(raw.meta), files: JSON.stringify(files), updatedAt: Date.now() }
      : { removed: true, stamp: '', meta: '', files: '[]', updatedAt: Date.now() }));
    const times = await commit(writes);
    return times[times.length - 1];
  }
  async function getTemplate(head) {
    const h = head || await templateHead();
    if (!h || h.removed) return null;
    const files = {};
    for (const f of JSON.parse(h.files || '[]')) {
      const parts = [];
      for (let i = 0; i < f.parts; i++) {
        const d = docOut(await db('GET', `${userPath()}/tplchunks/${f.name}~${i}`));
        if (!d) throw fail('DB', 'eksik şablon parçası: ' + f.name);
        parts.push(d.d || '');
      }
      files[f.name] = parts.join('');
    }
    return { meta: JSON.parse(h.meta), files };
  }

  /* ---------------- program güncellemeleri ---------------- */
  // updates/{kanal} (desktop | android): sürüm bilgisi; updates/{kanal}/parts/{sürüm}~{n}: base64 parçalar.
  // Herkes okuyabilir (dosyalar imzalıdır, uygulama imzayı denetler); yalnızca yayıncı hesabı yazabilir.
  // Güncellemeler programa gömülü kaynaktan (update-source.js) okunur; yoksa kullanıcının bulut ayarından
  const updCfg = () => window.SINAV_UPDATE_SRC || cfg;
  async function pubGet(path) {
    const c = updCfg();
    if (!c) throw fail('NO_CONFIG');
    const headers = {};
    const same = cfg && c.projectId === cfg.projectId;
    if (user && same) { try { headers.Authorization = 'Bearer ' + await idToken(); } catch { /* girişsiz de okunur */ } }
    const url = (c.emu ? c.emu.fs : 'https://firestore.googleapis.com') + `/v1/projects/${c.projectId}/databases/(default)/documents/${path}?key=${encodeURIComponent(c.apiKey)}`;
    const r = await request(url, { headers });
    const noDb = r.j && r.j.error && /database .*(does not exist|not found)|has not been used|is disabled/i.test(r.j.error.message || '');
    if (r.status === 404 && !noDb) return null;
    if (!r.ok) throw dbError(r);
    return docOut(r.j);
  }
  // 1.9.0: güncellemeler GitHub'dan gelir (departures-mil/sinav-hazirlama → guncelleme/{kanal}.json + dosya).
  // Firebase yalnızca canlı veri (sınav eşitleme, iletişim) içindir. Paketler Ed25519 ile imzalıdır.
  const GITHUB_RAW = 'https://raw.githubusercontent.com/departures-mil/sinav-hazirlama/main/guncelleme/';
  async function updateHead(channel) {
    let r;
    try { r = await fetch(`${GITHUB_RAW}${channel}.json?t=${Date.now()}`, { cache: 'no-store' }); } catch { throw fail('NETWORK'); }
    if (r.status === 404) return null;
    if (!r.ok) throw fail('NETWORK', 'HTTP ' + r.status);
    return r.json();
  }
  // onProgress(indirilen bayt, toplam bayt, hız bayt/sn)
  async function getUpdate(channel, head, onProgress) {
    let r;
    try { r = await fetch(GITHUB_RAW + head.file, { cache: 'no-store' }); } catch { throw fail('NETWORK'); }
    if (!r.ok) throw fail('NETWORK', 'HTTP ' + r.status);
    const total = +head.size || +r.headers.get('Content-Length') || 0;
    const t0 = Date.now();
    const chunks = [];
    let got = 0;
    const rd = r.body.getReader();
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (onProgress) onProgress(got, Math.max(total, got), got / Math.max((Date.now() - t0) / 1000, 0.05));
    }
    const bytes = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { bytes.set(c, o); o += c.length; }
    let bin = '';
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return btoa(bin);
  }

  /* ---------------- admin iletişim ---------------- */
  // Mesajlar güncelleme projesindeki iletisim/ bölümüne yazılır; kurallar yalnızca yeni kayıt eklemeye izin verir,
  // okuma ve silme yalnızca yöneticinin aktarım hesabına açıktır. Alıcı adres programda değil, yönetici tarafındadır.
  async function sendContact(m) {
    const c = updCfg();
    if (!c) throw fail('NO_CONFIG');
    const url = (c.emu ? c.emu.fs : 'https://firestore.googleapis.com') + `/v1/projects/${c.projectId}/databases/(default)/documents/iletisim?key=${encodeURIComponent(c.apiKey)}`;
    const r = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fieldsOf(m) }) });
    if (!r.ok) throw dbError(r);
    return docOut(r.j);
  }

  window.Cloud = {
    parseConfig, shareCode, setConfig, signIn, signOut, resetPassword,
    get config() { return cfg; },
    get user() { return user; },
    get ready() { return !!(cfg && user); },
    listExams, examHead, getExam, putExam, deleteExam,
    templateHead, putTemplate, getTemplate,
    updateHead, getUpdate, get updateReady() { return true; },
    sendContact,
    store,
  };
})();
