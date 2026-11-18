const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiRoomService } = require('../.expo/tests/services/api/room-service.js');
const { parseShopCatalog } = require('../.expo/tests/services/api/shop-service.js');
const { mockShopItems } = require('../.expo/tests/mocks/shop.js');
const { createMockStudyBackend, MOCK_STUDY_STORAGE_KEY } = require('../.expo/tests/mocks/study-backend.js');
const { availableTargets, changeRoomEquipment, effectivePlacement, moveRoomTarget, roomAppearance, sameRoomLayout, validateRoomLayout } = require('../.expo/tests/utils/room-layout.js');
const { dragOnSurface, fitSurfacePlacements, surfacePolicy, surfaceToScene, surfacePlacementToScene } = require('../.expo/tests/utils/room-surfaces.js');
const clone = value => structuredClone(value);
const catalog = mockShopItems.map((item, i) => ({ ...item, id: `${String(i + 1).padStart(8, '0')}-1111-4111-8111-111111111111` }));
const bySlot = slot => catalog.find(item => item.slot === slot);
const owned = catalog.map(item => item.id);
const baseline = { wallHeight: 3, equipped: catalog.filter(item => item.defaultOwned).map(item => ({ slot: item.slot, itemId: item.id })), placements: [
  { target: 'CLOCK', surface: 'RIGHT_WALL', x: 1, y: 1.5 }, { target: 'WINDOW', surface: 'LEFT_WALL', x: .5, y: .5 },
  { target: 'DESK', surface: 'FLOOR', x: 1, y: 0 }, { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1.5 },
] };
function fixture() {
  const state = { room: { ...clone(baseline), userId: 'user-a', condition: { hearts: 4, bugs: 0, bugProgressSeconds: 0 } }, catalog: clone(catalog) }, calls = [];
  const client = { async request(path, options = {}) {
    calls.push({ path, ...options });
    if (path === '/items') return { data: { items: state.catalog } };
    if (path === '/users/me/items') return { data: { items: owned.map(itemId => ({ itemId, pricePaid: 0 })) } };
    assert.equal(path, '/users/me/room');
    if (options.method === 'PATCH') Object.assign(state.room, clone(options.body));
    return { data: clone(state.room) };
  } };
  return { state, calls, service: createApiRoomService(client, 'user-a') };
}
test('surface API reads wall height, catalog policies and wall positions into the shared appearance', async () => {
  const { service } = fixture(), room = await service.getRoom(), appearance = roomAppearance(room);
  assert.deepEqual(room.layout, baseline); assert.equal(appearance.wallHeight, 3);
  assert.deepEqual(new Set(availableTargets(room.layout, room.items)), new Set(['CHARACTER', 'CLOCK', 'WINDOW', 'DESK']));
});
test('surface API PATCH includes surfaces and excludes read-only height, condition and guestbook data', async () => {
  const f = fixture(), draft = moveRoomTarget(baseline, 'CLOCK', 1.5, 2, catalog, 'RIGHT_WALL');
  const result = await f.service.saveRoom(draft, baseline), writes = f.calls.filter(one => one.method === 'PATCH');
  assert.equal(writes.length, 1); assert.deepEqual(Object.keys(writes[0].body).sort(), ['equipped', 'placements']);
  assert.ok(writes[0].body.placements.every(one => typeof one.surface === 'string')); assert.ok(sameRoomLayout(result.layout, draft));
});
test('surface identity participates in dirty/concurrent-change detection', async () => {
  const f = fixture(), draft = { ...baseline, placements: baseline.placements.map(one => one.target === 'CLOCK' ? { ...one, surface: 'LEFT_WALL' } : one.target === 'WINDOW' ? { ...one, surface: 'RIGHT_WALL' } : one) };
  assert.equal(sameRoomLayout(draft, baseline), false);
  f.state.room.placements[0].x = 2;
  await assert.rejects(f.service.saveRoom(draft, baseline), { reason: 'changed' }); assert.equal(f.calls.some(one => one.method === 'PATCH'), false);
});
test('malformed policies, missing surfaces, invalid height and legacy/new hybrids cannot be saved', async () => {
  const mutations = [s => delete s.room.placements[0].surface, s => s.room.placements[0].surface = 'CEILING', s => s.room.wallHeight = 4,
    s => delete s.room.wallHeight, s => s.catalog[0].placementPolicy = null, s => s.catalog[0].placementPolicy.width = 0,
    s => s.catalog[0].placementPolicy.width = .5, s => s.catalog[0].placementPolicy.step = 0,
    s => s.catalog[0].placementPolicy.solid = 'true', s => delete s.catalog[0].placementPolicy];
  for (const mutate of mutations) { const f = fixture(); mutate(f.state); await assert.rejects(f.service.getRoom(), { kind: 'response' }); }
  assert.equal(parseShopCatalog({ items: catalog }).length, catalog.length);
});
test('wall and floor bounds include item size and use the item step, not a slot hardcode', () => {
  const moved = moveRoomTarget(baseline, 'WINDOW', 100, 100, catalog, 'LEFT_WALL').placements.find(one => one.target === 'WINDOW');
  assert.deepEqual(moved, { target: 'WINDOW', surface: 'LEFT_WALL', x: 1, y: 1 });
  const changed = catalog.map(item => item.slot === 'CLOCK' ? { ...item, placementPolicy: { ...item.placementPolicy, step: .25 } } : item);
  assert.equal(moveRoomTarget(baseline, 'CLOCK', .37, 1.6, changed, 'RIGHT_WALL').placements.find(one => one.target === 'CLOCK').x, .25);
  for (const point of [{ target: 'CLOCK', surface: 'RIGHT_WALL', x: .25, y: 1 }, { target: 'WINDOW', surface: 'FLOOR', x: 0, y: 0 }, { target: 'WINDOW', surface: 'LEFT_WALL', x: 1.5, y: 0 }]) {
    assert.throws(() => validateRoomLayout({ ...baseline, placements: [point] }, catalog, owned), { reason: 'invalid' });
  }
});
test('solid items refuse overlaps only on the same surface; touching edges and a rug remain allowed', () => {
  const clock = { target: 'CLOCK', surface: 'LEFT_WALL', x: .5, y: .5 };
  assert.throws(() => validateRoomLayout({ ...baseline, placements: [clock, baseline.placements[1]] }, catalog, owned), { reason: 'invalid' });
  validateRoomLayout({ ...baseline, placements: [{ ...clock, x: 0, y: 0 }, { target: 'WINDOW', surface: 'LEFT_WALL', x: 1, y: 0 }] }, catalog, owned);
  const rug = bySlot('RUG'), withRug = { ...baseline, equipped: [...baseline.equipped, { slot: 'RUG', itemId: rug.id }], placements: [...baseline.placements, { target: 'RUG', surface: 'FLOOR', x: 1, y: 1 }] };
  validateRoomLayout(withRug, catalog, owned);
});
test('unplaced/non-policy equipment cannot be dragged and duplicate targets across walls are rejected', () => {
  const beanie = bySlot('HEAD'), layout = { ...baseline, equipped: [...baseline.equipped, { slot: 'HEAD', itemId: beanie.id }] };
  assert.equal(availableTargets(layout, catalog).includes('HEAD'), false);
  assert.throws(() => moveRoomTarget(layout, 'HEAD', 0, 0, catalog), { reason: 'invalid' });
  assert.throws(() => validateRoomLayout({ ...baseline, placements: [baseline.placements[0], { ...baseline.placements[0], surface: 'LEFT_WALL' }] }, catalog, owned), { reason: 'invalid' });
});
test('resizing scales wall horizontal positions, keeps wall height positions and fits floor footprints', () => {
  const bigger = catalog.find(item => item.roomSize === 6), large = changeRoomEquipment(baseline, bigger, catalog, owned);
  assert.deepEqual(large.placements.find(one => one.target === 'CLOCK'), { target: 'CLOCK', surface: 'RIGHT_WALL', x: 2, y: 1.5 });
  assert.deepEqual(large.placements.find(one => one.target === 'WINDOW'), { target: 'WINDOW', surface: 'LEFT_WALL', x: 1, y: .5 });
  validateRoomLayout(large, catalog, owned);
  const small = changeRoomEquipment(large, bySlot('ROOM'), catalog, owned); assert.ok(sameRoomLayout(small, baseline));
});
test('fitting removes only invalid/colliding placements in server target order and detaching removes that slot', () => {
  const conflicting = { ...baseline, placements: [{ target: 'WINDOW', surface: 'LEFT_WALL', x: 0, y: 0 }, { target: 'CLOCK', surface: 'LEFT_WALL', x: 0, y: 0 }] };
  assert.deepEqual(fitSurfacePlacements(conflicting, catalog, 3, 3).map(one => one.target), ['CLOCK']);
  const detached = changeRoomEquipment(baseline, bySlot('CLOCK'), catalog, owned);
  assert.equal(detached.placements.some(one => one.target === 'CLOCK'), false); assert.equal(detached.wallHeight, 3);
});
test('wall projection respects both axes and dragging round-trips without a first-touch jump', () => {
  assert.deepEqual(surfaceToScene('LEFT_WALL', 3, 3, 3, 3), { x: 65, y: 100 });
  assert.deepEqual(surfaceToScene('RIGHT_WALL', 3, 0, 3, 3), { x: 415, y: 340 });
  for (const point of baseline.placements) {
    const policy = surfacePolicy(baseline, point.target, catalog), moved = dragOnSurface(point, policy, 0, 0, 390, 3, 3);
    assert.ok(Math.abs(moved.x - point.x) < 1e-6); assert.ok(Math.abs(moved.y - point.y) < 1e-6); assert.equal(moved.surface, point.surface);
  }
});
test('a wall object can cross the corner, stays on a wall and clamps fully inside it', () => {
  const start = baseline.placements[0], policy = surfacePolicy(baseline, 'CLOCK', catalog);
  const moved = dragOnSurface(start, policy, -180, 0, 480, 3, 3);
  assert.equal(moved.surface, 'LEFT_WALL'); validateRoomLayout({ ...baseline, placements: [moved] }, catalog, owned);
  assert.ok(Number.isFinite(surfacePlacementToScene(moved, policy, 3, 3).y));
  assert.deepEqual(dragOnSurface(start, policy, NaN, 0, 390, 3, 3), start);
});
test('surface defaults fit their policy and reset clears positions without losing the contract', () => {
  const reset = { ...baseline, placements: [] };
  for (const target of availableTargets(reset, catalog)) validateRoomLayout({ ...reset, placements: [effectivePlacement(reset, target, 3, catalog)] }, catalog, owned);
  assert.equal(reset.wallHeight, 3); assert.equal(sameRoomLayout(reset, { equipped: reset.equipped, placements: [] }), false);
});
function mockFixture() {
  let raw = null; const storage = { async getItem() { return raw; }, async setItem(_key, value) { raw = value; } };
  const home = { profile: { nickname: '모리', bolt: 500, level: 10, hearts: 4 }, room: { name: '방', characterLabel: '모리' }, todayStudySeconds: 0, attendance: { studySeconds: 0, requiredSeconds: 1800, achieved: false }, bugs: { count: 0, progressSeconds: 0, requiredSeconds: 3600 } };
  const options = { storage, initialHome: home, isOnline: async () => true, now: () => Date.parse('2026-11-04T05:00:00Z'), createId: () => 'surface-study' };
  return { read: () => raw, write: value => { raw = value; }, legacy: () => createMockStudyBackend(options), current: () => createMockStudyBackend({ ...options, surfacePlacement: true }) };
}
test('Mock wall placement persists and preserves active study, rewards and ownership through reopening', async () => {
  const f = mockFixture(), backend = f.current(); await backend.startSession();
  const before = JSON.parse(f.read()), room = await backend.getRoom();
  const draft = moveRoomTarget(room.layout, 'CLOCK', 0, 2, room.items, 'RIGHT_WALL');
  await backend.saveRoom(draft, room.layout); const after = JSON.parse(f.read());
  assert.equal(after.roomPlacementVersion, 2); assert.deepEqual(after.active, before.active); assert.equal(after.bolt, before.bolt); assert.deepEqual(after.results, before.results);
  assert.ok(sameRoomLayout((await f.current().getRoom()).layout, draft)); assert.equal((await f.current().getHome()).room.appearance.wallHeight, 3);
});
test('legacy Mock placement migration is read-only until explicit save and preserves unrelated records', async () => {
  const f = mockFixture(), old = f.legacy(); await old.startSession(); const room = await old.getRoom();
  await old.saveRoom(moveRoomTarget(room.layout, 'CHARACTER', 2.8, 2.8, room.items), room.layout);
  const raw = f.read(), current = await f.current().getRoom();
  assert.equal(f.read(), raw); assert.equal(current.layout.wallHeight, 3); validateRoomLayout(current.layout, current.items, current.ownedItemIds);
  const moved = moveRoomTarget(current.layout, 'CLOCK', 0, 2, current.items, 'RIGHT_WALL'); await f.current().saveRoom(moved, current.layout);
  assert.deepEqual(JSON.parse(f.read()).active, JSON.parse(raw).active); assert.equal(MOCK_STUDY_STORAGE_KEY, '@tamagochi/mock-study/v1');
});
test('corrupt legacy Mock placement is reported rather than silently fitted or erased during migration', async () => {
  const f = mockFixture(); await f.legacy().startSession(); const bad = JSON.parse(f.read()); bad.placements = [{ target: 'DESK', x: .25, y: 0 }]; f.write(JSON.stringify(bad));
  const raw = f.read(); await assert.rejects(f.current().getRoom(), { code: 'invalid-record' }); assert.equal(f.read(), raw);
});

test('API 0.2.0 characters are a required slot that can be swapped but never taken off', async () => {
  const robot = catalog.find(item => item.code === 'robot'), fox = catalog.find(item => item.code === 'fox');
  assert.equal(robot.category, 'CHARACTER'); assert.equal(robot.defaultOwned, true);
  assert.ok(baseline.equipped.some(one => one.slot === 'CHARACTER' && one.itemId === robot.id));
  assert.throws(() => validateRoomLayout({ ...baseline, equipped: baseline.equipped.filter(one => one.slot !== 'CHARACTER') }, catalog, owned), { reason: 'invalid' });
  assert.equal(changeRoomEquipment(baseline, robot, catalog, owned), baseline);
  const swapped = changeRoomEquipment(baseline, fox, catalog, owned);
  assert.deepEqual(swapped.equipped.filter(one => one.slot === 'CHARACTER'), [{ slot: 'CHARACTER', itemId: fox.id }]);
  assert.deepEqual(swapped.placements.find(one => one.target === 'CHARACTER'), baseline.placements.find(one => one.target === 'CHARACTER'));
  // The character policy comes from the catalog and the character is listed once.
  assert.deepEqual(surfacePolicy(baseline, 'CHARACTER', catalog), { surfaceKind: 'FLOOR', width: 1, height: 1, solid: true });
  assert.equal(availableTargets(baseline, catalog).filter(target => target === 'CHARACTER').length, 1);
  // Saves always carry ROOM and CHARACTER.
  const { service, calls } = fixture(), room = await service.getRoom();
  await service.saveRoom(changeRoomEquipment(room.layout, fox, room.items, room.ownedItemIds), room.layout);
  const body = calls.find(call => call.method === 'PATCH').body;
  assert.ok(body.equipped.some(one => one.slot === 'ROOM')); assert.ok(body.equipped.some(one => one.slot === 'CHARACTER' && one.itemId === fox.id));
});
test('room tiers follow the 0.2.0 seed and solid characters cannot overlap solid furniture', () => {
  assert.deepEqual(catalog.filter(item => item.slot === 'ROOM').map(item => [item.code, item.roomSize]), [['shabby_gosiwon', 3], ['cozy_one_room', 4], ['spacious_two_room', 5], ['dream_mansion', 6]]);
  const desk = baseline.placements.find(one => one.target === 'DESK');
  assert.throws(() => validateRoomLayout({ ...baseline, placements: [...baseline.placements.filter(one => one.target !== 'CHARACTER'), { target: 'CHARACTER', surface: 'FLOOR', x: desk.x, y: desk.y }] }, catalog, owned), { reason: 'invalid' });
  // Touching edges is not an overlap.
  validateRoomLayout({ ...baseline, placements: [...baseline.placements.filter(one => one.target !== 'CHARACTER'), { target: 'CHARACTER', surface: 'FLOOR', x: desk.x, y: desk.y + 1 }] }, catalog, owned);
});
test('designer rooms with lower walls map wall cells to their drawn height', () => {
  assert.equal(surfaceToScene('LEFT_WALL', 0, 3, 3, 3).y, 250 - 240);
  assert.equal(surfaceToScene('LEFT_WALL', 0, 3, 3, 3, 150).y, 250 - 150);
  const policy = surfacePolicy(baseline, 'CLOCK', catalog), start = baseline.placements.find(one => one.target === 'CLOCK');
  assert.deepEqual(dragOnSurface(start, policy, 0, 0, 480, 3, 3, 150), start);
});
test('Mock records from before characters gain the default robot, and placements outside a shrunk room are left out', async () => {
  const f = mockFixture(), backend = f.current(), room = await backend.getRoom();
  await backend.saveRoom(moveRoomTarget(room.layout, 'CLOCK', 0, 2, room.items, 'RIGHT_WALL'), room.layout);
  const old = JSON.parse(f.read()), robot = mockShopItems.find(item => item.code === 'robot');
  old.shop.ownedItemIds = old.shop.ownedItemIds.filter(id => id !== robot.id); delete old.shop.equipped.CHARACTER;
  old.placements = old.placements.filter(one => one.target !== 'CHARACTER'); f.write(JSON.stringify(old));
  const migrated = await f.current().getRoom();
  assert.ok(migrated.ownedItemIds.includes(robot.id)); assert.ok(migrated.layout.equipped.some(one => one.slot === 'CHARACTER' && one.itemId === robot.id));
  const shrunk = JSON.parse(f.read()), twoRoom = mockShopItems.find(item => item.code === 'spacious_two_room');
  shrunk.shop.ownedItemIds.push(twoRoom.id); shrunk.shop.equipped.ROOM = twoRoom.id;
  // Saved on the old 6×6 two-room: the desk still fits 5×5, the clock at x 4.5 no longer does.
  shrunk.placements = [{ target: 'DESK', surface: 'FLOOR', x: 3, y: 0 }, { target: 'CLOCK', surface: 'RIGHT_WALL', x: 4.5, y: 0 }]; f.write(JSON.stringify(shrunk));
  assert.deepEqual((await f.current().getRoom()).layout.placements, [{ target: 'DESK', surface: 'FLOOR', x: 3, y: 0 }]);
});
