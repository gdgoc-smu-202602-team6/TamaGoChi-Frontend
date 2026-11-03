import type { JoinedClub, NoticeCategory, PaletteColor } from './notice';

export type ManagedNoticeCategory = NoticeCategory & { readonly preset: boolean };
export type CategoryBoard = { club: JoinedClub; categories: readonly ManagedNoticeCategory[] };
export type CategoryAction =
  | { kind: 'add-category'; name: string; color: PaletteColor }
  | { kind: 'add-subcategory'; categoryId: string; name: string }
  | { kind: 'delete-category'; category: ManagedNoticeCategory }
  | { kind: 'delete-subcategory'; categoryId: string; subcategory: { id: string; name: string } };
export type NoticeCategoryService = { getBoard: (clubId: string) => Promise<CategoryBoard>; mutate: (clubId: string, action: CategoryAction) => Promise<CategoryBoard> };
export class NoticeCategoryError extends Error {
  constructor(readonly reason: 'invalid' | 'forbidden' | 'missing' | 'duplicate' | 'preset' | 'in-use' | 'changed' | 'uncertain' | 'storage') {
    super(`Notice category ${reason}`); this.name = 'NoticeCategoryError';
  }
}
