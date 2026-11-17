import type { ItemSlot, ShopItem } from './shop';

// Targets of the original point-based floor contract. The surface contract places any slot with a placement policy.
export const placementTargets = ['DESK', 'BOOKSHELF', 'PLANT', 'RUG', 'CHARACTER'] as const;
/** API 0.2.0: Placement.target is a Slot. The character is the CHARACTER slot. */
export type PlacementTarget = ItemSlot;
export const placementSurfaces = ['FLOOR', 'LEFT_WALL', 'RIGHT_WALL'] as const;
export type PlacementSurface = typeof placementSurfaces[number];
export type Placement = { readonly target: PlacementTarget; readonly surface?: PlacementSurface; readonly x: number; readonly y: number };
export type EquippedItem = { readonly slot: ItemSlot; readonly itemId: string };
// wallHeight identifies the surface contract; absent means the original point-based floor contract.
export type RoomLayout = { readonly equipped: readonly EquippedItem[]; readonly placements: readonly Placement[]; readonly wallHeight?: number };
export type RoomCondition = { readonly hearts: number; readonly bugs: number; readonly bugProgressSeconds: number };
export type RoomOverview = {
  readonly items: readonly ShopItem[];
  readonly ownedItemIds: readonly string[];
  readonly layout: RoomLayout;
  readonly condition: RoomCondition;
};
export type RoomAppearance = { readonly items: readonly ShopItem[]; readonly placements: readonly Placement[]; readonly size: number; readonly wallHeight?: number };
export type RoomService = {
  getRoom: () => Promise<RoomOverview>;
  saveRoom: (layout: RoomLayout, baseline: RoomLayout) => Promise<RoomOverview>;
};
export class RoomEditError extends Error {
  constructor(readonly reason: 'invalid' | 'not-owned' | 'changed' | 'uncertain' | 'storage') {
    super(`Room edit ${reason}`); this.name = 'RoomEditError';
  }
}
