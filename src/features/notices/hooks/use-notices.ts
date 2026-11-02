import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useGameServices } from '@/state/game-services';
import type { Notice, NoticeBoard, NoticeFilter } from '@/types/notice';
import { appendNoticePage } from '@/utils/notice';

export type NoticeDetail = { open: boolean; loading: boolean; notice?: Notice; error?: string; readError?: string };
export function useNotices(clubId: string) {
  const { notices: service } = useGameServices();
  const [filter, setFilter] = useState<NoticeFilter>({});
  const [board, setBoard] = useState<NoticeBoard | null>(null), [details, setDetails] = useState<Record<string, NoticeDetail>>({});
  const [loading, setLoading] = useState(true), [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null), [pageError, setPageError] = useState<string | null>(null), [counterError, setCounterError] = useState(false);
  const alive = useRef(true), version = useRef(0), counterVersion = useRef(0), moreBusy = useRef<number | null>(null);
  const snapshot = useRef<NoticeBoard | null>(null), detailRef = useRef<Record<string, NoticeDetail>>({}), opening = useRef(new Set<string>()), pageTokens = useRef(new Set<string>());
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const updateBoard = useCallback((next: NoticeBoard | null) => { snapshot.current = next; setBoard(next); }, []);
  const updateDetail = useCallback((id: string, next: NoticeDetail) => { const values = { ...detailRef.current, [id]: next }; detailRef.current = values; setDetails(values); }, []);

  const refresh = useCallback(async () => {
    const request = ++version.current;
    setLoading(true); setError(null); setPageError(null); setCounterError(false); setLoadingMore(false);
    updateBoard(null); detailRef.current = {}; setDetails({}); pageTokens.current = new Set();
    try {
      const next = await service.getBoard(clubId, filter);
      if (!alive.current || version.current !== request) return;
      const category = next.categories.find(one => one.id === filter.categoryId);
      if (filter.categoryId && !category) { setFilter({}); return; }
      if (filter.subcategoryId && !category?.subcategories.some(one => one.id === filter.subcategoryId)) { setFilter({ categoryId: filter.categoryId }); return; }
      if (next.page.nextPageToken) pageTokens.current.add(next.page.nextPageToken);
      updateBoard(next);
    } catch (error) {
      if (alive.current && version.current === request) setError(error instanceof ApiError && error.status === 404 ? '이 동아리의 공지에 접근할 수 없어요. 동아리 목록을 다시 확인해 주세요.' : '공지를 불러오지 못했어요. 다시 시도해 주세요.');
    } finally { if (alive.current && version.current === request) setLoading(false); }
  }, [service, clubId, filter, updateBoard]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const loadMore = useCallback(async () => {
    const request = version.current, token = snapshot.current?.page.nextPageToken;
    if (!token || moreBusy.current === request) return;
    moreBusy.current = request; setLoadingMore(true); setPageError(null);
    try {
      const next = await service.listNotices(clubId, filter, token);
      if (!alive.current || request !== version.current || !snapshot.current) return;
      if (next.nextPageToken && pageTokens.current.has(next.nextPageToken)) throw new ApiError('response');
      if (next.nextPageToken) pageTokens.current.add(next.nextPageToken);
      updateBoard({ ...snapshot.current, page: { items: appendNoticePage(snapshot.current.page.items, next.items), nextPageToken: next.nextPageToken } });
    } catch (error) {
      if (alive.current && request === version.current) {
        if (error instanceof ApiError && error.status === 404) {
          version.current++; updateBoard(null); detailRef.current = {}; setDetails({}); setLoadingMore(false);
          setError('공지 접근 권한이 바뀌었어요. 동아리 목록을 다시 확인해 주세요.');
        } else setPageError('다음 공지를 불러오지 못했어요. 다시 시도해 주세요.');
      }
    } finally { if (moreBusy.current === request) moreBusy.current = null; if (alive.current && request === version.current) setLoadingMore(false); }
  }, [service, clubId, filter, updateBoard]);

  const openNotice = useCallback(async (id: string, retry = false) => {
    const request = version.current, key = `${request}:${id}`, previous = detailRef.current[id];
    if (opening.current.has(key)) return;
    if (previous?.open && !retry) { updateDetail(id, { ...previous, open: false }); return; }
    opening.current.add(key); updateDetail(id, { open: true, loading: true });
    try {
      const notice = await service.getNotice(clubId, id);
      if (!alive.current || request !== version.current) return;
      updateDetail(id, { open: true, loading: !notice.read, notice });
      if (!notice.read) {
        try { await service.markRead(clubId, id); }
        catch (error) {
          if (alive.current && request === version.current) updateDetail(id, { open: true, loading: false, notice, readError: apiErrorMessage(error) });
          return;
        }
      }
      if (!alive.current || request !== version.current || !snapshot.current) return;
      const readNotice = { ...notice, read: true };
      updateDetail(id, { open: true, loading: false, notice: readNotice });
      updateBoard({ ...snapshot.current, page: { ...snapshot.current.page, items: snapshot.current.page.items.map(one => one.id === id ? readNotice : one) } });
      opening.current.delete(key); // Closing the body need not wait for the count refresh.
      const countRequest = ++counterVersion.current;
      try {
        const unreadCount = await service.getUnreadCount(clubId);
        if (alive.current && request === version.current && countRequest === counterVersion.current && snapshot.current) {
          updateBoard({ ...snapshot.current, unreadCount }); setCounterError(false);
        }
      } catch { if (alive.current && request === version.current && countRequest === counterVersion.current) setCounterError(true); }
    } catch (error) {
      if (alive.current && request === version.current) updateDetail(id, { open: true, loading: false, error: error instanceof ApiError && error.status === 404 ? '공지를 찾을 수 없거나 접근 권한이 바뀌었어요. 목록을 새로 불러와 주세요.' : '공지 내용을 불러오지 못했어요.' });
    } finally { opening.current.delete(key); }
  }, [service, clubId, updateDetail, updateBoard]);

  return { board, filter, setFilter, details, loading, loadingMore, error, pageError, counterError, refresh, loadMore, openNotice };
}
