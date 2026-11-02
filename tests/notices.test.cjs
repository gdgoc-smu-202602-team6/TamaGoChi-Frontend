const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiNoticeService } = require('../.expo/tests/services/api/notice-service.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { createMockNoticeService, MOCK_NOTICE_STORAGE_KEY } = require('../.expo/tests/mocks/notices.js');
const { appendNoticePage, noticeAuthor, noticeDate } = require('../.expo/tests/utils/notice.js');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const clubId = id(1), categoryId = id(2), subcategoryId = id(3), noticeId = id(4);
const notice = { id: noticeId, categoryId, subcategoryId, authorUserId: 'author', title: 'Server notice', body: 'Full text\nSecond line', pinned: true, read: false, createdAt: '2026-11-01T16:00:00Z' };
function fixture(override = () => undefined) {
  const calls = [];
  const service = createApiNoticeService({ async request(path, options = {}) {
    calls.push({ path, options }); const url = new URL(path, 'https://fixture.invalid');
    const special = override(url, options);
    if (special instanceof Error) throw special;
    let data = special;
    if (data === undefined) {
      if (url.pathname === '/clubs/-/members') data = { items: [{ clubId }] };
      else if (url.pathname === `/clubs/${clubId}`) data = { id: clubId, name: 'Joined club', memberCount: 12 };
      else if (url.pathname.endsWith('/noticeCategories')) data = { items: [{ id: categoryId, name: 'A dynamic category', color: 'PURPLE', subcategories: [{ id: subcategoryId, name: 'A dynamic subcategory' }] }] };
      else if (url.pathname.endsWith('/members')) data = { items: [{ clubId, userId: 'author', nickname: 'Author from membership' }] };
      else if (url.searchParams.get('totalSize') === 'true') data = { items: [], totalSize: 9 };
      else if (url.pathname.endsWith('/notices')) data = { items: [notice], nextPageToken: 'next +/?&=' };
      else if (url.pathname.endsWith('/reads/me')) data = undefined;
      else data = notice;
    }
    return { data, headers: new Headers() };
  } });
  return { service, calls };
}
test('joined clubs come only from authenticated memberships, across every page, and duplicate clubs are deduplicated', async () => {
  const f = fixture(url => url.pathname === '/clubs/-/members' ? url.searchParams.has('pageToken') ? { items: [{ clubId }] } : { items: [{ clubId }], nextPageToken: 'membership +' } : undefined);
  assert.deepEqual(await f.service.listMyClubs(), [{ id: clubId, name: 'Joined club', memberCount: 12 }]);
  assert.equal(f.calls.length, 3); assert.ok(f.calls[0].path.includes('userId=me')); assert.ok(f.calls[1].path.includes('pageToken=membership%20%2B'));
});
test('clubs removed during membership discovery are skipped; malformed and failed responses do not become mock clubs', async () => {
  assert.deepEqual(await fixture(url => url.pathname === `/clubs/${clubId}` ? new ApiError('http', 404) : undefined).service.listMyClubs(), []);
  await assert.rejects(fixture(url => url.pathname === `/clubs/${clubId}` ? { id: id(9), name: 'Wrong club', memberCount: 12 } : undefined).service.listMyClubs(), { kind: 'response' });
  await assert.rejects(fixture(() => new ApiError('network')).service.listMyClubs(), { kind: 'network' });
});
test('membership cursor loops are rejected instead of repeating requests forever', async () => {
  const f = fixture(url => url.pathname === '/clubs/-/members' ? { items: [{ clubId }], nextPageToken: 'loop' } : undefined);
  await assert.rejects(f.service.listMyClubs(), { kind: 'response' }); assert.equal(f.calls.length, 2);
});
test('notice board uses dynamic category/subcategory, paged authors, and the global unread-count query', async () => {
  const f = fixture(url => url.pathname.endsWith('/members') ? url.searchParams.has('pageToken') ? { items: [{ clubId, userId: 'second-author', nickname: 'Second author' }] } : { items: [{ clubId, userId: 'author', nickname: 'First author' }], nextPageToken: 'authors-next' } : undefined);
  const board = await f.service.getBoard(clubId, { categoryId, subcategoryId });
  assert.equal(board.categories[0].name, 'A dynamic category'); assert.equal(board.categories[0].subcategories[0].name, 'A dynamic subcategory');
  assert.equal(board.authors['second-author'], 'Second author'); assert.equal(board.unreadCount, 9); assert.equal(board.page.items[0].body, notice.body);
  const urls = f.calls.map(call => new URL(call.path, 'https://fixture.invalid'));
  const count = urls.find(url => url.searchParams.get('totalSize') === 'true');
  assert.equal(count.searchParams.get('read'), 'false'); assert.equal(count.searchParams.get('pageSize'), '0'); assert.equal(count.searchParams.has('categoryId'), false);
  const list = urls.find(url => url.searchParams.get('categoryId') === categoryId);
  assert.equal(list.searchParams.get('subcategoryId'), subcategoryId); assert.equal(list.searchParams.get('pageSize'), '50');
  assert.ok(f.calls.every(call => call.options.method === undefined));
});
test('notice page cursor is encoded and bound to the same category and subcategory filters', async () => {
  const f = fixture(); await f.service.listNotices(clubId, { categoryId, subcategoryId }, 'next +/?&=');
  const url = new URL(f.calls[0].path, 'https://fixture.invalid');
  assert.equal(url.searchParams.get('pageToken'), 'next +/?&='); assert.equal(url.searchParams.get('categoryId'), categoryId); assert.equal(url.searchParams.get('subcategoryId'), subcategoryId);
});
test('detail GET never marks read; idempotent read uses the member-specific PUT without a body', async () => {
  const f = fixture(); assert.deepEqual(await f.service.getNotice(clubId, noticeId), notice);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].options.method, undefined);
  await f.service.markRead(clubId, noticeId); await f.service.markRead(clubId, noticeId);
  assert.deepEqual(f.calls.slice(1), Array(2).fill({ path: `/clubs/${clubId}/notices/${noticeId}/reads/me`, options: { method: 'PUT' } }));
  await assert.rejects(fixture(() => ({ ...notice, id: id(9) })).service.getNotice(clubId, noticeId), { kind: 'response' });
});
test('invalid route IDs never reach the network and subcategory requires a category', async () => {
  const f = fixture(); await assert.rejects(f.service.getNotice('../other', noticeId), { kind: 'response' });
  await assert.rejects(f.service.markRead(clubId, '../other'), { kind: 'response' }); assert.equal(f.calls.length, 0);
  await assert.rejects(f.service.listNotices(clubId, { subcategoryId }, 'next'), { kind: 'response' }); assert.equal(f.calls.length, 0);
});
test('malformed category, notice, author and count data are rejected', async () => {
  for (const change of [{ id: 'local' }, { createdAt: 'bad' }, { read: 'false' }, { body: '' }, { authorUserId: 10 }]) {
    await assert.rejects(fixture(url => url.pathname.endsWith('/notices') && !url.searchParams.has('totalSize') ? { items: [{ ...notice, ...change }] } : undefined).service.getBoard(clubId, {}), { kind: 'response' });
  }
  await assert.rejects(fixture(url => url.pathname.endsWith('/noticeCategories') ? { items: [{ id: categoryId, name: 'Category', color: 'INVALID', subcategories: [] }] } : undefined).service.getBoard(clubId, {}), { kind: 'response' });
  await assert.rejects(fixture(url => url.pathname.endsWith('/members') ? { items: [{ clubId: id(9), userId: 'author', nickname: 'Wrong club' }] } : undefined).service.getBoard(clubId, {}), { kind: 'response' });
  await assert.rejects(fixture(url => url.searchParams.has('totalSize') ? { items: [], totalSize: -1 } : undefined).service.getUnreadCount(clubId), { kind: 'response' });
});
test('unread and detail failures propagate so UI can preserve NEW and retry', async () => {
  await assert.rejects(fixture(() => new ApiError('network')).service.markRead(clubId, noticeId), { kind: 'network' });
  await assert.rejects(fixture(() => new ApiError('http', 404)).service.getNotice(clubId, noticeId), { status: 404 });
});
test('ordinary Korean notice dates do not use the 04:00 study-day shift and author fallbacks stay distinct', () => {
  assert.equal(noticeDate(notice.createdAt), '2026.11.02');
  assert.equal(noticeAuthor({ ...notice, authorUserId: null }, {}), '탈퇴한 사용자');
  assert.equal(noticeAuthor({ ...notice, authorUserId: 'constructor' }, {}), '작성자 정보 없음');
  assert.equal(noticeAuthor(notice, { author: 'Known author' }), 'Known author');
});
test('cursor overlap retains already-confirmed read state and does not duplicate a notice', () => {
  assert.deepEqual(appendNoticePage([{ ...notice, read: true }], [notice, { ...notice, id: id(5) }]), [{ ...notice, read: true }, { ...notice, id: id(5) }]);
});
function mockFixture() {
  let raw = null, fail = false, writes = 0;
  const store = { async getItem() { return raw; }, async setItem(key, value) { assert.equal(key, MOCK_NOTICE_STORAGE_KEY); if (fail) throw new Error('disk'); raw = value; writes++; } };
  return { service: createMockNoticeService(store), reopen: () => createMockNoticeService(store), raw: () => raw, setRaw: value => { raw = value; }, fail: value => { fail = value; }, writes: () => writes };
}
test('mock read state persists, is idempotent, and remains independent between clubs', async () => {
  const f = mockFixture(), [first, second] = await f.service.listMyClubs(), board = await f.service.getBoard(first.id, {});
  assert.equal(board.unreadCount, 3); await Promise.all([f.service.markRead(first.id, board.page.items[0].id), f.service.markRead(first.id, board.page.items[0].id)]);
  assert.equal(f.writes(), 1); assert.equal(await f.reopen().getUnreadCount(first.id), 2); assert.equal(await f.service.getUnreadCount(second.id), 3);
  const filtered = await f.service.getBoard(first.id, { categoryId: 'mock-study', subcategoryId: 'mock-reading' }); assert.equal(filtered.page.items.length, 1);
});
test('mock read failure leaves NEW unchanged and damaged records are never erased', async () => {
  const f = mockFixture(), [club] = await f.service.listMyClubs(), board = await f.service.getBoard(club.id, {}); f.fail(true);
  await assert.rejects(f.service.markRead(club.id, board.page.items[0].id)); assert.equal(await f.service.getUnreadCount(club.id), 3); assert.equal(f.raw(), null);
  f.fail(false); f.setRaw('{bad'); await assert.rejects(f.reopen().getBoard(club.id, {})); assert.equal(f.raw(), '{bad');
});
