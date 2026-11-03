import { paletteColors } from '../types/notice';
import { NoticeCategoryError, type ManagedNoticeCategory } from '../types/notice-categories';
import { readCreatedMockClubs } from './created-clubs';

export const MOCK_NOTICE_CATEGORIES_KEY = '@tamagochi/mock-notice-categories/v1';
export const mockNoticeCategories: readonly ManagedNoticeCategory[] = [
  { id: 'mock-general', name: '전체공지', color: 'RED', preset: true, subcategories: [] },
  { id: 'mock-study', name: '스터디', color: 'GREEN', preset: false, subcategories: [{ id: 'mock-reading', name: '함께 읽기' }, { id: 'mock-focus', name: '집중 공부' }] },
  { id: 'mock-design', name: '디자인', color: 'PINK', preset: false, subcategories: [] },
];
export async function readMockCategoryRegistry(storage: { getItem: (key: string) => Promise<string | null> }): Promise<Record<string, ManagedNoticeCategory[]>> {
  try {
    const raw = await storage.getItem(MOCK_NOTICE_CATEGORIES_KEY);
    if (raw === null) return {};
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !value.clubs || typeof value.clubs !== 'object' || Array.isArray(value.clubs)) throw new Error();
    for (const [clubId, list] of Object.entries(value.clubs)) {
      if (!clubId || !Array.isArray(list) || !list.every((one: ManagedNoticeCategory) => one && typeof one.id === 'string' && !!one.id && typeof one.name === 'string' && !!one.name.trim()
        && paletteColors.includes(one.color) && typeof one.preset === 'boolean' && Array.isArray(one.subcategories)
        && one.subcategories.every(sub => sub && typeof sub.id === 'string' && !!sub.id && typeof sub.name === 'string' && !!sub.name.trim())
        && new Set(one.subcategories.map(sub => sub.name)).size === one.subcategories.length)
        || new Set(list.map(one => one.id)).size !== list.length || new Set(list.map(one => one.name)).size !== list.length) throw new Error();
      const subs = list.flatMap(one => one.subcategories.map((sub: { id: string }) => sub.id));
      if (new Set(subs).size !== subs.length) throw new Error();
    }
    return value.clubs;
  } catch { throw new NoticeCategoryError('storage'); }
}
export async function getMockNoticeCategories(storage: { getItem: (key: string) => Promise<string | null> }, clubId: string): Promise<ManagedNoticeCategory[]> {
  const registry = await readMockCategoryRegistry(storage);
  if (Object.hasOwn(registry, clubId)) return registry[clubId];
  const defaults = (await readCreatedMockClubs(storage)).some(one => one.id === clubId) ? mockNoticeCategories.slice(0, 1) : mockNoticeCategories;
  return defaults.map(one => ({ ...one, subcategories: one.subcategories.map(sub => ({ ...sub })) }));
}
