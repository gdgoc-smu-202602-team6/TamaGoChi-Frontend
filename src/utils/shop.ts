import { ShopError, type ItemSlot, type ShopCategory, type ShopItem, type ShopOverview } from '../types/shop';

export function categoryForSlot(slot: ItemSlot): ShopCategory {
  if (slot === 'ROOM') return 'ROOM_SIZE';
  if (slot === 'CHARACTER') return 'CHARACTER';
  if (slot === 'WALLPAPER') return 'WALLPAPER';
  if (slot === 'HEAD' || slot === 'FACE' || slot === 'NECK') return 'ACCESSORY';
  return 'FURNITURE';
}

export function itemPurchaseState(item: ShopItem, shop: ShopOverview): 'equipped' | 'owned' | 'off-sale' | 'locked' | 'unaffordable' | 'available' {
  if (shop.equippedItemIds.includes(item.id)) return 'equipped';
  if (shop.ownedItemIds.includes(item.id)) return 'owned';
  // Owners keep an item after it leaves sale; everyone else just cannot buy it.
  if (!item.onSale) return 'off-sale';
  if (shop.level < item.minLevel) return 'locked';
  if (shop.balance < item.price) return 'unaffordable';
  return 'available';
}

export function shopErrorText(error: ShopError): string {
  if (error.reason === 'not-on-sale') return '지금은 판매하지 않는 아이템이에요.';
  if (error.reason === 'level-locked') return error.detail ? `LV.${error.detail}부터 구매할 수 있어요.` : '구매 가능한 레벨에 아직 도달하지 않았어요.';
  if (error.reason === 'insufficient-volts') return error.detail ? `Bolt가 ${error.detail.toLocaleString()} 부족해요.` : 'Bolt가 부족해요. 공부해서 모아 보세요.';
  if (error.reason === 'not-found') return '이 아이템을 찾지 못했어요. 목록을 다시 확인해 주세요.';
  return '아이템 상태를 저장하지 못했어요. 다시 확인해 주세요.';
}
