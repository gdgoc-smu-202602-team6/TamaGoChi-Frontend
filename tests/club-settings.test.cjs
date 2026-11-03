const {test}=require('node:test'),assert=require('node:assert/strict');
const {createApiClubSettingsService}=require('../.expo/tests/services/api/club-settings-service.js');
const {createHttpClient,ApiError}=require('../.expo/tests/services/api/http-client.js');
const {createMockClubSettingsService}=require('../.expo/tests/mocks/club-settings.js');
const {MOCK_CLUB_SETTINGS_KEY}=require('../.expo/tests/mocks/club-settings-data.js');
const {createMockClubJoinService}=require('../.expo/tests/mocks/club-join.js');
const {createMockClubCreateService}=require('../.expo/tests/mocks/club-create.js');
const {createMockNoticeService}=require('../.expo/tests/mocks/notices.js');
const id='00000001-1111-4111-8111-111111111111';
function fixture(override=()=>undefined){
 const calls=[],state={permissions:['club.update'],club:{id,name:'공부 모임',memberCount:12,inviteCode:'STUDY001',createdAt:'2026-11-01T00:00:00Z'},revision:1,etag:true};
 const apply=(options)=>{if(options.method==='PATCH')state.club.name=options.body.name;else state.club.inviteCode='CODE'+String(state.revision+1).padStart(4,'0');state.revision++;return state.club;};
 const client={async request(path,options={}){calls.push({path,...options});let data=await override(path,options,state,apply);if(data instanceof Error)throw data;if(data===undefined)data=path.endsWith('/permissions')?{items:state.permissions}:options.method?apply(options):state.club;return{data:JSON.parse(JSON.stringify(data)),headers:new Headers(state.etag?{ETag:`"${state.revision}"`}:{})};}};
 return {calls,state,service:createApiClubSettingsService(client)};
}
const writes=f=>f.calls.filter(c=>c.method);
const rename=(expected,name='  새 모임  ')=>({kind:'rename',expected,name});
function mock(){const data=new Map(),writes=[];let fail=false;const storage={getItem:async key=>data.get(key)??null,setItem:async(key,value)=>{if(fail&&key===MOCK_CLUB_SETTINGS_KEY)throw new Error('storage');writes.push(key);data.set(key,value);}};return{data,writes,storage,service:createMockClubSettingsService(storage),fail:value=>{fail=value;}};}

test('club settings require club.update, validate IDs first and never load codes for other roles',async()=>{
 for(const permissions of [[],['notices.write'],['noticeCategories.manage'],['members.manage']]){const f=fixture();f.state.permissions=permissions;await assert.rejects(f.service.get(id),{reason:'forbidden'});assert.equal(f.calls.length,1);}
 const f=fixture();await assert.rejects(f.service.get('../clubs'),{kind:'response'});assert.equal(f.calls.length,0);
});
test('settings validate exact club, code, date, member count and strong ETag',async()=>{
 for(const change of [s=>s.club.id='other',s=>s.club.inviteCode='BAD',s=>delete s.club.inviteCode,s=>s.club.name=' ',s=>s.club.createdAt='bad',s=>s.club.memberCount=-1]){const f=fixture();change(f.state);await assert.rejects(f.service.get(id),{kind:'response'});}
 const f=fixture();assert.equal((await f.service.get(id)).etag,'"1"');f.state.etag=false;assert.equal((await f.service.get(id)).etag,undefined);
});
test('invalid and cross-club name actions never make a request; grapheme names are trimmed',async()=>{
 const f=fixture(),expected=await f.service.get(id);f.calls.length=0;
 for(const name of [' ','가'.repeat(21)])await assert.rejects(f.service.mutate(id,rename(expected,name)),{reason:'invalid'});
 await assert.rejects(f.service.mutate(id,rename({...expected,id:'other'})),{reason:'invalid'});assert.equal(f.calls.length,0);
 await f.service.mutate(id,rename(expected,' 👨‍👩‍👧‍👦'.trim().repeat(20)+' '));assert.equal(writes(f)[0].body.name,'👨‍👩‍👧‍👦'.repeat(20));
});
test('name update sends only trimmed name and the fresh ETag; HTTP client forwards If-Match',async()=>{
 const f=fixture(),expected=await f.service.get(id),next=await f.service.mutate(id,rename(expected));assert.equal(next.name,'새 모임');assert.deepEqual(writes(f),[{path:'/clubs/'+id,method:'PATCH',body:{name:'새 모임'},ifMatch:'"1"'}]);
 let sent;const client=createHttpClient({baseUrl:'https://fixture.invalid',fetcher:async(_u,o)=>{sent=o;return new Response('{}');}});await client.request('/clubs/'+id,{method:'PATCH',body:{name:'모임'},ifMatch:'"9"',token:'fake'});assert.equal(sent.headers.get('if-match'),'"9"');assert.equal(sent.headers.get('authorization'),'Bearer fake');
});
test('missing exposed ETag uses a fresh comparison without inventing a revision',async()=>{const f=fixture();f.state.etag=false;const before=await f.service.get(id);await f.service.mutate(id,rename(before));assert.equal(writes(f)[0].ifMatch,undefined);});
test('a current desired name is a read-only success and duplicate queued saves do not repeat PATCH',async()=>{const f=fixture(),before=await f.service.get(id);await Promise.all([f.service.mutate(id,rename(before)),f.service.mutate(id,rename(before))]);assert.equal(writes(f).length,1);});
test('external name, invite code or ETag changes reject stale edits and rotations before writing',async()=>{
 for(const change of [s=>s.club.name='다른 이름',s=>s.club.inviteCode='OTHER001',s=>s.revision++])for(const kind of ['rename','rotate']){const f=fixture(),before=await f.service.get(id);change(f.state);await assert.rejects(f.service.mutate(id,{kind,name:'새 모임',expected:before}),{reason:'changed'});assert.equal(writes(f).length,0);}
});
test('412 and definite HTTP rejections never retry a mutation',async()=>{for(const status of [400,401,403,404,412,429]){const f=fixture((_p,o)=>o.method?new ApiError('http',status):undefined),before=await f.service.get(id);await assert.rejects(f.service.mutate(id,rename(before)),status===412?{reason:'changed'}:{status});assert.equal(writes(f).length,1);}});
test('rotation sends one bodyless POST, reads new code and rejects a queued second rotation',async()=>{const f=fixture(),before=await f.service.get(id);const results=await Promise.allSettled([f.service.mutate(id,{kind:'rotate',expected:before}),f.service.mutate(id,{kind:'rotate',expected:before})]);assert.equal(results[0].value.inviteCode,'CODE0002');assert.equal(results[1].reason.reason,'changed');assert.deepEqual(writes(f),[{path:'/clubs/'+id+':regenerateInviteCode',method:'POST'}]);});
test('lost rename and rotation responses confirm current state without replay',async()=>{for(const kind of ['rename','rotate']){const f=fixture((_p,o,_s,apply)=>{if(o.method){apply(o);return new ApiError('network');}}),before=await f.service.get(id);const actual=await f.service.mutate(id,{kind,name:'새 이름',expected:before});assert.equal(kind==='rename'?actual.name:actual.inviteCode,kind==='rename'?'새 이름':'CODE0002');assert.equal(writes(f).length,1);}});
test('5xx and malformed receipts recover by reading the exact club',async()=>{for(const malformed of [false,true]){const f=fixture((_p,o,_s,apply)=>{if(o.method){apply(o);return malformed?{}:new ApiError('http',500);}}),before=await f.service.get(id);assert.equal((await f.service.mutate(id,rename(before))).name,'새 모임');assert.equal(writes(f).length,1);}});
test('unapplied and unreadable outcomes remain uncertain; manual reads and recreation never send POST',async()=>{
 const f=fixture((_p,o)=>o.method?new ApiError('timeout'):undefined),before=await f.service.get(id);await assert.rejects(f.service.mutate(id,{kind:'rotate',expected:before}),{reason:'uncertain'});await f.service.get(id);assert.equal(writes(f).length,1);
 let unreadable=false;const g=fixture((_p,o,_s,apply)=>{if(o.method){apply(o);unreadable=true;}else if(unreadable)return new ApiError('network');}),old=await g.service.get(id);await assert.rejects(g.service.mutate(id,rename(old)),{reason:'uncertain'});unreadable=false;assert.equal((await g.service.get(id)).name,'새 모임');assert.equal(writes(g).length,1);
});
test('permission revocation prevents a write or removes access during result confirmation',async()=>{
 const f=fixture(),before=await f.service.get(id);f.state.permissions=[];await assert.rejects(f.service.mutate(id,rename(before)),{reason:'forbidden'});assert.equal(writes(f).length,0);
 const g=fixture((_p,o,s,apply)=>{if(o.method){apply(o);s.permissions=[];}}),old=await g.service.get(id);await assert.rejects(g.service.mutate(id,rename(old)),{reason:'forbidden'});assert.equal(writes(g).length,1);
});
test('Mock settings deny ordinary memberships and do not initialize data during reads',async()=>{const f=mock();await assert.rejects(f.service.get('mock-club-pixel'),{reason:'forbidden'});assert.equal((await f.service.get('mock-club-study')).inviteCode,'STUDY001');assert.equal(f.writes.length,0);});
test('Mock renamed clubs are shared by notice lists and invite-code searches, retaining selection IDs and study data',async()=>{
 const f=mock();f.data.set('@tamagochi/mock-study/v1','unchanged');const before=await f.service.get('mock-club-study');await f.service.mutate(before.id,rename(before));const notices=createMockNoticeService(f.storage),join=createMockClubJoinService(f.storage);assert.equal((await notices.listMyClubs())[0].name,'새 모임');assert.equal((await join.findClub('STUDY001')).name,'새 모임');assert.equal((await createMockClubSettingsService(f.storage).get(before.id)).name,'새 모임');assert.equal(f.data.get('@tamagochi/mock-study/v1'),'unchanged');assert.ok(f.writes.every(key=>key===MOCK_CLUB_SETTINGS_KEY));
});
test('Mock rotated invite codes survive reload, invalidate old lookup and preserve another club',async()=>{const f=mock(),join=createMockClubJoinService(f.storage),before=await f.service.get('mock-club-study'),next=await f.service.mutate(before.id,{kind:'rotate',expected:before});assert.notEqual(next.inviteCode,before.inviteCode);assert.equal(await join.findClub(before.inviteCode),null);assert.equal((await join.findClub(next.inviteCode)).id,before.id);assert.equal((await join.findClub('PIXEL001')).name,'픽셀 메이커스');assert.equal((await createMockClubSettingsService(f.storage).get(before.id)).inviteCode,next.inviteCode);});
test('created Mock owner settings are shared with creation result recovery and lookup',async()=>{const f=mock(),create=createMockClubCreateService(f.storage),created=await create.create({name:'만든 모임',parts:[{name:'공부',color:'GREEN'}],myPartName:'공부'}),before=await f.service.get(created.id);await f.service.mutate(created.id,rename(before));const renamed=await f.service.get(created.id),next=await f.service.mutate(created.id,{kind:'rotate',expected:renamed});assert.equal((await create.getStatus()).club.inviteCode,next.inviteCode);assert.equal((await create.getStatus()).club.name,'새 모임');const join=createMockClubJoinService(f.storage);assert.equal(await join.findClub(created.inviteCode),null);assert.equal((await join.findClub(next.inviteCode)).name,'새 모임');});
test('Mock storage failure cannot confirm a mutation, erase existing data or replay it on read',async()=>{const f=mock(),before=await f.service.get('mock-club-study');await f.service.mutate(before.id,rename(before));const old=await f.service.get(before.id),raw=f.data.get(MOCK_CLUB_SETTINGS_KEY);f.fail(true);await assert.rejects(f.service.mutate(before.id,{kind:'rotate',expected:old}),{reason:'uncertain'});assert.equal(f.data.get(MOCK_CLUB_SETTINGS_KEY),raw);f.fail(false);assert.equal((await f.service.get(before.id)).inviteCode,old.inviteCode);});
test('corrupt Mock registry is reported without overwriting or deleting it',async()=>{for(const raw of ['bad',JSON.stringify({version:1,clubs:{'mock-club-study':{name:'모임',inviteCode:'BAD',revision:1}}})]){const f=mock();f.data.set(MOCK_CLUB_SETTINGS_KEY,raw);await assert.rejects(f.service.get('mock-club-study'),{reason:'storage'});assert.equal(f.data.get(MOCK_CLUB_SETTINGS_KEY),raw);assert.equal(f.writes.length,0);}});
