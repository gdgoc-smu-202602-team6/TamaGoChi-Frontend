import type { ImageProps } from 'expo-image';
import type { DesignerRoom } from '@/constants/room-geometry';
import type { PlacementSurface } from '@/types/room';
import type { ShopItem } from '@/types/shop';
import { itemPlaceholder } from './item-placeholder';

/**
 * Designer pixel art keyed by catalog Item.code. Files in assets/game are the originals in
 * assets/game/source cropped to their content and upscaled 8x (nearest neighbour).
 * `pixels` is the crop size in source pixels: the room draws it at the base room's pixel scale.
 * Wall art is drawn in perspective for one wall and mirrored for the other.
 * Rooms also carry their floor and wall measurements (see DesignerRoom).
 */
export type ItemArt = { source: ImageProps['source']; pixels: readonly [number, number]; wall?: Extract<PlacementSurface, 'LEFT_WALL' | 'RIGHT_WALL'>; room?: DesignerRoom };
const art: Readonly<Record<string, ItemArt>> = {
  basic_window: { source: require('@/assets/game/window.png'), pixels: [13, 21], wall: 'LEFT_WALL' },
  basic_clock: { source: require('@/assets/game/clock.png'), pixels: [11, 12], wall: 'RIGHT_WALL' },
  basic_desk: { source: require('@/assets/game/desk.png'), pixels: [19, 21] },
  pompom_beanie: { source: require('@/assets/game/beanie.png'), pixels: [18, 10] },
  study_glasses: { source: require('@/assets/game/glasses.png'), pixels: [12, 5] },
  cozy_scarf: { source: require('@/assets/game/scarf.png'), pixels: [16, 7] },
  // Room tiers: 3×3, 4×4, 5×5 and 6×6 floors.
  shabby_gosiwon: { source: require('@/assets/game/room-gosiwon.png'), pixels: [72, 93], room: { pixels: [72, 93], centerX: 36, backY: 48.5, halfWidth: 35, wallHeight: 48 } },
  cozy_one_room: { source: require('@/assets/game/room-one-room.png'), pixels: [94, 104], room: { pixels: [94, 104], centerX: 47, backY: 48.5, halfWidth: 46, wallHeight: 48 } },
  spacious_two_room: { source: require('@/assets/game/room-two-room.png'), pixels: [120, 121], room: { pixels: [120, 121], centerX: 60, backY: 52.5, halfWidth: 59, wallHeight: 52 } },
  dream_mansion: { source: require('@/assets/game/room-mansion.png'), pixels: [144, 143], room: { pixels: [144, 143], centerX: 72, backY: 62.5, halfWidth: 71, wallHeight: 62 } },
  // Characters (2-frame animations).
  robot: { source: require('@/assets/game/character.gif'), pixels: [28, 39] },
  hamster: { source: require('@/assets/game/hamster.gif'), pixels: [28, 31] },
  fox: { source: require('@/assets/game/fox.gif'), pixels: [27, 32] },
  frog: { source: require('@/assets/game/frog.gif'), pixels: [26, 30] },
};

export function itemArt(item: ShopItem): ItemArt | undefined {
  return art[item.code];
}

// Both shop and room use this registry. Items without designer art keep the code-drawn placeholder.
export function itemSource(item: ShopItem, inRoom = false, onWall = false): ImageProps['source'] {
  const designed = art[item.code];
  if (designed) return designed.source;
  // The thumbnail's ground shadow belongs only under floor furniture when placed in a room.
  const withShadow = !inRoom || ['DESK', 'BOOKSHELF', 'PLANT'].includes(item.slot);
  return itemPlaceholder(item, withShadow, onWall);
}
