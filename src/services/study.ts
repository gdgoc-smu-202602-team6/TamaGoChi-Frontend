import { mockBackend } from '@/services/mock-backend';
import { StudyServiceError, type StudyService } from '@/types/study';

export const studyService: StudyService = mockBackend;

export function studyErrorMessage(error: unknown): string {
  return error instanceof StudyServiceError ? error.message : '공부 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
