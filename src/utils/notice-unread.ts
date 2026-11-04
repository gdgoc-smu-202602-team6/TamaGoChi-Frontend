export function unreadBadge(count: number | null | undefined): string | undefined {
  return typeof count === 'number' && Number.isSafeInteger(count) && count > 0 ? count > 99 ? '99+' : String(count) : undefined;
}
export function unreadDescription(clubName: string, count: number | null | undefined): string {
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? `${clubName}, 안 읽은 공지 ${count}개` : `${clubName}, 읽지 않은 수 확인 필요`;
}
