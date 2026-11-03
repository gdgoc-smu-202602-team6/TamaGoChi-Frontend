import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, useCallback, type PropsWithChildren } from 'react';

import { apiBaseUrl, isMockMode } from '@/constants/api';
import { apiClient } from '@/services/auth';
import { createAuthorizedClient } from '@/services/api/authorized-client';
import { createApiHomeService } from '@/services/api/home-service';
import { createApiStudyService } from '@/services/api/study-service';
import { createApiShopService } from '@/services/api/shop-service';
import { createApiProfileService } from '@/services/api/profile-service';
import { createApiNoticeService } from '@/services/api/notice-service';
import { createMockNoticeService } from '@/mocks/notices';
import { createApiClubJoinService } from '@/services/api/club-join-service';
import { createMockClubJoinService } from '@/mocks/club-join';
import { createApiClubCreateService } from '@/services/api/club-create-service';
import { createMockClubCreateService } from '@/mocks/club-create';
import { mockBackend } from '@/services/mock-backend';
import { useAuth } from '@/state/auth-context';
import { StudyProvider } from '@/state/study-context';
import type { HomeService } from '@/types/home';
import type { StudyService } from '@/types/study';
import type { ShopService } from '@/types/shop';
import type { ProfileService } from '@/types/profile';
import type { NoticeService } from '@/types/notice';
import type { ClubJoinService } from '@/types/club-join';
import type { ClubCreateService } from '@/types/club-create';
import { ClubProvider } from '@/state/club-context';
import { createApiRoomService } from '@/services/api/room-service';
import type { RoomService } from '@/types/room';
import type { ClubAdminService } from '@/types/club-admin';
import { createApiClubAdminService } from '@/services/api/club-admin-service';
import { createMockClubAdminService } from '@/mocks/club-admin';

type GameServices = { home: HomeService; study: StudyService; shop: ShopService; profile: ProfileService; notices: NoticeService; clubJoin: ClubJoinService; clubCreate: ClubCreateService; room: RoomService; clubAdmin: ClubAdminService };
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
    if (isMockMode) return { home: mockBackend, study: mockBackend, shop: mockBackend, profile: mockBackend, room: mockBackend, notices: createMockNoticeService(AsyncStorage), clubJoin: createMockClubJoinService(AsyncStorage), clubCreate: createMockClubCreateService(AsyncStorage), clubAdmin: createMockClubAdminService(AsyncStorage) };
    const token = state.token;
    const client = createAuthorizedClient(apiClient, { getToken: async () => token, isCurrent: lease.isCurrent, onUnauthorized: () => { void refresh(); } });
    const key = `@tamagochi/api-study/v1/${encodeURIComponent(apiBaseUrl)}/${encodeURIComponent(state.user?.id ?? 'anonymous')}`;
    const notices = createApiNoticeService(client);
    const namesKey = `@tamagochi/club-names/v1/${encodeURIComponent(apiBaseUrl)}/${encodeURIComponent(state.user?.id ?? 'anonymous')}`;
    const clubJoin = createApiClubJoinService(client, notices, state.user?.id ?? 'anonymous', { get: () => AsyncStorage.getItem(namesKey), set: value => AsyncStorage.setItem(namesKey, value) });
    const createKey = `@tamagochi/club-create-intent/v1/${encodeURIComponent(apiBaseUrl)}/${encodeURIComponent(state.user?.id ?? 'anonymous')}`;
    const clubCreate = createApiClubCreateService(client, { get: () => AsyncStorage.getItem(createKey), set: value => value === null ? AsyncStorage.removeItem(createKey) : AsyncStorage.setItem(createKey, value) });
    const room = createApiRoomService(client, state.user?.id ?? 'anonymous');
    return { home: createApiHomeService(client, room), room, shop: createApiShopService(client), profile: createApiProfileService(client), notices, clubJoin, clubCreate, clubAdmin: createApiClubAdminService(client), study: createApiStudyService(client, {
      get: () => AsyncStorage.getItem(key), set: value => AsyncStorage.setItem(key, value),
    }) };
  }, [state.token, state.user?.id, refresh, lease]);
  const clubStore = useMemo(() => {
    const key = isMockMode ? '@tamagochi/mock-club-selection/v1' : `@tamagochi/club-selection/v1/${encodeURIComponent(apiBaseUrl)}/${encodeURIComponent(state.user?.id ?? 'anonymous')}`;
    return { get: () => AsyncStorage.getItem(key), set: (id: string | null) => id === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, id) };
  }, [state.user?.id]);
  const value = useMemo(() => ({ ...services, revision, invalidate }), [services, revision, invalidate]);
  return <GameServicesContext value={value}>
    <ClubProvider service={services.notices} store={clubStore} enabled={isMockMode || (state.status === 'ready' && !!state.user)}>
      <StudyProvider service={services.study} enabled={isMockMode || (state.status === 'ready' && !!state.user)}>{children}</StudyProvider>
    </ClubProvider>
  </GameServicesContext>;
}

export function useGameServices(): GameContext {
  const services = useContext(GameServicesContext);
  if (!services) throw new Error('useGameServices must be used within GameServicesProvider');
  return services;
}
