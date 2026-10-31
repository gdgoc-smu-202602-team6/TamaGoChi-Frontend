// Product rules for display and the local mock. Production settlement belongs to the server.
export const StudyRules = {
  maxHearts: 4,
  attendanceSeconds: 30 * 60,
  bugClearSeconds: 60 * 60,
  boltPerMinute: 1,
  xpPerMinute: 1,
  maxSessionSeconds: 12 * 60 * 60,
  defaultGoalSeconds: 3 * 60 * 60,
  attendanceBonusXp: 10,
  goalBonusXp: 20,
} as const;
