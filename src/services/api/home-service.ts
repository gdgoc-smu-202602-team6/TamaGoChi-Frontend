import type { HomeService } from '../../types/home';
import { StudyRules } from '../../constants/study';
import { parseNickname, parseStats } from './game-dto';
import type { HttpClient } from './http-client';
import type { RoomService } from '../../types/room';
import { roomAppearance } from '../../utils/room-layout';
import { createApiRoomService } from './room-service';

export function createApiHomeService(client: HttpClient, roomService: RoomService = createApiRoomService(client)): HomeService {
  return {
    async getHome() {
      const [userResponse, statsResponse, roomResponse] = await Promise.all([
        client.request('/users/me'), client.request('/users/me/stats'), roomService.getRoom(),
      ]);
      const nickname = parseNickname(userResponse.data);
      const stats = parseStats(statsResponse.data);
      const { condition } = roomResponse;
      return {
        profile: { nickname, bolt: stats.volts, level: stats.level, hearts: condition.hearts },
        room: { name: `${nickname}의 방`, characterLabel: '캐릭터 미리보기', appearance: roomAppearance(roomResponse) },
        todayStudySeconds: stats.todaySeconds,
        attendance: { studySeconds: stats.todaySeconds, requiredSeconds: StudyRules.attendanceSeconds, achieved: stats.todayAttended },
        bugs: { count: condition.bugs, progressSeconds: condition.bugProgressSeconds, requiredSeconds: StudyRules.bugClearSeconds },
      };
    },
  };
}
