import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { createNoticeUnreadTracker, type UnreadEntry } from '@/services/notice-unread-tracker';
import type { NoticeService } from '@/types/notice';
import { useClubs } from './club-context';

type UnreadContextValue = { getEntry: (clubId: string) => UnreadEntry | undefined; refreshClub: (clubId: string) => Promise<void>; invalidateClub: (clubId: string) => void; refreshAll: () => Promise<void> };
const UnreadContext = createContext<UnreadContextValue | null>(null);
export function NoticeUnreadProvider({ children, service, enabled, revision }: PropsWithChildren<{ service: NoticeService; enabled: boolean; revision: number }>) {
  const clubs = useClubs(), tracker = useMemo(() => createNoticeUnreadTracker(id => service.getUnreadCount(id)), [service]);
  const scope = useMemo(() => ({ clubs: enabled && clubs.status === 'ready' ? clubs.clubs : null, revision }), [enabled, clubs.status, clubs.clubs, revision]);
  const snapshot = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, tracker.getServerSnapshot);
  useEffect(() => {
    tracker.setScope(scope, scope.clubs?.map(club => club.id) ?? []);
    if (scope.clubs) void tracker.refreshAll();
    const sub = AppState.addEventListener('change', status => { if (status === 'active') void tracker.refreshAll(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void tracker.refreshAll(); }, 60000);
    return () => { sub.remove(); clearInterval(timer); tracker.setScope(null, []); };
  }, [tracker, scope]);
  const refreshClub = useCallback((id: string) => tracker.getSnapshot().scope === scope ? tracker.refresh(id) : Promise.resolve(), [tracker, scope]);
  const invalidateClub = useCallback((id: string) => { if (tracker.getSnapshot().scope === scope) tracker.invalidate(id); }, [tracker, scope]);
  const refreshAll = useCallback(() => tracker.getSnapshot().scope === scope ? tracker.refreshAll() : Promise.resolve(), [tracker, scope]);
  const getEntry = useCallback((id: string) => snapshot.scope === scope && scope.clubs?.some(club => club.id === id) ? snapshot.entries[id] : undefined, [snapshot, scope]);
  const value = useMemo(() => ({ getEntry, refreshClub, invalidateClub, refreshAll }), [getEntry, refreshClub, invalidateClub, refreshAll]);
  return <UnreadContext value={value}>{children}</UnreadContext>;
}
export function useNoticeUnread() { const value = useContext(UnreadContext); if (!value) throw new Error('Unread counts require NoticeUnreadProvider'); return value; }
export function useSelectedNoticeUnread() {
  const clubs = useClubs(), unread = useNoticeUnread();
  const club = clubs.status === 'ready' && !clubs.switching ? clubs.clubs.find(club => club.id === clubs.selectedId) : undefined;
  const entry = club ? unread.getEntry(club.id) : undefined;
  return { club, count: entry?.status === 'ready' ? entry.count : null };
}
