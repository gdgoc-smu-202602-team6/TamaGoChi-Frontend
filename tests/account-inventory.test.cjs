const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAuthService } = require('../.expo/tests/services/api/auth-service.js');
const { createHttpClient } = require('../.expo/tests/services/api/http-client.js');
const { accountLocalDataKeys } = require('../.expo/tests/services/account-local-data.js');
const { profileInventory } = require('../.expo/tests/utils/profile-inventory.js');
const { createMockStudyBackend } = require('../.expo/tests/mocks/study-backend.js');

const user = { id: 'account-a', email: 'a@example.com', nickname: '모리' }, identity = { userId: user.id, token: 'session-a' };
const json = (body, status = 200) => status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status });
function fixture() {
  let token = identity.token, mode = 'ok', deleted = false, failToken = false, failData = false;
  const calls = [], cleanups = [], store = { get: async () => token, set: async next => { token = next; }, remove: async () => { if (failToken) throw new Error('disk'); token = null; } };
  const client = createHttpClient({ baseUrl: 'https://api.example.com', fetcher: async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'DELETE') {
      if (mode === 'last-manager') return json({ type: '/problems/last-manager' }, 409);
      if (mode === 'unapplied') throw new TypeError('lost request');
      if (mode === 'bad-success') return json({}, 200);
      deleted = true;
      if (mode === 'lost') throw new TypeError('lost reply');
      return json(null, 204);
    }
    if (mode === 'read-error') throw new TypeError('offline');
    if (deleted || mode === 'expired') return json({}, 401);
    return json(mode === 'different-user' ? { ...user, id: 'account-b' } : user);
  } });
  const service = createAuthService(client, store, async id => { cleanups.push(id); if (failData) throw new Error('cleanup'); });
  return { service, calls, cleanups, token: () => token, setToken: value => { token = value; }, mode: value => { mode = value; }, failToken: value => { failToken = value; }, failData: value => { failData = value; }, writes: () => calls.filter(call => call.method === 'DELETE') };
}
test('account deletion checks the fixed session/account, sends one bodyless DELETE, and clears only confirmed data', async () => {
  const f = fixture(); await Promise.all([f.service.deleteAccount(identity), f.service.deleteAccount(identity)]);
  assert.equal(f.writes().length, 1); assert.equal(f.writes()[0].url, 'https://api.example.com/users/me');
  assert.equal(f.writes()[0].headers.get('authorization'), 'Bearer session-a'); assert.equal(f.writes()[0].body, undefined);
  assert.equal(f.token(), null); assert.deepEqual(f.cleanups, [user.id]); assert.equal(await f.service.restore(), null);
  assert.deepEqual(await f.service.checkAccountDeletion(identity), { status: 'deleted' });
});
test('last-manager preserves session/data and requires a fresh explicit delete after management changes', async () => {
  const f = fixture(); f.mode('last-manager'); await assert.rejects(f.service.deleteAccount(identity), { status: 409, code: 'last-manager' });
  assert.equal(f.token(), identity.token); assert.deepEqual(f.cleanups, []); f.mode('ok'); await f.service.deleteAccount(identity); assert.equal(f.writes().length, 2);
});
test('changed tokens and different accounts are rejected before deleting or cleaning anything', async () => {
  for (const mode of ['token', 'different-user']) { const f = fixture(); if (mode === 'token') f.setToken('session-b'); else f.mode(mode);
    await assert.rejects(f.service.deleteAccount(identity), { reason: 'changed' }); assert.equal(f.writes().length, 0); assert.deepEqual(f.cleanups, []);
  }
});
test('a failed preflight never sends DELETE and can be retried after reconnection', async () => {
  const f = fixture(); f.mode('read-error'); await assert.rejects(f.service.deleteAccount(identity), { kind: 'network' }); assert.equal(f.writes().length, 0);
  f.mode('ok'); await f.service.deleteAccount(identity); assert.equal(f.writes().length, 1);
});
test('an unapplied delete locks automatic retries; a GET verifies presence before a new explicit request', async () => {
  const f = fixture(); f.mode('unapplied'); await assert.rejects(f.service.deleteAccount(identity), { reason: 'uncertain' });
  await assert.rejects(f.service.deleteAccount(identity), { reason: 'uncertain' }); assert.equal(f.writes().length, 1); assert.equal(f.token(), identity.token);
  f.mode('read-error'); await assert.rejects(f.service.checkAccountDeletion(identity), { reason: 'uncertain' }); assert.equal(f.writes().length, 1);
  f.mode('ok'); assert.deepEqual(await f.service.checkAccountDeletion(identity), { status: 'present', user });
  await f.service.deleteAccount(identity); assert.equal(f.writes().length, 2);
});
test('lost deletion responses followed by 401 never falsely confirm deletion or clear account caches', async () => {
  const f = fixture(); f.mode('lost'); await assert.rejects(f.service.deleteAccount(identity), { reason: 'uncertain' });
  assert.deepEqual(await f.service.checkAccountDeletion(identity), { status: 'unavailable' }); assert.equal(f.token(), null);
  assert.equal(f.writes().length, 1); assert.deepEqual(f.cleanups, []);
});
test('an expired session without a confirmed deletion is also unavailable, never deleted', async () => {
  const f = fixture(); f.mode('unapplied'); await assert.rejects(f.service.deleteAccount(identity), { reason: 'uncertain' });
  f.mode('expired'); assert.deepEqual(await f.service.checkAccountDeletion(identity), { status: 'unavailable' }); assert.deepEqual(f.cleanups, []);
});
test('a non-contract success response remains uncertain and is not automatically repeated', async () => {
  const f = fixture(); f.mode('bad-success'); await assert.rejects(f.service.deleteAccount(identity), { reason: 'uncertain' });
  assert.equal(f.writes().length, 1); assert.deepEqual(f.cleanups, []); assert.deepEqual(await f.service.checkAccountDeletion(identity), { status: 'present', user });
});
test('confirmed deletion retries only local token/data cleanup, including foreground restore recovery', async () => {
  for (const kind of ['token', 'data']) { const f = fixture(); (kind === 'token' ? f.failToken : f.failData)(true);
    await assert.rejects(f.service.deleteAccount(identity), { reason: 'cleanup' }); assert.equal(f.writes().length, 1);
    await assert.rejects(f.service.restore(), { reason: 'cleanup' }); assert.equal(f.writes().length, 1);
    f.failToken(false); f.failData(false); assert.equal(await f.service.restore(), null);
    assert.deepEqual(await f.service.checkAccountDeletion(identity), { status: 'deleted' }); assert.equal(f.token(), null); assert.equal(f.writes().length, 1);
  }
});
test('a newer stored token cannot be removed by an old cleanup or uncertain result check', async () => {
  for (const kind of ['confirmed', 'uncertain']) { const f = fixture(); if (kind === 'confirmed') f.failData(true); else f.mode('unapplied');
    await assert.rejects(f.service.deleteAccount(identity)); f.setToken('session-b'); f.failData(false); const before = f.cleanups.length;
    await assert.rejects(f.service.checkAccountDeletion(identity), { reason: 'changed' }); assert.equal(f.token(), 'session-b'); assert.equal(f.cleanups.length, before); assert.equal(f.writes().length, 1);
  }
});
test('restores queued behind deletion cannot resurrect a deleted account', async () => {
  const f = fixture(); await Promise.all([f.service.deleteAccount(identity), f.service.restore().then(value => assert.equal(value, null))]); assert.equal(f.writes().length, 1); assert.equal(f.token(), null);
});
test('account local cleanup uses exact account/backend roots and preserves other accounts, Mock and unrelated keys', () => {
  const base = 'https://api.example.com', scope = `${encodeURIComponent(base)}/${encodeURIComponent(user.id)}`;
  const selected = ['api-study','club-selection','club-names','club-create-intent','notice-create-intent','guestbook-intent'].flatMap(name => [`@tamagochi/${name}/v1/${scope}`, `@tamagochi/${name}/v1/${scope}/club-1`]);
  const others = [...selected.map(key => key.replace('/account-a', '/account-ab')), ...selected.map(key => key.replace(encodeURIComponent(base), encodeURIComponent(base + '/other'))), '@tamagochi/mock-study/v1', 'unrelated', '@tamagochi/api-study/v1/'];
  assert.deepEqual(accountLocalDataKeys([...selected, ...others], base, user.id), selected);
});

const item = (id, slot, defaultOwned = false) => ({ id, slot, code: id, category: slot === 'ROOM' ? 'ROOM_SIZE' : slot === 'DESK' ? 'FURNITURE' : 'ACCESSORY', name: id, grade: 'BASIC', price: 0, minLevel: 1, defaultOwned, onSale: true, ...(slot === 'ROOM' ? { roomSize: 3 } : {}) });
function inventory() { const items = [item('room','ROOM',true),item('desk','DESK',true),item('hat','HEAD'),item('hat-other','HEAD'),item('glasses','FACE'),item('scarf','NECK')]; return { items, ownedItemIds: items.map(one => one.id), layout: { equipped: ['room','desk','scarf','hat','glasses'].map(id => ({ itemId: id, slot: items.find(one => one.id === id).slot })), placements: [] }, condition: { hearts: 4, bugs: 0, bugProgressSeconds: 0 } }; }
test('profile counts all unique owned items including defaults and displays only equipped HEAD/FACE/NECK', () => {
  const room = inventory(), before = JSON.stringify(room), result = profileInventory(room); assert.equal(result.ownedCount, 6); assert.deepEqual(result.accessories.map(one => one.id), ['hat','glasses','scarf']); assert.equal(JSON.stringify(room), before);
});
test('profile never counts equipped items instead of ownership or infers an unequipped accessory', () => {
  const room = inventory(); room.layout.equipped = room.layout.equipped.filter(one => one.slot === 'ROOM'); const result = profileInventory(room); assert.equal(result.ownedCount, 6); assert.deepEqual(result.accessories, []);
});
test('inconsistent ownership/catalog/layout fails rather than displaying a fabricated count or avatar', () => {
  for (const mutate of [r => r.ownedItemIds.push('hat'),r => r.ownedItemIds.push('missing'),r => r.ownedItemIds.splice(0,1),r => r.items.push(r.items[0]),r => r.layout.equipped.push({ slot:'HEAD',itemId:'hat-other' }),r => r.layout.equipped[0].itemId='missing',r => r.ownedItemIds=r.ownedItemIds.filter(id=>id!=='hat')]) { const room = inventory(); mutate(room); assert.throws(() => profileInventory(room)); }
});
test('Mock purchases and equipment changes share the same inventory without rewriting study rewards', async () => {
  const records = new Map(); const backend = createMockStudyBackend({ storage: { getItem: async k => records.get(k) ?? null, setItem: async (k,v) => records.set(k,v) }, isOnline: async () => true, initialHome: { profile:{nickname:'모리',bolt:155,level:4,hearts:4},room:{name:'방',characterLabel:'모리'},todayStudySeconds:0,attendance:{studySeconds:0,requiredSeconds:1800,achieved:false},bugs:{count:0,progressSeconds:0,requiredSeconds:3600} } });
  const initial = await backend.getRoom(), before = profileInventory(initial); await backend.purchase('mock-cozy_scarf'); const bought = await backend.getRoom(); assert.equal(profileInventory(bought).ownedCount, before.ownedCount + 1); assert.deepEqual(profileInventory(bought).accessories.map(one=>one.id), ['mock-cozy_scarf']);
  await backend.saveRoom({ ...bought.layout, equipped:bought.layout.equipped.filter(one=>one.slot!=='NECK') }, bought.layout); const result = profileInventory(await backend.getRoom()); assert.equal(result.ownedCount,before.ownedCount+1); assert.deepEqual(result.accessories,[]); assert.equal((await backend.getProfile()).balance,95);
});
