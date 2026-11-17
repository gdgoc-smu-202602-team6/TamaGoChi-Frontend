import { RoomEditError, placementSurfaces, type Placement, type PlacementTarget, type PlacementSurface, type RoomLayout } from '../types/room';
import type { PlacementPolicy, ShopItem } from '../types/shop';
import { RoomGeometry as G } from '../constants/room-geometry';

// Item geometry and collision rules come from the catalog (API 0.2.0 sends the character's policy too).
// The fallback keeps the same rule for a room without an equipped character item.
const character: PlacementPolicy = { surfaceKind: 'FLOOR', width: 1, height: 1, solid: true };
export function surfacePolicy(layout: RoomLayout, target: PlacementTarget, catalog: readonly ShopItem[]): PlacementPolicy | undefined {
  const id = layout.equipped.find(one => one.slot === target)?.itemId;
  const policy = catalog.find(one => one.id === id)?.placementPolicy;
  return policy ?? (target === 'CHARACTER' ? character : undefined);
}
export function surfaceTargets(layout: RoomLayout, catalog: readonly ShopItem[]): PlacementTarget[] {
  return ['CHARACTER', ...layout.equipped.filter(one => one.slot !== 'CHARACTER' && surfacePolicy(layout, one.slot, catalog)).map(one => one.slot)];
}
export function snapOnSurface(point: Placement, policy: PlacementPolicy, size: number, wallHeight: number): Placement {
  const limitY = policy.surfaceKind === 'FLOOR' ? size : wallHeight;
  const snap = (value: number, limit: number) => {
    const max = policy.step ? Math.floor(limit / policy.step) * policy.step : limit;
    return Math.max(0, Math.min(max, policy.step ? Math.round(value / policy.step) * policy.step : Math.round(value * 1e6) / 1e6));
  };
  return { ...point, x: snap(point.x, size - policy.width), y: snap(point.y, limitY - policy.height) };
}
function fits(point: Placement, policy: PlacementPolicy, size: number, wallHeight: number) {
  const onGrid = (value: number) => !policy.step || Number.isInteger(value / policy.step);
  return placementSurfaces.includes(point.surface!) && (policy.surfaceKind === 'FLOOR' ? point.surface === 'FLOOR' : point.surface !== 'FLOOR')
    && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.y >= 0
    && point.x + policy.width <= size && point.y + policy.height <= (point.surface === 'FLOOR' ? size : wallHeight)
    && onGrid(point.x) && onGrid(point.y);
}
function clashes(a: Placement, ap: PlacementPolicy, b: Placement, bp: PlacementPolicy) {
  return ap.solid && bp.solid && a.surface === b.surface && a.x < b.x + bp.width && b.x < a.x + ap.width
    && a.y < b.y + bp.height && b.y < a.y + ap.height;
}
export function validateSurfacePlacements(layout: RoomLayout, catalog: readonly ShopItem[], size: number) {
  if (layout.wallHeight !== 3) throw new RoomEditError('invalid');
  const seen = new Set<PlacementTarget>(), placed: { point: Placement; policy: PlacementPolicy }[] = [];
  for (const point of layout.placements) {
    const policy = surfacePolicy(layout, point.target, catalog);
    if (!policy || seen.has(point.target) || !fits(point, policy, size, layout.wallHeight)
      || placed.some(one => clashes(point, policy, one.point, one.policy))) throw new RoomEditError('invalid');
    seen.add(point.target); placed.push({ point, policy });
  }
}
export function fitSurfacePlacements(layout: RoomLayout, catalog: readonly ShopItem[], fromSize: number, toSize: number): Placement[] {
  const kept: Placement[] = [];
  for (const point of [...layout.placements].sort((a, b) => a.target < b.target ? -1 : a.target > b.target ? 1 : 0)) {
    const policy = surfacePolicy(layout, point.target, catalog);
    if (!policy) continue;
    const moved = snapOnSurface({ ...point, x: point.x * toSize / fromSize, y: point.surface === 'FLOOR' ? point.y * toSize / fromSize : point.y }, policy, toSize, layout.wallHeight!);
    try { validateSurfacePlacements({ ...layout, placements: [...kept, moved] }, catalog, toSize); kept.push(moved); } catch { /* Same fitting rule as the server: an invalid/colliding placement returns to its default. */ }
  }
  return kept;
}
export function defaultSurfacePlacement(target: PlacementTarget, policy: PlacementPolicy, size: number, wallHeight: number): Placement {
  const surface = policy.surfaceKind === 'FLOOR' ? 'FLOOR' : target === 'WINDOW' ? 'LEFT_WALL' : 'RIGHT_WALL';
  const x = target === 'DESK' ? size - policy.width : target === 'CHARACTER' ? 1 : target === 'CLOCK' ? size * .55 : target === 'RUG' ? (size - policy.width) / 2 : 0;
  const y = target === 'CHARACTER' ? size * .55 : target === 'PLANT' ? size - policy.height : policy.surfaceKind === 'WALL' ? (wallHeight - policy.height) / 2 : 0;
  return snapOnSurface({ target, surface, x, y }, policy, size, wallHeight);
}
// `wallScene` is the drawn wall height in scene units: designer rooms draw their walls at different heights.
export function surfaceToScene(surface: PlacementSurface, x: number, y: number, size: number, wallHeight: number, wallScene: number = G.wallHeight) {
  if (surface === 'FLOOR') return { x: G.centerX + (x - y) * G.halfWidth / size, y: G.backY + (x + y) * G.halfDepth / size };
  return { x: G.centerX + (surface === 'RIGHT_WALL' ? 1 : -1) * x * G.halfWidth / size, y: G.backY + x * G.halfDepth / size - y * wallScene / wallHeight };
}
export function surfacePlacementToScene(point: Placement, policy: PlacementPolicy, size: number, wallHeight: number, wallScene: number = G.wallHeight) {
  return surfaceToScene(point.surface!, point.x + policy.width / 2, point.y + policy.height / 2, size, wallHeight, wallScene);
}
export function dragOnSurface(start: Placement, policy: PlacementPolicy, dx: number, dy: number, viewportWidth: number, size: number, wallHeight: number, wallScene: number = G.wallHeight): Placement {
  if (viewportWidth <= 0 || ![dx, dy, viewportWidth].every(Number.isFinite)) return start;
  const sx = dx * G.width / viewportWidth, sy = dy * G.width / viewportWidth, u = sx / (2 * G.halfWidth), v = sy / (2 * G.halfDepth);
  if (start.surface === 'FLOOR') return snapOnSurface({ ...start, x: start.x + size * (u + v), y: start.y + size * (v - u) }, policy, size, wallHeight);
  const anchor = surfacePlacementToScene(start, policy, size, wallHeight, wallScene), ax = anchor.x + sx, ay = anchor.y + sy;
  const surface = ax < G.centerX ? 'LEFT_WALL' : 'RIGHT_WALL', x = Math.abs(ax - G.centerX) * size / G.halfWidth;
  return snapOnSurface({ ...start, surface, x: x - policy.width / 2, y: (G.backY + x * G.halfDepth / size - ay) * wallHeight / wallScene - policy.height / 2 }, policy, size, wallHeight);
}
