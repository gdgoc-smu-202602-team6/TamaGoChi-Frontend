import { StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { PixelIcon } from '@/components/ui/pixel-icon';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { HomeOverview } from '@/types/home';

export function HomeHeader({ profile, onVisitFriends }: { profile: HomeOverview['profile']; onVisitFriends?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.nickname}>{profile.nickname}의 방</Text>
        <View accessible accessibilityRole="image" accessibilityLabel={`하트 ${profile.hearts} / ${StudyRules.maxHearts}`} style={styles.hearts}>
          {Array.from({ length: StudyRules.maxHearts }, (_, index) => <PixelIcon key={index} name="heart" size={22} muted={index >= profile.hearts} />)}
        </View>
      </View>
      <GameButton label="친구 방" icon="visit" compact variant="secondary" onPress={onVisitFriends} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  nickname: { ...GameUi.typography.brand, fontSize: 22, lineHeight: 30, color: GameColors.ink },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
