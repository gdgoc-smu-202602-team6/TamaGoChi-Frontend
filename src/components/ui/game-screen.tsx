import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { ScreenHeader } from './screen-header';

export function GameScreen({ title, subtitle, onBack, backLabel, backDisabled, centered, children }: PropsWithChildren<{ title: string; subtitle?: string; onBack?: () => void; backLabel?: string; backDisabled?: boolean; /** Vertically centre short content, such as a single result card. */ centered?: boolean }>) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={title} onBack={onBack} backLabel={backLabel} backDisabled={backDisabled} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, centered && styles.centered]}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky },
  scroll: { flexGrow: 1, paddingTop: Spacing.three, paddingBottom: Spacing.four },
  content: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center', paddingHorizontal: 18, gap: Spacing.three },
  centered: { flexGrow: 1, justifyContent: 'center', paddingBottom: Spacing.five },
  subtitle: { ...GameUi.typography.body, color: GameColors.ink },
});
