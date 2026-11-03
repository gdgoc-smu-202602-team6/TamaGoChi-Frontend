import { useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { AppState } from 'react-native';

import { useGameServices } from '@/state/game-services';
import type { HomeOverview, HomeService } from '@/types/home';

type HomeState =
  | { status: 'loading' }
  | { status: 'ready'; data: HomeOverview }
  | { status: 'error' };

export function useHome(override?: HomeService, refreshKey = 0) {
  const services = useGameServices();
  const service = override ?? services.home;
  const [state, setState] = useState<HomeState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) return;
    let active = true;
    let request = 0;
    // Also turn synchronous adapter failures into a rejected promise.
    const read = () => {
      const currentRequest = ++request;
      return Promise.resolve()
        .then(() => service.getHome())
        .then(
          (data) => {
            if (active && request === currentRequest) setState({ status: 'ready', data });
          },
          () => {
            if (active && request === currentRequest) setState({ status: 'error' });
          },
        );
    };
    void read();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void read(); });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [focused, service, attempt, refreshKey, services.revision]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}
