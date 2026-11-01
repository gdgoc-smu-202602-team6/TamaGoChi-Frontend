// Frontend service models, not backend API DTOs.
export type StudySession = {
  readonly id: string;
  readonly startedAt: string;
  readonly timing?: { readonly elapsedSeconds: number; readonly monotonicMs: number; readonly maxSeconds: number };
};

export type StudyResult = {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly elapsedSeconds: number;
  readonly creditedSeconds: number;
  readonly bolt: number;
  readonly studyXp: number;
  readonly attendanceXp: number;
  readonly goalXp: number;
  readonly totalXp: number;
  readonly bugsRemoved: number;
  readonly heartsChange?: number;
  readonly levelBefore?: number;
  readonly levelAfter?: number;
};

export type StudyService = {
  getActiveSession: () => Promise<StudySession | null>;
  startSession: () => Promise<StudySession>;
  finishSession: (sessionId: string, clientEndedAt?: string) => Promise<StudyResult>;
  getResult: (sessionId: string) => Promise<StudyResult | null>;
  getRecovery?: () => Promise<{ session: StudySession | null; completedSessionId: string | null }>;
  acknowledgeResult?: (sessionId: string) => Promise<void>;
};

export class StudyServiceError extends Error {
  readonly code: 'offline' | 'missing-session' | 'storage' | 'invalid-record';

  constructor(code: StudyServiceError['code'], message: string) {
    super(message);
    this.name = 'StudyServiceError';
    this.code = code;
  }
}
