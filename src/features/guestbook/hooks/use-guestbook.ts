import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiErrorMessage } from '@/services/api/http-client';
import { useGameServices } from '@/state/game-services';
import { GuestbookError, type GuestbookBoard, type GuestbookEntry, type GuestbookTarget } from '@/types/guestbook';
import { sameGuestbookEntry } from '@/utils/guestbook';

export function guestbookErrorText(error: unknown) {
  if (error instanceof GuestbookError) return { invalid: '방명록은 공백을 제외해 1~60자로 입력해 주세요.', changed: '대상이나 글이 바뀌었어요. 현재 방명록을 다시 확인해 주세요.', forbidden: '현재 이 글을 작성하거나 삭제할 수 없어요.', storage: '방명록 요청 기록을 읽거나 저장하지 못했어요. 기존 기록은 유지돼요.', uncertain: '요청 결과를 확인하지 못했어요. 방명록을 다시 읽어 먼저 확인해 주세요. 등록·삭제 요청은 자동 반복하지 않아요.', 'already-created': '이미 등록 응답을 확인한 요청이 있어요. 목록 확인 후 새 글 작성을 선택해 주세요.' }[error.reason];
  if (error instanceof ApiError && [403, 404].includes(error.status ?? 0)) return '현재 이 동아리나 방명록에 접근할 수 없어요. 가입 상태를 확인해 주세요.';
  return apiErrorMessage(error);
}
export function useGuestbook(target: GuestbookTarget) {
  const { guestbook: service, invalidate } = useGameServices();
  const [board, setBoard] = useState<GuestbookBoard | null>(null), [draft, setDraft] = useState(''), [verified, setVerified] = useState(false), [operation, setOperation] = useState<'read' | 'more' | 'create' | 'delete' | 'reset' | null>('read'), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null), [checkedAt, setCheckedAt] = useState<string | null>(null), [checkError, setCheckError] = useState<string | null>(null);
  const alive = useRef(true), busy = useRef(false), current = useRef(board), tokens = useRef(new Set<string>());
  const apply = useCallback((value: GuestbookBoard) => { current.current = value; setBoard(value); setVerified(true); }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = useCallback(async (kind: NonNullable<typeof operation>, work: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setOperation(kind); setVerified(false); setError(null);
    try { await work(); }
    catch (reason) { if (alive.current) { if (reason instanceof ApiError && (reason.kind === 'session' || [401, 403, 404].includes(reason.status ?? 0))) { current.current = null; setBoard(null); setDraft(''); } setError(guestbookErrorText(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, []);
  const refresh = useCallback(() => run('read', async () => { const at = new Date().toISOString(); setCheckedAt(null); setCheckError(null); const next = await service.getPage(target); if (alive.current) { tokens.current.clear(); apply(next); if (target.kind === 'mine') setCheckedAt(at); } }), [run, service, target, apply]);
  useFocusEffect(useCallback(() => { void refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => sub.remove(); }, [refresh]));
  // Save only after a successful first page has been committed to the screen.
  useEffect(() => { if (!checkedAt || target.kind !== 'mine') return; let active = true; void service.markChecked(checkedAt).then(() => { if (active) invalidate(); }).catch(reason => { if (active) setCheckError(`새 글 확인 시각을 저장하지 못했어요. ${guestbookErrorText(reason)}`); }); return () => { active = false; }; }, [checkedAt, target.kind, service, invalidate]);
  const more = () => run('more', async () => { const before = current.current, token = before?.nextPageToken; if (!before || !token || tokens.current.has(token)) throw new ApiError('response'); const next = await service.getPage(target, token); if (next.ownerId !== before.ownerId || next.nextPageToken === token || (next.nextPageToken && tokens.current.has(next.nextPageToken))) throw new ApiError('response'); const rows = new Map(before.items.map(one => [one.id, one])); for (const row of next.items) { const old = rows.get(row.id); if (old && !sameGuestbookEntry(old, row)) throw new ApiError('response'); if (!old) rows.set(row.id, row); } if (alive.current) { tokens.current.add(token); apply({ ...next, items: [...rows.values()] }); } });
  const create = () => { if (!verified || !board?.canWrite || board.createStatus !== 'ready') return; const ownerId = board.ownerId, body = draft; return run('create', async () => { await service.create(target, ownerId, body); if (!alive.current) return; setDraft(''); setNotice('등록 응답을 확인했어요. 목록에서 글을 확인해 주세요.'); apply(await service.getPage(target)); invalidate(); }); };
  const remove = (entry: GuestbookEntry) => { if (!verified) return; return run('delete', async () => { await service.remove(target, entry); if (alive.current) { setNotice('현재 방명록에 대상 글이 없음을 확인했어요.'); apply(await service.getPage(target)); tokens.current.clear(); invalidate(); } }); };
  const reset = () => run('reset', async () => { await service.resetIntent(target); if (alive.current) { setDraft(''); setNotice('목록을 확인한 뒤 새 내용을 직접 입력해 주세요.'); apply(await service.getPage(target)); } });
  return { board, draft, setDraft, verified, operation, error, checkError, notice, refresh, more, create, remove, reset };
}
