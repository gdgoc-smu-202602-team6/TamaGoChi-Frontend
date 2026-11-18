import type { ItemGrade, ItemSlot, PlacementPolicy, ShopItem } from '../types/shop';
import { categoryForSlot } from '../utils/shop';
// Backend seed data (API 0.2.0); API mode always uses the returned catalog instead.
const placementPolicies: Partial<Record<ItemSlot, PlacementPolicy>> = {
  CLOCK: { surfaceKind: 'WALL', width: 1, height: 1, step: .5, solid: true },
  WINDOW: { surfaceKind: 'WALL', width: 2, height: 2, step: .5, solid: true },
  DESK: { surfaceKind: 'FLOOR', width: 2, height: 1, step: .5, solid: true },
  BOOKSHELF: { surfaceKind: 'FLOOR', width: 1, height: 2, step: .5, solid: true },
  PLANT: { surfaceKind: 'FLOOR', width: 1, height: 1, solid: true },
  RUG: { surfaceKind: 'FLOOR', width: 2, height: 2, solid: false },
  CHARACTER: { surfaceKind: 'FLOOR', width: 1, height: 1, solid: true },
};

// Preview data based on the backend seed of API 0.2.0; never a fallback for API catalog failures.
function item(code: string, slot: ItemSlot, name: string, grade: ItemGrade, price: number, minLevel: number, defaultOwned = false, roomSize?: number): ShopItem {
  return { id: `mock-${code}`, code, slot, category: categoryForSlot(slot), name, grade, price, minLevel, defaultOwned, ...(roomSize ? { roomSize } : {}), ...(placementPolicies[slot] ? { placementPolicy: placementPolicies[slot] } : {}) };
}
export const mockShopItems: readonly ShopItem[] = [
  item('basic_clock', 'CLOCK', '시계', 'BASIC', 0, 1, true),
  item('basic_window', 'WINDOW', '창문', 'BASIC', 0, 1, true),
  item('basic_desk', 'DESK', '책상', 'BASIC', 0, 1, true),
  item('green_plant', 'PLANT', '초록 화분', 'COMMON', 40, 1),
  item('bookshelf_of_knowledge', 'BOOKSHELF', '지식의 책장', 'EPIC', 120, 10),
  item('royal_rug', 'RUG', '왕실 러그', 'RARE', 80, 5),
  item('grubby_wall', 'WALLPAPER', '꼬질꼬질한 벽', 'BASIC', 0, 1, true),
  item('mint_stripe_wallpaper', 'WALLPAPER', '민트 스트라이프', 'RARE', 50, 5),
  item('strawberry_dot_wallpaper', 'WALLPAPER', '딸기 도트 벽지', 'RARE', 50, 5),
  item('pompom_beanie', 'HEAD', '방울 비니', 'RARE', 70, 5),
  item('study_glasses', 'FACE', '공부 안경', 'EPIC', 90, 10),
  item('cozy_scarf', 'NECK', '포근 목도리', 'COMMON', 60, 1),
  item('shabby_gosiwon', 'ROOM', '허름한 고시원', 'BASIC', 0, 1, true, 3),
  item('cozy_one_room', 'ROOM', '아늑한 원룸', 'COMMON', 80, 1, false, 4),
  item('spacious_two_room', 'ROOM', '넓은 투룸', 'RARE', 150, 5, false, 5),
  item('dream_mansion', 'ROOM', '꿈의 대저택', 'EPIC', 300, 10, false, 6),
  item('robot', 'CHARACTER', '로봇', 'BASIC', 0, 1, true),
  item('hamster', 'CHARACTER', '햄스터', 'COMMON', 60, 1),
  item('fox', 'CHARACTER', '여우', 'RARE', 100, 5),
  item('frog', 'CHARACTER', '개구리', 'EPIC', 200, 10),
];
