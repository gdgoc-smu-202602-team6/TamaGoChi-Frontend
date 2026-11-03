import { ApiError } from '../services/api/http-client';
import { createNoticeManagementService } from '../services/notice-management-service';
import type { PublishedNotice } from '../types/notice-compose';
import { NoticeComposeError } from '../types/notice-compose';
import { NoticeManagementError } from '../types/notice-management';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, type MockApplicationStore } from './clubs';
import { readCreatedMockClubs } from './created-clubs';
import { MOCK_NOTICE_CONTENT_KEY, readMockNoticeState } from './notice-content';
import { createMockNoticeService, mockNoticeCategories } from './notices';

export function createMockNoticeManagementService(storage: MockApplicationStore) {
  const access = createMockClubAdminService(storage), notices = createMockNoticeService(storage);
  async function get(club: string, id: string): Promise<PublishedNotice> {
    if (!(await notices.listNotices(club, {}, '')).items.some(one => one.id === id)) throw new ApiError('http', 404);
    return await notices.getNotice(club, id) as PublishedNotice;
  }
  async function write(value: unknown) { try { await storage.setItem(MOCK_NOTICE_CONTENT_KEY, JSON.stringify(value)); } catch { throw new NoticeComposeError('storage'); } }
  return createNoticeManagementService({
    async context(clubId) {
      if (!(await access.getPermissions(clubId)).includes('notices.write')) throw new NoticeManagementError('forbidden');
      const club = (await joinedMockClubs(storage)).find(club => club.id === clubId)!;
      return { club, categories: (await readCreatedMockClubs(storage)).some(one => one.id === clubId) ? mockNoticeCategories.slice(0, 1) : mockNoticeCategories };
    },
    get,
    async update(clubId, id, patch) {
      const current = await get(clubId, id), state = await readMockNoticeState(storage);
      const next = { ...current, categoryId: patch.categoryId ?? current.categoryId, subcategoryId: patch.subcategoryId === null ? undefined : patch.subcategoryId ?? current.subcategoryId,
        title: patch.title ?? current.title, body: patch.body ?? current.body, pinned: patch.pinned ?? current.pinned };
      await write({ ...state, notices: [...state.notices.filter(one => !(one.clubId === clubId && one.notice.id === id)), { clubId, notice: next }] });
      return next;
    },
    async remove(clubId, id) {
      await get(clubId, id); const state = await readMockNoticeState(storage);
      await write({ ...state, notices: state.notices.filter(one => !(one.clubId === clubId && one.notice.id === id)), deleted: [...state.deleted, { clubId, noticeId: id }] });
    },
  });
}
