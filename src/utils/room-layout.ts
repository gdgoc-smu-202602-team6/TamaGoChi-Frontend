import { RoomEditError, placementTargets, type Placement, type PlacementTarget, type RoomAppearance, type RoomLayout, type RoomOverview } from '../types/room';
import { itemSlots, type ItemSlot, type ShopItem } from '../types/shop';

export const targetLabels: Record<PlacementTarget, string> = { DESK: '책상', BOOKSHELF: '책장', PLANT: '화분', RUG: '러그', CHARACTER: '캐릭터' };
const onHalfGrid = (target: PlacementTarget) => target === 'DESK' || target === 'BOOKSHELF';
export const placementTargetFor = (slot: ItemSlot): PlacementTarget | undefined => placementTargets.find(target => target === slot);
export function roomSize(layout: RoomLayout, catalog: readonly ShopItem[]): number {
  const id = layout.equipped.find(one => one.slot === 'ROOM')?.itemId;
  const size = catalog.find(item => item.id === id)?.roomSize;
  if (!size || !Number.isSafeInteger(size) || size < 1) throw new RoomEditError('invalid');
  return size;
}
export function availableTargets(layout: RoomLayout): PlacementTarget[] {
  return placementTargets.filter(target => target === 'CHARACTER' || layout.equipped.some(one => one.slot === target));
}
export function validateRoomLayout(layout: RoomLayout, catalog: readonly ShopItem[], owned: readonly string[]): void {
  const seenSlots = new Set<string>();
  for (const one of layout.equipped) {
    const item = catalog.find(item => item.id === one.itemId);
    if (!item || !itemSlots.includes(one.slot) || item.slot !== one.slot || seenSlots.has(one.slot)) throw new RoomEditError('invalid');
    if (!owned.includes(one.itemId)) throw new RoomEditError('not-owned');
    seenSlots.add(one.slot);
  }
  const size = roomSize(layout, catalog), targets = availableTargets(layout), seenTargets = new Set<string>();
  for (const one of layout.placements) {
    if (!targets.includes(one.target) || seenTargets.has(one.target) || !Number.isFinite(one.x) || !Number.isFinite(one.y)
      || one.x < 0 || one.y < 0 || one.x > size || one.y > size
      || (onHalfGrid(one.target) && (!Number.isInteger(one.x * 2) || !Number.isInteger(one.y * 2)))) throw new RoomEditError('invalid');
    seenTargets.add(one.target);
  }
}
export function sameRoomLayout(a: RoomLayout, b: RoomLayout): boolean {
  return a.equipped.length === b.equipped.length && a.placements.length === b.placements.length
    && a.equipped.every(one => b.equipped.some(other => other.slot === one.slot && other.itemId === one.itemId))
    && a.placements.every(one => b.placements.some(other => other.target === one.target && Math.abs(other.x - one.x) < 0.000001 && Math.abs(other.y - one.y) < 0.000001));
}
export function snapPlacement(target: PlacementTarget, x: number, y: number, size: number): Placement {
  const snap = (value: number) => Math.min(size, Math.max(0, onHalfGrid(target) ? Math.round(value * 2) / 2 : Math.round(value * 10000) / 10000));
  return { target, x: snap(x), y: snap(y) };
}
export function defaultPlacement(target: PlacementTarget, size: number): Placement {
  const point: Record<PlacementTarget, readonly [number, number]> = { DESK: [.78, .2], BOOKSHELF: [.18, .12], PLANT: [.16, .7], RUG: [.58, .55], CHARACTER: [.6, .65] };
  return snapPlacement(target, point[target][0] * size, point[target][1] * size, size);
}
export function effectivePlacement(layout: RoomLayout, target: PlacementTarget, size: number): Placement {
  return layout.placements.find(one => one.target === target) ?? defaultPlacement(target, size);
}
export function moveRoomTarget(layout: RoomLayout, target: PlacementTarget, x: number, y: number, catalog: readonly ShopItem[]): RoomLayout {
  if (!availableTargets(layout).includes(target) || !Number.isFinite(x) || !Number.isFinite(y)) throw new RoomEditError('invalid');
  return { equipped: layout.equipped, placements: [...layout.placements.filter(one => one.target !== target), snapPlacement(target, x, y, roomSize(layout, catalog))] };
}
export function changeRoomEquipment(layout: RoomLayout, item: ShopItem, catalog: readonly ShopItem[], owned: readonly string[]): RoomLayout {
  if (!owned.includes(item.id) || !catalog.some(one => one.id === item.id && one.slot === item.slot)) throw new RoomEditError('not-owned');
  const existing = layout.equipped.some(one => one.itemId === item.id);
  if (existing && item.slot === 'ROOM') return layout;
  const equipped = [...layout.equipped.filter(one => one.slot !== item.slot), ...existing ? [] : [{ slot: item.slot, itemId: item.id }]];
  const next = { equipped, placements: [] as Placement[] }, fromSize = roomSize(layout, catalog), toSize = roomSize(next, catalog);
  const targets = availableTargets(next);
  next.placements = layout.placements.filter(one => targets.includes(one.target)).map(one => fromSize === toSize ? one : snapPlacement(one.target, one.x * toSize / fromSize, one.y * toSize / fromSize, toSize));
  validateRoomLayout(next, catalog, owned);
  return next;
}
export function roomAppearance(overview: RoomOverview, layout = overview.layout): RoomAppearance {
  return { items: layout.equipped.map(one => overview.items.find(item => item.id === one.itemId)!), placements: layout.placements, size: roomSize(layout, overview.items) };
}
// The isometric floor is independent of viewport pixels. (0,0) is its back corner.
export function floorToScene(x: number, y: number, size: number) { return { x: 240 + (x - y) * 208 / size, y: 172 + (x + y) * 97 / size }; }
export function sceneToFloor(x: number, y: number, size: number) { return { x: size * ((x - 240) / 416 + (y - 172) / 194), y: size * ((y - 172) / 194 - (x - 240) / 416) }; }
// Reserve room for each placeholder's footprint at the floor edges. Logical API coordinates
// still span 0..size; the character's feet and furniture bases stay inside the drawn floor.
function footprintInset(target: PlacementTarget, size: number) {
  return Math.min(target === 'PLANT' ? .25 : target === 'CHARACTER' ? .2 : .5, size * .45);
}
export function placementToScene(point: Placement, size: number) {
  const inset = footprintInset(point.target, size), span = size - 2 * inset;
  return floorToScene(inset + point.x * span / size, inset + point.y * span / size, size);
}
export function dragOnFloor(start: Placement, dx: number, dy: number, viewportWidth: number, size: number): Placement {
  if (viewportWidth <= 0 || ![dx, dy, viewportWidth].every(Number.isFinite)) return start;
  const sx = dx * 480 / viewportWidth, sy = dy * 480 / viewportWidth;
  const fit = size / (size - 2 * footprintInset(start.target, size));
  return snapPlacement(start.target, start.x + size * fit * (sx / 416 + sy / 194), start.y + size * fit * (sy / 194 - sx / 416), size);
}
