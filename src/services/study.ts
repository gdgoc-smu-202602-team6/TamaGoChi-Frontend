import { apiErrorMessage, ApiError } from '@/services/api/http-client';
import { StudyServiceError } from '@/types/study';

export function studyErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.kind === 'storage') return '공부 기록을 저장하거나 복구하지 못했어요. 다시 시도해 주세요.';
  return error instanceof StudyServiceError ? error.message : error instanceof ApiError ? apiErrorMessage(error) : '공부 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
