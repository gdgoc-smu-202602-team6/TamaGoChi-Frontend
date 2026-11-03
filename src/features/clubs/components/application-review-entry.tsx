import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { GameButton } from '@/components/ui/game-button';
import { useGameServices } from '@/state/game-services';

export function ApplicationReviewEntry({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { clubAdmin: service } = useGameServices();
  const [access, setAccess] = useState<{ clubId: string; allowed: boolean } | null>(null), [opening, setOpening] = useState(false);
  const alive = useRef(true), version = useRef(0), busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const verify = useCallback(async (open = false) => {
    if (busy.current) return;
    const request = ++version.current;
    if (open) { busy.current = true; setOpening(true); }
    try {
      const allowed = (await service.getPermissions(clubId)).includes('applications.decide');
      if (!alive.current || request !== version.current) return;
      setAccess({ clubId, allowed });
      if (open && allowed) router.push({ pathname: '/clubs/[clubId]/applications', params: { clubId } });
    } catch { if (alive.current && request === version.current) setAccess({ clubId, allowed: false }); }
    finally { if (open) { busy.current = false; if (alive.current) setOpening(false); } }
  }, [service, clubId]);
  useFocusEffect(useCallback(() => {
    void verify();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void verify(); });
    return () => { version.current++; subscription.remove(); };
  }, [verify]));
  if (access?.clubId !== clubId || !access.allowed) return null;
  return <GameButton compact variant="secondary" label={opening ? '권한 확인 중…' : '가입 신청 관리'} accessibilityLabel={`${clubName} 가입 신청 관리`} disabled={opening} onPress={() => { void verify(true); }} />;
}
