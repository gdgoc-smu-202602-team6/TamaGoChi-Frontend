const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiClubAdminService } = require('../.expo/tests/services/api/club-admin-service.js');
const { createMockClubAdminService } = require('../.expo/tests/mocks/club-admin.js');
const { createMockClubJoinService } = require('../.expo/tests/mocks/club-join.js');
const { createMockClubCreateService } = require('../.expo/tests/mocks/club-create.js');
const { MOCK_CLUB_REVIEW_KEY } = require('../.expo/tests/mocks/club-review-data.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');

const id = n => `${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const clubId=id(1),partId=id(2),applicationId=id(3),secondId=id(4);
const application={id:applicationId,clubId,userId:'applicant-a',nickname:'하늘',email:'sky@example.com',partId,state:'PENDING',createdAt:'2026-11-03T01:00:00Z'};
function fixture(override=()=>undefined){
  const calls=[],state={permissions:['applications.decide'],club:{id:clubId,name:'함께 공부',memberCount:5},parts:[{id:partId,name:'동적 파트',color:'PURPLE'}],applications:[{...application},{...application,id:secondId,userId:'applicant-b',nickname:'나무'}]};
  const client={async request(path,options={}){calls.push({path,...options});const url=new URL(path,'https://fixture.invalid');const special=await override(url,options,state);if(special instanceof Error)throw special;let data=special;
    if(data===undefined){if(url.pathname.endsWith('/permissions'))data={items:state.permissions};else if(url.pathname.endsWith('/parts'))data={items:state.parts};else if(url.pathname===`/clubs/${clubId}`)data=state.club;
      else if(url.pathname.endsWith('/applications'))data={items:state.applications.filter(one=>one.state==='PENDING')};
      else{const one=state.applications.find(one=>one.id===url.pathname.split('/').at(-1));if(!one)throw new ApiError('http',404);if(options.method==='PATCH'){one.state=options.body.state;one.decidedAt='2026-11-03T01:01:00Z';}data={...one};}}
    return{data,headers:new Headers()};}};
  return{state,calls,service:createApiClubAdminService(client)};
}
test('permission is checked before any applicant data is fetched and unrelated operator permissions do not grant review',async()=>{
  for(const permissions of [[],['notices.write'],['members.manage']]){const f=fixture();f.state.permissions=permissions;await assert.rejects(f.service.getBoard(clubId),{reason:'forbidden'});assert.equal(f.calls.length,1);assert.ok(f.calls[0].path.endsWith('/permissions'));}
});
test('review loads the current club, dynamic parts and all pending pages with encoded cursors',async()=>{
  const f=fixture(url=>url.pathname.endsWith('/applications')?url.searchParams.has('pageToken')?{items:[{...application,id:secondId}]}:{items:[application],nextPageToken:'next +/?'}:undefined);
  const board=await f.service.getBoard(clubId);assert.equal(board.club.memberCount,5);assert.equal(board.parts[0].name,'동적 파트');assert.equal(board.applications.length,2);
  assert.ok(f.calls.some(call=>call.path.endsWith('pageToken=next%20%2B%2F%3F')));assert.ok(f.calls.filter(call=>call.path.includes('?')).every(call=>call.path.includes('state=PENDING&pageSize=200')));
});
test('invalid IDs, permissions, cross-club applicants, invalid states and broken pagination fail closed',async()=>{
  const invalid=fixture();await assert.rejects(invalid.service.getBoard('../other'),{kind:'response'});assert.equal(invalid.calls.length,0);
  for(const permissions of [['applications.decide','applications.decide'],['unknown.permission'],[true]]){const f=fixture();f.state.permissions=permissions;await assert.rejects(f.service.getBoard(clubId),{kind:'response'});assert.equal(f.calls.length,1);}
  for(const change of [s=>s.applications[0].clubId=id(9),s=>s.applications[0].partId=null,s=>s.applications[0].state='APPROVED',s=>s.applications[0].createdAt='bad',s=>s.parts[0].color='UNKNOWN',s=>s.applications.push({...application})]){const f=fixture((url,options,state)=>url.pathname.endsWith('/applications')?{items:state.applications}:undefined);change(f.state);await assert.rejects(f.service.getBoard(clubId),{kind:'response'});}
  await assert.rejects(fixture(url=>url.pathname.endsWith('/applications')?{items:[],nextPageToken:'loop'}:undefined).service.getBoard(clubId),{kind:'response'});
});
test('empty pending lists and a missing user display name/contact remain valid server responses',async()=>{
  const f=fixture();f.state.applications=[];assert.deepEqual((await f.service.getBoard(clubId)).applications,[]);
  f.state.applications=[{...application,nickname:'',email:''}];assert.equal((await f.service.getBoard(clubId)).applications[0].nickname,'');
});
test('a decision rechecks permission and the exact application before PATCHing only the state',async()=>{
  const f=fixture(),result=await f.service.decide(clubId,applicationId,'APPROVED');assert.equal(result.state,'APPROVED');
  assert.deepEqual(f.calls.map(call=>call.path),[`/clubs/${clubId}/members/me/permissions`,`/clubs/${clubId}/applications/${applicationId}`,`/clubs/${clubId}/applications/${applicationId}`]);
  assert.deepEqual(f.calls.at(-1),{path:`/clubs/${clubId}/applications/${applicationId}`,method:'PATCH',body:{state:'APPROVED'}});
});
test('permission revocation and missing applications stop the write without fetching or changing unrelated applicants',async()=>{
  const f=fixture();await f.service.getBoard(clubId);f.state.permissions=[];await assert.rejects(f.service.decide(clubId,applicationId,'APPROVED'),{reason:'forbidden'});assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
  f.state.permissions=['applications.decide'];f.state.applications=[];await assert.rejects(f.service.decide(clubId,applicationId,'APPROVED'),{reason:'not-found'});assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
});
test('queued duplicate or opposite decisions never reverse a completed application or PATCH it twice',async()=>{
  const f=fixture();const results=await Promise.all([f.service.decide(clubId,applicationId,'APPROVED'),f.service.decide(clubId,applicationId,'REJECTED')]);
  assert.deepEqual(results.map(one=>one.state),['APPROVED','APPROVED']);assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
});
test('another operator decision wins and deleted decided parts are accepted without a new PATCH',async()=>{
  const f=fixture();f.state.applications[0]={...application,state:'REJECTED',partId:null,decidedAt:'2026-11-03T01:02:00Z'};
  assert.equal((await f.service.decide(clubId,applicationId,'APPROVED')).state,'REJECTED');assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
});
test('not-pending conflicts read the actual final decision rather than repeating or pretending the requested decision won',async()=>{
  const f=fixture((url,options,state)=>{if(options.method==='PATCH'){state.applications[0].state='REJECTED';return new ApiError('http',409,'not-pending');}});
  assert.equal((await f.service.decide(clubId,applicationId,'APPROVED')).state,'REJECTED');assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
});
test('applied decisions survive lost responses and 500 notification failures through a read-only recovery',async()=>{
  for(const failure of [new ApiError('network'),new ApiError('timeout'),new ApiError('http',500)]){
    const f=fixture((url,options,state)=>{if(options.method==='PATCH'){state.applications[0].state=options.body.state;return failure;}});
    assert.equal((await f.service.decide(clubId,applicationId,'APPROVED')).state,'APPROVED');assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
  }
});
test('pending or unreadable recovery remains uncertain and never retries PATCH',async()=>{
  for(const failReads of [false,true]){let wrote=false;const f=fixture((url,options)=>{if(options.method==='PATCH'){wrote=true;return new ApiError('network');}if(wrote&&failReads)return new ApiError('network');});
    await assert.rejects(f.service.decide(clubId,applicationId,'REJECTED'),{reason:'uncertain'});assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);}
});
test('cancelled, forbidden, already-member and invalid-request outcomes are distinct and do not auto-retry',async()=>{
  for(const [status,code,expected] of [[404,'not-found','not-found'],[403,'forbidden','forbidden'],[409,'already-member','already-member'],[400,'bad-request',undefined]]){
    const f=fixture((url,options)=>options.method==='PATCH'?new ApiError('http',status,code):undefined);await assert.rejects(f.service.decide(clubId,applicationId,'APPROVED'),expected?{reason:expected}:{status});assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
  }
});
test('mismatched successful receipts require a matching final read; unsupported decisions never send requests',async()=>{
  const f=fixture((url,options)=>options.method==='PATCH'?{...application,id:id(99),state:'APPROVED'}:undefined);await assert.rejects(f.service.decide(clubId,applicationId,'APPROVED'),{reason:'uncertain'});
  const invalid=fixture();await assert.rejects(invalid.service.decide(clubId,applicationId,'PENDING'),{reason:'invalid'});assert.equal(invalid.calls.length,0);
});

function mockFixture(){const data=new Map(),writes=[];let fail=false;const store={async getItem(key){return data.get(key)??null;},async setItem(key,value){if(fail)throw new Error('disk');writes.push(key);data.set(key,value);}};
  return{data,writes,store,service:createMockClubAdminService(store),join:createMockClubJoinService(store),reopen:()=>createMockClubAdminService(store),fail:value=>{fail=value;}};}
test('Mock roles distinguish operators, ordinary memberships and newly created club owners',async()=>{
  const f=mockFixture();assert.deepEqual(await f.service.getPermissions('mock-club-study'),['club.update','parts.manage','noticeCategories.manage','applications.decide','members.manage','notices.write']);assert.deepEqual(await f.service.getPermissions('mock-club-pixel'),[]);await assert.rejects(f.service.getBoard('mock-club-pixel'),{reason:'forbidden'});
  await assert.rejects(f.service.getPermissions('unknown'),{reason:'not-found'});const created=await createMockClubCreateService(f.store).create({name:'새 모임',parts:[{name:'개발',color:'BLUE'}],myPartName:'개발'});
  assert.deepEqual((await f.service.getBoard(created.id)).applications,[]);assert.deepEqual(await f.service.getPermissions(created.id),['club.update','parts.manage','noticeCategories.manage','applications.decide','members.manage','notices.write']);
});
test('Mock decisions persist once, update joined member counts and preserve own applications and study data',async()=>{
  const f=mockFixture(),preview=await f.join.findClub('MORI2026');await f.join.apply(preview.id,preview.parts[0].id);f.data.set('@tamagochi/mock-study/v1','study-preserved');
  const before=new Map(f.data),board=await f.service.getBoard('mock-club-study');assert.equal(board.applications.length,2);assert.equal(board.club.memberCount,12);
  const outcomes=await Promise.all([f.service.decide(board.club.id,board.applications[0].id,'APPROVED'),f.service.decide(board.club.id,board.applications[0].id,'REJECTED')]);assert.ok(outcomes.every(one=>one.state==='APPROVED'));
  const restored=await f.reopen().getBoard(board.club.id);assert.equal(restored.applications.length,1);assert.equal(restored.club.memberCount,13);assert.equal((await f.join.findClub('STUDY001')).memberCount,13);
  for(const [key,value] of before)assert.equal(f.data.get(key),value);assert.equal(f.writes.filter(key=>key===MOCK_CLUB_REVIEW_KEY).length,1);
  await f.service.decide(board.club.id,restored.applications[0].id,'REJECTED');assert.equal((await f.service.getBoard(board.club.id)).club.memberCount,13);assert.equal((await f.service.getBoard(board.club.id)).applications.length,0);
});
test('Mock save failure and corrupted review records preserve the pending list and stored data',async()=>{
  const f=mockFixture(),board=await f.service.getBoard('mock-club-study');f.fail(true);await assert.rejects(f.service.decide(board.club.id,board.applications[0].id,'APPROVED'),{reason:'storage'});assert.equal((await f.service.getBoard(board.club.id)).applications.length,2);assert.equal(f.data.has(MOCK_CLUB_REVIEW_KEY),false);
  f.fail(false);f.data.set(MOCK_CLUB_REVIEW_KEY,'broken');await assert.rejects(f.reopen().getBoard(board.club.id),{reason:'storage'});assert.equal(f.data.get(MOCK_CLUB_REVIEW_KEY),'broken');
});
test('Mock review refuses an application from another club and returns an existing decision unchanged',async()=>{
  const f=mockFixture(),board=await f.service.getBoard('mock-club-study');await assert.rejects(f.service.decide('mock-club-pixel',board.applications[0].id,'APPROVED'),{reason:'forbidden'});
  await assert.rejects(f.service.decide(board.club.id,'missing','APPROVED'),{reason:'not-found'});await f.service.decide(board.club.id,board.applications[0].id,'REJECTED');assert.equal((await f.service.decide(board.club.id,board.applications[0].id,'APPROVED')).state,'REJECTED');
});
