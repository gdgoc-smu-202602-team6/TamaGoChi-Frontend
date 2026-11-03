import { createGuardedNoticeComposeService } from '../notice-compose-service';
import { NoticeComposeError, notificationStates, type NoticeComposeStore, type PublishedNotice } from '../../types/notice-compose';
import { isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';
import { createApiClubAdminService } from './club-admin-service';
import { parseNotice, parseNoticeCategories } from './notice-service';

function identifier(value: string) { if (!isId(value)) throw new ApiError('response'); return value; }
export function parsePublishedNotice(value: unknown): PublishedNotice {
  const notice = parseNotice(value), state = (value as Record<string, unknown>).notificationState;
  if (!notificationStates.includes(state as PublishedNotice['notificationState'])) throw new ApiError('response');
  return { ...notice, notificationState: state as PublishedNotice['notificationState'] };
}
export function createApiNoticeComposeService(client: HttpClient, store: NoticeComposeStore) {
  const access = createApiClubAdminService(client), base = (clubId: string) => `/clubs/${identifier(clubId)}`;
  return createGuardedNoticeComposeService(store, {
    async context(clubId) {
      if (!(await access.getPermissions(clubId)).includes('notices.write')) throw new NoticeComposeError('forbidden');
      const [clubResponse, categoryResponse] = await Promise.all([client.request(base(clubId)), client.request(`${base(clubId)}/noticeCategories`)]);
      const club = clubResponse.data as Record<string, unknown> | null;
      if (!club || club.id !== clubId || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 0) throw new ApiError('response');
      return { club: { id: clubId, name: club.name, memberCount: club.memberCount as number }, categories: parseNoticeCategories(categoryResponse.data) };
    },
    async create(clubId, input) {
      identifier(input.categoryId); if (input.subcategoryId) identifier(input.subcategoryId);
      const notice = parsePublishedNotice((await client.request(`${base(clubId)}/notices`, { method: 'POST', body: input })).data);
      if (notice.title !== input.title || notice.body !== input.body || notice.categoryId !== input.categoryId || notice.subcategoryId !== input.subcategoryId
        || notice.pinned !== input.pinned || (!input.notify && notice.notificationState !== 'NONE') || (input.notify && notice.notificationState === 'NONE')) throw new ApiError('response');
      return notice;
    },
    async get(clubId, id) {
      const notice = parsePublishedNotice((await client.request(`${base(clubId)}/notices/${identifier(id)}`)).data);
      if (notice.id !== id) throw new ApiError('response');
      return notice;
    },
  });
}
