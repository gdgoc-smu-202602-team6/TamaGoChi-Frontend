import type { ClubMember } from '../types/club-members';

export function sameMember(a: ClubMember, b: ClubMember) {
  return a.id === b.id && a.clubId === b.clubId && a.userId === b.userId && a.nickname === b.nickname && a.partId === b.partId && a.role === b.role && a.joinedAt === b.joinedAt;
}
