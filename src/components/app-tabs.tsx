import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameColors, Spacing } from '@/constants/theme';
import { GroundStrip } from '@/components/ui/ground-strip';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { useSelectedNoticeUnread } from '@/state/notice-unread-context';
import { unreadDescription } from '@/utils/notice-unread';
import { UiIcon, type UiIconName } from '@/components/ui/ui-icon';

// One drawn tab bar for iOS, Android and web: the v4 floating navy bar with a yellow pill over the
// ground strip. The system tab bar (NativeTabs) cannot take this shape or sit on the ground.
export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const unread = useSelectedNoticeUnread();
  const barBottom = Math.max(insets.bottom, 10);

  return (
    <Tabs style={styles.container}>
      <TabSlot style={styles.content} />
      {/* v4 ground behind the floating bar: the grass edge shows a little above and beside it. */}
      <GroundStrip height={barBottom + 50} />
      <TabList
        accessibilityRole="tablist"
        style={[styles.tabList, { marginBottom: barBottom }]}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton icon="home">내 방</TabButton>
        </TabTrigger>
        <TabTrigger name="notice" href="/notice" asChild>
          <TabButton icon="notice" unread={unread.count} description={unread.club ? unreadDescription(unread.club.name, unread.count) : '선택한 동아리 없음'}>공지</TabButton>
        </TabTrigger>
        <TabTrigger name="shop" href="/shop" asChild>
          <TabButton icon="shop">상점</TabButton>
        </TabTrigger>
        <TabTrigger name="mypage" href="/mypage" asChild>
          <TabButton icon="person">마이</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

// Derive the host ref type from Pressable; the router's slot type targets View.
type TabButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  children: ReactNode;
  icon: UiIconName;
  isFocused?: boolean;
  href?: string;
  unread?: number | null;
  /** Spoken after the label, such as the unread notice count; works with VoiceOver, TalkBack and web. */
  description?: string;
};

function TabButton({ children, icon, isFocused, style, unread, description, ...props }: TabButtonProps) {
  const name = typeof children === 'string' ? children : undefined;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={name && description ? `${name}, ${description}` : name}
      accessibilityState={{ selected: !!isFocused }}
      aria-selected={isFocused}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        styles.tabButton,
        isFocused && styles.focused,
        state.pressed && styles.pressed,
      ]}>
      <View style={styles.labelRow}><View style={styles.iconWrap}><UiIcon name={icon} color={isFocused ? GameColors.ink : GameColors.inkSoft} />{unread !== undefined && <View style={styles.badge}><UnreadBadge count={unread} /></View>}</View><Text style={[styles.tabLabel, isFocused && styles.focusedLabel]}>
        {children}
      </Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.sky,
  },
  content: {
    flex: 1,
  },
  // Floating navy bar with a yellow pill for the current tab, as in the v4 mockup.
  tabList: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '94%',
    maxWidth: 520,
    marginTop: Spacing.two,
    padding: 6,
    gap: Spacing.one,
    backgroundColor: GameColors.ink,
    borderRadius: 24,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  focused: {
    backgroundColor: GameColors.yellow,
  },
  pressed: {
    opacity: 0.8,
  },
  tabLabel: { fontSize: 11, fontWeight: '700', lineHeight: 16, color: GameColors.inkSoft },
  focusedLabel: { color: GameColors.ink, fontWeight: '800' },
  labelRow: { alignItems: 'center', gap: 2 },
  iconWrap: { position: 'relative' },
  badge: { position: 'absolute', top: -6, right: -14 },
});
