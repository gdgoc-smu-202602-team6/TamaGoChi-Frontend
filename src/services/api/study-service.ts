import type { StudyResult, StudyService, StudySession } from '../../types/study';
import { monotonicNow } from '../../utils/session-clock';
import { isDateTime, isSessionId, parseSession, parseSessionPage, type SessionDto } from './game-dto';
import { ApiError, type HttpClient } from './http-client';

export type StudyRecoveryRecord = {
  version: 1;
  activeSessionId: string | null;
  completedSessionId: string | null;
  pendingEnd: { sessionId: string; clientEndedAt: string } | null;
};
type RecoveryStorage = { get: () => Promise<string | null>; set: (value: string) => Promise<void> };
const empty = (): StudyRecoveryRecord => ({ version: 1, activeSessionId: null, completedSessionId: null, pendingEnd: null });

export function createApiStudyService(client: HttpClient, storage: RecoveryStorage, clock = { wall: Date.now, monotonic: monotonicNow }): StudyService {
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const pending = tail.then(work, work); tail = pending.catch(() => undefined); return pending;
  }
  async function read(): Promise<StudyRecoveryRecord> {
    let raw;
    try { raw = await storage.get(); } catch { throw new ApiError('storage'); }
    if (!raw) return empty();
    try {
      const data = JSON.parse(raw) as StudyRecoveryRecord;
      if (data.version !== 1 || (data.activeSessionId !== null && !isSessionId(data.activeSessionId)) || (data.completedSessionId !== null && !isSessionId(data.completedSessionId)) || (data.pendingEnd !== null && (!isSessionId(data.pendingEnd?.sessionId) || !isDateTime(data.pendingEnd?.clientEndedAt)))) throw new Error();
      return data;
    } catch { throw new ApiError('storage'); }
  }
  async function write(data: StudyRecoveryRecord) {
    try { await storage.set(JSON.stringify(data)); } catch { throw new ApiError('storage'); }
  }
  function session(data: SessionDto): StudySession {
    if (data.state !== 'RUNNING') throw new ApiError('response');
    return { id: data.id, startedAt: data.startedAt, timing: { elapsedSeconds: data.studiedSeconds, monotonicMs: clock.monotonic(), maxSeconds: (Date.parse(data.maxEndAt) - Date.parse(data.startedAt)) / 1000 } };
  }
  function result(data: SessionDto): StudyResult {
    if (data.state !== 'ENDED' || !data.result || !data.endedAt) throw new ApiError('response');
    const receipt = data.result;
    return { sessionId: data.id, startedAt: data.startedAt, endedAt: data.endedAt,
      elapsedSeconds: data.studiedSeconds, creditedSeconds: data.studiedSeconds,
      bolt: receipt.volts, studyXp: receipt.xp, attendanceXp: receipt.attendanceBonusXp,
      goalXp: receipt.goalBonusXp, totalXp: receipt.xp + receipt.attendanceBonusXp + receipt.goalBonusXp,
      bugsRemoved: receipt.bugsCleared, heartsChange: receipt.heartsChange,
      levelBefore: receipt.levelBefore, levelAfter: receipt.levelAfter };
  }
  async function get(id: string) {
    const data = parseSession((await client.request(`/users/me/studySessions/${encodeURIComponent(id)}`)).data);
    if (data.id !== id) throw new ApiError('response');
    return data;
  }
  async function running() {
    const items = parseSessionPage((await client.request('/users/me/studySessions?state=RUNNING&pageSize=1')).data);
    if (items.length > 1 || items.some(item => item.state !== 'RUNNING')) throw new ApiError('response');
    return items[0] ?? null;
  }
  async function finish(record: StudyRecoveryRecord, id: string, clientEndedAt: string) {
    if (record.pendingEnd && record.pendingEnd.sessionId !== id) throw new ApiError('storage');
    const pendingEnd = record.pendingEnd ?? { sessionId: id, clientEndedAt };
    if (!record.pendingEnd) { record = { ...record, pendingEnd }; await write(record); }
    let data: SessionDto;
    try { data = parseSession((await client.request(`/users/me/studySessions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { state: 'ENDED', clientEndedAt: pendingEnd.clientEndedAt } })).data); }
    catch (error) {
      if (!(error instanceof ApiError && error.status === 409 && error.code === 'session-ended')) throw error;
      data = await get(id);
    }
    if (data.id !== id) throw new ApiError('response');
    const receipt = result(data);
    await write({ ...record, activeSessionId: record.activeSessionId === id ? null : record.activeSessionId, pendingEnd: null, completedSessionId: id });
    return receipt;
  }
  async function recover() {
    let record = await read();
    if (record.pendingEnd) {
      await finish(record, record.pendingEnd.sessionId, record.pendingEnd.clientEndedAt);
      record = await read();
    }
    const active = await running();
    if (active) {
      if (record.activeSessionId !== active.id) await write({ ...record, activeSessionId: active.id });
      return { session: session(active), completedSessionId: record.completedSessionId };
    }
    if (record.activeSessionId) {
      try {
        const previous = await get(record.activeSessionId);
        if (previous.state === 'RUNNING') return { session: session(previous), completedSessionId: record.completedSessionId };
        result(previous);
        record = { ...record, activeSessionId: null, completedSessionId: previous.id };
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
        record = { ...record, activeSessionId: null };
      }
      await write(record);
    }
    return { session: null, completedSessionId: record.completedSessionId };
  }
  return {
    getRecovery: () => serial(recover),
    getActiveSession: () => serial(async () => (await recover()).session),
    startSession: () => serial(async () => {
      const restored = await recover();
      if (restored.session) return restored.session;
      let active: SessionDto;
      try { active = parseSession((await client.request('/users/me/studySessions', { method: 'POST' })).data); }
      catch (error) {
        if (!(error instanceof ApiError && error.status === 409 && error.code === 'session-running')) throw error;
        const existing = await running();
        if (!existing) throw error;
        active = existing;
      }
      const mapped = session(active);
      await write({ ...await read(), activeSessionId: active.id });
      return mapped;
    }),
    finishSession: (id, clientEndedAt) => serial(async () => {
      if (!isSessionId(id)) throw new ApiError('config');
      const intendedEnd = clientEndedAt ?? new Date(clock.wall()).toISOString();
      if (!isDateTime(intendedEnd)) throw new ApiError('config');
      return finish(await read(), id, intendedEnd);
    }),
    getResult: (id) => serial(async () => {
      if (!isSessionId(id)) return null;
      try { const data = await get(id); return data.state === 'ENDED' ? result(data) : null; }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    }),
    acknowledgeResult: (id) => serial(async () => {
      const record = await read();
      if (record.completedSessionId === id) await write({ ...record, completedSessionId: null });
    }),
  };
}
