const {test}=require('node:test'),assert=require('node:assert/strict');
const {createApiNoticeManagementService}=require('../.expo/tests/services/api/notice-management-service.js');
const {createMockNoticeManagementService}=require('../.expo/tests/mocks/notice-management.js');
const {createMockNoticeComposeService}=require('../.expo/tests/mocks/notice-compose.js');
const {createMockNoticeService}=require('../.expo/tests/mocks/notices.js');
const {MOCK_NOTICE_CONTENT_KEY}=require('../.expo/tests/mocks/notice-content.js');
const {ApiError}=require('../.expo/tests/services/api/http-client.js');
const {noticeEditFields}=require('../.expo/tests/utils/notice-edit.js');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`,clubId=id(1),noticeId=id(100),categoryId=id(11),subId=id(12);
const original={id:noticeId,categoryId,subcategoryId:subId,title:'기존 제목',body:'기존 본문',pinned:true,read:false,authorUserId:'other-operator',createdAt:'2026-11-03T01:00:00Z',notificationState:'PENDING'};
function fixture(override=()=>undefined){
 const state={permissions:['notices.write'],notice:{...original},categories:[{id:categoryId,name:'스터디',color:'GREEN',subcategories:[{id:subId,name:'함께 읽기'}]},{id:id(21),name:'전체공지',color:'RED',subcategories:[]}]},calls=[];
 function apply(patch){state.notice={...state.notice,...patch,subcategoryId:patch.subcategoryId===null?undefined:patch.subcategoryId??state.notice.subcategoryId};}
 const client={async request(path,options={}){calls.push({path,...options});const u=new URL(path,'https://fixture.invalid');const special=await override(u,options,state,apply);if(special instanceof Error)throw special;
  let data=special;if(data===undefined){if(u.pathname.endsWith('/permissions'))data={items:state.permissions};else if(u.pathname.endsWith('/noticeCategories'))data={items:state.categories};else if(u.pathname===`/clubs/${clubId}`)data={id:clubId,name:'공부 모임',memberCount:12};
   else {if(!state.notice)throw new ApiError('http',404);if(options.method==='PATCH')apply(options.body);if(options.method==='DELETE'){state.notice=null;data=undefined;}else data={...state.notice};}}
  return{data,headers:new Headers()};}};
 return{state,calls,service:createApiNoticeManagementService(client),apply};
}
const writes=f=>f.calls.filter(c=>['PATCH','DELETE'].includes(c.method));
test('management permission is checked before any notice content and unrelated operator roles are denied',async()=>{
 for(const permissions of [[],['applications.decide'],['members.manage']]){const f=fixture();f.state.permissions=permissions;await assert.rejects(f.service.getBoard(clubId,noticeId),{reason:'forbidden'});assert.equal(f.calls.length,1);}
 const f=fixture();await assert.rejects(f.service.getBoard('../other',noticeId),{kind:'response'});assert.equal(f.calls.length,0);
});
test('edit loads the exact notice and current dynamic categories without marking it read',async()=>{
 const f=fixture(),board=await f.service.getBoard(clubId,noticeId);assert.equal(board.notice.id,noticeId);assert.equal(board.notice.read,false);assert.equal(board.categories.length,2);assert.equal(f.calls.some(c=>c.method==='PUT'),false);
 for(const data of [{...original,id:id(999)},{...original,notificationState:'UNKNOWN'},{...original,body:''}]){const bad=fixture(u=>u.pathname.includes('/notices/')?data:undefined);await assert.rejects(bad.service.getBoard(clubId,noticeId),{kind:'response'});}
});
test('save PATCHes only changed fields, trims text and explicitly clears an unchanged category subcategory with null',async()=>{
 const f=fixture(),draft={...noticeEditFields(original),subcategoryId:undefined,title:'  바꾼 제목  ',body:' 첫 줄\n둘째 줄 '};
 const result=await f.service.save(clubId,noticeId,original,draft);assert.equal(result.subcategoryId,undefined);
 assert.deepEqual(writes(f),[{path:`/clubs/${clubId}/notices/${noticeId}`,method:'PATCH',body:{subcategoryId:null,title:'바꾼 제목',body:'첫 줄\n둘째 줄'}}]);
 assert.equal(result.authorUserId,original.authorUserId);assert.equal(result.createdAt,original.createdAt);assert.equal(result.notificationState,'PENDING');assert.equal(result.read,false);
});
test('unchanged desired content is a read-only no-op even when another operator already saved the same input',async()=>{
 const f=fixture();await f.service.save(clubId,noticeId,original,noticeEditFields(original));assert.equal(writes(f).length,0);
 f.state.notice.title='같은 수정';const result=await f.service.save(clubId,noticeId,original,{...original,title:'같은 수정'});assert.equal(result.title,'같은 수정');assert.equal(writes(f).length,0);
});
test('read state and asynchronous notification progress do not create false content conflicts or get resent',async()=>{
 const f=fixture();f.state.notice.read=true;f.state.notice.notificationState='SENT';const result=await f.service.save(clubId,noticeId,original,{...original,pinned:false});
 assert.deepEqual(writes(f)[0].body,{pinned:false});assert.equal(result.read,true);assert.equal(result.notificationState,'SENT');
});
test('save and delete recheck permissions and missing notices before mutation',async()=>{
 for(const action of ['save','remove']){const f=fixture();await f.service.getBoard(clubId,noticeId);f.state.permissions=[];
  await assert.rejects(action==='save'?f.service.save(clubId,noticeId,original,{...original,title:'수정'}):f.service.remove(clubId,noticeId,original),{reason:'forbidden'});assert.equal(writes(f).length,0);}
 const f=fixture();f.state.notice=null;await assert.rejects(f.service.save(clubId,noticeId,original,{...original,title:'수정'}),{reason:'missing'});assert.equal(writes(f).length,0);
});
test('another operator changed content blocks save and delete until the current content is reviewed',async()=>{
 for(const action of ['save','remove']){const f=fixture();f.state.notice.body='다른 운영진 수정';await assert.rejects(action==='save'?f.service.save(clubId,noticeId,original,{...original,title:'내 수정'}):f.service.remove(clubId,noticeId,original),{reason:'changed'});assert.equal(writes(f).length,0);}
});
test('serialized duplicate save or delete requests never issue a second mutation',async()=>{
 const f=fixture(),draft={...original,title:'한 번만 수정'};await Promise.all([f.service.save(clubId,noticeId,original,draft),f.service.save(clubId,noticeId,original,draft)]);assert.equal(writes(f).length,1);
 const g=fixture(),outcomes=await Promise.all([g.service.remove(clubId,noticeId,original),g.service.remove(clubId,noticeId,original)]);assert.deepEqual(outcomes,['deleted','absent']);assert.equal(writes(g).length,1);
});
test('lost, timed-out or 500 save responses recover the exact applied content with GET and no repeated PATCH',async()=>{
 for(const failure of [new ApiError('network'),new ApiError('timeout'),new ApiError('http',500)]){
  const f=fixture((u,o,s,apply)=>{if(o.method==='PATCH'){apply(o.body);return failure;}});const result=await f.service.save(clubId,noticeId,original,{...original,title:'적용된 수정'});assert.equal(result.title,'적용된 수정');assert.equal(writes(f).length,1);
 }
});
test('unknown save outcomes stay uncertain or changed, never silently overwrite or repeat',async()=>{
 for(const mode of ['unchanged','changed','unreadable']){let wrote=false;const f=fixture((u,o,s)=>{if(o.method==='PATCH'){wrote=true;if(mode==='changed')s.notice.body='다른 수정';return new ApiError('network');}if(wrote&&mode==='unreadable')return new ApiError('network');});
  await assert.rejects(f.service.save(clubId,noticeId,original,{...original,title:'내 수정'}),{reason:mode==='changed'?'changed':'uncertain'});assert.equal(writes(f).length,1);}
});
test('permission loss or authentication expiration during save recovery is propagated instead of retaining protected content as uncertain',async()=>{
 for(const expired of [false,true]){let wrote=false;const f=fixture((u,o,s)=>{if(o.method==='PATCH'){wrote=true;s.permissions=[];return new ApiError('network');}if(wrote&&expired)return new ApiError('http',401);});
  await assert.rejects(f.service.save(clubId,noticeId,original,{...original,title:'수정'}),expired?{status:401}:{reason:'forbidden'});assert.equal(writes(f).length,1);}
});
test('definite mutation rejections do not auto-retry and a mismatched receipt is confirmed by an exact read',async()=>{
 for(const status of [400,403,404,409,422]){const f=fixture((u,o)=>o.method==='PATCH'?new ApiError('http',status):undefined);await assert.rejects(f.service.save(clubId,noticeId,original,{...original,title:'수정'}),status===404?{reason:'missing'}:{status});assert.equal(writes(f).length,1);}
 const f=fixture((u,o,s,apply)=>{if(o.method==='PATCH'){apply(o.body);return {...s.notice,id:id(999)};}});assert.equal((await f.service.save(clubId,noticeId,original,{...original,title:'수정'})).id,noticeId);assert.equal(writes(f).length,1);
});
test('delete sends no body; already absent notices return a neutral result without DELETE',async()=>{
 const f=fixture();assert.equal(await f.service.remove(clubId,noticeId,original),'deleted');assert.deepEqual(writes(f),[{path:`/clubs/${clubId}/notices/${noticeId}`,method:'DELETE'}]);
 const g=fixture();g.state.notice=null;assert.equal(await g.service.remove(clubId,noticeId,original),'absent');assert.equal(writes(g).length,0);
});
test('lost applied delete reads absence; lost unapplied, changed or unreadable deletes are not repeated',async()=>{
 for(const mode of ['applied','unchanged','changed','unreadable']){let wrote=false;const f=fixture((u,o,s)=>{if(o.method==='DELETE'){wrote=true;if(mode==='applied')s.notice=null;if(mode==='changed')s.notice.title='새 내용';return new ApiError('network');}if(wrote&&mode==='unreadable')return new ApiError('network');});
  if(mode==='applied')assert.equal(await f.service.remove(clubId,noticeId,original),'absent');else await assert.rejects(f.service.remove(clubId,noticeId,original),{reason:mode==='changed'?'changed':'uncertain'});assert.equal(writes(f).length,1);}
});
test('delete recovery does not claim absence after membership or write access is revoked',async()=>{
 const f=fixture((u,o,s)=>{if(o.method==='DELETE'){s.notice=null;s.permissions=[];return new ApiError('network');}});await assert.rejects(f.service.remove(clubId,noticeId,original),{reason:'forbidden'});assert.equal(writes(f).length,1);
});
test('removed categories, invalid grapheme lengths and mismatched original IDs send no mutation',async()=>{
 const f=fixture();f.state.categories[0].subcategories=[];await assert.rejects(f.service.save(clubId,noticeId,original,{...original,title:'수정'}),{reason:'category-changed'});assert.equal(writes(f).length,0);
 const g=fixture();await assert.rejects(g.service.save(clubId,noticeId,original,{...original,title:'가'.repeat(51)}),{reason:'invalid'});assert.equal(g.calls.length,0);
 await assert.rejects(g.service.remove(clubId,noticeId,{...original,id:id(9)}),{kind:'response'});assert.equal(g.calls.length,0);
});
function mockFixture(){const data=new Map();let fail=false;const store={async getItem(key){return data.get(key)??null;},async setItem(key,value){if(fail&&key===MOCK_NOTICE_CONTENT_KEY)throw new Error('disk');data.set(key,value);}};
 const intents={get:async club=>data.get('intent/'+club)??null,set:async(club,value)=>{if(value===null)data.delete('intent/'+club);else data.set('intent/'+club,value);}};
 return{data,store,service:createMockNoticeManagementService(store),notices:createMockNoticeService(store),compose:createMockNoticeComposeService(store,intents),intents,fail:value=>{fail=value;}};
}
test('Mock seeded edits persist as a single overlay and preserve author, dates, read state and study records',async()=>{
 const f=mockFixture(),club='mock-club-study',id=club+'-reading';f.data.set('@tamagochi/mock-study/v1','keep-study');const board=await f.service.getBoard(club,id);assert.equal(f.data.has('@tamagochi/mock-notice-reads/v1'),false);
 await f.notices.markRead(club,id);const result=await f.service.save(club,id,board.notice,{...board.notice,title:'새 제목',subcategoryId:undefined});assert.equal(result.notificationState,'NONE');assert.equal(result.authorUserId,'mock-lead');assert.equal(result.createdAt,board.notice.createdAt);
 const restored=await createMockNoticeManagementService(f.store).getBoard(club,id);assert.equal(restored.notice.title,'새 제목');assert.equal(restored.notice.read,true);assert.equal(restored.notice.subcategoryId,undefined);assert.equal((await f.notices.getBoard(club,{})).page.items.length,4);assert.equal((await f.notices.getBoard('mock-club-pixel',{})).page.items.length,4);assert.equal(f.data.get('@tamagochi/mock-study/v1'),'keep-study');
});
test('Mock seeded deletion survives reload and new publication never resurrects the deleted seed',async()=>{
 const f=mockFixture(),club='mock-club-study',id=club+'-welcome',before=await f.notices.getUnreadCount(club),board=await f.service.getBoard(club,id);
 await f.service.remove(club,id,board.notice);await assert.rejects(createMockNoticeManagementService(f.store).getBoard(club,id),{reason:'missing'});assert.equal(await f.notices.getUnreadCount(club),before-1);
 await f.compose.create(club,{categoryId:'mock-general',title:'새 공지',body:'내용',pinned:false,notify:false});assert.equal((await f.notices.getBoard(club,{})).page.items.some(one=>one.id===id),false);assert.equal(JSON.parse(f.data.get(MOCK_NOTICE_CONTENT_KEY)).deleted.length,1);
});
test('Mock authored edits and removal stay in sync with the publishing receipt without changing notification state',async()=>{
 const f=mockFixture(),club='mock-club-study',created=await f.compose.create(club,{categoryId:'mock-general',title:'새 공지',body:'본문',pinned:false,notify:true});
 await f.service.save(club,created.id,created,{...created,pinned:true});assert.equal((await f.compose.getBoard(club)).status.notice.pinned,true);assert.equal((await f.compose.getBoard(club)).status.notice.notificationState,'PENDING');await f.service.remove(club,created.id,(await f.service.getBoard(club,created.id)).notice);assert.equal((await f.compose.getBoard(club)).status.kind,'uncertain');
});
test('Mock ordinary users, storage failures and corrupt tombstones never change or erase existing content',async()=>{
 const f=mockFixture();await assert.rejects(f.service.getBoard('mock-club-pixel','mock-club-pixel-welcome'),{reason:'forbidden'});
 const club='mock-club-study',id=club+'-welcome',board=await f.service.getBoard(club,id);f.fail(true);await assert.rejects(f.service.save(club,id,board.notice,{...board.notice,title:'수정'}),{reason:'uncertain'});assert.equal(f.data.has(MOCK_NOTICE_CONTENT_KEY),false);await assert.rejects(f.service.remove(club,id,board.notice),{reason:'uncertain'});
 f.fail(false);const raw=JSON.stringify({version:1,notices:[],deleted:[{clubId:club}]});f.data.set(MOCK_NOTICE_CONTENT_KEY,raw);await assert.rejects(f.notices.getBoard(club,{}),{reason:'storage'});assert.equal(f.data.get(MOCK_NOTICE_CONTENT_KEY),raw);
});
