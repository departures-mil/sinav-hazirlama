# Sınav Hazırlama Sistemi

Çoktan seçmeli sınav hazırlama, çeviri ve çıktı programı (Windows, Electron). Sınavlar kullanıcının Firebase hesabında
eşitlenir; **kayıtlar bu depoda bulunmaz**.

- `uygulama/` — programın kodu (npm paketleri hariç: `docx-preview`, `jszip`, `pdf-lib`, `pdfjs-dist`).
- `guncelleme/desktop.json` + `SinavHazirlama-<sürüm>.sinavyama` — Ed25519 imzalı güncelleme (yama). Program buradan
  indirir; imzası tutmayanı kurmaz. 1.9.0 tam sürüm, sonraki sürümler tek tıkla yama olarak gelir.
- İmza anahtarı depoda yoktur (`C:\Claude Programlarım\_Anahtarlar\SinavHazirlama`).

## Yeni sürüm
1. Kodu değiştir, `uygulama/package.json` sürümünü artır (ör. 1.9.1).
2. `OZEL_ANAHTAR=... node araclar/yayinla.js "notlar"` → `git add -A && git commit && git push`

## 1.9.2
- Ayarlar > Kullanım Limitleri (`renderer/kullanim.js` = duyurular/istemci/kullanim.js). Yöneticinin projesine giden iletişim mesajları sayılmaz (`haric`).
- Çevrimiçi soru arşivi artık `guncelleme/bank.json` (GitHub) dosyasından okunur; Firebase'e gidilmez. Dosya yoksa programdaki yerleşik arşiv kullanılır.
  Yeni arşiv yayınlamak için bank nesnesini (`{v, questions, scenarios}`) bu dosyaya yazıp gönderin.

## 1.9.4
- **Hayalet soru**: karttaki 👻 düğmesi (ya da kenar çubuğundan seçilenler). Soru listede kalır, okunur ve düzenlenir; numaralanmaz, sayılmaz, çıktıya ve cevap anahtarına girmez. Aynı düğmeyle geri gelir (`q.ghost`).
- **Soru seviyesi etiketi**: Öğrenci / Stajyer / Eğitmen / Uzman (`q.tag`). Kartta seçilir; kenar çubuğundaki "Göster" süzgeci yalnız o seviyeyi gösterir ("Gösterilenleri seç" ile hepsi seçilir); Çıktı penceresinde "Hangi seviye çıktıya girsin".
- "Otomatik soru getir / Soru arşivi / Yapay zeka ile soru üret" düğmeleri test sekmesinin en üstünde de; eklenen sorular sona gider ve ilkine kaydırılır.
- **Arşiv**: `renderer/sozluk.js` (351 havacılık terimi + ~1400 genel kelime, en/tr/ar), `renderer/bank-gen.js` (sözlük ve dil bilgisi tablolarından ~6100 üretilmiş soru: kelime, terim, eş/zıt anlam, zamanlar, edilgen, edat, kiplik, koşul…), `renderer/bank-data2.js` (90 el yazımı üç dilli İHA sorusu). Arşiv aramasında alt konu etiketleri.
- **Yapay zeka** (`renderer/ai.js`): Ayarlar > Yapay Zeka'da kullanıcının KENDİ anahtarı (Gemini/OpenAI/Anthropic/OpenRouter/Groq). Üst çubukta "🤖 Danışman" sohbeti (İHA/havacılık, İngilizce öğretimi, sınav tasarımı uzmanı; üç dil). Soru üretme sekmesi (konu + seviye + hedef kitle → üç dilli sorular, arşive kaydedilir). İnternet yokken "çevrimdışı danışman" sözlük ve arşivden yanıt verir. Kullanım, Kullanım Limitleri kartında sayılır.
- **Çeviri motoru** (`renderer/ceviri.js`): çeviri belleği (cihazda) → sözlük tam eşleşme → çevrimiçi (yapay zeka → Google → MyMemory) → çevrimdışı öbek/kelime çevirisi. Havacılık terimleri sözlükten zorlanır; kelime testi sözlük denetimi çevrimdışı da çalışır.
