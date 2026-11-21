'use strict';
// TXT/DOCX dosyalarını düz metne çevirir (Word otomatik numaralandırmasını korur).
const JSZip = require('jszip');

function decodeText(buf) {
  const b = Buffer.from(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.slice(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.slice(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, '');
  } catch {
    // Türkçe Windows (ANSI) / Arapça Windows kodlamaları
    const tr = new TextDecoder('windows-1254').decode(b);
    const ar = new TextDecoder('windows-1256').decode(b);
    const arabicChars = (ar.match(/[؀-ۿ]/g) || []).length;
    return arabicChars > ar.length * 0.2 ? ar : tr;
  }
}

function xmlText(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function parseNumbering(xml) {
  const abstract = {}; // abstractId -> {ilvl: {fmt, start, text}}
  const nums = {}; // numId -> abstractId
  if (!xml) return { abstract, nums };
  const aRe = /<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g;
  let m;
  while ((m = aRe.exec(xml))) {
    const lv = {};
    const lRe = /<w:lvl\b[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g;
    let l;
    while ((l = lRe.exec(m[2]))) {
      const fmt = (l[2].match(/<w:numFmt\b[^>]*w:val="([^"]+)"/) || [, 'decimal'])[1];
      const start = parseInt((l[2].match(/<w:start\b[^>]*w:val="(\d+)"/) || [, '1'])[1], 10);
      const text = (l[2].match(/<w:lvlText\b[^>]*w:val="([^"]*)"/) || [, ''])[1];
      lv[l[1]] = { fmt, start, text };
    }
    abstract[m[1]] = lv;
  }
  const nRe = /<w:num\b[^>]*w:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g;
  while ((m = nRe.exec(xml))) {
    const a = (m[2].match(/<w:abstractNumId\b[^>]*w:val="(\d+)"/) || [])[1];
    nums[m[1]] = a;
  }
  return { abstract, nums };
}

function parseStyleNum(xml) {
  const map = {};
  if (!xml) return map;
  const re = /<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g;
  let m;
  while ((m = re.exec(xml))) {
    const np = m[2].match(/<w:numPr>([\s\S]*?)<\/w:numPr>/);
    if (np) {
      const numId = (np[1].match(/<w:numId\b[^>]*w:val="(\d+)"/) || [])[1];
      const ilvl = (np[1].match(/<w:ilvl\b[^>]*w:val="(\d+)"/) || [, '0'])[1];
      if (numId) map[m[1]] = { numId, ilvl };
    }
  }
  return map;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

async function docxToText(buf) {
  const zip = await JSZip.loadAsync(buf);
  const doc = await zip.file('word/document.xml').async('string');
  const numXml = zip.file('word/numbering.xml') ? await zip.file('word/numbering.xml').async('string') : '';
  const stylesXml = zip.file('word/styles.xml') ? await zip.file('word/styles.xml').async('string') : '';
  const numbering = parseNumbering(numXml);
  const styleNum = parseStyleNum(stylesXml);

  const counters = {}; // key -> count
  let letterCount = 0;
  const lines = [];
  const body = doc.slice(doc.indexOf('<w:body'));
  const pRe = /<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g;
  let m;
  while ((m = pRe.exec(body))) {
    const inner = m[1] || '';
    // metin
    let text = '';
    const tRe = /<w:t\b[^>]*>([^<]*)<\/w:t>|<w:tab\/>|<w:br\b[^>]*\/>|<w:cr\/>/g;
    let t;
    while ((t = tRe.exec(inner))) {
      if (t[1] !== undefined) text += xmlText(t[1]);
      else if (t[0].startsWith('<w:tab')) text += '\t';
      else text += '\n';
    }
    const highlighted = /<w:highlight\b/.test(inner) || /<w:shd\b[^>]*w:fill="(?!auto|FFFFFF|ffffff)[0-9A-Fa-f]{6}"/.test(inner.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, ''));

    // numaralandırma
    let numId = null, ilvl = '0';
    const np = inner.match(/<w:numPr>([\s\S]*?)<\/w:numPr>/);
    if (np) {
      numId = (np[1].match(/<w:numId\b[^>]*w:val="(\d+)"/) || [])[1] || null;
      ilvl = (np[1].match(/<w:ilvl\b[^>]*w:val="(\d+)"/) || [, '0'])[1];
    } else {
      const st = (inner.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/) || [])[1];
      if (st && styleNum[st]) ({ numId, ilvl } = styleNum[st]);
    }
    let prefix = '';
    if (numId && numId !== '0' && numbering.nums[numId] !== undefined) {
      const absId = numbering.nums[numId];
      const lvl = (numbering.abstract[absId] || {})[ilvl] || { fmt: 'decimal', start: 1 };
      const key = absId + ':' + ilvl;
      if (/decimal|arabic/i.test(lvl.fmt)) {
        counters[key] = (counters[key] === undefined ? lvl.start : counters[key] + 1);
        // alt seviyeleri sıfırla
        Object.keys(counters).forEach((k) => { const [a, l] = k.split(':'); if (a === absId && +l > +ilvl) delete counters[k]; });
        prefix = counters[key] + '. ';
        letterCount = 0;
      } else if (/letter/i.test(lvl.fmt)) {
        const L = LETTERS[letterCount % 26];
        letterCount++;
        prefix = (lvl.fmt === 'lowerLetter' ? L.toLowerCase() : L) + ') ';
      }
    } else if (/^\s*(soru\s*)?\d{1,3}\s*[.)\-:]/i.test(text)) {
      letterCount = 0;
    }
    let line = prefix + text;
    if (highlighted && /^\s*[A-Ea-e]\s*[).\-:]/.test(line)) line = '*' + line.trim();
    lines.push(line);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = { docxToText, decodeText };
