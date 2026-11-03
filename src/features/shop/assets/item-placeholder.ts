import type { ShopItem } from '@/types/shop';
import { svgSource } from '@/utils/pixel-art';

// Temporary, code-native art keyed by slot. Final assets can be registered by Item.code.
const shapes: Record<ShopItem['slot'], string> = {
  CLOCK: '<rect x="41" y="20" width="46" height="54" fill="#E9788F"/><rect x="47" y="26" width="34" height="42" fill="#FFF7DA"/><path d="M64 32V47L74 54" fill="none"/>',
  WINDOW: '<rect x="28" y="17" width="72" height="64" fill="#A9D9FF"/><path d="M64 18V80M29 49H99"/><path d="M35 31H54M74 61H93" stroke="#FFF"/>',
  DESK: '<path d="M19 52H109V65H19ZM27 65H38V91H27ZM90 65H101V91H90Z" fill="#A87750"/><rect x="38" y="42" width="28" height="10" fill="#E9788F"/>',
  LAMP: '<path d="M48 19H80L89 48H39Z" fill="#F6D85F"/><path d="M61 48H67V79H61ZM43 79H85V87H43Z" fill="#8C7BBA"/>',
  PLANT: '<path d="M48 55H81L76 87H53Z" fill="#B77E55"/><path d="M62 54V34M62 41L45 30M63 36L81 23"/><path d="M39 25H53V36H39ZM73 17H88V30H73ZM56 17H69V30H56Z" fill="#87C45B"/>',
  BOOKSHELF: '<rect x="29" y="14" width="70" height="77" fill="#BD8858"/><path d="M32 49H96M32 77H96"/><path d="M42 25V45M55 22V45M73 25V45M83 56V73M45 56V73M58 59V73" stroke="#E9788F" stroke-width="8"/>',
  RUG: '<path d="M16 53L64 29L112 53L64 81Z" fill="#AA87CD"/><path d="M31 53L64 37L97 53L64 70Z" fill="#F6D85F"/>',
  WALLPAPER: '<rect x="30" y="14" width="61" height="72" fill="#B8E0B9"/><path d="M41 18V82M58 18V82M75 18V82" stroke="#F5F0D8" stroke-width="8"/><path d="M30 77H88V91H30Z" fill="#FFF7DA"/>',
  HEAD: '<path d="M36 49V38H47V28H81V38H92V49H102V65H26V49Z" fill="#CC555E"/><rect x="57" y="17" width="14" height="13" fill="#FFF7DA"/><rect x="27" y="56" width="74" height="10" fill="#FFF7DA"/>',
  FACE: '<path d="M20 37H56V65H20ZM72 37H108V65H72Z" fill="#B7DEFF"/><path d="M56 46H72M29 43H40M80 43H91" fill="none" stroke-width="7"/>',
  NECK: '<path d="M21 36H107V53H91V73H74V53H21Z" fill="#CC555E"/><path d="M32 40V48M51 40V48M82 40V48M77 61H87" stroke="#F6D85F" stroke-width="7"/>',
  ROOM: '<path d="M18 42L64 19L110 42V75L64 97L18 75Z" fill="#F8E6A6"/><path d="M18 75L64 53L110 75L64 97Z" fill="#EEEFFC"/><path d="M64 20V53"/><rect x="30" y="47" width="15" height="18" fill="#A9D9FF"/>',
};
export function itemPlaceholder(item: ShopItem, withShadow = true) {
  const shape = item.code === 'strawberry_dot_wallpaper'
    ? '<rect x="30" y="14" width="61" height="77" fill="#F1B1C9"/><path d="M43 29H48M69 39H74M46 61H51M74 76H79" stroke="#CC555E" stroke-width="7"/>'
    : shapes[item.slot];
  return svgSource(`${withShadow ? '<ellipse cx="64" cy="99" rx="37" ry="5" fill="#24213D" opacity=".15"/>' : ''}<g stroke="#24213D" stroke-width="4" stroke-linejoin="miter" shape-rendering="crispEdges">${shape}</g>`, 128, 116);
}
