import { NoticeComposeError, type NoticeCreateInput, type NotificationState } from '../types/notice-compose';
import type { NoticeCategory } from '../types/notice';

export function noticeCharacterCount(value: string): number | null {
  return typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(value.trim())].length : null;
}
export function validateNoticeCreate(input: NoticeCreateInput): string | null {
  if (!input.title.trim() || (noticeCharacterCount(input.title) ?? 0) > 50) return '제목은 1~50자로 입력해 주세요.';
  if (!input.body.trim() || (noticeCharacterCount(input.body) ?? 0) > 2000) return '내용은 1~2,000자로 입력해 주세요.';
  if (!input.categoryId || typeof input.pinned !== 'boolean' || typeof input.notify !== 'boolean') return '분류와 고정·알림 선택을 확인해 주세요.';
  return null;
}
export function normalizeNoticeCreate(input: NoticeCreateInput): NoticeCreateInput {
  if (validateNoticeCreate(input)) throw new NoticeComposeError('invalid');
  return { categoryId: input.categoryId, ...(input.subcategoryId ? { subcategoryId: input.subcategoryId } : {}), title: input.title.trim(), body: input.body.trim(), pinned: input.pinned, notify: input.notify };
}
export function checkNoticeCategory(input: NoticeCreateInput, categories: readonly NoticeCategory[]) {
  const category = categories.find(one => one.id === input.categoryId);
  if (!category || (input.subcategoryId && !category.subcategories.some(one => one.id === input.subcategoryId))) throw new NoticeComposeError('category-changed');
}
export const notificationLabels: Record<NotificationState, string> = {
  NONE: '알림 요청 없음', PENDING: '알림 발송 대기 중', SENT: '서버에서 알림 발송 완료', FAILED: '알림 발송 실패 · 공지는 등록됐어요',
};
