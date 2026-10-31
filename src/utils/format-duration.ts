export function formatStudyClock(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return [hours, minutes, total % 60].map((value) => String(value).padStart(2, '0')).join(':');
}

export function formatRemainingMinutes(seconds: number): string {
  return `${Math.max(0, Math.ceil(seconds / 60))}분`;
}
