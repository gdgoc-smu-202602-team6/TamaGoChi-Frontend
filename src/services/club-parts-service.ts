import { ApiError } from './api/http-client';
import { ClubAdminError } from '../types/club-admin';
import { ClubPartsError, type ClubPartAction, type ClubPartsBoard, type ClubPartsService } from '../types/club-parts';
import { normalizePartAction, partActionConfirmed, preparePartAction } from '../utils/club-parts';

export function partsAccessLost(error: unknown) {
  return (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0)) || (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason)) || (error instanceof ClubPartsError && error.reason === 'forbidden');
}
export function createClubPartsService(backend: { getBoard: (id: string) => Promise<ClubPartsBoard>; apply: (id: string, action: ClubPartAction) => Promise<void> }): ClubPartsService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  return {
    getBoard: id => serial(() => backend.getBoard(id)),
    mutate: (id, input) => serial(async () => {
      const action = normalizePartAction(input), before = await backend.getBoard(id);
      if (!preparePartAction(before, action)) return before;
      try { await backend.apply(id, action); }
      catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408 && !(action.kind === 'delete' && error.status === 404)) {
          if (error.status === 409 && error.code === 'duplicate-name') throw new ClubPartsError('duplicate');
          if (error.status === 409 && error.code === 'in-use') throw new ClubPartsError('in-use');
          throw error;
        }
        if (error instanceof ClubPartsError && ['invalid', 'forbidden', 'duplicate', 'in-use', 'changed'].includes(error.reason)) throw error;
      }
      let actual: ClubPartsBoard;
      try { actual = await backend.getBoard(id); } catch (error) { if (partsAccessLost(error)) throw error; throw new ClubPartsError('uncertain'); }
      if (!partActionConfirmed(actual, action)) throw new ClubPartsError('uncertain');
      return actual;
    }),
  };
}
