const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiClubCreateService } = require('../.expo/tests/services/api/club-create-service.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { normalizeClubCreate, validateClubCreate } = require('../.expo/tests/utils/club-create.js');
const { createMockClubCreateService, MOCK_CLUB_CREATE_JOURNAL_KEY } = require('../.expo/tests/mocks/club-create.js');
const { createMockClubJoinService } = require('../.expo/tests/mocks/club-join.js');
const { createMockNoticeService } = require('../.expo/tests/mocks/notices.js');
const { MOCK_CREATED_CLUBS_KEY } = require('../.expo/tests/mocks/created-clubs.js');

const id = '11111111-1111-4111-8111-111111111111';
const input = { name: ' 코딩하는 고양이 ', parts: [{ name: ' 기획 ', color: 'PURPLE' }, { name: '개발', color: 'BLUE' }], myPartName: ' 개발 ' };
const receipt = { id, name: '코딩하는 고양이', memberCount: 1, inviteCode: 'MORI2026', createdAt: '2026-11-03T00:00:00Z' };
function fixture(override = () => undefined) {
  let raw = null, failGet = false, failSet = false, failReceipt = false;
  const calls = [], writes = [];
  const store = { async get() { if (failGet) throw new Error('read failed'); return raw; }, async set(value) {
    writes.push(value); if (failSet || (failReceipt && value?.includes('"kind":"created"'))) throw new Error('write failed'); raw = value;
  } };
  const client = { async request(path, options = {}) {
    calls.push({ path, options, journal: raw });
    const special = override(path, options); if (special instanceof Error) throw special;
    return { data: special ?? receipt, headers: new Headers() };
  } };
  return { service: createApiClubCreateService(client, store), reopen: () => createApiClubCreateService(client, store), calls, writes,
    raw: () => raw, setRaw: value => { raw = value; }, failGet: value => { failGet = value; }, failSet: value => { failSet = value; }, failReceipt: value => { failReceipt = value; } };
}
function mockStorage() {
  const data = new Map(), writes = [];
  return { data, writes, async getItem(key) { return data.get(key) ?? null; }, async setItem(key, value) { writes.push(key); data.set(key, value); } };
}

test('club names and parts use trimmed grapheme limits, distinct names and a selected creator part', () => {
  assert.equal(validateClubCreate(input), null);
  assert.deepEqual(normalizeClubCreate(input), { name: '코딩하는 고양이', parts: [{ name: '기획', color: 'PURPLE' }, { name: '개발', color: 'BLUE' }], myPartName: '개발' });
  assert.equal(validateClubCreate({ ...input, name: '👨‍👩‍👧‍👦'.repeat(20) }), null);
  assert.match(validateClubCreate({ ...input, name: '가'.repeat(21) }), /1~20/);
  assert.match(validateClubCreate({ ...input, parts: [] }), /한 개/);
  assert.match(validateClubCreate({ ...input, parts: [{ name: '가'.repeat(11), color: 'BLUE' }] }), /1~10/);
  assert.match(validateClubCreate({ ...input, parts: [{ name: '개발', color: 'BLUE' }, { name: ' 개발 ', color: 'GREEN' }] }), /같은 이름/);
  assert.match(validateClubCreate({ ...input, myPartName: '없는 파트' }), /내 소속/);
  assert.match(validateClubCreate({ ...input, parts: [{ name: '개발', color: 'MAGENTA' }] }), /색상/);
});

test('invalid forms never create an intent or send API requests', async () => {
  const f = fixture(); await assert.rejects(f.service.create({ ...input, myPartName: '' }), { reason: 'invalid-input' });
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
});

test('creation records intent before one POST and sends only the contracted normalized fields', async () => {
  const f = fixture(); assert.equal((await f.service.create({ ...input, notificationsOn: true })).id, id);
  assert.equal(f.calls.length, 1); assert.deepEqual(f.calls[0].options, { method: 'POST', body: normalizeClubCreate(input) });
  assert.equal(f.calls[0].path, '/clubs'); assert.equal(JSON.parse(f.calls[0].journal).kind, 'pending');
  assert.deepEqual(JSON.parse(f.raw()), { version: 1, kind: 'created', clubId: id });
  assert.ok(!f.raw().includes('MORI2026')); assert.ok(!f.raw().includes('코딩하는'));
});

test('concurrent submissions and reopened completed forms cannot repeat the POST', async () => {
  const f = fixture(); const results = await Promise.allSettled([f.service.create(input), f.service.create(input)]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].reason.reason, 'already-created');
  assert.equal((await f.reopen().getStatus()).kind, 'created'); await assert.rejects(f.reopen().create(input), { reason: 'already-created' });
  assert.equal(f.calls.filter(call => call.options.method === 'POST').length, 1);
});

test('network loss and server errors preserve the durable uncertain intent across restarts without replay', async () => {
  for (const failure of [new ApiError('network'), new ApiError('timeout'), new ApiError('http', 500), new ApiError('response')]) {
    const f = fixture(() => failure); await assert.rejects(f.service.create(input), { reason: 'uncertain' });
    assert.deepEqual(await f.reopen().getStatus(), { kind: 'uncertain' }); await assert.rejects(f.reopen().create(input), { reason: 'uncertain' });
    assert.equal(f.calls.length, 1); assert.equal(JSON.parse(f.raw()).kind, 'pending');
  }
});

test('definite 400/401/403 rejections release the intent and propagate the actual error', async () => {
  for (const code of [400, 401, 403]) {
    const f = fixture(() => new ApiError('http', code)); await assert.rejects(f.service.create(input), { status: code });
    assert.equal(f.raw(), null); assert.deepEqual(await f.reopen().getStatus(), { kind: 'ready' });
  }
});

test('storage read errors, corruption and intent save failures stop the POST and preserve existing records', async () => {
  const f = fixture(); f.failGet(true); await assert.rejects(f.service.create(input), { reason: 'storage' }); assert.equal(f.calls.length, 0);
  f.failGet(false); f.setRaw('broken'); await assert.rejects(f.reopen().getStatus(), { reason: 'storage' }); assert.equal(f.raw(), 'broken');
  f.setRaw(null); f.failSet(true); await assert.rejects(f.reopen().create(input), { reason: 'storage' }); assert.equal(f.calls.length, 0);
});

test('receipt persistence failure still shows the confirmed result and retains the durable no-replay guard', async () => {
  const f = fixture(); f.failReceipt(true); assert.equal((await f.service.create(input)).id, id);
  assert.equal((await f.service.getStatus()).kind, 'created'); assert.equal((await f.reopen().getStatus()).kind, 'uncertain');
  await assert.rejects(f.reopen().create(input), { reason: 'uncertain' }); assert.equal(f.calls.filter(call => call.options.method === 'POST').length, 1);
});

test('restoring a confirmed club fetches its current name and invite code; mismatched IDs never replace it', async () => {
  const f = fixture((path, options) => options.method ? undefined : { ...receipt, name: '새 이름', inviteCode: 'NEWC2026' });
  await f.service.create(input); const restored = await f.reopen().getStatus(); assert.equal(restored.club.name, '새 이름'); assert.equal(restored.club.inviteCode, 'NEWC2026');
  assert.equal(f.calls.at(-1).path, `/clubs/${id}`);
  const wrong = fixture(() => ({ ...receipt, id: '22222222-1111-4111-8111-111111111111' })); wrong.setRaw(f.raw());
  await assert.rejects(wrong.service.getStatus(), { kind: 'response' }); assert.equal(wrong.raw(), f.raw());
});

test('malformed success responses remain uncertain and never invent a code or club', async () => {
  for (const value of [{ ...receipt, id: 'bad' }, { ...receipt, inviteCode: 'GOC-4821' }, { ...receipt, memberCount: 0 }, { ...receipt, name: 'different' }]) {
    const f = fixture(() => value); await assert.rejects(f.service.create(input), { reason: 'uncertain' }); assert.equal((await f.reopen().getStatus()).kind, 'uncertain');
  }
  const f = fixture(() => ({ ...receipt, inviteCode: undefined })); assert.equal((await f.service.create(input)).inviteCode, undefined);
});

test('explicit reset clears only the creation guard, and reset save failures leave it in place', async () => {
  const f = fixture(() => new ApiError('network')); await assert.rejects(f.service.create(input)); f.failSet(true);
  await assert.rejects(f.service.reset(), { reason: 'storage' }); assert.equal((await f.service.getStatus()).kind, 'uncertain');
  f.failSet(false); await f.service.reset(); assert.deepEqual(await f.service.getStatus(), { kind: 'ready' }); assert.equal(f.calls.length, 1);
});

test('separate account journals do not expose another account result or suppress its creation', async () => {
  const a = fixture(), b = fixture(); await a.service.create(input); assert.equal((await b.service.getStatus()).kind, 'ready');
  await b.service.create(input); assert.equal(a.calls.length, 1); assert.equal(b.calls.length, 1);
});

test('Mock creation persists membership, current parts and code with only an empty general notice category', async () => {
  const storage = mockStorage(); storage.data.set('@tamagochi/unrelated-study', 'preserved');
  const create = createMockClubCreateService(storage), join = createMockClubJoinService(storage), notices = createMockNoticeService(storage);
  const club = await create.create(input); assert.match(club.inviteCode, /^[A-Z0-9]{8}$/);
  assert.equal((await createMockClubCreateService(storage).getStatus()).club.id, club.id);
  const overview = await join.getOverview(); assert.equal(overview.clubs.length, 3); assert.equal(overview.applications.length, 0);
  const found = await join.findClub(club.inviteCode); assert.equal(found.name, '코딩하는 고양이'); assert.equal(found.parts.length, 2); assert.equal('inviteCode' in found, false);
  const board = await notices.getBoard(club.id, {}); assert.deepEqual(board.page.items, []); assert.equal(board.unreadCount, 0); assert.deepEqual(board.categories.map(category => category.name), ['전체공지']);
  assert.equal(storage.data.get('@tamagochi/unrelated-study'), 'preserved');
  assert.ok(storage.writes.every(key => [MOCK_CREATED_CLUBS_KEY, MOCK_CLUB_CREATE_JOURNAL_KEY].includes(key)));
  await create.reset(); const another = await create.create(input); assert.notEqual(another.id, club.id); assert.equal((await join.getOverview()).clubs.length, 4);
});

test('Mock storage corruption and failed ledger writes never manufacture membership or erase existing data', async () => {
  const storage = mockStorage(); storage.data.set(MOCK_CREATED_CLUBS_KEY, 'broken'); const create = createMockClubCreateService(storage);
  await assert.rejects(create.create(input), { reason: 'uncertain' }); assert.equal(storage.data.get(MOCK_CREATED_CLUBS_KEY), 'broken');
  await create.reset(); storage.data.delete(MOCK_CREATED_CLUBS_KEY); const save = storage.setItem;
  storage.setItem = async (key, value) => { if (key === MOCK_CREATED_CLUBS_KEY) throw new Error('write failed'); return save(key, value); };
  await assert.rejects(create.create(input), { reason: 'uncertain' }); assert.equal((await createMockClubJoinService(storage).getOverview()).clubs.length, 2);
});
