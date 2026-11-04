import { pixelArtSource, svgSource } from '@/utils/pixel-art';
import { AssetPalette as A } from '@/constants/asset-palette';

// Temporary code-native artwork. Replace each source independently with designer assets.
export const roomPlaceholder = svgSource(`
  <defs>
    <pattern id="wall" width="32" height="24" patternUnits="userSpaceOnUse">
      <rect width="32" height="24" fill="${A.wall}"/>
      <path d="M0 0H32M0 24H32M16 0V24" stroke="${A.woodLight}" stroke-width="2"/>
    </pattern>
    <pattern id="floor" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .46 -1 .46 240 172)">
      <rect width="42" height="42" fill="#F9F9FF"/>
      <path d="M0 0H21V21H0ZM21 21H42V42H21Z" fill="#E0E5F3"/>
    </pattern>
  </defs>
  <path d="M32 268L240 172L448 268V280L240 378L32 280Z" fill="#A6ABC5" stroke="${A.outline}" stroke-width="5"/>
  <path d="M32 118L240 22L448 118V268L240 366L32 268Z" fill="${A.ivory}" stroke="${A.outline}" stroke-width="6" stroke-linejoin="miter"/>
  <path d="M32 118L240 22V172L32 268Z" fill="url(#wall)" stroke="${A.wood}" stroke-width="3"/>
  <path d="M240 22L448 118V268L240 172Z" fill="${A.wall}" stroke="${A.wood}" stroke-width="3"/>
  <path d="M256 47L431 128M256 76L431 157M256 105L431 186M256 134L431 215M278 49V188M315 66V205M352 84V223M389 101V240" fill="none" stroke="${A.woodLight}" stroke-width="3"/>
  <path d="M32 268L240 172L448 268L240 366Z" fill="url(#floor)" stroke="${A.outline}" stroke-width="4"/>
  <path d="M33 254L240 158L447 254V268L240 172L33 268Z" fill="${A.wood}"/>
  <path d="M240 26V159" stroke="${A.wood}" stroke-width="6"/>
  <path d="M75 119L150 85V159L75 193Z" fill="${A.blue}" stroke="${A.outline}" stroke-width="5"/>
  <path d="M82 123L143 95V109L82 137ZM82 154L143 126V139L82 167Z" fill="${A.blueLight}"/>
  <path d="M112 103V174M77 157L149 124" stroke="#FFFFFF" stroke-width="5"/>
  <g transform="translate(299 86) skewY(25)">
    <rect x="-19" y="-24" width="38" height="48" fill="${A.outline}"/>
    <rect x="-15" y="-20" width="30" height="40" fill="${A.lavender}"/>
    <rect x="-10" y="-15" width="20" height="30" fill="${A.ivory}"/>
    <path d="M0 -10V0L8 7" stroke="${A.outline}" stroke-width="4" fill="none"/>
  </g>
`, 480, 400);

export const characterPlaceholder = pixelArtSource([
  '..111......111..', '..1221....1221..', '..123211112321..',
  '..122222222221..', '.12222222222221.', '.12212222221221.',
  '.12212233221221.', '.12222333322221.', '..122331133221..',
  '..122333333221..', '...1222222221...', '...1223333221...',
  '...1233333321...', '..112333333211..', '..121333333121..',
  '..121333333121..', '...1233333321...', '...1221111221...',
  '...1221..1221...', '...1111..1111...',
], { '1': A.outline, '2': A.mint, '3': A.ivory });

export const plantPlaceholder = pixelArtSource([
  '.....11.....', '..11122111..', '.1222222221.', '122332222221',
  '.1222222221.', '..11122111..', '.....11.....', '..11111111..',
  '..14444441..', '...144441...', '...144441...', '....1111....',
], { '1': A.outline, '2': A.mint, '3': A.mintLight, '4': A.wood });

export const deskPlaceholder = svgSource(`
  <path d="M12 58L116 78V94L12 74Z" fill="${A.wood}" stroke="${A.outline}" stroke-width="5"/>
  <path d="M18 76V117H29V79M99 91V133H110V93" fill="${A.wood}" stroke="${A.outline}" stroke-width="4"/>
  <path d="M12 58L29 48L129 68L116 78Z" fill="${A.woodLight}" stroke="${A.outline}" stroke-width="4"/>
  <path d="M92 22V62M78 63H108" stroke="${A.outline}" stroke-width="6"/>
  <path d="M83 5H102L108 24H77Z" fill="${A.ivory}" stroke="${A.outline}" stroke-width="4"/>
  <path d="M33 39L53 43V57L33 53Z" fill="${A.lavender}" stroke="${A.outline}" stroke-width="4"/>
`, 140, 140);
