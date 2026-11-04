import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameButton } from '@/components/ui/game-button';
import { GameCard } from '@/components/ui/game-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { GameColors, GameUi, Spacing } from '@/constants/theme';
import { shopCategories, type ShopCategory } from '@/types/shop';
import { ShopItemCard } from './components/shop-item-card';
import { categoryLabels } from './constants';
import { useShop } from './hooks/use-shop';

export function ShopScreen() {
  const [category, setCategory] = useState<ShopCategory>('FURNITURE');
  const shop = useShop();
  const entries = shop.data?.items.filter(item => item.category === category) ?? [];
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={entries}
      numColumns={2}
      keyExtractor={item => item.id}
      columnWrapperStyle={styles.row}
      refreshing={shop.refreshing}
      onRefresh={() => { void shop.refresh(); }}
      ListHeaderComponent={<View style={styles.heading}>
        <ScreenHeader title="상점" />
        <SegmentedTabs label="상점 분류" value={category} onChange={setCategory} options={shopCategories.map(id => ({ id, name: categoryLabels[id] }))} />
        {shop.error && <GameCard><Text accessibilityRole="alert" style={styles.message}>{shop.error}</Text><GameButton compact label="다시 불러오기" disabled={shop.refreshing || !!shop.purchasing} onPress={() => { void shop.refresh(); }} /></GameCard>}
        {shop.notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{shop.notice}</Text>}
        {shop.refreshing && <ActivityIndicator accessibilityLabel="상점 불러오는 중" color={GameColors.ink} />}
      </View>}
      ListEmptyComponent={!shop.refreshing && !shop.error ? <GameCard><Text style={styles.message}>이 카테고리에 등록된 아이템이 없어요.</Text></GameCard> : undefined}
      renderItem={({ item }) => shop.data ? <ShopItemCard item={item} shop={shop.data} pending={shop.purchasing === item.id} disabled={!!shop.purchasing || shop.refreshing || shop.unverified} onPurchase={() => { void shop.purchase(item); }} /> : null}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: GameColors.sky },
  list: { width: '100%', maxWidth: GameUi.contentWidth, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  heading: { gap: 12, marginBottom: Spacing.three },
  row: { justifyContent: 'space-between', marginBottom: Spacing.three },
  message: { ...GameUi.typography.body, color: GameColors.ink },
  notice: { ...GameUi.typography.body, fontWeight: '700', color: GameColors.ink, padding: 12, backgroundColor: GameColors.cream, borderWidth: GameUi.borderWidth, borderColor: GameColors.border, borderRadius: 12, overflow: 'hidden' },
});
