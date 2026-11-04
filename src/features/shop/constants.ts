import { GameColors } from '@/constants/theme';
import type { ItemGrade, ShopCategory } from '@/types/shop';

export const categoryLabels: Record<ShopCategory, string> = { FURNITURE: '가구', WALLPAPER: '벽지', ACCESSORY: '캐릭터', ROOM_SIZE: '방 확장' };
// Badge colors keep navy text readable; tints follow the v4 item thumbnails.
export const gradeStyles: Record<ItemGrade, { label: string; color: string; tint: string }> = {
  BASIC: { label: '기본', color: GameColors.paper, tint: '#FFF1C9' },
  COMMON: { label: '커먼', color: '#9BDD86', tint: '#DDF5D3' },
  RARE: { label: '레어', color: '#9CC2FF', tint: '#DDE9FF' },
  EPIC: { label: '에픽', color: '#C9B3FF', tint: '#ECE3FF' },
};
