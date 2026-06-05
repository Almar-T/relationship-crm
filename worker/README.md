# Reconnect Push Worker

A single Cloudflare Worker that stores Web Push subscriptions in KV and, once a
day via a Cron Trigger, sends every device a content-free "wake up" push. The
device's service worker reads its **local** IndexedDB and shows the real
"You have N people to reconnect with today" notification.

**No contact data is ever sent to or stored by this Worker.** It only holds
opaque push subscriptions.

## Why no encrypted payload?

The number of due contacts only exists on the device (IndexedDB). So instead of
encrypting a payload server-side (RFC 8291), the Worker sends a VAPID-signed
push with **no body**. That wakes the service worker, which computes the count
locally and displays it. Simpler, and privacy-preserving by construction.

## One-time setup

```bash
cd worker
npm install

# 1. Log in to Cloudflare
npx wrangler login

# 2. Create the KV namespace and copy the id into wrangler.toml
npx wrangler kv namespace create SUBSCRIPTIONS
#  → put the printed id in [[kv_namespaces]].id

# 3. Generate VAPID keys (run from the project root, one dir up)
cd .. && npm run generate:vapid && cd worker

# 4. Store the VAPID keys as secrets (paste values from step 3)
npx wrangler secret put VAPID_PRIVATE_JWK     # the private JWK JSON
npx wrangler secret put VAPID_PUBLIC_KEY       # the base64url public key
```

Then edit `wrangler.toml`:

- set `VAPID_SUBJECT` to your `mailto:` address,
- set `ALLOWED_ORIGIN` to your GitHub Pages origin (e.g. `https://you.github.io`),
- pick the `crons` UTC hour matching 9 AM in your timezone.

## Deploy

```bash
npx wrangler deploy
```

The deploy prints your Worker URL, e.g.
`https://reconnect-push.<subdomain>.workers.dev`. Put that in the frontend's
`VITE_PUSH_API_URL`.

## Test it

```bash
# Tail live logs
npx wrangler tail

# Fire the daily cron locally without waiting until 9 AM:
npx wrangler dev --test-scheduled
# then in another terminal:
curl "http://localhost:8787/__scheduled?cron=0+13+*+*+*"
```

From the app: **Settings → Daily reminder → Send test** triggers `POST /test`,
which pushes immediately to your device.

## Endpoints

| Method | Path           | Purpose                                  |
| ------ | -------------- | ---------------------------------------- |
| POST   | `/subscribe`   | Store a push subscription                |
| POST   | `/unsubscribe` | Remove a subscription (`{endpoint}`)     |
| POST   | `/test`        | Send an immediate test push (`{endpoint}`) |
| GET    | `/health`      | Liveness check                           |
| cron   | —              | Daily broadcast to all subscriptions     |

## Free tier

- Workers: 100k requests/day — a daily broadcast to N devices uses ~N requests.
- KV: 1k writes/day, 100k reads/day — far below the cap for a personal network.
- Cron Triggers: included free.
