import { GoalError, type DailyGoal, type DayStudy, type ProfileService } from '../../types/profile';
import { addCalendarDays, goalMinutesOn, isCalendarDay, validGoalMinutes } from '../../utils/profile';
import { getServiceDayKey } from '../../utils/study-time';
import { parseNickname, parseStats } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('response');
  return value as Record<string, unknown>;
}
function integer(value: unknown, minimum = 0): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum; }
function goal(value: unknown): DailyGoal {
  const data = record(value);
  if (!validGoalMinutes(data.minutes) || (data.startOn != null && !isCalendarDay(data.startOn))) throw new ApiError('response');
  return { minutes: data.minutes, startOn: data.startOn as string | null | undefined ?? null };
}
function goals(value: unknown): DailyGoal[] {
  const data = record(value);
  if (!Array.isArray(data.items)) throw new ApiError('response');
  const entries = data.items.map(goal);
  if (new Set(entries.map(one => one.startOn)).size !== entries.length) throw new ApiError('response');
  return entries;
}
function week(value: unknown): DayStudy[] {
  if (!Array.isArray(value) || value.length !== 7) throw new ApiError('response');
  return value.map((entry, index) => {
    const data = record(entry);
    if (!isCalendarDay(data.day) || !integer(data.studiedSeconds) || !validGoalMinutes(data.goalMinutes) || typeof data.goalMet !== 'boolean'
      || (index === 0 && new Date(`${data.day}T00:00:00Z`).getUTCDay() !== 1)
      || (index > 0 && data.day !== addCalendarDays((value[index - 1] as DayStudy).day, 1))) throw new ApiError('response');
    return data as DayStudy;
  });
}

export function createApiProfileService(client: HttpClient, now = Date.now): ProfileService {
  let clockOffset = 0;
  return {
    async getProfile() {
      const [user, statsResponse, goalsResponse] = await Promise.all([
        client.request('/users/me'), client.request('/users/me/stats'), client.request('/users/me/dailyGoals'),
      ]);
      const nickname = parseNickname(user.data), stats = parseStats(statsResponse.data), full = record(statsResponse.data);
      if (!integer(full.xp) || !integer(full.levelXp) || !integer(full.nextLevelXp) || full.nextLevelXp <= full.levelXp
        || !integer(full.weekSeconds) || !integer(full.attendanceStreak) || !integer(full.dayNumber, 1)) throw new ApiError('response');
      const days = week(full.week), versions = goals(goalsResponse.data);
      // Date may not be exposed to web clients; use KST 04:00 on the device as a fallback.
      const serverTime = Date.parse(statsResponse.headers.get('Date') ?? '');
      if (Number.isFinite(serverTime)) clockOffset = serverTime - now();
      const serviceDay = getServiceDayKey(now() + clockOffset);
      return {
        nickname, balance: stats.volts, level: stats.level, xp: full.xp, levelXp: full.levelXp, nextLevelXp: full.nextLevelXp,
        todaySeconds: stats.todaySeconds, weekSeconds: full.weekSeconds, attendanceStreak: full.attendanceStreak, dayNumber: full.dayNumber,
        week: days, serviceDay, tomorrow: addCalendarDays(serviceDay, 1), goalMinutes: goalMinutesOn(versions, serviceDay),
        scheduledGoals: versions.filter(one => one.startOn !== null && one.startOn > serviceDay).sort((a, b) => a.startOn!.localeCompare(b.startOn!)),
      };
    },
    async createGoal(minutes, startOn) {
      if (!validGoalMinutes(minutes) || !isCalendarDay(startOn)) throw new GoalError('invalid');
      if (startOn !== addCalendarDays(getServiceDayKey(now() + clockOffset), 1)) throw new GoalError('day-changed');
      try {
        const response = await client.request('/users/me/dailyGoals', { method: 'POST', body: { startOn, minutes } });
        const receipt = goal(response.data);
        if (receipt.startOn !== startOn || receipt.minutes !== minutes) throw new ApiError('response');
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && error.code === 'duplicate-start-on') throw new GoalError('duplicate');
        throw error;
      }
    },
  };
}
