'use strict';
// Sınav Hazırlama 1.10.1 — öğrencinin telefonunda açılan sınav sayfası ve öğretmenin optik form okutma sayfası (tek dosya, internet gerekmez).
const CSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Arabic",Tahoma,sans-serif;background:#0f172a;color:#e5e7eb;font-size:17px;-webkit-text-size-adjust:100%}
header{position:sticky;top:0;z-index:5;background:#111c33;border-bottom:1px solid #22304d;padding:10px 14px;display:flex;gap:10px;align-items:center}
header h1{font-size:16px;margin:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.timer{font-variant-numeric:tabular-nums;font-weight:700;background:#1e293b;border-radius:8px;padding:4px 10px}.timer.low{background:#7f1d1d;color:#fff}
select,input,button{font:inherit}select{background:#1e293b;color:#e5e7eb;border:1px solid #334155;border-radius:8px;padding:4px 6px}
main{max-width:760px;margin:0 auto;padding:14px}
.card{background:#111c33;border:1px solid #22304d;border-radius:14px;padding:16px;margin-bottom:14px}
label{display:block;margin:10px 0 4px;color:#94a3b8;font-size:14px}
input[type=text],input[type=tel]{width:100%;padding:12px;border-radius:10px;border:1px solid #334155;background:#0b1222;color:#fff}
.btn{display:inline-block;border:0;border-radius:10px;padding:12px 18px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer}.btn.sec{background:#334155}.btn:disabled{opacity:.5}
.btn.wide{width:100%;margin-top:14px}
.err{color:#fca5a5;margin-top:10px;min-height:20px}.ok{color:#86efac}
.q .n{font-weight:700;color:#93c5fd;margin-bottom:6px}.q .s{white-space:pre-wrap;line-height:1.45;margin-bottom:10px}
.q img{max-width:100%;max-height:300px;display:block;margin:6px auto;background:#fff;border-radius:8px}
.opt{display:flex;gap:10px;align-items:center;width:100%;text-align:start;background:#0b1222;color:#e5e7eb;border:2px solid #22304d;border-radius:12px;padding:12px;margin:7px 0;cursor:pointer}
.opt b{min-width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#1e293b}
.opt.on{border-color:#3b82f6;background:#13254a}.opt.on b{background:#2563eb;color:#fff}.opt img{max-height:110px;max-width:60%;margin:0}
.nav{display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));gap:6px}.nav button{padding:8px 0;border-radius:8px;border:1px solid #334155;background:#0b1222;color:#cbd5e1}
.nav button.a{background:#14532d;border-color:#166534;color:#fff}.nav button.cur{outline:2px solid #60a5fa}
.row{display:flex;gap:10px;justify-content:space-between;align-items:center}
.big{font-size:22px;text-align:center;padding:30px 10px}
[dir=rtl] .opt{text-align:right}`;

const I18N = {
  title: ['Çevrimiçi sınav', 'Online exam', 'اختبار عبر الشبكة'],
  name: ['Adınız soyadınız', 'Your full name', 'الاسم الكامل'],
  no: ['Öğrenci numaranız', 'Your student number', 'رقمك الطلابي'],
  code: ['Sınav kodu (öğretmeninizden)', 'Exam code (from your teacher)', 'رمز الاختبار (من المعلّم)'],
  start: ['Sınava başla', 'Start the exam', 'ابدأ الاختبار'],
  info: ['{n} soru · süre {d} dakika', '{n} questions · {d} minutes', '{n} سؤالاً · المدة {d} دقيقة'],
  infoNoTime: ['{n} soru · süre sınırı yok', '{n} questions · no time limit', '{n} سؤالاً · بلا حد زمني'],
  q: ['Soru {i} / {n}', 'Question {i} / {n}', 'السؤال {i} / {n}'],
  prev: ['‹ Önceki', '‹ Previous', 'السابق ›'], next: ['Sonraki ›', 'Next ›', '‹ التالي'],
  finish: ['Sınavı bitir ve gönder', 'Finish and submit', 'إنهاء الاختبار وإرساله'],
  confirm: ['{a}/{n} soruyu cevapladınız. Sınavı bitirmek istiyor musunuz? Bitirdikten sonra değiştiremezsiniz.', 'You answered {a}/{n}. Finish the exam? You cannot change your answers afterwards.', 'أجبت عن {a}/{n}. هل تريد إنهاء الاختبار؟ لا يمكنك تغيير الإجابات بعد ذلك.'],
  done: ['✅ Cevaplarınız öğretmeninize ulaştı. Teşekkürler!', '✅ Your answers have reached your teacher. Thank you!', '✅ وصلت إجاباتك إلى المعلّم. شكراً لك!'],
  timeup: ['⏰ Süre doldu; cevaplarınız otomatik gönderildi.', '⏰ Time is up; your answers were submitted automatically.', '⏰ انتهى الوقت؛ أُرسلت إجاباتك تلقائياً.'],
  saved: ['Kaydedildi', 'Saved', 'حُفظ'], offline: ['Bağlantı yok — cevaplar telefonda tutuluyor, bağlantı gelince gönderilecek', 'No connection — answers are kept on the phone and will be sent when reconnected', 'لا يوجد اتصال — تُحفظ الإجابات في الهاتف وتُرسل عند عودة الاتصال'],
  e_CODE: ['Sınav kodu yanlış.', 'Wrong exam code.', 'رمز الاختبار غير صحيح.'], e_CLOSED: ['Sınav şu anda girişe kapalı.', 'The exam is closed for entry.', 'الاختبار مغلق أمام الدخول حالياً.'],
  e_NAME: ['Adınızı ve numaranızı yazın.', 'Enter your name and number.', 'اكتب اسمك ورقمك.'], e_TAKEN: ['Bu numarayla başka bir cihazdan girilmiş. Öğretmeninize söyleyin.', 'This number is already in use on another device. Tell your teacher.', 'هذا الرقم مستخدم على جهاز آخر. أخبر معلّمك.'],
  e_DONE: ['Bu numarayla sınav zaten teslim edilmiş.', 'An exam has already been submitted with this number.', 'سُلّم اختبار بهذا الرقم بالفعل.'], e_NO_EXAM: ['Şu anda açık sınav yok.', 'No exam is open right now.', 'لا يوجد اختبار مفتوح حالياً.'],
  e_SLOW: ['Çok fazla deneme. Bir dakika bekleyin.', 'Too many attempts. Wait a minute.', 'محاولات كثيرة. انتظر دقيقة.'], e_NET: ['Bilgisayara ulaşılamadı. Aynı Wi-Fi ağında olduğunuzdan emin olun.', 'Cannot reach the computer. Make sure you are on the same Wi-Fi.', 'تعذّر الوصول إلى الحاسوب. تأكد أنك على شبكة Wi-Fi نفسها.'],
  lang: ['Dil', 'Language', 'اللغة'],
  // okutma
  scanTitle: ['Optik form okut', 'Scan answer sheets', 'قراءة أوراق الإجابة'],
  scanHelp: ['Formu düz bir yere koyun, dört köşedeki siyah kare görünecek şekilde yukarıdan çekin. Her fotoğraf bilgisayara gider ve hemen puanlanır.', 'Lay the sheet flat and photograph it from above so that all four black corner squares are visible. Each photo is sent to the computer and scored at once.', 'ضع الورقة على سطح مستوٍ وصوّرها من الأعلى بحيث تظهر المربعات السوداء الأربعة في الزوايا. تُرسل كل صورة إلى الحاسوب وتُصحَّح فوراً.'],
  scanBtn: ['📷 Fotoğraf çek / seç', '📷 Take / choose photo', '📷 التقط / اختر صورة'],
  scanCode: ['Sınav kodu (bilgisayarda yazar)', 'Exam code (shown on the computer)', 'رمز الاختبار (يظهر على الحاسوب)'],
  scanSending: ['Gönderiliyor… {p}', 'Sending… {p}', 'جارٍ الإرسال… {p}'],
  scanOk: ['✅ {ad} — {no}: {d} doğru / {n}', '✅ {ad} — {no}: {d} correct / {n}', '✅ {ad} — {no}: {d} صحيحة / {n}'],
  scanPending: ['Alındı; bilgisayarda işleniyor.', 'Received; processing on the computer.', 'استُلمت؛ تجري معالجتها على الحاسوب.'],
  scanFail: ['Okunamadı: {e}. Daha düz ve aydınlık çekip tekrar deneyin.', 'Could not read: {e}. Try again with a flatter, brighter photo.', 'تعذّرت القراءة: {e}. أعد المحاولة بصورة أوضح وأكثر استواءً.'],
};

function page(kind) {
  const isScan = kind === 'scan';
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Sınav</title><style>${CSS}</style></head><body>
<header><h1 id="h"></h1><span class="timer" id="tm" style="display:none"></span><select id="lg"><option value="tr">TR</option><option value="en">EN</option><option value="ar">AR</option></select></header>
<main id="m"></main>
<script>
const I=${JSON.stringify(I18N)};
let L=localStorage.getItem('sh.lang')||(navigator.language||'tr').slice(0,2);if(!['tr','en','ar'].includes(L))L='tr';
const t=(k,v)=>{const a=I[k]||[k];let s=a[{tr:0,en:1,ar:2}[L]]||a[0];if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s};
const $=(s)=>document.querySelector(s);const esc=(s)=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function post(p,b){const r=await fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return r.json()}
function dirSet(){document.documentElement.lang=L;document.documentElement.dir=L==='ar'?'rtl':'ltr';$('#lg').value=L}
$('#lg').onchange=(e)=>{L=e.target.value;localStorage.setItem('sh.lang',L);dirSet();render()};
dirSet();
${isScan ? SCAN_JS : EXAM_JS}
</script></body></html>`;
}

const EXAM_JS = `
let S={info:null,tok:localStorage.getItem('sh.tok')||'',paper:null,ans:[],cur:0,left:null,done:false,auto:false,lastSync:0,dirty:false,err:'',letters:null,cl:null};
const pick=(ml)=>{if(!ml)return'';const c=S.cl||L;return ml[c]||ml[L]||ml.tr||ml.en||ml.ar||''};
const dirOf=(s)=>/[\\u0600-\\u06FF]/.test(s)?'rtl':'auto';
function fmt(ms){const s=Math.ceil(ms/1000),m=Math.floor(s/60);return (m>=60?Math.floor(m/60)+':'+String(m%60).padStart(2,'0'):m)+':'+String(s%60).padStart(2,'0')}
async function boot(){try{const r=await fetch('/api/bilgi');S.info=await r.json()}catch(e){S.info={ok:false,error:'NET'}}
 if(S.tok){try{const j=await post('/api/giris',{token:S.tok});if(j.ok)return enter(j);localStorage.removeItem('sh.tok');S.tok=''}catch(e){}}
 render()}
function enter(j){S.tok=j.token;localStorage.setItem('sh.tok',j.token);S.paper=j.paper;S.ans=j.answers||[];S.done=j.done;S.left=j.left;S.t0=Date.now();S.title=j.title;S.letters=j.letters;S.cl=(j.langs||[]).includes(L)?L:(j.lang||null);
 const pend=localStorage.getItem('sh.pend.'+S.tok);if(pend&&!S.done){try{const a=JSON.parse(pend);if(Array.isArray(a)&&a.length===S.ans.length){S.ans=a;S.dirty=true}}catch(e){}}
 render();tick()}
function leftNow(){return S.left==null?null:Math.max(0,S.left-(Date.now()-S.t0))}
function tick(){clearInterval(S.iv);S.iv=setInterval(()=>{const l=leftNow();const tm=$('#tm');if(l==null||S.done){tm.style.display='none';return}tm.style.display='';tm.textContent='⏱ '+fmt(l);tm.classList.toggle('low',l<120000);if(l<=0){sync(true,true)}else if(S.dirty&&Date.now()-S.lastSync>1500)sync(false)},500)}
async function sync(final,auto){if(S.busy)return;S.busy=true;localStorage.setItem('sh.pend.'+S.tok,JSON.stringify(S.ans));
 try{const j=await post('/api/cevap',{token:S.tok,answers:S.ans,final:!!final});S.lastSync=Date.now();S.err='';
  if(j.ok){S.dirty=false;if(j.left!=null){S.left=j.left;S.t0=Date.now()}if(j.done){S.done=true;S.auto=!!auto;localStorage.removeItem('sh.pend.'+S.tok)}}
  else if(j.error==='DONE'){S.done=true;S.auto=true}
 }catch(e){S.err=t('offline')}
 S.busy=false;render()}
function render(){
 $('#h').textContent=S.title||(S.info&&S.info.title)||t('title');document.title=$('#h').textContent;
 const m=$('#m');
 if(S.done){m.innerHTML='<div class="card big">'+esc(S.auto?t('timeup'):t('done'))+'</div>';return}
 if(!S.paper){const i=S.info||{};
  if(!i.ok){m.innerHTML='<div class="card big">'+esc(t('e_'+(i.error||'NET')))+'</div><p style="text-align:center"><button class="btn sec" onclick="location.reload()">↻</button></p>';return}
  m.innerHTML='<div class="card"><h2 style="margin:0 0 4px">'+esc(i.title||t('title'))+'</h2><div style="color:#94a3b8">'+esc(i.dur?t('info',{n:i.n,d:i.dur}):t('infoNoTime',{n:i.n}))+'</div>'+
  '<label>'+esc(t('name'))+'</label><input id="fa" type="text" autocomplete="name" value="'+esc(localStorage.getItem('sh.ad')||'')+'">'+
  '<label>'+esc(t('no'))+'</label><input id="fn" type="tel" value="'+esc(localStorage.getItem('sh.no')||'')+'">'+
  '<label>'+esc(t('code'))+'</label><input id="fc" type="tel" inputmode="numeric" maxlength="4">'+
  '<button class="btn wide" id="go">'+esc(t('start'))+'</button><div class="err" id="er">'+esc(S.err)+'</div></div>';
  $('#go').onclick=async()=>{const ad=$('#fa').value.trim(),no=$('#fn').value.trim(),code=$('#fc').value.trim();localStorage.setItem('sh.ad',ad);localStorage.setItem('sh.no',no);
   $('#go').disabled=true;try{const j=await post('/api/giris',{ad,no,code});if(j.ok)return enter(j);S.err=t('e_'+j.error)}catch(e){S.err=t('e_NET')}$('#go').disabled=false;$('#er').textContent=S.err};return}
 const P=S.paper,n=P.length,i=Math.min(S.cur,n-1),q=P[i],Ls=(S.letters&&S.letters[S.cl||L])||['A','B','C','D','E'];
 const st=pick(q.text);
 let h='<div class="card q"><div class="n">'+esc(t('q',{i:i+1,n}))+'</div><div class="s" dir="'+dirOf(st)+'">'+esc(st)+'</div>'+(q.img?'<img src="'+q.img+'" alt="">':'');
 q.options.forEach((o,k)=>{const ot=pick(o);if(!ot&&!(q.oimg&&q.oimg[k]))return;h+='<button class="opt'+(S.ans[i]===k?' on':'')+'" data-k="'+k+'"><b>'+esc(Ls[k]||String.fromCharCode(65+k))+'</b><span dir="'+dirOf(ot)+'">'+esc(ot)+'</span>'+(q.oimg&&q.oimg[k]?'<img src="'+q.oimg[k]+'" alt="">':'')+'</button>'});
 h+='<div class="row" style="margin-top:10px"><button class="btn sec" id="pv"'+(i?'':' disabled')+'>'+esc(t('prev'))+'</button><button class="btn sec" id="nx"'+(i<n-1?'':' disabled')+'>'+esc(t('next'))+'</button></div></div>';
 h+='<div class="card"><div class="nav">'+P.map((_,k)=>'<button data-g="'+k+'" class="'+(S.ans[k]>=0?'a ':'')+(k===i?'cur':'')+'">'+(k+1)+'</button>').join('')+'</div>'+
  '<button class="btn wide" id="fin">'+esc(t('finish'))+'</button><div class="err">'+esc(S.err)+'</div></div>';
 m.innerHTML=h;
 m.querySelectorAll('.opt').forEach((b)=>{b.onclick=()=>{const k=+b.dataset.k;S.ans[i]=S.ans[i]===k?-1:k;S.dirty=true;localStorage.setItem('sh.pend.'+S.tok,JSON.stringify(S.ans));render();sync(false)}});
 m.querySelectorAll('[data-g]').forEach((b)=>{b.onclick=()=>{S.cur=+b.dataset.g;render();window.scrollTo(0,0)}});
 $('#pv').onclick=()=>{S.cur=i-1;render();window.scrollTo(0,0)};$('#nx').onclick=()=>{S.cur=i+1;render();window.scrollTo(0,0)};
 $('#fin').onclick=()=>{const a=S.ans.filter((x)=>x>=0).length;if(confirm(t('confirm',{a,n})))sync(true)};
}
boot();`;

const SCAN_JS = `
let busy=false,log=[];
function render(){$('#h').textContent=t('scanTitle');document.title=t('scanTitle');
 $('#m').innerHTML='<div class="card"><p>'+esc(t('scanHelp'))+'</p><label>'+esc(t('scanCode'))+'</label><input id="fc" type="tel" inputmode="numeric" maxlength="4" value="'+esc(sessionStorage.getItem('sh.code')||'')+'">'+
 '<input id="fi" type="file" accept="image/*" capture="environment" multiple style="display:none"><button class="btn wide" id="go">'+esc(t('scanBtn'))+'</button></div>'+
 '<div class="card" id="lg2">'+log.map((x)=>'<div class="'+(x.ok?'ok':'err')+'" style="margin:6px 0">'+esc(x.m)+'</div>').join('')+'</div>';
 $('#go').onclick=()=>{sessionStorage.setItem('sh.code',$('#fc').value.trim());$('#fi').click()};
 $('#fi').onchange=async(e)=>{for(const f of e.target.files)await send(f)};}
function shrink(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f);const im=new Image();im.onload=()=>{const s=Math.min(1,2000/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',0.88))};im.onerror=rej;im.src=u})}
async function send(f){const code=sessionStorage.getItem('sh.code')||'';log.unshift({ok:true,m:t('scanSending',{p:f.name||''})});render();
 try{const image=await shrink(f);const r=await fetch('/api/okut',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,image})});const j=await r.json();
  log[0]=j.ok?(j.pending?{ok:true,m:t('scanPending')}:j.read?{ok:true,m:t('scanOk',{ad:j.ad||'?',no:j.no||'?',d:j.d,n:j.n})}:{ok:false,m:t('scanFail',{e:j.error||'?'})}):{ok:false,m:t('e_'+j.error)||j.error};
 }catch(e){log[0]={ok:false,m:t('e_NET')}}render()}
render();`;

module.exports = { pageHtml: () => page('exam'), scanHtml: () => page('scan') };
