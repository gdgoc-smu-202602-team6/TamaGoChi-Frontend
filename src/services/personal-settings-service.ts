import { ApiError } from './api/http-client';
import { PersonalSettingsError, type PersonalSettingsService, type ClubPreferencesInput } from '../types/personal-settings';
import { validateNickname } from '../utils/auth-validation';
import { sameMember } from '../utils/club-members';

export function createPersonalSettingsService(backend: Pick<PersonalSettingsService, 'getAccount' | 'getClub'> & { rename: (nickname: string) => Promise<void>; updateClub: (expected: Parameters<PersonalSettingsService['updateClub']>[0], input: Partial<ClubPreferencesInput>) => Promise<void> }): PersonalSettingsService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const task = queue.then(work); queue = task.catch(() => undefined); return task; };
  const definite = (error: unknown) => (error instanceof ApiError && error.kind === 'http' && !!error.status && error.status < 500 && error.status !== 408) || (error instanceof PersonalSettingsError && ['invalid', 'changed'].includes(error.reason));
  const accessLost = (error: unknown) => error instanceof ApiError && (error.kind === 'session' || [401, 403, 404].includes(error.status ?? 0));
  return {
    getAccount: backend.getAccount, getClub: backend.getClub,
    rename: (expected, value) => serial(async () => {
      const nickname = value.trim(); if (validateNickname(nickname)) throw new PersonalSettingsError('invalid');
      const before = await backend.getAccount();
      if (before.id !== expected.id) throw new PersonalSettingsError('changed');
      if (before.nickname === nickname) return before;
      if (before.nickname !== expected.nickname || before.email !== expected.email) throw new PersonalSettingsError('changed');
      try { await backend.rename(nickname); } catch (error) { if (definite(error)) throw error; }
      try { const actual = await backend.getAccount(); if (actual.id === expected.id && actual.nickname === nickname) return actual; }
      catch (error) { if (accessLost(error)) throw error; }
      throw new PersonalSettingsError('uncertain');
    }),
    updateClub: (expected, input) => serial(async () => {
      if (typeof input.partId !== 'string' || typeof input.notificationsOn !== 'boolean') throw new PersonalSettingsError('invalid');
      const before = await backend.getClub(expected.club.id);
      if (before.member.id !== expected.member.id || before.member.userId !== expected.member.userId || before.member.joinedAt !== expected.member.joinedAt) throw new PersonalSettingsError('changed');
      if (!before.parts.some(one => one.id === input.partId)) throw new PersonalSettingsError('changed');
      if (before.member.partId === input.partId && before.notificationsOn === input.notificationsOn) return before;
      if (!sameMember(before.member, expected.member) || before.notificationsOn !== expected.notificationsOn) throw new PersonalSettingsError('changed');
      const body: Partial<ClubPreferencesInput> = { ...(before.member.partId !== input.partId ? { partId: input.partId } : {}), ...(before.notificationsOn !== input.notificationsOn ? { notificationsOn: input.notificationsOn } : {}) };
      try { await backend.updateClub(before, body); } catch (error) { if (definite(error)) throw error; }
      try { const actual = await backend.getClub(expected.club.id); if (actual.member.id !== expected.member.id || actual.member.userId !== expected.member.userId || actual.member.joinedAt !== expected.member.joinedAt) throw new PersonalSettingsError('changed'); if (actual.member.partId === input.partId && actual.notificationsOn === input.notificationsOn) return actual; }
      catch (error) { if (accessLost(error) || (error instanceof PersonalSettingsError && error.reason === 'changed')) throw error; }
      throw new PersonalSettingsError('uncertain');
    }),
  };
}
