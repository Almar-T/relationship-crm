/// <reference lib="webworker" />
/**
 * Custom service worker (injectManifest). Responsibilities:
 *   1. Precache the app shell + offline support via Workbox.
 *   2. Receive the daily content-free "wake up" push from the Cloudflare Worker,
 *      compute how many contacts are due *on this device*, and show ONE summary
 *      notification. No contact data ever leaves the device.
 *   3. Focus/open the dashboard when the notification is tapped.
 */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { countActionable } from './services/dueQuery';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// --- Precaching & offline ---------------------------------------------------
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback: any navigation request is served the cached shell so
// the app opens instantly and works offline. Exclude push/worker paths.
const handler = createHandlerBoundToURL('index.html');
registerRoute(new NavigationRoute(handler, { denylist: [/^\/api\//] }));

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Push -------------------------------------------------------------------
self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(showDailySummary(event));
});

async function showDailySummary(event: PushEvent): Promise<void> {
  // The push is normally content-free; if the Worker ever sends a JSON payload
  // with an explicit count we honour it, otherwise we compute locally.
  let count: number | null = null;
  if (event.data) {
    try {
      const payload = event.data.json() as { count?: number };
      if (typeof payload.count === 'number') count = payload.count;
    } catch {
      /* not JSON — fall through to local computation */
    }
  }
  if (count === null) {
    try {
      count = await countActionable();
    } catch {
      count = 0;
    }
  }

  const { title, body } = composeMessage(count);

  // iOS requires every push to result in a user-visible notification, so we
  // always show one. `tag` collapses repeats into a single daily entry.
  await self.registration.showNotification(title, {
    body,
    tag: 'daily-reconnect',
    renotify: true,
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-72.png',
    data: { url: './#/' },
  } as NotificationOptions);
}

function composeMessage(count: number): { title: string; body: string } {
  if (count <= 0) {
    return { title: 'All caught up 🎉', body: 'No one to reconnect with today.' };
  }
  const people = count === 1 ? 'person' : 'people';
  return {
    title: 'Time to reconnect',
    body: `You have ${count} ${people} to reconnect with today.`,
  };
}

// --- Notification click -----------------------------------------------------
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) ?? './#/';
  event.waitUntil(openOrFocus(targetUrl));
});

async function openOrFocus(targetUrl: string): Promise<void> {
  const absolute = new URL(targetUrl, self.registration.scope).href;
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    // Focus an existing window if the app is already open.
    if ('focus' in client) {
      await client.focus();
      if ('navigate' in client && client.url !== absolute) {
        await client.navigate(absolute).catch(() => undefined);
      }
      return;
    }
  }
  await self.clients.openWindow(absolute);
}

// Allow the page to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
