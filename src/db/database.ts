/**
 * Low-level IndexedDB access. Promise-wrapped, isomorphic (works in both the
 * window and the service worker — it only touches the global `indexedDB`), and
 * deliberately tiny. Higher layers (repositories) speak in domain objects; this
 * layer only knows about object stores and transactions.
 */
import type { Person } from '../types/person';

export const DB_NAME = 'relationship-crm';
export const DB_VERSION = 1;
export const PEOPLE_STORE = 'people';

/** Index names, centralised so queries and migrations stay in sync. */
export const INDEX = {
  nextContactDate: 'by_nextContactDate',
  name: 'by_name',
  createdDate: 'by_createdDate',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      migrate(db, oldVersion);
    };

    request.onsuccess = () => {
      const db = request.result;
      // If another tab triggers an upgrade, close this connection so it does
      // not block the new version.
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Database upgrade blocked by another open tab.'));
  });

  return dbPromise;
}

/** Versioned, additive migrations. Each `case` falls through to the next. */
function migrate(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const store = db.createObjectStore(PEOPLE_STORE, { keyPath: 'id' });
    store.createIndex(INDEX.nextContactDate, 'nextContactDate', { unique: false });
    store.createIndex(INDEX.name, 'name', { unique: false });
    store.createIndex(INDEX.createdDate, 'createdDate', { unique: false });
  }
  // Future migrations: `if (oldVersion < 2) { ... }`
}

/** Promise wrapper around an IDBRequest. */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run `work` inside a transaction and resolve when it commits. */
export async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(PEOPLE_STORE, mode);
    const store = tx.objectStore(PEOPLE_STORE);
    let result: T;
    Promise.resolve(work(store)).then(
      (value) => {
        result = value;
      },
      (err) => {
        reject(err);
        tx.abort();
      },
    );
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

/** Read every Person record. Used by the dashboard, search and SW count. */
export async function getAllPeople(): Promise<Person[]> {
  return withStore('readonly', (store) => promisifyRequest(store.getAll() as IDBRequest<Person[]>));
}
