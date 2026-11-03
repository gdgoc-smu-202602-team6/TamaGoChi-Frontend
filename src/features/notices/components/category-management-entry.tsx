import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { GameButton } from '@/components/ui/game-button';
import { useClubPermission } from '@/hooks/use-club-permission';

export function CategoryManagementEntry({ clubId, clubName }: { clubId: string; clubName: string }) {
  const access = useClubPermission(clubId, 'noticeCategories.manage'), busy = useRef(false), [opening, setOpening] = useState(false);
  async function open() {
    if (busy.current) return;
    busy.current = true; setOpening(true);
    try { if (await access.verify()) router.push({ pathname: '/clubs/[clubId]/notice-categories', params: { clubId } }); }
    finally { busy.current = false; setOpening(false); }
  }
  if (!access.allowed) return null;
  return <GameButton compact variant="secondary" label={opening ? '권한 확인 중…' : '공지 분류 관리'} accessibilityLabel={`${clubName} 공지 분류 관리`} disabled={opening} onPress={() => { void open(); }} />;
}
