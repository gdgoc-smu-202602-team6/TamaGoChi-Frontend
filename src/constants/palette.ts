import type { PaletteColor } from '@/types/notice';

// API palette names are mapped to accessible text/background pairs, never used as raw CSS colors.
export const Palette: Record<PaletteColor, { background: string; text: string }> = {
  RED: { background: '#CC555E', text: '#FFFFFF' }, ORANGE: { background: '#F0AA60', text: '#24213D' },
  YELLOW: { background: '#F6D85F', text: '#24213D' }, GREEN: { background: '#C8E4A7', text: '#24213D' },
  BLUE: { background: '#526BC5', text: '#FFFFFF' }, PURPLE: { background: '#7750AD', text: '#FFFFFF' },
  PINK: { background: '#F1BAD5', text: '#24213D' }, GRAY: { background: '#DFE4EC', text: '#24213D' },
};
