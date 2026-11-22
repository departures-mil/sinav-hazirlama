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
