import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { useGameServices } from '@/state/game-services';

export function NoticeComposeEntry({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { clubAdmin } = useGameServices();
  const [allowed, setAllowed] = useState(false), [opening, setOpening] = useState(false);
  const alive = useRef(true), version = useRef(0), busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const verify = useCallback(async (open = false) => {
    if (busy.current) return;
    const request = ++version.current;
    if (open) { busy.current = true; setOpening(true); }
    try {
      const canWrite = (await clubAdmin.getPermissions(clubId)).includes('notices.write');
      if (!alive.current || request !== version.current) return;
      setAllowed(canWrite);
      if (open && canWrite) router.push({ pathname: '/clubs/[clubId]/notices/compose', params: { clubId } });
    } catch { if (alive.current && request === version.current) setAllowed(false); }
    finally { if (open) { busy.current = false; if (alive.current) setOpening(false); } }
  }, [clubAdmin, clubId]);
  useFocusEffect(useCallback(() => {
    setAllowed(false); void verify();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void verify(); });
    return () => { version.current++; subscription.remove(); };
  }, [verify]));
  if (!allowed) return null;
  return <GameButton compact label={opening ? '권한 확인 중…' : '+ 공지 쓰기'} accessibilityLabel={`${clubName} 공지 쓰기`} disabled={opening} onPress={() => { void verify(true); }} />;
}
