# envtarayici

[English](README.md) | [Türkçe](README.tr.md) | [Español](README.es.md) | [简体中文](README.zh-CN.md)

Node.js / TypeScript projeleri için statik ortam değişkeni ve sözleşme (contract) linter'ı.

```bash
npx envtarayici
```

`.env.example`, yerel ortam ve kaynak kodunuz arasındaki ortam değişkeni uyuşmazlıklarını (drift) çalışma zamanı sorununa dönüşmeden önce yakalayın.

---

## Neleri Yakalar?

Fullstack uygulamalarda ortam değişkenleri üç farklı yer arasında kolayca uyuşmazlığa düşer: örnek sözleşmeniz (`.env.example`), yerel geliştirici dosyalarınız (`.env`, `.env.local`) ve gerçek kaynak kodunuz (`src/`).

İşte **envtarayici**'nin tespit ettiği en yaygın üç problem:

### 1. Kod → Sözleşme (Eksik Dokümantasyon)

Bir geliştirici kaynak koda yeni bir değişken ekler:

```typescript
// src/db.ts
const dbUrl = process.env.DATABASE_URL;
```

...ancak bunu `.env.example` içine eklemeyi unutur. Diğer geliştiriciler kodun bu değişkeni beklediğini bilemeyebilir.

**envtarayici bunu işaretler:**
```text
WARNINGS:
  ⚠️  DATABASE_URL (src/db.ts:2)
     Variable 'DATABASE_URL' is used in source code but missing from .env.example.
```

### 2. Sözleşme → Yerel (Eksik Yerel Değişken)

Bir takım arkadaşınız `.env.example` dosyasına yeni bir zorunlu değişken ekler:

```text
DATABASE_URL=postgresql://localhost:5432/mydb
```

...ancak yerel `.env` veya `.env.local` dosyanız henüz güncellenmemiştir.

**envtarayici bunu işaretler:**
```text
ERRORS:
  ❌ DATABASE_URL (.env.example:1)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).
```

### 3. Public Secret Exposure

Hassas bir gizli anahtar (secret) yanlışlıkla bir istemci tarafı paket önekiyle (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_` vb.) adlandırılır:

```text
# .env.local
NEXT_PUBLIC_DATABASE_PASSWORD=supersecret
```

Çatılar (frameworks), public istemci öneklerine sahip değişkenleri istemci tarafı paketlerine (client-side bundles) maruz bırakabilir.

**envtarayici bunu işaretler:**
```text
CRITICAL:
  🔴 NEXT_PUBLIC_DATABASE_PASSWORD (.env.local:1)
     Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.
```

---

## Neleri Kontrol Eder?

- **Sözleşme Doğrulama (`MISSING_FROM_LOCAL` / ERROR):** `.env.example` (veya `.env.sample`, `.env.template`) içinde tanımlanan ancak yerel `.env` ve `.env.local` dosyalarında eksik olan değişkenler.
- **Kaynak Kod Kapsamı (`UNDOCUMENTED_IN_EXAMPLE` / WARNING):** Kaynak kodda statik olarak referans verilen ancak `.env.example` içinde yer almayan değişkenler.
- **İstemci Secret Sızıntısı (`PUBLIC_SECRET_EXPOSURE` / CRITICAL):** İstemci önekleri (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `GATSBY_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`) ile belirgin gizli anahtar terimlerinin (`SECRET`, `PASSWORD`, `PRIVATE`, `DATABASE_URL`, `SERVICE_ROLE_KEY`, `CREDENTIALS` vb.) bir arada kullanılması.
- **Potansiyel Maruziyet (`POTENTIAL_EXPOSURE` / WARNING):** Belirsiz anahtar kelimeler (`KEY`, `TOKEN`, `AUTH`) içeren ve izin listesinde (`ANON_KEY`, `PUBLISHABLE_KEY`, `CLIENT_ID` vb.) bulunmayan genel değişkenler.
- **Git Takip Kontrolü (`GIT_TRACKED` / CRITICAL):** Yerel `.env` veya `.env.local` dosyalarının Git repository indeksinde takip edilmesi.
- **Dinamik Referanslar (`DYNAMIC_ACCESS` / INFO):** `process.env[dynamicKey]` gibi statik olarak doğrulanamayan hesaplanmış özellik erişimleri.

---

## Neler Yapar ve Neler Yapmaz?

### Neler Yapar
- **Statik sözleşme denetimi:** Uygulamanızı çalıştırmadan `.env.example`, `.env` ve kaynak kod referanslarını karşılaştırır.
- **AST ayrıştırma:** Babel AST kullanarak string, markdown veya yorum satırlarını yok sayıp yalnızca gerçek kod referanslarını tanır.
- **İstemci sızıntısı sezgileri:** Yaygın istemci öneki credential sızıntılarını işaretler.
- **Sıfır yapılandırma:** Kurulum gerektirmeden `npx envtarayici` ile doğrudan çalışır.
- **CI dostu:** Standart çıkış kodları (`0`, `1`, `2`) ve makine tarafından okunabilir JSON çıktısı sunar.

### Neler Yapmaz
- **Yapay Zeka / LLM bağımlılığı yok:** %100 yerel çalışan deterministik statik analiz.
- **Bulut veya secret manager entegrasyonu yok:** AWS Secrets Manager, HashiCorp Vault, Doppler vb. servislerle bağlantı kurmaz.
- **Çalışma zamanı / production çözümlemesi yok:** Canlı ortamları, bulut sağlayıcılarını veya çalışma zamanı önceliklerini çözümlemez.
- **Otomatik düzeltme yok (`--fix`):** Kaynak kodunuzu veya `.env` dosyalarınızı asla değiştirmez ya da üzerlerine yazmaz.
- **Git geçmişi taraması yok:** Yalnızca mevcut çalışma dizinini ve Git indeksini kontrol eder; geçmiş commit'leri taramaz (geçmiş commit'ler için Gitleaks gibi özel araçlar kullanın).

---

## Hızlı Başlangıç

Herhangi bir Node.js / TypeScript projesinin kök dizininde çalıştırın:

```bash
npx envtarayici
```

### CLI Seçenekleri

```bash
# CI/CD logları için düz metin çıktısı
npx envtarayici --ci

# Makine tarafından okunabilir JSON çıktısı
npx envtarayici --json

# Belirli bir dizini analiz etme
npx envtarayici --cwd ./apps/web

# Yardım ve sürüm görüntüleme
npx envtarayici --help
npx envtarayici --version
```

---

## Örnek Çıktı

```text
ENVTARAYICI
──────────────────────────────────────────────────
CRITICAL:
  🔴 NEXT_PUBLIC_DATABASE_PASSWORD (.env.local:1)
     Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.

ERRORS:
  ❌ DATABASE_URL (.env.example:2)
     Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).

WARNINGS:
  ⚠️  PORT (src/index.ts:15)
     Variable 'PORT' is used in source code but missing from .env.example.

INFO:
  ℹ️  Dynamic environment variable access detected. Static analysis cannot verify dynamic property names. (src/config.ts:8)
──────────────────────────────────────────────────
Variables documented: 14 | Local variables: 13 | Code variables: 14
Files scanned: 28

Status: FAILED (1 Critical, 1 Error, 1 Warning)
```

---

## JSON Çıktısı

Otomasyon araçları veya özel CI script'leri için `--json` seçeneğini kullanın:

```bash
npx envtarayici --json
```

```json
{
  "status": "FAILED",
  "findings": [
    {
      "code": "PUBLIC_SECRET_EXPOSURE",
      "severity": "CRITICAL",
      "variableName": "NEXT_PUBLIC_DATABASE_PASSWORD",
      "message": "Variable 'NEXT_PUBLIC_DATABASE_PASSWORD' uses public client prefix 'NEXT_PUBLIC_' but contains sensitive keyword 'PASSWORD'. Secrets must never be exposed to client bundles.",
      "location": {
        "file": ".env.local",
        "line": 1
      }
    },
    {
      "code": "MISSING_FROM_LOCAL",
      "severity": "ERROR",
      "variableName": "DATABASE_URL",
      "message": "Variable 'DATABASE_URL' is documented in .env.example but missing in local environment (.env).",
      "location": {
        "file": ".env.example",
        "line": 2
      }
    }
  ],
  "summary": {
    "contractVariablesCount": 14,
    "localVariablesCount": 13,
    "codeVariablesCount": 14,
    "filesScannedCount": 28,
    "criticalCount": 1,
    "errorCount": 1,
    "warningCount": 0,
    "infoCount": 0
  }
}
```

---

## Çıkış Kodları (Exit Codes)

| Kod | Durum | Anlamı |
| :---: | :--- | :--- |
| `0` | **PASSED** | Gerekli tüm sözleşme değişkenleri yerel ortamda mevcuttur ve kritik güvenlik sorunu tespit edilmemiştir. (Uyarılar ve Bilgiler kontrolü başarısız yapmaz). |
| `1` | **FAILED** | Bir veya daha fazla `CRITICAL` güvenlik ihlali ya da `ERROR` seviyesinde eksik sözleşme değişkeni bulunmuştur. |
| `2` | **FATAL** | Yürütme hatası (ör. geçersiz argümanlar veya okunamayan dosyalar). |

---

## Desteklenen Kaynak Kod Sözdizimi

AST tarayıcısı JavaScript, TypeScript ve JSX/TSX dosyalarındaki statik referansları ayrıştırır:

```javascript
// Doğrudan özellik erişimi ve optional chaining
process.env.PORT
process.env?.PORT
process.env['PORT']
process.env["PORT"]
process.env[`PORT`] // İfadesiz statik template literal

// Vite / ESM sözdizimi
import.meta.env.VITE_API_URL
import.meta.env?.VITE_API_URL
import.meta.env['VITE_API_URL']

// Object destructuring
const { PORT, DATABASE_URL } = process.env
const { API_KEY: myKey } = process.env

// Dinamik erişim (DYNAMIC_ACCESS / INFO olarak işaretlenir)
process.env[dynamicKey]
process.env[`DB_${suffix}`]
```

---

## Güvenlik ve Veri İşleme

- **Değer Saklanmaz:** Ortam değişkeni değerleri bellek veri yapılarında (`KeyEntry`, `Finding`, `AnalysisResult`) asla saklanmaz, günlüğe kaydedilmez ve terminal veya JSON raporlarına dahil edilmez.
- **Geçici Okuma:** Ham `.env` dosya içerikleri, yalnızca anahtar isimlerini ayrıştırmak ve değer varlığını (`hasValue`) doğrulamak amacıyla yerel Node.js process'i tarafından geçici olarak okunur. Değerler satır çıkarımının hemen ardından bellekten çıkarılır.
- **Yerel Yürütme:** Telemetri yoktur, harici ağ istekleri yapılmaz ve üçüncü taraflara hiçbir veri aktarılmaz.

---

## CI Entegrasyonu

**envtarayici**'yi GitHub Actions iş akışınıza ekleyin:

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
      - name: Run envtarayici
        run: npx envtarayici --ci
```

---

## Bilinen Sınırlar

1. **Takma Adlı (Aliased) Ortam Nesneleri:** Kapsam analizini hafif tutmak amacıyla `const env = process.env; env.FOO` gibi dolaylı referanslar izlenmez.
2. **Yinelenen Anahtarlar:** Tek bir `.env` dosyası aynı anahtarı birden fazla kez tanımlıyorsa, son girdinin satır numarası korunur; ayrı bir bulgu olarak raporlanmaz.
3. **Sezgisel Secret Tespiti:** İstemci öneki denetimleri anahtar kelime eşleşmesine ve yaygın izin listelerine dayalı adlandırma sezgileridir.
4. **Varlık Odaklı Yerel Kontrol:** Araç, anahtarın `.env` veya `.env.local` içinde var olduğunu kontrol eder; çatıların runtime öncelik sırasını tam olarak taklit etmeye çalışmaz.

---

## Gereksinimler

- **Node.js:** `>= 18.0.0`

---

## Geliştirme

```bash
npm run build      # tsup ile derleme
npm test           # vitest test paketini çalıştırma
npm run typecheck  # tsc ile tip kontrolü
```

---

## Lisans

[MIT](LICENSE)
