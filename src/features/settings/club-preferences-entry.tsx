import { router } from 'expo-router';
import { GameButton } from '@/components/ui/game-button';
export function ClubPreferencesEntry({ clubId, clubName, disabled }: { clubId: string; clubName: string; disabled?: boolean }) { return <GameButton compact variant="secondary" label="내 소속·알림 설정" accessibilityLabel={`${clubName} 내 소속·알림 설정`} disabled={disabled} onPress={() => router.push({ pathname: '/clubs/[clubId]/preferences', params: { clubId } })} />; }
