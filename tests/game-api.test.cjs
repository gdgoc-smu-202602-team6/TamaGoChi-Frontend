const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiStudyService } = require('../.expo/tests/services/api/study-service.js');
const { createApiHomeService } = require('../.expo/tests/services/api/home-service.js');
const { createAuthorizedClient } = require('../.expo/tests/services/api/authorized-client.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { elapsedSessionSeconds } = require('../.expo/tests/utils/session-clock.js');

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const start = Date.parse('2026-11-01T18:59:00Z');
const dto = (overrides = {}) => ({ id, state: 'RUNNING', startedAt: new Date(start).toISOString(), maxEndAt: new Date(start + 43200000).toISOString(), studiedSeconds: 60, ...overrides });
const receipt = (overrides = {}) => dto({ state: 'ENDED', endedAt: new Date(start + 1860000).toISOString(), studiedSeconds: 1860, result: { studiedMinutes: 31, volts: 31, xp: 31, attendanceBonusXp: 10, goalBonusXp: 20, attendedNow: true, bugsCleared: 1, bugsRemaining: 2, heartsChange: 1, levelBefore: 4, levelAfter: 5 }, ...overrides });
function storage(initial = null) {
  let value = initial;
  return { get: async () => value, set: async (next) => { value = next; }, inspect: () => value ? JSON.parse(value) : null, raw: () => value };
}
function fixture(handler, store = storage()) {
  const calls = [];
  const client = { async request(path, options = {}) { calls.push({ path, ...options }); const data = await handler(path, options); return { data, headers: new Headers() }; } };
  const make = () => createApiStudyService(client, store, { wall: () => start + 60000, monotonic: () => 1000 });
  return { service: make(), reopen: make, calls, store };
}
const blank = () => ({ version: 1, activeSessionId: null, completedSessionId: null, pendingEnd: null });
const isList = path => path.includes('?state=RUNNING');

test('Home uses server stats and room condition without locally settling the KST service day', async () => {
  const calls = [];
  const home = createApiHomeService({ async request(path) {
    calls.push(path);
    return { data: path.endsWith('/stats') ? { volts: 987, level: 7, todaySeconds: 1810, todayAttended: true } : path.endsWith('/room') ? { condition: { hearts: 2, bugs: 3, bugProgressSeconds: 3590 } } : { nickname: '서버냥' }, headers: new Headers() };
  } });
  const data = await home.getHome();
  assert.deepEqual(data.profile, { nickname: '서버냥', bolt: 987, level: 7, hearts: 2 });
  assert.equal(data.todayStudySeconds, 1810);
  assert.equal(data.attendance.achieved, true);
  assert.equal(data.bugs.progressSeconds, 3590);
  assert.deepEqual(calls, ['/users/me', '/users/me/stats', '/users/me/room']);
});

test('server elapsed anchor ignores a skewed device clock and caps at maxEndAt', async () => {
  const f = fixture(() => ({ items: [dto()] }));
  const session = await f.service.getActiveSession();
  assert.equal(elapsedSessionSeconds(session, 3100, start - 100000000), 62);
  assert.equal(elapsedSessionSeconds(session, 999999999, start + 100000000), 43200);
  assert.equal(session.startedAt, new Date(start).toISOString());
});

test('start returns the server active session instead of posting a duplicate', async () => {
  const f = fixture(() => ({ items: [dto()] }));
  const [one, two] = await Promise.all([f.service.startSession(), f.service.startSession()]);
  assert.equal(one.id, two.id);
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 0);
  assert.equal(f.store.inspect().activeSessionId, id);
});

test('409 session-running re-queries the winner of a concurrent start', async () => {
  let lists = 0;
  const f = fixture((path, options) => {
    if (isList(path)) return { items: ++lists === 1 ? [] : [dto()] };
    if (options.method === 'POST') throw new ApiError('http', 409, 'session-running');
  });
  assert.equal((await f.service.startSession()).id, id);
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1);
});

test('a lost POST response is recovered by querying active sessions before retrying', async () => {
  let active = false;
  const f = fixture((path, options) => {
    if (isList(path)) return { items: active ? [dto()] : [] };
    if (options.method === 'POST') { active = true; throw new ApiError('network'); }
  });
  await assert.rejects(f.service.startSession(), { kind: 'network' });
  assert.equal((await f.service.startSession()).id, id);
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1);
});

test('offline start never invents a local session or reward', async () => {
  const f = fixture(() => { throw new ApiError('network'); });
  await assert.rejects(f.service.startSession(), { kind: 'network' });
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 0);
  assert.equal(f.store.raw(), null);
});

test('finish persists the original tap time before HTTP and maps XP fields once', async () => {
  const store = storage(); const endedAt = new Date(start + 1860123).toISOString();
  const f = fixture((_path, options) => {
    assert.deepEqual(store.inspect().pendingEnd, { sessionId: id, clientEndedAt: endedAt });
    assert.deepEqual(options.body, { state: 'ENDED', clientEndedAt: endedAt });
    return receipt();
  }, store);
  const result = await f.service.finishSession(id, endedAt);
  assert.equal(result.bolt, 31); assert.equal(result.totalXp, 61); assert.equal(result.studyXp, 31);
  assert.equal(result.heartsChange, 1); assert.equal(result.levelAfter, 5);
  assert.equal(store.inspect().pendingEnd, null); assert.equal(store.inspect().completedSessionId, id);
});

test('offline finish survives reopening and reuses the same timestamp on reconnect', async () => {
  let offline = true;
  const endedAt = new Date(start + 123456).toISOString();
  const f = fixture((path, options) => {
    if (isList(path)) return { items: [] };
    if (offline) throw new ApiError('network');
    assert.equal(options.body.clientEndedAt, endedAt);
    return receipt();
  });
  await assert.rejects(f.service.finishSession(id, endedAt), { kind: 'network' });
  offline = false;
  const recovery = await f.reopen().getRecovery();
  assert.equal(recovery.session, null); assert.equal(recovery.completedSessionId, id);
  assert.equal(f.store.inspect().pendingEnd, null);
});

test('lost finish response and session-ended conflict reuse GET result without paying locally', async () => {
  let ended = false;
  const f = fixture((_path, options) => {
    if (options.method === 'PATCH') {
      if (ended) throw new ApiError('http', 409, 'session-ended');
      ended = true; throw new ApiError('network');
    }
    return receipt();
  });
  await assert.rejects(f.service.finishSession(id), { kind: 'network' });
  const result = await f.service.finishSession(id, new Date(start + 999999).toISOString());
  assert.equal(result.bolt, 31);
  assert.equal(f.calls.filter(call => call.method === 'PATCH')[0].body.clientEndedAt, f.calls.filter(call => call.method === 'PATCH')[1].body.clientEndedAt);
});

test('another device ending a remembered active session exposes its saved receipt', async () => {
  const store = storage(JSON.stringify({ ...blank(), activeSessionId: id }));
  const f = fixture(path => isList(path) ? { items: [] } : receipt(), store);
  const state = await f.service.getRecovery();
  assert.equal(state.session, null); assert.equal(state.completedSessionId, id);
  assert.equal(f.calls.some(call => call.method === 'PATCH'), false);
  await f.service.acknowledgeResult(other);
  assert.equal(store.inspect().completedSessionId, id);
  await f.service.acknowledgeResult(id);
  assert.equal((await f.service.getRecovery()).completedSessionId, null);
});

test('12-hour server expiry is read as ENDED without a client settlement or PATCH', async () => {
  const store = storage(JSON.stringify({ ...blank(), activeSessionId: id }));
  const maximum = receipt({ studiedSeconds: 43200, endedAt: new Date(start + 43200000).toISOString() });
  const f = fixture(path => isList(path) ? { items: [] } : maximum, store);
  assert.equal((await f.service.getRecovery()).completedSessionId, id);
  assert.equal((await f.service.getResult(id)).creditedSeconds, 43200);
  assert.equal(f.calls.some(call => call.method === 'PATCH'), false);
});

test('replaying an old finish cannot close a newer session', async () => {
  const store = storage(JSON.stringify({ ...blank(), activeSessionId: other }));
  const f = fixture((_path, options) => { if(options.method === 'PATCH') throw new ApiError('http',409,'session-ended'); return receipt(); }, store);
  await f.service.finishSession(id);
  assert.equal(store.inspect().activeSessionId, other);
  assert.ok(f.calls.every(call => !call.path.includes(other)));
});

test('invalid result IDs and absent or running results do not create sessions', async () => {
  const f = fixture(() => dto());
  assert.equal(await f.service.getResult('../wrong'), null); assert.equal(f.calls.length, 0);
  assert.equal(await f.service.getResult(id), null);
  const missing = fixture(() => { throw new ApiError('http',404); });
  assert.equal(await missing.service.getResult(id), null);
  assert.equal(f.calls.some(call => call.method), false);
});

test('corrupt recovery storage and failed intent persistence never send a finish', async () => {
  const bad = fixture(() => receipt(), storage('{broken'));
  await assert.rejects(bad.service.getRecovery(), { kind: 'storage' }); assert.equal(bad.calls.length, 0);
  assert.equal(bad.store.raw(), '{broken');
  const store = storage(); store.set = async () => { throw new Error('disk'); };
  const failed = fixture(() => receipt(), store);
  await assert.rejects(failed.service.finishSession(id), { kind: 'storage' }); assert.equal(failed.calls.length, 0);
});

test('failed receipt persistence retains the pending intent and safely retries', async () => {
  const store = storage(); const original = store.set; let writes = 0;
  store.set = async value => { if (++writes === 2) throw new Error('disk'); await original(value); };
  let patches = 0;
  const f = fixture((_path, options) => { if(options.method==='PATCH' && ++patches>1)throw new ApiError('http',409,'session-ended');return receipt(); }, store);
  await assert.rejects(f.service.finishSession(id), { kind:'storage' });
  assert.ok(store.inspect().pendingEnd);
  assert.equal((await f.service.finishSession(id)).sessionId,id);
  assert.equal(store.inspect().pendingEnd,null);
});

test('malformed API receipts never clear the recovery intent or invent rewards', async () => {
  const f = fixture(() => receipt({ result: { volts: 99 } }));
  await assert.rejects(f.service.finishSession(id), { kind:'response' });
  assert.ok(f.store.inspect().pendingEnd);
});

test('account-scoped authorization rejects stale work before and after I/O', async () => {
  let current = true; let calls = 0; let refreshes = 0;
  const underlying = { async request(_path, options) { calls++; assert.equal(options.token,'account-a'); current=false; return {data:{private:true},headers:new Headers()}; } };
  const client=createAuthorizedClient(underlying,{getToken:async()=> 'account-a',isCurrent:()=>current,onUnauthorized:()=>refreshes++});
  await assert.rejects(client.request('/private'),{kind:'session'});
  await assert.rejects(client.request('/private'),{kind:'session'});
  assert.equal(calls,1);assert.equal(refreshes,0);
});

test('401 requests auth recovery; token storage failure never reaches the network', async () => {
  let refreshes=0;let calls=0;
  const inner={async request(){calls++;throw new ApiError('http',401);}};
  const expired=createAuthorizedClient(inner,{getToken:async()=> 'expired',isCurrent:()=>true,onUnauthorized:()=>refreshes++});
  await assert.rejects(expired.request('/private'),{status:401});assert.equal(refreshes,1);
  const broken=createAuthorizedClient(inner,{getToken:async()=>{throw new Error('disk');},isCurrent:()=>true,onUnauthorized:()=>refreshes++});
  await assert.rejects(broken.request('/private'),{kind:'storage'});assert.equal(calls,1);
});
