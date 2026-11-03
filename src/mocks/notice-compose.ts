import { ApiError } from '../services/api/http-client';
import { createGuardedNoticeComposeService } from '../services/notice-compose-service';
import { NoticeComposeError, type NoticeComposeStore } from '../types/notice-compose';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, type MockApplicationStore } from './clubs';
import { MOCK_NOTICE_CONTENT_KEY, readMockNoticeContent, readMockNoticeState } from './notice-content';
import { createMockNoticeService } from './notices';
import { getMockNoticeCategories } from './notice-categories-data';

export function createMockNoticeComposeService(storage: MockApplicationStore, store: NoticeComposeStore, now = Date.now) {
  const access = createMockClubAdminService(storage), notices = createMockNoticeService(storage);
  return createGuardedNoticeComposeService(store, {
    async context(clubId) {
      if (!(await access.getPermissions(clubId)).includes('notices.write')) throw new NoticeComposeError('forbidden');
      const club = (await joinedMockClubs(storage)).find(club => club.id === clubId)!;
      return { club, categories: await getMockNoticeCategories(storage, clubId) };
    },
    async create(clubId, input) {
      const state = await readMockNoticeState(storage);
      const notice = { id: `mock-notice-${now()}-${Math.random().toString(36).slice(2)}`, categoryId: input.categoryId, ...(input.subcategoryId ? { subcategoryId: input.subcategoryId } : {}),
        title: input.title, body: input.body, pinned: input.pinned, authorUserId: 'mock-me', createdAt: new Date(now()).toISOString(), read: false, notificationState: input.notify ? 'PENDING' as const : 'NONE' as const };
      try { await storage.setItem(MOCK_NOTICE_CONTENT_KEY, JSON.stringify({ ...state, notices: [...state.notices, { clubId, notice }] })); }
      catch { throw new NoticeComposeError('storage'); }
      return notice;
    },
    async get(clubId, id) {
      const saved = (await readMockNoticeContent(storage)).find(one => one.clubId === clubId && one.notice.id === id);
      if (!saved) throw new ApiError('http', 404);
      return { ...saved.notice, read: (await notices.getNotice(clubId, id)).read };
    },
  });
}
