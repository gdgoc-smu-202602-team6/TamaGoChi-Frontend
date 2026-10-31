import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameColors, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const insets = useSafeAreaInsets();

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
          <TabButton>공지</TabButton>
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
};

function TabButton({ children, isFocused, style, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      aria-selected={isFocused}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        styles.tabButton,
        { backgroundColor: isFocused ? GameColors.yellow : GameColors.ink },
        state.pressed && styles.pressed,
      ]}>
      <Text style={[styles.tabLabel, { color: isFocused ? GameColors.ink : GameColors.skyLight }]}>
        {children}
      </Text>
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
});
