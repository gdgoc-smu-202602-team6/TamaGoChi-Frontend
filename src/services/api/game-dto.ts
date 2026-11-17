// Selected fields from Backend openapi.yaml (0.1.0 at 98441b9; unchanged in 0.2.0). UI models live in types/.
import { ApiError } from './http-client';

export type SessionDto = {
  id: string;
  state: 'RUNNING' | 'ENDED';
  startedAt: string;
  maxEndAt: string;
  endedAt?: string;
  studiedSeconds: number;
  result?: {
    studiedMinutes: number; volts: number; xp: number;
    attendanceBonusXp: number; goalBonusXp: number; attendedNow: boolean;
    bugsCleared: number; bugsRemaining: number; heartsChange: number;
    levelBefore: number; levelAfter: number;
  };
};
export type StatsDto = { volts: number; level: number; todaySeconds: number; todayAttended: boolean };
export type RoomDto = { condition: { hearts: number; bugs: number; bugProgressSeconds: number } };

export const isSessionId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isDateTime = (value: unknown): value is string => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  return value as Record<string, unknown>;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new ApiError('response');
}
export function parseSession(value: unknown): SessionDto {
  const data = record(value);
  if (!isSessionId(data.id) || !isDateTime(data.startedAt) || !isDateTime(data.maxEndAt) || !['RUNNING', 'ENDED'].includes(data.state as string)) throw new ApiError('response');
  integer(data.studiedSeconds, 0, 43200);
  if (Date.parse(data.maxEndAt) - Date.parse(data.startedAt) !== 43200000) throw new ApiError('response');
  if (data.state === 'ENDED' && (!isDateTime(data.endedAt) || Date.parse(data.endedAt) < Date.parse(data.startedAt) || Date.parse(data.endedAt) > Date.parse(data.maxEndAt))) throw new ApiError('response');
  if (data.result !== undefined) {
    const result = record(data.result);
    for (const field of ['studiedMinutes', 'volts', 'xp', 'attendanceBonusXp', 'goalBonusXp', 'bugsCleared', 'bugsRemaining', 'levelBefore', 'levelAfter']) integer(result[field]);
    integer(result.heartsChange, -4, 4);
    if (typeof result.attendedNow !== 'boolean' || data.state !== 'ENDED') throw new ApiError('response');
  }
  return data as SessionDto;
}
export function parseSessionPage(value: unknown): SessionDto[] {
  const data = record(value);
  if (!Array.isArray(data.items)) throw new ApiError('response');
  return data.items.map(parseSession);
}
export function parseStats(value: unknown): StatsDto {
  const data = record(value);
  integer(data.volts); integer(data.level, 1); integer(data.todaySeconds);
  if (typeof data.todayAttended !== 'boolean') throw new ApiError('response');
  return data as StatsDto;
}
export function parseRoom(value: unknown): RoomDto {
  const data = record(value); const condition = record(data.condition);
  integer(condition.hearts, 0, 4); integer(condition.bugs, 0, 3); integer(condition.bugProgressSeconds, 0, 3599);
  return data as RoomDto;
}
export function parseNickname(value: unknown): string {
  const data = record(value);
  if (typeof data.nickname !== 'string' || !data.nickname) throw new ApiError('response');
  return data.nickname;
}
