import type { ImageSource } from 'expo-image';
import type { ShopItem } from '@/types/shop';
import { itemPlaceholder } from './item-placeholder';

// Both shop and room use this catalog-code registry. Replace placeholders here with final assets.
const itemAssets: Readonly<Record<string, ImageSource>> = {};
export function itemSource(item: ShopItem, inRoom = false): ImageSource { return itemAssets[item.code] ?? itemPlaceholder(item, !(inRoom && item.slot === 'RUG')); }
