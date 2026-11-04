import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { apiErrorMessage } from '@/services/api/http-client';
import { useGameServices } from '@/state/game-services';
import { RoomEditError, type Placement, type PlacementTarget, type RoomLayout, type RoomOverview } from '@/types/room';
import type { ShopItem } from '@/types/shop';
import { changeRoomEquipment, moveRoomTarget, sameRoomLayout, validateRoomLayout } from '@/utils/room-layout';

type Snapshot = { data: RoomOverview; baseline: RoomLayout; draft: RoomLayout };
export function useRoomEditor() {
  const { room: service, invalidate } = useGameServices();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), current = useRef<Snapshot | null>(null);
  const [operation, setOperation] = useState<'read' | 'save' | null>('read'), [blocked, setBlocked] = useState<'changed' | 'uncertain' | null>(null);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false), alive = useRef(true), block = useRef<typeof blocked>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const update = useCallback((next: Snapshot) => { current.current = next; setSnapshot(next); }, []);
  const preventWrites = useCallback((reason: typeof blocked) => { block.current = reason; setBlocked(reason); }, []);
  const refresh = useCallback(async (replace = false) => {
    if (busy.current) return;
    busy.current = true; setOperation('read'); setError(null); setNotice(null);
    try {
      const next = await service.getRoom();
      if (!alive.current) return;
      const old = current.current;
      if (!old || replace || sameRoomLayout(old.baseline, old.draft) || sameRoomLayout(old.draft, next.layout)) {
        update({ data: next, baseline: next.layout, draft: next.layout }); preventWrites(null);
        if (old && !replace && !sameRoomLayout(old.baseline, old.draft)) setNotice('편집한 내용이 서버에 저장된 것을 확인했어요.');
      } else if (sameRoomLayout(old.baseline, next.layout)) {
        try {
          validateRoomLayout(old.draft, next.items, next.ownedItemIds);
          update({ ...old, data: next }); preventWrites(null);
        } catch { preventWrites('changed'); }
      } else preventWrites('changed');
    } catch (reason) { if (alive.current) { preventWrites('uncertain'); setError(apiErrorMessage(reason)); } }
    finally { busy.current = false; if (alive.current) setOperation(null); }
  }, [service, update, preventWrites]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]));
  function edit(work: (old: Snapshot) => RoomLayout) {
    if (busy.current || block.current || !current.current) return;
    try { const old = current.current; update({ ...old, draft: work(old) }); setError(null); setNotice(null); }
    catch { setError('물건이 방 안에 들어오고 같은 면의 다른 물건과 겹치지 않도록 옮겨 주세요.'); }
  }
  const toggle = (item: ShopItem) => edit(old => changeRoomEquipment(old.draft, item, old.data.items, old.data.ownedItemIds));
  const move = (point: Placement) => edit(old => moveRoomTarget(old.draft, point.target, point.x, point.y, old.data.items, point.surface));
  const cancelMove = (target: PlacementTarget, previous?: Placement) => edit(old => ({ ...old.draft, placements: [...old.draft.placements.filter(one => one.target !== target), ...(previous ? [previous] : [])] }));
  const resetPositions = () => edit(old => ({ ...old.draft, placements: [] }));
  async function save() {
    if (busy.current || block.current || !current.current) return false;
    busy.current = true; setOperation('save'); setError(null); setNotice(null);
    const old = current.current;
    try {
      const next = await service.saveRoom(old.draft, old.baseline);
      if (!alive.current) return false;
      update({ data: next, baseline: next.layout, draft: next.layout }); preventWrites(null); invalidate();
      return true;
    } catch (reason) {
      if (!alive.current) return false;
      if (reason instanceof RoomEditError) {
        if (reason.reason === 'changed' || reason.reason === 'not-owned') { preventWrites('changed'); setError('서버의 방이나 보유 목록이 바뀌었어요. 편집 내용은 유지했어요.'); }
        else if (reason.reason === 'uncertain' || reason.reason === 'storage') { preventWrites('uncertain'); setError('저장 결과를 확인하지 못했어요. 상태를 다시 확인해 주세요.'); }
        else setError('방 배치와 보유 아이템을 확인해 주세요.');
      } else setError(apiErrorMessage(reason));
      return false;
    } finally { busy.current = false; if (alive.current) setOperation(null); }
  }
  return { snapshot, operation, blocked, error, notice, dirty: !!snapshot && !sameRoomLayout(snapshot.baseline, snapshot.draft), refresh, toggle, move, cancelMove, resetPositions, save };
}
