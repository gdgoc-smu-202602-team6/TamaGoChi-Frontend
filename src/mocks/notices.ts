import type { JoinedClub, Notice, NoticeCategory, NoticeFilter, NoticeService } from '../types/notice';
import { joinedMockClubs } from './clubs';

const clubs: readonly JoinedClub[] = [
  { id: 'mock-club-study', name: '함께 공부하는 모임', memberCount: 12 },
  { id: 'mock-club-pixel', name: '픽셀 메이커스', memberCount: 8 },
];
const categories: readonly NoticeCategory[] = [
  { id: 'mock-general', name: '전체공지', color: 'RED', subcategories: [] },
  { id: 'mock-study', name: '스터디', color: 'GREEN', subcategories: [{ id: 'mock-reading', name: '함께 읽기' }, { id: 'mock-focus', name: '집중 공부' }] },
  { id: 'mock-design', name: '디자인', color: 'PINK', subcategories: [] },
];
const demoNotices = (clubId: string): Notice[] => [
  { id: `${clubId}-welcome`, categoryId: 'mock-general', authorUserId: 'mock-admin', title: `${clubId === clubs[0].id ? '이번 달 스터디 모임 안내' : clubId === clubs[1].id ? '픽셀 모임에 오신 것을 환영해요' : '숲 모임에 오신 것을 환영해요'}`, body: '함께 공부하고 모리를 키워요.\n\n모임 공지와 준비 사항은 이곳에서 확인할 수 있어요.', pinned: true, read: false, createdAt: '2026-11-02T01:00:00Z' },
  { id: `${clubId}-reading`, categoryId: 'mock-study', subcategoryId: 'mock-reading', authorUserId: 'mock-lead', title: '이번 주 함께 읽을 책과 공부 목표', body: '각자의 속도로 공부한 내용을 나눠요.\n공부 시간은 타이머로 기록해 보세요.', pinned: true, read: false, createdAt: '2026-11-01T06:00:00Z' },
  { id: `${clubId}-design`, categoryId: 'mock-design', authorUserId: null, title: '모리의 새로운 방을 함께 그려요', body: '따뜻한 색과 작은 픽셀로 나만의 방을 상상해 보세요.', pinned: false, read: false, createdAt: '2026-10-31T10:00:00Z' },
  { id: `${clubId}-focus`, categoryId: 'mock-study', subcategoryId: 'mock-focus', authorUserId: 'mock-lead', title: '공부한 내용을 서로 나눠요', body: '오늘 배운 내용과 다음에 공부할 내용을 자유롭게 나눠요.', pinned: false, read: true, createdAt: '2026-10-30T02:00:00Z' },
];
export const MOCK_NOTICE_STORAGE_KEY = '@tamagochi/mock-notice-reads/v1';
export function createMockNoticeService(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> }): NoticeService {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>) => { const next = queue.then(work); queue = next.catch(() => undefined); return next; };
  const ensureClub = async (id: string) => { if (!(await joinedMockClubs(storage)).some(club => club.id === id)) throw new Error('Unknown mock club'); };
  async function reads(): Promise<string[]> {
    const raw = await storage.getItem(MOCK_NOTICE_STORAGE_KEY);
    if (raw === null) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(id => typeof id === 'string')) throw new Error('Invalid mock notice reads');
    return value;
  }
  async function notices(clubId: string) { await ensureClub(clubId); const read = await reads(); return demoNotices(clubId).map(one => ({ ...one, read: one.read || read.includes(one.id) })); }
  const filtered = (items: Notice[], filter: NoticeFilter) => items.filter(one => (!filter.categoryId || one.categoryId === filter.categoryId) && (!filter.subcategoryId || one.subcategoryId === filter.subcategoryId));
  return {
    listMyClubs: () => joinedMockClubs(storage),
    getBoard: (clubId, filter) => serial(async () => {
      const items = await notices(clubId);
      return { categories, authors: { 'mock-admin': '운영진', 'mock-lead': '스터디장' }, unreadCount: items.filter(one => !one.read).length, page: { items: filtered(items, filter) } };
    }),
    listNotices: (clubId, filter) => serial(async () => ({ items: filtered(await notices(clubId), filter) })),
    getNotice: (clubId, noticeId) => serial(async () => { const one = (await notices(clubId)).find(one => one.id === noticeId); if (!one) throw new Error('Unknown mock notice'); return one; }),
    markRead: (clubId, noticeId) => serial(async () => {
      if (!(await notices(clubId)).some(one => one.id === noticeId)) throw new Error('Unknown mock notice');
      const current = await reads();
      if (!current.includes(noticeId)) await storage.setItem(MOCK_NOTICE_STORAGE_KEY, JSON.stringify([...current, noticeId]));
    }),
    getUnreadCount: clubId => serial(async () => (await notices(clubId)).filter(one => !one.read).length),
  };
}
