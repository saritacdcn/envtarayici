# envtarayici 🔍

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

> Node.js ve TypeScript projeleri için statik ortam değişkeni ve sözleşme (contract) linter'ı.

**envtarayici**, ortam sözleşmelerinizi (`.env.example`), yerel geliştirme dosyalarınızı (`.env`, `.env.local`) ve kaynak kodunuzu sıfır kod değişikliği ve hiçbir harici servis bağımlılığı olmadan denetler.

---

## Sözleşme (Contract) Kavramı

Modern fullstack geliştirmede, ortam yapılandırması üç ayrı katmanda çalışır:

1. **Sözleşme (`.env.example`, `.env.sample`, `.env.template`):** Uygulamanın çalışması için hangi değişkenlerin gerekli olduğunu tanımlayan taban çizgisi.
2. **Yerel Ortam (`.env`, `.env.local`):** Geliştiricinin yerel yapılandırma değerlerini içeren yerel ortam dosyaları.
3. **Kaynak Kod (`src/**/*.{ts,js,tsx,jsx}`):** Değişkenlerin derleme anında (build time) veya çalışma anında (runtime) fiilen tüketildiği yer (`process.env.VAR`, `import.meta.env.VAR`).

**envtarayici** bu üç katmanın birbiriyle senkronize kaldığını doğrular:
- Sözleşmede tanımlanmış ancak geliştiricinin yerel ortamında eksik olan değişkenleri tespit eder.
- Kaynak kodda kullanılan ancak sözleşmede hiç belgelenmemiş değişkenleri tespit eder.
- Public prefix'ler aracılığıyla istemci tarafı paketlerine (client-side bundles) yanlışlıkla maruz bırakılan hassas secret'ları yakalar.
- Git indeksine yanlışlıkla eklenmiş yerel ortam dosyalarını işaretler.

---

## envtarayici Neler Yapar ve Neler Yapmaz

### Desteklenenler
- **Sözleşme Doğrulama:** Gerekli şablon değişkenlerinin yerel ortamda mevcut olduğunu doğrular.
- **AST Kaynak Kod Taraması:** Babel AST kullanarak statik `process.env` ve `import.meta.env` referanslarını tespit eder.
- **İstemci Maruziyeti Sezgileri:** `NEXT_PUBLIC_*`, `VITE_*` ve diğer istemci öneklerindeki belirgin secret kalıplarını işaretler.
- **Git İndeks Takip Kontrolleri:** Yerel `.env` dosyalarının Git repository indeksinde takip edilip edilmediğini kontrol eder.
- **Terminal ve JSON Raporlayıcıları:** İnsan tarafından okunabilir biçimlendirilmiş özetler ve otomasyon araçları için makine tarafından okunabilir JSON çıktısı sunar.
- **CI Uyumlu Çıkış Kodları:** CI/CD süreçleri ve pre-commit hook'ları için standartlaştırılmış çıkış kodları (`0`, `1`, `2`).

### Kapsam Dışı (Desteklenmeyenler)
- **Yapay Zeka / LLM Bağımlılığı Yok:** Tamamen yerel makinenizde çalışan saf deterministik statik analiz.
- **Production / Bulut Çözümlemesi Yok:** Canlı ortamları çözümlemez veya secret manager servislerine (AWS Secrets Manager, Vault, Doppler vb.) bağlanmaz.
- **Otomatik Düzeltme Yok (`--fix`):** Kaynak kodunuzu veya `.env` dosyalarınızı kesinlikle değiştirmez, üzerine yazmaz veya yeniden yazmaz.
- **Git Geçmişi Secret Taraması Yok:** Yalnızca mevcut çalışma ağacını ve Git indeksini kontrol eder; geçmiş git commit'lerini taramaz (git geçmişi için Gitleaks gibi özel araçlar kullanın).
- **Çalışma Zamanı (Runtime) Çözümlemesi Yok:** Uygulama kodunuzu çalıştırmaz veya çalışma zamanı ortam değişkenlerini değerlendirmez.

---

## Hızlı Başlangıç

Herhangi bir Node.js / TypeScript projesinde kurulum yapmadan doğrudan çalıştırın:

```bash
npx envtarayici
```

### Seçenekler

```bash
# CI/CD süreçleri için düz metin çıktısı
npx envtarayici --ci

# Makine tarafından okunabilir JSON çıktısı
npx envtarayici --json

# Belirli bir dizini analiz etme
npx envtarayici --cwd ./apps/web

# Yardım veya sürüm görüntüleme
npx envtarayici --help
npx envtarayici --version
```

---

## Örnek Çıktı

```text
ENVTARAYICI
──────────────────────────────────────────────────
CRITICAL:
  🔴 NEXT_PUBLIC_STRIPE_SECRET_KEY (.env.local:12)
     Variable 'NEXT_PUBLIC_STRIPE_SECRET_KEY' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'SECRET'. Secrets must never be exposed to client bundles.

ERRORS:
  ❌ DATABASE_URL (.env.example:3)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).

WARNINGS:
  ⚠️  NEW_FEATURE_FLAG (src/api/auth.ts:15)
     Variable 'NEW_FEATURE_FLAG' is used in source code but missing from .env.example.

INFO:
  ℹ️  Dynamic environment variable access detected. Static analysis cannot verify dynamic property names. (src/utils/env.ts:8)
──────────────────────────────────────────────────
Variables documented: 14 | Local variables: 13 | Code variables: 14
Files scanned: 28

Status: FAILED (1 Critical, 1 Error, 1 Warning)
```

---

## Kurallar ve Tespit Mantığı

| Kural Kodu | Ciddiyet | Açıklama |
| :--- | :--- | :--- |
| `PUBLIC_SECRET_EXPOSURE` | **CRITICAL** | İstemci öneki (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `GATSBY_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`) ile belirgin secret terimlerinin (`SECRET`, `PASSWORD`, `PRIVATE`, `DATABASE_URL`, `SERVICE_ROLE_KEY`, `CREDENTIALS` vb.) bir arada kullanılması. |
| `GIT_TRACKED` | **CRITICAL** | Yerel `.env` veya `.env.local` dosyalarının Git repository indeksinde aktif olarak takip edilmesi. |
| `MISSING_FROM_LOCAL` | **ERROR** | Sözleşmede (`.env.example`, `.env.sample` veya `.env.template`) tanımlanan zorunlu bir değişkenin yerel `.env` ve `.env.local` dosyalarında eksik olması. |
| `UNDOCUMENTED_IN_EXAMPLE` | **WARNING** | Kaynak kodda statik olarak referans verilen bir değişkenin `.env.example` içinde belgelenmemiş olması. |
| `POTENTIAL_EXPOSURE` | **WARNING** | Bir public değişkenin açık bir izin listesi (allowlist) eşleşmesi olmaksızın belirsiz anahtar kelimeler (`KEY`, `TOKEN`, `AUTH`) kullanması. |
| `DYNAMIC_ACCESS` | **INFO** | `process.env[dynamicKey]` gibi statik olarak doğrulanamayan hesaplanmış özellik (computed property) erişimi. |

### Public Token İzin Listesi (Allowlist)

Geçerli istemci tarafı token'ları (ör. `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`, `*_CLIENT_ID`) izin listesine dahil edilmiştir ve yanlış pozitif uyarılara yol açmaz.

---

## Güvenlik Modeli: Yalnızca Metadata Analizi

Ortam değişkeni değerleri saklanmaz, depolanmaz, günlüğe kaydedilmez ve bulgulara veya raporlara dahil edilmez:
1. **Değerler Atılır:** Satır çıkarımı sırasında, değişken değerleri varlık durumu (`hasValue`) belirlendikten hemen sonra elden çıkarılır.
2. **Asla Dışarı Verilmez:** Düz metin secret'lar veri yapılarına (`KeyEntry`, `Finding`, `AnalysisResult`) asla girmez ve terminal raporlarına, hata mesajlarına, loglara veya JSON çıktılarına asla yazdırılmaz.

---

## CI / CD Entegrasyonu ve Çıkış Kodları

**envtarayici**'yi GitHub Actions veya pre-commit iş akışınıza ekleyin:

```yaml
# .github/workflows/envtarayici.yml
name: Environment Contract Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx envtarayici --ci
```

### Çıkış Kodları

- `0`: **BAŞARILI (PASSED)** — Tüm gerekli sözleşme değişkenleri mevcuttur ve kritik güvenlik sorunu tespit edilmemiştir. (Uyarılar ve Bilgilendirmeler derlemeyi başarısız yapmaz).
- `1`: **BAŞARISIZ (FAILED)** — Bir veya daha fazla `CRITICAL` güvenlik ihlali ya da `ERROR` düzeyinde eksik sözleşme değişkeni bulunmuştur.
- `2`: **ÖLÜMCÜL HATA (FATAL)** — Çalışma zamanı yürütme hatası (ör. geçersiz argümanlar veya dosya izin sorunları).

---

## Bilinen Sınırlar

1. **Takma Adlı (Aliased) Ortam Erişimi:** AST taramasını hızlı ve ağır kapsam analizi (scope analysis) bağımlılıklarından uzak tutmak için `const env = process.env; env.FOO` gibi dolaylı referanslar izlenmez.
2. **Tek Dosyada Yinelenen Anahtarlar:** Tek bir `.env` dosyası aynı anahtarı birden fazla kez tanımlıyorsa, yinelenen bir tanı uyarısı verilmeden son girdinin satır numarası korunur.
3. **Performans:** Analiz süresi proje boyutuna, dosya sayısına ve disk G/Ç (I/O) performansına göre belirlenir.

---

## Lisans

[MIT](LICENSE)
