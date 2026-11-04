import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/components/ui/game-card';
import { ProgressMeter } from '@/components/ui/progress-meter';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { CharacterSprite } from '@/components/character-sprite';
import type { ProfileInventory } from '@/utils/profile-inventory';
import type { ProfileOverview } from '@/types/profile';

export function ProfileCard({ profile, inventory, inventoryLoading }: { profile: ProfileOverview; inventory: ProfileInventory | null; inventoryLoading: boolean }) {
  const progress = Math.max(0, profile.xp - profile.levelXp), target = profile.nextLevelXp - profile.levelXp;
  return <GameCard contentStyle={styles.surface}>
    <View style={styles.avatar}><CharacterSprite accessories={inventory?.accessories} label={inventory ? `내 캐릭터, ${inventory.accessories.length ? inventory.accessories.map(item => item.name).join(', ') : '장착한 액세서리 없음'}` : '내 캐릭터, 장착 정보 확인 전'} /></View>
    <View style={styles.info}>
      <View style={styles.heading}><Text accessibilityRole="header" style={styles.nickname}>{profile.nickname}</Text><Text style={styles.level}>LV.{profile.level}</Text></View>
      <ProgressMeter value={progress} target={target} label="레벨 XP 진행률" />
      <Text style={styles.caption}>{profile.xp.toLocaleString()} / {profile.nextLevelXp.toLocaleString()} XP</Text>
      <Text style={styles.caption}>다음 레벨까지 {Math.max(0, profile.nextLevelXp - profile.xp).toLocaleString()} XP</Text>
      <Text style={styles.caption}>함께한 지 {profile.dayNumber}일째</Text>
      {!inventory && <Text style={styles.caption}>{inventoryLoading ? '장착 정보 확인 중…' : '장착 정보 확인 필요'}</Text>}
    </View>
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: GameColors.paper, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 82, height: 104, backgroundColor: '#F1BAD5', borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 20, padding: 10 },
  info: { flex: 1, minWidth: 0, gap: Spacing.one },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  nickname: { ...GameUi.typography.title, color: GameColors.ink, flexShrink: 1 },
  level: { ...GameUi.typography.caption, fontWeight: '800', color: GameColors.paper, backgroundColor: '#526BC5', borderWidth: 2, borderColor: GameColors.ink, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
});
