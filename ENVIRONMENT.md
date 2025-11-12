# Gestione Ambienti

Sistema di configurazione server-side basato su variabili d'ambiente.

## 🌍 Come Funziona

La configurazione viene caricata **una volta** all'avvio dell'applicazione in `lib/config.js` e usa le variabili d'ambiente di Node.js.

### Rilevamento Automatico Ambiente

```javascript
VERCEL_ENV = production | preview | development
```

- **`production`** → Deploy su branch `main` (medici-lazio-asl.vercel.app)
- **`preview`** → Deploy su altri branch (URL preview di Vercel)
- **`development`** → `vercel dev` in locale

### Mapping Interno

```javascript
VERCEL_ENV === 'production' → environment: 'production'
VERCEL_ENV === 'preview'    → environment: 'preview'
Altrimenti                   → environment: 'local'
```

## 📝 File `.env`

### Locale (`.env`)

```bash
# ===== DATABASE =====
MONGODB_URI=mongodb://localhost:27017/medici-lazio-dev
# Oppure usa Atlas con IP whitelistato
# MONGODB_URI=mongodb+srv://dev:password@cluster.mongodb.net/medici-lazio-dev

# ===== AUTHENTICATION =====
JWT_SECRET=dev-secret-key-not-for-production

# API Keys per login (separate da virgola)
API_KEYS=dev-key-1,dev-key-2

# Admin Chat IDs
ADMIN_CHAT_IDS=123456789

# ===== TELEGRAM BOT =====
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI_your_dev_token

# ===== CRON =====
CRON_SECRET_KEY=dev-cron-key
CRON_ENABLED=true
```

### Produzione (Vercel Dashboard)

Configura le variabili d'ambiente su Vercel:
- Dashboard → Progetto → Settings → Environment Variables
- Usa valori **diversi** da locale (database prod, token prod, etc.)

## ⚙️ Configurazioni Disponibili

File: `lib/config.js`

```javascript
import { ENV, DATABASE, AUTH, TELEGRAM, CRON, TIMEOUTS, RATE_LIMIT, LOGGING } from './lib/config.js';

// Environment info
ENV.environment    // 'local' | 'preview' | 'production'
ENV.isLocal        // true/false
ENV.isProduction   // true/false

// Database
DATABASE.URI       // process.env.MONGODB_URI
DATABASE.NAME      // 'medici-lazio'

// JWT
AUTH.JWT_SECRET         // process.env.JWT_SECRET
AUTH.JWT_EXPIRY_DAYS    // 7 giorni in locale, 30 in prod
AUTH.COOKIE_MAX_AGE     // Secondi

// Telegram
TELEGRAM.BOT_TOKEN      // process.env.TELEGRAM_BOT_TOKEN
TELEGRAM.ADMIN_CHAT_IDS // Array di chat IDs

// Cron
CRON.SECRET_KEY    // process.env.CRON_SECRET_KEY
CRON.ENABLED       // true/false

// Timeouts (ms)
TIMEOUTS.API       // 60s locale, 30s prod
TIMEOUTS.SEARCH    // 120s locale, 60s prod
TIMEOUTS.DATABASE  // 10s locale, 5s prod

// Rate Limiting
RATE_LIMIT.MAX_LOGIN_ATTEMPTS  // 100 locale, 5 prod
RATE_LIMIT.LOGIN_WINDOW_MS     // 15 minuti
RATE_LIMIT.BLOCK_DURATION_MS   // 15 minuti

// Logging
LOGGING.LEVEL      // 'debug' locale, 'info' prod
LOGGING.VERBOSE    // true in locale/preview
```

## 🔧 Come Usare nel Codice

### Import nei file API

```javascript
import { ENV, DATABASE, AUTH, TIMEOUTS } from '../lib/config.js';

async function handler(req, res) {
  // Controlla ambiente
  if (ENV.isLocal) {
    console.log('Running in local environment');
  }

  // Usa timeout appropriato
  const timeout = TIMEOUTS.API;

  // Usa database URI
  const client = new MongoClient(DATABASE.URI);

  // Verifica JWT
  const token = jwt.verify(tokenString, AUTH.JWT_SECRET);
}
```

### Logging Condizionale

```javascript
import { LOGGING } from '../lib/config.js';

if (LOGGING.VERBOSE) {
  console.log('[DEBUG] Detailed info:', data);
}
```

### Rate Limiting

```javascript
import { RATE_LIMIT } from '../lib/config.js';

if (attempts > RATE_LIMIT.MAX_LOGIN_ATTEMPTS) {
  return res.status(429).json({ error: 'Too many attempts' });
}
```

## 🚀 Workflow

### 1. Sviluppo Locale

```bash
# Crea .env da esempio
cp .env.example .env

# Modifica con le tue credenziali DEV
nano .env

# Avvia server locale
npm run dev
# oppure
vercel dev

# Vedi log all'avvio:
# 🔧 Configuration loaded: {
#   environment: 'local',
#   database: '✅ configured',
#   jwtSecret: '✅ configured',
#   ...
# }
```

### 2. Deploy Produzione

```bash
# Configura env vars su Vercel Dashboard
# Settings → Environment Variables → Add
# - MONGODB_URI (produzione)
# - JWT_SECRET (diverso da locale!)
# - TELEGRAM_BOT_TOKEN (produzione)
# - API_KEYS
# - ADMIN_CHAT_IDS
# - CRON_SECRET_KEY

# Push su main
git push origin main

# Vercel deploiera automaticamente con VERCEL_ENV=production
```

### 3. Preview Branches

```bash
# Crea branch feature
git checkout -b feature/my-feature

# Push
git push origin feature/my-feature

# Vercel crea preview deployment con VERCEL_ENV=preview
```

## ✅ Validation

### Locale/Preview
Mostra log dettagliato:
```
🔧 Configuration loaded: {
  environment: 'local',
  database: '✅ configured',
  jwtSecret: '✅ configured',
  telegramToken: '✅ configured',
  cronEnabled: true,
  logging: 'debug',
  rateLimit: 100
}
```

### Produzione
Se mancano variabili critiche, **FAIL HARD**:
```javascript
throw new Error('❌ Missing required env vars in production: MONGODB_URI, JWT_SECRET');
```

## 🔍 Differenze Ambiente

| Configurazione | Locale | Produzione |
|---------------|--------|------------|
| JWT Expiry | 7 giorni | 30 giorni |
| API Timeout | 60s | 30s |
| Search Timeout | 120s | 60s |
| Rate Limit | 100 tentativi | 5 tentativi |
| Logging | debug | info |
| Verbose logs | ✅ | ❌ |
| DB Timeout | 10s | 5s |

## ⚠️ Note Importanti

1. **NON committare mai `.env`** → è in `.gitignore`
2. **Usa database DIVERSI** per locale e produzione
3. **JWT_SECRET deve essere DIVERSO** tra ambienti
4. Il file `lib/config.js` viene eseguito **una volta** all'avvio dell'app
5. Le API usano **sempre URL relativi** (`/api/*`)
6. Vercel inietta automaticamente `VERCEL_ENV` durante build/deploy

## 📂 File Coinvolti

- ✅ `lib/config.js` - Configurazione centralizzata server-side
- ✅ `.env` - Variabili locale (NON committato)
- ✅ `.env.example` - Template per .env
- ✅ Vercel Dashboard - Variabili produzione/preview

## 🎯 Best Practices

1. **Sviluppo locale**: Usa database dev separato
2. **Secrets diversi**: JWT_SECRET e CRON_SECRET_KEY devono essere diversi tra ambienti
3. **Test preview**: Usa branch separati per testare in ambiente preview
4. **Validazione**: Il codice valida automaticamente env vars in produzione
5. **Logging**: I log dettagliati sono automatici in locale, silenziosi in prod
