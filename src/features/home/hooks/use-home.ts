import { useEffect, useState } from 'react';

import { homeService } from '@/services/home';
import type { HomeOverview, HomeService } from '@/types/home';

type HomeState =
  | { status: 'loading' }
  | { status: 'ready'; data: HomeOverview }
  | { status: 'error' };

export function useHome(service: HomeService = homeService) {
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
  }, [service, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}
