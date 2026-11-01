import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { ShopItem } from '@/types/shop';
import { itemPlaceholder } from '../assets/item-placeholder';
import { gradeStyles } from '../constants';

// Register designer assets here by the API catalog's stable code; unknown codes use the slot fallback.
const itemAssets: Readonly<Record<string, ImageSource>> = {};

export function ItemPreview({ item, locked }: { item: ShopItem; locked: boolean }) {
  return <View style={[styles.surface, { backgroundColor: gradeStyles[item.grade].tint }]}>
    <Image source={itemAssets[item.code] ?? itemPlaceholder(item)} contentFit="contain" style={[styles.image, locked && styles.locked]} accessible={false} />
  </View>;
}
const styles = StyleSheet.create({
  surface: { aspectRatio: 1, borderRadius: 13, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  locked: { opacity: 0.4 },
});
