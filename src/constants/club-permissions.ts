import type { ClubPermission } from '@/types/club-admin';

export const ClubPermissionLabels: Record<ClubPermission, string> = {
  'club.update': '동아리 이름·초대 코드 관리', 'parts.manage': '파트 관리', 'noticeCategories.manage': '공지 분류 관리',
  'applications.decide': '가입 신청 승인·거절', 'members.manage': '부원·역할 관리', 'notices.write': '공지 작성·수정·삭제',
};
