const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiClubJoinService } = require('../.expo/tests/services/api/club-join-service.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { createMockClubJoinService } = require('../.expo/tests/mocks/club-join.js');
const { createMockNoticeService } = require('../.expo/tests/mocks/notices.js');
const { MOCK_APPLICATION_STORAGE_KEY } = require('../.expo/tests/mocks/clubs.js');
const { normalizeInviteCode, validInviteCode } = require('../.expo/tests/utils/club-join.js');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const clubId = id(1), partId = id(2), applicationId = id(3);
const part = { id: partId, name: 'Dynamic part', color: 'PURPLE' };
const preview = { id: clubId, name: 'Dynamic club', memberCount: 8, parts: [part] };
const application = { id: applicationId, clubId, userId: 'user-a', nickname: 'User', email: 'a@example.com', partId, state: 'PENDING', createdAt: '2026-11-02T03:00:00Z' };
function fixture(override = () => undefined) {
  const state = { applications: [], clubs: [], parts: [part] }, calls = [];
  let names = null, failNames = false;
  const store = { async get() { if (failNames) throw new Error('cache'); return names; }, async set(value) { if (failNames) throw new Error('cache'); names = value; } };
  const client = { async request(path, options = {}) {
    calls.push({ path, options }); const url = new URL(path, 'https://fixture.invalid');
    const special = override(url, options, state); if (special instanceof Error) throw special;
    let data = special;
    if (data === undefined) {
      if (url.pathname === '/clubs') data = { items: [preview] };
      else if (url.pathname === '/clubs/-/applications') data = { items: state.applications };
      else if (url.pathname.endsWith('/parts')) data = { items: state.parts };
      else if (options.method === 'POST') { state.applications = [application]; data = application; }
      else if (options.method === 'DELETE') { state.applications = []; }
      else { data = state.applications.find(one => one.id === url.pathname.split('/').at(-1)); if (!data) throw new ApiError('http', 404); }
    }
    return { data, headers: new Headers() };
  } };
  const memberships = { listMyClubs: async () => state.clubs };
  return { service: createApiClubJoinService(client, memberships, 'user-a', store), reopen: () => createApiClubJoinService(client, memberships, 'user-a', store), calls, state, names: () => names, setNames: value => { names = value; }, failNames: value => { failNames = value; } };
}
test('invite codes normalize surrounding spaces/case and invalid formats never send a request', async () => {
  assert.equal(normalizeInviteCode('  mori2026 '), 'MORI2026');
  for (const code of ['GOC-4821', '1234567', '123456789', 'MORI 026', '모리123456']) assert.equal(validInviteCode(code), false);
  const f = fixture(); await assert.rejects(f.service.findClub('GOC-4821'), { reason: 'invalid-code' }); assert.equal(f.calls.length, 0);
  const found = await f.service.findClub(' mori2026 '); assert.equal(found.parts[0].name, 'Dynamic part'); assert.equal(f.calls[0].path, '/clubs?inviteCode=MORI2026');
});
test('lookup takes current parts from the server and persists display metadata without the invite code', async () => {
  const f = fixture(); f.state.parts = [{ ...part, name: 'Current part' }];
  assert.equal((await f.service.findClub('MORI2026')).parts[0].name, 'Current part');
  assert.ok(!f.names().includes('MORI2026')); f.state.applications = [application];
  const restored = await f.reopen().getOverview(); assert.equal(restored.applications[0].clubName, preview.name); assert.equal(restored.applications[0].partName, 'Current part');
  assert.equal('email' in restored.applications[0], false);
});
test('unknown invite codes return no preview and malformed previews fail without mock fallback', async () => {
  assert.equal(await fixture(url => url.pathname === '/clubs' ? { items: [] } : undefined).service.findClub('MORI2026'), null);
  for (const data of [{ items: [preview, preview] }, { items: [{ ...preview, id: 'bad' }] }, { items: [{ ...preview, parts: [{ ...part, color: 'UNKNOWN' }] }] }]) await assert.rejects(fixture(url => url.pathname === '/clubs' ? data : undefined).service.findClub('MORI2026'), { kind: 'response' });
});
test('own application history reads every page, permits deleted decided parts, and prefers current joined names', async () => {
  const second = { ...application, id: id(4), state: 'APPROVED', partId: null };
  const f = fixture(url => url.pathname === '/clubs/-/applications' ? url.searchParams.has('pageToken') ? { items: [second] } : { items: [application], nextPageToken: 'next +/?' } : undefined);
  await f.service.findClub('MORI2026'); f.state.clubs = [{ id: clubId, name: 'Renamed joined club', memberCount: 9 }];
  const data = await f.service.getOverview(); assert.equal(data.applications.length, 2); assert.equal(data.applications[0].clubName, 'Renamed joined club'); assert.equal(data.applications[1].partId, null);
  assert.ok(f.calls.some(call => call.path.includes('pageToken=next%20%2B%2F%3F')));
});
test('an existing pending application is returned without another POST or changing its chosen part', async () => {
  const f = fixture(); f.state.applications = [application];
  assert.equal((await f.service.apply(clubId, id(9))).partId, partId); assert.equal(f.calls.filter(call => call.options.method === 'POST').length, 0);
});
test('new applications validate current parts and send only partId with POST', async () => {
  const f = fixture(); await assert.rejects(f.service.apply(clubId, id(9)), { reason: 'part-missing' });
  assert.equal(f.calls.filter(call => call.options.method === 'POST').length, 0);
  const receipt = await f.service.apply(clubId, partId); assert.equal(receipt.state, 'PENDING');
  assert.deepEqual(f.calls.find(call => call.options.method === 'POST'), { path: `/clubs/${clubId}/applications`, options: { method: 'POST', body: { partId } } });
});
test('lost application response is recovered by finding the pending record before retrying POST', async () => {
  const f = fixture((url, options, state) => { if (options.method === 'POST') { state.applications = [application]; return new ApiError('network'); } });
  await assert.rejects(f.service.apply(clubId, partId), { kind: 'network' }); assert.equal((await f.service.apply(clubId, partId)).id, applicationId);
  assert.equal(f.calls.filter(call => call.options.method === 'POST').length, 1);
});
test('already-member and pending conflicts map to distinct states and mismatched receipts fail', async () => {
  for (const [code, reason] of [['already-member', 'already-member'], ['application-pending', 'pending']]) await assert.rejects(fixture((url, options) => options.method === 'POST' ? new ApiError('http', 409, code) : undefined).service.apply(clubId, partId), { reason });
  await assert.rejects(fixture((url, options) => options.method === 'POST' ? { ...application, clubId: id(9) } : undefined).service.apply(clubId, partId), { kind: 'response' });
});
test('cancel rechecks the exact application and never deletes an approved record or membership', async () => {
  const f = fixture(); f.state.applications = [application]; assert.equal(await f.service.cancel(clubId, applicationId), 'cancelled');
  assert.deepEqual(f.calls.at(-1), { path: `/clubs/${clubId}/applications/${applicationId}`, options: { method: 'DELETE' } });
  f.state.applications = [{ ...application, state: 'APPROVED' }]; const deletes = f.calls.filter(call => call.options.method === 'DELETE').length;
  await assert.rejects(f.service.cancel(clubId, applicationId), { reason: 'not-pending' }); assert.equal(f.calls.filter(call => call.options.method === 'DELETE').length, deletes);
});
test('lost cancellation response and a missing application are recovered without a second DELETE', async () => {
  const f = fixture((url, options, state) => { if (options.method === 'DELETE') { state.applications = []; return new ApiError('network'); } }); f.state.applications = [application];
  await assert.rejects(f.service.cancel(clubId, applicationId), { kind: 'network' }); assert.equal(await f.service.cancel(clubId, applicationId), 'missing'); assert.equal(f.calls.filter(call => call.options.method === 'DELETE').length, 1);
  const race = fixture((url, options) => options.method === 'DELETE' ? new ApiError('http', 409, 'not-pending') : undefined); race.state.applications = [application];
  await assert.rejects(race.service.cancel(clubId, applicationId), { reason: 'not-pending' });
});
test('route IDs, other users, malformed history and looping cursors are rejected', async () => {
  const f = fixture(); await assert.rejects(f.service.apply('../club', partId), { kind: 'response' }); await assert.rejects(f.service.cancel(clubId, '../app'), { kind: 'response' }); assert.equal(f.calls.length, 0);
  for (const change of [{ userId: 'user-b' }, { partId: null }, { state: 'UNKNOWN' }, { createdAt: 'bad' }]) await assert.rejects(fixture(url => url.pathname === '/clubs/-/applications' ? { items: [{ ...application, ...change }] } : undefined).service.getOverview(), { kind: 'response' });
  await assert.rejects(fixture(url => url.pathname === '/clubs/-/applications' ? { items: [], nextPageToken: 'loop' } : undefined).service.getOverview(), { kind: 'response' });
});
test('optional metadata cache failures do not create membership or prevent authoritative state checks', async () => {
  const f = fixture(); f.failNames(true); assert.equal((await f.service.findClub('MORI2026')).name, preview.name);
  f.state.applications = [application]; const data = await f.service.getOverview(); assert.equal(data.applications[0].state, 'PENDING'); assert.deepEqual(data.clubs, []);
  const corrupt = fixture(); corrupt.setNames('{bad'); assert.deepEqual((await corrupt.service.getOverview()).applications, []); assert.equal(corrupt.names(), '{bad');
});

function mockFixture() {
  const data = new Map(); let fail = false; const now = () => Date.parse('2026-11-02T03:00:00Z');
  const store = { async getItem(key) { return data.get(key) ?? null; }, async setItem(key, value) { if (fail) throw new Error('disk'); data.set(key, value); } };
  return { service: createMockClubJoinService(store, now), reopen: () => createMockClubJoinService(store, now), notices: createMockNoticeService(store), data, fail: value => { fail = value; } };
}
test('mock repeated applications persist once and cannot access notices until an approval is verified', async () => {
  const f = mockFixture(), found = await f.service.findClub('mori2026'), chosen = found.parts[0];
  const applications = await Promise.all([f.service.apply(found.id, chosen.id), f.service.apply(found.id, chosen.id)]);
  assert.equal(applications[0].id, applications[1].id); assert.equal((await f.reopen().getOverview()).applications.length, 1);
  await assert.rejects(f.notices.getBoard(found.id, {}));
  const record = JSON.parse(f.data.get(MOCK_APPLICATION_STORAGE_KEY)); record.applications[0].state = 'APPROVED'; record.applications[0].decidedAt = '2026-11-02T03:01:00Z'; f.data.set(MOCK_APPLICATION_STORAGE_KEY, JSON.stringify(record));
  assert.ok((await f.notices.listMyClubs()).some(club => club.id === found.id)); assert.equal((await f.notices.getBoard(found.id, {})).unreadCount, 3);
  await assert.rejects(f.service.cancel(found.id, applications[0].id), { reason: 'not-pending' });
});
test('mock cancellation and rejection history preserve other data and expired rejections are hidden without deletion', async () => {
  const f = mockFixture(), found = await f.service.findClub('MORI2026'); f.data.set('@tamagochi/mock-study/v1', 'existing-study');
  const one = await f.service.apply(found.id, found.parts[0].id); assert.equal(await f.service.cancel(found.id, one.id), 'cancelled'); assert.equal(await f.service.cancel(found.id, one.id), 'missing');
  f.data.set(MOCK_APPLICATION_STORAGE_KEY, JSON.stringify({ version: 1, applications: [{ ...one, state: 'REJECTED', partId: null, decidedAt: '2026-10-20T03:00:00Z' }] }));
  assert.equal((await f.service.getOverview()).applications.length, 0); assert.equal(JSON.parse(f.data.get(MOCK_APPLICATION_STORAGE_KEY)).applications.length, 1);
  await f.reopen().apply(found.id, found.parts[0].id); assert.equal((await f.service.getOverview()).applications.length, 1); assert.equal(f.data.get('@tamagochi/mock-study/v1'), 'existing-study');
});
test('mock storage failures never acknowledge an application and corrupted records remain untouched', async () => {
  const f = mockFixture(), found = await f.service.findClub('MORI2026'); f.fail(true);
  await assert.rejects(f.service.apply(found.id, found.parts[0].id), { reason: 'storage' }); assert.equal(f.data.has(MOCK_APPLICATION_STORAGE_KEY), false);
  f.fail(false); f.data.set(MOCK_APPLICATION_STORAGE_KEY, '{bad'); await assert.rejects(f.service.getOverview()); assert.equal(f.data.get(MOCK_APPLICATION_STORAGE_KEY), '{bad');
});
