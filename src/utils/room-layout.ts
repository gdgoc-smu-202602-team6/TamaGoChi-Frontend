import { RoomEditError, placementTargets, type Placement, type PlacementTarget, type RoomAppearance, type RoomLayout, type RoomOverview } from '../types/room';
import { itemSlots, type ItemSlot, type ShopItem } from '../types/shop';
import { defaultSurfacePlacement, fitSurfacePlacements, snapOnSurface, surfacePolicy, surfaceTargets, validateSurfacePlacements } from './room-surfaces';
import { RoomGeometry as G } from '../constants/room-geometry';

export const targetLabels: Record<PlacementTarget, string> = { CLOCK: '시계', WINDOW: '창문', LAMP: '스탠드', WALLPAPER: '벽지', HEAD: '머리 장식', FACE: '얼굴 장식', NECK: '목 장식', ROOM: '방', DESK: '책상', BOOKSHELF: '책장', PLANT: '화분', RUG: '러그', CHARACTER: '캐릭터' };
const onHalfGrid = (target: PlacementTarget) => target === 'DESK' || target === 'BOOKSHELF';
export const placementTargetFor = (slot: ItemSlot): PlacementTarget | undefined => placementTargets.find(target => target === slot);
export function roomSize(layout: RoomLayout, catalog: readonly ShopItem[]): number {
  const id = layout.equipped.find(one => one.slot === 'ROOM')?.itemId;
  const size = catalog.find(item => item.id === id)?.roomSize;
  if (!size || !Number.isSafeInteger(size) || size < 1) throw new RoomEditError('invalid');
  return size;
}
export function availableTargets(layout: RoomLayout, catalog: readonly ShopItem[] = []): PlacementTarget[] {
  if (layout.wallHeight !== undefined) return surfaceTargets(layout, catalog);
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
  // API 0.2.0: a room always has a character once the catalog sells characters (PATCH without one is 400).
  if (catalog.some(item => item.slot === 'CHARACTER') && !seenSlots.has('CHARACTER')) throw new RoomEditError('invalid');
  const size = roomSize(layout, catalog);
  if (layout.wallHeight !== undefined) { validateSurfacePlacements(layout, catalog, size); return; }
  const targets = availableTargets(layout), seenTargets = new Set<string>();
  for (const one of layout.placements) {
    if (one.surface !== undefined || !targets.includes(one.target) || seenTargets.has(one.target) || !Number.isFinite(one.x) || !Number.isFinite(one.y)
      || one.x < 0 || one.y < 0 || one.x > size || one.y > size
      || (onHalfGrid(one.target) && (!Number.isInteger(one.x * 2) || !Number.isInteger(one.y * 2)))) throw new RoomEditError('invalid');
    seenTargets.add(one.target);
  }
}
export function sameRoomLayout(a: RoomLayout, b: RoomLayout): boolean {
  return a.wallHeight === b.wallHeight && a.equipped.length === b.equipped.length && a.placements.length === b.placements.length
    && a.equipped.every(one => b.equipped.some(other => other.slot === one.slot && other.itemId === one.itemId))
    && a.placements.every(one => b.placements.some(other => other.target === one.target && other.surface === one.surface && Math.abs(other.x - one.x) < 0.000001 && Math.abs(other.y - one.y) < 0.000001));
}
export function snapPlacement(target: PlacementTarget, x: number, y: number, size: number): Placement {
  const snap = (value: number) => Math.min(size, Math.max(0, onHalfGrid(target) ? Math.round(value * 2) / 2 : Math.round(value * 10000) / 10000));
  return { target, x: snap(x), y: snap(y) };
}
export function defaultPlacement(target: PlacementTarget, size: number): Placement {
  const point: Partial<Record<PlacementTarget, readonly [number, number]>> = { DESK: [.78, .2], BOOKSHELF: [.18, .12], PLANT: [.16, .7], RUG: [.58, .55], CHARACTER: [.6, .65] };
  const at = point[target];
  if (!at) throw new RoomEditError('invalid');
  return snapPlacement(target, at[0] * size, at[1] * size, size);
}
export function effectivePlacement(layout: RoomLayout, target: PlacementTarget, size: number, catalog: readonly ShopItem[] = []): Placement {
  const saved = layout.placements.find(one => one.target === target);
  if (saved) return saved;
  if (layout.wallHeight !== undefined) {
    const policy = surfacePolicy(layout, target, catalog);
    if (!policy) throw new RoomEditError('invalid');
    return defaultSurfacePlacement(target, policy, size, layout.wallHeight);
  }
  return defaultPlacement(target, size);
}
export function moveRoomTarget(layout: RoomLayout, target: PlacementTarget, x: number, y: number, catalog: readonly ShopItem[], surface?: Placement['surface']): RoomLayout {
  if (!availableTargets(layout, catalog).includes(target) || !Number.isFinite(x) || !Number.isFinite(y)) throw new RoomEditError('invalid');
  if (layout.wallHeight !== undefined) {
    const size = roomSize(layout, catalog), policy = surfacePolicy(layout, target, catalog)!;
    const next = { ...layout, placements: [...layout.placements.filter(one => one.target !== target), snapOnSurface({ target, surface: surface ?? effectivePlacement(layout, target, size, catalog).surface, x, y }, policy, size, layout.wallHeight)] };
    validateSurfacePlacements(next, catalog, size);
    return next;
  }
  return { equipped: layout.equipped, placements: [...layout.placements.filter(one => one.target !== target), snapPlacement(target, x, y, roomSize(layout, catalog))] };
}
export function changeRoomEquipment(layout: RoomLayout, item: ShopItem, catalog: readonly ShopItem[], owned: readonly string[]): RoomLayout {
  if (!owned.includes(item.id) || !catalog.some(one => one.id === item.id && one.slot === item.slot)) throw new RoomEditError('not-owned');
  const existing = layout.equipped.some(one => one.itemId === item.id);
  // The room and the character can only be swapped, never taken off.
  if (existing && (item.slot === 'ROOM' || item.slot === 'CHARACTER')) return layout;
  const equipped = [...layout.equipped.filter(one => one.slot !== item.slot), ...existing ? [] : [{ slot: item.slot, itemId: item.id }]];
  const next = { ...layout, equipped, placements: [] as Placement[] }, fromSize = roomSize(layout, catalog), toSize = roomSize(next, catalog);
  if (layout.wallHeight !== undefined) {
    next.placements = fitSurfacePlacements({ ...next, placements: layout.placements }, catalog, fromSize, toSize);
    validateRoomLayout(next, catalog, owned);
    return next;
  }
  const targets = availableTargets(next);
  next.placements = layout.placements.filter(one => targets.includes(one.target)).map(one => fromSize === toSize ? one : snapPlacement(one.target, one.x * toSize / fromSize, one.y * toSize / fromSize, toSize));
  validateRoomLayout(next, catalog, owned);
  return next;
}
export function roomAppearance(overview: RoomOverview, layout = overview.layout): RoomAppearance {
  return { items: layout.equipped.map(one => overview.items.find(item => item.id === one.itemId)!), placements: layout.placements, size: roomSize(layout, overview.items), ...(layout.wallHeight !== undefined ? { wallHeight: layout.wallHeight } : {}) };
}
// The isometric floor is independent of viewport pixels. (0,0) is its back corner.
export function floorToScene(x: number, y: number, size: number) { return { x: G.centerX + (x - y) * G.halfWidth / size, y: G.backY + (x + y) * G.halfDepth / size }; }
export function sceneToFloor(x: number, y: number, size: number) { return { x: size * ((x - G.centerX) / (2 * G.halfWidth) + (y - G.backY) / (2 * G.halfDepth)), y: size * ((y - G.backY) / (2 * G.halfDepth) - (x - G.centerX) / (2 * G.halfWidth)) }; }
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
  const sx = dx * G.width / viewportWidth, sy = dy * G.width / viewportWidth, u = sx / (2 * G.halfWidth), v = sy / (2 * G.halfDepth);
  const fit = size / (size - 2 * footprintInset(start.target, size));
  return snapPlacement(start.target, start.x + size * fit * (u + v), start.y + size * fit * (v - u), size);
}
