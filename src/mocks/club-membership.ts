import { createClubMembershipService } from '../services/club-membership-service';
import { ClubMembershipError } from '../types/club-membership';
import { getMockMembers } from './club-members-data';
import { joinedMockClubs, type MockApplicationStore } from './clubs';
import { removeMockMember } from './remove-member';

export function createMockClubMembershipService(storage: MockApplicationStore) {
  return createClubMembershipService({
    async getState(id) {
      const club = (await joinedMockClubs(storage)).find(one => one.id === id);
      if (!club) return { kind: 'absent' };
      const member = (await getMockMembers(storage, id)).find(one => one.userId === 'mock-me');
      return member ? { kind: 'member', data: { club, member } } : { kind: 'absent' };
    },
    remove: (id, expected) => removeMockMember(storage, id, expected, async () => { const member = (await getMockMembers(storage, id)).find(one => one.userId === 'mock-me'); if (member && member.id !== expected.id) throw new ClubMembershipError('changed'); }),
  });
}
