import { Image } from 'expo-image';
import { GameColors } from '@/constants/theme';
import { svgSource } from '@/utils/pixel-art';

const paths = {
  back: '<path d="m14 5-7 7 7 7"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  play: '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke-linejoin="round"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  settings: '<path d="m9.5 3-.6 2.1-2 .9L5 5l-2 3.5 1.5 1.6v2.2L3 14l2 3.5 2-.6 1.9 1.1.6 2h4l.6-2 1.9-1.1 2 .6 2-3.5-1.5-1.7v-2.2L20 8.5 18 5l-2 .9-1.9-.8-.6-2.1Z"/><circle cx="11.5" cy="11.5" r="3"/>',
  refresh: '<path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
  notice: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4"/>',
  shop: '<path d="M5 8h14l1 13H4ZM9 8V6a3 3 0 0 1 6 0v2"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
  book: '<path d="M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4ZM12 6v16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  group: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6M19 21v-2a7 7 0 0 0-2-5"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/>',
  folder: '<path d="M3 6h7l2 3h9v12H3Z"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13 7 4 4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  visit: '<path d="M3 11 12 4l9 7"/><path d="M6 10v10h12V10"/><path d="m10 15 2 2 4-4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
} as const;
export type UiIconName = keyof typeof paths;
/** Line icon. `fill` paints filled shapes (such as the play triangle) separately from the outline. */
export function UiIcon({ name, size = 22, color = GameColors.ink, fill }: { name: UiIconName; size?: number; color?: string; fill?: string }) {
  const source = svgSource(`<g stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${paths[name].replaceAll('currentColor', fill ?? color)}</g>`, 24, 24);
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}
