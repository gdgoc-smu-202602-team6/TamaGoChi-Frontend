const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiShopService } = require('../.expo/tests/services/api/shop-service.js');
const { createHttpClient, ApiError } = require('../.expo/tests/services/api/http-client.js');
const { createMockStudyBackend, MOCK_STUDY_STORAGE_KEY } = require('../.expo/tests/mocks/study-backend.js');
const { itemPurchaseState } = require('../.expo/tests/utils/shop.js');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const lamp = { id: id(1), code: 'new-lamp', slot: 'LAMP', category: 'FURNITURE', name: 'New lamp', grade: 'COMMON', price: 37, minLevel: 2, defaultOwned: false };
function apiFixture(change = {}) {
  const calls = [];
  const responses = {
    '/items': { items: [lamp] }, '/users/me/items': { items: [] },
    '/users/me/room': { equipped: [{ slot: 'ROOM', itemId: id(9) }] },
    '/users/me/stats': { volts: 150, level: 4, todaySeconds: 0, todayAttended: false }, ...change,
  };
  const service = createApiShopService({ async request(path, options) {
    calls.push({ path, options });
    const data = responses[path]; if (data instanceof Error) throw data;
    return { data, headers: new Headers() };
  } });
  return { service, calls, responses };
}
test('shop reads catalog prices and state from all four authenticated resources', async () => {
  const f = apiFixture(); const shop = await f.service.getShop();
  assert.equal(shop.items[0].price, 37); assert.equal(shop.level, 4); assert.equal(shop.balance, 150);
  assert.deepEqual(shop.ownedItemIds, []); assert.deepEqual(shop.equippedItemIds, [id(9)]);
  assert.equal(f.calls.length, 4);
});
test('purchase sends only the item ID with PUT and accepts repeated owned receipts', async () => {
  const f = apiFixture({ [`/users/me/items/${id(1)}`]: { itemId: id(1), pricePaid: 37 } });
  await f.service.purchase(id(1)); await f.service.purchase(id(1));
  assert.deepEqual(f.calls, Array(2).fill({ path: `/users/me/items/${id(1)}`, options: { method: 'PUT' } }));
  await assert.rejects(f.service.purchase('bad/path'), { reason: 'not-found' });
  assert.equal(f.calls.length, 2);
});
test('purchase rejects a mismatched receipt instead of claiming ownership', async () => {
  const f = apiFixture({ [`/users/me/items/${id(1)}`]: { itemId: id(2), pricePaid: 37 } });
  await assert.rejects(f.service.purchase(id(1)), { kind: 'response' });
});
test('HTTP Problem Details retain only safe numeric shop fields and map 409 conflicts', async () => {
  for (const [code, reason, detail, key] of [['level-locked', 'level-locked', 10, 'requiredLevel'], ['insufficient-volts', 'insufficient-volts', 42, 'shortBy']]) {
    const client = createHttpClient({ baseUrl: 'https://fixture.invalid', fetcher: async () => new Response(JSON.stringify({ type: `https://fixture.invalid/problems/${code}`, title: 'Conflict', status: 409, [key]: detail, secret: 'never-copy' }), { status: 409 }) });
    await assert.rejects(createApiShopService(client).purchase(id(1)), error => error.reason === reason && error.detail === detail && !JSON.stringify(error).includes('never-copy'));
  }
  const client = createHttpClient({ baseUrl: 'https://fixture.invalid', fetcher: async () => new Response(JSON.stringify({ type: '/problems/insufficient-volts', shortBy: -1, requiredLevel: '10' }), { status: 409 }) });
  await assert.rejects(client.request('/test'), error => error.details.shortBy === undefined && error.details.requiredLevel === undefined);
});
test('catalog validates category/slot, money, UUID, room size and duplicate IDs without mock fallback', async () => {
  for (const change of [{ price: -1 }, { price: 1.5 }, { slot: 'UNKNOWN' }, { category: 'ACCESSORY' }, { id: 'local' }, { minLevel: 0 }, { grade: 'LEGENDARY' }, { slot: 'ROOM', category: 'ROOM_SIZE' }]) {
    await assert.rejects(apiFixture({ '/items': { items: [{ ...lamp, ...change }] } }).service.getShop(), { kind: 'response' });
  }
  await assert.rejects(apiFixture({ '/items': { items: [lamp, lamp] } }).service.getShop(), { kind: 'response' });
  await assert.rejects(apiFixture({ '/items': new ApiError('network') }).service.getShop(), { kind: 'network' });
  await assert.rejects(apiFixture({ '/users/me/items': { items: [{ itemId: id(1), pricePaid: -1 }] } }).service.getShop(), { kind: 'response' });
  await assert.rejects(apiFixture({ '/users/me/room': { equipped: [{ slot: 'LAMP', itemId: id(1) }, { slot: 'LAMP', itemId: id(2) }] } }).service.getShop(), { kind: 'response' });
});
test('empty catalogs and zero-price items remain valid server data', async () => {
  assert.deepEqual((await apiFixture({ '/items': { items: [] } }).service.getShop()).items, []);
  assert.equal((await apiFixture({ '/items': { items: [{ ...lamp, price: 0 }] } }).service.getShop()).items[0].price, 0);
});
test('purchase state prioritizes equipped/owned before level or balance and never makes unlocked items free', () => {
  const shop = { level: 1, balance: 0, ownedItemIds: [], equippedItemIds: [] };
  assert.equal(itemPurchaseState(lamp, shop), 'locked');
  assert.equal(itemPurchaseState(lamp, { ...shop, ownedItemIds: [lamp.id] }), 'owned');
  assert.equal(itemPurchaseState(lamp, { ...shop, ownedItemIds: [lamp.id], equippedItemIds: [lamp.id] }), 'equipped');
  assert.equal(itemPurchaseState(lamp, { ...shop, level: 10 }), 'unaffordable');
  assert.equal(itemPurchaseState(lamp, { ...shop, level: 10, balance: lamp.price }), 'available');
});

function mockFixture({ level = 10, balance = 500 } = {}) {
  let raw = null, fail = false, time = Date.parse('2026-11-02T03:00:00Z');
  const storage = { async getItem() { return raw; }, async setItem(key, value) { assert.equal(key, MOCK_STUDY_STORAGE_KEY); if (fail) throw new Error('disk'); raw = value; } };
  const home = { profile: { nickname: 'Shop', bolt: balance, level, hearts: 4 }, room: { name: 'Room', characterLabel: 'Cat' }, todayStudySeconds: 0, attendance: { studySeconds: 0, requiredSeconds: 1800, achieved: false }, bugs: { count: 3, progressSeconds: 0, requiredSeconds: 3600 } };
  const options = { storage, initialHome: home, isOnline: async () => true, now: () => time, createId: () => 'session' };
  return { backend: createMockStudyBackend(options), reopen: () => createMockStudyBackend(options), raw: () => raw, setRaw: v => { raw = v; }, fail: v => { fail = v; }, advance: ms => { time += ms; } };
}
test('mock purchases share the study ledger and persist atomically across reload', async () => {
  const f = mockFixture(); const session = await f.backend.startSession(); f.advance(120000);
  await Promise.all([f.backend.purchase('mock-cozy_scarf'), f.backend.purchase('mock-green_plant'), f.backend.finishSession(session.id)]);
  const shop = await f.reopen().getShop();
  assert.equal(shop.balance, 402); assert.equal((await f.backend.getHome()).profile.bolt, 402);
  assert.ok(shop.ownedItemIds.includes('mock-cozy_scarf')); assert.ok(shop.equippedItemIds.includes('mock-green_plant'));
  assert.equal((await f.backend.getResult(session.id)).bolt, 2);
});
test('concurrent duplicate purchases charge once; owned requests do not re-equip', async () => {
  const f = mockFixture();
  await Promise.all([f.backend.purchase('mock-mint_stripe_wallpaper'), f.backend.purchase('mock-mint_stripe_wallpaper')]);
  assert.equal((await f.backend.getShop()).balance, 450);
  await f.backend.purchase('mock-strawberry_dot_wallpaper');
  await f.backend.purchase('mock-mint_stripe_wallpaper');
  const shop = await f.backend.getShop(); assert.equal(shop.balance, 400);
  assert.ok(shop.equippedItemIds.includes('mock-strawberry_dot_wallpaper'));
  assert.ok(!shop.equippedItemIds.includes('mock-mint_stripe_wallpaper'));
  assert.ok(shop.ownedItemIds.includes('mock-grubby_wall')); assert.ok(shop.equippedItemIds.includes('mock-shabby_gosiwon'));
});
test('mock rejects locked, insufficient and unknown purchases without changing persisted data', async () => {
  const f = mockFixture({ level: 4, balance: 10 }); await f.backend.getShop(); const before = f.raw();
  await assert.rejects(f.backend.purchase('mock-pompom_beanie'), { reason: 'level-locked', detail: 5 });
  await assert.rejects(f.backend.purchase('mock-cozy_scarf'), { reason: 'insufficient-volts', detail: 50 });
  await assert.rejects(f.backend.purchase('unknown'), { reason: 'not-found' });
  assert.equal(f.raw(), before);
  await f.backend.purchase('mock-basic_clock'); assert.equal(f.raw(), before);
});
test('mock purchase save failure preserves both balance and ownership for retry', async () => {
  const f = mockFixture(); await f.backend.getShop(); const before = f.raw(); f.fail(true);
  await assert.rejects(f.backend.purchase('mock-cozy_scarf'), { reason: 'storage' }); assert.equal(f.raw(), before);
  f.fail(false); await f.backend.purchase('mock-cozy_scarf'); assert.equal((await f.backend.getShop()).balance, 440);
});
test('existing version-1 study records gain default ownership without reset; corrupt shop records are preserved', async () => {
  const f = mockFixture(); const session = await f.backend.startSession(); f.advance(60000); await f.backend.finishSession(session.id);
  const before = f.raw(); assert.equal(JSON.parse(before).shop, undefined);
  assert.ok((await f.backend.getShop()).ownedItemIds.includes('mock-shabby_gosiwon')); assert.equal(f.raw(), before);
  await f.backend.purchase('mock-cozy_scarf'); assert.equal((await f.backend.getResult(session.id)).bolt, 1);
  const corrupt = JSON.stringify({ ...JSON.parse(f.raw()), shop: { ownedItemIds: [], equipped: { HEAD: 'not-owned' } } });
  f.setRaw(corrupt); await assert.rejects(f.backend.getShop(), { code: 'invalid-record' }); assert.equal(f.raw(), corrupt);
});
