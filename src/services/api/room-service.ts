import { RoomEditError, type RoomLayout, type RoomOverview, type RoomService } from '../../types/room';
import { sameRoomLayout, validateRoomLayout } from '../../utils/room-layout';
import { parseRoom, isSessionId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';
import { parseOwnedItemIds, parseShopCatalog } from './shop-service';

export function parseRoomLayout(value: unknown, items: RoomOverview['items'], owned: readonly string[], userId?: string): Pick<RoomOverview, 'layout' | 'condition'> {
  const dto = parseRoom(value) as unknown as Record<string, unknown>;
  if (typeof dto.userId !== 'string' || !dto.userId || (userId && dto.userId !== userId) || !Array.isArray(dto.equipped) || !Array.isArray(dto.placements)) throw new ApiError('response');
  const record = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response'); return value as Record<string, unknown>; };
  const equipped = dto.equipped.map(value => { const one = record(value); if (!isSessionId(one.itemId) || typeof one.slot !== 'string') throw new ApiError('response'); return { slot: one.slot, itemId: one.itemId }; });
  const placements = dto.placements.map(value => { const one = record(value); if (typeof one.target !== 'string' || typeof one.x !== 'number' || typeof one.y !== 'number') throw new ApiError('response'); return { target: one.target, x: one.x, y: one.y, ...(one.surface !== undefined ? { surface: one.surface } : {}) }; });
  if (dto.wallHeight !== undefined && dto.wallHeight !== 3) throw new ApiError('response');
  const result = { equipped, placements, ...(dto.wallHeight !== undefined ? { wallHeight: dto.wallHeight } : {}) } as RoomLayout;
  try { validateRoomLayout(result, items, owned); } catch { throw new ApiError('response'); }
  const condition = parseRoom(value).condition;
  return { layout: result, condition: { hearts: condition.hearts, bugs: condition.bugs, bugProgressSeconds: condition.bugProgressSeconds } };
}
export function createApiRoomService(client: HttpClient, userId?: string): RoomService {
  async function getRoom(): Promise<RoomOverview> {
    const [catalog, ownership, room] = await Promise.all([client.request('/items'), client.request('/users/me/items'), client.request('/users/me/room')]);
    const items = parseShopCatalog(catalog.data), ownedItemIds = parseOwnedItemIds(ownership.data);
    return { items, ownedItemIds, ...parseRoomLayout(room.data, items, ownedItemIds, userId) };
  }
  return {
    getRoom,
    async saveRoom(draft, baseline) {
      const current = await getRoom();
      validateRoomLayout(draft, current.items, current.ownedItemIds);
      if (sameRoomLayout(current.layout, draft)) return current;
      if (!sameRoomLayout(current.layout, baseline)) throw new RoomEditError('changed');
      // Serialize only writable decoration fields; never send condition or guestbook timestamps.
      const body: RoomLayout = { equipped: draft.equipped.map(({ slot, itemId }) => ({ slot, itemId })), placements: draft.placements.map(({ target, x, y, surface }) => ({ target, x, y, ...(draft.wallHeight !== undefined ? { surface } : {}) })) };
      try {
        const result = parseRoomLayout((await client.request('/users/me/room', { method: 'PATCH', body })).data, current.items, current.ownedItemIds, userId);
        if (!sameRoomLayout(result.layout, draft)) throw new ApiError('response');
        return { ...current, ...result };
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'http' && error.status && error.status < 500 && error.status !== 408) {
          if (error.code === 'not-owned') throw new RoomEditError('not-owned');
          throw error;
        }
        // Recover an applied PATCH by reading it, never by automatically writing again.
        try { const recovered = await getRoom(); if (sameRoomLayout(recovered.layout, draft)) return recovered; } catch { /* Keep the caller's draft and require a read-only check. */ }
        throw new RoomEditError('uncertain');
      }
    },
  };
}
