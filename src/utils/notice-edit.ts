import type { NoticeEditInput, NoticePatch } from '../types/notice-management';
import { normalizeNoticeCreate } from './notice-compose';

export function noticeEditFields(value: NoticeEditInput): NoticeEditInput {
  return { categoryId: value.categoryId, subcategoryId: value.subcategoryId, title: value.title, body: value.body, pinned: value.pinned };
}
export function normalizeNoticeEdit(value: NoticeEditInput): NoticeEditInput {
  return noticeEditFields(normalizeNoticeCreate({ ...value, notify: false }));
}
export function sameNoticeContent(a: NoticeEditInput, b: NoticeEditInput): boolean {
  return a.categoryId === b.categoryId && a.subcategoryId === b.subcategoryId && a.title === b.title && a.body === b.body && a.pinned === b.pinned;
}
export function noticeChanges(original: NoticeEditInput, next: NoticeEditInput): NoticePatch {
  return {
    ...(original.categoryId !== next.categoryId ? { categoryId: next.categoryId } : {}),
    ...(original.subcategoryId !== next.subcategoryId ? { subcategoryId: next.subcategoryId ?? null } : {}),
    ...(original.title !== next.title ? { title: next.title } : {}),
    ...(original.body !== next.body ? { body: next.body } : {}),
    ...(original.pinned !== next.pinned ? { pinned: next.pinned } : {}),
  };
}
