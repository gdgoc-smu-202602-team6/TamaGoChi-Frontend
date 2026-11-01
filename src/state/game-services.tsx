import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, useCallback, type PropsWithChildren } from 'react';

import { apiBaseUrl, isMockMode } from '@/constants/api';
import { apiClient } from '@/services/auth';
import { createAuthorizedClient } from '@/services/api/authorized-client';
import { createApiHomeService } from '@/services/api/home-service';
import { createApiStudyService } from '@/services/api/study-service';
import { createApiShopService } from '@/services/api/shop-service';
import { mockBackend } from '@/services/mock-backend';
import { useAuth } from '@/state/auth-context';
import { StudyProvider } from '@/state/study-context';
import type { HomeService } from '@/types/home';
import type { StudyService } from '@/types/study';
import type { ShopService } from '@/types/shop';

type GameServices = { home: HomeService; study: StudyService; shop: ShopService };
type GameContext = GameServices & { revision: number; invalidate: () => void };
const GameServicesContext = createContext<GameContext | null>(null);

function createLease() {
  let current = true;
  return { isCurrent: () => current, open: () => { current = true; }, close: () => { current = false; } };
}

export function GameServicesProvider({ children }: PropsWithChildren) {
  const { state } = useAuth();
  return <GameScope key={isMockMode ? 'mock' : `${state.user?.id ?? 'anonymous'}:${state.epoch}`} >{children}</GameScope>;
}

function GameScope({ children }: PropsWithChildren) {
  const { state, refresh } = useAuth();
  const [revision, setRevision] = useState(0);
  const invalidate = useCallback(() => setRevision(value => value + 1), []);
  const lease = useMemo(() => createLease(), []);
  useEffect(() => { lease.open(); return () => { lease.close(); }; }, [lease]);
  // A scope owns a fixed token. Old async work can never acquire another account's token.
  const services = useMemo<GameServices>(() => {
    if (isMockMode) return { home: mockBackend, study: mockBackend, shop: mockBackend };
    const token = state.token;
    const client = createAuthorizedClient(apiClient, { getToken: async () => token, isCurrent: lease.isCurrent, onUnauthorized: () => { void refresh(); } });
    const key = `@tamagochi/api-study/v1/${encodeURIComponent(apiBaseUrl)}/${encodeURIComponent(state.user?.id ?? 'anonymous')}`;
    return { home: createApiHomeService(client), shop: createApiShopService(client), study: createApiStudyService(client, {
      get: () => AsyncStorage.getItem(key), set: value => AsyncStorage.setItem(key, value),
    }) };
  }, [state.token, state.user?.id, refresh, lease]);
  const value = useMemo(() => ({ ...services, revision, invalidate }), [services, revision, invalidate]);
  return <GameServicesContext value={value}>
    <StudyProvider service={services.study} enabled={isMockMode || (state.status === 'ready' && !!state.user)}>{children}</StudyProvider>
  </GameServicesContext>;
}

export function useGameServices(): GameContext {
  const services = useContext(GameServicesContext);
  if (!services) throw new Error('useGameServices must be used within GameServicesProvider');
  return services;
}
