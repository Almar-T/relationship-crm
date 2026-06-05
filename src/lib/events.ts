/**
 * Tiny pub/sub so the UI can refresh after a mutation without a heavyweight
 * state library. Framework-free — services emit a domain event, hooks listen.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify that the contact data changed (create/update/delete/contacted). */
export function emitDataChanged(): void {
  for (const listener of listeners) listener();
}

export function onDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
