import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameColors, Spacing } from '@/constants/theme';
import { UnreadBadge } from '@/components/ui/unread-badge';
import { useSelectedNoticeUnread } from '@/state/notice-unread-context';
import { unreadDescription } from '@/utils/notice-unread';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const unread = useSelectedNoticeUnread();

  return (
    <Tabs style={styles.container}>
      <TabSlot style={styles.content} />
      <TabList
        accessibilityRole="tablist"
        style={[
          styles.tabList,
          {
            backgroundColor: GameColors.ink,
            borderTopColor: GameColors.ink,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton>내 방</TabButton>
        </TabTrigger>
        <TabTrigger name="notice" href="/notice" asChild>
          <TabButton unread={{ count: unread.count, description: unread.club ? unreadDescription(unread.club.name, unread.count) : '선택한 동아리 없음' }}>공지</TabButton>
        </TabTrigger>
        <TabTrigger name="shop" href="/shop" asChild>
          <TabButton>상점</TabButton>
        </TabTrigger>
        <TabTrigger name="mypage" href="/mypage" asChild>
          <TabButton>마이</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

// Derive the host ref type from Pressable; the router's slot type targets View.
type TabButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  children: ReactNode;
  isFocused?: boolean;
  href?: string;
  unread?: { count: number | null; description: string };
};

function TabButton({ children, isFocused, style, unread, ...props }: TabButtonProps) {
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
        { backgroundColor: isFocused ? GameColors.yellow : GameColors.ink },
        state.pressed && styles.pressed,
      ]}>
      <View style={styles.labelRow}><Text style={[styles.tabLabel, { color: isFocused ? GameColors.ink : GameColors.skyLight }]}>
        {children}
      </Text>{unread && <UnreadBadge count={unread.count} />}</View>
      {unread && <Text nativeID="notice-tab-unread-description" style={styles.description}>{unread.description}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabList: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabLabel: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  description: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
