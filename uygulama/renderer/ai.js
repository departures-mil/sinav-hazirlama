'use strict';
// 1.9.4 — Yapay zeka: danışman sohbeti, soru üretimi, çeviri.
// Kullanıcı KENDİ anahtarını girer (Gemini / OpenAI / Anthropic / OpenRouter / Groq); yöneticinin kotası harcanmaz.
// İstekler window.fetch ile yapılır: kullanim.js sayar, Ayarlar > Kullanım Limitleri'nde görünür.
// İnternet yokken: çevrimdışı danışman (yerleşik arşiv + sözlükte arama) devreye girer.
(function () {
  Object.assign(window.I18N, {
    aiTitle: ['🤖 Yapay Zeka', '🤖 Artificial Intelligence', '🤖 الذكاء الاصطناعي'],
    aiAdvisor: ['🤖 Danışman', '🤖 Advisor', '🤖 المستشار'],
    aiProvider: ['Sağlayıcı', 'Provider', 'المزوّد'],
    aiKey: ['API anahtarı', 'API key', 'مفتاح API'],
    aiModel: ['Model', 'Model', 'النموذج'],
    aiKeyHelp: ['Anahtar yalnız bu bilgisayarda saklanır. Gemini anahtarı ücretsiz alınabilir: aistudio.google.com → Get API key. Boş bırakırsanız yapay zeka özellikleri (danışman, soru üretme, yapay zeka çevirisi) kapalı kalır; çevrimdışı danışman ve sözlük yine çalışır.', 'The key is stored only on this computer. A free Gemini key: aistudio.google.com → Get API key. If left empty, AI features (advisor, question generation, AI translation) stay off; the offline advisor and dictionary still work.', 'يُحفظ المفتاح على هذا الجهاز فقط. مفتاح Gemini مجاني من aistudio.google.com → Get API key. إذا تُرك فارغاً تبقى ميزات الذكاء الاصطناعي (المستشار، توليد الأسئلة، الترجمة) متوقفة؛ ويبقى المستشار غير المتصل والقاموس يعملان.'],
    aiTest: ['Bağlantıyı dene', 'Test connection', 'اختبار الاتصال'],
    aiOk: ['✅ Bağlantı başarılı', '✅ Connection OK', '✅ الاتصال ناجح'],
    aiFail: ['❌ Bağlantı başarısız: {e}', '❌ Connection failed: {e}', '❌ فشل الاتصال: {e}'],
    aiNoKey: ['Yapay zeka anahtarı girilmemiş. Ayarlar > Yapay Zeka bölümünden kendi anahtarınızı girin.', 'No AI key set. Enter your own key under Settings > Artificial Intelligence.', 'لم يُدخل مفتاح للذكاء الاصطناعي. أدخل مفتاحك من الإعدادات > الذكاء الاصطناعي.'],
    aiOffline: ['İnternet yok: çevrimdışı danışman kullanılıyor (yerleşik arşiv ve sözlükten yanıt).', 'No internet: using the offline advisor (answers from the built-in archive and dictionary).', 'لا يوجد إنترنت: يُستخدم المستشار غير المتصل (إجابات من الأرشيف والقاموس المدمجين).'],
    aiUseTr: ['Çevirilerde yapay zekayı kullan (havacılık terimlerine sadık, en kaliteli)', 'Use AI for translations (faithful to aviation terminology, highest quality)', 'استخدام الذكاء الاصطناعي في الترجمة (وفيّ لمصطلحات الطيران، أعلى جودة)'],
    aiAsk: ['Sorunuzu yazın… (Enter: gönder, Shift+Enter: yeni satır)', 'Type your question… (Enter: send, Shift+Enter: new line)', 'اكتب سؤالك… (Enter: إرسال، Shift+Enter: سطر جديد)'],
    aiSend: ['Gönder', 'Send', 'إرسال'],
    aiClear: ['Sohbeti temizle', 'Clear chat', 'مسح المحادثة'],
    aiThinking: ['Yanıt hazırlanıyor…', 'Preparing the answer…', 'جارٍ إعداد الإجابة…'],
    aiToQ: ['➕ Bu yanıttan soru üret', '➕ Make questions from this answer', '➕ توليد أسئلة من هذه الإجابة'],
    aiInsertVocab: ['Kelime listesine ekle', 'Add to word list', 'إضافة إلى قائمة الكلمات'],
    aiHello: ['Merhaba! Ben eğitim danışmanınızım. İHA/havacılık, İngilizce öğretimi, sınav hazırlama ve bu programın kullanımı hakkında her şeyi sorabilirsiniz. Türkçe, İngilizce ya da Arapça yazabilirsiniz.', 'Hello! I am your training advisor. Ask me anything about UAVs/aviation, English teaching, exam design or using this program. You can write in Turkish, English or Arabic.', 'مرحباً! أنا مستشارك التدريبي. اسألني عن الطائرات المسيّرة/الطيران، تدريس الإنجليزية، إعداد الاختبارات أو استخدام هذا البرنامج. يمكنك الكتابة بالتركية أو الإنجليزية أو العربية.'],
    aiOffAns: ['(Çevrimdışı) Arşivde ve sözlükte bulduklarım:', '(Offline) What I found in the archive and dictionary:', '(غير متصل) ما وجدته في الأرشيف والقاموس:'],
    aiOffNone: ['(Çevrimdışı) Bu konuda yerleşik arşivde bir şey bulamadım. İnternet gelince yapay zeka yanıtlayacaktır.', '(Offline) Nothing found in the built-in archive for this. The AI will answer when the internet is back.', '(غير متصل) لم أجد شيئاً في الأرشيف المدمج. سيجيب الذكاء الاصطناعي عند عودة الإنترنت.'],
    // soru üretimi
    bkTabAi: ['🤖 Yapay zeka', '🤖 AI', '🤖 الذكاء الاصطناعي'],
    aiSubject: ['Konu / içerik', 'Subject / content', 'الموضوع / المحتوى'],
    aiSubjectPh: ['Örn: LiPo batarya güvenliği, stol ve çıkış, present perfect tense… Ders notu da yapıştırabilirsiniz.', 'e.g. LiPo battery safety, stall recovery, present perfect tense… You can also paste lesson notes.', 'مثال: سلامة بطاريات LiPo، الخروج من الانهيار الهوائي، زمن المضارع التام… يمكنك لصق ملاحظات الدرس أيضاً.'],
    aiGen: ['🤖 Soruları üret', '🤖 Generate questions', '🤖 توليد الأسئلة'],
    aiGenHint: ['Sorular üç dilde (TR/EN/AR) üretilir, seçenekler karıştırılarak eklenir ve arşivinize kaydedilir.', 'Questions are generated in three languages (TR/EN/AR), added with shuffled options and saved to your archive.', 'تُولَّد الأسئلة بثلاث لغات (TR/EN/AR) وتُضاف بخيارات مخلوطة وتُحفظ في أرشيفك.'],
    aiGenErr: ['Soru üretilemedi: {e}', 'Could not generate questions: {e}', 'تعذّر توليد الأسئلة: {e}'],
    aiTag: ['Hedef kitle', 'Audience', 'الفئة المستهدفة'],
  });

  const LS = 'ai.cfg';
  const PROV = {
    gemini: { name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'], url: 'https://aistudio.google.com/apikey' },
    openai: { name: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], url: 'https://platform.openai.com/api-keys' },
    anthropic: { name: 'Anthropic Claude', models: ['claude-3-5-haiku-latest', 'claude-sonnet-4-5'], url: 'https://console.anthropic.com/' },
    openrouter: { name: 'OpenRouter', models: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct'], url: 'https://openrouter.ai/keys' },
    groq: { name: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], url: 'https://console.groq.com/keys' },
  };
  const get = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
  const set = (c) => localStorage.setItem(LS, JSON.stringify(c));
  const ready = () => { const c = get(); return !!(c.key && PROV[c.provider || 'gemini']); };
  const uiLang = () => (window.prefs && window.prefs.uiLang) || 'tr';
  const LN = { tr: 'Turkish', en: 'English', ar: 'Arabic' };

  /* ---------- sağlayıcı çağrıları ---------- */
  async function chat(messages, opts = {}) {
    const c = get();
    if (!c.key) throw new Error(window.t('aiNoKey'));
    const p = c.provider || 'gemini';
    const model = c.model || PROV[p].models[0];
    const sys = opts.system || '';
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), opts.timeout || 90000);
    const o = { signal: ac.signal, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    let url, body, parse;
    if (p === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(c.key)}`;
      body = {
        systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxTokens || 4096, responseMimeType: opts.json ? 'application/json' : 'text/plain' },
      };
      parse = (j) => ((j.candidates || [])[0] || {}).content?.parts?.map((x) => x.text).join('') || '';
    } else if (p === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      o.headers['x-api-key'] = c.key; o.headers['anthropic-version'] = '2023-06-01'; o.headers['anthropic-dangerous-direct-browser-access'] = 'true';
      body = { model, max_tokens: opts.maxTokens || 4096, system: sys || undefined, temperature: opts.temperature ?? 0.4, messages: messages.map((m) => ({ role: m.role, content: m.content })) };
      parse = (j) => (j.content || []).map((x) => x.text || '').join('');
    } else {
      url = p === 'openai' ? 'https://api.openai.com/v1/chat/completions' : p === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
      o.headers.Authorization = 'Bearer ' + c.key;
      body = { model, temperature: opts.temperature ?? 0.4, max_tokens: opts.maxTokens || 4096, messages: [...(sys ? [{ role: 'system', content: sys }] : []), ...messages] };
      if (opts.json && p !== 'groq') body.response_format = { type: 'json_object' };
      parse = (j) => ((j.choices || [])[0] || {}).message?.content || '';
    }
    o.body = JSON.stringify(body);
    try {
      const r = await fetch(url, o);
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch { /* yok */ }
      if (!r.ok) throw new Error((j && j.error && (j.error.message || j.error)) || `HTTP ${r.status}`);
      const out = parse(j);
      if (!out) throw new Error('empty');
      return out;
    } finally { clearTimeout(tm); }
  }
  const jsonOf = (s) => {
    const m = String(s).match(/[\[{][\s\S]*[\]}]/);
    if (!m) throw new Error('JSON yok');
    return JSON.parse(m[0]);
  };

  /* ---------- sistem yönergeleri ---------- */
  const glossaryFor = (text) => {
    const S = window.SOZLUK; if (!S) return '';
    const low = String(text).toLowerCase();
    const hits = S.AV.filter((w) => low.includes(w[0].toLowerCase())).slice(0, 40);
    return hits.length ? 'Aviation glossary (use exactly these equivalents): ' + hits.map((w) => `${w[0]} = TR: ${w[1]} | AR: ${w[2]}`).join('; ') : '';
  };
  const ADVISOR = () => `You are an expert training advisor inside the "Sınav Hazırlama Sistemi" (Exam Preparation System) desktop program.
Expertise: UAV / RC / aviation theory and flight training (aerodynamics, flight controllers such as ArduPilot/PX4, LiPo safety, regulations, instructor methodology), English language teaching (CEFR A1–C2, grammar, vocabulary), exam and question design (multiple-choice quality, distractors, Bloom levels), and this program's features (questions, scenarios, word tests, ghost questions, level tags Student/Trainee/Instructor/Expert, archive, translation, Word/PDF output).
Rules: Answer in the language the user writes in (Turkish, English or Arabic); if unclear, use ${LN[uiLang()]}. Be accurate, concrete and practical like a senior consultant; give structured answers with short headings or numbered steps when useful. Use correct aviation terminology in each language (Turkish: hücum açısı, stol, kanatçık, irtifa dümeni, istikamet dümeni, taşıma, sürükleme, itki; Arabic: زاوية الهجوم، الانهيار الهوائي، الجنيح، دفة الارتفاع، دفة الاتجاه، قوة الرفع، قوة السحب، قوة الدفع). Keep the English term in parentheses on first use. If you are not sure, say so clearly and never invent regulations or numbers. For safety-critical topics (LiPo, propellers, people on the field, flying near airports) always state the safe practice. Use plain text with light Markdown (**bold**, lists).`;

  /* ---------- çeviri ---------- */
  async function translate(text, from, to) {
    const sys = `You are a professional translator for aviation / UAV training materials and English-teaching exam content. Translate from ${LN[from]} to ${LN[to]}. Return ONLY the translation, no quotes, no notes. Keep numbers, units, proper nouns, product names (ArduPilot, Mission Planner, MAVLink), placeholders like ____ and line breaks exactly. For exam items keep the same register and length. Use standard aviation terminology of the target language; keep the English technical term in parentheses only if the source does so. ${glossaryFor(text)}`;
    const out = await chat([{ role: 'user', content: text }], { system: sys, temperature: 0.1, maxTokens: 2048, timeout: 40000 });
    return out.trim().replace(/^["“”']+|["“”']+$/g, '');
  }

  /* ---------- soru üretimi ---------- */
  const TAGN = { ogr: 'students (beginners)', stj: 'trainees (intermediate practitioners)', egt: 'instructors (advanced, teaching level)', uzm: 'experts (specialist level)' };
  async function generateQuestions({ subject, lvl, tag, count, optionCount }) {
    const n = Math.max(1, Math.min(30, count || 10));
    const sys = `You write high-quality multiple-choice exam questions for UAV/aviation and English training. Output STRICT JSON only: {"questions":[{"text":{"tr":"","en":"","ar":""},"options":[{"tr":"","en":"","ar":""}],"correct":0,"explain":{"tr":"","en":"","ar":""}}]}.
Each question: exactly ${optionCount || 5} options, exactly one correct (index in "correct"), plausible distractors, no "all of the above", unambiguous, factually correct, level ${lvl === 1 ? 'basic' : lvl === 3 ? 'advanced' : 'intermediate'}, audience: ${TAGN[tag] || 'general'}. Provide every text in Turkish, English and Arabic with correct aviation terminology (keep English technical terms in parentheses in TR/AR where helpful). For English-language questions (grammar/vocabulary) the options may stay in English in all three languages; the instruction line must be translated. Do not repeat questions. ${glossaryFor(subject)}`;
    const out = await chat([{ role: 'user', content: `Subject / material:\n${subject}\n\nGenerate ${n} questions.` }], { system: sys, json: true, temperature: 0.6, maxTokens: 8192, timeout: 120000 });
    const j = jsonOf(out);
    const qs = (j.questions || j).filter((q) => q && q.text && Array.isArray(q.options) && q.options.length >= 4);
    const ml = (x) => (typeof x === 'string' ? { tr: x, en: x, ar: x } : { tr: x.tr || x.en || '', en: x.en || x.tr || '', ar: x.ar || x.en || '' });
    return qs.map((q, i) => {
      const correct = Math.max(0, Math.min(q.options.length - 1, +q.correct || 0));
      const opts = q.options.map(ml);
      // arşiv biçimi: doğru seçenek ilk sırada
      const ordered = [opts[correct], ...opts.filter((_, k) => k !== correct)];
      return { id: 'ai' + Date.now().toString(36) + i, lvl, topic: 'ai', tag: tag || '', text: ml(q.text), options: ordered, correct: 0, explain: q.explain ? ml(q.explain) : null };
    });
  }

  /* ---------- çevrimdışı danışman ---------- */
  const norm = (s) => String(s || '').toLocaleLowerCase('tr');
  function offlineAnswer(q) {
    const L = uiLang();
    const words = norm(q).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
    if (!words.length) return window.t('aiOffNone');
    const score = (txt) => { const t2 = norm(txt); return words.reduce((a, w) => a + (t2.includes(w) ? 1 : 0), 0); };
    const out = [];
    const S = window.SOZLUK;
    if (S) {
      const terms = S.AV.concat(S.GEN).map((w) => ({ w, s: Math.max(...w.map((x) => score(x))) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6);
      if (terms.length) out.push('**' + (L === 'tr' ? 'Sözlük' : L === 'ar' ? 'القاموس' : 'Dictionary') + ':**\n' + terms.map((t) => `- ${t.w[0]} — ${t.w[1]} — ${t.w[2]}`).join('\n'));
    }
    const B = window.QBANK_BUILTIN;
    if (B) {
      const qs = B.questions.filter((x) => x.topic === 'uav' && !/^g/.test(x.id)).map((x) => ({ x, s: score(x.text[L] || x.text.en) + score(x.options[0][L] || x.options[0].en) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
      if (qs.length) out.push('**' + (L === 'tr' ? 'Arşivden bilgiler' : L === 'ar' ? 'من الأرشيف' : 'From the archive') + ':**\n' + qs.map((t) => `- ${t.x.text[L] || t.x.text.en}\n  → ${t.x.options[0][L] || t.x.options[0].en}`).join('\n'));
      const sc = B.scenarios.map((x) => ({ x, s: score(x.text[L] || x.text.en) + score(x.title[L] || x.title.en) })).filter((x) => x.s > 1).sort((a, b) => b.s - a.s).slice(0, 2);
      if (sc.length) out.push('**' + (L === 'tr' ? 'Senaryolar' : L === 'ar' ? 'السيناريوهات' : 'Scenarios') + ':**\n' + sc.map((t) => `- ${t.x.title[L] || t.x.title.en}: ${t.x.text[L] || t.x.text.en}\n` + (t.x.questions || []).map((qq) => `  • ${qq.text[L] || qq.text.en} → ${qq.answer[L] || qq.answer.en}`).join('\n')).join('\n'));
    }
    return out.length ? window.t('aiOffAns') + '\n\n' + out.join('\n\n') : window.t('aiOffNone');
  }

  /* ---------- danışman penceresi ---------- */
  const HIST = 'ai.chat';
  const md = (s) => {
    const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const lines = String(s).replace(/\r/g, '').split('\n');
    const out = [];
    let blank = false;
    for (const ln of lines) {
      const tl = ln.trim();
      if (!tl) { blank = true; continue; }
      let h;
      const mh = /^(#{1,4})\s+(.+)$/.exec(tl), ml = /^[-•*]\s+(.+)$/.exec(tl), mn = /^(\d+)[.)]\s+(.+)$/.exec(tl);
      if (mh) h = `<div class="h">${inline(mh[2])}</div>`;
      else if (ml) h = `<div class="li">• ${inline(ml[1])}</div>`;
      else if (mn) h = `<div class="li">${mn[1]}. ${inline(mn[2])}</div>`;
      else h = `<div class="p${blank && out.length ? ' gap' : ''}">${inline(tl)}</div>`;
      out.push(h); blank = false;
    }
    return out.join('');
  };
  function advisorModal() {
    const t = window.t;
    const hist = (() => { try { return JSON.parse(localStorage.getItem(HIST) || '[]'); } catch { return []; } })();
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="aistatus" id="aiStatus"></div>
      <div class="aichat" id="aiChat"></div>
      <div class="airow"><textarea id="aiIn" rows="2" dir="auto" placeholder="${t('aiAsk')}"></textarea><button class="btn primary" id="aiSend">${t('aiSend')}</button></div>`;
    const chatBox = body.querySelector('#aiChat');
    const status = body.querySelector('#aiStatus');
    const online = () => navigator.onLine !== false;
    const refreshStatus = () => { status.textContent = !ready() ? t('aiNoKey') : !online() ? t('aiOffline') : ''; status.style.display = status.textContent ? '' : 'none'; };
    const add = (role, content, save = true) => {
      const d = document.createElement('div'); d.className = 'aimsg ' + role; d.dir = 'auto'; d.innerHTML = md(content);
      if (role === 'assistant' && save) {
        const b = document.createElement('button'); b.className = 'btn aiq'; b.textContent = t('aiToQ');
        b.onclick = () => { if (window.bankModal) window.bankModal('q', 'ai', content.slice(0, 6000)); };
        d.appendChild(b);
      }
      chatBox.appendChild(d); chatBox.scrollTop = chatBox.scrollHeight;
      if (save) { hist.push({ role, content }); localStorage.setItem(HIST, JSON.stringify(hist.slice(-60))); }
    };
    if (!hist.length) add('assistant', t('aiHello'), false); else hist.forEach((m) => add(m.role, m.content, false));
    const inp = body.querySelector('#aiIn');
    let busy = false;
    const send = async () => {
      const q = inp.value.trim(); if (!q || busy) return;
      inp.value = ''; add('user', q);
      if (!ready() || !online()) { add('assistant', offlineAnswer(q)); return; }
      busy = true;
      const w = document.createElement('div'); w.className = 'aimsg assistant wait'; w.textContent = t('aiThinking'); chatBox.appendChild(w); chatBox.scrollTop = chatBox.scrollHeight;
      try {
        const msgs = hist.slice(-12).map((m) => ({ role: m.role, content: m.content }));
        const a = await chat(msgs, { system: ADVISOR(), maxTokens: 3000 });
        w.remove(); add('assistant', a);
      } catch (e) { w.remove(); add('assistant', '⚠ ' + e.message + '\n\n' + offlineAnswer(q), false); }
      busy = false;
    };
    body.querySelector('#aiSend').onclick = send;
    inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
    refreshStatus();
    const m = window.modal({ title: t('aiAdvisor'), body, wide: true, buttons: [{ label: t('aiClear'), onClick: () => { hist.length = 0; localStorage.removeItem(HIST); chatBox.innerHTML = ''; add('assistant', t('aiHello'), false); } }, { label: t('close'), cls: 'primary', onClick: (c) => c() }] });
    m.el.querySelector('.modal').classList.add('aimodal');
    setTimeout(() => inp.focus(), 50);
  }

  /* ---------- ayar bölümü ---------- */
  function settingsSection() {
    const t = window.t;
    const c = get();
    const p = c.provider || 'gemini';
    const box = document.createElement('section');
    box.className = 'contactbox aibox';
    box.innerHTML = `
      <h4>${t('aiTitle')}</h4>
      <p class="contactlead">${t('aiKeyHelp')}</p>
      <div class="setgrid">
        <label class="f"><span>${t('aiProvider')}</span><select class="in" id="aiProv">${Object.keys(PROV).map((k) => `<option value="${k}" ${k === p ? 'selected' : ''}>${PROV[k].name}</option>`).join('')}</select></label>
        <label class="f"><span>${t('aiModel')}</span><input class="in" id="aiModel" list="aiModels" dir="ltr" value="${c.model || ''}" placeholder="${PROV[p].models[0]}"><datalist id="aiModels">${PROV[p].models.map((m) => `<option value="${m}">`).join('')}</datalist></label>
      </div>
      <label class="f"><span>${t('aiKey')}</span><input class="in" id="aiKey" type="password" dir="ltr" value="${(c.key || '').replace(/"/g, '&quot;')}" autocomplete="off"></label>
      <label class="chk"><input type="checkbox" id="aiUseTr" ${c.useTr !== false ? 'checked' : ''}> ${t('aiUseTr')}</label>
      <div class="contactfoot"><span class="hint" id="aiInfo"></span><button class="btn" id="aiTest">${t('aiTest')}</button></div>`;
    ['change', 'input'].forEach((ev) => box.addEventListener(ev, (e) => e.stopPropagation()));
    const save = () => {
      const prov = box.querySelector('#aiProv').value;
      set({ provider: prov, model: box.querySelector('#aiModel').value.trim(), key: box.querySelector('#aiKey').value.trim(), useTr: box.querySelector('#aiUseTr').checked });
    };
    box.querySelector('#aiProv').onchange = () => { const k = box.querySelector('#aiProv').value; box.querySelector('#aiModels').innerHTML = PROV[k].models.map((m) => `<option value="${m}">`).join(''); box.querySelector('#aiModel').placeholder = PROV[k].models[0]; save(); };
    ['#aiModel', '#aiKey', '#aiUseTr'].forEach((s) => { box.querySelector(s).onchange = save; box.querySelector(s).oninput = save; });
    box.querySelector('#aiTest').onclick = async () => {
      save(); const info = box.querySelector('#aiInfo'); info.textContent = t('aiThinking');
      try { await chat([{ role: 'user', content: 'Reply with OK.' }], { maxTokens: 10, timeout: 30000 }); info.textContent = t('aiOk'); } catch (e) { info.textContent = t('aiFail', { e: e.message }); }
    };
    return box;
  }

  window.AI = { get, set, ready, chat, translate, generateQuestions, advisorModal, settingsSection, offlineAnswer, PROV, useForTranslate: () => ready() && get().useTr !== false };
})();
