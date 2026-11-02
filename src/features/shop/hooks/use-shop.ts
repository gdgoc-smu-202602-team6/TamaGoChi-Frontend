import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiErrorMessage } from '@/services/api/http-client';
import { useGameServices } from '@/state/game-services';
import { ShopError, type ShopItem, type ShopOverview } from '@/types/shop';
import { itemPurchaseState, shopErrorText } from '@/utils/shop';

export function useShop() {
  const { shop: service, invalidate } = useGameServices();
  const [data, setData] = useState<ShopOverview | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);
  const version = useRef(0);
  const busy = useRef(false);
  const snapshot = useRef<ShopOverview | null>(null);
  const verified = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    const request = ++version.current;
    verified.current = false;
    setRefreshing(true);
    setNotice(null);
    try {
      const next = await service.getShop();
      if (!mounted.current || version.current !== request) return;
      snapshot.current = next;
      verified.current = true;
      setData(next); setUnverified(false); setError(null);
    } catch {
      if (mounted.current && version.current === request) {
        setUnverified(true);
        setError('상점 정보를 확인하지 못했어요. 연결 상태를 확인하고 다시 불러와 주세요.');
      }
    } finally {
      if (mounted.current && version.current === request) setRefreshing(false);
    }
  }, [service]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const purchase = useCallback(async (item: ShopItem) => {
    if (busy.current || !verified.current || !snapshot.current || itemPurchaseState(item, snapshot.current) !== 'available') return;
    busy.current = true;
    const request = ++version.current; // An older GET must never overwrite the purchase refresh.
    verified.current = false;
    setPurchasing(item.id); setRefreshing(false); setNotice(null); setError(null);
    let failure: unknown;
    try { await service.purchase(item.id); } catch (error) { failure = error; }
    if (!mounted.current || version.current !== request) return;
    // A lost response may have completed the purchase. Reconcile before allowing another tap.
    try {
      const next = await service.getShop();
      if (!mounted.current || version.current !== request) return;
      snapshot.current = next; verified.current = true;
      setData(next); setUnverified(false);
      if (next.ownedItemIds.includes(item.id)) setNotice(`${item.name} 보유를 확인했어요.${next.equippedItemIds.includes(item.id) ? ' 장착 중이에요.' : ''}`);
      else if (failure) setError(failure instanceof ShopError ? shopErrorText(failure) : apiErrorMessage(failure));
      else {
        verified.current = false; setUnverified(true);
        setError('구매 상태를 확인하지 못했어요. 다시 불러와 주세요.');
      }
    } catch {
      if (mounted.current && version.current === request) {
        setUnverified(true);
        setError('구매 상태를 다시 확인해야 해요. 다시 불러온 뒤 보유 목록과 Bolt를 확인해 주세요.');
      }
    } finally {
      busy.current = false;
      if (mounted.current && version.current === request) { setPurchasing(null); invalidate(); }
    }
  }, [service, invalidate]);

  return { data, refreshing, purchasing, unverified, error, notice, refresh, purchase };
}
