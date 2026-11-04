const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiGuestbookService } = require('../.expo/tests/services/api/guestbook-service.js');
const { createMockGuestbookService, MOCK_GUESTBOOK_KEY } = require('../.expo/tests/mocks/guestbook.js');
const { createMockClubMembershipService } = require('../.expo/tests/mocks/club-membership.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { guestbookText, guestbookLength } = require('../.expo/tests/utils/guestbook.js');
const id = n => `${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const mine = {kind:'mine'}, target = {kind:'member',clubId:id(1),memberId:id(101)};
const member=(n,clubId=id(1),userId=n===100?'viewer':n===101?'owner':'writer')=>({id:id(n),clubId,userId,nickname:userId,partId:id(50),roleId:id(51),joinedAt:'2026-11-01T00:00:00Z'});
const entry=(n,userId,clubId=id(1),authorUserId='writer')=>({id:id(n),clubId,userId,authorUserId,body:`응원 ${n}`,createdAt:'2026-11-03T00:00:00Z'});
function memory() {const data=new Map(),writes=[];let fail=null;const store={get:async key=>{if(fail==='read')throw new Error('disk');return data.get(key)??null;},set:async(key,value)=>{if(fail==='write'||fail==='receipt'&&value?.includes('created'))throw new Error('disk');writes.push({key,value});if(value===null)data.delete(key);else data.set(key,value);}};return{data,writes,store,fail:value=>{fail=value;}};}
function fixture(override=()=>undefined) {
 const log=memory(),calls=[],state={entries:[entry(301,'viewer'),entry(302,'viewer',id(2),null),entry(303,'viewer',id(3),null),entry(401,'owner'),entry(402,'owner',id(1),'viewer'),entry(403,'owner',id(2),'viewer')],checkedAt:null,posts:0};
 const roster=club=>[member(club===id(1)?100:200,club,'viewer'),member(club===id(1)?101:201,club,'owner'),member(club===id(1)?102:202,club,'writer')];
 const count=()=>state.entries.filter(e=>e.userId==='viewer'&&(!state.checkedAt||e.createdAt>state.checkedAt)).length;
 const client={async request(path,o={}) {calls.push({path,...o});const url=new URL(path,'https://fixture.invalid'),p=url.pathname,special=await override(p,o,state,url);if(special instanceof Error)throw special;if(special!==undefined)return{data:structuredClone(special),headers:new Headers()};let data;
  if(p==='/users/me/room'){if(o.method==='PATCH')state.checkedAt=o.body.guestbookCheckedAt;data={userId:'viewer',newGuestbookCount:count()};}
  else if(p==='/clubs/-/members')data={items:[roster(id(1))[0],roster(id(2))[0]]};
  else if(p.endsWith('/guestbookEntries')||p.includes('/guestbookEntries/')){
   const own=p.startsWith('/users/me/'),club=p.split('/')[2],owner=own?'viewer':roster(club).find(m=>m.id===p.split('/')[4])?.userId;if(!owner)throw new ApiError('http',404);
   if(o.method==='POST'){state.posts++;data={id:id(600+state.posts),clubId:club,userId:owner,authorUserId:'viewer',body:o.body.body,createdAt:'2026-11-04T03:00:00Z'};state.entries.unshift(data);}
   else if(o.method==='DELETE'){const eid=p.split('/').at(-1);state.entries=state.entries.filter(e=>e.id!==eid);}
   else {const rows=state.entries.filter(e=>e.userId===owner&&(own||e.clubId===club)),offset=url.searchParams.has('pageToken')?Number(url.searchParams.get('pageToken').split('/').at(-1)):0;data={items:rows.slice(offset,offset+20).map(e=>({...e,...(owner==='viewer'?{new:!state.checkedAt||e.createdAt>state.checkedAt}:{})})),...(offset+20<rows.length?{nextPageToken:`entry page / ${offset+20}`}:{})};}
  }else if(/^\/clubs\/[^/]+$/.test(p))data={id:p.split('/')[2],name:'동아리 '+p.split('/')[2]};
  else if(p.includes('/members/')){const parts=p.split('/'),list=roster(parts[2]);data=parts.at(-1)==='me'?list[0]:list.find(m=>m.id===parts.at(-1));if(!data)throw new ApiError('http',404);}
  else if(p.endsWith('/members')){const list=roster(p.split('/')[2]);data=url.searchParams.has('pageToken')?{items:list.slice(2)}:{items:list.slice(0,2),nextPageToken:'roster page / 2'};}
  else throw new Error('Unexpected '+path);
  return{data:structuredClone(data),headers:new Headers()};
 }};
 return{...log,calls,state,client,service:createApiGuestbookService(client,'viewer',log.store)};
}
const mutations=f=>f.calls.filter(c=>c.method);
function mock(){const storage=new Map(),log=memory(),writes=[];let fail=false;const disk={getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>{if(fail&&key===MOCK_GUESTBOOK_KEY)throw new Error('disk');storage.set(key,value);writes.push(key);}};return{storage,disk,log,writes,fail:value=>{fail=value;},service:createMockGuestbookService(disk,log.store,()=>Date.parse('2026-11-04T03:00:00Z'))};}

test('guestbook text trims and counts 60 Unicode graphemes without a UTF-16 limit',()=>{
 const emoji='👨‍👩‍👧‍👦';assert.equal(guestbookLength(emoji.repeat(60)),60);assert.equal(guestbookText('  '+emoji.repeat(60)+'  '),emoji.repeat(60));for(const value of ['',' \n ',emoji.repeat(61)])assert.throws(()=>guestbookText(value),{reason:'invalid'});
});
test('own guestbook spans all clubs with new flags, nullable authors and current membership delete/visit rights',async()=>{
 const f=fixture(),board=await f.service.getPage(mine);assert.equal(board.items.length,3);assert.equal(board.items[0].authorName,'writer');assert.equal(board.items[0].authorMemberId,id(102));assert.equal(board.items[1].authorName,'탈퇴한 사용자');assert.equal(board.items[2].canDelete,false);assert.ok(board.items.every(e=>e.new));assert.equal(board.canWrite,false);assert.equal(mutations(f).length,0);assert.equal(f.writes.length,0);
});
test('visitor sees only the selected club with author-only delete and no manager permission APIs',async()=>{
 const f=fixture(),board=await f.service.getPage(target);assert.deepEqual(board.items.map(e=>e.id),[id(401),id(402)]);assert.equal(board.items[0].canDelete,false);assert.equal(board.items[1].canDelete,true);assert.equal(board.items[1].authorName,'나');assert.equal(board.canWrite,true);assert.ok(!f.calls.some(c=>/permissions|\/roles|\/parts|\/users\/.+\/items/.test(c.path)));
});
test('page tokens are encoded and other user/club, malformed body/date/author or duplicate entries are rejected',async()=>{
 const f=fixture();await f.service.getPage(target,'entry page / 20');assert.ok(f.calls.some(c=>c.path.includes('pageToken=entry%20page%20%2F%2020')));
 for(const mutate of [e=>e.userId='foreign',e=>e.clubId=id(9),e=>e.id='bad',e=>e.body='a'.repeat(61),e=>e.authorUserId=undefined,e=>e.createdAt='bad',e=>e.new='yes']){const f=fixture(p=>{if(p.endsWith('/guestbookEntries')){const e=entry(401,'owner');mutate(e);return{items:[e]};}});await assert.rejects(f.service.getPage(target),{kind:'response'});}
 const duplicate=fixture(p=>p.endsWith('/guestbookEntries')?{items:[entry(401,'owner'),entry(401,'owner')]}:undefined);await assert.rejects(duplicate.service.getPage(target),{kind:'response'});
});
test('invalid targets and wrong authenticated memberships fail before guestbook access',async()=>{
 const f=fixture();await assert.rejects(f.service.getPage({...target,clubId:'bad'}),{kind:'response'});assert.equal(f.calls.length,0);
 const other=fixture(p=>p.endsWith('/members/me')?member(100,id(1),'foreign'):undefined);await assert.rejects(other.service.getPage(target),{kind:'response'});assert.ok(!other.calls.some(c=>c.path.includes('guestbookEntries')));
});
test('create sends only normalized body once and records successful status across restarts',async()=>{
 const f=fixture();await Promise.allSettled([f.service.create(target,'owner','  응원해요  '),f.service.create(target,'owner','  응원해요  ')]);assert.equal(f.state.posts,1);assert.deepEqual(mutations(f)[0],{path:`/clubs/${id(1)}/members/${id(101)}/guestbookEntries`,method:'POST',body:{body:'응원해요'}});assert.equal((await createApiGuestbookService(f.client,'viewer',f.store).getPage(target)).createStatus,'created');assert.ok([...f.data.values()].every(raw=>!raw.includes('응원해요')));
});
test('own room and changed owner cannot create or write an intent',async()=>{
 const f=fixture();await assert.rejects(f.service.create(mine,'viewer','hi'),{reason:'forbidden'});await assert.rejects(f.service.create(target,'different-owner','hi'),{reason:'changed'});assert.equal(mutations(f).length,0);assert.equal(f.writes.length,0);
});
test('failed intent storage prevents POST and corrupt journals are preserved',async()=>{
 const f=fixture();f.fail('write');await assert.rejects(f.service.create(target,'owner','hi'),{reason:'storage'});assert.equal(f.state.posts,0);f.fail(null);f.data.set(`${id(1)}/${id(101)}`,'broken');await assert.rejects(f.service.getPage(target),{reason:'storage'});await assert.rejects(f.service.resetIntent(target),{reason:'storage'});assert.equal([...f.data.values()][0],'broken');
});
test('committed response loss remains uncertain across restart without guessing from matching text or replaying',async()=>{
 const f=fixture((p,o,s)=>{if(o.method==='POST'){s.posts++;s.entries.unshift({...entry(650,'owner',id(1),'viewer'),body:o.body.body});return new ApiError('network');}});await assert.rejects(f.service.create(target,'owner','hello'),{reason:'uncertain'});const restarted=createApiGuestbookService(f.client,'viewer',f.store);assert.equal((await restarted.getPage(target)).createStatus,'uncertain');await assert.rejects(restarted.create(target,'owner','hello'),{reason:'uncertain'});assert.equal(f.state.posts,1);await restarted.resetIntent(target);assert.equal((await restarted.getPage(target)).createStatus,'ready');assert.equal(f.state.posts,1);
});
test('unapplied timeout, 5xx and invalid receipts keep a durable duplicate prevention record',async()=>{
 for(const result of [new ApiError('timeout'),new ApiError('http',503),{...entry(650,'foreign',id(1),'viewer'),body:'hi'}]){const f=fixture((p,o)=>o.method==='POST'?result:undefined);await assert.rejects(f.service.create(target,'owner','hi'),{reason:'uncertain'});assert.equal((await f.service.getPage(target)).createStatus,'uncertain');assert.equal(mutations(f).length,1);}
});
test('definite POST rejection clears only this intent and permits explicit retry after a read',async()=>{
 const f=fixture((p,o)=>o.method==='POST'?new ApiError('http',400):undefined);await assert.rejects(f.service.create(target,'owner','hi'),{status:400});assert.equal((await f.service.getPage(target)).createStatus,'ready');assert.equal(f.data.size,0);
});
test('receipt storage failure reports confirmed success in memory but stays safe after restart',async()=>{
 const f=fixture();f.fail('receipt');await f.service.create(target,'owner','hi');assert.equal((await f.service.getPage(target)).createStatus,'created');f.fail(null);assert.equal((await createApiGuestbookService(f.client,'viewer',f.store).getPage(target)).createStatus,'uncertain');assert.equal(f.state.posts,1);
});
test('delete searches all pages, uses bodyless concrete membership paths and never deletes another authors post',async()=>{
 const f=fixture();await assert.rejects(f.service.remove(target,f.state.entries.find(e=>e.id===id(401))),{reason:'forbidden'});assert.equal(mutations(f).length,0);
 const mineEntry=f.state.entries[0];await f.service.remove(mine,mineEntry);assert.deepEqual(mutations(f)[0],{path:`/clubs/${id(1)}/members/${id(100)}/guestbookEntries/${id(301)}`,method:'DELETE'});
 const own=entry(499,'owner',id(1),'viewer');f.state.entries=[...Array.from({length:25},(_,i)=>entry(700+i,'owner')),own];await f.service.remove(target,own);assert.ok(f.calls.some(c=>c.path.includes('entry%20page%20%2F%2020')));assert.ok(!f.state.entries.some(e=>e.id===own.id));
});
test('already absent entry causes no DELETE, changed snapshots are refused and foreign-club own posts cannot be deleted',async()=>{
 const f=fixture();await f.service.remove(target,entry(999,'owner',id(1),'viewer'));assert.equal(mutations(f).length,0);await assert.rejects(f.service.remove(target,{...f.state.entries.find(e=>e.id===id(402)),body:'changed'}),{reason:'changed'});await assert.rejects(f.service.remove(mine,f.state.entries[2]),{reason:'forbidden'});assert.equal(mutations(f).length,0);
});
test('DELETE response loss or 404 is recovered by absence; unapplied and inaccessible outcomes are never replayed',async()=>{
 for(const error of [new ApiError('network'),new ApiError('http',404),new ApiError('http',503)]){const f=fixture((p,o,s)=>{if(o.method==='DELETE'){s.entries=s.entries.filter(e=>e.id!==id(402));return error;}});await f.service.remove(target,entry(402,'owner',id(1),'viewer'));assert.equal(mutations(f).length,1);}
 const f=fixture((p,o)=>o.method==='DELETE'?new ApiError('network'):undefined);await assert.rejects(f.service.remove(target,entry(402,'owner',id(1),'viewer')),{reason:'uncertain'});await f.service.getPage(target);assert.equal(mutations(f).length,1);
});
test('new count reads are side effect free and checked timestamp PATCH never includes equipment or placements',async()=>{
 const f=fixture();assert.equal(await f.service.getNewCount(),3);await f.service.getPage(mine);assert.equal(mutations(f).length,0);const at='2026-11-04T03:00:00Z';await f.service.markChecked(at);assert.deepEqual(mutations(f),[{path:'/users/me/room',method:'PATCH',body:{guestbookCheckedAt:at}}]);assert.equal(await f.service.getNewCount(),0);
 for(const bad of [{userId:'other',newGuestbookCount:0},{userId:'viewer',newGuestbookCount:-1}]){const f=fixture(p=>p==='/users/me/room'?bad:undefined);await assert.rejects(f.service.getNewCount(),{kind:'response'});}
});
test('Mock shows global and club-specific entries, keeps new flags and clears only the new counter on check',async()=>{
 const f=mock(),own=await f.service.getPage(mine);assert.equal(own.items.length,3);assert.equal(await f.service.getNewCount(),3);assert.equal(f.writes.length,0);const visit=await f.service.getPage({kind:'member',clubId:'mock-club-study',memberId:'mock-colleague-1'});assert.ok(visit.items.every(e=>e.clubId==='mock-club-study'));await f.service.markChecked('2026-11-04T03:00:00Z');assert.equal(await f.service.getNewCount(),0);assert.ok(own.items.every(e=>e.new));assert.equal((await f.service.getPage(mine)).items.length,3);
});
test('Mock create/delete persists, author permissions hold and personal records remain untouched',async()=>{
 const f=mock();f.storage.set('@tamagochi/mock-study/v1','personal');const room={kind:'member',clubId:'mock-club-study',memberId:'mock-colleague-1'};const before=await f.service.getPage(room);await assert.rejects(f.service.remove(room,before.items[0]),{reason:'forbidden'});const post=await f.service.create(room,'mock-user-1',' 응원해요 ');assert.equal(post.body,'응원해요');await f.service.remove(room,post);assert.ok(!(await f.service.getPage(room)).items.some(e=>e.id===post.id));assert.equal(f.storage.get('@tamagochi/mock-study/v1'),'personal');assert.deepEqual([...new Set(f.writes)],[MOCK_GUESTBOOK_KEY]);
});
test('Mock own history survives club leaving but club access and deletion rights are removed',async()=>{
 const f=mock(),own=createMockClubMembershipService(f.disk),membership=await own.getState('mock-club-pixel');await own.leave('mock-club-pixel',membership.data.member);const page=await f.service.getPage(mine),old=page.items.find(e=>e.clubId==='mock-club-pixel');assert.ok(old);assert.equal(old.canDelete,false);assert.equal(old.authorMemberId,undefined);await assert.rejects(f.service.getPage({kind:'member',clubId:'mock-club-pixel',memberId:'mock-colleague-1'}),{status:404});
});
test('Mock write failure and corrupt registry preserve records, with no automatic POST repetition',async()=>{
 const f=mock(),room={kind:'member',clubId:'mock-club-study',memberId:'mock-colleague-1'};f.fail(true);await assert.rejects(f.service.create(room,'mock-user-1','hi'),{reason:'uncertain'});assert.equal(f.storage.get(MOCK_GUESTBOOK_KEY),undefined);f.fail(false);assert.equal((await f.service.getPage(room)).createStatus,'uncertain');assert.equal(f.writes.length,0);f.storage.set(MOCK_GUESTBOOK_KEY,'broken');await assert.rejects(f.service.getPage(mine),{reason:'storage'});assert.equal(f.storage.get(MOCK_GUESTBOOK_KEY),'broken');
});
