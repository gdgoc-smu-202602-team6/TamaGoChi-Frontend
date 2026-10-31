const HOUR_MS = 60 * 60 * 1000;
// UTC + 9 (KST), shifted back 4 hours for the service-day boundary.
const SERVICE_DAY_SHIFT_MS = 5 * HOUR_MS;
const DAY_MS = 24 * HOUR_MS;

export function getServiceDayKey(timestampMs: number): string {
  return new Date(timestampMs + SERVICE_DAY_SHIFT_MS).toISOString().slice(0, 10);
}

export function splitStudyInterval(startMs: number, endMs: number) {
  const segments: { day: string; durationMs: number }[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const nextBoundary = (Math.floor((cursor + SERVICE_DAY_SHIFT_MS) / DAY_MS) + 1) * DAY_MS - SERVICE_DAY_SHIFT_MS;
    const segmentEnd = Math.min(endMs, nextBoundary);
    segments.push({ day: getServiceDayKey(cursor), durationMs: segmentEnd - cursor });
    cursor = segmentEnd;
  }
  return segments;
}

export function getElapsedStudySeconds(startedAt: string, nowMs: number): number {
  const startMs = Date.parse(startedAt);
  return Number.isFinite(startMs) && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor((nowMs - startMs) / 1000))
    : 0;
}
