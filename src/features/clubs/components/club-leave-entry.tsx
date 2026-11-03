import { router } from 'expo-router';
import { GameButton } from '@/components/ui/game-button';

export function ClubLeaveEntry({ clubId, clubName, disabled }: { clubId: string; clubName: string; disabled?: boolean }) {
  return <GameButton compact variant="secondary" label="동아리 탈퇴" accessibilityLabel={`${clubName} 동아리 탈퇴`} disabled={disabled} onPress={() => router.push({ pathname: '/clubs/[clubId]/leave', params: { clubId } })} />;
}
