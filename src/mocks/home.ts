import { StudyRules } from '@/constants/study';
import type { HomeOverview } from '@/types/home';

const profile = { nickname: '서연', bolt: 155, level: 4 };
const room = { name: '작은 다락방', characterLabel: '내 캐릭터' };

export const mockHomeScenarios = {
  dirty: {
    profile: { ...profile, hearts: 0 },
    room,
    todayStudySeconds: 20 * 60,
    attendance: {
      studySeconds: 20 * 60,
      requiredSeconds: StudyRules.attendanceSeconds,
      achieved: false,
    },
    bugs: { count: 3, progressSeconds: 40 * 60, requiredSeconds: StudyRules.bugClearSeconds },
  },
  clean: {
    profile: { ...profile, hearts: StudyRules.maxHearts },
    room,
    todayStudySeconds: 100 * 60,
    attendance: {
      studySeconds: 100 * 60,
      requiredSeconds: StudyRules.attendanceSeconds,
      achieved: true,
    },
    bugs: { count: 0, progressSeconds: 0, requiredSeconds: StudyRules.bugClearSeconds },
  },
} satisfies Record<string, HomeOverview>;
