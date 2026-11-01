import { useEffect, useState } from 'react';

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

  useEffect(() => {
    let active = true;
    // Also turn synchronous adapter failures into a rejected promise.
    Promise.resolve()
      .then(() => service.getHome())
      .then(
        (data) => {
          if (active) setState({ status: 'ready', data });
        },
        () => {
          if (active) setState({ status: 'error' });
        },
      );
    return () => {
      active = false;
    };
  }, [service, attempt, refreshKey]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}
