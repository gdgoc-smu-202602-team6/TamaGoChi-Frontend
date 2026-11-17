// Scene coordinates for the isometric room, shared by the drawn room, the designer room image,
// placement math and drag gestures. The base room asset (shabby_gosiwon) is drawn at 5 scene units
// per source pixel: its 2:1 floor and wall height define these numbers, and the code-drawn rooms
// follow the same shape so furniture lines up on every room.
// Keep this file free of app imports: the Node test build compiles it without path aliases.
export const RoomGeometry = {
  /** Scene box. RoomScene renders it at width:height. */
  width: 480,
  height: 480,
  /** Back floor corner, where both walls meet the floor. */
  centerX: 240,
  backY: 250,
  /** Floor diamond: half its width and half its depth. */
  halfWidth: 175,
  halfDepth: 90,
  /** Wall height from the floor line to the top edge. */
  wallHeight: 240,
} as const;

/** Scene units per source pixel of designer art on the base (size 3) room. */
export const DesignerPixel = 5;

/**
 * Measurements of a cropped designer room image, in source pixels from its top-left corner:
 * the back floor corner (where both walls meet the floor), half the floor's width, and the wall height.
 * Every room tier draws floor tiles at about the same pixel size but its own wall height.
 */
export type DesignerRoom = { readonly pixels: readonly [number, number]; readonly centerX: number; readonly backY: number; readonly halfWidth: number; readonly wallHeight: number };

/** Scales a designer room so its floor matches the scene floor. Returns its box and drawn wall height in scene units. */
export function designerRoomFrame(room: DesignerRoom) {
  const scale = RoomGeometry.halfWidth / room.halfWidth;
  return { left: RoomGeometry.centerX - room.centerX * scale, top: RoomGeometry.backY - room.backY * scale, width: room.pixels[0] * scale, height: room.pixels[1] * scale, wallHeight: room.wallHeight * scale };
}
