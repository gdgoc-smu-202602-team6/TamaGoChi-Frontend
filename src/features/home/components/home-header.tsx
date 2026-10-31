import { StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { HomeOverview } from '@/types/home';

export function HomeHeader({ profile }: { profile: HomeOverview['profile'] }) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.brand}>다마GoC치</Text>
        <View accessible accessibilityLabel={`${profile.bolt} Bolt`} style={styles.balance}>
          <PixelIcon name="bolt" size={25} />
          <Text style={styles.bolt}>{profile.bolt.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.identity}>
          <Text style={styles.nickname}>{profile.nickname}의 방</Text>
          <View accessible accessibilityRole="image" accessibilityLabel={`하트 ${profile.hearts} / ${StudyRules.maxHearts}`} style={styles.hearts}>
            <Text style={styles.heartLabel}>HEART</Text>
            {Array.from({ length: StudyRules.maxHearts }, (_, index) => <PixelIcon key={index} name="heart" size={20} muted={index >= profile.hearts} />)}
          </View>
        </View>
        <View style={styles.level}><Text style={styles.levelText}>LV.{profile.level}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  brand: { ...GameUi.typography.brand, flex: 1, color: GameColors.yellow, textShadowColor: GameColors.ink, textShadowOffset: { width: 2, height: 3 }, textShadowRadius: 0 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingHorizontal: 14, paddingVertical: 8 },
  bolt: { ...GameUi.typography.number, fontSize: 23, color: GameColors.paper },
  identity: { gap: Spacing.one, flex: 1 },
  nickname: { ...GameUi.typography.caption, color: GameColors.ink },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexWrap: 'wrap' },
  heartLabel: { ...GameUi.typography.caption, color: GameColors.ink, marginRight: Spacing.one, fontSize: 10 },
  level: { backgroundColor: GameColors.cream, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  levelText: { ...GameUi.typography.number, color: GameColors.ink, fontSize: 19 },
});
