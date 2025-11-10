# Setup GitHub Actions Cron

## Configurazione Secret

Per far funzionare il cron automatico su GitHub Actions, devi configurare il secret `CRON_SECRET_KEY`:

### Passaggi:

1. Vai su GitHub → **Settings** del repository
2. Clicca su **Secrets and variables** → **Actions**
3. Clicca su **New repository secret**
4. Compila:
   - **Name**: `CRON_SECRET_KEY`
   - **Secret**: il valore della variabile `CRON_SECRET_KEY` che hai su Vercel
5. Clicca **Add secret**

### Come trovare il valore su Vercel:

1. Vai su [Vercel Dashboard](https://vercel.com)
2. Seleziona il progetto **medici-lazio-asl**
3. Vai su **Settings** → **Environment Variables**
4. Cerca `CRON_SECRET_KEY` e copia il valore

### Test manuale:

Puoi testare il workflow manualmente:
1. Vai su **Actions** tab su GitHub
2. Clicca su **Trigger Cron Job**
3. Clicca **Run workflow** → **Run workflow**
4. Aspetta l'esecuzione e controlla i log

### Orari di esecuzione:

- **Inverno (CET)**: Ogni 10 minuti dalle 7:00 alle 22:50
- **Estate (CEST)**: Cambia manualmente il cron in `.github/workflows/cron-trigger.yml` a `'*/10 5-20 * * *'`

### Note:

- GitHub Actions può avere ritardi di 5-10 minuti rispetto all'orario schedulato
- Il workflow usa curl per chiamare `/api/cron` con l'header `X-Cron-Key`
- In caso di errori, il workflow fallisce e viene loggato
