# QuickDuel architecture

Next.js serves the mobile UI and all authoritative game commands. Browser clients keep
only a player UUID and opaque token. The service role is server-only; tokens are stored
as HMAC-SHA256 hashes.

Supabase PostgreSQL owns rooms, games, shuffled question order, answer uniqueness and
scores. Realtime changes are invalidation signals: clients refetch a sanitized state
endpoint, which never exposes `correct_option` until a question closes.

## Lobby e avvio

Il creatore diventa proprietario di una lobby aperta, senza scegliere preventivamente
la capienza. Gli amici possono entrare fino al limite server di 20 giocatori. Gli
ingressi sono serializzati da una funzione PostgreSQL che blocca la stanza prima di
verificare il limite. Solo il proprietario autenticato può avviare; il server crea
la partita e pubblica un countdown autoritativo di cinque secondi. Dopo l'avvio non
sono accettati altri ingressi.

## Game transitions

The host start command creates a game, chooses seven unique questions and starts a five
second countdown. The first state request after the countdown starts question zero.
Each question has a server-timed 5-second reading phase where options are hidden,
followed by a 5-second answer phase. Response time and speed bonus start only when the
answer phase opens.
Each state/answer request may close an expired or fully answered question. The
`claim_game_transition` RPC locks the game row and compares the expected index, so only
one competing client wins the transition. The finalizer computes the winner from
server-calculated answer rows.

Polling every second is retained as a fallback when Realtime is unavailable and also
drives server-time based timeout transitions.

## Known prototype trade-off

Realtime table SELECT policies expose non-secret synchronization rows to the anonymous
Supabase key. Questions and analytics remain inaccessible. A production hardening pass
should replace table broadcasts with private channels carrying only room-scoped
invalidations.
