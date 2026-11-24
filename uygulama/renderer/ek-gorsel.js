'use strict';
/* Sınav Hazırlama 1.10.1 — hazır havacılık görselleri (SVG, dilden bağımsız) ve görselli arşiv soruları.
   window.EK_FIG: görsel kütüphanesi (Görsel ekle penceresi). Görselli sorular QBANK_BUILTIN'e eklenir (doğru seçenek ilk sırada). */
(function () {
  const W = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial, Helvetica, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/>${inner}</svg>`;
  const arrowDef = (id, c) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker></defs>`;

  // çok rotorlu araç: kollar + pervaneler
  function multirotor(angles, plus) {
    const cx = 200, cy = 140, R = 92;
    let s = `<g stroke="#333" stroke-width="10" stroke-linecap="round">`;
    angles.forEach((a) => { const r = (a * Math.PI) / 180; s += `<line x1="${cx}" y1="${cy}" x2="${cx + R * Math.cos(r)}" y2="${cy + R * Math.sin(r)}"/>`; });
    s += '</g>';
    angles.forEach((a, i) => {
      const r = (a * Math.PI) / 180, x = cx + R * Math.cos(r), y = cy + R * Math.sin(r);
      const cw = i % 2 === 0;
      s += `<circle cx="${x}" cy="${y}" r="34" fill="#dbe8fb" stroke="#1f5fbf" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="7" fill="#333"/>`;
      s += `<path d="M${x - 20} ${y - 14} A24 24 0 0 ${cw ? 1 : 0} ${x + 20} ${y - 14}" fill="none" stroke="#c0392b" stroke-width="3" marker-end="url(#ar)"/>`;
    });
    s += `<rect x="${cx - 26}" y="${cy - 26}" width="52" height="52" rx="10" fill="#555"/><path d="M${cx} ${cy - 62} l-12 22 h24z" fill="#27ae60"/>`;
    s += `<text x="${cx}" y="18" text-anchor="middle" font-size="15" fill="#27ae60" font-weight="bold">▲ FRONT</text>`;
    void plus;
    return W(400, 280, arrowDef('ar', '#c0392b') + s);
  }
  // Mode 2 kumanda: hangi kol, hangi yön
  function radio(side, axis) {
    const st = (x, on) => `<rect x="${x - 60}" y="70" width="120" height="120" rx="14" fill="#f4f6f9" stroke="#999" stroke-width="2"/>` +
      `<line x1="${x}" y1="80" x2="${x}" y2="180" stroke="#ccc" stroke-width="2"/><line x1="${x - 50}" y1="130" x2="${x + 50}" y2="130" stroke="#ccc" stroke-width="2"/>` +
      `<circle cx="${x}" cy="130" r="20" fill="${on ? '#c0392b' : '#555'}"/>` +
      (on ? (axis === 'v' ? `<line x1="${x + 34}" y1="88" x2="${x + 34}" y2="172" stroke="#c0392b" stroke-width="4" marker-start="url(#ar)" marker-end="url(#ar)"/>` : `<line x1="${x - 46}" y1="98" x2="${x + 46}" y2="98" stroke="#c0392b" stroke-width="4" marker-start="url(#ar)" marker-end="url(#ar)"/>`) : '');
    return W(420, 240, arrowDef('ar', '#c0392b') + `<rect x="20" y="40" width="380" height="180" rx="40" fill="#e8ebf0" stroke="#666" stroke-width="3"/><line x1="160" y1="40" x2="140" y2="8" stroke="#666" stroke-width="5"/><line x1="260" y1="40" x2="280" y2="8" stroke="#666" stroke-width="5"/>` +
      st(120, side === 'L') + st(300, side === 'R') + `<text x="210" y="210" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">MODE 2</text>`);
  }
  // rüzgâr tulumu
  function windsock(level) {
    const ang = level === 'full' ? 0 : level === 'half' ? 35 : 75;
    const segs = [0, 1, 2, 3, 4].map((i) => `<rect x="${60 + i * 44}" y="${-18 + i * 2}" width="44" height="${36 - i * 4}" fill="${i % 2 ? '#fff' : '#e67e22'}" stroke="#a04000" stroke-width="1.5"/>`).join('');
    return W(400, 260, `<line x1="60" y1="250" x2="60" y2="40" stroke="#555" stroke-width="7"/><ellipse cx="60" cy="58" rx="6" ry="20" fill="#888"/>` +
      `<g transform="translate(0 58) rotate(${ang} 60 0)">${segs}</g>`);
  }
  // pist eşiği ve numarası
  function runway(num) {
    let s = `<rect x="110" y="0" width="180" height="300" fill="#444"/><g fill="#fff">`;
    for (let i = 0; i < 8; i++) s += `<rect x="${122 + i * 20}" y="210" width="12" height="70"/>`;
    s += `</g><text x="200" y="185" text-anchor="middle" font-size="74" font-weight="bold" fill="#fff" font-family="Arial Narrow, Arial">${num}</text>`;
    for (let i = 0; i < 3; i++) s += `<rect x="196" y="${10 + i * 45}" width="8" height="28" fill="#fff"/>`;
    return W(400, 300, s + `<text x="20" y="290" font-size="14" fill="#666">N↑</text>`);
  }
  // yapay ufuk: yatış (+ sağ) ve yunuslama
  function attitude(bank, pitch) {
    const p = pitch * 3;
    return W(300, 300, `<defs><clipPath id="c"><circle cx="150" cy="150" r="118"/></clipPath></defs>` +
      `<circle cx="150" cy="150" r="140" fill="#222"/><g clip-path="url(#c)"><g transform="rotate(${-bank} 150 150) translate(0 ${p})"><rect x="-100" y="-200" width="500" height="350" fill="#3b8fd9"/><rect x="-100" y="150" width="500" height="350" fill="#8b5a2b"/><line x1="-100" y1="150" x2="400" y2="150" stroke="#fff" stroke-width="3"/>` +
      [-20, -10, 10, 20].map((d) => `<line x1="${d % 20 ? 128 : 115}" y1="${150 - d * 3}" x2="${d % 20 ? 172 : 185}" y2="${150 - d * 3}" stroke="#fff" stroke-width="2"/>`).join('') + `</g></g>` +
      `<g stroke="#f1c40f" stroke-width="6" stroke-linecap="round"><line x1="85" y1="150" x2="130" y2="150"/><line x1="170" y1="150" x2="215" y2="150"/></g><circle cx="150" cy="150" r="5" fill="#f1c40f"/>` +
      [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map((d) => { const r = ((d - 90) * Math.PI) / 180; return `<line x1="${150 + 128 * Math.cos(r)}" y1="${150 + 128 * Math.sin(r)}" x2="${150 + (d % 30 ? 136 : 140) * Math.cos(r)}" y2="${150 + (d % 30 ? 136 : 140) * Math.sin(r)}" stroke="#fff" stroke-width="3"/>`; }).join('') +
      `<path d="M150 ${150 - 116} l-8 14 h16z" fill="#f39c12" transform="rotate(${-bank} 150 150)"/>`);
  }
  // altimetre: iki ibre (yüzler, binler)
  function altimeter(ft) {
    const h = ((ft % 1000) / 1000) * 360, k = ((ft % 10000) / 10000) * 360;
    let s = `<circle cx="150" cy="150" r="140" fill="#222"/><circle cx="150" cy="150" r="128" fill="#111" stroke="#666" stroke-width="2"/>`;
    for (let i = 0; i < 50; i++) { const r = ((i * 7.2 - 90) * Math.PI) / 180, L = i % 5 ? 8 : 16; s += `<line x1="${150 + 124 * Math.cos(r)}" y1="${150 + 124 * Math.sin(r)}" x2="${150 + (124 - L) * Math.cos(r)}" y2="${150 + (124 - L) * Math.sin(r)}" stroke="#fff" stroke-width="${i % 5 ? 1.5 : 3}"/>`; }
    for (let i = 0; i < 10; i++) { const r = ((i * 36 - 90) * Math.PI) / 180; s += `<text x="${150 + 92 * Math.cos(r)}" y="${150 + 92 * Math.sin(r) + 9}" text-anchor="middle" font-size="26" font-weight="bold" fill="#fff">${i}</text>`; }
    s += `<text x="150" y="200" text-anchor="middle" font-size="12" fill="#ccc">ALT · FT</text><text x="150" y="112" text-anchor="middle" font-size="11" fill="#ccc">100 FEET</text>`;
    s += `<g transform="rotate(${k} 150 150)"><path d="M150 150 L142 150 L150 82 L158 150z" fill="#fff"/></g>`;
    s += `<g transform="rotate(${h} 150 150)"><path d="M150 150 L145 150 L150 38 L155 150z" fill="#fff"/></g><circle cx="150" cy="150" r="9" fill="#888"/>`;
    return W(300, 300, s);
  }
  // yön göstergesi (pusula gülü): uçağın burnu yukarı, kart döner
  function heading(hdg) {
    let s = `<circle cx="150" cy="150" r="140" fill="#222"/><g transform="rotate(${-hdg} 150 150)"><circle cx="150" cy="150" r="126" fill="#111"/>`;
    for (let i = 0; i < 72; i++) { const r = ((i * 5 - 90) * Math.PI) / 180, L = i % 2 ? 8 : 15; s += `<line x1="${150 + 124 * Math.cos(r)}" y1="${150 + 124 * Math.sin(r)}" x2="${150 + (124 - L) * Math.cos(r)}" y2="${150 + (124 - L) * Math.sin(r)}" stroke="#fff" stroke-width="2"/>`; }
    const lab = { 0: 'N', 3: '3', 6: '6', 9: 'E', 12: '12', 15: '15', 18: 'S', 21: '21', 24: '24', 27: 'W', 30: '30', 33: '33' };
    Object.keys(lab).forEach((d) => { s += `<text x="150" y="58" text-anchor="middle" font-size="${/[NESW]/.test(lab[d]) ? 26 : 20}" font-weight="bold" fill="${lab[d] === 'N' ? '#f39c12' : '#fff'}" transform="rotate(${d * 10} 150 150)">${lab[d]}</text>`; });
    s += `</g><path d="M150 18 l-9 18 h18z" fill="#f39c12"/><path d="M150 112 L150 196 M118 150 L182 150 M136 186 L164 186" stroke="#f39c12" stroke-width="7" stroke-linecap="round"/>`;
    return W(300, 300, s);
  }
  // kule ışık işaretleri
  function lightgun(color, flash, target) {
    const c = color === 'green' ? '#27ae60' : color === 'red' ? '#e74c3c' : '#f4f4f4';
    const beam = flash ? [0, 1, 2, 3, 4].map((i) => `<rect x="${150 + i * 44}" y="${116 - i * 7}" width="26" height="${18 + i * 6}" rx="4" fill="${c}" opacity=".85"/>`).join('') : `<path d="M150 125 L370 85 L370 165z" fill="${c}" opacity=".75"/>`;
    const tgt = target === 'air' ? `<g transform="translate(372 72) rotate(-12)"><path d="M0 18 L46 14 L54 18 L46 22 L0 18z M20 17 L10 0 h8 l14 16z M20 19 L10 36 h8 l14-16z M2 17 L-4 8 h5 l6 9z" fill="#2c3e50"/></g>` : `<rect x="360" y="190" width="56" height="16" rx="3" fill="#2c3e50"/><circle cx="372" cy="210" r="6" fill="#111"/><circle cx="404" cy="210" r="6" fill="#111"/><path d="M380 190 l12-18 h8 l-6 18z" fill="#2c3e50"/>`;
    return W(440, 240, `<rect x="0" y="216" width="440" height="24" fill="#9db37a"/><rect x="60" y="120" width="60" height="96" fill="#7f8c8d"/><path d="M50 120 h80 l-10-34 h-60z" fill="#5d6d7e"/><rect x="66" y="90" width="48" height="24" fill="#aed6f1"/>` +
      `<circle cx="140" cy="125" r="12" fill="${c}" stroke="#333" stroke-width="2"/>` + beam + tgt + (flash ? `<text x="270" y="64" text-anchor="middle" font-size="18" fill="#555">✦ ✦ ✦</text>` : ''));
  }
  // bulutlar
  function cloud(kind) {
    let s = `<rect width="400" height="260" fill="#d6eaf8"/>`;
    if (kind === 'cb') {
      s += `<path d="M60 240 C40 200 70 170 100 175 C95 120 150 95 175 120 C180 70 240 60 255 110 C290 90 330 120 315 170 C350 175 360 220 340 240z" fill="#7f8c8d"/>`;
      s += `<path d="M120 120 C150 40 250 40 280 110 C260 60 150 60 120 120z" fill="#95a5a6"/><path d="M80 60 C160 20 260 20 340 60 L300 72 C240 50 170 50 110 72z" fill="#bdc3c7"/>`;
      s += `<path d="M160 240 l-14 18 l10 0 l-8 16" stroke="#f1c40f" stroke-width="4" fill="none"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<line x1="${110 + i * 25}" y1="242" x2="${104 + i * 25}" y2="258" stroke="#5d6d7e" stroke-width="2"/>`).join('');
    } else if (kind === 'ci') {
      s += [0, 1, 2, 3, 4].map((i) => `<path d="M${30 + i * 70} ${50 + (i % 2) * 30} q40 -30 90 -8" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>`).join('');
    } else if (kind === 'cu') {
      s += `<path d="M80 200 C60 170 90 140 120 150 C120 100 180 90 200 125 C220 90 290 100 285 150 C320 145 340 190 310 200z" fill="#fff" stroke="#ccd" stroke-width="2"/>`;
    } else {
      s += `<rect x="0" y="80" width="400" height="70" fill="#aab7b8"/><rect x="0" y="70" width="400" height="20" fill="#bfc9ca"/>`;
    }
    return W(400, 260, s + `<rect x="0" y="236" width="400" height="24" fill="#7d9b57"/>`);
  }
  // LiPo batarya etiketi
  function lipo(cells, mah, c) {
    return W(420, 200, `<rect x="20" y="40" width="360" height="130" rx="12" fill="#2c3e50"/><rect x="380" y="70" width="20" height="16" fill="#c0392b"/><rect x="380" y="120" width="20" height="16" fill="#111"/>` +
      `<text x="200" y="92" text-anchor="middle" font-size="32" font-weight="bold" fill="#f1c40f">${cells}S  ${(cells * 3.7).toFixed(1)}V</text>` +
      `<text x="200" y="135" text-anchor="middle" font-size="26" fill="#fff">${mah} mAh  ${c}C</text><text x="200" y="160" text-anchor="middle" font-size="14" fill="#bbb">LiPo</text>`);
  }
  // dört kuvvet: soru işaretli ok
  function forces(q) {
    const ar = (x1, y1, x2, y2, lab, col) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="6" marker-end="url(#a${col.slice(1)})"/><text x="${x2 + (x2 > x1 ? 10 : x2 < x1 ? -10 : 0)}" y="${y2 + (y2 > y1 ? 26 : y2 < y1 ? -10 : 6)}" text-anchor="${x2 > x1 ? 'start' : x2 < x1 ? 'end' : 'middle'}" font-size="22" font-weight="bold" fill="${col}">${lab}</text>`;
    const cols = { up: '#27ae60', down: '#8e44ad', fwd: '#2980b9', back: '#c0392b' };
    const defs = Object.values(cols).map((c) => arrowDef('a' + c.slice(1), c).replace('<defs>', '').replace('</defs>', '')).join('');
    const lab = (k) => (k === q ? '?' : { up: 'L', down: 'W', fwd: 'T', back: 'D' }[k]);
    return W(440, 300, `<defs>${defs}</defs><path d="M120 150 L300 150 L330 140 L300 160 L120 160z" fill="#7f8c8d"/><path d="M190 152 L250 152 L215 100 L195 100z M190 158 L250 158 L215 210 L195 210z" fill="#95a5a6"/><path d="M120 150 L105 125 L120 125 L135 150z" fill="#7f8c8d"/>` +
      ar(220, 120, 220, 40, lab('up'), cols.up) + ar(220, 185, 220, 265, lab('down'), cols.down) + ar(335, 150, 420, 150, lab('fwd'), cols.fwd) + ar(110, 155, 25, 155, lab('back'), cols.back));
  }
  // kanat kesiti: hücum açısı α
  function airfoil() {
    const a = 15, r = 80, px = 120, py = 120, rad = (a * Math.PI) / 180;
    return W(440, 220, arrowDef('ar', '#2980b9') +
      `<line x1="10" y1="${py}" x2="430" y2="${py}" stroke="#2980b9" stroke-width="1.5" stroke-dasharray="3 5"/>` +
      `<g transform="rotate(${a} ${px} ${py})"><path d="M${px} ${py} C${px + 30} ${py - 40} ${px + 170} ${py - 42} ${px + 270} ${py - 2} C${px + 170} ${py + 8} ${px + 50} ${py + 12} ${px} ${py}z" fill="#bdc3c7" stroke="#2c3e50" stroke-width="3"/>` +
      `<line x1="${px - 95}" y1="${py}" x2="${px + 290}" y2="${py}" stroke="#2c3e50" stroke-dasharray="8 6" stroke-width="2"/></g>` +
      `<path d="M${px - r} ${py} A${r} ${r} 0 0 1 ${px - r * Math.cos(rad)} ${py - r * Math.sin(rad)}" stroke="#c0392b" stroke-width="3" fill="none"/>` +
      `<text x="${px - r - 30}" y="${py - 4}" font-size="26" font-weight="bold" fill="#c0392b">α</text>` +
      `<line x1="20" y1="190" x2="170" y2="190" stroke="#2980b9" stroke-width="4" marker-end="url(#ar)"/><text x="180" y="196" font-size="18" fill="#2980b9">V∞</text>`);
  }

  const F = (id, ad, kw, svg) => ({ id, ad: { tr: ad[0], en: ad[1], ar: ad[2] }, kw, svg });
  const FIG = [
    F('quadx', ['Dört rotorlu (X tipi) İHA', 'Quadcopter (X frame)', 'طائرة رباعية المراوح (إطار X)'], ['quad', 'dört rotor', 'çok rotor', 'multirotor', 'pervane', 'motor'], multirotor([-135, -45, 45, 135])),
    F('quadplus', ['Dört rotorlu (+ tipi) İHA', 'Quadcopter (+ frame)', 'طائرة رباعية المراوح (إطار +)'], ['quad', 'dört rotor', '+ tipi', 'artı'], multirotor([-90, 0, 90, 180], true)),
    F('hexa', ['Altı rotorlu İHA', 'Hexacopter', 'طائرة سداسية المراوح'], ['hexa', 'altı rotor', 'heksa', 'çok rotor'], multirotor([-90, -30, 30, 90, 150, 210])),
    F('octo', ['Sekiz rotorlu İHA', 'Octocopter', 'طائرة ثمانية المراوح'], ['okto', 'octo', 'sekiz rotor'], multirotor([-90, -45, 0, 45, 90, 135, 180, 225])),
    F('m2thr', ['Mode 2 kumanda — gaz kolu', 'Mode 2 transmitter — throttle stick', 'جهاز تحكم Mode 2 — عصا الخانق'], ['mode 2', 'kumanda', 'gaz', 'throttle', 'kol', 'stick'], radio('L', 'v')),
    F('m2yaw', ['Mode 2 kumanda — sol kol yatay (yaw)', 'Mode 2 transmitter — left stick horizontal (yaw)', 'جهاز تحكم Mode 2 — العصا اليسرى أفقياً (الانعراج)'], ['mode 2', 'yaw', 'sapma', 'rudder', 'kumanda'], radio('L', 'h')),
    F('m2pitch', ['Mode 2 kumanda — sağ kol dikey (pitch)', 'Mode 2 transmitter — right stick vertical (pitch)', 'جهاز تحكم Mode 2 — العصا اليمنى عمودياً (الانحدار)'], ['mode 2', 'pitch', 'yunuslama', 'elevator', 'kumanda'], radio('R', 'v')),
    F('m2roll', ['Mode 2 kumanda — sağ kol yatay (roll)', 'Mode 2 transmitter — right stick horizontal (roll)', 'جهاز تحكم Mode 2 — العصا اليمنى أفقياً (الدوران)'], ['mode 2', 'roll', 'yatış', 'aileron', 'kumanda'], radio('R', 'h')),
    F('sockfull', ['Rüzgâr tulumu — tam yatay', 'Windsock — fully extended', 'كم الريح — ممتد بالكامل'], ['rüzgar tulumu', 'rüzgâr tulumu', 'windsock', 'rüzgar'], windsock('full')),
    F('sockhalf', ['Rüzgâr tulumu — yarı açık', 'Windsock — partly extended', 'كم الريح — ممتد جزئياً'], ['rüzgar tulumu', 'rüzgâr tulumu', 'windsock', 'rüzgar'], windsock('half')),
    F('rwy09', ['Pist numarası 09', 'Runway designator 09', 'رقم المدرج 09'], ['pist', 'runway', 'eşik', 'threshold'], runway('09')),
    F('rwy27', ['Pist numarası 27', 'Runway designator 27', 'رقم المدرج 27'], ['pist', 'runway', 'eşik'], runway('27')),
    F('ai30r', ['Yapay ufuk — sağa 30° yatış', 'Attitude indicator — 30° right bank', 'مؤشر الوضع — ميل 30° إلى اليمين'], ['yapay ufuk', 'attitude', 'yatış', 'bank', 'ufuk'], attitude(30, 0)),
    F('ai10up', ['Yapay ufuk — burun 10° yukarı', 'Attitude indicator — 10° nose up', 'مؤشر الوضع — الأنف 10° للأعلى'], ['yapay ufuk', 'attitude', 'yunuslama', 'pitch'], attitude(0, 10)),
    F('alt1500', ['Altimetre — 1.500 ft', 'Altimeter — 1,500 ft', 'مقياس الارتفاع — 1,500 قدم'], ['altimetre', 'altimeter', 'irtifa', 'yükseklik', 'feet'], altimeter(1500)),
    F('alt3200', ['Altimetre — 3.200 ft', 'Altimeter — 3,200 ft', 'مقياس الارتفاع — 3,200 قدم'], ['altimetre', 'altimeter', 'irtifa'], altimeter(3200)),
    F('hdg270', ['Yön göstergesi — 270°', 'Heading indicator — 270°', 'مؤشر الاتجاه — 270°'], ['yön', 'heading', 'pusula', 'compass', 'baş'], heading(270)),
    F('hdg090', ['Yön göstergesi — 090°', 'Heading indicator — 090°', 'مؤشر الاتجاه — 090°'], ['yön', 'heading', 'pusula', 'compass'], heading(90)),
    F('lgGreenAir', ['Kule ışığı — sabit yeşil (havadaki uçağa)', 'Light signal — steady green (aircraft in flight)', 'إشارة ضوئية — أخضر ثابت (طائرة في الجو)'], ['ışık', 'light', 'kule', 'tower', 'yeşil', 'işaret'], lightgun('green', false, 'air')),
    F('lgRedFlashAir', ['Kule ışığı — yanıp sönen kırmızı (havadaki uçağa)', 'Light signal — flashing red (aircraft in flight)', 'إشارة ضوئية — أحمر وامض (طائرة في الجو)'], ['ışık', 'light', 'kule', 'kırmızı', 'işaret'], lightgun('red', true, 'air')),
    F('lgRedAir', ['Kule ışığı — sabit kırmızı (havadaki uçağa)', 'Light signal — steady red (aircraft in flight)', 'إشارة ضوئية — أحمر ثابت (طائرة في الجو)'], ['ışık', 'light', 'kule', 'kırmızı'], lightgun('red', false, 'air')),
    F('lgGreenFlashGnd', ['Kule ışığı — yanıp sönen yeşil (yerdeki uçağa)', 'Light signal — flashing green (aircraft on the ground)', 'إشارة ضوئية — أخضر وامض (طائرة على الأرض)'], ['ışık', 'light', 'kule', 'taksi', 'yeşil'], lightgun('green', true, 'gnd')),
    F('cb', ['Kümülonimbus (Cb) bulutu', 'Cumulonimbus (Cb) cloud', 'سحابة ركامية مزنية (Cb)'], ['bulut', 'cloud', 'kümülonimbus', 'cumulonimbus', 'oraj', 'fırtına', 'cb'], cloud('cb')),
    F('cu', ['Kümülüs bulutu', 'Cumulus cloud', 'سحابة ركامية'], ['bulut', 'cloud', 'kümülüs', 'cumulus'], cloud('cu')),
    F('ci', ['Sirrus bulutu', 'Cirrus cloud', 'سحابة سمحاقية'], ['bulut', 'cloud', 'sirrus', 'cirrus'], cloud('ci')),
    F('st', ['Stratus bulutu', 'Stratus cloud', 'سحابة طبقية'], ['bulut', 'cloud', 'stratus', 'sis'], cloud('st')),
    F('lipo3s', ['LiPo batarya 3S 2200 mAh', 'LiPo battery 3S 2200 mAh', 'بطارية LiPo 3S 2200 mAh'], ['lipo', 'batarya', 'battery', 'hücre', 'cell', 'mah'], lipo(3, 2200, 25)),
    F('lipo6s', ['LiPo batarya 6S 5000 mAh', 'LiPo battery 6S 5000 mAh', 'بطارية LiPo 6S 5000 mAh'], ['lipo', 'batarya', 'battery', 'hücre'], lipo(6, 5000, 30)),
    F('fdrag', ['Dört kuvvet — sürükleme (?)', 'Four forces — drag (?)', 'القوى الأربع — السحب (?)'], ['kuvvet', 'force', 'sürükleme', 'drag', 'taşıma', 'lift', 'itki', 'thrust'], forces('back')),
    F('flift', ['Dört kuvvet — taşıma (?)', 'Four forces — lift (?)', 'القوى الأربع — الرفع (?)'], ['kuvvet', 'force', 'taşıma', 'lift'], forces('up')),
    F('aoa', ['Kanat kesiti — hücum açısı (α)', 'Airfoil — angle of attack (α)', 'مقطع الجناح — زاوية الهجوم (α)'], ['hücum açısı', 'angle of attack', 'kanat', 'airfoil', 'profil', 'stol', 'stall'], airfoil()),
  ];
  window.EK_FIG = FIG;

  /* ---------- görselli arşiv soruları (QBANK_BUILTIN) ---------- */
  const B = window.QBANK_BUILTIN; if (!B) return;
  const svgData = (svg) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  const fig = (id) => svgData(FIG.find((f) => f.id === id).svg);
  const M = (tr, en, ar) => ({ tr, en, ar });
  let n = 2000;
  const Q = (lvl, figId, konu, q, opts) => B.questions.push({ id: 'f' + (++n), lvl, topic: 'uav', konu, img: fig(figId), text: M(...q), options: opts.map((o) => M(...o)), correct: 0 });
  const K = { gen: 'İHA / Havacılık > Genel bilgi', kum: 'İHA / Havacılık > Kumanda', met: 'İHA / Havacılık > Meteoroloji', alet: 'İHA / Havacılık > Uçuş aletleri', kural: 'İHA / Havacılık > Hava kuralları', aero: 'İHA / Havacılık > Aerodinamik', bat: 'İHA / Havacılık > Batarya' };

  Q(1, 'hexa', K.gen, ['Şekildeki çok rotorlu araç hangi türdendir?', 'What type of multirotor is shown in the figure?', 'ما نوع الطائرة متعددة المراوح في الشكل؟'],
    [['Altı rotorlu (heksakopter)', 'Hexacopter', 'سداسية المراوح (هيكساكوبتر)'], ['Dört rotorlu (kuadkopter)', 'Quadcopter', 'رباعية المراوح (كوادكوبتر)'], ['Sekiz rotorlu (oktokopter)', 'Octocopter', 'ثمانية المراوح (أوكتوكوبتر)'], ['Üç rotorlu (trikopter)', 'Tricopter', 'ثلاثية المراوح (ترايكوبتر)'], ['Sabit kanatlı', 'Fixed-wing', 'ثابتة الجناح']]);
  Q(1, 'quadx', K.gen, ['Şekilde komşu pervanelerin dönüş yönleri neden birbirinin tersidir?', 'In the figure, why do neighbouring propellers turn in opposite directions?', 'في الشكل، لماذا تدور المراوح المتجاورة في اتجاهين متعاكسين؟'],
    [['Tork etkilerini dengeleyip istenmeyen sapmayı (yaw) önlemek için', 'To cancel torque and prevent unwanted yaw', 'لموازنة عزم الدوران ومنع الانعراج غير المرغوب'], ['Daha az gürültü için', 'To reduce noise', 'لتقليل الضوضاء'], ['Bataryayı daha hızlı şarj etmek için', 'To charge the battery faster', 'لشحن البطارية أسرع'], ['GPS sinyalini güçlendirmek için', 'To boost the GPS signal', 'لتقوية إشارة GPS'], ['Kameranın görüşünü açmak için', 'To clear the camera view', 'لتوسيع رؤية الكاميرا']]);
  Q(1, 'm2thr', K.kum, ['Şekildeki Mode 2 kumandada kırmızıyla gösterilen kol hareketi neyi kontrol eder?', 'On the Mode 2 transmitter shown, what does the stick movement marked in red control?', 'في جهاز التحكم Mode 2 الموضح، ماذا تتحكم حركة العصا المحددة بالأحمر؟'],
    [['Gaz (irtifa / motor devri)', 'Throttle (altitude / motor speed)', 'الخانق (الارتفاع / سرعة المحركات)'], ['Yatış (roll)', 'Roll', 'الدوران (roll)'], ['Yunuslama (pitch)', 'Pitch', 'الانحدار (pitch)'], ['Sapma (yaw)', 'Yaw', 'الانعراج (yaw)'], ['Kamera açısı', 'Camera tilt', 'زاوية الكاميرا']]);
  Q(2, 'm2roll', K.kum, ['Şekildeki Mode 2 kumandada kırmızıyla gösterilen hareket hangi eksende kontrol sağlar?', 'On the Mode 2 transmitter shown, which axis does the movement marked in red control?', 'في جهاز التحكم Mode 2 الموضح، أي محور تتحكم فيه الحركة المحددة بالأحمر؟'],
    [['Yatış (roll) — boylamsal eksen', 'Roll — longitudinal axis', 'الدوران (roll) — المحور الطولي'], ['Yunuslama (pitch) — yanal eksen', 'Pitch — lateral axis', 'الانحدار (pitch) — المحور العرضي'], ['Sapma (yaw) — dikey eksen', 'Yaw — vertical axis', 'الانعراج (yaw) — المحور العمودي'], ['Gaz', 'Throttle', 'الخانق'], ['Uçuş modu', 'Flight mode', 'وضع الطيران']]);
  Q(2, 'm2yaw', K.kum, ['Şekildeki Mode 2 kumandada kırmızıyla gösterilen kol hareketiyle araç ne yapar?', 'What does the aircraft do with the stick movement marked in red on this Mode 2 transmitter?', 'ماذا تفعل الطائرة بحركة العصا المحددة بالأحمر في جهاز التحكم Mode 2 هذا؟'],
    [['Kendi dikey ekseni etrafında döner (yaw)', 'Rotates about its vertical axis (yaw)', 'تدور حول محورها العمودي (yaw)'], ['Yükselir ya da alçalır', 'Climbs or descends', 'تصعد أو تهبط'], ['İleri ya da geri gider', 'Moves forward or back', 'تتحرك للأمام أو للخلف'], ['Sağa ya da sola kayar', 'Slides left or right', 'تنزلق يميناً أو يساراً'], ['Eve döner (RTH)', 'Returns home (RTH)', 'تعود إلى نقطة الإقلاع (RTH)']]);
  Q(2, 'sockfull', K.met, ['Şekildeki rüzgâr tulumu tamamen yatay ise rüzgâr hızı yaklaşık ne kadardır?', 'If the windsock is fully extended as in the figure, what is the approximate wind speed?', 'إذا كان كم الريح ممتداً بالكامل كما في الشكل، فما سرعة الرياح التقريبية؟'],
    [['15 kt veya üzeri', '15 kt or more', '15 عقدة أو أكثر'], ['Yaklaşık 3 kt', 'About 3 kt', 'نحو 3 عقد'], ['Yaklaşık 6 kt', 'About 6 kt', 'نحو 6 عقد'], ['Rüzgâr yok', 'No wind', 'لا توجد رياح'], ['Yaklaşık 9 kt', 'About 9 kt', 'نحو 9 عقد']]);
  Q(1, 'sockfull', K.met, ['Şekilde rüzgâr hangi yönden esmektedir?', 'In the figure, from which direction is the wind blowing?', 'في الشكل، من أي اتجاه تهب الرياح؟'],
    [['Direğin bulunduğu taraftan (tulumun ağız tarafından) uç tarafa doğru', 'From the mast side (the mouth of the sock) towards its tail', 'من جهة السارية (فتحة الكم) نحو طرفه'], ['Tulumun uç tarafından direğe doğru', 'From the tail of the sock towards the mast', 'من طرف الكم نحو السارية'], ['Yukarıdan aşağıya', 'From above', 'من الأعلى إلى الأسفل'], ['Rüzgâr yönü anlaşılamaz', 'The direction cannot be told', 'لا يمكن معرفة الاتجاه'], ['Her yönden eşit', 'Equally from all directions', 'من كل الاتجاهات بالتساوي']]);
  Q(2, 'rwy09', K.kural, ['Şekildeki pist numarasına göre pistin manyetik yönü yaklaşık kaç derecedir?', 'According to the runway designator in the figure, what is the approximate magnetic heading of the runway?', 'وفقاً لرقم المدرج في الشكل، ما الاتجاه المغناطيسي التقريبي للمدرج؟'],
    [['090°', '090°', '090°'], ['009°', '009°', '009°'], ['900°', '900°', '900°'], ['270°', '270°', '270°'], ['180°', '180°', '180°']]);
  Q(3, 'rwy27', K.kural, ['Şekildeki pistin diğer ucundaki numara hangisidir?', 'What is the designator at the other end of the runway shown?', 'ما الرقم في الطرف الآخر للمدرج الموضح؟'],
    [['09', '09', '09'], ['27', '27', '27'], ['18', '18', '18'], ['36', '36', '36'], ['72', '72', '72']]);
  Q(2, 'ai30r', K.alet, ['Şekildeki yapay ufuk göstergesi hava aracının hangi durumda olduğunu gösterir?', 'What attitude does the attitude indicator in the figure show?', 'ما الوضع الذي يُظهره مؤشر الوضع في الشكل؟'],
    [['Sağa yaklaşık 30° yatış, burun düz', 'About 30° right bank, level pitch', 'ميل نحو 30° إلى اليمين، والأنف مستوٍ'], ['Sola yaklaşık 30° yatış', 'About 30° left bank', 'ميل نحو 30° إلى اليسار'], ['Burun 30° yukarı', '30° nose up', 'الأنف 30° للأعلى'], ['Düz ve ufki uçuş', 'Straight and level flight', 'طيران مستقيم ومستوٍ'], ['Burun 30° aşağı', '30° nose down', 'الأنف 30° للأسفل']]);
  Q(2, 'ai10up', K.alet, ['Şekildeki yapay ufuk göstergesine göre hava aracı ne yapmaktadır?', 'According to the attitude indicator shown, what is the aircraft doing?', 'وفقاً لمؤشر الوضع الموضح، ماذا تفعل الطائرة؟'],
    [['Burun yukarı (yaklaşık 10°), kanatlar düz', 'Nose up (about 10°), wings level', 'الأنف للأعلى (نحو 10°) والأجنحة مستوية'], ['Burun aşağı, kanatlar düz', 'Nose down, wings level', 'الأنف للأسفل والأجنحة مستوية'], ['Sağa yatış', 'Banking right', 'ميل إلى اليمين'], ['Sola yatış', 'Banking left', 'ميل إلى اليسار'], ['Ters uçuş', 'Inverted flight', 'طيران مقلوب']]);
  Q(2, 'alt1500', K.alet, ['Şekildeki altimetre kaç feet göstermektedir?', 'What altitude does the altimeter in the figure show?', 'ما الارتفاع الذي يُظهره مقياس الارتفاع في الشكل؟'],
    [['1.500 ft', '1,500 ft', '1,500 قدم'], ['5.100 ft', '5,100 ft', '5,100 قدم'], ['15.000 ft', '15,000 ft', '15,000 قدم'], ['150 ft', '150 ft', '150 قدماً'], ['1.050 ft', '1,050 ft', '1,050 قدماً']]);
  Q(3, 'alt3200', K.alet, ['Şekildeki altimetre kaç feet göstermektedir?', 'What altitude does the altimeter in the figure show?', 'ما الارتفاع الذي يُظهره مقياس الارتفاع في الشكل؟'],
    [['3.200 ft', '3,200 ft', '3,200 قدم'], ['2.300 ft', '2,300 ft', '2,300 قدم'], ['320 ft', '320 ft', '320 قدماً'], ['32.000 ft', '32,000 ft', '32,000 قدم'], ['3.020 ft', '3,020 ft', '3,020 قدماً']]);
  Q(1, 'hdg270', K.alet, ['Şekildeki yön göstergesine göre hava aracı hangi yöne uçmaktadır?', 'According to the heading indicator shown, in which direction is the aircraft flying?', 'وفقاً لمؤشر الاتجاه الموضح، في أي اتجاه تطير الطائرة؟'],
    [['Batı (270°)', 'West (270°)', 'الغرب (270°)'], ['Doğu (090°)', 'East (090°)', 'الشرق (090°)'], ['Kuzey (360°)', 'North (360°)', 'الشمال (360°)'], ['Güney (180°)', 'South (180°)', 'الجنوب (180°)'], ['Kuzeybatı (315°)', 'Northwest (315°)', 'الشمال الغربي (315°)']]);
  Q(2, 'lgGreenAir', K.kural, ['Kuleden havadaki hava aracına şekildeki gibi sabit yeşil ışık verilirse anlamı nedir?', 'What does a steady green light from the tower to an aircraft in flight, as shown, mean?', 'ماذا يعني الضوء الأخضر الثابت من البرج لطائرة في الجو، كما في الشكل؟'],
    [['İniş izni verildi', 'Cleared to land', 'مسموح بالهبوط'], ['Meydana dönün, iniş için hazırlanın', 'Return for landing', 'عد للهبوط'], ['Meydan emniyetli değil, inmeyin', 'Airport unsafe, do not land', 'المطار غير آمن، لا تهبط'], ['Diğer trafiğe yol verin, tura devam edin', 'Give way and continue circling', 'أفسح الطريق واستمر في الدوران'], ['Pistten çıkın', 'Exit the runway', 'غادر المدرج']]);
  Q(3, 'lgRedFlashAir', K.kural, ['Kuleden havadaki hava aracına şekildeki gibi yanıp sönen kırmızı ışık verilirse anlamı nedir?', 'What does a flashing red light from the tower to an aircraft in flight, as shown, mean?', 'ماذا يعني الضوء الأحمر الوامض من البرج لطائرة في الجو، كما في الشكل؟'],
    [['Meydan emniyetli değil, inmeyin', 'Airport unsafe, do not land', 'المطار غير آمن، لا تهبط'], ['İniş izni verildi', 'Cleared to land', 'مسموح بالهبوط'], ['Diğer trafiğe yol verin, tura devam edin', 'Give way and continue circling', 'أفسح الطريق واستمر في الدوران'], ['Meydana dönün', 'Return for landing', 'عد للهبوط'], ['Taksi izni verildi', 'Cleared to taxi', 'مسموح بالتدرج']]);
  Q(3, 'lgRedAir', K.kural, ['Kuleden havadaki hava aracına şekildeki gibi sabit kırmızı ışık verilirse anlamı nedir?', 'What does a steady red light from the tower to an aircraft in flight, as shown, mean?', 'ماذا يعني الضوء الأحمر الثابت من البرج لطائرة في الجو، كما في الشكل؟'],
    [['Diğer hava araçlarına yol verin ve tura devam edin', 'Give way to other aircraft and continue circling', 'أفسح الطريق للطائرات الأخرى واستمر في الدوران'], ['İniş izni verildi', 'Cleared to land', 'مسموح بالهبوط'], ['Meydan emniyetli değil, inmeyin', 'Airport unsafe, do not land', 'المطار غير آمن، لا تهبط'], ['Meydana dönün', 'Return for landing', 'عد للهبوط'], ['Acil iniş yapın', 'Make an emergency landing', 'قم بهبوط اضطراري']]);
  Q(3, 'lgGreenFlashGnd', K.kural, ['Kuleden yerdeki hava aracına şekildeki gibi yanıp sönen yeşil ışık verilirse anlamı nedir?', 'What does a flashing green light from the tower to an aircraft on the ground, as shown, mean?', 'ماذا يعني الضوء الأخضر الوامض من البرج لطائرة على الأرض، كما في الشكل؟'],
    [['Taksi izni verildi', 'Cleared to taxi', 'مسموح بالتدرج'], ['Kalkış izni verildi', 'Cleared for take-off', 'مسموح بالإقلاع'], ['Durun', 'Stop', 'توقف'], ['Pistten çıkın', 'Taxi clear of the runway', 'غادر المدرج'], ['Park yerine dönün', 'Return to the starting point', 'عد إلى نقطة البداية']]);
  Q(1, 'cb', K.met, ['Şekildeki örs biçimli, şimşek ve sağanak getiren bulut hangisidir?', 'Which cloud is shown, with an anvil top, lightning and showers?', 'ما السحابة الموضحة ذات القمة السندانية والبرق والزخات؟'],
    [['Kümülonimbus (Cb)', 'Cumulonimbus (Cb)', 'ركامية مزنية (Cb)'], ['Sirrus (Ci)', 'Cirrus (Ci)', 'سمحاقية (Ci)'], ['Stratus (St)', 'Stratus (St)', 'طبقية (St)'], ['Altokümülüs (Ac)', 'Altocumulus (Ac)', 'ركامية متوسطة (Ac)'], ['Nimbostratus (Ns)', 'Nimbostratus (Ns)', 'طبقية مزنية (Ns)']]);
  Q(2, 'cb', K.met, ['Şekildeki buluta yakın İHA uçuşu neden tehlikelidir?', 'Why is flying a UAV near the cloud shown dangerous?', 'لماذا يُعد طيران الطائرة المسيّرة قرب السحابة الموضحة خطراً؟'],
    [['Şiddetli türbülans, ani rüzgâr (wind shear), dolu ve şimşek riski vardır', 'Severe turbulence, wind shear, hail and lightning', 'اضطراب شديد وقص رياح وبَرَد وبرق'], ['Görüş her zaman çok iyidir', 'Visibility is always excellent', 'الرؤية ممتازة دائماً'], ['Hava her zaman sakindir', 'The air is always calm', 'الهواء هادئ دائماً'], ['GPS sinyali güçlenir', 'GPS signal becomes stronger', 'تقوى إشارة GPS'], ['Batarya daha uzun dayanır', 'The battery lasts longer', 'تدوم البطارية مدة أطول']]);
  Q(2, 'ci', K.met, ['Şekildeki ince, tüy görünümlü yüksek bulut hangisidir?', 'Which thin, wispy high-level cloud is shown?', 'ما السحابة العالية الرقيقة الريشية الموضحة؟'],
    [['Sirrus (Ci)', 'Cirrus (Ci)', 'سمحاقية (Ci)'], ['Kümülüs (Cu)', 'Cumulus (Cu)', 'ركامية (Cu)'], ['Stratus (St)', 'Stratus (St)', 'طبقية (St)'], ['Kümülonimbus (Cb)', 'Cumulonimbus (Cb)', 'ركامية مزنية (Cb)'], ['Nimbostratus (Ns)', 'Nimbostratus (Ns)', 'طبقية مزنية (Ns)']]);
  Q(1, 'lipo3s', K.bat, ['Şekildeki bataryada kaç hücre seri bağlıdır?', 'How many cells are connected in series in the battery shown?', 'كم خلية موصولة على التوالي في البطارية الموضحة؟'],
    [['3', '3', '3'], ['2', '2', '2'], ['4', '4', '4'], ['22', '22', '22'], ['25', '25', '25']]);
  Q(2, 'lipo3s', K.bat, ['Şekildeki batarya 25C ise sürekli olarak en fazla kaç amper akım verebilir?', 'If the battery shown is rated 25C, what is the maximum continuous current?', 'إذا كانت البطارية الموضحة بتصنيف 25C، فما أقصى تيار مستمر؟'],
    [['55 A', '55 A', '55 أمبير'], ['25 A', '25 A', '25 أمبير'], ['2,2 A', '2.2 A', '2.2 أمبير'], ['110 A', '110 A', '110 أمبير'], ['11,1 A', '11.1 A', '11.1 أمبير']]);
  Q(3, 'lipo6s', K.bat, ['Şekildeki 6S bataryanın tam dolu gerilimi yaklaşık kaç volttur?', 'What is the approximate fully charged voltage of the 6S battery shown?', 'ما الجهد التقريبي للبطارية 6S الموضحة عند الشحن الكامل؟'],
    [['25,2 V', '25.2 V', '25.2 فولت'], ['22,2 V', '22.2 V', '22.2 فولت'], ['18,0 V', '18.0 V', '18.0 فولت'], ['30,0 V', '30.0 V', '30.0 فولت'], ['12,6 V', '12.6 V', '12.6 فولت']]);
  Q(1, 'fdrag', K.aero, ['Şekilde "?" ile gösterilen, hava aracının ileri hareketine karşı koyan kuvvet hangisidir?', 'In the figure, which force marked "?" opposes the forward motion?', 'في الشكل، ما القوة المشار إليها بـ «?» التي تعاكس الحركة إلى الأمام؟'],
    [['Sürükleme (drag)', 'Drag', 'قوة السحب'], ['Taşıma (lift)', 'Lift', 'قوة الرفع'], ['İtki (thrust)', 'Thrust', 'قوة الدفع'], ['Ağırlık (weight)', 'Weight', 'الوزن'], ['Tork', 'Torque', 'عزم الدوران']]);
  Q(1, 'flift', K.aero, ['Şekilde "?" ile gösterilen kuvvet hangisidir?', 'Which force is marked "?" in the figure?', 'ما القوة المشار إليها بـ «?» في الشكل؟'],
    [['Taşıma (lift)', 'Lift', 'قوة الرفع'], ['Ağırlık (weight)', 'Weight', 'الوزن'], ['Sürükleme (drag)', 'Drag', 'قوة السحب'], ['İtki (thrust)', 'Thrust', 'قوة الدفع'], ['Merkezkaç kuvveti', 'Centrifugal force', 'القوة الطاردة المركزية']]);
  Q(2, 'aoa', K.aero, ['Şekilde α ile gösterilen, kanat veteri ile bağıl rüzgâr arasındaki açı nedir?', 'What is the angle α between the chord line and the relative wind in the figure?', 'ما الزاوية α بين خط الوتر والريح النسبية في الشكل؟'],
    [['Hücum açısı', 'Angle of attack', 'زاوية الهجوم'], ['Dihedral açısı', 'Dihedral angle', 'زاوية ثنائية السطح'], ['Ok açısı (sweep)', 'Sweep angle', 'زاوية الاكتساح'], ['Yatış açısı', 'Bank angle', 'زاوية الميل'], ['Süzülme açısı', 'Glide angle', 'زاوية الانزلاق']]);
  Q(3, 'aoa', K.aero, ['Şekildeki α açısı kritik değeri aşarsa ne olur?', 'What happens if the angle α shown exceeds its critical value?', 'ماذا يحدث إذا تجاوزت الزاوية α الموضحة قيمتها الحرجة؟'],
    [['Hava akımı kanattan ayrılır ve stol (perdövites) oluşur', 'The airflow separates and the wing stalls', 'ينفصل تدفق الهواء ويحدث انهيار هوائي (stall)'], ['Taşıma sürekli artar', 'Lift keeps increasing', 'يزداد الرفع باستمرار'], ['Sürükleme sıfırlanır', 'Drag becomes zero', 'ينعدم السحب'], ['Hız kendiliğinden artar', 'Speed increases by itself', 'تزداد السرعة تلقائياً'], ['Motor daha az güç harcar', 'The motor uses less power', 'يستهلك المحرك طاقة أقل']]);
  // yerleşik arşiv sürümü: görselli sorular eklendi
  if (String(B.v) < '2026.11.24') B.v = '2026.11.24';
})();
