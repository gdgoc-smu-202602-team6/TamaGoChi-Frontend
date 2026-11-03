import type { ImageSource } from 'expo-image';
import type { ShopItem } from '@/types/shop';
import { itemPlaceholder } from './item-placeholder';

// Both shop and room use this catalog-code registry. Replace placeholders here with final assets.
const itemAssets: Readonly<Record<string, ImageSource>> = {};
export function itemSource(item: ShopItem, inRoom = false): ImageSource {
  // The thumbnail's ground shadow belongs only under floor furniture when placed in a room.
  const withShadow = !inRoom || ['DESK', 'BOOKSHELF', 'PLANT'].includes(item.slot);
  return itemAssets[item.code] ?? itemPlaceholder(item, withShadow);
}
