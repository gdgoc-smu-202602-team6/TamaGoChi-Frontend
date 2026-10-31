import { mockHomeScenarios } from '@/mocks/home';
import type { HomeOverview, HomeService } from '@/types/home';
import { mockBackend } from '@/services/mock-backend';

export function createMockHomeService(overview: HomeOverview = mockHomeScenarios.dirty): HomeService {
  return {
    async getHome() {
      return overview;
    },
  };
}

// Replace this adapter after the backend contract is supplied; no endpoints are assumed here.
export const homeService: HomeService = mockBackend;
