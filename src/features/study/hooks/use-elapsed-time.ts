import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { StudySession } from '@/types/study';
import { elapsedSessionSeconds, monotonicNow } from '@/utils/session-clock';

export function useElapsedTime(session: StudySession | null) {
  const [now, setNow] = useState(monotonicNow);
  useEffect(() => {
    // The interval only redraws. Elapsed time always comes from the persisted timestamp.
    const update = () => setNow(monotonicNow());
    const interval = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') update();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [session?.id]);
  return session ? elapsedSessionSeconds(session, Math.max(now, session.timing?.monotonicMs ?? 0)) : 0;
}
