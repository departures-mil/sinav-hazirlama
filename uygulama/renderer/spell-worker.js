'use strict';
/* global SpellCore */
importScripts('lib/nspell.js', 'spell-core.js');
self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.cmd === 'load') { SpellCore.load(m.lang, m.data); postMessage({ id: m.id, ok: true }); }
    else if (m.cmd === 'rank') postMessage({ id: m.id, ok: true, res: m.texts.map((t) => SpellCore.rank(m.lang, t)) });
    else if (m.cmd === 'check') postMessage({ id: m.id, ok: true, res: m.texts.map((t) => SpellCore.check(m.lang, t, m.ignore)) });
  } catch (err) { postMessage({ id: m.id, ok: false, err: String(err && err.message || err) }); }
};
