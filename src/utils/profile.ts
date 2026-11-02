import type { DailyGoal } from '../types/profile';

export const GoalRules = { minimum: 30, maximum: 720, step: 10, defaultMinutes: 180 } as const;
export const validGoalMinutes = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= GoalRules.minimum && value <= GoalRules.maximum && value % GoalRules.step === 0;
export function isCalendarDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addCalendarDays(day: string, count: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
}
export function mondayOf(day: string): string {
  return addCalendarDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
}
export function goalMinutesOn(goals: readonly DailyGoal[], day: string): number {
  return [...goals].filter(goal => goal.startOn === null || goal.startOn <= day)
    .sort((a, b) => (b.startOn ?? '').localeCompare(a.startOn ?? ''))[0]?.minutes ?? GoalRules.defaultMinutes;
}
export function formatStudySummary(seconds: number): string {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ''}` : `${minutes}분`;
}
export function goalErrorText(error: import('../types/profile').GoalError): string {
  if (error.reason === 'invalid') return '목표는 30~720분 사이에서 10분 단위로 입력해 주세요.';
  if (error.reason === 'day-changed') return '서비스 날짜가 바뀌었어요. 새로 불러온 적용일을 확인해 주세요.';
  if (error.reason === 'duplicate') return '같은 적용일에 이미 목표가 예약되어 있어요. 예약 내용을 확인해 주세요.';
  return '목표를 저장하지 못했어요. 다시 불러와 예약 내용을 확인해 주세요.';
}
