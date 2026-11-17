import { Image, type ImageSource } from 'expo-image';

import { GameColors } from '@/constants/theme';
import { pixelArtSource } from '@/utils/pixel-art';

// Code-drawn icons that have no designer art yet.
const shapes = {
  heart: ['.11..11.', '12211221', '12322221', '12222221', '.122221.', '..1221..', '...11...'],
  hourglass: ['11111111', '.122221.', '.122221.', '..1221..', '...11...', '..1221..', '.123321.', '11111111'],
  cloud: ['....111111....', '..1122222211..', '.122222222221.', '12222222222221', '11111111111111'],
  chest: ['.111111111111.', '12222222222221', '12222222222221', '11111144111111', '13333345433331', '13333344433331', '13333333333331', '13333333333331', '11111111111111'],
} as const;
const fills: Record<keyof typeof shapes, [string, string]> = {
  heart: [GameColors.heart, '#FFC4CB'],
  hourglass: [GameColors.yellow, GameColors.cream],
  cloud: [GameColors.paper, GameColors.paper],
  chest: ['#A9774B', '#C99260'],
};
const drawn = Object.fromEntries(Object.entries(shapes).map(([name, rows]) => {
  const [main, light] = fills[name as keyof typeof shapes];
  return [name, pixelArtSource(rows, { '1': GameColors.ink, '2': main, '3': light, '4': GameColors.yellow, '5': GameColors.ink })];
})) as Record<keyof typeof shapes, string>;

// Designer art (assets/game): Bolt currency, the animated bug, and the cleanliness sparkle.
const designed = {
  bolt: require('@/assets/game/bolt.png'),
  bug: require('@/assets/game/bug.gif'),
  sparkle: require('@/assets/game/sparkle.png'),
} as const satisfies Record<string, ImageSource>;
const sparkleEmpty: ImageSource = require('@/assets/game/sparkle-empty.png');
const emptyHeart = pixelArtSource(shapes.heart, { '1': GameColors.ink, '2': GameColors.heartEmpty, '3': GameColors.heartEmpty });

type PixelIconName = keyof typeof shapes | keyof typeof designed;
type PixelIconProps = { name: PixelIconName; size?: number; muted?: boolean; label?: string };

export function PixelIcon({ name, size = 24, muted, label }: PixelIconProps) {
  const source = name === 'sparkle' && muted ? sparkleEmpty : name === 'heart' && muted ? emptyHeart : name in designed ? designed[name as keyof typeof designed] : drawn[name as keyof typeof shapes];
  return <Image
    source={source}
    contentFit="contain"
    accessible={Boolean(label)}
    accessibilityLabel={label}
    style={{ width: size, height: size }}
  />;
}
