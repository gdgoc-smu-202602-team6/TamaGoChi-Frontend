import { NoticeComposeError, notificationStates, type PublishedNotice } from '../types/notice-compose';

export const MOCK_NOTICE_CONTENT_KEY = '@tamagochi/mock-notice-content/v1';
export type MockNoticeRecord = { clubId: string; notice: PublishedNotice };
export async function readMockNoticeContent(storage: { getItem: (key: string) => Promise<string | null> }): Promise<MockNoticeRecord[]> {
  try {
    const raw = await storage.getItem(MOCK_NOTICE_CONTENT_KEY);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !Array.isArray(value.notices) || !value.notices.every((entry: MockNoticeRecord) => {
      const one = entry?.notice;
      return typeof entry?.clubId === 'string' && !!entry.clubId && one && [one.id, one.categoryId, one.title, one.body].every(text => typeof text === 'string' && !!text.trim())
        && (one.subcategoryId === undefined || typeof one.subcategoryId === 'string') && (one.authorUserId == null || typeof one.authorUserId === 'string')
        && typeof one.read === 'boolean' && typeof one.pinned === 'boolean' && notificationStates.includes(one.notificationState)
        && typeof one.createdAt === 'string' && Number.isFinite(Date.parse(one.createdAt));
    }) || new Set(value.notices.map((entry: MockNoticeRecord) => entry.notice.id)).size !== value.notices.length) throw new Error();
    return value.notices;
  } catch { throw new NoticeComposeError('storage'); }
}
