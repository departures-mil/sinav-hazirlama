/* Yerel zeka iş parçacığı (worker_threads). Ana süreç kaynak metinleri workerData ile verir (asar içinden okunur),
   çalışma zamanı (onnxruntime-node, transformers, tesseract.js) ve modeller kullanıcı veri klasöründeki paketlerden yüklenir.
   Mesaj: { id, op: 'ocr' | 'translate' | 'status' | 'warm', args } → { id, ok, result | error } */
'use strict';
const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const Module = require('module');
const vm = require('vm');

const D = workerData || {};
const packDir = D.packDir;
function load(src, name) { const m = { exports: {} }; vm.runInThisContext(Module.wrap(src), { filename: name })(m.exports, require, m, name, path.dirname(name)); return m.exports; }
const FCOCR = load(D.sources.ocr, 'fc-ocr.js');
const FCMT = load(D.sources.mt, 'fc-mt.js');
const rtRequire = Module.createRequire(path.join(packDir, 'runtime', 'yukleyici.js'));
const plat = process.platform;

let ort = null;
function getOrt() { if (!ort) ort = rtRequire('onnxruntime-node'); return ort; }
function providers() { return plat === 'win32' && D.gpu !== false ? ['dml', 'cpu'] : ['cpu']; }

/* ---------- OCR ---------- */
let ocrP = null, tessP = null;
function bmp(c) { // RGBA → 24 bit BMP (tesseract.js Node'da doğrudan okur)
  const w = c.width, h = c.height, row = Math.ceil(w * 3 / 4) * 4, size = 54 + row * h, b = Buffer.alloc(size);
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((h - 1 - y) * w + x) * 4, d = 54 + y * row + x * 3; b[d] = c.data[s + 2]; b[d + 1] = c.data[s + 1]; b[d + 2] = c.data[s]; }
  return b;
}
function padRGBA(c, p) {
  const W = c.width + 2 * p, H = c.height + 2 * p, o = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y = 0; y < c.height; y++) o.set(c.data.subarray(y * c.width * 4, (y + 1) * c.width * 4), ((y + p) * W + p) * 4);
  return { data: o, width: W, height: H };
}
async function tesseract() {
  if (!tessP) tessP = (async () => {
    const T = rtRequire('tesseract.js');
    const w = await T.createWorker(['tur', 'eng'], 1, { langPath: path.join(packDir, 'ocr', 'tessdata'), gzip: true, cacheMethod: 'none' });
    await w.setParameters({ tessedit_pageseg_mode: '7', preserve_interword_spaces: '1' });
    return w;
  })();
  tessP.catch(() => { tessP = null; });
  return tessP;
}
async function getOcr(quality) {
  const key = quality === 'hizli' ? 'mobile' : 'server';
  if (!ocrP || ocrP.key !== key) {
    const dir = path.join(packDir, 'ocr'), rd = (f) => fs.readFileSync(path.join(dir, f));
    const det = fs.existsSync(path.join(dir, `det-${key}.onnx`)) ? `det-${key}.onnx` : 'det-mobile.onnx';
    const p = (async () => {
      const ortm = getOrt(); let lastErr;
      for (const ep of [providers(), ['cpu']]) {
        try {
          return await FCOCR.create({
            ort: ortm, det: rd(det), sessionOptions: { executionProviders: ep },
            rec: { latin: { model: rd('rec-latin.onnx'), dict: rd('dict-latin.txt').toString('utf8') }, arabic: { model: rd('rec-arabic.onnx'), dict: rd('dict-arabic.txt').toString('utf8') } },
            latinEngine: fs.existsSync(path.join(dir, 'tessdata')) ? async (c) => {
              const w = await tesseract(); const { data } = await w.recognize(bmp(padRGBA(c, 12)));
              return { text: String(data.text || '').trim(), score: (data.confidence || 0) / 100 };
            } : null,
          });
        } catch (e) { lastErr = e; }
      }
      throw lastErr;
    })();
    p.key = key; ocrP = p; p.catch(() => { if (ocrP === p) ocrP = null; });
  }
  return ocrP;
}

/* ---------- TranslateGemma (llama.cpp) ---------- */
const { pathToFileURL } = require('url');
function llmPath() {
  const d = path.join(packDir, 'llm'); if (!fs.existsSync(d)) return null;
  const f = fs.readdirSync(d).find((n) => /\.gguf$/i.test(n)); return f ? path.join(d, f) : null;
}
let llmP = null, llmQ = Promise.resolve();
function llm() {
  const file = llmPath(); if (!file) return null;
  const name = path.basename(file).replace(/\.gguf$/i, '');
  const load = () => {
    if (!llmP) llmP = (async () => {
      const L = await import(pathToFileURL(rtRequire.resolve('node-llama-cpp')).href);
      const gpu = D.gpu === false ? false : 'auto';
      let llama; try { llama = await L.getLlama({ gpu, build: 'never', logLevel: 'error', progressLogs: false }); } catch (e) { llama = await L.getLlama({ gpu: false, build: 'never', logLevel: 'error', progressLogs: false }); }
      const model = await llama.loadModel({ modelPath: file, gpuLayers: gpu === false ? 0 : 'auto' });
      const ctx = await model.createContext({ contextSize: 8192, sequences: 1 });
      return { L, llama, model, ctx };
    })();
    llmP.catch(() => { llmP = null; });
    return llmP;
  };
  return {
    name,
    async complete(prompt, o) { // sırayla: tek dizi
      const run = llmQ.then(async () => {
        const { L, model, ctx } = await load();
        const seq = ctx.getSequence();
        try {
          const c = new L.LlamaCompletion({ contextSequence: seq });
          return await c.generateCompletion(model.tokenize(prompt, true), { maxTokens: o.maxTokens, temperature: 0, customStopTriggers: ['<end_of_turn>'] });
        } finally { seq.dispose(); }
      });
      llmQ = run.catch(() => {});
      return run;
    },
    info: async () => { const { llama } = await load(); return { gpu: llama.gpu }; },
  };
}

/* ---------- çeviri ---------- */
let mt = null;
function getMt() {
  if (!mt) {
    const T = rtRequire('@huggingface/transformers');
    mt = FCMT.create({ transformers: T, llm: D.llm === false ? null : llm(), modelDir: path.join(packDir, 'mt'), modelId: D.mtModel || 'nllb-200-distilled-600M', dtype: D.mtDtype || 'fp32',
      devices: plat === 'win32' && D.gpu !== false ? ['dml', 'cpu'] : ['cpu'], ollama: D.ollama !== false, fetch: globalThis.fetch });
  }
  return mt;
}

const ops = {
  async ocr(a) {
    const ocr = await getOcr(a.quality);
    const img = { data: new Uint8ClampedArray(a.data.buffer, a.data.byteOffset, a.data.byteLength), width: a.width, height: a.height };
    const r = await ocr.recognize(img, { langs: a.langs || ['tr', 'en', 'ar'] });
    return { text: r.text, lines: r.lines.map((l) => ({ text: l.text, rtl: l.rtl })), items: r.items.map((i) => ({ text: i.text, score: +i.score.toFixed(3), script: i.script, box: i.box.map((p) => [Math.round(p[0]), Math.round(p[1])]) })), ms: r.ms };
  },
  async translate(a) { return getMt().translate(a.text, a.from, a.to, { memory: a.memory, ollama: a.ollama, llm: a.llm, domain: a.domain }); },
  async warm(a) { if (a && a.ocr) await getOcr(a.quality); if (a && a.mt) await getMt().warm(); return true; },
  async status() { return { ocr: !!ocrP, mt: mt ? mt.status() : null }; },
};

parentPort.on('message', async (m) => {
  try { parentPort.postMessage({ id: m.id, ok: true, result: await ops[m.op](m.args || {}) }); }
  catch (e) { parentPort.postMessage({ id: m.id, ok: false, error: String(e && e.message || e) }); }
});
