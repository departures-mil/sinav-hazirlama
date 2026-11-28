/* Küçük ustar yazıcı / açıcı (sıkıştırmasız). Yerel zeka paketleri GitHub sürümünde tek .tar dosyası olarak durur,
   uygulama indirip kendi klasörüne açar — Windows'ta ek araç gerekmez. */
'use strict';
const fs = require('fs');
const path = require('path');

function hdr(name, size, type) {
  const b = Buffer.alloc(512);
  let prefix = '';
  if (Buffer.byteLength(name) > 100) { // ustar: önek (155) + ad (100)
    const i = name.lastIndexOf('/', 154);
    if (i <= 0 || Buffer.byteLength(name.slice(i + 1)) > 100) throw new Error('tar: ad çok uzun: ' + name);
    prefix = name.slice(0, i); name = name.slice(i + 1);
  }
  b.write(name, 0, 100, 'utf8');
  b.write((type === '5' ? '0000755' : '0000644') + '\0', 100, 'ascii');
  b.write('0000000\0', 108, 'ascii'); b.write('0000000\0', 116, 'ascii');
  b.write(size.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
  b.write('00000000000\0', 136, 'ascii'); // sabit zaman: aynı içerik → aynı bayt
  b.write('        ', 148, 'ascii');
  b.write(type, 156, 'ascii');
  b.write('ustar\0', 257, 'ascii'); b.write('00', 263, 'ascii');
  b.write(prefix, 345, 155, 'utf8');
  let sum = 0; for (let i = 0; i < 512; i++) sum += b[i];
  b.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
  return b;
}

/** Klasörü .tar dosyasına yazar (sıralı, kararlı). */
function pack(dir, outFile) {
  const fd = fs.openSync(outFile, 'w');
  const walk = (rel) => {
    const abs = path.join(dir, rel);
    for (const n of fs.readdirSync(abs).sort()) {
      const r = rel ? rel + '/' + n : n, a = path.join(dir, r), st = fs.statSync(a);
      if (st.isDirectory()) { fs.writeSync(fd, hdr(r + '/', 0, '5')); walk(r); }
      else if (st.isFile()) {
        fs.writeSync(fd, hdr(r, st.size, '0'));
        const data = fs.readFileSync(a); fs.writeSync(fd, data);
        const padn = (512 - (st.size % 512)) % 512; if (padn) fs.writeSync(fd, Buffer.alloc(padn));
      }
    }
  };
  walk('');
  fs.writeSync(fd, Buffer.alloc(1024)); fs.closeSync(fd);
}

/** .tar dosyasını hedef klasöre açar (akış hâlinde, büyük dosyalar belleğe alınmaz). Klasör dışına yazmaz. */
function extract(tarFile, dest) {
  const fd = fs.openSync(tarFile, 'r'), h = Buffer.alloc(512), root = path.resolve(dest);
  let pos = 0; const total = fs.fstatSync(fd).size;
  try {
    while (pos + 512 <= total) {
      fs.readSync(fd, h, 0, 512, pos); pos += 512;
      if (h.every((x) => x === 0)) break;
      const str = (o, l) => { const s = h.subarray(o, o + l); const z = s.indexOf(0); return s.subarray(0, z < 0 ? l : z).toString('utf8'); };
      let name = str(0, 100); const prefix = str(345, 155); if (prefix) name = prefix + '/' + name;
      const size = parseInt(str(124, 12).trim() || '0', 8), type = String.fromCharCode(h[156] || 48);
      const out = path.resolve(root, name);
      if (out !== root && !out.startsWith(root + path.sep)) throw new Error('tar: geçersiz yol ' + name);
      if (type === '5') fs.mkdirSync(out, { recursive: true });
      else if (type === '0' || type === '\0') {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        const w = fs.openSync(out, 'w'), buf = Buffer.alloc(1 << 20); let left = size, p = pos;
        while (left > 0) { const n = fs.readSync(fd, buf, 0, Math.min(buf.length, left), p); if (n <= 0) throw new Error('tar: eksik dosya'); fs.writeSync(w, buf, 0, n); left -= n; p += n; }
        fs.closeSync(w);
      }
      pos += Math.ceil(size / 512) * 512;
    }
  } finally { fs.closeSync(fd); }
}

module.exports = { pack, extract };
