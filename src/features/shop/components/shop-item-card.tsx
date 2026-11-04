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
  const label = pending ? '확인 중…' : state === 'equipped' ? '장착 중' : state === 'owned' ? '보유 중' : state === 'locked' ? `LV.${item.minLevel} 해금` : state === 'unaffordable' ? 'Bolt 부족' : `${item.price.toLocaleString()} Bolt 구매`;
  const variant = state === 'owned' || state === 'equipped' ? 'success' : state === 'locked' ? 'dark' : 'primary';
  return <GameCard style={styles.card} contentStyle={styles.surface}>
    <View style={styles.preview}>
      <ItemPreview item={item} locked={state === 'locked'} />
      <View pointerEvents="none" style={styles.badges}>
        <Text style={[styles.badge, { backgroundColor: grade.color }]}>{grade.label}</Text>
        {item.minLevel > 1 && <Text style={[styles.badge, styles.level]}>LV.{item.minLevel}</Text>}
      </View>
    </View>
    <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>{item.name}</Text>
    <Text style={styles.price}>{item.price.toLocaleString()} Bolt{item.roomSize ? ` · ${item.roomSize}×${item.roomSize}` : ''}</Text>
    <GameButton compact label={label} icon={state === 'locked' ? 'lock' : state === 'equipped' ? 'check' : undefined} accessibilityLabel={`${item.name} · ${label}`} variant={variant} disabled={disabled || state !== 'available'} onPress={onPurchase} />
  </GameCard>;
}
const styles = StyleSheet.create({
  card: { width: '48.5%', minWidth: 0 },
  surface: { flex: 1, backgroundColor: GameColors.paper, padding: 9, gap: 6 },
  preview: { borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 14, overflow: 'hidden' },
  badges: { position: 'absolute', top: 6, left: 6, right: 6, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 3 },
  badge: { ...GameUi.typography.caption, fontSize: 11, lineHeight: 16, fontWeight: '800', color: GameColors.ink, borderWidth: 1.5, borderColor: GameColors.ink, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  level: { color: GameColors.paper, backgroundColor: GameColors.ink },
  name: { ...GameUi.typography.body, fontSize: 16, lineHeight: 22, fontWeight: '800', color: GameColors.ink, marginTop: 4 },
  price: { ...GameUi.typography.caption, color: GameColors.inkMuted, flexGrow: 1, marginBottom: 4 },
});
