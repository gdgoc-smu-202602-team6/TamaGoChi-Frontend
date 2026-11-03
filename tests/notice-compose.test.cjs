const { test }=require('node:test'),assert=require('node:assert/strict');
const { createApiNoticeComposeService }=require('../.expo/tests/services/api/notice-compose-service.js');
const { createMockNoticeComposeService }=require('../.expo/tests/mocks/notice-compose.js');
const { createMockNoticeService }=require('../.expo/tests/mocks/notices.js');
const { createMockClubCreateService }=require('../.expo/tests/mocks/club-create.js');
const { validateNoticeCreate,normalizeNoticeCreate,noticeCharacterCount }=require('../.expo/tests/utils/notice-compose.js');
const { MOCK_NOTICE_CONTENT_KEY }=require('../.expo/tests/mocks/notice-content.js');
const { ApiError }=require('../.expo/tests/services/api/http-client.js');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`,clubId=id(1),otherId=id(2),categoryId=id(11),subId=id(12);
const input={categoryId,subcategoryId:subId,title:'  새 공지  ',body:'  첫 줄\n둘째 줄  ',pinned:true,notify:true};
function fixture(override=()=>undefined){
 const calls=[],data=new Map(),writes=[];let fail=null;
 const state={permissions:['notices.write'],categories:[{id:categoryId,name:'동적 분류',color:'PURPLE',subcategories:[{id:subId,name:'세부 분류'}]}],notices:[],posts:0};
 const store={get:async club=>{if(fail==='read')throw new Error('disk');return data.get(club)??null;},set:async(club,value)=>{if(fail==='write'||fail==='receipt'&&value?.includes('created'))throw new Error('disk');writes.push({club,value});if(value===null)data.delete(club);else data.set(club,value);}};
 const client={async request(path,options={}){calls.push({path,...options});const u=new URL(path,'https://fixture.invalid');const special=await override(u,options,state);if(special instanceof Error)throw special;
  let response=special;if(response===undefined){if(u.pathname.endsWith('/permissions'))response={items:state.permissions};else if(u.pathname.endsWith('/noticeCategories'))response={items:state.categories};
   else if(u.pathname.endsWith('/notices')&&options.method==='POST'){state.posts++;const body=options.body,one={id:id(100+state.posts),...body,notificationState:body.notify?'PENDING':'NONE',authorUserId:'me',createdAt:'2026-11-03T02:00:00Z',read:false};delete one.notify;state.notices.push(one);response={...one};}
   else if(u.pathname.includes('/notices/')){const one=state.notices.find(one=>one.id===u.pathname.split('/').at(-1));if(!one)throw new ApiError('http',404);response={...one};}
   else response={id:u.pathname.split('/')[2],name:'함께 공부',memberCount:12};}
  return{data:response,headers:new Headers()};}};
 const reopen=()=>createApiNoticeComposeService(client,store);
 return{state,calls,data,writes,store,reopen,service:reopen(),fail:value=>{fail=value;}};
}
test('notice input uses trimmed grapheme limits and retains body line breaks',()=>{
 assert.equal(noticeCharacterCount('👨‍👩‍👧‍👦e\u0301'),2);assert.equal(validateNoticeCreate({...input,title:'가'.repeat(50),body:'나'.repeat(2000)}),null);
 for(const change of [{title:'가'.repeat(51)},{body:'나'.repeat(2001)},{title:' \n '},{body:' \t '},{categoryId:''},{notify:'yes'}])assert.ok(validateNoticeCreate({...input,...change}));
 assert.deepEqual(normalizeNoticeCreate(input),{...input,title:'새 공지',body:'첫 줄\n둘째 줄'});
 assert.ok(!('subcategoryId' in normalizeNoticeCreate({...input,subcategoryId:''})));
});
test('write permission is required before categories, content or intent storage is read',async()=>{
 for(const permissions of [[],['applications.decide'],['members.manage']]){const f=fixture();f.state.permissions=permissions;f.fail('read');await assert.rejects(f.service.getBoard(clubId),{reason:'forbidden'});assert.equal(f.calls.length,1);assert.ok(f.calls[0].path.endsWith('/permissions'));}
 const invalid=fixture();await assert.rejects(invalid.service.getBoard('../other'),{kind:'response'});assert.equal(invalid.calls.length,0);
});
test('the board uses current club categories and rejects malformed context data',async()=>{
 const f=fixture(),board=await f.service.getBoard(clubId);assert.equal(board.club.name,'함께 공부');assert.equal(board.categories[0].subcategories[0].name,'세부 분류');assert.equal(board.status.kind,'ready');
 f.state.categories[0].color='UNKNOWN';await assert.rejects(f.service.getBoard(clubId),{kind:'response'});
 const wrong=fixture(u=>u.pathname===`/clubs/${clubId}`?{id:otherId,name:'다른 동아리',memberCount:1}:undefined);await assert.rejects(wrong.service.getBoard(clubId),{kind:'response'});
});
test('create rechecks permissions and current category relations before recording or sending a request',async()=>{
 const f=fixture();await f.service.getBoard(clubId);f.state.permissions=[];await assert.rejects(f.service.create(clubId,input),{reason:'forbidden'});assert.equal(f.writes.length,0);
 f.state.permissions=['notices.write'];f.state.categories[0].subcategories=[];await assert.rejects(f.service.create(clubId,input),{reason:'category-changed'});assert.equal(f.writes.length,0);assert.equal(f.state.posts,0);
 await assert.rejects(f.service.create(clubId,{...input,title:' '}),{reason:'invalid'});
});
test('create sends only normalized contract fields and writes intent before the single POST',async()=>{
 const f=fixture((u,o)=>{if(o.method==='POST')assert.equal(JSON.parse(f.data.get(clubId)).kind,'pending');});
 const results=await Promise.allSettled([f.service.create(clubId,input),f.service.create(clubId,input)]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.reason,'already-created');assert.equal(f.state.posts,1);
 assert.deepEqual(f.calls.find(call=>call.method==='POST'),{path:`/clubs/${clubId}/notices`,method:'POST',body:{...input,title:'새 공지',body:'첫 줄\n둘째 줄'}});
 const pending=JSON.parse(f.writes[0].value);assert.equal(pending.version,1);assert.equal(pending.kind,'pending');assert.equal(typeof pending.intentId,'string');assert.deepEqual(Object.keys(pending).sort(),['intentId','kind','version']);assert.deepEqual(JSON.parse(f.data.get(clubId)),{version:1,kind:'created',noticeId:id(101)});
});
test('the created receipt restores by exact ID and notification state is freshly queried without resending',async()=>{
 const f=fixture();await f.service.create(clubId,input);for(const notificationState of ['PENDING','SENT','FAILED']){f.state.notices[0].notificationState=notificationState;const board=await f.reopen().getBoard(clubId);assert.equal(board.status.notice.notificationState,notificationState);}
 assert.equal(f.state.posts,1);assert.ok(f.calls.some(call=>call.path===`/clubs/${clubId}/notices/${id(101)}`));
});
test('non-notifying notices omit absent subcategory and never claim a notification was sent',async()=>{
 const f=fixture(),notice=await f.service.create(clubId,{...input,notify:false,subcategoryId:undefined});assert.equal(notice.notificationState,'NONE');assert.ok(!('subcategoryId' in f.calls.find(call=>call.method==='POST').body));
});
test('definite request rejection permits an explicit retry while uncertain responses retain the intent',async()=>{
 for(const status of [400,401,403,404,422]){const f=fixture((u,o)=>o.method==='POST'?new ApiError('http',status):undefined);await assert.rejects(f.service.create(clubId,input),{status});assert.equal(f.data.has(clubId),false);}
 for(const failure of [new ApiError('network'),new ApiError('timeout'),new ApiError('http',500)]){const f=fixture((u,o)=>o.method==='POST'?failure:undefined);await assert.rejects(f.service.create(clubId,input),{reason:'uncertain'});assert.equal((await f.reopen().getBoard(clubId)).status.kind,'uncertain');await assert.rejects(f.reopen().create(clubId,input),{reason:'uncertain'});assert.equal(f.calls.filter(c=>c.method==='POST').length,1);}
});
test('a saved request with a lost response is not guessed from matching titles or replayed after restart',async()=>{
 const f=fixture((u,o,s)=>{if(o.method==='POST'){s.notices.push({id:id(99),...o.body,read:false,createdAt:'2026-11-03T02:00:00Z',notificationState:'PENDING'});return new ApiError('network');}});
 await assert.rejects(f.service.create(clubId,input),{reason:'uncertain'});assert.equal((await f.reopen().getBoard(clubId)).status.kind,'uncertain');assert.equal(f.state.notices.length,1);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
});
test('malformed or mismatched successful receipts stay uncertain',async()=>{
 for(const change of [{title:'다른 제목'},{body:'다른 내용'},{categoryId:otherId},{subcategoryId:undefined},{pinned:false},{notificationState:'NONE'},{notificationState:'UNKNOWN'}]){
  const f=fixture((u,o)=>o.method==='POST'?{id:id(100),...o.body,read:false,createdAt:'2026-11-03T02:00:00Z',notificationState:'PENDING',...change}:undefined);
  await assert.rejects(f.service.create(clubId,input),{reason:'uncertain'});assert.equal((await f.service.getBoard(clubId)).status.kind,'uncertain');
 }
});
test('failed intent persistence sends no POST; corrupt journals are never erased',async()=>{
 const f=fixture();f.fail('write');await assert.rejects(f.service.create(clubId,input),{reason:'storage'});assert.equal(f.state.posts,0);
 f.fail(null);for(const raw of ['broken','{}','{"version":1,"kind":"created"}']){f.data.set(clubId,raw);await assert.rejects(f.service.getBoard(clubId),{reason:'storage'});assert.equal(f.data.get(clubId),raw);}
});
test('receipt-save failure keeps the current confirmed result and durable uncertainty after restart',async()=>{
 const f=fixture();f.fail('receipt');const one=await f.service.create(clubId,input);assert.equal(one.id,id(101));assert.equal((await f.service.getBoard(clubId)).status.kind,'created');assert.equal((await f.reopen().getBoard(clubId)).status.kind,'uncertain');assert.equal(f.state.posts,1);
});
test('deleted or inaccessible stored notices can be explicitly reset; state checks and reset never POST',async()=>{
 const f=fixture();await f.service.create(clubId,input);f.state.notices=[];assert.equal((await f.reopen().getBoard(clubId)).status.kind,'uncertain');await f.service.reset(clubId);assert.equal((await f.service.getBoard(clubId)).status.kind,'ready');assert.equal(f.state.posts,1);
 f.state.permissions=[];await assert.rejects(f.service.reset(clubId),{reason:'forbidden'});
});
test('another tab pending intent never reuses an earlier in-memory receipt from this tab',async()=>{
 const f=fixture();f.fail('receipt');await f.service.create(clubId,input);f.data.set(clubId,JSON.stringify({version:1,kind:'pending',intentId:'other-tab-request'}));
 assert.equal((await f.service.getBoard(clubId)).status.kind,'uncertain');assert.equal(f.state.posts,1);
});
test('journals are scoped by club and separate account stores',async()=>{
 const f=fixture();await f.service.create(clubId,input);assert.equal((await f.service.getBoard(otherId)).status.kind,'ready');
 const other=fixture();assert.equal((await other.service.getBoard(clubId)).status.kind,'ready');assert.equal(other.calls.some(c=>c.path.includes('/notices/')),false);
});
function mockFixture(){const data=new Map(),store={async getItem(key){return data.get(key)??null;},async setItem(key,value){data.set(key,value);}};
 const intents={get:async club=>data.get('intent/'+club)??null,set:async(club,value)=>{if(value===null)data.delete('intent/'+club);else data.set('intent/'+club,value);}};
 return{data,store,intents,compose:createMockNoticeComposeService(store,intents),notices:createMockNoticeService(store)};}
test('Mock publication persists, sorts pinned notices and shares unread/read state without altering study data',async()=>{
 const f=mockFixture();f.data.set('@tamagochi/mock-study/v1','keep-study');const before=await f.notices.getBoard('mock-club-study',{});
 const one=await f.compose.create('mock-club-study',{...input,categoryId:'mock-study',subcategoryId:'mock-reading'});assert.equal(one.notificationState,'PENDING');
 const restored=await createMockNoticeComposeService(f.store,f.intents).getBoard('mock-club-study');assert.equal(restored.status.notice.id,one.id);
 const board=await f.notices.getBoard('mock-club-study',{});assert.equal(board.page.items[0].id,one.id);assert.equal(board.unreadCount,before.unreadCount+1);assert.equal(board.authors['mock-me'],'나');
 await f.notices.markRead('mock-club-study',one.id);assert.equal((await f.compose.getBoard('mock-club-study')).status.notice.read,true);assert.equal((await f.notices.getBoard('mock-club-study',{})).unreadCount,before.unreadCount);assert.equal(f.data.get('@tamagochi/mock-study/v1'),'keep-study');assert.equal((await f.notices.getBoard('mock-club-pixel',{})).page.items.length,4);
});
test('Mock ordinary memberships cannot write, and created-club owners use their empty general board',async()=>{
 const f=mockFixture();await assert.rejects(f.compose.getBoard('mock-club-pixel'),{reason:'forbidden'});const created=await createMockClubCreateService(f.store).create({name:'새 공지 모임',parts:[{name:'개발',color:'BLUE'}],myPartName:'개발'});
 const context=await f.compose.getBoard(created.id);assert.equal(context.categories.length,1);const one=await f.compose.create(created.id,{...input,categoryId:context.categories[0].id,subcategoryId:undefined,notify:false});
 assert.equal(one.notificationState,'NONE');assert.equal((await f.notices.getBoard(created.id,{})).page.items.length,1);
});
test('Mock content save failure and corruption never fabricate a successful notice or clear records',async()=>{
 const f=mockFixture(),failed={...f.store,setItem:async()=>{throw new Error('disk');}},compose=createMockNoticeComposeService(failed,f.intents);
 await assert.rejects(compose.create('mock-club-study',{...input,categoryId:'mock-general',subcategoryId:undefined}),{reason:'uncertain'});assert.equal(f.data.has(MOCK_NOTICE_CONTENT_KEY),false);
 f.data.set(MOCK_NOTICE_CONTENT_KEY,'broken');await assert.rejects(f.notices.getBoard('mock-club-study',{}),{reason:'storage'});assert.equal(f.data.get(MOCK_NOTICE_CONTENT_KEY),'broken');
});
