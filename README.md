# 🔧 ManuMan — Guida al deploy

Applicazione web per la gestione di manutenzioni ordinarie e straordinarie, 
con pianificazione calendario, asset/impianti e piani ricorrenti automatici.

---

## Requisiti
- Node.js 18+
- Account Supabase (gratuito su supabase.com)
- Account Vercel o Netlify (gratuito)

---

## 1. Configurare Supabase

1. Vai su **supabase.com** → "New project" → scegli nome e password
2. Attendi la creazione del progetto (1-2 minuti)
3. Vai su **SQL Editor** → incolla tutto il contenuto di `schema.sql` → clicca **Run**
4. Vai su **Project Settings → API** e copia:
   - `Project URL` (es. `https://xxxx.supabase.co`)
   - `anon public key` (la chiave lunga che inizia con `eyJ...`)

---

## 2. Configurare le variabili d'ambiente

Crea un file `.env` nella radice del progetto (copia da `.env.example`):

```
VITE_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 3. Installare e avviare in locale

```bash
npm install
npm run dev
```

Apri `http://localhost:5173` nel browser.

---

## 4. Deploy su Vercel (5 minuti)

### Metodo A — Via GitHub (consigliato)
1. Carica il progetto su GitHub
2. Vai su **vercel.com** → "Add New Project" → importa il repo GitHub
3. Nella sezione "Environment Variables" aggiungi:
   - `VITE_SUPABASE_URL` → il tuo URL Supabase
   - `VITE_SUPABASE_ANON_KEY` → la tua chiave anon
4. Clicca **Deploy** — in 2 minuti hai l'URL pubblico

### Metodo B — Via CLI
```bash
npm install -g vercel
npm run build
vercel --prod
```
Segui le istruzioni e inserisci le variabili d'ambiente quando richiesto.

---

## 5. Deploy su Netlify (alternativa)

1. Vai su **netlify.com** → "Add new site" → "Import from Git"
2. Scegli il repo → imposta:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Vai su **Site settings → Environment variables** e aggiungi le stesse due variabili
4. Clicca **Deploy site**

---

## Struttura del progetto

```
manuMan/
├── src/
│   ├── App.jsx          # Tutta l'app (UI + logica Supabase)
│   ├── Auth.jsx         # Schermata login/registrazione
│   ├── supabase.js      # Client Supabase
│   └── main.jsx         # Entry point React
├── schema.sql           # Schema database da eseguire su Supabase
├── index.html
├── vite.config.js
├── package.json
└── .env.example         # Template variabili d'ambiente
```

---

## Note importanti

- **Ogni utente vede solo i propri dati** (Row Level Security attiva)
- I dati persistono nel database anche dopo il refresh della pagina
- La password di reset viene inviata via email da Supabase
- Gli operatori (Marco, Laura, Giorgio, Anna) sono predefiniti nel codice — 
  per personalizzarli modifica l'array `OPERATORI` in `App.jsx`
