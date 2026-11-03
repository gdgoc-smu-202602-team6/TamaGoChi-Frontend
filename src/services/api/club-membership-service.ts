import { createClubMembershipService } from '../club-membership-service';
import type { ClubMember } from '../../types/club-members';
import { parseClubMember } from './club-members-service';
import { isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

export function createApiClubMembershipService(client: HttpClient, userId: string) {
  const path = (id: string) => { if (!isId(id)) throw new ApiError('response'); return `/clubs/${id}`; };
  async function mine() {
    const members: ClubMember[] = [], tokens = new Set<string>(); let token: string | undefined;
    do {
      const value = (await client.request(`/clubs/-/members?userId=me&pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)).data as { items?: unknown[]; nextPageToken?: string } | null;
      if (!value || !Array.isArray(value.items) || (value.nextPageToken !== undefined && (typeof value.nextPageToken !== 'string' || !value.nextPageToken))) throw new ApiError('response');
      for (const item of value.items) { const clubId = (item as Record<string, unknown> | null)?.clubId; if (!isId(clubId)) throw new ApiError('response'); const member = parseClubMember(item, clubId); if (member.userId !== userId) throw new ApiError('response'); members.push(member); }
      token = value.nextPageToken; if (token && tokens.has(token)) throw new ApiError('response'); if (token) tokens.add(token);
    } while (token);
    if (new Set(members.map(one => one.id)).size !== members.length || new Set(members.map(one => one.clubId)).size !== members.length) throw new ApiError('response');
    return members;
  }
  return createClubMembershipService({
    async getState(id) {
      const endpoint = path(id), member = (await mine()).find(one => one.clubId === id);
      if (!member) return { kind: 'absent' };
      try {
        const club = (await client.request(endpoint)).data as Record<string, unknown> | null;
        if (!club || club.id !== id || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 1) throw new ApiError('response');
        return { kind: 'member', data: { club: { id, name: club.name, memberCount: club.memberCount as number }, member } };
      } catch (error) { if (error instanceof ApiError && error.status === 404 && !(await mine()).some(one => one.clubId === id)) return { kind: 'absent' }; throw error; }
    },
    async remove(id, expected) { if (!isId(expected.id)) throw new ApiError('response'); await client.request(`${path(id)}/members/${expected.id}`, { method: 'DELETE' }); },
  });
}
