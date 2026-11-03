import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { ShopItem } from '@/types/shop';
import { itemSource } from '../assets/item-assets';
import { gradeStyles } from '../constants';

export function ItemPreview({ item, locked }: { item: ShopItem; locked: boolean }) {
  return <View style={[styles.surface, { backgroundColor: gradeStyles[item.grade].tint }]}>
    <Image source={itemSource(item)} contentFit="contain" style={[styles.image, locked && styles.locked]} accessible={false} />
  </View>;
}
const styles = StyleSheet.create({
  surface: { aspectRatio: 1, borderRadius: 13, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  locked: { opacity: 0.4 },
});
