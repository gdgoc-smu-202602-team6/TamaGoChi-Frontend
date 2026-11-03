import { ApiError } from './api/http-client';
import { ClubAdminError } from '../types/club-admin';
import { ClubSettingsError, type ClubSettings, type ClubSettingsAction, type ClubSettingsService } from '../types/club-settings';
import { normalizeSettingsAction, sameClubSettings, settingsActionConfirmed } from '../utils/club-settings';

export function settingsAccessLost(error: unknown) {
  return (error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0))
    || (error instanceof ClubAdminError && ['forbidden', 'not-found'].includes(error.reason)) || (error instanceof ClubSettingsError && error.reason === 'forbidden');
}
export function createClubSettingsService(backend: { get: (id: string) => Promise<ClubSettings>; apply: (id: string, action: ClubSettingsAction, current: ClubSettings) => Promise<void> }): ClubSettingsService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  return {
    get: id => serial(() => backend.get(id)),
    mutate: (id, input) => serial(async () => {
      const action = normalizeSettingsAction(input);
      if (action.expected.id !== id) throw new ClubSettingsError('invalid');
      const current = await backend.get(id);
      if (action.kind === 'rename' && settingsActionConfirmed(current, action)) return current;
      if (!sameClubSettings(current, action.expected)) throw new ClubSettingsError('changed');
      try { await backend.apply(id, action, current); }
      catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408) {
          if (error.status === 412) throw new ClubSettingsError('changed');
          throw error;
        }
        if (error instanceof ClubSettingsError && ['invalid', 'changed', 'forbidden'].includes(error.reason)) throw error;
      }
      let actual: ClubSettings;
      try { actual = await backend.get(id); } catch (error) { if (settingsAccessLost(error)) throw error; throw new ClubSettingsError('uncertain'); }
      if (!settingsActionConfirmed(actual, action)) throw new ClubSettingsError('uncertain');
      return actual;
    }),
  };
}
