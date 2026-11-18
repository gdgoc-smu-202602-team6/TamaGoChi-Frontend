import { createClubMembersService } from '../services/club-members-service';
import { ClubMembersError, isClubMemberRole } from '../types/club-members';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, mockClubCatalog, type MockApplicationStore } from './clubs';
import { getMockClubParts } from './club-parts-data';
import { getMockMembers, MOCK_MEMBER_ROLES_KEY, readMockRoleRegistry } from './club-members-data';
import { readCreatedMockClubs } from './created-clubs';
import { withMockMemberMutation } from './member-removals-data';
import { removeMockMember } from './remove-member';

export function createMockClubMembersService(storage: MockApplicationStore) {
  const access = createMockClubAdminService(storage);
  return createClubMembersService({
    getPermissions: access.getPermissions,
    async getBoard(id) {
      if (!(await access.getPermissions(id)).includes('members.manage')) throw new ClubMembersError('forbidden');
      const club = (await joinedMockClubs(storage)).find(one => one.id === id)!, details = mockClubCatalog.find(one => one.id === id) ?? (await readCreatedMockClubs(storage)).find(one => one.id === id)!;
      const members = await getMockMembers(storage, id);
      return { club, members, me: members.find(one => one.userId === 'mock-me')!, parts: await getMockClubParts(storage, id, details.parts) };
    },
    patch: (id, action) => withMockMemberMutation(storage, async () => {
      if (!(await access.getPermissions(id)).includes('members.manage')) throw new ClubMembersError('forbidden');
      const members = await getMockMembers(storage, id), current = members.find(one => one.id === action.member.id), role = action.role;
      if (!isClubMemberRole(role)) throw new ClubMembersError('invalid');
      if (!current) throw new ClubMembersError('changed');
      if (role !== 'MANAGER' && current.role === 'MANAGER' && members.filter(one => one.role === 'MANAGER').length === 1) throw new ClubMembersError('last-manager');
      const registry = await readMockRoleRegistry(storage), previous = Object.hasOwn(registry, id) ? registry[id] : {};
      try { await storage.setItem(MOCK_MEMBER_ROLES_KEY, JSON.stringify({ version: 2, clubs: { ...registry, [id]: { ...previous, [current.id]: role } } })); }
      catch { throw new ClubMembersError('storage'); }
      return { ...current, role };
    }),
    remove: (id, member) => removeMockMember(storage, id, member, async () => { if (!(await access.getPermissions(id)).includes('members.manage')) throw new ClubMembersError('forbidden'); }),
  });
}
