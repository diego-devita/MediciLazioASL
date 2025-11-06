# MediciLazioASL

Sistema completo per la ricerca di medici di base e pediatri disponibili nelle ASL della regione Lazio. Include tre interfacce: API REST, Bot Telegram e Web UI.

## 🎯 Caratteristiche

- **API REST** con autenticazione via API key
- **Bot Telegram** con gestione iscrizioni e notifiche automatiche
- **Web UI** con form di ricerca interattivo
- **Notifiche automatiche** ogni 30 minuti per utenti iscritti
- **Database persistente** (Vercel KV) per gestione stato utenti
- **Ricerca multi-criterio** per cognome, ASL e tipo medico
- **Indicatori emoji** per stato di assegnabilità (🟢🟠🔴)

## 📁 Struttura del progetto

```
MediciLazioASL/
├── lib/
│   ├── medici/
│   │   ├── client.js       # Client per scraping salutelazio.it
│   │   └── constants.js    # Costanti (ASL_MAP, TIPO_MAP, etc.)
│   ├── database.js         # Wrapper Vercel KV per gestione utenti
│   ├── telegram.js         # Bot Telegram utilities
│   ├── auth.js             # Validazione API key
│   └── commands/           # Comandi bot
│       ├── start.js        # /start con auto-subscribe
│       ├── subscribe.js    # /subscribe - attiva notifiche
│       ├── unsubscribe.js  # /unsubscribe - disattiva notifiche
│       ├── add.js          # /add - aggiungi cognome
│       ├── remove.js       # /remove - rimuovi cognome
│       ├── list.js         # /list - mostra configurazione
│       ├── asl.js          # /asl - cambia ASL
│       ├── tipo.js         # /tipo - cambia tipo medico
│       ├── check.js        # /check - ricerca manuale
│       ├── medici.js       # /medici - mostra risultati
│       ├── status.js       # /status - stato sistema
│       └── help.js         # /help - guida comandi
├── api/
│   ├── search.js           # Endpoint REST per ricerche
│   ├── webhook.js          # Webhook bot Telegram
│   └── cron.js             # Job schedulato ogni 30 minuti
├── public/
│   └── index.html          # Web UI form
├── package.json
├── vercel.json             # Configurazione cron
└── .env.example
```

## 🚀 Setup

### 1. Prerequisiti

- Account Vercel
- Bot Telegram (creato con @BotFather)
- Node.js 18+

### 2. Crea il database Vercel KV

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Crea un KV database dal dashboard Vercel
# oppure
vercel kv create medici-lazio-db
```

### 3. Configura variabili d'ambiente

Crea un file `.env.local` per sviluppo locale:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# API Keys (comma-separated)
API_KEYS=key1,key2,key3

# Vercel KV (auto-generated dopo creazione database)
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

Configura le stesse variabili nel dashboard Vercel in Project Settings → Environment Variables.

### 4. Deploy su Vercel

```bash
# Installa dipendenze
npm install

# Deploy
vercel --prod
```

### 5. Configura webhook Telegram

Dopo il deploy, imposta il webhook del bot:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app/api/webhook"}'
```

## 📡 API REST

### Endpoint: `POST /api/search`

Esegue una ricerca di medici.

**Headers:**
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Body:**
```json
{
  "cognomi": ["ROSSI", "BIANCHI"],
  "asl": "120202",
  "tipo": "MMG"
}
```

**Parametri:**
- `cognomi` (array, required): Lista cognomi da cercare
- `asl` (string, optional): Codice ASL (vedi constants.js)
- `tipo` (string, optional): "MMG" (medicina generale) o "PLS" (pediatra)
- `cap` (string, optional): CAP ambito territoriale
- `nome` (string, optional): Nome del medico

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "cognome": "ROSSI",
      "nome": "MARIO",
      "asl": "Roma 2",
      "tipo": "Medicina generale",
      "ambito": "9.2",
      "assegnabilita": "Assegnazione libera"
    }
  ],
  "count": 1,
  "assegnabili": 1,
  "query": {
    "cognomi": ["ROSSI"],
    "asl": "120202",
    "tipo": "MMG"
  },
  "timestamp": "2025-11-06T10:30:00.000Z"
}
```

### Metodo alternativo: `GET /api/search`

```
GET /api/search?cognomi=ROSSI,BIANCHI&asl=120202&tipo=MMG
Headers: X-API-Key: your_api_key
```

## 🤖 Bot Telegram

### Comandi disponibili

**Gestione notifiche:**
- `/start` - Avvia bot (auto-iscrizione)
- `/subscribe` - Attiva notifiche automatiche
- `/unsubscribe` - Disattiva notifiche
- `/status` - Mostra stato sistema

**Configurazione ricerca:**
- `/add COGNOME` - Aggiungi cognome da monitorare
- `/remove COGNOME` - Rimuovi cognome
- `/list` - Mostra configurazione corrente
- `/asl [NUMERO]` - Visualizza/cambia ASL
- `/tipo [NUMERO]` - Visualizza/cambia tipo medico

**Ricerca:**
- `/check` - Esegui ricerca immediata
- `/medici` - Mostra risultati ultima ricerca
- `/help` - Guida comandi

### Esempi

```
/start
/add ROSSI
/add BIANCHI
/asl 3         # Imposta ASL Roma 2
/tipo 1        # Imposta Medicina generale
/list          # Verifica configurazione
/check         # Esegui ricerca
/medici        # Visualizza risultati
```

### Notifiche automatiche

Gli utenti iscritti ricevono automaticamente:

1. **Notifica inizio ricerca:**
   ```
   🔄 Ricerca automatica in corso...
   ```

2. **Notifica fine ricerca:**
   ```
   ✅ Ricerca terminata!

   📊 Totali: 5
   🟢 Assegnabili: 2

   Usa /medici per vedere i risultati.
   ```

Le ricerche automatiche vengono eseguite ogni 30 minuti per tutti gli utenti con `subscribed: true`.

## 🌐 Web UI

Accedi al form web all'indirizzo principale del deploy:

```
https://your-app.vercel.app/
```

Il form permette di:
- Inserire API key per autenticazione
- Specificare uno o più cognomi (separati da virgola)
- Selezionare ASL
- Selezionare tipo medico (MMG/PLS)
- Visualizzare risultati con emoji di stato

## 📊 Indicatori di stato

- 🟢 **Assegnazione libera** - Medico immediatamente assegnabile
- 🟠 **Assegnabile con deroga** - Richiede deroga
- 🔴 **Non assegnabile** - Non disponibile

## 🗄️ Struttura dati utente

Ogni utente nel database ha questa struttura:

```javascript
{
  chatId: 123456789,          // ID chat Telegram
  username: "user123",        // Username Telegram
  subscribed: true,           // Iscritto a notifiche?
  query: {
    cognomi: ["ROSSI"],       // Lista cognomi monitorati
    asl: "120202",            // Codice ASL
    tipo: "MMG"               // Tipo medico
  },
  lastResults: [...],         // Risultati ultima ricerca
  lastCheck: "2025-11-06...", // Timestamp ultima ricerca
  createdAt: "2025-11-06..."  // Data creazione account
}
```

## ⚙️ Configurazione Cron

Il job cron è configurato in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/30 * * * *"  // Ogni 30 minuti
    }
  ]
}
```

Per modificare la frequenza, cambia il valore `schedule` usando la sintassi cron.

## 🔧 Sviluppo locale

```bash
# Installa dipendenze
npm install

# Crea .env.local con le variabili d'ambiente

# Usa Vercel Dev per testare funzioni serverless
vercel dev
```

**Note:**
- Il cron job NON viene eseguito in locale (solo su Vercel)
- Per testare il webhook in locale, usa ngrok o Vercel dev tunnel
- Il database KV deve essere creato su Vercel (non esiste versione locale)

## 📝 Codici ASL disponibili

| Codice | Nome |
|--------|------|
| 120201 | Roma 1 |
| 120202 | Roma 2 |
| 120203 | Roma 3 |
| 120204 | Roma 4 |
| 120205 | Roma 5 |
| 120206 | Roma 6 |
| 120207 | Frosinone |
| 120208 | Latina |
| 120209 | Rieti |
| 120210 | Viterbo |

## 🛡️ Sicurezza

- **API Key obbligatoria** per endpoint REST
- **Validazione input** su tutti gli endpoint
- **Rate limiting** gestito da Vercel
- **Webhook Telegram** con validazione payload
- **Variabili d'ambiente** per dati sensibili

## 📄 Licenza

Questo progetto è fornito "as is" senza garanzie. L'utilizzo è a proprio rischio.

## 🤝 Contributi

Per segnalare bug o richiedere funzionalità, contatta l'amministratore del sistema.

## 📞 Supporto

Per assistenza:
1. Usa il comando `/help` nel bot Telegram
2. Contatta l'amministratore del sistema
3. Verifica la configurazione delle variabili d'ambiente

## 🔗 Links utili

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Portale Salute Lazio](https://www.salutelazio.it/ricerca-medici)
