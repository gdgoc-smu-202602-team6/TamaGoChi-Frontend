import type { ShopItem } from '@/types/shop';
import { svgSource } from '@/utils/pixel-art';
import { AssetPalette as A } from '@/constants/asset-palette';

// Temporary, code-native art keyed by slot. Final assets can be registered by Item.code.
const shapes: Record<ShopItem['slot'], string> = {
  CLOCK: `<rect x="41" y="20" width="46" height="54" fill="${A.rose}"/><rect x="47" y="26" width="34" height="42" fill="${A.ivory}"/><path d="M64 32V47L74 54" fill="none"/>`,
  WINDOW: `<rect x="28" y="17" width="72" height="64" fill="${A.blue}"/><path d="M64 18V80M29 49H99"/><path d="M35 31H54M74 61H93" stroke="${A.blueLight}"/>`,
  DESK: `<path d="M19 52H109V65H19ZM27 65H38V91H27ZM90 65H101V91H90Z" fill="${A.wood}"/><rect x="38" y="42" width="28" height="10" fill="${A.blue}"/>`,
  LAMP: `<path d="M48 19H80L89 48H39Z" fill="${A.butter}"/><path d="M61 48H67V79H61ZM43 79H85V87H43Z" fill="${A.slate}"/>`,
  PLANT: `<path d="M48 55H81L76 87H53Z" fill="${A.clay}"/><path d="M62 54V34M62 41L45 30M63 36L81 23"/><path d="M39 25H53V36H39ZM73 17H88V30H73ZM56 17H69V30H56Z" fill="${A.leaf}"/>`,
  BOOKSHELF: `<rect x="29" y="14" width="70" height="77" fill="${A.woodDark}"/><path d="M32 49H96M32 77H96"/><path d="M42 25V45M83 56V73" stroke="${A.blue}" stroke-width="8"/><path d="M55 22V45M58 59V73" stroke="${A.leaf}" stroke-width="8"/><path d="M73 25V45M45 56V73" stroke="${A.butter}" stroke-width="8"/>`,
  RUG: `<path d="M16 53L64 29L112 53L64 81Z" fill="${A.rose}"/><path d="M31 53L64 37L97 53L64 70Z" fill="${A.ivory}"/>`,
  WALLPAPER: `<rect x="30" y="14" width="61" height="72" fill="${A.mint}"/><path d="M41 18V82M58 18V82M75 18V82" stroke="${A.ivory}" stroke-width="8"/><path d="M30 77H88V91H30Z" fill="${A.ivory}"/>`,
  HEAD: `<path d="M36 49V38H47V28H81V38H92V49H102V65H26V49Z" fill="${A.mint}"/><rect x="57" y="17" width="14" height="13" fill="${A.ivory}"/><rect x="27" y="56" width="74" height="10" fill="${A.ivory}"/>`,
  FACE: `<path d="M20 37H56V65H20ZM72 37H108V65H72Z" fill="${A.blue}"/><path d="M56 46H72M29 43H40M80 43H91" fill="none" stroke-width="7"/>`,
  NECK: `<path d="M21 36H107V53H91V73H74V53H21Z" fill="${A.lavender}"/><path d="M32 40V48M51 40V48M82 40V48M77 61H87" stroke="${A.ivory}" stroke-width="7"/>`,
  ROOM: `<path d="M18 42L64 19L110 42V75L64 97L18 75Z" fill="${A.wall}"/><path d="M18 75L64 53L110 75L64 97Z" fill="${A.ivory}"/><path d="M64 20V53"/><rect x="30" y="47" width="15" height="18" fill="${A.blue}"/>`,
  CHARACTER: `<path d="M40 30H88V44H96V86H32V44H40Z" fill="${A.butter}"/><path d="M52 52H58V60H52ZM70 52H76V60H70Z" fill="${A.outline}"/><path d="M40 86H54V96H40ZM74 86H88V96H74Z" fill="${A.butter}"/>`,
};
export function itemPlaceholder(item: ShopItem, withShadow = true, onWall = false) {
  const shape = item.code === 'strawberry_dot_wallpaper'
    ? `<rect x="30" y="14" width="61" height="77" fill="${A.lavender}"/><path d="M43 29H48M69 39H74M46 61H51M74 76H79" stroke="${A.ivory}" stroke-width="7"/>`
    : shapes[item.slot];
  // Crop the catalog thumbnail's blank margins before projecting a wall sprite.
  const frame = onWall ? item.slot === 'CLOCK' ? [39, 18, 50, 58] : item.slot === 'WINDOW' ? [26, 15, 76, 68] : undefined : undefined;
  return svgSource(`${withShadow && !frame ? `<ellipse cx="64" cy="99" rx="37" ry="5" fill="${A.outline}" opacity=".1"/>` : ''}<g ${frame ? `transform="translate(${-frame[0]} ${-frame[1]})"` : ''} stroke="${A.outline}" stroke-width="3" stroke-linejoin="miter" shape-rendering="crispEdges">${shape}</g>`, frame?.[2] ?? 128, frame?.[3] ?? 116);
}
