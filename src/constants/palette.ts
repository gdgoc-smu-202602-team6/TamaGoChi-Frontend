import type { PaletteColor } from '@/types/notice';

export const PaletteLabels: Record<PaletteColor, string> = { RED: '빨강', ORANGE: '주황', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑', PURPLE: '보라', PINK: '분홍', GRAY: '회색' };

// API palette names are mapped to accessible text/background pairs, never used as raw CSS colors.
// Hues follow the v4 category chips, softened to tinted backgrounds with dark text (≥ 4.5:1).
export const Palette: Record<PaletteColor, { background: string; text: string }> = {
  RED: { background: '#FFD9DD', text: '#8E1728' }, ORANGE: { background: '#FFE3C7', text: '#7A3B00' },
  YELLOW: { background: '#FFF0B8', text: '#634A00' }, GREEN: { background: '#D4F2C9', text: '#24601D' },
  BLUE: { background: '#D7E5FF', text: '#2447A3' }, PURPLE: { background: '#E6DCFF', text: '#4E2C9E' },
  PINK: { background: '#FFDCEA', text: '#8E2456' }, GRAY: { background: '#E9E8F1', text: '#46445F' },
};
