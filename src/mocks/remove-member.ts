import { ApiError } from '../services/api/http-client';
import type { ClubMember } from '../types/club-members';
import { getMockMembers, mockRoles } from './club-members-data';
import type { MockApplicationStore } from './club-data';
import { saveMockRemoval, withMockMemberMutation } from './member-removals-data';

export function removeMockMember(storage: MockApplicationStore, id: string, expected: ClubMember, authorize: () => Promise<void>) {
  return withMockMemberMutation(storage, async () => {
    await authorize();
    const members = await getMockMembers(storage, id), member = members.find(one => one.id === expected.id);
    if (!member || member.userId !== expected.userId || member.joinedAt !== expected.joinedAt) throw new ApiError('http', 404);
    const manages = (one: ClubMember) => mockRoles.find(role => role.id === one.roleId)?.permissions.includes('members.manage');
    if (manages(member) && members.filter(manages).length === 1) throw new ApiError('http', 409, 'last-manager');
    await saveMockRemoval(storage, member);
  });
}
