import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/components/ui/game-card';
import { ProgressMeter } from '@/components/ui/progress-meter';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { characterPlaceholder } from '@/features/home/assets/room-placeholder';
import type { ProfileOverview } from '@/types/profile';

export function ProfileCard({ profile }: { profile: ProfileOverview }) {
  const progress = Math.max(0, profile.xp - profile.levelXp), target = profile.nextLevelXp - profile.levelXp;
  return <GameCard contentStyle={styles.surface}>
    <View style={styles.avatar}><Image source={characterPlaceholder} contentFit="contain" accessible={false} style={styles.character} /></View>
    <View style={styles.info}>
      <View style={styles.heading}><Text accessibilityRole="header" style={styles.nickname}>{profile.nickname}</Text><Text style={styles.level}>LV.{profile.level}</Text></View>
      <ProgressMeter value={progress} target={target} label="레벨 XP 진행률" />
      <Text style={styles.caption}>{profile.xp.toLocaleString()} / {profile.nextLevelXp.toLocaleString()} XP</Text>
      <Text style={styles.caption}>다음 레벨까지 {Math.max(0, profile.nextLevelXp - profile.xp).toLocaleString()} XP</Text>
      <Text style={styles.caption}>함께한 지 {profile.dayNumber}일째</Text>
    </View>
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: GameColors.paper, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 82, height: 104, backgroundColor: '#F1BAD5', borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 20, padding: 10 },
  character: { width: '100%', height: '100%' },
  info: { flex: 1, minWidth: 0, gap: Spacing.one },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  nickname: { ...GameUi.typography.title, color: GameColors.ink, flexShrink: 1 },
  level: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.paper, backgroundColor: '#526BC5', borderWidth: 2, borderColor: GameColors.ink, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
});
