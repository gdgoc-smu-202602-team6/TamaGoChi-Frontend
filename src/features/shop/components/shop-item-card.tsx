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
  // Short button text for the three-column grid; the price sits above it and the full text stays in the accessibility label.
  const label = pending ? '확인 중' : state === 'equipped' ? '장착 중' : state === 'owned' ? '보유 중' : state === 'locked' ? `LV.${item.minLevel}` : state === 'unaffordable' ? 'Bolt 부족' : '구매';
  const spoken = pending ? '확인 중' : state === 'locked' ? `LV.${item.minLevel} 해금` : state === 'available' ? `${item.price.toLocaleString()} Bolt 구매` : label;
  const variant = state === 'owned' || state === 'equipped' ? 'success' : state === 'locked' ? 'dark' : 'primary';
  return <GameCard style={styles.card} contentStyle={styles.surface}>
    <View style={styles.preview}>
      <ItemPreview item={item} locked={state === 'locked'} />
      <View pointerEvents="none" style={styles.badges}>
        <Text style={[styles.badge, { backgroundColor: grade.color }]}>{grade.label}</Text>
      </View>
    </View>
    <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>{item.name}</Text>
    <Text style={styles.price}>{item.price > 0 ? `${item.price.toLocaleString()} Bolt` : '기본 제공'}{item.roomSize ? ` · ${item.roomSize}×${item.roomSize}` : ''}</Text>
    <GameButton compact label={label} icon={state === 'locked' ? 'lock' : state === 'equipped' ? 'check' : undefined} accessibilityLabel={`${item.name} · ${spoken}`} variant={variant} disabled={disabled || state !== 'available'} onPress={onPurchase} />
  </GameCard>;
}
const styles = StyleSheet.create({
  // Three per row: flex fills full rows, maxWidth keeps a short last row at the same size.
  card: { flex: 1, maxWidth: '31.6%', minWidth: 0 },
  surface: { flex: 1, backgroundColor: GameColors.paper, padding: 6, gap: 3 },
  preview: { borderWidth: GameUi.borderWidth, borderColor: GameColors.ink, borderRadius: 10, overflow: 'hidden' },
  badges: { position: 'absolute', top: 4, left: 4, flexDirection: 'row' },
  badge: { ...GameUi.typography.caption, fontSize: 10, lineHeight: 14, fontWeight: '800', color: GameColors.ink, borderWidth: 1.5, borderColor: GameColors.ink, borderRadius: 8, paddingHorizontal: 5, overflow: 'hidden' },
  name: { ...GameUi.typography.caption, fontSize: 13, lineHeight: 18, fontWeight: '800', color: GameColors.ink, marginTop: 3 },
  price: { ...GameUi.typography.caption, fontSize: 11, lineHeight: 15, color: GameColors.inkMuted, flexGrow: 1, marginBottom: 3 },
});
