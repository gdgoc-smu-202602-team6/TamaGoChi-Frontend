const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMockStudyBackend, MOCK_STUDY_STORAGE_KEY } = require('../.expo/tests/mocks/study-backend.js');
const { getServiceDayKey, splitStudyInterval, getElapsedStudySeconds } = require('../.expo/tests/utils/study-time.js');

const initialHome = {
  profile: { nickname: 'Test', bolt: 100, level: 4, hearts: 4 },
  room: { name: 'Room', characterLabel: 'Character' },
  todayStudySeconds: 0,
  attendance: { studySeconds: 0, requiredSeconds: 1800, achieved: false },
  bugs: { count: 3, progressSeconds: 0, requiredSeconds: 3600 },
};

function fixture({ date = '2026-11-01T12:00:00.123+09:00', home = initialHome } = {}) {
  let time = Date.parse(date);
  let online = true;
  let failWrite = false;
  let sequence = 0;
  const data = new Map();
  const storage = {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) {
      if (failWrite) throw new Error('Storage unavailable');
      data.set(key, value);
    },
  };
  const options = { storage, initialHome: home, isOnline: async () => online, now: () => time, createId: () => `session-${++sequence}` };
  return {
    backend: createMockStudyBackend(options),
    reopen: () => createMockStudyBackend(options),
    advance: (milliseconds) => { time += milliseconds; },
    setOnline: (value) => { online = value; },
    setWriteFailure: (value) => { failWrite = value; },
    raw: () => data.get(MOCK_STUDY_STORAGE_KEY),
    corrupt: (value) => data.set(MOCK_STUDY_STORAGE_KEY, value),
  };
}

test('service day changes at 04:00 KST and interval splitting preserves milliseconds', () => {
  const start = Date.parse('2026-11-01T03:59:59.123+09:00');
  const end = Date.parse('2026-11-01T04:00:01.456+09:00');
  assert.equal(getServiceDayKey(start), '2026-10-31');
  assert.equal(getServiceDayKey(Date.parse('2026-11-01T04:00:00+09:00')), '2026-11-01');
  const parts = splitStudyInterval(start, end);
  assert.deepEqual(parts.map((part) => part.day), ['2026-10-31', '2026-11-01']);
  assert.equal(parts.reduce((sum, part) => sum + part.durationMs, 0), end - start);
});

test('elapsed time is derived from the timestamp after a long gap', () => {
  const start = '2026-11-01T12:00:00.000+09:00';
  assert.equal(getElapsedStudySeconds(start, Date.parse(start) + 2 * 60 * 60 * 1000 + 999), 7200);
  assert.equal(getElapsedStudySeconds(start, Date.parse(start) - 1000), 0);
});

test('concurrent starts return one active session and reopening restores it offline', async () => {
  const f = fixture();
  const sessions = await Promise.all([f.backend.startSession(), f.backend.startSession(), f.backend.startSession()]);
  assert.equal(new Set(sessions.map((session) => session.id)).size, 1);
  f.setOnline(false);
  assert.deepEqual(await f.reopen().getActiveSession(), sessions[0]);
  assert.deepEqual(await f.reopen().startSession(), sessions[0]);
});

test('offline starts are rejected without creating an active session', async () => {
  const f = fixture();
  f.setOnline(false);
  await assert.rejects(f.backend.startSession(), { code: 'offline' });
  assert.equal(await f.backend.getActiveSession(), null);
});

test('a sub-minute session can end and grants no minute reward', async () => {
  const f = fixture();
  const session = await f.backend.startSession();
  f.advance(59_999);
  const result = await f.backend.finishSession(session.id);
  assert.equal(result.creditedSeconds, 59);
  assert.equal(result.bolt, 0);
  assert.equal(result.studyXp, 0);
  assert.equal((await f.backend.getHome()).todayStudySeconds, 59);
});

test('a zero-second session can finish without a minimum duration', async () => {
  const f = fixture();
  const session = await f.backend.startSession();
  const result = await f.backend.finishSession(session.id);
  assert.equal(result.elapsedSeconds, 0);
  assert.equal(result.creditedSeconds, 0);
  assert.equal(result.totalXp + result.bolt, 0);
  assert.equal(await f.backend.getActiveSession(), null);
});

test('attendance accumulates seconds across sessions while minute rewards round down per session', async () => {
  const f = fixture();
  const first = await f.backend.startSession();
  f.advance(1780_000);
  const firstResult = await f.backend.finishSession(first.id);
  const second = await f.backend.startSession();
  f.advance(30_000);
  const secondResult = await f.backend.finishSession(second.id);
  const home = await f.backend.getHome();
  assert.equal(home.todayStudySeconds, 1810);
  assert.equal(home.attendance.achieved, true);
  assert.equal(firstResult.bolt, 29);
  assert.equal(secondResult.bolt, 0);
  assert.equal(secondResult.attendanceXp, 10);
  const third = await f.backend.startSession();
  f.advance(60_000);
  assert.equal((await f.backend.finishSession(third.id)).attendanceXp, 0);
});

test('repeat and concurrent finish calls reuse the receipt without paying twice', async () => {
  const f = fixture();
  const session = await f.backend.startSession();
  f.advance(1800_000);
  const [first, duplicate] = await Promise.all([f.backend.finishSession(session.id), f.backend.finishSession(session.id)]);
  assert.deepEqual(first, duplicate);
  assert.deepEqual(await f.reopen().finishSession(session.id), first);
  assert.equal((await f.backend.getHome()).profile.bolt, 130);
  assert.equal(await f.backend.getActiveSession(), null);
});

test('credit is capped at 12 hours and goal/attendance bonuses are granted once', async () => {
  const f = fixture({ date: '2026-11-01T05:00:00+09:00' });
  const session = await f.backend.startSession();
  f.advance(13 * 3600_000);
  const result = await f.backend.finishSession(session.id);
  assert.equal(result.elapsedSeconds, 13 * 3600);
  assert.equal(result.creditedSeconds, 12 * 3600);
  assert.equal(result.bolt, 720);
  assert.equal(result.studyXp, 720);
  assert.equal(result.attendanceXp, 10);
  assert.equal(result.goalXp, 20);
  assert.equal(result.totalXp, 750);
  assert.equal(result.bugsRemoved, 3);
  assert.equal((await f.backend.getHome()).bugs.count, 0);
  assert.equal((await f.backend.getHome()).bugs.progressSeconds, 0);
  const second = await f.backend.startSession();
  f.advance(60_000);
  const next = await f.backend.finishSession(second.id);
  assert.equal(next.bolt, 1);
  assert.equal(next.attendanceXp + next.goalXp, 0);
});

test('replaying an old finish receipt does not close a newer active session', async () => {
  const f = fixture();
  const first = await f.backend.startSession();
  f.advance(60_000);
  const receipt = await f.backend.finishSession(first.id);
  const second = await f.backend.startSession();
  assert.deepEqual(await f.backend.finishSession(first.id), receipt);
  assert.equal((await f.backend.getActiveSession()).id, second.id);
  assert.equal((await f.backend.getHome()).profile.bolt, 101);
});

test('a session crossing 04:00 allocates time to both service days', async () => {
  const f = fixture({ date: '2026-11-01T03:30:00+09:00' });
  const session = await f.backend.startSession();
  f.advance(3600_000);
  const result = await f.backend.finishSession(session.id);
  const saved = JSON.parse(f.raw());
  assert.equal(saved.days['2026-10-31'].studyMs, 1800_000);
  assert.equal(saved.days['2026-11-01'].studyMs, 1800_000);
  assert.equal(result.attendanceXp, 20);
  assert.equal((await f.backend.getHome()).todayStudySeconds, 1800);
});

test('bug removal progress survives service-day changes and accumulates across sessions', async () => {
  const f = fixture({ date: '2026-11-01T03:00:00+09:00' });
  const first = await f.backend.startSession();
  f.advance(2400_000);
  assert.equal((await f.backend.finishSession(first.id)).bugsRemoved, 0);
  f.advance(3600_000);
  const second = await f.reopen().startSession();
  f.advance(1200_000);
  assert.equal((await f.backend.finishSession(second.id)).bugsRemoved, 1);
  const home = await f.backend.getHome();
  assert.equal(home.bugs.count, 2);
  assert.equal(home.bugs.progressSeconds, 0);
});

test('failed persistence never acknowledges start or loses an active session on finish', async () => {
  const f = fixture();
  await f.backend.getHome();
  f.setWriteFailure(true);
  await assert.rejects(f.backend.startSession(), { code: 'storage' });
  assert.equal(await f.backend.getActiveSession(), null);
  f.setWriteFailure(false);
  const session = await f.backend.startSession();
  f.advance(60_000);
  f.setWriteFailure(true);
  await assert.rejects(f.backend.finishSession(session.id), { code: 'storage' });
  assert.equal((await f.reopen().getActiveSession()).id, session.id);
  assert.equal((await f.backend.getHome()).profile.bolt, 100);
  f.setWriteFailure(false);
  assert.equal((await f.backend.finishSession(session.id)).bolt, 1);
});

test('result lookups and invalid IDs do not create sessions or rewards', async () => {
  const f = fixture();
  assert.equal(await f.backend.getResult('__proto__'), null);
  await assert.rejects(f.backend.finishSession('unknown'), { code: 'missing-session' });
  assert.equal(await f.backend.getActiveSession(), null);
  assert.equal((await f.backend.getHome()).profile.bolt, 100);
});

test('corrupt storage is reported without erasing the saved record', async () => {
  const f = fixture();
  f.corrupt('{broken');
  await assert.rejects(f.backend.getActiveSession(), { code: 'invalid-record' });
  assert.equal(f.raw(), '{broken');
  f.corrupt(JSON.stringify({ version: 1 }));
  await assert.rejects(f.backend.getHome(), { code: 'invalid-record' });
});
