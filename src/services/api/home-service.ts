import type { HomeService } from '../../types/home';
import { StudyRules } from '../../constants/study';
import { parseNickname, parseRoom, parseStats } from './game-dto';
import type { HttpClient } from './http-client';

export function createApiHomeService(client: HttpClient): HomeService {
  return {
    async getHome() {
      const [userResponse, statsResponse, roomResponse] = await Promise.all([
        client.request('/users/me'), client.request('/users/me/stats'), client.request('/users/me/room'),
      ]);
      const nickname = parseNickname(userResponse.data);
      const stats = parseStats(statsResponse.data);
      const { condition } = parseRoom(roomResponse.data);
      return {
        profile: { nickname, bolt: stats.volts, level: stats.level, hearts: condition.hearts },
        room: { name: `${nickname}의 방`, characterLabel: '캐릭터 미리보기' },
        todayStudySeconds: stats.todaySeconds,
        attendance: { studySeconds: stats.todaySeconds, requiredSeconds: StudyRules.attendanceSeconds, achieved: stats.todayAttended },
        bugs: { count: condition.bugs, progressSeconds: condition.bugProgressSeconds, requiredSeconds: StudyRules.bugClearSeconds },
      };
    },
  };
}
