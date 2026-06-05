/**
 * Client-side Web Push management: permission flow, subscribe/unsubscribe, and
 * syncing the subscription to the Cloudflare Worker. The Worker only ever
 * stores the opaque push subscription — no contact data leaves the device.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const PUSH_API_URL = import.meta.env.VITE_PUSH_API_URL as string | undefined;

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushStatus {
  supported: boolean;
  /** True only on iOS once installed to the Home Screen (standalone). */
  installable: boolean;
  permission: PushPermission;
  subscribed: boolean;
  configured: boolean;
}

export const pushService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /** iOS only delivers push to a PWA added to the Home Screen. */
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari legacy flag
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  },

  isConfigured(): boolean {
    return Boolean(VAPID_PUBLIC_KEY && PUSH_API_URL);
  },

  async getStatus(): Promise<PushStatus> {
    const supported = this.isSupported();
    if (!supported) {
      return {
        supported: false,
        installable: false,
        permission: 'unsupported',
        subscribed: false,
        configured: this.isConfigured(),
      };
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return {
      supported: true,
      installable: this.isStandalone(),
      permission: Notification.permission as PushPermission,
      subscribed: sub !== null,
      configured: this.isConfigured(),
    };
  },

  async requestPermission(): Promise<NotificationPermission> {
    return Notification.requestPermission();
  },

  /** Subscribe to push and register the subscription with the Worker. */
  async subscribe(): Promise<PushSubscription> {
    if (!this.isConfigured()) {
      throw new Error('Push is not configured: set VITE_VAPID_PUBLIC_KEY and VITE_PUSH_API_URL.');
    }
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted.');
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
    }

    await fetchJson(`${PUSH_API_URL}/subscribe`, sub.toJSON());
    return sub;
  },

  async unsubscribe(): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    if (this.isConfigured()) {
      await fetchJson(`${PUSH_API_URL}/unsubscribe`, { endpoint: sub.endpoint }).catch(() => {
        // Best-effort: still unsubscribe locally even if the server call fails.
      });
    }
    await sub.unsubscribe();
  },

  /** Ask the Worker to send this device a test push right now. */
  async sendTest(): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) throw new Error('Not subscribed.');
    await fetchJson(`${PUSH_API_URL}/test`, { endpoint: sub.endpoint });
  },
};

async function fetchJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request to ${url} failed: ${res.status}`);
  }
}

/** VAPID public keys are base64url; PushManager wants raw key bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Back with an explicit ArrayBuffer so the type is BufferSource-compatible.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
