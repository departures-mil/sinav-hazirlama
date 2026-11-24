// SALT OKUNUR KANIT: 1.9.10'un (commit 6c18c09) masaüstü güncelleme denetimi, uygulama/renderer/app.js'ten aynen alındı.
// test/app.test.js bu kodu guncelleme/desktop.json (köprü) ile çalıştırır: eski kurulum ne gösterir?
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
  $('.lbl', b).textContent = updHead ? updHead.version : '';
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
module.exports = { checkUpdate, cmpVer, updNewer, updFits, get updHead() { return updHead; } };
