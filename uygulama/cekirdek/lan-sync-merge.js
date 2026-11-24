/* FC.lanMerge — Wi-Fi/LAN eşitlemesinin saf birleştirme kuralı (SPEC "Eşitleme kuralı"):
   hiçbir kayıt silinmez, hiçbir kayıt sessizce ezilmez.
     const r = FC.lanMerge.merge(yerel, uzak, {idKey:'id', updatedKey:'updatedAt'});
     r.records   → yazılacak canlı kayıtlar (arşivlenenler dahil, archived:true ile)
     r.conflicts → [{id, kept, lost, keptFrom:'local'|'remote'}]  eski hal çakışma yedeğine yazılır
     r.archived  → [{id, record, deletedAt, from}]                silme → "arşivlendi" (veri korunur)
   Kurallar
   - Bir tarafta olan kayıt eklenir.
   - İki tarafta farklıysa yeni olan (updatedKey) kalır, eskisi conflicts'e; eşitlikte sıralama belirleyicidir (iki cihaz aynı sonuca varır).
   - Silme işareti (deletedKey:true, zamanı deletedAtKey || updatedKey) karşı taraftaki canlı kaydı SİLMEZ: kayıt
     archivedKey:true, archivedAtKey ile korunur. Silmeden sonra düzenlenmiş kayıt canlı kalır.
   - Eski Falcon/Kitaplık hatası (uzak silme yerelde kalıcı silme) burada yoktur. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  function canon(x, skip) {
    if (x === null || typeof x !== 'object') return JSON.stringify(x === undefined ? null : x);
    if (Array.isArray(x)) return '[' + x.map(function (v) { return canon(v); }).join(',') + ']';
    return '{' + Object.keys(x).sort().filter(function (k) { return x[k] !== undefined && (!skip || skip.indexOf(k) < 0); }).map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}';
  }
  function ts(v) { if (v == null || v === '') return 0; if (typeof v === 'number') return v; var n = Date.parse(v); return isNaN(n) ? (+v || 0) : n; }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  function merge(local, remote, opt) {
    opt = opt || {};
    var ID = opt.idKey || 'id', UP = opt.updatedKey || 'updatedAt', DEL = opt.deletedKey || 'deleted', DELAT = opt.deletedAtKey || 'deletedAt',
      ARC = opt.archivedKey || 'archived', ARCAT = opt.archivedAtKey || 'archivedAt';
    var skip = [UP];
    function index(list) { var m = {}, order = []; (list || []).forEach(function (r) { if (!r || r[ID] == null) return; var k = String(r[ID]); if (!(k in m)) order.push(k); m[k] = r; }); return { m: m, order: order }; }
    var L = index(local), R = index(remote);
    var ids = L.order.slice(); R.order.forEach(function (k) { if (!(k in L.m)) ids.push(k); });
    var records = [], conflicts = [], archived = [];
    function dead(r) { return !!(r && r[DEL]); }
    function delTime(r) { return ts(r[DELAT]) || ts(r[UP]); }
    function archive(live, tomb, from) {
      var t = delTime(tomb), rec = copy(live);
      rec[ARC] = true; rec[ARCAT] = typeof tomb[DELAT] === 'string' || typeof tomb[UP] === 'string' ? new Date(t).toISOString() : t;
      if (ts(rec[UP]) < t) rec[UP] = typeof live[UP] === 'string' ? new Date(t).toISOString() : t;
      delete rec[DEL]; delete rec[DELAT];
      records.push(rec); archived.push({ id: String(live[ID]), record: rec, deletedAt: t, from: from });
    }
    ids.forEach(function (id) {
      var x = L.m[id], y = R.m[id];
      if (x && !y) { if (!dead(x)) records.push(x); return; }
      if (y && !x) { if (!dead(y)) records.push(y); return; }
      if (dead(x) && dead(y)) return;
      if (dead(y)) { if (delTime(y) >= ts(x[UP])) archive(x, y, 'remote'); else records.push(x); return; }
      if (dead(x)) { if (delTime(x) >= ts(y[UP])) archive(y, x, 'local'); else records.push(y); return; }
      var cx = canon(x, skip), cy = canon(y, skip);
      var sx = ts(x[UP]), sy = ts(y[UP]);
      if (cx === cy) { records.push(sy > sx ? y : x); return; }
      var localWins = sx > sy || (sx === sy && cx > cy);
      records.push(localWins ? x : y);
      conflicts.push({ id: id, kept: localWins ? x : y, lost: localWins ? y : x, keptFrom: localWins ? 'local' : 'remote' });
    });
    return { records: records, conflicts: conflicts, archived: archived };
  }
  var api = { merge: merge, canon: canon };
  FC.lanMerge = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
