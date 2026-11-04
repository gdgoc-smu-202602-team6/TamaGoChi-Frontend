import { StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { HomeOverview } from '@/types/home';

/** Room status row under the top bar: Heart on the left, Bug state on the right. */
export function HomeStatus({ profile, bugs }: { profile: HomeOverview['profile']; bugs: number }) {
  return (
    <View style={styles.row}>
      <View accessible accessibilityRole="image" accessibilityLabel={`하트 ${profile.hearts} / ${StudyRules.maxHearts}`} style={styles.hearts}>
        {Array.from({ length: StudyRules.maxHearts }, (_, index) => <PixelIcon key={index} name="heart" size={22} muted={index >= profile.hearts} />)}
      </View>
      <View style={[styles.status, bugs > 0 && styles.bugStatus]}>
        <PixelIcon name={bugs > 0 ? 'bug' : 'heart'} size={18} />
        <Text style={styles.statusText}>{bugs > 0 ? `버그 ${bugs}` : '깨끗한 방'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingVertical: 4, paddingHorizontal: 10 },
  bugStatus: { backgroundColor: GameColors.alertLight },
  statusText: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink },
});
