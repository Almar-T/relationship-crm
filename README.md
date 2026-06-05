# Reconnect — Personal Relationship CRM (PWA)

A privacy-first Progressive Web App that **tells you who to reconnect with**.

You save someone, choose how often you want to stay in touch, and the app does
the rest: every day it surfaces the people who are due, and one tap —
**"Contacted today"** — automatically reschedules the next reach-out. One push
notification a day. No manual reminders, ever.

- **100% free to run.** GitHub Pages (frontend) + Cloudflare Workers/KV (push).
- **Local-first & private.** All contacts live in IndexedDB on your device. No
  backend database, no accounts, no tracking. The push server only stores opaque
  subscriptions — never your contacts.
- **iPhone-first.** Installs to the Home Screen, works offline, sends real Web
  Push notifications even when closed (iOS 16.4+).

---

## Table of contents

1. [Folder structure](#1-folder-structure)
2. [Architecture](#2-architecture)
3. [How notifications work](#3-how-notifications-work-the-clever-bit)
4. [Local development](#4-local-development)
5. [Deploying the push backend (Cloudflare)](#5-deploying-the-push-backend-cloudflare)
6. [Deploying the frontend (GitHub Pages)](#6-deploying-the-frontend-github-pages)
7. [Installing on your iPhone](#7-installing-on-your-iphone)
8. [Testing](#8-testing)
9. [Production checklist](#9-production-deployment-checklist)
10. [Future-proofing / V2](#10-future-proofing--v2)

---

## 1. Folder structure

```
relationship-crm/
├── index.html                  # App entry, iOS meta tags, apple-touch-icon
├── vite.config.ts              # Vite + PWA (injectManifest) config
├── package.json
├── tsconfig*.json
├── .env.example                # VITE_VAPID_PUBLIC_KEY, VITE_PUSH_API_URL
├── .github/workflows/deploy.yml# CI → GitHub Pages
├── scripts/
│   ├── generate-vapid.mjs      # Create VAPID keys (no deps)
│   └── generate-icons.mjs      # SVG → PNG icons (sharp)
├── public/
│   ├── icon.svg                # Master icon
│   └── icons/                  # Generated PNGs (192/512/maskable/apple/badge)
├── src/
│   ├── main.tsx                # Bootstraps React + registers the service worker
│   ├── App.tsx                 # Routes (HashRouter)
│   ├── sw.ts                   # Service worker: precache + push + click
│   ├── types/person.ts         # Domain model
│   ├── lib/                    # date, id, tags, events, download helpers
│   ├── db/database.ts          # IndexedDB engine (isomorphic: app + SW)
│   ├── repositories/           # Persistence layer (the only IndexedDB consumer)
│   │   └── personRepository.ts
│   ├── services/               # Business logic (NO React in here)
│   │   ├── contactScheduler.ts # Pure scheduling/due logic — the heart
│   │   ├── personService.ts    # Create/update/contacted rules
│   │   ├── dueQuery.ts         # Shared by dashboard AND the service worker
│   │   ├── dashboardService.ts
│   │   ├── metricsService.ts   # Relationship intelligence
│   │   ├── searchService.ts
│   │   ├── backupService.ts    # JSON/CSV export, JSON restore
│   │   └── pushService.ts      # Permission + subscription management
│   ├── hooks/                  # Thin React adapters over services
│   ├── components/
│   │   ├── ui/                 # Button, Card, Tag, DueBadge, Segmented, …
│   │   ├── layout/             # AppShell, Header, TabBar
│   │   └── people/             # PersonCard, PersonForm
│   ├── pages/                  # Dashboard, People, Detail, Add/Edit, Search, Settings
│   └── styles/                 # global.css + theme.css (design tokens)
└── worker/                     # Cloudflare Worker (push backend) — own README
    ├── src/index.ts
    ├── wrangler.toml
    └── README.md
```

## 2. Architecture

Clean, layered, and framework-light. **Business logic never lives in
components.** Data flows in one direction:

```
   UI (pages / components)
        │  calls
        ▼
   Hooks (useDashboard, usePeople, usePush …)   ← React adapters only
        │  call
        ▼
   Services (scheduler, person, dashboard, metrics, search, backup, push)
        │  call
        ▼
   Repository (personRepository)   ← the only thing that knows storage
        │
        ▼
   IndexedDB (db/database.ts)
```

Key decisions:

- **`contactScheduler.ts` is pure** (no DOM, no IndexedDB). All the "when is this
  due / how overdue" logic is here, trivially testable and reused everywhere.
- **`dueQuery.ts` is shared by the React app *and* the service worker**, so the
  daily notification count is computed exactly like the dashboard shows it.
- **Repository pattern** isolates IndexedDB. Swapping in Supabase for V2 sync
  means implementing one interface — services don't change.
- **Reactivity without a heavy store:** a tiny `events.ts` pub/sub fires on every
  mutation; `useAsyncData` re-runs loaders so the dashboard stays live after a
  "Contacted today" anywhere in the app.
- **Routing uses `HashRouter`** so deep links survive static hosting (no 404 on
  refresh on GitHub Pages).

### Data model

```ts
interface Person {
  id: string;
  name: string;
  company?: string;
  role?: string;
  whereMet?: string;
  notes?: string;
  tags: string[];
  relationshipStrength: 1 | 2 | 3 | 4 | 5;
  contactFrequencyDays: number;     // 30/60/90/180/365 or custom
  createdDate: string;              // ISO timestamp
  lastContactDate: string | null;   // YYYY-MM-DD
  nextContactDate: string;          // YYYY-MM-DD (auto-managed)
}
```

Contact dates are stored as local `YYYY-MM-DD` strings so "due today" is
timezone-stable. **Contacted today** sets `lastContactDate = today` and
`nextContactDate = today + contactFrequencyDays`. Changing the frequency
re-bases the schedule automatically.

## 3. How notifications work (the clever bit)

The number of people due lives **only on your device**. So the server can't
know it — and shouldn't, for privacy. The flow:

1. Cloudflare **Cron Trigger** fires once a day (9 AM your time).
2. The Worker sends each subscribed device a **VAPID-signed, payload-free** push
   — just a "wake up" signal.
3. Your **service worker** receives the push, opens IndexedDB, counts overdue +
   due-today contacts, and shows **one** notification:
   _"You have 4 people to reconnect with today."_
4. Tapping it opens the dashboard.

No contact data is transmitted. No payload encryption needed. iOS-compliant
(every push shows a user-visible notification).

## 4. Local development

Requirements: Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
```

The service worker and push flow are enabled in dev (`devOptions.enabled`). To
test notifications locally you still need VAPID keys and the Worker running —
see below. The core CRM (add people, dashboard, contacted-today, search,
metrics, backup) works fully offline with **no** backend configured.

```bash
npm run typecheck    # tsc, no emit
npm run build        # production build → dist/
npm run preview      # serve the production build locally
```

## 5. Deploying the push backend (Cloudflare)

Full details in [`worker/README.md`](worker/README.md). Short version:

```bash
# from the project root
npm run generate:vapid                 # creates keys (also saved to vapid-keys.json)

cd worker
npm install
npx wrangler login
npx wrangler kv namespace create SUBSCRIPTIONS   # paste id into wrangler.toml
npx wrangler secret put VAPID_PRIVATE_JWK         # from generate:vapid output
npx wrangler secret put VAPID_PUBLIC_KEY          # from generate:vapid output
# edit wrangler.toml: VAPID_SUBJECT, ALLOWED_ORIGIN, cron hour
npx wrangler deploy
```

Note the deployed URL — you'll need it next.

## 6. Deploying the frontend (GitHub Pages)

1. Push this repo to GitHub (default branch `main`). Name it `relationship-crm`
   or set `VITE_BASE` accordingly.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_VAPID_PUBLIC_KEY` — the public key from `generate:vapid`
   - `VITE_PUSH_API_URL` — your Worker URL (e.g. `https://reconnect-push.<sub>.workers.dev`)
   - `VITE_BASE` *(optional)* — `/relationship-crm/` by default; `/` for a custom domain
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   deploys automatically. Your app is live at
   `https://<username>.github.io/relationship-crm/`.

> After deploying, make sure the Worker's `ALLOWED_ORIGIN` is your
> `https://<username>.github.io` origin so subscription requests pass CORS.

## 7. Installing on your iPhone

Web Push on iOS requires the app be added to the Home Screen (iOS 16.4+).

1. Open the GitHub Pages URL in **Safari** on your iPhone.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Open **Reconnect** from your Home Screen (not from Safari).
4. Go to **Settings → Daily reminder → Enable daily reminder** and allow
   notifications.
5. Tap **Send test** to confirm a notification arrives.

You'll now get one summary notification each morning. Tapping it opens your
dashboard.

## 8. Testing

**Type & build checks**

```bash
npm run typecheck
npm run build
cd worker && npx tsc --noEmit
```

**Manual functional test (5 minutes)**

1. Add a contact with frequency 30 days → it appears under the right bucket.
2. Open the contact, tap **Contacted today** → last/next dates update; it leaves
   the overdue/due list.
3. To simulate "due", add a contact, then **Edit** and lower the frequency, or
   use the JSON backup to hand-edit a `nextContactDate` in the past and restore.
4. **Search** by name, tag, company, where-met, and a word inside notes.
5. **Settings → Network intelligence** reflects totals/overdue/health.
6. **Export backup**, delete a contact, **Restore from backup** → it returns.
7. Offline test: in DevTools → Network → Offline, reload — the app still opens.

**Push test**

- Run the Worker (`npx wrangler dev --test-scheduled`) or deploy it.
- Enable notifications in Settings, hit **Send test** → a notification with your
  real due-count appears.
- Trigger the cron locally:
  `curl "http://localhost:8787/__scheduled?cron=0+13+*+*+*"`.

## 9. Production deployment checklist

- [ ] `npm run generate:vapid` run; keys stored (never commit `vapid-keys.json`)
- [ ] Worker KV namespace created and id in `wrangler.toml`
- [ ] Worker secrets set: `VAPID_PRIVATE_JWK`, `VAPID_PUBLIC_KEY`
- [ ] `wrangler.toml`: `VAPID_SUBJECT`, `ALLOWED_ORIGIN`, cron hour (UTC) set
- [ ] `npx wrangler deploy` succeeds; `/health` returns `{ok:true}`
- [ ] GitHub Pages source set to **GitHub Actions**
- [ ] Repo Variables set: `VITE_VAPID_PUBLIC_KEY`, `VITE_PUSH_API_URL`, (`VITE_BASE`)
- [ ] Push to `main` → Actions deploy green → site loads
- [ ] iPhone: Add to Home Screen → enable notifications → test push received
- [ ] `ALLOWED_ORIGIN` matches the live Pages origin

## 10. Future-proofing / V2

The architecture is built to extend without rewrites:

- **CSV / JSON backup-restore** — already implemented in `backupService.ts`.
- **Supabase / multi-device sync** — add a `SupabaseRepository` implementing the
  same interface as `personRepository`; services are untouched.
- **Birthdays, AI notes, relationship analytics** — additive fields on `Person`
  + an IndexedDB migration in `db/database.ts` (`if (oldVersion < 2) {…}`).
- **Contact import** — parse into `PersonInput[]` and call `personService.create`.
- **Email reminders** — a second branch in the Worker's `scheduled` handler.

---

Built with React + TypeScript + Vite + IndexedDB. No Firebase, no paid APIs, no
backend database, no auth. Deployable entirely on free tiers.
