// Tab order: room decoration first, then the character and what it wears.
export const shopCategories = ['FURNITURE', 'WALLPAPER', 'ROOM_SIZE', 'CHARACTER', 'ACCESSORY'] as const;
export type ShopCategory = typeof shopCategories[number];
export const itemSlots = ['CLOCK', 'WINDOW', 'DESK', 'LAMP', 'PLANT', 'BOOKSHELF', 'RUG', 'WALLPAPER', 'HEAD', 'FACE', 'NECK', 'ROOM', 'CHARACTER'] as const;
export type ItemSlot = typeof itemSlots[number];
export type ItemGrade = 'BASIC' | 'COMMON' | 'RARE' | 'EPIC';
export type PlacementPolicy = { readonly surfaceKind: 'FLOOR' | 'WALL'; readonly width: number; readonly height: number; readonly step?: number; readonly solid: boolean };

export type ShopItem = {
  readonly id: string;
  readonly code: string;
  readonly slot: ItemSlot;
  readonly category: ShopCategory;
  readonly name: string;
  readonly grade: ItemGrade;
  readonly price: number;
  readonly minLevel: number;
  readonly defaultOwned: boolean;
  readonly roomSize?: number;
  readonly placementPolicy?: PlacementPolicy;
};
export type ShopOverview = {
  readonly balance: number;
  readonly level: number;
  readonly items: readonly ShopItem[];
  readonly ownedItemIds: readonly string[];
  readonly equippedItemIds: readonly string[];
};
export type ShopService = {
  getShop: () => Promise<ShopOverview>;
  purchase: (itemId: string) => Promise<void>;
};
export class ShopError extends Error {
  constructor(readonly reason: 'level-locked' | 'insufficient-volts' | 'not-found' | 'storage', readonly detail?: number) {
    super(`Shop ${reason}`);
    this.name = 'ShopError';
  }
}
