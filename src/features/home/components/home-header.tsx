import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PixelIcon } from '@/components/ui/pixel-icon';
import { StudyRules } from '@/constants/study';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import type { HomeOverview } from '@/types/home';

/** Room status row over the room's empty top corners: Heart on the left, a Bug badge on the right while bugs remain. */
export function HomeStatus({ profile, bugs, style }: { profile: HomeOverview['profile']; bugs: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <View accessible accessibilityRole="image" accessibilityLabel={`청결도 ${profile.hearts} / ${StudyRules.maxHearts}`} style={styles.hearts}>
        <Text style={styles.heartsLabel}>청결</Text>
        {Array.from({ length: StudyRules.maxHearts }, (_, index) => <PixelIcon key={index} name="sparkle" size={20} muted={index >= profile.hearts} />)}
      </View>
      {/* A clean room needs no badge: the full sparkle row already says so. */}
      {bugs > 0 && <View style={styles.status}>
        <PixelIcon name="bug" size={18} />
        <Text style={styles.statusText}>버그 {bugs}</Text>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  // The bug badge's height (18 line + 8 padding + 4 border), so the room does not move when it goes away.
  row: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  heartsLabel: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink, marginRight: 4 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GameColors.alertLight, borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.ink },
});
