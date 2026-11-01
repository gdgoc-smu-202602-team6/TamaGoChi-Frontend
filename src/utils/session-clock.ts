import type { StudySession } from '../types/study';
import { getElapsedStudySeconds } from './study-time';

export const monotonicNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

export function elapsedSessionSeconds(session: StudySession, monotonicMs = monotonicNow(), wallMs = Date.now()): number {
  if (!session.timing) return getElapsedStudySeconds(session.startedAt, wallMs);
  return Math.min(session.timing.maxSeconds, session.timing.elapsedSeconds + Math.floor(Math.max(0, monotonicMs - session.timing.monotonicMs) / 1000));
}

export function sessionEndIntent(): string {
  // The API explicitly accepts the device's original tap time; never derive settlement from the display clock.
  return new Date().toISOString();
}
