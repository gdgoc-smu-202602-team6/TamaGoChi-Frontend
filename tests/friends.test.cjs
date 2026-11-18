const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiFriendsService } = require('../.expo/tests/services/api/friends-service.js');
const { createMockFriendsService, MOCK_LIKES_KEY } = require('../.expo/tests/mocks/friends.js');
const { createMockClubMembersService } = require('../.expo/tests/mocks/club-members.js');
const { createMockClubMembershipService } = require('../.expo/tests/mocks/club-membership.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const copy = value => structuredClone(value);
const member = (n, userId = `friend-${n}`) => ({ id: id(1000+n), clubId: id(1), userId, nickname: `친구 ${n}`, partId: id(2), role: 'MEMBER', joinedAt: '2026-11-01T00:00:00Z' });
const items = [{ id: id(10), code: 'shabby_gosiwon', name: '방', slot: 'ROOM', category: 'ROOM_SIZE', grade: 'BASIC', price: 0, minLevel: 1, defaultOwned: true, roomSize: 3 }, { id: id(11), code: 'basic_desk', name: '책상', slot: 'DESK', category: 'FURNITURE', grade: 'BASIC', price: 0, minLevel: 1, defaultOwned: true }];
const room = userId => ({ userId, equipped: items.map(one => ({ slot: one.slot, itemId: one.id })), placements: [{ target:'CHARACTER', x:1.25, y:2 }], condition: { hearts:3, bugs:2, bugProgressSeconds:45 }, likeCount:7, likedByMe:false });
const stats = userId => ({ userId, volts:100, level:4, todaySeconds: userId.endsWith('2') ? 7200 : 1200, todayAttended:true });
function fixture(override = () => undefined) {
  const state = { members:[member(0,'viewer'),member(1),member(2)], rooms:{}, stats:{}, reverse:false }, calls=[];
  const client = { async request(path, options = {}) {
    calls.push({ path, ...options });
    const special = await override(path, options, state); if (special instanceof Error) throw special;
    if (special !== undefined) return { data:copy(special), headers:new Headers() };
    const url = new URL(path,'https://fixture.local'); let data;
    if (path===`/clubs/${id(1)}/members/me`) data=state.members[0];
    else if (path===`/clubs/${id(1)}`) data={id:id(1),name:'친구 모임',memberCount:state.members.length};
    else if (path===`/clubs/${id(1)}/parts`) data={items:[{id:id(2),name:'공부',color:'GREEN'}]};
    else if (url.pathname===`/clubs/${id(1)}/members`) { const offset=url.searchParams.has('pageToken')?Number(url.searchParams.get('pageToken').split('/').at(-1)):0; data={items:state.members.slice(offset,offset+2),...(offset+2<state.members.length?{nextPageToken:`page / ${offset+2}`}:{})}; }
    else if (path==='/items') data={items};
    else if (url.pathname.endsWith(':batchGet')) {
      const ids=url.searchParams.get('userIds').split(',');if(state.reverse)ids.reverse();
      data={items:ids.map(userId=>url.pathname.includes('/room')?(state.rooms[userId]??room(userId)):(state.stats[userId]??stats(userId)))};
    } else {
      const [, , encoded, resource] = url.pathname.split('/'), userId=decodeURIComponent(encoded);
      if (resource==='room') data=state.rooms[userId]??room(userId);
      else if (resource==='stats') data=state.stats[userId]??stats(userId);
      else if (resource==='likes') { const value=state.rooms[userId]??room(userId), liked=options.method==='PUT';value.likeCount+=Number(liked)-Number(value.likedByMe);value.likedByMe=liked;state.rooms[userId]=value; }
      else throw new Error('Unexpected request '+path);
    }
    return {data:copy(data),headers:new Headers()};
  }};
  return {state,calls,service:createApiFriendsService(client,'viewer')};
}
const writes = f => f.calls.filter(one=>one.method==='PUT'||one.method==='DELETE');
function mock() {
  const data=new Map(),writes=[];let fail=false;
  const storage={getItem:async key=>data.get(key)??null,setItem:async(key,value)=>{if(fail&&key===MOCK_LIKES_KEY)throw new Error('disk');writes.push(key);data.set(key,value);}};
  return {storage,data,writes,fail:value=>{fail=value;},service:createMockFriendsService(storage)};
}

test('friends use all member pages, exclude self, map batch identities and sort study time without manager APIs',async()=>{
  const f=fixture();f.state.reverse=true;const board=await f.service.getBoard(id(1));
  assert.deepEqual(board.friends.map(one=>one.member.userId),['friend-2','friend-1']);
  assert.equal(board.friends[0].appearance.size,3);assert.equal(board.friends[0].condition.bugs,2);assert.equal(board.friends[0].part.name,'공부');
  assert.equal(f.calls.filter(one=>one.path.includes('/members?')).length,2);
  assert.ok(f.calls.some(one=>one.path.includes('pageToken=page%20%2F%202')));
  assert.ok(!f.calls.some(one=>/permissions|roles|\/users\/me\/items|\/users\/[^/]+\/items/.test(one.path)));
  assert.equal(writes(f).length,0);
});
test('large friend rosters split room and stats batches at 100 users with no self or missing tail',async()=>{
  const f=fixture();f.state.members=[member(0,'viewer'),...Array.from({length:201},(_,i)=>member(i+1))];
  const board=await f.service.getBoard(id(1));assert.equal(board.friends.length,201);
  for(const endpoint of ['room','stats']) {const groups=f.calls.filter(one=>one.path.startsWith(`/users/-/${endpoint}:batchGet`)).map(one=>new URL(one.path,'https://fixture.local').searchParams.get('userIds').split(','));assert.deepEqual(groups.map(one=>one.length),[100,100,1]);assert.equal(new Set(groups.flat()).size,201);assert.ok(!groups.flat().includes('viewer'));}
});
test('a club containing only self needs no catalog or batch calls',async()=>{
  const f=fixture();f.state.members=[f.state.members[0]];assert.deepEqual((await f.service.getBoard(id(1))).friends,[]);assert.ok(!f.calls.some(one=>one.path.startsWith('/users/')||one.path==='/items'));
});
test('an old screen slow read does not block a fresh board or visit',async()=>{
  let release,held=false,started;const entered=new Promise(resolve=>{started=resolve;});
  const f=fixture(path=>{if(path.startsWith('/users/-/room:batchGet')&&!held){held=true;started();return new Promise(resolve=>{release=()=>resolve({items:[room('friend-1'),room('friend-2')]});});}});
  const old=f.service.getBoard(id(1));await entered;
  try { const fresh=await Promise.race([f.service.getVisit(id(1),id(1002)),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('fresh screen blocked by old read')),500);timer.unref();})]);assert.equal(fresh.friend.member.userId,'friend-2'); }
  finally {release();await old;}
});
test('invalid club/member IDs and self visits never read or mutate another room',async()=>{
  const f=fixture();await assert.rejects(f.service.getBoard('bad'),{kind:'response'});assert.equal(f.calls.length,0);
  await assert.rejects(f.service.getVisit(id(1),'bad'),{kind:'response'});assert.equal(f.calls.length,0);
  await assert.rejects(f.service.getVisit(id(1),id(1000)),{status:404});assert.ok(!f.calls.some(one=>one.path.startsWith('/users/')));
  await assert.rejects(f.service.setLike(id(1),member(0,'viewer'),true),{reason:'invalid'});assert.equal(writes(f).length,0);
});
test('incomplete or cross-account member context is rejected without fetching rooms',async()=>{
  const changes=[s=>s.members[0].userId='another-viewer',s=>s.members[1].clubId=id(9),s=>s.members[1].partId=id(9),s=>s.members[1].id=s.members[2].id,s=>s.members[1].userId=s.members[2].userId,s=>s.members[1].userId='ambiguous,user'];
  for(const change of changes){const f=fixture();change(f.state);await assert.rejects(f.service.getBoard(id(1)),{kind:'response'});assert.ok(!f.calls.some(one=>one.path.includes(':batchGet')));}
});
test('looping and malformed member pagination fail rather than showing a partial board',async()=>{
  for(const token of ['repeat',42,'']){const f=fixture(path=>path.includes('/members?')?{items:[],nextPageToken:token}:undefined);await assert.rejects(f.service.getBoard(id(1)),{kind:'response'});assert.ok(f.calls.length<12);}
});
test('missing duplicate foreign and malformed batch data fail without mixing users',async()=>{
  const changes=[list=>list.pop(),list=>list[1]=copy(list[0]),list=>list[0].userId='foreign',list=>list[0].condition.bugs=4,list=>list[0].likeCount=-1,list=>{list[0].likeCount=0;list[0].likedByMe=true;},list=>list[0].equipped[0].itemId=id(999),list=>list[0].placements[0].x=99];
  for(const change of changes){const f=fixture(path=>{if(path.startsWith('/users/-/room:batchGet')){const list=[room('friend-1'),room('friend-2')];change(list);return{items:list};}});await assert.rejects(f.service.getBoard(id(1)),{kind:'response'});}
  const f=fixture(path=>path.startsWith('/users/-/stats:batchGet')?{items:[stats('friend-1'),{...stats('friend-2'),level:0}]}:undefined);await assert.rejects(f.service.getBoard(id(1)),{kind:'response'});
});
test('visits resolve current member ID to encoded user ID and show that user only',async()=>{
  const f=fixture();f.state.members[1].userId='friend /?#';const visit=await f.service.getVisit(id(1),id(1001));assert.equal(visit.friend.member.userId,'friend /?#');assert.ok(f.calls.some(one=>one.path==='/users/friend%20%2F%3F%23/room'));assert.ok(!f.calls.some(one=>one.path.includes(':batchGet')));
});
test('liking and unliking send one bodyless user-scoped request and verify the actual room',async()=>{
  const f=fixture(),target=member(1);await Promise.all([f.service.setLike(id(1),target,true),f.service.setLike(id(1),target,true)]);
  assert.deepEqual(writes(f),[{path:'/users/friend-1/likes/me',method:'PUT'}]);
  assert.equal((await f.service.getVisit(id(1),target.id)).friend.likeCount,8);
  const result=await f.service.setLike(id(1),target,false);assert.equal(result.friend.likeCount,7);assert.equal(result.friend.likedByMe,false);
  assert.deepEqual(writes(f)[1],{path:'/users/friend-1/likes/me',method:'DELETE'});
});
test('stale member snapshots and removed/rejoined membership IDs cannot start a like',async()=>{
  const f=fixture();f.state.members[1].nickname='바뀐 이름';await assert.rejects(f.service.setLike(id(1),member(1),true),{reason:'changed'});assert.equal(writes(f).length,0);
  f.state.members[1].id=id(1999);await assert.rejects(f.service.setLike(id(1),member(1),true),{status:404});assert.equal(writes(f).length,0);
});
test('definite access rejection is not replayed or treated as liked',async()=>{
  for(const status of [400,401,403,404]){const f=fixture((path,o)=>o.method==='PUT'?new ApiError('http',status):undefined);await assert.rejects(f.service.setLike(id(1),member(1),true),{status});assert.equal(writes(f).length,1);}
});
test('a committed like with network timeout or server response loss is recovered with reads only',async()=>{
  for(const error of [new ApiError('network'),new ApiError('timeout'),new ApiError('http',503)]){const f=fixture((path,o,s)=>{if(o.method==='PUT'){s.rooms['friend-1']={...room('friend-1'),likedByMe:true,likeCount:8};return error;}});assert.equal((await f.service.setLike(id(1),member(1),true)).friend.likedByMe,true);assert.equal(writes(f).length,1);}
});
test('an unapplied request or unreadable result remains uncertain and a refresh never replays it',async()=>{
  const f=fixture((path,o)=>o.method==='PUT'?new ApiError('network'):undefined);await assert.rejects(f.service.setLike(id(1),member(1),true),{reason:'uncertain'});assert.equal((await f.service.getVisit(id(1),id(1001))).friend.likedByMe,false);assert.equal(writes(f).length,1);
  let sent=false;const lost=fixture((path,o)=>{if(o.method==='PUT'){sent=true;return new ApiError('timeout');}if(sent&&path.endsWith('/room'))return new ApiError('network');});await assert.rejects(lost.service.setLike(id(1),member(1),true),{reason:'uncertain'});assert.equal(writes(lost).length,1);
});
test('permission loss during result reads clears access rather than reporting success',async()=>{
  let sent=false;const f=fixture((path,o)=>{if(o.method==='PUT'){sent=true;return new ApiError('network');}if(sent&&path.includes('/members/me'))return new ApiError('http',404);});await assert.rejects(f.service.setLike(id(1),member(1),true),{status:404});assert.equal(writes(f).length,1);
});
test('Mock likes persist per user across clubs and do not touch personal or membership stores',async()=>{
  const f=mock();f.data.set('@tamagochi/mock-study/v1','personal-study');const a=await f.service.getBoard('mock-club-study'),first=a.friends.find(one=>one.member.userId==='mock-user-1');assert.equal(a.friends.length,11);assert.ok(a.friends.every((one,i,list)=>!i||list[i-1].todaySeconds>=one.todaySeconds));assert.equal(f.writes.length,0);
  await f.service.setLike(a.club.id,first.member,true);const second=(await createMockFriendsService(f.storage).getBoard('mock-club-pixel')).friends.find(one=>one.member.userId==='mock-user-1');assert.equal(second.likedByMe,true);assert.equal(second.likeCount,first.likeCount+1);
  await f.service.setLike('mock-club-pixel',second.member,false);assert.equal((await f.service.getVisit(a.club.id,first.member.id)).friend.likeCount,first.likeCount);assert.deepEqual([...new Set(f.writes)],[MOCK_LIKES_KEY]);assert.equal(f.data.get('@tamagochi/mock-study/v1'),'personal-study');
});
test('Mock storage failure and corruption preserve existing records and never become fake success',async()=>{
  const f=mock(),board=await f.service.getBoard('mock-club-study'),target=board.friends[0];f.fail(true);await assert.rejects(f.service.setLike(board.club.id,target.member,true),{reason:'uncertain'});assert.equal(f.data.get(MOCK_LIKES_KEY),undefined);f.fail(false);await f.service.getVisit(board.club.id,target.member.id);assert.equal(f.writes.length,0);
  f.data.set(MOCK_LIKES_KEY,'broken');await assert.rejects(f.service.getBoard(board.club.id),{reason:'storage'});assert.equal(f.data.get(MOCK_LIKES_KEY),'broken');
});
test('Mock removed members disappear and leaving revokes only that club while retaining user likes',async()=>{
  const f=mock(),id='mock-club-study',board=await f.service.getBoard(id),target=board.friends.find(one=>one.member.userId==='mock-user-1');await f.service.setLike(id,target.member,true);
  await createMockClubMembersService(f.storage).removeMember(id,target.member);await assert.rejects(f.service.getVisit(id,target.member.id),{status:404});assert.equal((await f.service.getBoard(id)).friends.length,10);
  const other=(await f.service.getBoard('mock-club-pixel')).friends.find(one=>one.member.userId===target.member.userId);assert.equal(other.likedByMe,true);
  const own=createMockClubMembershipService(f.storage),membership=await own.getState('mock-club-pixel');await own.leave('mock-club-pixel',membership.data.member);await assert.rejects(f.service.getBoard('mock-club-pixel'),{status:404});assert.ok(JSON.parse(f.data.get(MOCK_LIKES_KEY)).userIds.includes(target.member.userId));
});
test('concurrent Mock service instances retain both different user likes',async()=>{
  const f=mock(),board=await f.service.getBoard('mock-club-study'),other=createMockFriendsService(f.storage);await Promise.all([f.service.setLike(board.club.id,board.friends[0].member,true),other.setLike(board.club.id,board.friends[1].member,true)]);assert.equal(JSON.parse(f.data.get(MOCK_LIKES_KEY)).userIds.length,2);
});
