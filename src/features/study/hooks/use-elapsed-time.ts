import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getElapsedStudySeconds } from '@/utils/study-time';

export function useElapsedTime(startedAt: string | undefined) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    // The interval only redraws. Elapsed time always comes from the persisted timestamp.
    const update = () => setNow(Date.now());
    const interval = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') update();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [startedAt]);
  return startedAt ? getElapsedStudySeconds(startedAt, now) : 0;
}
