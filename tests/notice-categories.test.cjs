const {test}=require('node:test'),assert=require('node:assert/strict');
const {createApiNoticeCategoryService}=require('../.expo/tests/services/api/notice-category-service.js');
const {createMockNoticeCategoryService}=require('../.expo/tests/mocks/notice-categories.js');
const {createMockNoticeService}=require('../.expo/tests/mocks/notices.js');
const {createMockNoticeComposeService}=require('../.expo/tests/mocks/notice-compose.js');
const {createMockNoticeManagementService}=require('../.expo/tests/mocks/notice-management.js');
const {createMockClubCreateService}=require('../.expo/tests/mocks/club-create.js');
const {MOCK_NOTICE_CATEGORIES_KEY}=require('../.expo/tests/mocks/notice-categories-data.js');
const {ApiError}=require('../.expo/tests/services/api/http-client.js');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`,clubId=id(1),general=id(10),study=id(11),subId=id(12);
const add={kind:'add-category',name:'  새 분류  ',color:'PURPLE'};
function fixture(override=()=>undefined){
 const calls=[],state={permissions:['noticeCategories.manage'],categories:[{id:general,name:'전체공지',color:'RED',preset:true,subcategories:[]},{id:study,name:'스터디',color:'GREEN',preset:false,subcategories:[{id:subId,name:'함께 읽기'}]}],sequence:100};
 function apply(u,o){const bits=u.pathname.split('/'),category=state.categories.find(c=>c.id===bits[4]);
  if(o.method==='POST'){if(bits.length===4){const one={id:id(++state.sequence),...o.body,preset:false,subcategories:[]};state.categories.push(one);return one;}if(!category)throw new ApiError('http',404);const sub={id:id(++state.sequence),...o.body};category.subcategories.push(sub);return sub;}
  if(!category)throw new ApiError('http',404);if(bits.length===5)state.categories=state.categories.filter(c=>c!==category);else category.subcategories=category.subcategories.filter(s=>s.id!==bits[6]);return null;
 }
 const client={async request(path,options={}){calls.push({path,...options});const u=new URL(path,'https://fixture.invalid'),special=await override(u,options,state,apply);if(special instanceof Error)throw special;let data=special;
  if(data===undefined){if(u.pathname.endsWith('/permissions'))data={items:state.permissions};else if(options.method)data=apply(u,options);else if(u.pathname.endsWith('/noticeCategories'))data={items:state.categories};else data={id:clubId,name:'분류 모임',memberCount:12};}
  return{data:data==null?data:JSON.parse(JSON.stringify(data)),headers:new Headers()};}};
 return{calls,state,service:createApiNoticeCategoryService(client),apply};
}
const writes=f=>f.calls.filter(c=>c.method);
test('category management needs its exact permission before loading club data',async()=>{
 for(const permissions of [[],['notices.write'],['applications.decide'],['members.manage']]){const f=fixture();f.state.permissions=permissions;await assert.rejects(f.service.getBoard(clubId),{reason:'forbidden'});assert.equal(f.calls.length,1);}
 const f=fixture();await assert.rejects(f.service.getBoard('../other'),{kind:'response'});assert.equal(f.calls.length,0);
});
test('managed category DTOs preserve preset and reject broken IDs, colors, names and subcategory identities',async()=>{
 const f=fixture();assert.equal((await f.service.getBoard(clubId)).categories[0].preset,true);
 for(const change of [s=>delete s.categories[0].preset,s=>s.categories[0].color='UNKNOWN',s=>s.categories[0].id='bad',s=>s.categories[0].name='',s=>s.categories.push({...s.categories[0],id:id(99)}),s=>s.categories[0].subcategories.push({...s.categories[1].subcategories[0]}),s=>s.categories[1].subcategories.push({id:id(99),name:'함께 읽기'})]){const bad=fixture();change(bad.state);await assert.rejects(bad.service.getBoard(clubId),{kind:'response'});}
});
test('names use trimmed 1-10 graphemes and invalid names/colors never send a request',async()=>{
 for(const action of [{...add,name:' '},{...add,name:'가'.repeat(11)},{...add,color:'BLACK'}]){const f=fixture();await assert.rejects(f.service.mutate(clubId,action),{reason:'invalid'});assert.equal(f.calls.length,0);}
 const f=fixture();await f.service.mutate(clubId,{...add,name:'👨‍👩‍👧‍👦'.repeat(10)});assert.equal(writes(f).length,1);
});
test('category creation sends only trimmed name and palette color, then reads the authoritative list',async()=>{
 const f=fixture(),board=await f.service.mutate(clubId,add);assert.ok(board.categories.some(c=>c.name==='새 분류'&&c.color==='PURPLE'));
 assert.deepEqual(writes(f),[{path:`/clubs/${clubId}/noticeCategories`,method:'POST',body:{name:'새 분류',color:'PURPLE'}}]);assert.equal(f.calls.at(-1).method,undefined);
});
test('subcategory creation posts only its name under the exact parent and duplicates are scoped to siblings',async()=>{
 const f=fixture(),action={kind:'add-subcategory',categoryId:study,name:'  LLM  '};await f.service.mutate(clubId,action);assert.deepEqual(writes(f)[0],{path:`/clubs/${clubId}/noticeCategories/${study}/subcategories`,method:'POST',body:{name:'LLM'}});
 await f.service.mutate(clubId,{...action,categoryId:general});await assert.rejects(f.service.mutate(clubId,action),{reason:'duplicate'});assert.equal(writes(f).length,2);
});
test('duplicates and missing parents are detected before POST and permissions are rechecked for every operation',async()=>{
 const f=fixture();await assert.rejects(f.service.mutate(clubId,{...add,name:'전체공지'}),{reason:'duplicate'});await assert.rejects(f.service.mutate(clubId,{kind:'add-subcategory',categoryId:id(99),name:'LLM'}),{reason:'missing'});assert.equal(writes(f).length,0);
 await f.service.getBoard(clubId);f.state.permissions=[];await assert.rejects(f.service.mutate(clubId,add),{reason:'forbidden'});assert.equal(writes(f).length,0);
});
test('serialized double creation sends one POST and reports an existing sibling rather than creating a second',async()=>{
 const f=fixture(),results=await Promise.allSettled([f.service.mutate(clubId,add),f.service.mutate(clubId,add)]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.reason,'duplicate');assert.equal(writes(f).length,1);
});
test('preset categories cannot be deleted; confirmation snapshots detect newly added unseen subcategories',async()=>{
 const f=fixture(),board=await f.service.getBoard(clubId);await assert.rejects(f.service.mutate(clubId,{kind:'delete-category',category:board.categories[0]}),{reason:'preset'});
 f.state.categories[1].subcategories.push({id:id(99),name:'새 세부'});await assert.rejects(f.service.mutate(clubId,{kind:'delete-category',category:board.categories[1]}),{reason:'changed'});assert.equal(writes(f).length,0);
});
test('deletions use exact parent paths and no body; repeated already absent targets send no second DELETE',async()=>{
 const f=fixture(),board=await f.service.getBoard(clubId),action={kind:'delete-subcategory',categoryId:study,subcategory:board.categories[1].subcategories[0]};await Promise.all([f.service.mutate(clubId,action),f.service.mutate(clubId,action)]);
 assert.deepEqual(writes(f),[{path:`/clubs/${clubId}/noticeCategories/${study}/subcategories/${subId}`,method:'DELETE'}]);
 const next=await f.service.getBoard(clubId);await f.service.mutate(clubId,{kind:'delete-category',category:next.categories[1]});assert.equal(writes(f)[1].path,`/clubs/${clubId}/noticeCategories/${study}`);
});
test('409 duplicate-name, preset and in-use are distinct rejections with no automatic retry',async()=>{
 for(const [code,reason] of [['duplicate-name','duplicate'],['preset','preset'],['in-use','in-use']]){const f=fixture((u,o)=>o.method?new ApiError('http',409,code):undefined);await assert.rejects(f.service.mutate(clubId,add),{reason});assert.equal(writes(f).length,1);}
});
test('lost, timed-out or 500 applied POSTs are confirmed by the list without replaying the request',async()=>{
 for(const failure of [new ApiError('network'),new ApiError('timeout'),new ApiError('http',500)]){const f=fixture((u,o,s,apply)=>{if(o.method){apply(u,o);return failure;}});const board=await f.service.mutate(clubId,add);assert.ok(board.categories.some(c=>c.name==='새 분류'));assert.equal(writes(f).length,1);}
});
test('unapplied, differently colored, unreadable or malformed outcomes stay uncertain and do not replay POST',async()=>{
 for(const mode of ['unapplied','different','unreadable']){let wrote=false;const f=fixture((u,o,s,apply)=>{if(o.method){wrote=true;if(mode==='different')apply(u,{...o,body:{...o.body,color:'BLUE'}});return new ApiError('network');}if(wrote&&mode==='unreadable')return new ApiError('network');});await assert.rejects(f.service.mutate(clubId,add),{reason:'uncertain'});assert.equal(writes(f).length,1);}
 const f=fixture((u,o,s,apply)=>{if(o.method){const one=apply(u,o);return {...one,name:'잘못된 응답'};}});assert.ok((await f.service.mutate(clubId,add)).categories.some(c=>c.name==='새 분류'));assert.equal(writes(f).length,1);
});
test('delete response loss or a raced 404 reads actual absence without claiming or repeating a DELETE',async()=>{
 for(const failure of [new ApiError('network'),new ApiError('http',404)]){const f=fixture((u,o,s,apply)=>{if(o.method){apply(u,o);return failure;}}),board=await f.service.getBoard(clubId);assert.equal((await f.service.mutate(clubId,{kind:'delete-category',category:board.categories[1]})).categories.length,1);assert.equal(writes(f).length,1);}
});
test('permission revocation during recovery and definite 400 failures never become a false confirmation',async()=>{
 const f=fixture((u,o,s)=>{if(o.method){s.permissions=[];return new ApiError('network');}});await assert.rejects(f.service.mutate(clubId,add),{reason:'forbidden'});assert.equal(writes(f).length,1);
 const g=fixture((u,o)=>o.method?new ApiError('http',400):undefined);await assert.rejects(g.service.mutate(clubId,add),{status:400});assert.equal(writes(g).length,1);
});
function mockFixture(){const data=new Map();let fail=false;const store={async getItem(key){return data.get(key)??null;},async setItem(key,value){if(fail&&key===MOCK_NOTICE_CATEGORIES_KEY)throw new Error('disk');data.set(key,value);}};
 const intents={get:async id=>data.get('intent/'+id)??null,set:async(id,value)=>{if(value===null)data.delete('intent/'+id);else data.set('intent/'+id,value);}};
 return{data,store,service:createMockNoticeCategoryService(store),notices:createMockNoticeService(store),compose:createMockNoticeComposeService(store,intents),manage:createMockNoticeManagementService(store),fail:value=>{fail=value;}};
}
test('Mock category changes persist and are shared by list filters, publishing and editing without changing study data',async()=>{
 const f=mockFixture(),club='mock-club-study';f.data.set('@tamagochi/mock-study/v1','keep-study');const result=await f.service.mutate(club,add),added=result.categories.find(c=>c.name==='새 분류');await f.service.mutate(club,{kind:'add-subcategory',categoryId:added.id,name:'LLM'});
 assert.ok((await createMockNoticeCategoryService(f.store).getBoard(club)).categories.some(c=>c.id===added.id&&c.subcategories[0].name==='LLM'));
 assert.ok((await f.notices.getBoard(club,{})).categories.some(c=>c.id===added.id));assert.ok((await f.compose.getBoard(club)).categories.some(c=>c.id===added.id));assert.ok((await f.manage.getBoard(club,club+'-welcome')).categories.some(c=>c.id===added.id));assert.equal(f.data.get('@tamagochi/mock-study/v1'),'keep-study');assert.equal((await f.notices.getBoard('mock-club-pixel',{})).categories.length,3);
});
test('Mock preset and in-use category/subcategory deletions preserve existing records',async()=>{
 const f=mockFixture(),club='mock-club-study',board=await f.service.getBoard(club);await assert.rejects(f.service.mutate(club,{kind:'delete-category',category:board.categories.find(c=>c.preset)}),{reason:'preset'});await assert.rejects(f.service.mutate(club,{kind:'delete-category',category:board.categories.find(c=>c.id==='mock-study')}),{reason:'in-use'});await assert.rejects(f.service.mutate(club,{kind:'delete-subcategory',categoryId:'mock-study',subcategory:{id:'mock-reading',name:'함께 읽기'}}),{reason:'in-use'});assert.equal(f.data.has(MOCK_NOTICE_CATEGORIES_KEY),false);
});
test('Mock unused parent deletion removes its children and survives restart without touching notice storage',async()=>{
 const f=mockFixture(),club='mock-club-study',added=(await f.service.mutate(club,add)).categories.find(c=>c.name==='새 분류');await f.service.mutate(club,{kind:'add-subcategory',categoryId:added.id,name:'LLM'});const board=await f.service.getBoard(club);await f.service.mutate(club,{kind:'delete-category',category:board.categories.find(c=>c.id===added.id)});assert.ok(!(await createMockNoticeCategoryService(f.store).getBoard(club)).categories.some(c=>c.id===added.id));assert.equal(f.data.has('@tamagochi/mock-notice-content/v1'),false);
});
test('Mock actual notice references block deletion until the notice is removed',async()=>{
 const f=mockFixture(),club='mock-club-study',category=(await f.service.mutate(club,add)).categories.find(c=>c.name==='새 분류');const notice=await f.compose.create(club,{categoryId:category.id,title:'새 글',body:'본문',pinned:false,notify:false});await assert.rejects(f.service.mutate(club,{kind:'delete-category',category}),{reason:'in-use'});await f.manage.remove(club,notice.id,notice);await f.service.mutate(club,{kind:'delete-category',category});assert.ok(!(await f.notices.getBoard(club,{})).categories.some(c=>c.id===category.id));
});
test('Mock ordinary users are denied while a created-club owner manages its general category and children',async()=>{
 const f=mockFixture();await assert.rejects(f.service.getBoard('mock-club-pixel'),{reason:'forbidden'});const club=await createMockClubCreateService(f.store).create({name:'분류 모임',parts:[{name:'공부',color:'GREEN'}],myPartName:'공부'});let board=await f.service.getBoard(club.id);assert.equal(board.categories.length,1);assert.equal(board.categories[0].preset,true);board=await f.service.mutate(club.id,{kind:'add-subcategory',categoryId:board.categories[0].id,name:'소식'});await f.service.mutate(club.id,{kind:'delete-subcategory',categoryId:board.categories[0].id,subcategory:board.categories[0].subcategories[0]});assert.equal((await f.service.getBoard(club.id)).categories[0].subcategories.length,0);
});
test('Mock storage failures and corrupt registries never fabricate success or erase saved data',async()=>{
 const f=mockFixture(),club='mock-club-study';f.fail(true);await assert.rejects(f.service.mutate(club,add),{reason:'uncertain'});assert.equal(f.data.has(MOCK_NOTICE_CATEGORIES_KEY),false);f.fail(false);
 for(const raw of ['broken','{"version":2,"clubs":{}}','{"version":1,"clubs":{"mock-club-study":[{"id":"bad"}]}}']){f.data.set(MOCK_NOTICE_CATEGORIES_KEY,raw);await assert.rejects(f.service.getBoard(club),{reason:'storage'});assert.equal(f.data.get(MOCK_NOTICE_CATEGORIES_KEY),raw);}
});
