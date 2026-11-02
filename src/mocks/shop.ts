import type { ItemGrade, ItemSlot, ShopItem } from '../types/shop';
import { categoryForSlot } from '../utils/shop';

// Preview data based on the backend seed at 98441b9; never a fallback for API catalog failures.
function item(code: string, slot: ItemSlot, name: string, grade: ItemGrade, price: number, minLevel: number, defaultOwned = false, roomSize?: number): ShopItem {
  return { id: `mock-${code}`, code, slot, category: categoryForSlot(slot), name, grade, price, minLevel, defaultOwned, ...(roomSize ? { roomSize } : {}) };
}
export const mockShopItems: readonly ShopItem[] = [
  item('basic_clock', 'CLOCK', '시계', 'BASIC', 0, 1, true),
  item('basic_window', 'WINDOW', '창문', 'BASIC', 0, 1, true),
  item('basic_desk', 'DESK', '책상', 'BASIC', 0, 1, true),
  item('sparkle_stand', 'LAMP', '반짝 스탠드', 'COMMON', 60, 1),
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
  item('spacious_two_room', 'ROOM', '넓은 투룸', 'RARE', 150, 5, false, 6),
  item('dream_mansion', 'ROOM', '꿈의 대저택', 'EPIC', 300, 10, false, 8),
];
