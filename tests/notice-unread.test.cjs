const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createNoticeUnreadTracker } = require('../.expo/tests/services/notice-unread-tracker.js');
const { unreadBadge, unreadDescription } = require('../.expo/tests/utils/notice-unread.js');
const { createApiNoticeService } = require('../.expo/tests/services/api/notice-service.js');
const { createMockNoticeService } = require('../.expo/tests/mocks/notices.js');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const entry = (tracker,id) => tracker.getSnapshot().entries[id];

test('badge hides unknown/zero/invalid counts, caps visual text and preserves exact accessible counts', () => {
  for (const count of [null,undefined,0,-1,1.2,NaN,Infinity,'3']) assert.equal(unreadBadge(count),undefined);
  assert.equal(unreadBadge(1),'1'); assert.equal(unreadBadge(99),'99'); assert.equal(unreadBadge(100),'99+');
  assert.equal(unreadDescription('모임',125),'모임, 안 읽은 공지 125개'); assert.equal(unreadDescription('모임',0),'모임, 안 읽은 공지 0개'); assert.equal(unreadDescription('모임',null),'모임, 읽지 않은 수 확인 필요');
});
test('counts stay separate by club and a verified zero differs from an unknown value', async () => {
  const tracker=createNoticeUnreadTracker(async id=>id==='a'?7:0), scope={}; tracker.setScope(scope,['a','b']); assert.equal(entry(tracker,'a').count,null); await tracker.refreshAll();
  assert.equal(tracker.getSnapshot().scope,scope); assert.deepEqual(entry(tracker,'a'),{status:'ready',count:7}); assert.deepEqual(entry(tracker,'b'),{status:'ready',count:0});
});
test('invalid values and per-club read failures do not erase successful counts or become zero', async () => {
  for(const value of [-1,NaN,Infinity,2.3,'3']){const tracker=createNoticeUnreadTracker(async id=>id==='a'?4:value);tracker.setScope({},['a','b']);await tracker.refreshAll();assert.equal(entry(tracker,'a').count,4);assert.deepEqual(entry(tracker,'b'),{status:'error',count:null});}
  const tracker=createNoticeUnreadTracker(async()=>{throw new Error('offline');});tracker.setScope({},['a']);await tracker.refresh('a');assert.deepEqual(entry(tracker,'a'),{status:'error',count:null});
});
test('concurrent refreshes of the same club share one read without blocking another club', async () => {
  const slow=deferred(),calls=[];const tracker=createNoticeUnreadTracker(id=>{calls.push(id);return id==='a'?slow.promise:Promise.resolve(2);});tracker.setScope({},['a','b']);const first=tracker.refresh('a');assert.equal(tracker.refresh('a'),first);await tracker.refresh('b');assert.deepEqual(calls,['a','b']);assert.equal(entry(tracker,'b').count,2);slow.resolve(5);await first;assert.equal(entry(tracker,'a').count,5);
});
test('invalidation hides a stale count and a late pre-mutation reply cannot replace the new count', async () => {
  const old=deferred();let calls=0;const tracker=createNoticeUnreadTracker(()=>++calls===1?old.promise:Promise.resolve(1));tracker.setScope({},['a']);const before=tracker.refresh('a');await tick();tracker.invalidate('a');await tracker.refresh('a');old.resolve(9);await before;assert.equal(entry(tracker,'a').count,1);assert.equal(calls,2);
});
test('a membership refresh/rejoin with the same club ID discards old membership count replies', async () => {
  const old=deferred();let calls=0;const tracker=createNoticeUnreadTracker(()=>++calls===1?old.promise:Promise.resolve(4));const first={},rejoined={};tracker.setScope(first,['a']);const before=tracker.refresh('a');await tick();tracker.setScope(rejoined,['a']);assert.equal(entry(tracker,'a').count,null);await tracker.refresh('a');old.resolve(0);await before;assert.equal(entry(tracker,'a').count,4);assert.equal(tracker.getSnapshot().scope,rejoined);
});
test('removed or unapproved clubs cannot be counted and late results cannot restore them', async () => {
  const old=deferred(),calls=[];const tracker=createNoticeUnreadTracker(id=>{calls.push(id);return old.promise;});tracker.setScope({},['a']);const before=tracker.refresh('a');await tick();tracker.setScope({},[]);await tracker.refresh('a');await tracker.refresh('pending');old.resolve(12);await before;assert.deepEqual(tracker.getSnapshot().entries,{});assert.deepEqual(calls,['a']);
});
test('count fan-out is bounded to three reads and covers all memberships', async () => {
  let running=0,peak=0;const calls=[];const tracker=createNoticeUnreadTracker(async id=>{running++;peak=Math.max(peak,running);calls.push(id);await tick();running--;return 1;});const ids=Array.from({length:15},(_,i)=>'club-'+i);tracker.setScope({},ids);await tracker.refreshAll();assert.equal(peak,3);assert.deepEqual(new Set(calls),new Set(ids));assert.ok(Object.values(tracker.getSnapshot().entries).every(one=>one.count===1));
});
test('changing accounts cancels queued fan-out and cannot leak replies or start old queued clubs', async () => {
  const wait=deferred(),calls=[];const tracker=createNoticeUnreadTracker(id=>{calls.push(id);return id.startsWith('old')?wait.promise:Promise.resolve(2);});tracker.setScope({},['old1','old2','old3','old4']);const previous=tracker.refreshAll();await tick();const next={};tracker.setScope(next,['new']);await tracker.refreshAll();wait.resolve(90);await previous;assert.ok(!calls.includes('old4'));assert.deepEqual(tracker.getSnapshot(),{scope:next,entries:{new:{status:'ready',count:2}}});
});
test('failed verification removes a formerly positive count and a later successful GET restores it', async () => {
  let fail=false;const tracker=createNoticeUnreadTracker(async()=>{if(fail)throw new Error();return 3;});tracker.setScope({},['a']);await tracker.refreshAll();fail=true;await tracker.refreshAll();assert.equal(entry(tracker,'a').count,null);fail=false;await tracker.refreshAll();assert.equal(entry(tracker,'a').count,3);
});
test('external-store snapshots are stable until changed and listener cleanup stops updates', async () => {
  const tracker=createNoticeUnreadTracker(async()=>1);let updates=0;const stop=tracker.subscribe(()=>updates++);const first=tracker.getSnapshot();assert.equal(tracker.getSnapshot(),first);assert.equal(tracker.getServerSnapshot(),tracker.getServerSnapshot());tracker.setScope({},['a']);assert.notEqual(tracker.getSnapshot(),first);await tracker.refreshAll();assert.equal(first.scope,null);const count=updates;stop();tracker.invalidate('a');assert.equal(updates,count);
});
test('duplicate/empty membership IDs are rejected before starting count reads', async () => {
  const calls=[];const tracker=createNoticeUnreadTracker(async id=>{calls.push(id);return 0;});assert.throws(()=>tracker.setScope({},['a','a']));assert.throws(()=>tracker.setScope({},['']));await tracker.refreshAll();assert.deepEqual(calls,[]);
});
test('API counts use server totalSize without category filters or fetching notice bodies', async () => {
  const calls=[],id='00000001-1111-4111-8111-111111111111';const service=createApiNoticeService({request:async(path,o)=>{calls.push({path,o});return{data:{items:[],totalSize:123},headers:new Headers()};}});const tracker=createNoticeUnreadTracker(service.getUnreadCount);tracker.setScope({},[id]);await tracker.refreshAll();assert.equal(entry(tracker,id).count,123);assert.deepEqual(calls,[{path:'/clubs/'+id+'/notices?read=false&totalSize=true&pageSize=0',o:undefined}]);
});
test('Mock reads remain durable and independent per club while failed read writes do not decrement counts', async () => {
  const records=new Map();let fail=false;const storage={getItem:async key=>records.get(key)??null,setItem:async(key,value)=>{if(fail)throw new Error('disk');records.set(key,value);}};const service=createMockNoticeService(storage),tracker=createNoticeUnreadTracker(service.getUnreadCount);const a='mock-club-study',b='mock-club-pixel';tracker.setScope({},[a,b]);await tracker.refreshAll();assert.equal(entry(tracker,a).count,3);assert.equal(entry(tracker,b).count,3);fail=true;await assert.rejects(service.markRead(a,a+'-welcome'));await tracker.refreshAll();assert.equal(entry(tracker,a).count,3);fail=false;await service.markRead(a,a+'-welcome');await tracker.refreshAll();assert.equal(entry(tracker,a).count,2);assert.equal(entry(tracker,b).count,3);const reopened=createMockNoticeService(storage);assert.equal(await reopened.getUnreadCount(a),2);assert.ok([...records.keys()].every(key=>key.includes('mock-notice-reads')));
});
