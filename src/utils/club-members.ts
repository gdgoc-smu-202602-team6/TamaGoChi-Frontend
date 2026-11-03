import type { ClubMember, ClubRole } from '../types/club-members';

export function sameMember(a: ClubMember, b: ClubMember) {
  return a.id === b.id && a.clubId === b.clubId && a.userId === b.userId && a.nickname === b.nickname && a.partId === b.partId && a.roleId === b.roleId && a.joinedAt === b.joinedAt;
}
export function sameRole(a: ClubRole, b: ClubRole) {
  return a.id === b.id && a.name === b.name && a.permissions.length === b.permissions.length && a.permissions.every(one => b.permissions.includes(one));
}
