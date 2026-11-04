import { GuestbookError, type GuestbookEntry, type GuestbookTarget } from '../types/guestbook';
export const guestbookScope = (target: GuestbookTarget) => target.kind === 'mine' ? 'mine' : `${encodeURIComponent(target.clubId)}/${encodeURIComponent(target.memberId)}`;
export function guestbookLength(value: string) { return typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(value)].length : Array.from(value).length; }
export function guestbookText(value: string) { const text = value.trim(); if (!text || (typeof Intl.Segmenter === 'function' && guestbookLength(text) > 60)) throw new GuestbookError('invalid'); return text; }
export function sameGuestbookEntry(a: GuestbookEntry, b: GuestbookEntry) { return a.id === b.id && a.clubId === b.clubId && a.userId === b.userId && a.authorUserId === b.authorUserId && a.body === b.body && a.createdAt === b.createdAt; }
