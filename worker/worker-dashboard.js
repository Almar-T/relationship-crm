/**
 * Plain-JavaScript version of the Reconnect push Worker, for pasting directly
 * into the Cloudflare dashboard code editor (Workers & Pages → your Worker →
 * Edit code). Functionally identical to src/index.ts, just with TypeScript
 * types removed so it runs as-is.
 *
 * Required bindings (set in the dashboard, see worker/README or the chat steps):
 *   • KV namespace binding named:  SUBSCRIPTIONS
 *   • Variables (Text):            VAPID_SUBJECT, ALLOWED_ORIGIN
 *   • Variables (Secret/encrypt):  VAPID_PRIVATE_JWK, VAPID_PUBLIC_KEY
 *   • Cron Trigger:                e.g. 0 13 * * *  (9 AM US Eastern)
 */

const KV_PREFIX = 'sub:';
const TWELVE_HOURS = 12 * 60 * 60;

export default {
  async fetch(request, env) {
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
      return cors(env, json({ error: err.message }, 500));
    }
  },

  // Cron Trigger entrypoint (daily).
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(broadcastDailyWakeup(env));
  },
};

// --- Route handlers ---------------------------------------------------------

async function handleSubscribe(request, env) {
  const sub = await request.json();
  if (!sub || !sub.endpoint) return json({ error: 'Missing endpoint' }, 400);
  await env.SUBSCRIPTIONS.put(await subKey(sub.endpoint), JSON.stringify(sub));
  return json({ ok: true });
}

async function handleUnsubscribe(request, env) {
  const { endpoint } = await request.json();
  if (!endpoint) return json({ error: 'Missing endpoint' }, 400);
  await env.SUBSCRIPTIONS.delete(await subKey(endpoint));
  return json({ ok: true });
}

async function handleTest(request, env) {
  const { endpoint } = await request.json();
  if (!endpoint) return json({ error: 'Missing endpoint' }, 400);
  const raw = await env.SUBSCRIPTIONS.get(await subKey(endpoint));
  if (!raw) return json({ error: 'Unknown subscription' }, 404);
  const result = await sendWakeup(JSON.parse(raw), env);
  return json({ ok: result.ok, status: result.status });
}

// --- Daily broadcast --------------------------------------------------------

async function broadcastDailyWakeup(env) {
  let cursor;
  do {
    const list = await env.SUBSCRIPTIONS.list({ prefix: KV_PREFIX, cursor });
    await Promise.all(
      list.keys.map(async ({ name }) => {
        const raw = await env.SUBSCRIPTIONS.get(name);
        if (!raw) return;
        const result = await sendWakeup(JSON.parse(raw), env);
        if (result.status === 404 || result.status === 410) {
          await env.SUBSCRIPTIONS.delete(name);
        }
      }),
    );
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
}

// --- Web Push (VAPID, no payload) -------------------------------------------

async function sendWakeup(sub, env) {
  const audience = new URL(sub.endpoint).origin;
  const jwt = await createVapidJwt(audience, env);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      TTL: '86400',
      'Content-Length': '0',
      Urgency: 'normal',
    },
  });
  return { ok: res.ok, status: res.status };
}

async function createVapidJwt(audience, env) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + TWELVE_HOURS,
    sub: env.VAPID_SUBJECT,
  };

  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;

  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
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

async function subKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return KV_PREFIX + b64url(new Uint8Array(digest));
}

function b64urlJson(obj) {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function b64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(env, res) {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN || '*');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers });
}
