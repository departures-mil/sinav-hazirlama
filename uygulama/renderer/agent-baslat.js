// Asistan Agent (ortak-cekirdek/web/dist/fc-agent.js): bütün uygulamalardaki çalışmayı izler (yalnız sayılar), öneri verir.
// Bildirim + sağ altta ✦ panel; Ayarlar'da "Admin ile iletişim" kartının önünde kendi kartı. fc-agent.js'yi çekirdekten yeniden kopyalayarak güncellenir.
(function () {
  if (!window.FCAgent) return;
  FCAgent.mount({
    app: "sinav-hazirlama",
    version: (function () { try { return (window.APPINFO&&APPINFO.version)||''; } catch (e) { return ''; } })(),
    lang: function () { try { return ((window.UI_LANG||document.documentElement.lang)) || document.documentElement.lang || 'tr'; } catch (e) { return document.documentElement.lang || 'tr'; } },
    theme: 'auto',
    sync: true,
    settingsBefore: ["Admin İletişim", "Contact the Administrator", "التواصل مع المسؤول"],
    ai: function () { try { return (function(){var c=JSON.parse(localStorage.getItem('ai.cfg')||'{}'); var p=c.provider||'gemini'; return c.key&&/^(gemini|openai|anthropic|groq)$/.test(p)?{provider:p,key:c.key,model:c.model}:null;})(); } catch (e) { return null; } },
    firebase: function () { try { return (window.Cloud&&Cloud.ready&&Cloud.config&&Cloud.config.apiKey)?{projectId:Cloud.config.projectId,apiKey:Cloud.config.apiKey}:null; } catch (e) { return null; } }
  });
})();
