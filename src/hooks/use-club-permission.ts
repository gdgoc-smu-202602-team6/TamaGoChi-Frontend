import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGameServices } from '@/state/game-services';
import type { ClubPermission } from '@/types/club-admin';

export function useClubPermission(clubId: string, permission: ClubPermission) {
  const { clubAdmin } = useGameServices();
  const [allowed, setAllowed] = useState(false), alive = useRef(true), version = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const verify = useCallback(async () => {
    const request = ++version.current;
    let next = false;
    try { next = (await clubAdmin.getPermissions(clubId)).includes(permission); } catch { /* Failed permission lookup does not grant access. */ }
    if (!alive.current || request !== version.current) return false;
    setAllowed(next); return next;
  }, [clubAdmin, clubId, permission]);
  useFocusEffect(useCallback(() => {
    setAllowed(false); void verify();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void verify(); });
    return () => { version.current++; subscription.remove(); };
  }, [verify]));
  return { allowed, verify };
}
