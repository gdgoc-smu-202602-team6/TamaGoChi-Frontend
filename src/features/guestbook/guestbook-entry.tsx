import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, type StyleProp, type ViewStyle } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { useGameServices } from '@/state/game-services';

export function GuestbookEntry({ label = '내 방명록', onPress, style }: { label?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { guestbook, revision } = useGameServices(), [badge, setBadge] = useState<{ revision: number; count: number } | null>(null);
  const count = badge?.revision === revision ? badge.count : null;
  useFocusEffect(useCallback(() => { let active = true, version = 0; const refresh = () => { const request = ++version; void guestbook.getNewCount().then(value => { if (active && request === version) setBadge({ revision, count: value }); }).catch(() => { if (active && request === version) setBadge(null); }); }; refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); }); return () => { active = false; sub.remove(); }; }, [guestbook, revision]));
  return <GameButton compact variant="secondary" icon="mail" label={label} accessory={<UnreadBadge count={count} />} accessibilityLabel={count ? `${label}, 새 글 ${count}개` : label} style={style} onPress={onPress ?? (() => router.push('/guestbook'))} />;
}
