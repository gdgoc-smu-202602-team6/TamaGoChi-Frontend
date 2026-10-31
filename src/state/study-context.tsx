import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { studyErrorMessage, studyService } from '@/services/study';
import type { StudyResult, StudyService, StudySession } from '@/types/study';

type StudyState = {
  status: 'loading' | 'ready' | 'error';
  session: StudySession | null;
  error: string | null;
};
type StudyContextValue = {
  state: StudyState;
  operation: 'start' | 'finish' | null;
  revision: number;
  refresh: () => Promise<void>;
  startStudy: () => Promise<StudySession>;
  finishStudy: (sessionId: string) => Promise<StudyResult>;
};

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children, service = studyService }: PropsWithChildren<{ service?: StudyService }>) {
  const [state, setState] = useState<StudyState>({ status: 'loading', session: null, error: null });
  const [operation, setOperation] = useState<StudyContextValue['operation']>(null);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  const generation = useRef(0);
  const starting = useRef<Promise<StudySession> | null>(null);
  const finishing = useRef<Promise<StudyResult> | null>(null);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const session = await service.getActiveSession();
      if (alive.current && request === generation.current) {
        setState({ status: 'ready', session, error: null });
        setRevision((value) => value + 1);
      }
    } catch (error) {
      if (alive.current && request === generation.current) {
        setState((previous) => ({ ...previous, status: 'error', error: studyErrorMessage(error) }));
      }
    }
  }, [service]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh();
    });
    return () => {
      alive.current = false;
      generation.current += 1;
      subscription.remove();
    };
  }, [refresh]);

  const startStudy = useCallback(() => {
    if (starting.current) return starting.current;
    generation.current += 1;
    setOperation('start');
    const promise = Promise.resolve().then(() => service.startSession()).then((session) => {
      if (alive.current) setState({ status: 'ready', session, error: null });
      return session;
    }).finally(() => {
      starting.current = null;
      if (alive.current) setOperation(null);
    });
    starting.current = promise;
    return promise;
  }, [service]);

  const finishStudy = useCallback((sessionId: string) => {
    if (finishing.current) return finishing.current;
    generation.current += 1;
    setOperation('finish');
    const promise = Promise.resolve().then(() => service.finishSession(sessionId)).then((result) => {
      if (alive.current) {
        setState({ status: 'ready', session: null, error: null });
        setRevision((value) => value + 1);
      }
      return result;
    }).finally(() => {
      finishing.current = null;
      if (alive.current) setOperation(null);
    });
    finishing.current = promise;
    return promise;
  }, [service]);

  const value = useMemo(() => ({ state, operation, revision, refresh, startStudy, finishStudy }), [state, operation, revision, refresh, startStudy, finishStudy]);
  return <StudyContext value={value}>{children}</StudyContext>;
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
}
