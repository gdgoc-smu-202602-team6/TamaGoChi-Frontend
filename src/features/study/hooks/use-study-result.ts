import { useEffect, useState } from 'react';

import { useGameServices } from '@/state/game-services';
import type { StudyResult } from '@/types/study';

type ResultState = { sessionId: string } & (
  | { status: 'loading' }
  | { status: 'ready'; result: StudyResult | null }
  | { status: 'error' }
);

export function useStudyResult(sessionId: string) {
  const { study: studyService } = useGameServices();
  const [state, setState] = useState<ResultState>({ sessionId, status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => studyService.getResult(sessionId)).then(
      (result) => { if (active) setState({ sessionId, status: 'ready', result }); },
      () => { if (active) setState({ sessionId, status: 'error' }); },
    );
    return () => { active = false; };
  }, [sessionId, attempt, studyService]);

  function retry() {
    setState({ sessionId, status: 'loading' });
    setAttempt((value) => value + 1);
  }
  return { state: state.sessionId === sessionId ? state : { sessionId, status: 'loading' as const }, retry };
}
