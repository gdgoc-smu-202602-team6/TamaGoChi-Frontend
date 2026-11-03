import { createClubMembersService } from '../services/club-members-service';
import { ClubMembersError } from '../types/club-members';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, mockClubCatalog, type MockApplicationStore } from './clubs';
import { getMockClubParts } from './club-parts-data';
import { getMockMembers, MOCK_MEMBER_ROLES_KEY, mockRoles, readMockRoleRegistry } from './club-members-data';
import { readCreatedMockClubs } from './created-clubs';

export function createMockClubMembersService(storage: MockApplicationStore) {
  const access = createMockClubAdminService(storage);
  return createClubMembersService({
    getPermissions: access.getPermissions,
    async getBoard(id) {
      if (!(await access.getPermissions(id)).includes('members.manage')) throw new ClubMembersError('forbidden');
      const club = (await joinedMockClubs(storage)).find(one => one.id === id)!, details = mockClubCatalog.find(one => one.id === id) ?? (await readCreatedMockClubs(storage)).find(one => one.id === id)!;
      const members = await getMockMembers(storage, id);
      return { club, members, me: members.find(one => one.userId === 'mock-me')!, parts: await getMockClubParts(storage, id, details.parts), roles: mockRoles.map(one => ({ ...one, permissions: [...one.permissions] })) };
    },
    async patch(id, action) {
      if (!(await access.getPermissions(id)).includes('members.manage')) throw new ClubMembersError('forbidden');
      const members = await getMockMembers(storage, id), current = members.find(one => one.id === action.member.id), role = mockRoles.find(one => one.id === action.role.id);
      if (!current || !role) throw new ClubMembersError('changed');
      if (!role.permissions.includes('members.manage') && mockRoles.find(one => one.id === current.roleId)?.permissions.includes('members.manage')
        && members.filter(one => mockRoles.find(role => role.id === one.roleId)?.permissions.includes('members.manage')).length === 1) throw new ClubMembersError('last-manager');
      const registry = await readMockRoleRegistry(storage), previous = Object.hasOwn(registry, id) ? registry[id] : {};
      try { await storage.setItem(MOCK_MEMBER_ROLES_KEY, JSON.stringify({ version: 1, clubs: { ...registry, [id]: { ...previous, [current.id]: role.id } } })); }
      catch { throw new ClubMembersError('storage'); }
      return { ...current, roleId: role.id };
    },
  });
}
