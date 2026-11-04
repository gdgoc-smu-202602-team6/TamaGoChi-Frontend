import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/components/ui/game-card';
import { ProgressMeter } from '@/components/ui/progress-meter';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { CharacterSprite } from '@/components/character-sprite';
import { PixelIcon } from '@/components/ui/pixel-icon';
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
      <View style={styles.wallet}><PixelIcon name="bolt" size={18} /><Text accessibilityLabel={`${profile.balance} Bolt`} style={styles.balance}>{profile.balance.toLocaleString()} Bolt</Text></View>
      <Text style={styles.caption}>{inventory ? `보유 아이템 ${inventory.ownedCount}개 · ` : ''}{profile.dayNumber}일째 함께하는 중</Text>
      {!inventory && <Text style={styles.caption}>{inventoryLoading ? '장착 정보 확인 중…' : '장착 정보 확인 필요'}</Text>}
    </View>
  </GameCard>;
}
const styles = StyleSheet.create({
  surface: { backgroundColor: GameColors.paper, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 88, height: 108, backgroundColor: '#FFE0EA', borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 18, padding: 10 },
  info: { flex: 1, minWidth: 0, gap: Spacing.one },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  nickname: { ...GameUi.typography.title, color: GameColors.ink, flexShrink: 1 },
  level: { ...GameUi.typography.caption, fontWeight: '900', color: GameColors.paper, backgroundColor: GameColors.accent, borderWidth: 1.5, borderColor: GameColors.ink, borderRadius: GameUi.radius.badge, paddingHorizontal: 9, paddingVertical: 2, overflow: 'hidden' },
  caption: { ...GameUi.typography.caption, color: GameColors.inkMuted },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  balance: { ...GameUi.typography.body, fontSize: 16, color: GameColors.ink, fontWeight: '800' },
});
