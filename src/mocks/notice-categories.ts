import { ApiError } from '../services/api/http-client';
import { createNoticeCategoryService } from '../services/notice-category-service';
import { NoticeCategoryError } from '../types/notice-categories';
import type { ManagedNoticeCategory } from '../types/notice-categories';
import { createMockClubAdminService } from './club-admin';
import { joinedMockClubs, type MockApplicationStore } from './clubs';
import { getMockNoticeCategories, MOCK_NOTICE_CATEGORIES_KEY, readMockCategoryRegistry } from './notice-categories-data';
import { createMockNoticeService } from './notices';

export function createMockNoticeCategoryService(storage: MockApplicationStore) {
  const access = createMockClubAdminService(storage), notices = createMockNoticeService(storage);
  async function write(club: string, categories: ManagedNoticeCategory[]) {
    const registry = await readMockCategoryRegistry(storage);
    const sorted = categories.map(one => ({ ...one, subcategories: [...one.subcategories].sort((a, b) => a.name.localeCompare(b.name)) })).sort((a, b) => Number(b.preset) - Number(a.preset) || a.name.localeCompare(b.name));
    try { await storage.setItem(MOCK_NOTICE_CATEGORIES_KEY, JSON.stringify({ version: 1, clubs: { ...registry, [club]: sorted } })); }
    catch { throw new NoticeCategoryError('storage'); }
  }
  return createNoticeCategoryService({
    async getBoard(clubId) {
      if (!(await access.getPermissions(clubId)).includes('noticeCategories.manage')) throw new NoticeCategoryError('forbidden');
      const club = (await joinedMockClubs(storage)).find(one => one.id === clubId)!;
      return { club, categories: await getMockNoticeCategories(storage, clubId) };
    },
    async apply(clubId, action) {
      const categories = await getMockNoticeCategories(storage, clubId);
      if (action.kind === 'add-category') {
        if (categories.some(one => one.name === action.name)) throw new NoticeCategoryError('duplicate');
        await write(clubId, [...categories, { id: `mock-category-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: action.name, color: action.color, preset: false, subcategories: [] }]);
        return;
      }
      const categoryId = action.kind === 'delete-category' ? action.category.id : action.categoryId, category = categories.find(one => one.id === categoryId);
      if (!category) throw new ApiError('http', 404);
      if (action.kind === 'add-subcategory') {
        if (category.subcategories.some(one => one.name === action.name)) throw new NoticeCategoryError('duplicate');
        await write(clubId, categories.map(one => one.id === categoryId ? { ...one, subcategories: [...one.subcategories, { id: `mock-sub-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: action.name }] } : one));
      } else {
        if (action.kind === 'delete-category' && category.preset) throw new NoticeCategoryError('preset');
        const entries = (await notices.listNotices(clubId, {}, '')).items;
        if (action.kind === 'delete-category') {
          if (entries.some(one => one.categoryId === categoryId || category.subcategories.some(sub => sub.id === one.subcategoryId))) throw new NoticeCategoryError('in-use');
          await write(clubId, categories.filter(one => one.id !== categoryId));
        } else {
          if (!category.subcategories.some(one => one.id === action.subcategory.id)) throw new ApiError('http', 404);
          if (entries.some(one => one.subcategoryId === action.subcategory.id)) throw new NoticeCategoryError('in-use');
          await write(clubId, categories.map(one => one.id === categoryId ? { ...one, subcategories: one.subcategories.filter(sub => sub.id !== action.subcategory.id) } : one));
        }
      }
    },
  });
}
