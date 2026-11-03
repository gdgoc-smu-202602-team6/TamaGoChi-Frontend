import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGameServices } from '@/state/game-services';

export function useNoticeWriteAccess(clubId: string) {
  const { clubAdmin } = useGameServices();
  const [allowed, setAllowed] = useState(false), alive = useRef(true), version = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const verify = useCallback(async () => {
    const request = ++version.current;
    let next = false;
    try { next = (await clubAdmin.getPermissions(clubId)).includes('notices.write'); } catch { /* No management controls until access is verified. */ }
    if (!alive.current || request !== version.current) return false;
    setAllowed(next); return next;
  }, [clubAdmin, clubId]);
  useFocusEffect(useCallback(() => {
    setAllowed(false); void verify();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void verify(); });
    return () => { version.current++; subscription.remove(); };
  }, [verify]));
  return { allowed, verify };
}
