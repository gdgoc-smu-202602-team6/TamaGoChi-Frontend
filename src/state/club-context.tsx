import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import type { JoinedClub, NoticeService } from '@/types/notice';

export type ClubSelectionStore = { get: () => Promise<string | null>; set: (id: string | null) => Promise<void> };
type ClubState = { status: 'loading' | 'ready' | 'error'; clubs: readonly JoinedClub[]; selectedId: string | null; switching: boolean; error: string | null };
const ClubContext = createContext<(ClubState & { refresh: () => Promise<void>; selectClub: (id: string) => Promise<void> }) | null>(null);

export function ClubProvider({ children, service, store, enabled }: PropsWithChildren<{ service: NoticeService; store: ClubSelectionStore; enabled: boolean }>) {
  const [state, setState] = useState<ClubState>({ status: 'loading', clubs: [], selectedId: null, switching: false, error: null });
  const current = useRef(state), mounted = useRef(true), busy = useRef(false);
  const update = useCallback((next: ClubState) => { current.current = next; setState(next); }, []);
  const refresh = useCallback(async () => {
    if (!enabled || busy.current) return;
    busy.current = true;
    update({ ...current.current, status: 'loading', error: null });
    try {
      const clubs = await service.listMyClubs(), saved = current.current.selectedId ?? await store.get();
      if (!mounted.current) return;
      const selectedId = clubs.find(club => club.id === saved)?.id ?? clubs[0]?.id ?? null;
      await store.set(selectedId);
      if (mounted.current) update({ status: 'ready', clubs, selectedId, switching: false, error: null });
    } catch {
      if (mounted.current) update({ ...current.current, status: 'error', switching: false, error: '가입한 동아리를 확인하지 못했어요. 다시 불러와 주세요.' });
    } finally { busy.current = false; }
  }, [service, store, enabled, update]);
  const selectClub = useCallback(async (id: string) => {
    if (busy.current || current.current.status !== 'ready' || id === current.current.selectedId || !current.current.clubs.some(club => club.id === id)) return;
    busy.current = true;
    update({ ...current.current, switching: true, error: null });
    try {
      await store.set(id);
      if (mounted.current) update({ ...current.current, selectedId: id, switching: false });
    } catch {
      if (mounted.current) update({ ...current.current, switching: false, error: '동아리 선택을 저장하지 못했어요. 다시 선택해 주세요.' });
    } finally { busy.current = false; }
  }, [store, update]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { mounted.current = false; subscription.remove(); };
  }, [refresh]);
  const value = useMemo(() => ({ ...state, refresh, selectClub }), [state, refresh, selectClub]);
  return <ClubContext value={value}>{children}</ClubContext>;
}
export function useClubs() { const value = useContext(ClubContext); if (!value) throw new Error('useClubs requires ClubProvider'); return value; }
