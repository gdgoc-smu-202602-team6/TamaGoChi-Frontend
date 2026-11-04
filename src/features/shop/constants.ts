import { GameColors } from '@/constants/theme';
import type { ItemGrade, ShopCategory } from '@/types/shop';

export const categoryLabels: Record<ShopCategory, string> = { FURNITURE: '가구', WALLPAPER: '벽지', ACCESSORY: '캐릭터', ROOM_SIZE: '방 확장' };
export const gradeStyles: Record<ItemGrade, { label: string; color: string; tint: string }> = {
  BASIC: { label: '기본', color: GameColors.inkMuted, tint: '#DFE4EC' },
  COMMON: { label: '커먼', color: GameColors.greenDark, tint: '#DCE8E1' },
  RARE: { label: '레어', color: GameColors.accent, tint: '#DFE8F3' },
  EPIC: { label: '에픽', color: '#66587F', tint: '#E7E1F0' },
};
