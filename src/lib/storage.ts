/**
 * Storage durability helpers. By default browsers may evict IndexedDB under
 * storage pressure; calling `navigator.storage.persist()` asks the browser to
 * mark our data as persistent so it is NOT auto-cleared. For installed PWAs
 * (Add to Home Screen) this is typically granted automatically.
 */

/** Request persistent storage if not already granted. Best-effort, safe. */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Whether the browser currently guarantees our storage won't be auto-evicted. */
export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
