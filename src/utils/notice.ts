import type { Notice } from '../types/notice';

export function noticeAuthor(notice: Notice, authors: Readonly<Record<string, string>>): string {
  if (notice.authorUserId === null) return '탈퇴한 사용자';
  return notice.authorUserId && Object.hasOwn(authors, notice.authorUserId) ? authors[notice.authorUserId] : '작성자 정보 없음';
}
export function noticeDate(iso: string): string {
  // Notices use ordinary Korean calendar dates, independently of the study service-day boundary.
  const day = new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(0, 10);
  return `${day.slice(0, 4)}.${day.slice(5, 7)}.${day.slice(8, 10)}`;
}
export function appendNoticePage(current: readonly Notice[], next: readonly Notice[]): readonly Notice[] {
  // A notice may move between cursor pages while another device edits/pins it. Retain one ID.
  const seen = new Set(current.map(one => one.id));
  return [...current, ...next.filter(one => !seen.has(one.id))];
}
