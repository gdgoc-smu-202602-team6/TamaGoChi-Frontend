import { paletteColors } from '../types/notice';
import { NoticeCategoryError, type CategoryAction, type CategoryBoard, type ManagedNoticeCategory } from '../types/notice-categories';
import { noticeCharacterCount } from './notice-compose';

export function validCategoryName(value: string): boolean { return typeof value === 'string' && !!value.trim() && (noticeCharacterCount(value) ?? 0) <= 10; }
export function normalizeCategoryAction(action: CategoryAction): CategoryAction {
  if (action.kind === 'add-category' || action.kind === 'add-subcategory') {
    if (!validCategoryName(action.name) || action.kind === 'add-category' && !paletteColors.includes(action.color)) throw new NoticeCategoryError('invalid');
    return { ...action, name: action.name.trim() };
  }
  return action;
}
export function sameCategory(a: ManagedNoticeCategory, b: ManagedNoticeCategory) {
  return a.id === b.id && a.name === b.name && a.color === b.color && a.preset === b.preset && a.subcategories.length === b.subcategories.length
    && a.subcategories.every(one => b.subcategories.some(other => other.id === one.id && other.name === one.name));
}
export function prepareCategoryAction(board: CategoryBoard, action: CategoryAction): boolean {
  if (action.kind === 'add-category') { if (board.categories.some(one => one.name === action.name)) throw new NoticeCategoryError('duplicate'); return true; }
  const category = board.categories.find(one => one.id === (action.kind === 'delete-category' ? action.category.id : action.categoryId));
  if (!category) { if (action.kind === 'add-subcategory') throw new NoticeCategoryError('missing'); return false; }
  if (action.kind === 'add-subcategory') { if (category.subcategories.some(one => one.name === action.name)) throw new NoticeCategoryError('duplicate'); return true; }
  if (action.kind === 'delete-category') {
    if (category.preset) throw new NoticeCategoryError('preset');
    if (!sameCategory(category, action.category)) throw new NoticeCategoryError('changed');
  } else {
    const subcategory = category.subcategories.find(one => one.id === action.subcategory.id);
    if (!subcategory) return false;
    if (subcategory.name !== action.subcategory.name) throw new NoticeCategoryError('changed');
  }
  return true;
}
export function categoryActionConfirmed(board: CategoryBoard, action: CategoryAction): boolean {
  if (action.kind === 'add-category') return board.categories.some(one => one.name === action.name.trim() && one.color === action.color && !one.preset);
  if (action.kind === 'delete-category') return !board.categories.some(one => one.id === action.category.id);
  const category = board.categories.find(one => one.id === action.categoryId);
  return action.kind === 'add-subcategory' ? !!category?.subcategories.some(one => one.name === action.name.trim()) : !category?.subcategories.some(one => one.id === action.subcategory.id);
}
