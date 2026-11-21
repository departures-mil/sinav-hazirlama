'use strict';
// Yazım denetimi istemcisi: sözlükler gerektiğinde yüklenir, denetim Web Worker'da yapılır, sonuçlar bellekte tutulur.
(function () {
  let worker = null, seq = 0, broken = false;
  const pend = new Map();
  const loading = {};
  const ready = {};
  const cache = { en: new Map(), ar: new Map(), tr: new Map() };
  const norm = { en: (w) => w.toLowerCase(), tr: (w) => w.toLocaleLowerCase('tr'), ar: (w) => w.replace(/[ً-ْٰـ]/g, '').replace(/ی/g, 'ي').replace(/ک/g, 'ك') };

  function call(msg) {
    if (!worker && !broken) {
      try {
        worker = new Worker('spell-worker.js');
        worker.onmessage = (e) => { const p = pend.get(e.data.id); if (!p) return; pend.delete(e.data.id); if (e.data.ok) p.res(e.data.res); else p.rej(new Error(e.data.err)); };
        worker.onerror = (e) => { broken = true; pend.forEach((p) => p.rej(new Error(e.message || 'worker'))); pend.clear(); };
      } catch (e) { broken = true; }
    }
    if (broken) return Promise.reject(new Error('worker'));
    const id = ++seq;
    return new Promise((res, rej) => { pend.set(id, { res, rej }); worker.postMessage({ ...msg, id }); });
  }
  function ensure(lang) {
    if (!loading[lang]) {
      loading[lang] = (async () => {
        const data = await window.api.readDict(lang);
        await call({ cmd: 'load', lang, data });
        ready[lang] = true;
      })();
      loading[lang].catch(() => { delete loading[lang]; });
    }
    return loading[lang];
  }
  // texts: dizi; sonuç önbelleğe yazılır (yoksayılan kelimeler peek sırasında süzülür)
  async function check(lang, texts) {
    await ensure(lang);
    const todo = texts.filter((x) => !cache[lang].has(x));
    for (let i = 0; i < todo.length; i += 200) {
      const part = todo.slice(i, i + 200);
      const res = await call({ cmd: 'check', lang, texts: part, ignore: [] });
      part.forEach((x, k) => cache[lang].set(x, res[k]));
    }
  }
  function peek(lang, text, ignore) {
    const r = cache[lang].get(text);
    if (r === undefined || !ignore || !ignore.length) return r;
    const ig = new Set(ignore);
    return r.filter((b) => !ig.has(norm[lang](b.w)));
  }
  // kelimelerin sıklık sırası (küçük = yaygın, sözlükte yoksa 1e9)
  async function rank(lang, words) { await ensure(lang); return call({ cmd: 'rank', lang, texts: words }); }
  window.Spell = { check, peek, rank, ready: (l) => !!ready[l], ensure };
})();
