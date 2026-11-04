import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameColors, Spacing } from '@/constants/theme';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { useSelectedNoticeUnread } from '@/state/notice-unread-context';
import { unreadDescription } from '@/utils/notice-unread';
import { UiIcon, type UiIconName } from '@/components/ui/ui-icon';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const unread = useSelectedNoticeUnread();

  return (
    <Tabs style={styles.container}>
      <TabSlot style={styles.content} />
      <TabList
        accessibilityRole="tablist"
        style={[styles.tabList, { marginBottom: Math.max(insets.bottom, 10) }]}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton icon="home">내 방</TabButton>
        </TabTrigger>
        <TabTrigger name="notice" href="/notice" asChild>
          <TabButton icon="notice" unread={{ count: unread.count, description: unread.club ? unreadDescription(unread.club.name, unread.count) : '선택한 동아리 없음' }}>공지</TabButton>
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
  unread?: { count: number | null; description: string };
};

function TabButton({ children, icon, isFocused, style, unread, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      aria-describedby={unread ? 'notice-tab-unread-description' : undefined}
      aria-selected={isFocused}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        styles.tabButton,
        isFocused && styles.focused,
        state.pressed && styles.pressed,
      ]}>
      <View style={styles.labelRow}><View style={styles.iconWrap}><UiIcon name={icon} color={isFocused ? GameColors.ink : GameColors.inkSoft} />{unread && <View style={styles.badge}><UnreadBadge count={unread.count} /></View>}</View><Text style={[styles.tabLabel, isFocused && styles.focusedLabel]}>
        {children}
      </Text></View>
      {unread && <Text nativeID="notice-tab-unread-description" style={styles.description}>{unread.description}</Text>}
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
  description: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
