import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, type StyleProp, type ViewStyle } from 'react-native';
import { GameButton } from '@/components/ui/game-button';
import { IconButton } from '@/components/ui/icon-button';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { useGameServices } from '@/state/game-services';

/** Guestbook shortcut with the NEW count. `icon` renders it as a top-bar icon. */
export function GuestbookEntry({ label = '내 방명록', onPress, style, variant = 'button' }: { label?: string; onPress?: () => void; style?: StyleProp<ViewStyle>; variant?: 'button' | 'icon' }) {
  const { guestbook, revision } = useGameServices(), [badge, setBadge] = useState<{ revision: number; count: number } | null>(null);
  const count = badge?.revision === revision ? badge.count : null;
  useFocusEffect(useCallback(() => { let active = true, version = 0; const refresh = () => { const request = ++version; void guestbook.getNewCount().then(value => { if (active && request === version) setBadge({ revision, count: value }); }).catch(() => { if (active && request === version) setBadge(null); }); }; refresh(); const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); }); return () => { active = false; sub.remove(); }; }, [guestbook, revision]));
  const accessibilityLabel = count ? `${label}, 새 글 ${count}개` : label, open = onPress ?? (() => router.push('/guestbook'));
  if (variant === 'icon') return <IconButton icon="mail" label={accessibilityLabel} badge={<UnreadBadge count={count} />} onPress={open} />;
  return <GameButton compact variant="secondary" icon="mail" label={label} accessory={<UnreadBadge count={count} />} accessibilityLabel={accessibilityLabel} style={style} onPress={open} />;
}
