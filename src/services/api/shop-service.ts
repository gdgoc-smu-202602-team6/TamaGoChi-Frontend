import { itemSlots, ShopError, shopCategories, type ShopItem, type ShopService } from '../../types/shop';
import { categoryForSlot } from '../../utils/shop';
import { isDateTime, isSessionId, parseStats } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

const isId = isSessionId; // OpenAPI Item IDs share the UUID format.
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  return value as Record<string, unknown>;
}
function integer(value: unknown, minimum = 0): boolean { return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum; }
function items(value: unknown): unknown[] {
  const data = record(value);
  if (!Array.isArray(data.items)) throw new ApiError('response');
  return data.items;
}
function catalogItem(value: unknown): ShopItem {
  const data = record(value);
  if (!isId(data.id) || typeof data.code !== 'string' || !data.code || typeof data.name !== 'string' || !data.name
    || !itemSlots.includes(data.slot as ShopItem['slot']) || !shopCategories.includes(data.category as ShopItem['category'])
    || !['BASIC', 'COMMON', 'RARE', 'EPIC'].includes(data.grade as string) || !integer(data.price) || !integer(data.minLevel, 1) || typeof data.defaultOwned !== 'boolean') throw new ApiError('response');
  const item = data as ShopItem;
  if (categoryForSlot(item.slot) !== item.category || (item.slot === 'ROOM' && !integer(item.roomSize, 1))) throw new ApiError('response');
  return item;
}
function ownedItem(value: unknown): string {
  const data = record(value);
  if (!isId(data.itemId) || !integer(data.pricePaid) || (data.purchasedAt !== undefined && !isDateTime(data.purchasedAt))) throw new ApiError('response');
  return data.itemId;
}
function equippedItems(value: unknown): string[] {
  const data = record(value);
  if (!Array.isArray(data.equipped)) throw new ApiError('response');
  const seen = new Set<string>();
  return data.equipped.map(value => {
    const one = record(value);
    if (!isId(one.itemId) || !itemSlots.includes(one.slot as ShopItem['slot']) || seen.has(one.slot as string)) throw new ApiError('response');
    seen.add(one.slot as string);
    return one.itemId;
  });
}

export function createApiShopService(client: HttpClient): ShopService {
  return {
    async getShop() {
      const [catalog, owned, room, account] = await Promise.all([
        client.request('/items'), client.request('/users/me/items'), client.request('/users/me/room'), client.request('/users/me/stats'),
      ]);
      const entries = items(catalog.data).map(catalogItem);
      if (new Set(entries.map(item => item.id)).size !== entries.length) throw new ApiError('response');
      const stats = parseStats(account.data);
      return { items: entries, balance: stats.volts, level: stats.level, ownedItemIds: items(owned.data).map(ownedItem), equippedItemIds: equippedItems(room.data) };
    },
    async purchase(itemId) {
      if (!isId(itemId)) throw new ShopError('not-found');
      try {
        const response = await client.request(`/users/me/items/${encodeURIComponent(itemId)}`, { method: 'PUT' });
        if (ownedItem(response.data) !== itemId) throw new ApiError('response');
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409 && error.code === 'level-locked') throw new ShopError('level-locked', error.details?.requiredLevel);
          if (error.status === 409 && error.code === 'insufficient-volts') throw new ShopError('insufficient-volts', error.details?.shortBy);
          if (error.status === 404) throw new ShopError('not-found');
        }
        throw error;
      }
    },
  };
}
