import { ClubAdminError } from '../types/club-admin';
import { NoticeCategoryError, type CategoryAction, type CategoryBoard, type NoticeCategoryService } from '../types/notice-categories';
import { categoryActionConfirmed, normalizeCategoryAction, prepareCategoryAction } from '../utils/notice-categories';
import { ApiError } from './api/http-client';

export function createNoticeCategoryService(backend: { getBoard: (clubId: string) => Promise<CategoryBoard>; apply: (clubId: string, action: CategoryAction) => Promise<void> }): NoticeCategoryService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  const accessLost = (error: unknown) => (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0))
    || (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason)) || (error instanceof NoticeCategoryError && error.reason === 'forbidden');
  function rejection(error: unknown): never {
    if (error instanceof ApiError && error.status === 409) {
      const reason = { 'duplicate-name': 'duplicate', preset: 'preset', 'in-use': 'in-use' } as const;
      if (error.code && Object.hasOwn(reason, error.code)) throw new NoticeCategoryError(reason[error.code as keyof typeof reason]);
    }
    throw error;
  }
  return {
    getBoard: clubId => serial(() => backend.getBoard(clubId)),
    mutate: (clubId, input) => serial(async () => {
      const action = normalizeCategoryAction(input), before = await backend.getBoard(clubId);
      if (!prepareCategoryAction(before, action)) return before;
      try { await backend.apply(clubId, action); }
      catch (error) {
        const deleted = action.kind === 'delete-category' || action.kind === 'delete-subcategory';
        if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408 && !(deleted && error.status === 404)) {
          if (error.status === 404 && action.kind === 'add-subcategory') throw new NoticeCategoryError('missing');
          rejection(error);
        }
        if (error instanceof NoticeCategoryError && ['duplicate', 'preset', 'in-use', 'missing', 'changed', 'forbidden'].includes(error.reason)) throw error;
      }
      let actual: CategoryBoard;
      try { actual = await backend.getBoard(clubId); }
      catch (error) { if (accessLost(error)) throw error; throw new NoticeCategoryError('uncertain'); }
      if (!categoryActionConfirmed(actual, action)) throw new NoticeCategoryError('uncertain');
      return actual;
    }),
  };
}
