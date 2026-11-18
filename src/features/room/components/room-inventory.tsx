import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameColors, GameUi } from '@/constants/theme';
import { ItemPreview } from '@/features/shop/components/item-preview';
import type { RoomLayout, RoomOverview } from '@/types/room';
import type { ShopCategory, ShopItem } from '@/types/shop';

export function RoomInventory({ data, layout, category, disabled, onToggle }: { data: RoomOverview; layout: RoomLayout; category: ShopCategory; disabled: boolean; onToggle: (item: ShopItem) => void }) {
  const items = data.items.filter(item => item.category === category && data.ownedItemIds.includes(item.id));
  return <View style={styles.grid}>
    {!items.length && <Text style={styles.body}>이 분류에 보유한 아이템이 없어요. 상점에서 아이템을 구할 수 있어요.</Text>}
    {items.map(item => {
      const equipped = layout.equipped.some(one => one.itemId === item.id), fixed = equipped && (item.slot === 'ROOM' || item.slot === 'CHARACTER');
      return <Pressable key={item.id} disabled={disabled || fixed} accessibilityRole="button" accessibilityLabel={`${item.name} ${fixed ? item.slot === 'ROOM' ? '현재 방' : '현재 캐릭터' : equipped ? '해제' : '장착'}`} accessibilityState={{ selected: equipped, disabled: disabled || fixed }}
        onPress={() => onToggle(item)} style={[styles.item, equipped && styles.equipped]}>
        <ItemPreview item={item} locked={false} />
        <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
        <Text style={styles.caption}>{fixed ? '해제 불가' : equipped ? '✓ 장착 중' : '눌러서 장착'}{item.slot === 'ROOM' ? ` · ${item.roomSize}×${item.roomSize}` : ''}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Three per row, like the shop.
  item: { width: '31%', padding: 6, gap: 3, backgroundColor: GameColors.paper, borderWidth: GameUi.borderWidth, borderColor: GameColors.border, borderRadius: 16 }, equipped: { backgroundColor: GameColors.greenLight },
  name: { ...GameUi.typography.caption, fontSize: 13, lineHeight: 18, fontWeight: '800', color: GameColors.ink, marginTop: 2 }, body: { ...GameUi.typography.body, color: GameColors.ink }, caption: { ...GameUi.typography.caption, fontSize: 11, lineHeight: 15, color: GameColors.inkMuted },
});
