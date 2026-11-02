const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiProfileService } = require('../.expo/tests/services/api/profile-service.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { createMockStudyBackend } = require('../.expo/tests/mocks/study-backend.js');
const { addCalendarDays, goalMinutesOn, isCalendarDay, mondayOf, validGoalMinutes } = require('../.expo/tests/utils/profile.js');

const day = '2026-11-02', tomorrow = '2026-11-03';
const stats = {
  volts: 155, level: 4, xp: 520, levelXp: 450, nextLevelXp: 700, todaySeconds: 6000, todayAttended: true,
  weekSeconds: 6000, attendanceStreak: 5, dayNumber: 42,
  week: Array.from({ length: 7 }, (_, index) => ({ day: addCalendarDays(day, index), studiedSeconds: index ? 0 : 6000, goalMinutes: 180, goalMet: false })),
};
function fixture(overrides = {}) {
  let time = Date.parse('2026-11-02T12:00:00+09:00');
  const calls = [], responses = { '/users/me': { nickname: 'Test' }, '/users/me/stats': stats, '/users/me/dailyGoals': { items: [] }, ...overrides };
  const client = { async request(path, options) {
    calls.push({ path, options });
    const data = options?.method === 'POST' ? responses.POST ?? options.body : responses[path];
    if (data instanceof Error) throw data;
    return { data, headers: new Headers() };
  } };
  return { service: createApiProfileService(client, () => time), calls, responses, advance: ms => { time += ms; } };
}
test('profile uses cumulative XP thresholds, server statistics, and a default goal', async () => {
  const f = fixture(), profile = await f.service.getProfile();
  assert.equal(profile.nickname, 'Test'); assert.equal(profile.xp, 520); assert.equal(profile.levelXp, 450); assert.equal(profile.nextLevelXp, 700);
  assert.equal(profile.attendanceStreak, 5); assert.equal(profile.weekSeconds, 6000); assert.equal(profile.week.length, 7);
  assert.equal(profile.serviceDay, day); assert.equal(profile.tomorrow, tomorrow); assert.equal(profile.goalMinutes, 180);
  assert.deepEqual(profile.scheduledGoals, []); assert.equal(f.calls.length, 3);
});
test('goal history is applied by start day; future changes never alter today', async () => {
  const versions = [{ startOn: '2026-11-10', minutes: 60 }, { startOn: tomorrow, minutes: 120 }, { startOn: '2026-10-20', minutes: 240 }];
  const profile = await fixture({ '/users/me/dailyGoals': { items: versions } }).service.getProfile();
  assert.equal(profile.goalMinutes, 240); assert.deepEqual(profile.scheduledGoals.map(goal => goal.minutes), [120, 60]);
  assert.equal(goalMinutesOn(versions, '2026-10-01'), 180);
});
test('goal validation accepts only 30–720 whole minutes in steps of ten, including boundaries', async () => {
  const f = fixture();
  for (const minutes of [0, 29, 35, 721, 30.5, NaN, Infinity, '60']) {
    assert.equal(validGoalMinutes(minutes), false);
    await assert.rejects(f.service.createGoal(minutes, tomorrow), { reason: 'invalid' });
  }
  assert.equal(f.calls.length, 0);
  for (const minutes of [30, 180, 720]) await f.service.createGoal(minutes, tomorrow);
  assert.deepEqual(f.calls.map(call => call.options), [30, 180, 720].map(minutes => ({ method: 'POST', body: { startOn: tomorrow, minutes } })));
});
test('04:00 KST rollover rejects an editor from the previous service day before POST', async () => {
  const f = fixture(); f.advance(16 * 3600000); // Nov 3 04:00 KST
  await assert.rejects(f.service.createGoal(60, tomorrow), { reason: 'day-changed' });
  assert.equal(f.calls.length, 0); assert.equal((await f.service.getProfile()).serviceDay, tomorrow);
});
test('an exposed server Date corrects service-day selection when the device clock is skewed', async () => {
  const service = createApiProfileService({ async request(path, options) {
    return { data: options?.body ?? (path === '/users/me' ? { nickname: 'Test' } : path === '/users/me/stats' ? stats : { items: [] }), headers: new Headers({ Date: 'Mon, 02 Nov 2026 03:00:00 GMT' }) };
  } }, () => Date.parse('2026-11-05T03:00:00Z'));
  assert.equal((await service.getProfile()).serviceDay, day); await service.createGoal(60, tomorrow);
});
test('duplicate dates remain a visible conflict and mismatched receipts are rejected', async () => {
  await assert.rejects(fixture({ POST: new ApiError('http', 409, 'duplicate-start-on') }).service.createGoal(60, tomorrow), { reason: 'duplicate' });
  await assert.rejects(fixture({ POST: { startOn: tomorrow, minutes: 120 } }).service.createGoal(60, tomorrow), { kind: 'response' });
  await assert.rejects(fixture({ POST: new ApiError('network') }).service.createGoal(60, tomorrow), { kind: 'network' });
});
test('malformed profile, XP, week and date responses fail without falling back to mock statistics', async () => {
  for (const change of [{ nextLevelXp: 450 }, { xp: -1 }, { week: [] }, { attendanceStreak: -1 }, { dayNumber: 0 }, { week: stats.week.map((one, index) => index === 1 ? { ...one, day: '2026-02-30' } : one) }, { week: stats.week.map((one, index) => index === 1 ? { ...one, goalMinutes: 35 } : one) }]) {
    await assert.rejects(fixture({ '/users/me/stats': { ...stats, ...change } }).service.getProfile(), { kind: 'response' });
  }
  await assert.rejects(fixture({ '/users/me/dailyGoals': { items: [{ startOn: 'bad', minutes: 30 }] } }).service.getProfile(), { kind: 'response' });
  await assert.rejects(fixture({ '/users/me/dailyGoals': { items: [{ startOn: tomorrow, minutes: 60 }, { startOn: tomorrow, minutes: 90 }] } }).service.getProfile(), { kind: 'response' });
  await assert.rejects(fixture({ '/users/me/stats': new ApiError('network') }).service.getProfile(), { kind: 'network' });
  assert.equal((await fixture({ '/users/me/stats': { ...stats, xp: 100 } }).service.getProfile()).level, 4); // A retained level may exceed the current XP floor.
});
test('calendar utilities preserve KST service labels across month, year and Monday boundaries', () => {
  assert.equal(isCalendarDay('2026-02-30'), false); assert.equal(isCalendarDay('2028-02-29'), true);
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01'); assert.equal(mondayOf('2026-11-01'), '2026-10-26');
});

function mockFixture(date = '2026-11-02T12:00:00+09:00') {
  let raw = null, time = Date.parse(date), fail = false, sequence = 0;
  const options = { storage: { async getItem() { return raw; }, async setItem(key, value) { if (fail) throw new Error('disk'); raw = value; } }, now: () => time, createId: () => `session-${++sequence}`, isOnline: async () => true,
    initialHome: { profile: { nickname: 'Mock', bolt: 155, level: 4, hearts: 4 }, room: { name: 'Room', characterLabel: 'Cat' }, todayStudySeconds: 0, attendance: { studySeconds: 0, requiredSeconds: 1800, achieved: false }, bugs: { count: 3, progressSeconds: 0, requiredSeconds: 3600 } } };
  return { backend: createMockStudyBackend(options), reopen: () => createMockStudyBackend(options), advance: ms => { time += ms; }, raw: () => raw, setRaw: value => { raw = value; }, fail: value => { fail = value; } };
}
test('mock goal schedules persist once without rewriting old study records or current goals', async () => {
  const f = mockFixture(); const before = await f.backend.getProfile(); assert.equal(before.goalMinutes, 180);
  await Promise.all([f.backend.createGoal(60, tomorrow), assert.rejects(f.backend.createGoal(120, tomorrow), { reason: 'duplicate' })]);
  const after = await f.reopen().getProfile(); assert.equal(after.goalMinutes, 180); assert.equal(after.scheduledGoals[0].minutes, 60);
  assert.equal(after.balance, before.balance); assert.equal(after.xp, before.xp);
});
test('mock sessions spanning 04:00 use each day’s goal and grant a goal bonus once', async () => {
  const f = mockFixture('2026-11-02T03:40:00+09:00'); await f.backend.createGoal(30, day);
  const session = await f.backend.startSession(); f.advance(50 * 60000);
  const result = await f.backend.finishSession(session.id);
  assert.equal(result.goalXp, 20); assert.equal(result.attendanceXp, 10); assert.equal(result.bolt, 50);
  const profile = await f.reopen().getProfile(); assert.equal(profile.goalMinutes, 30); assert.equal(profile.todaySeconds, 1800); assert.equal(profile.weekSeconds, 1800); assert.equal(profile.attendanceStreak, 1);
  assert.equal(profile.week[0].goalMet, true); assert.equal(profile.scheduledGoals.length, 0); assert.equal(profile.xp, 530);
  const next = await f.backend.startSession(); f.advance(10 * 60000); assert.equal((await f.backend.finishSession(next.id)).goalXp, 0);
});
test('mock running time is included in the current week without settling or saving twice', async () => {
  const f = mockFixture(); await f.backend.startSession(); const before = f.raw(); f.advance(35 * 60000);
  const profile = await f.backend.getProfile(); assert.equal(profile.todaySeconds, 2100); assert.equal(profile.weekSeconds, 2100); assert.equal(profile.attendanceStreak, 1);
  assert.equal((await f.backend.getHome()).todayStudySeconds, profile.todaySeconds);
  assert.equal(profile.xp, 450); assert.equal(f.raw(), before);
});
test('mock study XP updates the same level shown in profile, Home, and shop unlocks', async () => {
  const f = mockFixture(); const session = await f.backend.startSession(); f.advance(250 * 60000); await f.backend.finishSession(session.id);
  assert.equal((await f.backend.getProfile()).level, 5); assert.equal((await f.backend.getHome()).profile.level, 5); assert.equal((await f.backend.getShop()).level, 5);
  await f.backend.purchase('mock-pompom_beanie'); assert.ok((await f.backend.getShop()).ownedItemIds.includes('mock-pompom_beanie'));
});
test('mock storage failures and corrupt goal history preserve the existing ledger', async () => {
  const f = mockFixture(); await f.backend.getProfile(); const before = f.raw(); f.fail(true);
  await assert.rejects(f.backend.createGoal(60, tomorrow), { reason: 'storage' }); assert.equal(f.raw(), before);
  f.fail(false); await f.backend.createGoal(60, tomorrow);
  const corrupt = JSON.stringify({ ...JSON.parse(f.raw()), goals: [{ startOn: '2026-02-30', minutes: 60 }] }); f.setRaw(corrupt);
  await assert.rejects(f.backend.getProfile(), { code: 'invalid-record' }); assert.equal(f.raw(), corrupt);
});
