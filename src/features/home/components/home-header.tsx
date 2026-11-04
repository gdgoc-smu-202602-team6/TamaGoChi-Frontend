import { StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { HomeOverview } from '@/types/home';

export function HomeHeader({ profile }: { profile: HomeOverview['profile'] }) {
  return (
    <View style={styles.header}>
          <Text style={styles.nickname}>{profile.nickname}의 방</Text>
          <View accessible accessibilityRole="image" accessibilityLabel={`하트 ${profile.hearts} / ${StudyRules.maxHearts}`} style={styles.hearts}>
            {Array.from({ length: StudyRules.maxHearts }, (_, index) => <PixelIcon key={index} name="heart" size={20} muted={index >= profile.hearts} />)}
          </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  nickname: { ...GameUi.typography.title, fontSize: 18, color: GameColors.ink, flexShrink: 1 },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexWrap: 'wrap' },
});
