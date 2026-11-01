import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { studyErrorMessage } from '@/services/study';
import type { StudyResult, StudyService, StudySession } from '@/types/study';
import { sessionEndIntent } from '@/utils/session-clock';

type StudyState = {
  status: 'loading' | 'ready' | 'error';
  session: StudySession | null;
  error: string | null;
  completedSessionId: string | null;
};
type StudyContextValue = {
  state: StudyState;
  operation: 'start' | 'finish' | null;
  revision: number;
  refresh: () => Promise<void>;
  startStudy: () => Promise<StudySession>;
  finishStudy: (sessionId: string) => Promise<StudyResult>;
  acknowledgeResult: (sessionId: string) => Promise<void>;
};

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children, service, enabled = true }: PropsWithChildren<{ service: StudyService; enabled?: boolean }>) {
  const [state, setState] = useState<StudyState>({ status: 'loading', session: null, completedSessionId: null, error: null });
  const [operation, setOperation] = useState<StudyContextValue['operation']>(null);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  const generation = useRef(0);
  const starting = useRef<Promise<StudySession> | null>(null);
  const finishing = useRef<Promise<StudyResult> | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || starting.current || finishing.current) return;
    const request = ++generation.current;
    try {
      const recovery = service.getRecovery ? await service.getRecovery() : { session: await service.getActiveSession(), completedSessionId: null };
      if (alive.current && request === generation.current) {
        setState({ status: 'ready', ...recovery, error: null });
        setRevision((value) => value + 1);
      }
    } catch (error) {
      if (alive.current && request === generation.current) {
        setState((previous) => ({ ...previous, status: 'error', error: studyErrorMessage(error) }));
      }
    }
  }, [service, enabled]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh();
    });
    const polling = enabled && service.getRecovery ? setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 30000) : undefined;
    return () => {
      alive.current = false;
      generation.current += 1;
      subscription.remove();
      clearInterval(polling);
    };
  }, [refresh, enabled, service]);

  const startStudy = useCallback(() => {
    if (starting.current) return starting.current;
    const request = ++generation.current;
    setOperation('start');
    const promise = Promise.resolve().then(() => service.startSession()).then((session) => {
      if (alive.current && request === generation.current) setState(previous => ({ ...previous, status: 'ready', session, error: null }));
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
    const request = ++generation.current;
    setOperation('finish');
    const endedAt = sessionEndIntent();
    const promise = Promise.resolve().then(() => service.finishSession(sessionId, endedAt)).then((result) => {
      if (alive.current && request === generation.current) {
        setState({ status: 'ready', session: null, completedSessionId: result.sessionId, error: null });
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

  const acknowledgeResult = useCallback(async (id: string) => {
    await service.acknowledgeResult?.(id);
    if (alive.current) {
      setState(previous => previous.completedSessionId === id ? { ...previous, completedSessionId: null } : previous);
      setRevision(value => value + 1);
    }
  }, [service]);
  const value = useMemo(() => ({ state, operation, revision, refresh, startStudy, finishStudy, acknowledgeResult }), [state, operation, revision, refresh, startStudy, finishStudy, acknowledgeResult]);
  return <StudyContext value={value}>{children}</StudyContext>;
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
}
