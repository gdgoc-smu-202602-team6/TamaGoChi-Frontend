// Preview-only level curve verified against Backend 98441b9 LevelCurve. Production uses Stats.
export const mockXpForLevel = (level: number) => 25 * (level - 1) * (level + 2);
export function mockLevelForXp(xp: number): number {
  return Math.max(1, Math.floor((-1 + Math.sqrt(9 + 4 * xp / 25)) / 2));
}
