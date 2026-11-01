import { StudyRules } from '../constants/study';
import type { HomeOverview } from '../types/home';
import { StudyServiceError, type StudyResult, type StudySession } from '../types/study';
import { getElapsedStudySeconds, getServiceDayKey, splitStudyInterval } from '../utils/study-time';
import { ShopError, itemSlots, type ItemSlot, type ShopOverview } from '../types/shop';
import { mockShopItems } from './shop';

export const MOCK_STUDY_STORAGE_KEY = '@tamagochi/mock-study/v1';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
type DayRecord = { studyMs: number; attendanceAwarded: boolean; goalAwarded: boolean };
type Database = {
  version: 1;
  base: HomeOverview;
  bolt: number;
  bugCount: number;
  bugProgressMs: number;
  days: Record<string, DayRecord>;
  active: StudySession | null;
  results: StudyResult[];
  shop?: { ownedItemIds: string[]; equipped: Partial<Record<ItemSlot, string>> };
};
type MockBackendOptions = {
  storage: Storage;
  initialHome: HomeOverview;
  isOnline: () => Promise<boolean>;
  now?: () => number;
  createId?: () => string;
};

const emptyDay = (): DayRecord => ({ studyMs: 0, attendanceAwarded: false, goalAwarded: false });
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function isSession(value: unknown): value is StudySession {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
    && typeof value.startedAt === 'string' && Number.isFinite(Date.parse(value.startedAt));
}

function isResult(value: unknown): value is StudyResult {
  return isRecord(value) && typeof value.sessionId === 'string'
    && typeof value.startedAt === 'string' && Number.isFinite(Date.parse(value.startedAt))
    && typeof value.endedAt === 'string' && Number.isFinite(Date.parse(value.endedAt))
    && ['elapsedSeconds', 'creditedSeconds', 'bolt', 'studyXp', 'attendanceXp', 'goalXp', 'totalXp', 'bugsRemoved'].every((key) => isNumber(value[key]));
}

function validateDatabase(value: unknown): asserts value is Database {
  const valid = isRecord(value) && value.version === 1 && isRecord(value.base)
    && isRecord(value.base.profile) && typeof value.base.profile.nickname === 'string'
    && ['bolt', 'level', 'hearts'].every((key) => isNumber((value.base as HomeOverview).profile[key as keyof HomeOverview['profile']]))
    && isRecord(value.base.room) && typeof value.base.room.name === 'string' && typeof value.base.room.characterLabel === 'string'
    && isNumber(value.bolt) && Number.isInteger(value.bugCount) && isNumber(value.bugCount) && value.bugCount <= 3
    && isNumber(value.bugProgressMs) && isRecord(value.days)
    && Object.entries(value.days).every(([key, day]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && isRecord(day)
      && isNumber(day.studyMs) && typeof day.attendanceAwarded === 'boolean' && typeof day.goalAwarded === 'boolean')
    && (value.active === null || isSession(value.active)) && Array.isArray(value.results) && value.results.every(isResult)
    && (value.shop === undefined || (isRecord(value.shop) && Array.isArray(value.shop.ownedItemIds) && value.shop.ownedItemIds.every(id => typeof id === 'string')
      && isRecord(value.shop.equipped) && Object.entries(value.shop.equipped).every(([slot, id]) => itemSlots.includes(slot as ItemSlot) && typeof id === 'string' && (value.shop as { ownedItemIds: unknown[] }).ownedItemIds.includes(id))));
  if (!valid) throw new StudyServiceError('invalid-record', '저장된 공부 기록을 읽지 못했어요. 기록을 유지한 채 다시 시도해 주세요.');
}

export function createMockStudyBackend({ storage, initialHome, isOnline, now = Date.now, createId }: MockBackendOptions) {
  // Serialize this adapter's operations. Cross-device locking belongs to the real backend.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }

  async function save(state: Database) {
    try {
      await storage.setItem(MOCK_STUDY_STORAGE_KEY, JSON.stringify(state));
    } catch {
      throw new StudyServiceError('storage', '공부 기록을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.');
    }
  }

  async function load(): Promise<Database> {
    let raw: string | null;
    try {
      raw = await storage.getItem(MOCK_STUDY_STORAGE_KEY);
    } catch {
      throw new StudyServiceError('storage', '공부 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    if (raw !== null) {
      let value: unknown;
      try { value = JSON.parse(raw); } catch {
        throw new StudyServiceError('invalid-record', '저장된 공부 기록을 읽지 못했어요. 기록을 유지한 채 다시 시도해 주세요.');
      }
      validateDatabase(value);
      return value;
    }
    const state: Database = {
      version: 1,
      base: initialHome,
      bolt: initialHome.profile.bolt,
      bugCount: initialHome.bugs.count,
      bugProgressMs: initialHome.bugs.progressSeconds * 1000,
      days: { [getServiceDayKey(now())]: {
        studyMs: initialHome.todayStudySeconds * 1000,
        attendanceAwarded: initialHome.attendance.achieved,
        goalAwarded: initialHome.todayStudySeconds >= StudyRules.defaultGoalSeconds,
      } },
      active: null,
      results: [],
    };
    await save(state);
    return state;
  }

  function shopState(state: Database): NonNullable<Database['shop']> {
    if (state.shop) return state.shop;
    const defaults = mockShopItems.filter(item => item.defaultOwned);
    return { ownedItemIds: defaults.map(item => item.id), equipped: Object.fromEntries(defaults.map(item => [item.slot, item.id])) };
  }

  return {
    getShop: () => serial(async (): Promise<ShopOverview> => {
      const state = await load();
      const shop = shopState(state);
      return { items: mockShopItems, balance: state.bolt, level: state.base.profile.level, ownedItemIds: [...shop.ownedItemIds], equippedItemIds: Object.values(shop.equipped).filter((id): id is string => !!id) };
    }),
    purchase: (itemId: string) => serial(async () => {
      const state = await load();
      const shop = shopState(state);
      const item = mockShopItems.find(one => one.id === itemId);
      if (!item) throw new ShopError('not-found');
      if (shop.ownedItemIds.includes(item.id)) return;
      if (state.base.profile.level < item.minLevel) throw new ShopError('level-locked', item.minLevel);
      if (state.bolt < item.price) throw new ShopError('insufficient-volts', item.price - state.bolt);
      state.bolt -= item.price;
      state.shop = { ownedItemIds: [...shop.ownedItemIds, item.id], equipped: { ...shop.equipped, [item.slot]: item.id } };
      try { await save(state); } catch { throw new ShopError('storage'); }
    }),
    getActiveSession: () => serial(async () => (await load()).active),
    getResult: (sessionId: string) => serial(async () => (await load()).results.find((result) => result.sessionId === sessionId) ?? null),

    getHome: () => serial(async (): Promise<HomeOverview> => {
      const state = await load();
      const day = state.days[getServiceDayKey(now())] ?? emptyDay();
      const seconds = Math.floor(day.studyMs / 1000);
      return {
        ...state.base,
        profile: { ...state.base.profile, bolt: state.bolt },
        todayStudySeconds: seconds,
        attendance: { studySeconds: seconds, requiredSeconds: StudyRules.attendanceSeconds, achieved: day.studyMs >= StudyRules.attendanceSeconds * 1000 },
        bugs: { count: state.bugCount, progressSeconds: Math.floor(state.bugProgressMs / 1000), requiredSeconds: StudyRules.bugClearSeconds },
      };
    }),

    startSession: () => serial(async (): Promise<StudySession> => {
      const state = await load();
      if (state.active) return state.active;
      let online = false;
      try { online = await isOnline(); } catch { /* Treat an unknown connection state as offline. */ }
      if (!online) throw new StudyServiceError('offline', '새 공부를 시작하려면 인터넷 연결이 필요해요. 연결 상태를 확인해 주세요.');
      const timestamp = now();
      const session: StudySession = {
        id: createId?.() ?? `mock-${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
        startedAt: new Date(timestamp).toISOString(),
      };
      state.active = session;
      await save(state);
      return session;
    }),

    finishSession: (sessionId: string) => serial(async (): Promise<StudyResult> => {
      const state = await load();
      const existing = state.results.find((result) => result.sessionId === sessionId);
      if (existing) return existing;
      if (state.active?.id !== sessionId) throw new StudyServiceError('missing-session', '진행 중인 공부를 찾지 못했어요. 내 방에서 다시 확인해 주세요.');
      const session = state.active;
      const startedMs = Date.parse(session.startedAt);
      const endedMs = Math.max(startedMs, now());
      const recognizedMs = Math.min(endedMs - startedMs, StudyRules.maxSessionSeconds * 1000);
      const creditedSeconds = Math.floor(recognizedMs / 1000);
      const bolt = Math.floor(creditedSeconds / 60) * StudyRules.boltPerMinute;
      const studyXp = Math.floor(creditedSeconds / 60) * StudyRules.xpPerMinute;
      let attendanceXp = 0;
      let goalXp = 0;
      for (const segment of splitStudyInterval(startedMs, startedMs + recognizedMs)) {
        const day = state.days[segment.day] ?? emptyDay();
        day.studyMs += segment.durationMs;
        if (!day.attendanceAwarded && day.studyMs >= StudyRules.attendanceSeconds * 1000) {
          attendanceXp += StudyRules.attendanceBonusXp;
          day.attendanceAwarded = true;
        }
        if (!day.goalAwarded && day.studyMs >= StudyRules.defaultGoalSeconds * 1000) {
          goalXp += StudyRules.goalBonusXp;
          day.goalAwarded = true;
        }
        state.days[segment.day] = day;
      }
      const bugProgress = state.bugCount > 0 ? state.bugProgressMs + recognizedMs : 0;
      const bugsRemoved = Math.min(state.bugCount, Math.floor(bugProgress / (StudyRules.bugClearSeconds * 1000)));
      state.bugCount -= bugsRemoved;
      state.bugProgressMs = state.bugCount > 0 ? bugProgress % (StudyRules.bugClearSeconds * 1000) : 0;
      const result: StudyResult = {
        sessionId, startedAt: session.startedAt, endedAt: new Date(endedMs).toISOString(),
        elapsedSeconds: getElapsedStudySeconds(session.startedAt, endedMs), creditedSeconds,
        bolt, studyXp, attendanceXp, goalXp, totalXp: studyXp + attendanceXp + goalXp, bugsRemoved,
      };
      state.bolt += bolt;
      state.active = null;
      state.results.unshift(result);
      // Save the receipt and balance together before acknowledging completion.
      await save(state);
      return result;
    }),
  };
}
