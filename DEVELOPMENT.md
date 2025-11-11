# Sviluppo Locale

Guida rapida per testare il progetto in locale senza fare push su Vercel.

## 🚀 Quick Start

```bash
./dev-local.sh
```

Lo script automaticamente:
- ✅ Verifica che Vercel CLI sia installato
- ✅ Crea `.env` da `.env.example` se necessario
- ✅ Installa dipendenze se mancanti
- ✅ Avvia server locale su `http://localhost:3000`

## 📋 Prerequisiti

### 1. Installa Vercel CLI (se non l'hai già)

```bash
npm install -g vercel
```

### 2. Configura variabili ambiente

Se è la prima volta, lo script ti chiederà di creare `.env`:

```bash
# Copia da esempio
cp .env.example .env

# Modifica con le tue credenziali
nano .env  # o vim, code, etc.
```

**Variabili necessarie:**
```bash
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB=medicidb

# JWT
JWT_SECRET=your-secret-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
ADMIN_CHAT_IDS=123456789,987654321

# Cron (per test automatici)
CRON_SECRET_KEY=your-cron-key
```

### 3. Primo avvio

```bash
# Installa dipendenze
npm install

# Avvia dev server
./dev-local.sh

# Oppure manualmente
npm run dev
```

## 🌐 URL Locali

Una volta avviato, il server sarà disponibile su:

- **Home ricerca**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin.html
- **Bot config**: http://localhost:3000/bot.html
- **API**: http://localhost:3000/api/*

## 🧪 Testing Rapido

### Test Admin Panel

1. Vai su http://localhost:3000/admin.html
2. Login con credenziali configurate
3. Testa:
   - Toggle monitoraggio utenti (🟢/🔴)
   - Visualizzazione login attempts
   - Cron logs

### Test Bot Config

1. Vai su http://localhost:3000/bot.html
2. Login
3. Testa:
   - Aggiungi cognomi
   - "Testa Query" per simulare ricerca

## 🔥 Hot Reload

Vercel dev supporta hot reload:
- ✅ Modifiche a file `.html`, `.css`, `.js` → ricarica automatica
- ✅ Modifiche a `/api/*` → riavvio automatico endpoint

## 🛠️ Troubleshooting

### "Vercel CLI non trovato"
```bash
npm install -g vercel
```

### "Cannot connect to MongoDB"
Verifica che `MONGODB_URI` in `.env` sia corretto e che il tuo IP sia whitelistato su MongoDB Atlas.

### Port già in uso (3000)
```bash
# Cambia porta
vercel dev --listen 3001
```

### Clear cache
```bash
# Se vercel dev si comporta strano
rm -rf .vercel
npm run dev
```

## 📝 Note

- ⚠️ Il file `.env` è in `.gitignore` (non viene committato)
- ⚠️ Le variabili di produzione sono su Vercel dashboard
- ✅ Puoi usare MongoDB locale o lo stesso di produzione (attento!)
- ✅ Il bot Telegram funzionerà solo se il token è valido

## 🚀 Deploy

Quando sei pronto per deployare:

```bash
git add -A
git commit -m "Le tue modifiche"
git push
```

Vercel deploierà automaticamente su push a `main`.
