# Sınav Hazırlama Sistemi

Çoktan seçmeli sınav hazırlama, çeviri ve çıktı programı (Windows, Electron). Sınavlar kullanıcının Firebase hesabında
eşitlenir; **kayıtlar bu depoda bulunmaz**.

- `uygulama/` — programın kodu (Electron ana süreç `main.js`, arayüz `renderer/`). npm paketleri kökteki `package.json`'da.
- `uygulama/cekirdek/`, `uygulama/renderer/cekirdek/` — ortak çekirdeğin gömülü kopyası (departures-mil/ortak-cekirdek;
  commit `VERSION` dosyasında). Pencere, sağ üst düğmeler, güncelleme, iletişim, çökme raporu, Kullanım Limitleri, ilk açılış
  rehberi, "neler yeni", tema/şema/yazı boyutu buradan gelir. Bağlantı: `renderer/kabuk.js`.
- `guncelleme/bank.json` — çevrimiçi soru arşivi (`node araclar/arsiv.js` üretir; program GitHub'dan okur).
- `guncelleme/desktop.json` — YALNIZ ≤1.9.10 kurulumları için köprü (eski imzalı .sinavyama kanalı kapandı; bkz. `tools/eski-kanal.js`).

## Kurulum ve güncelleme (1.10.0+)
- Program **kurulum programıyla** gelir: `SinavHazirlama-<sürüm>-win-setup.exe` (NSIS, kullanıcı başına, tek tık, tr/en/ar).
  Veriler `%APPDATA%\Sinav Hazirlama Sistemi` altında kalır (sınav otomatik kaydı, şablon, arşiv, yedekler, Wi-Fi eşitleme).
- Güncelleme yalnız **GitHub Releases + latest.json**: Güncelle düğmesi önce yalnız değişen kısımları (FCD1 yaması), olmazsa
  tam `app.asar`'ı indirir; SHA-256 ile doğrular. Sürüm tek: `package.json` (semver), etiket `vX.Y.Z`.
- İmza anahtarı / şifre depoya girmez.

## Yeni sürüm
1. Kodu değiştir, `node tools/surum.js X.Y.Z` (package.json + `renderer/surum.js`), `release-notes.json`'a tr/en/ar notları yaz.
2. `npm test` (duman testi + Wi-Fi eşitleme testi + Electron açılış testi; Linux'ta xvfb).
3. main'e gönder. **1.10.4'ten beri yayın kendiliğinden başlar**: release.yml her main gönderiminde `v<sürüm>` yayını var mı
   bakar, yoksa test → Windows derlemesi → ortak `reusable-release.yml` (son 5 sürüme yama + latest.json). Testler geçmezse
   yayın olmaz. Yedek yollar: Actions → release → *Run workflow* (main) ya da `vX.Y.Z` etiketi.

## Eşitleme (hiçbir veri silinmez)
- **Bulut**: kullanıcının KENDİ Firebase'i (Ayarlar → Eşitleme ya da üstteki Bulut). Buluttan "Arşivle" sınavı silmez
  (`deleted:true`, Arşiv'den geri alınır); başka cihazda arşivlenen açık sınav burada kalır. Çakışmada diğer sürüm
  "çakışma kopyası" olarak saklanır; buluttan gelen sürüm açık sınavın yerine geçmeden önce yerel hâl `yedekler/esitleme`'ye yazılır.
- **Wi-Fi** (üst çubukta Wi-Fi düğmesi): aynı modemdeki iki bilgisayar bir kez 6 haneli PIN ile eşleşir; sonra 3 dakikada bir
  ve "Şimdi eşitle" ile eşitlenir. İstekler eşleşme anahtarıyla imzalı (HMAC) ve şifreli (AES-256-GCM). Birleştirme ortak
  çekirdeğin kuralıyla: yeni olan kalır, eski hâl `wifi-esitleme/cakisma`'ya; uzak silme yerelde yalnız "arşivlendi" olur.
  Kod: `uygulama/src/lan.js`, arayüz `renderer/kabuk.js`.

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

## 1.10.4 — kalite ve sınıf araçları (`renderer/ek-plus.js`, kenar çubuğu "Gelişmiş")
- **Onay akışı** (`q.durum`: t taslak / k kontrol edildi / o onaylı; boş = eski soru, onaylı sayılır). Ayar açıksa çıktı, kitapçık,
  optik form ve çevrimiçi sınava yalnız onaylılar girer (`EK.onayMatch`; app.js buildModel ve ek-sinif examQsFor).
- **Gözden geçir işareti** `q.inceleme {n: analiz|revizyon|elle, t, not}` — soru değiştirilmez; kartta ⚠ düğmesiyle kalkar.
- **Kaynak revizyonu** `q.rev` + cihazda `ek.revler`; revizyon değişince o kaynağa dayanan sorular işaretlenir.
- **Madde analizi**: işlemeyen çeldirici (≥10 cevapta <%5), ters / düşük ayırt edicilik ve çok zor soru işareti; "Uygula" işaretler.
- **Tekrar kontrolü**: öğrenciye giden çıktı / kitapçık / canlı sınavdaki sorular `ek.kullanim`'a (metin parmak izi) yazılır;
  kartta 🕘 son kullanım; müfredat planı son N günde kullanılanları almaz.
- **Müfredat planı**: konu (EASA Part-66 / ATPL hazırları) + zorluk + adet → yeni sınav (açık sınav önce yedeklenir).
- **Kitapçık A/B/C/D**: soru + şık sırası; tüm anahtarlar tek PDF; optik formlarda `formlar[id].perm` (gösterilen şık → asıl şık).
- **Terim sözlüğü** (`ek.sozluk`): `SOZLUK.AV`'nin önüne eklenir → çevrimdışı, Google düzeltmesi ve yapay zekâ isteminde öncelikli.
- **Karne / başarı belgesi** (analiz penceresi), **toplu soru aktarma** (Excel/Word/CSV, başlık satırı tr/en/ar), **yedek**:
  30 dk'da bir (değiştiyse) + `yedek:dogrula` (yalnız okur). **Canlı sınav güvenli mod**: `/api/olay`, öğretmen panelinde ⚠ sayısı.
