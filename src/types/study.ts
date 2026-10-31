// Frontend service models, not backend API DTOs.
export type StudySession = {
  readonly id: string;
  readonly startedAt: string;
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
};

export type StudyService = {
  getActiveSession: () => Promise<StudySession | null>;
  startSession: () => Promise<StudySession>;
  finishSession: (sessionId: string) => Promise<StudyResult>;
  getResult: (sessionId: string) => Promise<StudyResult | null>;
};

export class StudyServiceError extends Error {
  readonly code: 'offline' | 'missing-session' | 'storage' | 'invalid-record';

  constructor(code: StudyServiceError['code'], message: string) {
    super(message);
    this.name = 'StudyServiceError';
    this.code = code;
  }
}
