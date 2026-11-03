import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { GameButton } from '@/components/ui/game-button';
import { useClubPermission } from '@/hooks/use-club-permission';

export function ClubSettingsEntry({ clubId, clubName }: { clubId: string; clubName: string }) {
  const access = useClubPermission(clubId, 'club.update'), busy = useRef(false), [opening, setOpening] = useState(false);
  async function open() {
    if (busy.current) return;
    busy.current = true; setOpening(true);
    try { if (await access.verify()) router.push({ pathname: '/clubs/[clubId]/settings', params: { clubId } }); }
    finally { busy.current = false; setOpening(false); }
  }
  return access.allowed ? <GameButton compact variant="secondary" label={opening ? '권한 확인 중…' : '동아리 기본 설정'} accessibilityLabel={`${clubName} 동아리 기본 설정`} disabled={opening} onPress={() => { void open(); }} /> : null;
}
