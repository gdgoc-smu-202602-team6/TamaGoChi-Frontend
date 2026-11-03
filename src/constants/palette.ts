import type { PaletteColor } from '@/types/notice';

export const PaletteLabels: Record<PaletteColor, string> = { RED: '빨강', ORANGE: '주황', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑', PURPLE: '보라', PINK: '분홍', GRAY: '회색' };

// API palette names are mapped to accessible text/background pairs, never used as raw CSS colors.
export const Palette: Record<PaletteColor, { background: string; text: string }> = {
  RED: { background: '#CC555E', text: '#FFFFFF' }, ORANGE: { background: '#F0AA60', text: '#24213D' },
  YELLOW: { background: '#F6D85F', text: '#24213D' }, GREEN: { background: '#C8E4A7', text: '#24213D' },
  BLUE: { background: '#526BC5', text: '#FFFFFF' }, PURPLE: { background: '#7750AD', text: '#FFFFFF' },
  PINK: { background: '#F1BAD5', text: '#24213D' }, GRAY: { background: '#DFE4EC', text: '#24213D' },
};
