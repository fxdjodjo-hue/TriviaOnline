# QuickDuel

MVP mobile-first di trivia 1 contro 1: stanza privata senza account, sette domande
sincronizzate da cinque secondi, punteggio autoritativo, rivincita e metriche di
validazione.

## Requisiti

- Node.js 20+
- un progetto Supabase
- Supabase CLI (inclusa nelle devDependencies) per lo sviluppo locale

## Configurazione

1. `npm install`
2. Copia `.env.example` in `.env.local` e valorizza tutte le chiavi. Genera
   `PLAYER_TOKEN_SECRET` con almeno 32 caratteri casuali.
3. Recupera il **Project ID** da Supabase Dashboard → Project Settings → General.
   Collega quindi il progetto sostituendo il valore di esempio, senza parentesi
   angolari: `npx supabase link --project-ref abcdefghijklmnopqrst`.
4. Applica schema e Realtime: `npx supabase db push`.
5. Carica le domande: `npm run seed`.
6. Avvia: `npm run dev`.

La service-role key è usata esclusivamente nelle route server. Su Vercel aggiungi le
stesse variabili in Project Settings → Environment Variables, imposta
`NEXT_PUBLIC_APP_URL` sull'URL pubblico e distribuisci il repository. La migrazione
aggiunge automaticamente le tabelle alla publication Realtime.

`npm run seed` carica automaticamente `.env.local`; verifica quindi che URL e
service-role key non siano lasciati vuoti nel file.

## Provare due giocatori

Apri `http://localhost:3000` in una finestra normale, crea una sfida e copia il codice.
Apri una finestra in incognito (o un secondo browser), inserisci un nickname diverso e
il codice. Usare contesti browser separati è importante perché ogni giocatore conserva
il proprio token nel `localStorage`. Non vengono creati utenti finti in produzione.

Per una modalità demo completamente locale avvia Supabase con `npx supabase start`,
inserisci URL/chiavi stampate dal comando in `.env.local`, quindi esegui:

```bash
npx supabase db reset
npm run seed
npm run dev
```

## Comandi

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run seed:validate`
- `npm run build`
- `E2E_SUPABASE_READY=1 npm run test:e2e` (PowerShell:
  `$env:E2E_SUPABASE_READY=1; npm run test:e2e`)

## Sicurezza e sincronizzazione

Il browser possiede un UUID e un token opaco; nel database resta solo HMAC-SHA256.
Creazione, ingresso, risposta, punteggio e rivincita passano dal server. La risposta
corretta viene rimossa dallo stato pubblico finché la domanda è aperta. Il vincolo
univoco `(game_question_id, player_id)` blocca doppi invii. Una RPC PostgreSQL con
row-lock e indice atteso rende atomico l'avanzamento. Realtime invalida lo stato e un
polling di un secondo copre indisponibilità o perdita di eventi.

Le stanze scadono dopo quattro ore. `/admin/metrics` usa
`ADMIN_METRICS_PASSWORD`; il cookie è HTTP-only e dura un'ora.

Ulteriori dettagli: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
