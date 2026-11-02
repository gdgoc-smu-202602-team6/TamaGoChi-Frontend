export const paletteColors = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'PINK', 'GRAY'] as const;
export type PaletteColor = typeof paletteColors[number];
export type JoinedClub = { readonly id: string; readonly name: string; readonly memberCount: number };
export type NoticeCategory = { readonly id: string; readonly name: string; readonly color: PaletteColor; readonly subcategories: readonly { id: string; name: string }[] };
export type Notice = {
  readonly id: string; readonly categoryId: string; readonly subcategoryId?: string; readonly authorUserId?: string | null;
  readonly title: string; readonly body: string; readonly pinned: boolean; readonly read: boolean; readonly createdAt: string;
};
export type NoticeFilter = { readonly categoryId?: string; readonly subcategoryId?: string };
export type NoticePage = { readonly items: readonly Notice[]; readonly nextPageToken?: string };
export type NoticeBoard = { readonly categories: readonly NoticeCategory[]; readonly authors: Readonly<Record<string, string>>; readonly unreadCount: number; readonly page: NoticePage };
export type NoticeService = {
  listMyClubs: () => Promise<readonly JoinedClub[]>;
  getBoard: (clubId: string, filter: NoticeFilter) => Promise<NoticeBoard>;
  listNotices: (clubId: string, filter: NoticeFilter, pageToken: string) => Promise<NoticePage>;
  getNotice: (clubId: string, noticeId: string) => Promise<Notice>;
  markRead: (clubId: string, noticeId: string) => Promise<void>;
  getUnreadCount: (clubId: string) => Promise<number>;
};
