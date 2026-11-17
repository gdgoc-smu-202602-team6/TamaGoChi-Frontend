import type { RoomOverview } from '../types/room';
import type { ShopItem } from '../types/shop';
import { validateRoomLayout } from './room-layout';

export type ProfileInventory = { readonly ownedCount: number; readonly character?: ShopItem; readonly accessories: readonly ShopItem[] };
export function profileInventory(room: RoomOverview): ProfileInventory {
  const catalog = new Set(room.items.map(item => item.id)), owned = new Set(room.ownedItemIds);
  if (catalog.size !== room.items.length || owned.size !== room.ownedItemIds.length || room.ownedItemIds.some(id => !catalog.has(id)) || room.items.some(item => item.defaultOwned && !owned.has(item.id))) throw new Error('Invalid profile inventory');
  validateRoomLayout(room.layout, room.items, room.ownedItemIds);
  const accessories = (['HEAD', 'FACE', 'NECK'] as const).flatMap(slot => {
    const equipped = room.layout.equipped.find(one => one.slot === slot);
    return equipped ? [room.items.find(item => item.id === equipped.itemId)!] : [];
  });
  const characterId = room.layout.equipped.find(one => one.slot === 'CHARACTER')?.itemId, character = room.items.find(item => item.id === characterId);
  return { ownedCount: owned.size, ...character ? { character } : {}, accessories };
}
