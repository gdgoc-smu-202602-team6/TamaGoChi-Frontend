import { svgSource } from '@/utils/pixel-art';
import type { ShopItem } from '@/types/shop';

// Shell artwork has no baked-in furniture. Catalog items are rendered independently above it.
export function roomShell(items: readonly ShopItem[]) {
  const code = items.find(item => item.slot === 'WALLPAPER')?.code;
  const color = code === 'mint_stripe_wallpaper' ? '#B8E0B9' : code === 'strawberry_dot_wallpaper' ? '#F1B1C9' : code ? '#F8E6A6' : '#E9EBF6';
  return svgSource(`
    <defs><pattern id="wall" width="32" height="24" patternUnits="userSpaceOnUse"><rect width="32" height="24" fill="${color}"/><path d="M0 0H32M0 24H32M16 0V24" stroke="#24213D" opacity=".12" stroke-width="2"/></pattern>
    <pattern id="floor" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .466 -1 .466 240 172)"><rect width="42" height="42" fill="#F9F9FF"/><path d="M0 0H21V21H0ZM21 21H42V42H21Z" fill="#E0E5F3"/></pattern></defs>
    <path d="M32 268L240 172L448 268V280L240 378L32 280Z" fill="#A6ABC5" stroke="#24213D" stroke-width="5"/>
    <path d="M32 118L240 22L448 118V268L240 366L32 268Z" fill="${color}" stroke="#24213D" stroke-width="6"/>
    <path d="M32 118L240 22V172L32 268Z" fill="url(#wall)"/><path d="M240 22L448 118V268L240 172Z" fill="url(#wall)"/>
    <path d="M240 22L448 118V268L240 172Z" fill="#24213D" opacity=".08"/>
    <path d="M32 268L240 172L448 268L240 366Z" fill="url(#floor)" stroke="#24213D" stroke-width="4"/>
    <path d="M33 254L240 158L447 254V268L240 172L33 268Z" fill="#8B765D"/><path d="M240 26V159" stroke="#8B765D" stroke-width="5"/>
  `, 480, 400);
}
