import { mockHomeScenarios } from '@/mocks/home';
import type { HomeOverview, HomeService } from '@/types/home';

export function createMockHomeService(overview: HomeOverview = mockHomeScenarios.dirty): HomeService {
  return {
    async getHome() {
      return overview;
    },
  };
}
