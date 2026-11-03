import { createNoticeCategoryService } from '../notice-category-service';
import { NoticeCategoryError, type ManagedNoticeCategory } from '../../types/notice-categories';
import { isSessionId as isId } from './game-dto';
import { ApiError, type HttpClient } from './http-client';
import { createApiClubAdminService } from './club-admin-service';
import { parseNoticeCategories } from './notice-service';

export function parseManagedCategories(value: unknown): ManagedNoticeCategory[] {
  const categories = parseNoticeCategories(value), items = (value as { items: Record<string, unknown>[] }).items;
  if (items.some(one => typeof one.preset !== 'boolean')) throw new ApiError('response');
  if (new Set(categories.map(one => one.name)).size !== categories.length || categories.some(one => new Set(one.subcategories.map(sub => sub.name)).size !== one.subcategories.length)) throw new ApiError('response');
  const subs = categories.flatMap(one => one.subcategories.map(sub => sub.id));
  if (new Set(subs).size !== subs.length) throw new ApiError('response');
  return categories.map((one, index) => ({ ...one, preset: items[index].preset as boolean }));
}
export function createApiNoticeCategoryService(client: HttpClient) {
  const access = createApiClubAdminService(client);
  function identifier(id: string) { if (!isId(id)) throw new ApiError('response'); return id; }
  const base = (clubId: string) => `/clubs/${identifier(clubId)}/noticeCategories`;
  return createNoticeCategoryService({
    async getBoard(clubId) {
      if (!(await access.getPermissions(clubId)).includes('noticeCategories.manage')) throw new NoticeCategoryError('forbidden');
      const [clubResponse, categoryResponse] = await Promise.all([client.request(`/clubs/${identifier(clubId)}`), client.request(base(clubId))]);
      const club = clubResponse.data as Record<string, unknown> | null;
      if (!club || club.id !== clubId || typeof club.name !== 'string' || !club.name.trim() || !Number.isSafeInteger(club.memberCount) || (club.memberCount as number) < 0) throw new ApiError('response');
      return { club: { id: clubId, name: club.name, memberCount: club.memberCount as number }, categories: parseManagedCategories(categoryResponse.data) };
    },
    async apply(clubId, action) {
      if (action.kind === 'add-category') {
        const value = (await client.request(base(clubId), { method: 'POST', body: { name: action.name, color: action.color } })).data;
        const category = parseManagedCategories({ items: [value] })[0];
        if (category.name !== action.name || category.color !== action.color || category.preset) throw new ApiError('response');
      } else if (action.kind === 'add-subcategory') {
        const sub = (await client.request(`${base(clubId)}/${identifier(action.categoryId)}/subcategories`, { method: 'POST', body: { name: action.name } })).data as Record<string, unknown> | null;
        if (!sub || !isId(sub.id) || sub.name !== action.name) throw new ApiError('response');
      } else {
        const path = action.kind === 'delete-category' ? `${base(clubId)}/${identifier(action.category.id)}` : `${base(clubId)}/${identifier(action.categoryId)}/subcategories/${identifier(action.subcategory.id)}`;
        await client.request(path, { method: 'DELETE' });
      }
    },
  });
}
