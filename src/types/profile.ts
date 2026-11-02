export type DailyGoal = { readonly startOn: string | null; readonly minutes: number };
export type DayStudy = { readonly day: string; readonly studiedSeconds: number; readonly goalMinutes: number; readonly goalMet: boolean };
export type ProfileOverview = {
  readonly nickname: string;
  readonly balance: number;
  readonly level: number;
  readonly xp: number;
  readonly levelXp: number;
  readonly nextLevelXp: number;
  readonly todaySeconds: number;
  readonly weekSeconds: number;
  readonly attendanceStreak: number;
  readonly dayNumber: number;
  readonly week: readonly DayStudy[];
  readonly serviceDay: string;
  readonly tomorrow: string;
  readonly goalMinutes: number;
  readonly scheduledGoals: readonly DailyGoal[];
};
export type ProfileService = {
  getProfile: () => Promise<ProfileOverview>;
  createGoal: (minutes: number, startOn: string) => Promise<void>;
};
export class GoalError extends Error {
  constructor(readonly reason: 'invalid' | 'day-changed' | 'duplicate' | 'storage') {
    super(`Daily goal ${reason}`);
    this.name = 'GoalError';
  }
}
