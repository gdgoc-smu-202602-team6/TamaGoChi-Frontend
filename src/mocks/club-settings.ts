import { createClubSettingsService } from '../services/club-settings-service';
import { ClubSettingsError } from '../types/club-settings';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, mockClubCatalog, mockInviteCodes, type MockApplicationStore } from './clubs';
import { readCreatedMockClubs } from './created-clubs';
import { MOCK_CLUB_SETTINGS_KEY, readMockClubMetadata } from './club-settings-data';

export function createMockClubSettingsService(storage: MockApplicationStore) {
  const access = createMockClubAdminService(storage);
  return createClubSettingsService({
    async get(id) {
      if (!(await access.getPermissions(id)).includes('club.update')) throw new ClubSettingsError('forbidden');
      const club = (await joinedMockClubs(storage)).find(one => one.id === id)!;
      const created = (await readCreatedMockClubs(storage)).find(one => one.id === id), registry = await readMockClubMetadata(storage);
      const entry = Object.hasOwn(registry, id) ? registry[id] : undefined;
      const inviteCode = entry?.inviteCode ?? created?.inviteCode ?? Object.keys(mockInviteCodes).find(code => mockInviteCodes[code] === id)!;
      return { ...club, inviteCode, etag: `"${entry?.revision ?? 0}"`, createdAt: created?.createdAt ?? '2026-11-01T00:00:00Z' };
    },
    async apply(id, action, current) {
      const registry = await readMockClubMetadata(storage);
      const created = await readCreatedMockClubs(storage);
      // A fresh record check models the server's conditional name update.
      const entry = Object.hasOwn(registry, id) ? registry[id] : undefined;
      if (`"${entry?.revision ?? 0}"` !== current.etag) throw new ClubSettingsError('changed');
      let inviteCode = current.inviteCode;
      if (action.kind === 'rotate') {
        const used = new Set([...Object.keys(mockInviteCodes), ...created.map(one => one.inviteCode), ...Object.values(registry).map(one => one.inviteCode)]);
        do { inviteCode = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join(''); } while (used.has(inviteCode));
      }
      if (!created.some(one => one.id === id) && !mockClubCatalog.some(one => one.id === id)) throw new ClubSettingsError('forbidden');
      try { await storage.setItem(MOCK_CLUB_SETTINGS_KEY, JSON.stringify({ version: 1, clubs: { ...registry, [id]: { name: action.kind === 'rename' ? action.name : current.name, inviteCode, revision: (entry?.revision ?? 0) + 1 } } })); }
      catch { throw new ClubSettingsError('storage'); }
    },
  });
}
