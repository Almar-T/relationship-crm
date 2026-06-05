/**
 * Reconnect push backend — a single Cloudflare Worker.
 *
 * Responsibilities (all within the free tier):
 *   • POST /subscribe    — store a Web Push subscription in KV
 *   • POST /unsubscribe  — remove a subscription
 *   • POST /test         — send an immediate test push to one subscription
 *   • cron (daily 9 AM)  — send every subscription ONE content-free "wake up"
 *                          push. The device's service worker then reads its
 *                          local IndexedDB and shows the real "N people due"
 *                          summary. No contact data ever touches this Worker.
 *
 * Push is sent WITHOUT an encrypted payload — we only need the VAPID-signed
 * Authorization header to wake the service worker, which keeps the Worker tiny
 * and avoids RFC 8291 payload encryption entirely.
 */

export interface Env {
  SUBSCRIPTIONS: KVNamespace;
  /** EC P-256 private key as a JWK JSON string (set via `wrangler secret`). */
  VAPID_PRIVATE_JWK: string;
  /** Base64url raw (uncompressed) public key — same one the client subscribes with. */
  VAPID_PUBLIC_KEY: string;
  /** mailto: or https: contact, required by the push spec. */
  VAPID_SUBJECT: string;
  /** Allowed browser origin for CORS, e.g. https://you.github.io */
  ALLOWED_ORIGIN: string;
}

interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys?: { p256dh: string; auth: string };
}

const KV_PREFIX = 'sub:';
const TWELVE_HOURS = 12 * 60 * 60;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return cors(env, new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    try {
      switch (`${request.method} ${url.pathname}`) {
        case 'POST /subscribe':
          return cors(env, await handleSubscribe(request, env));
        case 'POST /unsubscribe':
          return cors(env, await handleUnsubscribe(request, env));
        case 'POST /test':
          return cors(env, await handleTest(request, env));
        case 'GET /health':
          return cors(env, json({ ok: true }));
        default:
          return cors(env, json({ error: 'Not found' }, 404));
      }
    } catch (err) {
      return cors(env, json({ error: (err as Error).message }, 500));
    }
  },

  /** Cron Trigger entrypoint (configured in wrangler.toml). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(broadcastDailyWakeup(env));
  },
};

// --- Route handlers ---------------------------------------------------------

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const sub = (await request.json()) as PushSubscriptionJSON;
  if (!sub?.endpoint) return json({ error: 'Missing endpoint' }, 400);
  const key = await subKey(sub.endpoint);
  await env.SUBSCRIPTIONS.put(key, JSON.stringify(sub));
  return json({ ok: true });
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) return json({ error: 'Missing endpoint' }, 400);
  await env.SUBSCRIPTIONS.delete(await subKey(endpoint));
  return json({ ok: true });
}

async function handleTest(request: Request, env: Env): Promise<Response> {
  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) return json({ error: 'Missing endpoint' }, 400);
  const raw = await env.SUBSCRIPTIONS.get(await subKey(endpoint));
  if (!raw) return json({ error: 'Unknown subscription' }, 404);
  const result = await sendWakeup(JSON.parse(raw) as PushSubscriptionJSON, env);
  return json({ ok: result.ok, status: result.status });
}

// --- Daily broadcast --------------------------------------------------------

async function broadcastDailyWakeup(env: Env): Promise<void> {
  let cursor: string | undefined;
  do {
    const list = await env.SUBSCRIPTIONS.list({ prefix: KV_PREFIX, cursor });
    await Promise.all(
      list.keys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return;
        const sub = JSON.parse(raw) as PushSubscriptionJSON;
        const result = await sendWakeup(sub, env);
        // Clean up subscriptions the push service has retired.
        if (result.status === 404 || result.status === 410) {
          await env.SUBSCRIPTIONS.delete(name);
        }
      }),
    );
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
}

// --- Web Push (VAPID, no payload) -------------------------------------------

async function sendWakeup(
  sub: PushSubscriptionJSON,
  env: Env,
): Promise<{ ok: boolean; status: number }> {
  const audience = new URL(sub.endpoint).origin;
  const jwt = await createVapidJwt(audience, env);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      // No payload: just wake the service worker.
      TTL: '86400',
      'Content-Length': '0',
      Urgency: 'normal',
    },
  });
  return { ok: res.ok, status: res.status };
}

async function createVapidJwt(audience: string, env: Env): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + TWELVE_HOURS,
    sub: env.VAPID_SUBJECT,
  };

  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;

  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey;
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

// --- Helpers ----------------------------------------------------------------

async function subKey(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return KV_PREFIX + b64url(new Uint8Array(digest));
}

function b64urlJson(obj: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(env: Env, res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN || '*');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers });
}
