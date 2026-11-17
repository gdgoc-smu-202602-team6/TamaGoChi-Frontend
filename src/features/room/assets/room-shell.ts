import { svgSource } from '@/utils/pixel-art';
import { RoomGeometry as G } from '@/constants/room-geometry';
import type { ShopItem } from '@/types/shop';

const { centerX: cx, backY: by, halfWidth: hw, halfDepth: hd, wallHeight: wh } = G;
const L = cx - hw, R = cx + hw, top = by - wh, sideTop = by + hd - wh, side = by + hd, front = by + 2 * hd, slope = hd / hw;
const leftWall = `M${L} ${sideTop}L${cx} ${top}V${by}L${L} ${side}Z`, rightWall = `M${cx} ${top}L${R} ${sideTop}V${side}L${cx} ${by}Z`;

// Wallpaper colours for the code-drawn walls. Codes without a colour keep the room's own wall.
const wallpapers: Record<string, string> = { mint_stripe_wallpaper: '#B8E0B9', strawberry_dot_wallpaper: '#F1B1C9', grubby_wall: '#F8E6A6' };
const wallPattern = (color: string) => `<pattern id="wall" width="32" height="24" patternUnits="userSpaceOnUse"><rect width="32" height="24" fill="${color}"/><path d="M0 0H32M0 24H32M16 0V24" stroke="#24213D" opacity=".12" stroke-width="2"/></pattern>`;

// Shell artwork has no baked-in furniture. Catalog items are rendered independently above it.
export function roomShell(items: readonly ShopItem[]) {
  const code = items.find(item => item.slot === 'WALLPAPER')?.code;
  const color = code ? wallpapers[code] ?? '#F8E6A6' : '#E9EBF6';
  return svgSource(`
    <defs>${wallPattern(color)}
    <pattern id="floor" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="matrix(1 ${slope} -1 ${slope} ${cx} ${by})"><rect width="42" height="42" fill="#F9F9FF"/><path d="M0 0H21V21H0ZM21 21H42V42H21Z" fill="#E0E5F3"/></pattern></defs>
    <path d="M${L} ${side}L${cx} ${front}L${R} ${side}V${side + 12}L${cx} ${front + 12}L${L} ${side + 12}Z" fill="#A6ABC5" stroke="#24213D" stroke-width="5"/>
    <path d="M${L} ${sideTop}L${cx} ${top}L${R} ${sideTop}V${side}L${cx} ${front}L${L} ${side}Z" fill="${color}" stroke="#24213D" stroke-width="6"/>
    <path d="${leftWall}" fill="url(#wall)"/><path d="${rightWall}" fill="url(#wall)"/>
    <path d="${rightWall}" fill="#24213D" opacity=".08"/>
    <path d="M${L} ${side}L${cx} ${by}L${R} ${side}L${cx} ${front}Z" fill="url(#floor)" stroke="#24213D" stroke-width="4"/>
    <path d="M${L + 1} ${side - 14}L${cx} ${by - 14}L${R - 1} ${side - 14}V${side}L${cx} ${by}L${L + 1} ${side}Z" fill="#8B765D"/><path d="M${cx} ${top + 4}V${by - 13}" stroke="#8B765D" stroke-width="5"/>
  `, G.width, G.height);
}

/** Wallpaper drawn over the designer room's own walls (`wall` = their drawn height), or null when the room keeps its walls. */
export function wallpaperOverlay(items: readonly ShopItem[], wall: number = wh) {
  const code = items.find(item => item.slot === 'WALLPAPER')?.code;
  if (!code || code === 'grubby_wall' || !wallpapers[code]) return null;
  const wallTop = by - wall, sideWallTop = by + hd - wall;
  const left = `M${L} ${sideWallTop}L${cx} ${wallTop}V${by}L${L} ${side}Z`, right = `M${cx} ${wallTop}L${R} ${sideWallTop}V${side}L${cx} ${by}Z`;
  return svgSource(`<defs>${wallPattern(wallpapers[code])}</defs>
    <path d="${left}" fill="url(#wall)"/><path d="${right}" fill="url(#wall)"/><path d="${right}" fill="#24213D" opacity=".08"/>
    <path d="M${cx} ${wallTop + 3}V${by}" stroke="#24213D" stroke-width="5" opacity=".7"/>`, G.width, G.height);
}
