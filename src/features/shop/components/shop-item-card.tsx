import { StyleSheet, Text, View } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { GameColors, GameUi } from '@/constants/theme';
import type { ShopItem, ShopOverview } from '@/types/shop';
import { itemPurchaseState } from '@/utils/shop';
import { gradeStyles } from '../constants';
import { ItemPreview } from './item-preview';

export function ShopItemCard({ item, shop, pending, disabled, onPurchase }: {
  item: ShopItem; shop: ShopOverview; pending: boolean; disabled: boolean; onPurchase: () => void;
}) {
  const state = itemPurchaseState(item, shop);
  const grade = gradeStyles[item.grade];
  const label = pending ? '확인 중…' : state === 'equipped' ? '장착 중' : state === 'owned' ? '보유 중' : state === 'locked' ? `LV.${item.minLevel} 필요` : state === 'unaffordable' ? 'Bolt 부족' : `${item.price.toLocaleString()} Bolt 구매`;
  return <GameCard style={styles.card} contentStyle={styles.surface}>
    <View style={styles.preview}>
      <ItemPreview item={item} locked={state === 'locked'} />
      <View pointerEvents="none" style={styles.badges}>
        <Text style={[styles.badge, { backgroundColor: grade.color }]}>{grade.label}</Text>
        <Text style={[styles.badge, styles.level]}>LV.{item.minLevel}</Text>
      </View>
    </View>
    <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>{item.name}</Text>
    <Text style={styles.price}>{item.price.toLocaleString()} Bolt{item.roomSize ? ` · ${item.roomSize}×${item.roomSize}` : ''}</Text>
    <GameButton compact label={label} accessibilityLabel={`${item.name} · ${label}`} variant={state === 'owned' || state === 'equipped' ? 'success' : 'primary'} disabled={disabled || state !== 'available'} onPress={onPurchase} />
  </GameCard>;
}
const styles = StyleSheet.create({
  card: { width: '48.5%', minWidth: 0 },
  surface: { flex: 1, backgroundColor: GameColors.paper, padding: 9, gap: 8 },
  preview: { borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 16, overflow: 'hidden' },
  badges: { position: 'absolute', top: 5, left: 5, right: 5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 3 },
  badge: { ...GameUi.typography.caption, fontSize: 10, lineHeight: 15, color: GameColors.paper, borderWidth: 2, borderColor: GameColors.ink, borderRadius: 12, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  level: { color: GameColors.ink, backgroundColor: GameColors.cream },
  name: { ...GameUi.typography.body, fontSize: 16, lineHeight: 23, fontWeight: '800', color: GameColors.ink, minHeight: 46 },
  price: { ...GameUi.typography.caption, color: GameColors.inkMuted, flexGrow: 1 },
});
