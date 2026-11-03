import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import type { JoinedClub, NoticeService } from '@/types/notice';

export type ClubSelectionStore = { get: () => Promise<string | null>; set: (id: string | null) => Promise<void> };
type ClubState = { status: 'loading' | 'ready' | 'error'; clubs: readonly JoinedClub[]; selectedId: string | null; switching: boolean; error: string | null };
const ClubContext = createContext<(ClubState & { refresh: () => Promise<void>; selectClub: (id: string) => Promise<boolean>; forgetClub: (id: string) => Promise<void> }) | null>(null);

export function ClubProvider({ children, service, store, enabled }: PropsWithChildren<{ service: NoticeService; store: ClubSelectionStore; enabled: boolean }>) {
  const [state, setState] = useState<ClubState>({ status: 'loading', clubs: [], selectedId: null, switching: false, error: null });
  const current = useRef(state), mounted = useRef(true), busy = useRef(false);
  const refreshTask = useRef<Promise<void> | null>(null);
  const version = useRef(0), idleTask = useRef<Promise<unknown> | null>(null);
  const update = useCallback((next: ClubState) => { current.current = next; setState(next); }, []);
  const refresh = useCallback(() => {
    if (refreshTask.current) return refreshTask.current;
    if (!enabled || busy.current) return Promise.resolve();
    const request = version.current;
    busy.current = true;
    update({ ...current.current, status: 'loading', error: null });
    const task = (async () => {
      try {
        const clubs = await service.listMyClubs(), saved = current.current.selectedId ?? await store.get();
        if (!mounted.current || request !== version.current) return;
        const selectedId = clubs.find(club => club.id === saved)?.id ?? clubs[0]?.id ?? null;
        await store.set(selectedId);
        if (mounted.current && request === version.current) update({ status: 'ready', clubs, selectedId, switching: false, error: null });
      } catch {
        if (mounted.current && request === version.current) update({ ...current.current, status: 'error', switching: false, error: '가입한 동아리를 확인하지 못했어요. 다시 불러와 주세요.' });
      } finally { busy.current = false; }
    })().finally(() => { refreshTask.current = null; if (idleTask.current === task) idleTask.current = null; });
    refreshTask.current = task;
    idleTask.current = task;
    return task;
  }, [service, store, enabled, update]);
  const selectClub = useCallback((id: string) => {
    if (!mounted.current || busy.current || current.current.status !== 'ready' || !current.current.clubs.some(club => club.id === id)) return Promise.resolve(false);
    if (id === current.current.selectedId) return Promise.resolve(true);
    const request = version.current;
    busy.current = true;
    update({ ...current.current, switching: true, error: null });
    const task = (async () => {
      try {
        await store.set(id);
        if (mounted.current && request === version.current) { update({ ...current.current, selectedId: id, switching: false }); return true; }
      } catch {
        if (mounted.current && request === version.current) update({ ...current.current, switching: false, error: '동아리 선택을 저장하지 못했어요. 다시 선택해 주세요.' });
      } finally { busy.current = false; }
      return false;
    })().finally(() => { if (idleTask.current === task) idleTask.current = null; });
    idleTask.current = task;
    return task;
  }, [store, update]);
  const forgetClub = useCallback(async (id: string) => {
    version.current++;
    const remaining = current.current.clubs.filter(one => one.id !== id), selectedId = remaining.some(one => one.id === current.current.selectedId) ? current.current.selectedId : remaining[0]?.id ?? null;
    update({ status: 'ready', clubs: remaining, selectedId, switching: false, error: null });
    // Clear memory immediately. Earlier list/selection replies cannot restore the removed club.
    if (idleTask.current) await idleTask.current.catch(() => undefined);
    if (mounted.current) await refresh();
  }, [refresh, update]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { mounted.current = false; subscription.remove(); };
  }, [refresh]);
  const value = useMemo(() => ({ ...state, refresh, selectClub, forgetClub }), [state, refresh, selectClub, forgetClub]);
  return <ClubContext value={value}>{children}</ClubContext>;
}
export function useClubs() { const value = useContext(ClubContext); if (!value) throw new Error('useClubs requires ClubProvider'); return value; }
