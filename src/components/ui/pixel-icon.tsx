import { Image } from 'expo-image';

import { GameColors } from '@/constants/theme';
import { pixelArtSource } from '@/utils/pixel-art';

const shapes = {
  bolt: ['...1111...', '..122221..', '.12233221.', '.12323221.', '.12323221.', '.12323221.', '.12323221.', '.12222221.', '..122221..', '...1111...'],
  heart: ['.11..11.', '12211221', '12322221', '12222221', '.122221.', '..1221..', '...11...'],
  bug: ['..1..1..', '...11...', '.113311.', '12233221', '12233221', '.122221.', '1.1111.1', '..1..1..'],
  hourglass: ['11111111', '.122221.', '.122221.', '..1221..', '...11...', '..1221..', '.123321.', '11111111'],
  cloud: ['....111111....', '..1122222211..', '.122222222221.', '12222222222221', '11111111111111'],
  chest: ['.111111111111.', '12222222222221', '12222222222221', '11111144111111', '13333345433331', '13333344433331', '13333333333331', '13333333333331', '11111111111111'],
} as const;

type PixelIconName = keyof typeof shapes;
type PixelIconProps = { name: PixelIconName; size?: number; muted?: boolean; label?: string };

const fills: Record<PixelIconName, [string, string]> = {
  bolt: [GameColors.yellow, '#FFF1C9'],
  heart: [GameColors.heart, '#FFC4CB'],
  bug: [GameColors.lavender, '#EDE6FF'],
  hourglass: [GameColors.yellow, GameColors.cream],
  cloud: [GameColors.paper, GameColors.paper],
  chest: ['#A9774B', '#C99260'],
};
const sources = Object.fromEntries(Object.entries(shapes).map(([name, rows]) => {
  const [main, light] = fills[name as PixelIconName];
  return [name, pixelArtSource(rows, { '1': GameColors.ink, '2': main, '3': light, '4': GameColors.yellow, '5': GameColors.ink })];
})) as Record<PixelIconName, string>;
const emptyHeart = pixelArtSource(shapes.heart, { '1': GameColors.ink, '2': GameColors.heartEmpty, '3': GameColors.heartEmpty });

export function PixelIcon({ name, size = 24, muted, label }: PixelIconProps) {
  return <Image
    source={name === 'heart' && muted ? emptyHeart : sources[name]}
    contentFit="contain"
    accessible={Boolean(label)}
    accessibilityLabel={label}
    style={{ width: size, height: size }}
  />;
}
