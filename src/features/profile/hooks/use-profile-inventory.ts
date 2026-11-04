import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGameServices } from '@/state/game-services';
import { profileInventory, type ProfileInventory } from '@/utils/profile-inventory';

export function useProfileInventory() {
  const { room } = useGameServices(), [data, setData] = useState<ProfileInventory | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(false), alive = useRef(true), version = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const refresh = useCallback(async () => {
    const request = ++version.current; setLoading(true); setData(null); setError(false);
    try { const next = profileInventory(await room.getRoom()); if (alive.current && request === version.current) setData(next); }
    catch { if (alive.current && request === version.current) setError(true); }
    finally { if (alive.current && request === version.current) setLoading(false); }
  }, [room]);
  useFocusEffect(useCallback(() => { void refresh(); const sub = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); }); return () => { sub.remove(); version.current++; }; }, [refresh]));
  return { data, loading, error, refresh };
}
