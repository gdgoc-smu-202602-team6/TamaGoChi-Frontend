import { useClubPermission } from '@/hooks/use-club-permission';

export function useNoticeWriteAccess(clubId: string) {
  return useClubPermission(clubId, 'notices.write');
}
