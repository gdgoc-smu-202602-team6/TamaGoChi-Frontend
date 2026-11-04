import type { PaletteColor } from '@/types/notice';

export const PaletteLabels: Record<PaletteColor, string> = { RED: '빨강', ORANGE: '주황', YELLOW: '노랑', GREEN: '초록', BLUE: '파랑', PURPLE: '보라', PINK: '분홍', GRAY: '회색' };

// API palette names are mapped to accessible text/background pairs, never used as raw CSS colors.
export const Palette: Record<PaletteColor, { background: string; text: string }> = {
  RED: { background: '#E5D8DF', text: '#514453' }, ORANGE: { background: '#E9E1D5', text: '#514B43' },
  YELLOW: { background: '#ECE7D5', text: '#514D40' }, GREEN: { background: '#D8E5DC', text: '#3D594D' },
  BLUE: { background: '#DCE5F2', text: '#435574' }, PURPLE: { background: '#E3DEEE', text: '#55496D' },
  PINK: { background: '#EADFE8', text: '#644C60' }, GRAY: { background: '#E4E7EC', text: '#4D5564' },
};
