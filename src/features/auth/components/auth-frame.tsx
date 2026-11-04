import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { characterPlaceholder } from '@/features/home/assets/room-placeholder';

export function AuthFrame({ title, subtitle, tab, busy, children }: PropsWithChildren<{
  title: string;
  subtitle: string;
  tab?: 'login' | 'signup';
  busy?: boolean;
}>) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            <View style={styles.hero}>
              <Image source={characterPlaceholder} style={styles.character} contentFit="contain" accessibilityLabel="다마GoC치 캐릭터" />
            </View>
            <GameCard>
              {tab && <View style={styles.tabs}>
                {(['login', 'signup'] as const).map((item) => <Pressable key={item} disabled={busy} accessibilityRole="tab" accessibilityState={{ selected: tab === item, disabled: busy }} onPress={() => router.replace(item === 'login' ? '/login' : '/signup')} style={[styles.tab, tab === item && styles.selected]}>
                  <Text style={styles.tabLabel}>{item === 'login' ? '로그인' : '회원가입'}</Text>
                </Pressable>)}
              </View>}
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.body}>{subtitle}</Text>
              {children}
            </GameCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthMessage({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  return <Text accessibilityRole={error ? 'alert' : undefined} style={[styles.message, error && styles.error]}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GameColors.sky },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, paddingVertical: Spacing.four, justifyContent: 'center' },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.two },
  character: { width: 80, height: 96 },
  title: { ...GameUi.typography.title, color: GameColors.ink },
  body: { ...GameUi.typography.body, color: GameColors.inkMuted },
  tabs: { flexDirection: 'row', backgroundColor: GameColors.paper, borderRadius: GameUi.radius.button, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, padding: 3, gap: 3 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  selected: { backgroundColor: GameColors.yellow, borderColor: GameColors.ink },
  tabLabel: { ...GameUi.typography.body, fontWeight: '800', color: GameColors.ink },
  message: { ...GameUi.typography.body, color: GameColors.greenDark },
  error: { color: GameColors.coral },
});
