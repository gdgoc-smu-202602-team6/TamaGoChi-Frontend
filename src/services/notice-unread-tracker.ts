export type UnreadEntry = { readonly status: 'checking' | 'ready' | 'error'; readonly count: number | null };
export type UnreadSnapshot = { readonly scope: unknown; readonly entries: Readonly<Record<string, UnreadEntry>> };
const empty: UnreadSnapshot = { scope: null, entries: {} };

// A fresh membership snapshot is a new scope, even when the same club was rejoined.
export function createNoticeUnreadTracker(read: (clubId: string) => Promise<number>) {
  let snapshot = empty, generation = 0;
  const listeners = new Set<() => void>(), versions = new Map<string, number>(), pending = new Map<string, Promise<void>>();
  const emit = (next: UnreadSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const put = (id: string, entry: UnreadEntry) => emit({ ...snapshot, entries: { ...snapshot.entries, [id]: entry } });
  function setScope(scope: unknown, ids: readonly string[]) {
    if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('Invalid unread scope');
    generation++; versions.clear(); pending.clear();
    ids.forEach(id => versions.set(id, 0));
    emit({ scope, entries: Object.fromEntries(ids.map(id => [id, { status: 'checking', count: null }])) });
  }
  function invalidate(id: string) {
    if (!versions.has(id)) return;
    versions.set(id, versions.get(id)! + 1); pending.delete(id);
    put(id, { status: 'checking', count: null });
  }
  function refresh(id: string): Promise<void> {
    if (!versions.has(id)) return Promise.resolve();
    const existing = pending.get(id); if (existing) return existing;
    const request = versions.get(id)! + 1, scopeGeneration = generation;
    versions.set(id, request); put(id, { status: 'checking', count: null });
    const isCurrent = () => generation === scopeGeneration && versions.get(id) === request;
    const task = Promise.resolve().then(() => read(id)).then(count => {
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid unread count');
      if (isCurrent()) put(id, { status: 'ready', count });
    }).catch(() => { if (isCurrent()) put(id, { status: 'error', count: null }); })
      .finally(() => { if (isCurrent()) pending.delete(id); });
    pending.set(id, task); return task;
  }
  async function refreshAll() {
    const scopeGeneration = generation, ids = [...versions.keys()]; let index = 0;
    await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
      while (index < ids.length && generation === scopeGeneration) await refresh(ids[index++]);
    }));
  }
  return { setScope, invalidate, refresh, refreshAll, getSnapshot: () => snapshot, getServerSnapshot: () => empty,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
