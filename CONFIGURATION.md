# Configurazione Ambiente

Il progetto ha un sistema di configurazione automatica che rileva l'ambiente (locale, preview, produzione) e fornisce le giuste impostazioni.

## 📦 File di Configurazione

**`public/config.js`** - Caricato in tutti gli HTML, fornisce `window.ENV_CONFIG`

## 🌍 Rilevamento Ambiente

L'ambiente viene rilevato automaticamente da `hostname`:

```javascript
// Locale
localhost, 127.0.0.1, 192.168.*
→ environment: 'local'

// Vercel Preview
*.vercel.app (non il dominio principale)
→ environment: 'preview'

// Produzione
medici-lazio-asl.vercel.app
→ environment: 'production'
```

## ⚙️ Configurazioni Disponibili

### Oggetto `ENV_CONFIG`

```javascript
window.ENV_CONFIG = {
  // Environment info
  environment: 'local' | 'preview' | 'production',
  isLocal: true/false,
  isProduction: true/false,
  isPreview: true/false,

  // URLs
  apiBaseUrl: '',  // Always empty = relative URLs
  appUrl: 'http://localhost:3000',  // Full app URL

  // Debug
  debug: true/false,  // true in local/preview

  // Features
  features: {
    enableAnalytics: false,       // Solo in produzione
    enableErrorReporting: false,  // Solo in produzione
    verboseLogs: true             // Solo in local/preview
  },

  // Timeouts
  timeouts: {
    api: 60000,      // 60s in locale, 30s in prod
    search: 120000   // 120s in locale, 60s in prod
  }
}
```

## 🔧 Come Usare

### In HTML (dopo caricamento config.js)

```javascript
// Verifica ambiente
if (ENV_CONFIG.isLocal) {
  console.log('Running locally!');
}

// Usa timeout appropriato
const timeout = ENV_CONFIG.timeouts.api;

// Costruisci URL completo se serve
const loginUrl = `${ENV_CONFIG.appUrl}/login.html`;

// Feature flags
if (ENV_CONFIG.features.verboseLogs) {
  console.log('Verbose log abilitato');
}
```

### In BatchSearchClient

Il client usa automaticamente la configurazione:

```javascript
// ✅ Usa automaticamente ENV_CONFIG.apiBaseUrl
const client = new BatchSearchClient({
  parallelism: 5
});

// ⚠️ Puoi sovrascrivere se necessario
const client = new BatchSearchClient({
  baseUrl: 'https://custom-api.com',  // Override
  parallelism: 5
});
```

### Debug automatico

```javascript
// In locale, BatchSearchClient logga automaticamente
🔍 BatchSearchClient initialized: {
  baseUrl: '',
  parallelism: 5,
  environment: 'local'
}
```

## 📝 Esempi d'Uso

### Esempio 1: API con timeout dinamico

```javascript
async function fetchData() {
  const timeout = ENV_CONFIG.timeouts.api;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('/api/data', {
      signal: controller.signal
    });
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Esempio 2: Logging condizionale

```javascript
function logDebug(message, data) {
  if (ENV_CONFIG.debug) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

// Usa ovunque
logDebug('User data loaded', userData);  // Log solo in local/preview
```

### Esempio 3: Feature flags

```javascript
// Analytics solo in produzione
if (ENV_CONFIG.features.enableAnalytics) {
  initGoogleAnalytics();
}

// Error reporting solo in produzione
if (ENV_CONFIG.features.enableErrorReporting) {
  initSentry();
}
```

### Esempio 4: URL costruiti dinamicamente

```javascript
// Redirect dopo login
function redirectToAdmin() {
  // ✅ Funziona sia locale che produzione
  window.location.href = `${ENV_CONFIG.appUrl}/admin.html`;
}
```

## 🔍 Debug

In locale o preview, vedrai automaticamente:

```
🔧 Environment Config: {
  environment: 'local',
  hostname: 'localhost',
  appUrl: 'http://localhost:3000',
  debug: true
}
```

## 📂 File Configurati

Tutti questi file caricano `config.js`:

- ✅ `public/index.html`
- ✅ `public/admin.html`
- ✅ `public/bot.html`
- ✅ `public/login.html`

Tutti questi usano `ENV_CONFIG`:

- ✅ `public/batch-search-client.js`

## 🚀 Benefici

1. **Zero configurazione manuale** - rileva automaticamente l'ambiente
2. **URL relativi sempre** - `apiBaseUrl` è sempre `''` (relativo)
3. **Debug automatico** - log solo in sviluppo
4. **Timeout appropriati** - più tempo in locale per debug
5. **Feature flags** - analytics/monitoring solo in produzione

## ⚠️ Note Importanti

- Le API usano sempre **URL relativi** (`/api/*`)
- Non serve configurare URL diversi per locale vs produzione
- Il rilevamento è automatico basato su `window.location.hostname`
- `ENV_CONFIG` è sempre disponibile su `window` dopo il caricamento

## 🔗 Riferimenti

- Script principale: `public/config.js`
- Esempi d'uso: Vedi file HTML e `batch-search-client.js`
