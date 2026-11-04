import type { ClubMember } from './club-members';
import type { ClubPart } from './club-join';
import type { JoinedClub } from './notice';
import type { RoomAppearance, RoomCondition } from './room';

export type Friend = {
  member: ClubMember;
  part: ClubPart;
  appearance: RoomAppearance;
  condition: RoomCondition;
  level: number;
  todaySeconds: number;
  likeCount: number;
  likedByMe: boolean;
};
export type FriendsBoard = { club: JoinedClub; friends: readonly Friend[] };
export type FriendVisit = { club: JoinedClub; friend: Friend };
export type FriendsService = {
  getBoard: (clubId: string) => Promise<FriendsBoard>;
  getVisit: (clubId: string, memberId: string) => Promise<FriendVisit>;
  setLike: (clubId: string, member: ClubMember, liked: boolean) => Promise<FriendVisit>;
};
export class FriendsError extends Error {
  constructor(readonly reason: 'invalid' | 'changed' | 'uncertain' | 'storage') { super(`Friends ${reason}`); this.name = 'FriendsError'; }
}
