const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiRoomService } = require('../.expo/tests/services/api/room-service.js');
const { ApiError } = require('../.expo/tests/services/api/http-client.js');
const { createMockStudyBackend, MOCK_STUDY_STORAGE_KEY } = require('../.expo/tests/mocks/study-backend.js');
const { changeRoomEquipment, moveRoomTarget, sameRoomLayout, validateRoomLayout, floorToScene, sceneToFloor, placementToScene, dragOnFloor, roomAppearance, roomSize } = require('../.expo/tests/utils/room-layout.js');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const item = (n, slot, roomSize) => ({ id: id(n), code: `item_${n}`, name: `Item ${n}`, slot, category: slot === 'ROOM' ? 'ROOM_SIZE' : slot === 'WALLPAPER' ? 'WALLPAPER' : ['HEAD','FACE','NECK'].includes(slot) ? 'ACCESSORY' : 'FURNITURE', grade: 'BASIC', price: 0, minLevel: 1, defaultOwned: true, onSale: true, ...(roomSize ? { roomSize } : {}) });
const catalog = [item(1,'ROOM',3),item(2,'DESK'),item(3,'PLANT'),item(4,'BOOKSHELF'),item(5,'RUG'),item(6,'HEAD'),item(7,'ROOM',6),item(8,'DESK')];
const owned = catalog.map(item => item.id);
const baseline = { equipped: [{ slot:'ROOM',itemId:id(1) },{ slot:'DESK',itemId:id(2) }], placements:[{target:'DESK',x:1.5,y:0},{target:'CHARACTER',x:1.31,y:2.15}] };
const condition = { hearts:3,bugs:2,bugProgressSeconds:120 };
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(override = () => undefined) {
  const state = { catalog:clone(catalog), owned:clone(owned), room:{userId:'user-a',...clone(baseline),condition:clone(condition),newGuestbookCount:7,likeCount:5,likedByMe:false} }, calls=[];
  const client={async request(path, options={}){
    calls.push({path,...options});const special=await override(path,options,state);if(special instanceof Error)throw special;
    if(special!==undefined)return {data:special,headers:new Headers()};
    let data;
    if(path==='/items')data={items:state.catalog};else if(path==='/users/me/items')data={items:state.owned.map(itemId=>({itemId,pricePaid:0}))};
    else if(path==='/users/me/room'){if(options.method==='PATCH')state.room={...state.room,...clone(options.body)};data=clone(state.room);}
    else throw new Error('Unexpected request');return {data,headers:new Headers()};
  }};
  return {state,calls,service:createApiRoomService(client,'user-a')};
}
test('room loads the authenticated catalog, owned IDs and exact equipped layout without inventing furniture',async()=>{
  const f=fixture(),room=await f.service.getRoom();assert.equal(roomSize(room.layout,room.items),3);assert.deepEqual(room.layout,baseline);assert.deepEqual(room.condition,condition);
  assert.deepEqual(roomAppearance(room).items.map(item=>item.slot),['ROOM','DESK']);assert.deepEqual(f.calls.map(call=>call.path),['/items','/users/me/items','/users/me/room']);
});
test('malformed, cross-account, unknown, duplicate or unowned room responses fail without a fallback',async()=>{
  const changes=[s=>s.room.userId='user-b',s=>delete s.room.placements,s=>s.room.equipped.push({slot:'DESK',itemId:id(8)}),s=>s.room.equipped[1].slot='PLANT',s=>s.room.equipped[1].itemId=id(999),s=>s.owned=s.owned.filter(x=>x!==id(2)),s=>s.room.equipped=s.room.equipped.filter(x=>x.slot!=='ROOM'),s=>s.room.placements.push({target:'PLANT',x:1,y:1}),s=>s.room.placements.push({target:'CHARACTER',x:1,y:1}),s=>s.room.placements[0].x=.25,s=>s.room.placements[0].y=4,s=>s.room.placements[1].x=Infinity];
  for(const change of changes){const f=fixture();change(f.state);await assert.rejects(f.service.getRoom(),{kind:'response'});}
});
test('equipment changes replace a slot, unequip furniture, retain the house and enforce ownership',()=>{
  const replaced=changeRoomEquipment(baseline,catalog[7],catalog,owned);assert.equal(replaced.equipped.filter(one=>one.slot==='DESK').length,1);assert.equal(replaced.equipped.find(one=>one.slot==='DESK').itemId,id(8));
  assert.deepEqual(replaced.placements,baseline.placements);
  const removed=changeRoomEquipment(baseline,catalog[1],catalog,owned);assert.equal(removed.placements.some(one=>one.target==='DESK'),false);assert.equal(removed.equipped.some(one=>one.slot==='DESK'),false);
  assert.deepEqual(changeRoomEquipment(baseline,catalog[0],catalog,owned),baseline);
  assert.throws(()=>changeRoomEquipment(baseline,catalog[2],catalog,[id(1),id(2)]),{reason:'not-owned'});
});
test('resizing scales existing placements onto the target grid and shrinking keeps them in bounds',()=>{
  const large=changeRoomEquipment(baseline,catalog[6],catalog,owned);assert.equal(roomSize(large,catalog),6);assert.deepEqual(large.placements[0],{target:'DESK',x:3,y:0});assert.equal(large.placements[1].x,2.62);
  const small=changeRoomEquipment(large,catalog[0],catalog,owned);assert.ok(sameRoomLayout(small,baseline));
});
test('desk/bookshelf snap by half a cell, free targets preserve decimals and overlaps are permitted',()=>{
  let layout=moveRoomTarget(baseline,'DESK',1.26,2.74,catalog);assert.deepEqual(layout.placements.find(one=>one.target==='DESK'),{target:'DESK',x:1.5,y:2.5});
  layout=moveRoomTarget(layout,'CHARACTER',1.5,2.5,catalog);validateRoomLayout(layout,catalog,owned);
  layout=moveRoomTarget(layout,'CHARACTER',-100,100,catalog);assert.deepEqual(layout.placements.find(one=>one.target==='CHARACTER'),{target:'CHARACTER',x:0,y:3});
  assert.throws(()=>moveRoomTarget(layout,'PLANT',1,1,catalog),{reason:'invalid'});assert.throws(()=>moveRoomTarget(layout,'CHARACTER',NaN,1,catalog),{reason:'invalid'});
});
test('isometric coordinates round trip and a drag means the same movement at different viewport widths',()=>{
  for(const size of [3,6,8])for(const [x,y] of [[0,0],[size,size],[.25,2.75]]){const scene=floorToScene(x,y,size),world=sceneToFloor(scene.x,scene.y,size);assert.ok(Math.abs(x-world.x)<1e-10);assert.ok(Math.abs(y-world.y)<1e-10);}
  const start={target:'CHARACTER',x:1,y:1};assert.deepEqual(dragOnFloor(start,40,20,320,3),dragOnFloor(start,80,40,640,3));
  assert.deepEqual(dragOnFloor(start,99,99,0,3),start);
});
test('drawn sprite bases keep an inset at every floor corner while logical room coordinates remain unchanged',()=>{
  for(const size of [1,3,6,8])for(const target of ['DESK','BOOKSHELF','PLANT','RUG','CHARACTER'])for(const [x,y] of [[0,0],[0,size],[size,0],[size,size]]){
    const point={target,x,y},drawn=placementToScene(point,size),inside=sceneToFloor(drawn.x,drawn.y,size);
    assert.ok(inside.x>0&&inside.x<size&&inside.y>0&&inside.y<size);assert.deepEqual(point,{target,x,y});
  }
});
test('save sends the whole equipment and placement lists once and leaves room condition and guestbook state alone',async()=>{
  const f=fixture(),draft=moveRoomTarget(baseline,'DESK',2,1,catalog);const result=await f.service.saveRoom(draft,baseline);
  const writes=f.calls.filter(call=>call.method==='PATCH');assert.equal(writes.length,1);assert.equal(writes[0].path,'/users/me/room');assert.deepEqual(writes[0].body,draft);
  assert.deepEqual(result.layout,draft);assert.equal(f.state.room.newGuestbookCount,7);assert.deepEqual(f.state.room.condition,condition);assert.equal('guestbookCheckedAt' in writes[0].body,false);
});
test('invalid or no-longer-owned drafts never PATCH and unchanged desired layouts do not write again',async()=>{
  const f=fixture();await f.service.saveRoom(baseline,baseline);assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
  await assert.rejects(f.service.saveRoom({...baseline,equipped:[]},baseline),{reason:'invalid'});
  const draft=changeRoomEquipment(baseline,catalog[2],catalog,owned);f.state.owned=f.state.owned.filter(x=>x!==id(3));await assert.rejects(f.service.saveRoom(draft,baseline),{reason:'not-owned'});assert.equal(f.calls.some(call=>call.method==='PATCH'),false);
});
test('an external room change discovered before save is preserved rather than overwritten',async()=>{
  const f=fixture();f.state.room.placements[0].x=2;await assert.rejects(f.service.saveRoom(moveRoomTarget(baseline,'CHARACTER',1,1,catalog),baseline),{reason:'changed'});assert.equal(f.calls.some(call=>call.method==='PATCH'),false);assert.equal(f.state.room.placements[0].x,2);
});
test('a lost applied PATCH response is recovered with reads and repeating Done does not write twice',async()=>{
  const f=fixture((path,options,state)=>{if(options.method==='PATCH'){state.room={...state.room,...clone(options.body)};return new ApiError('network');}}),draft=moveRoomTarget(baseline,'DESK',2,2,catalog);
  assert.deepEqual((await f.service.saveRoom(draft,baseline)).layout,draft);await f.service.saveRoom(draft,baseline);assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
});
test('failed recovery or a mismatched success remains uncertain and never auto-replays PATCH',async()=>{
  for(const mode of ['unapplied','bad-response','read-failed']){
    let wrote=false;const f=fixture((path,options,state)=>{if(options.method==='PATCH'){wrote=true;return mode==='bad-response'?state.room:new ApiError('network');}if(mode==='read-failed'&&wrote)return new ApiError('network');});
    await assert.rejects(f.service.saveRoom(moveRoomTarget(baseline,'DESK',2,2,catalog),baseline),{reason:'uncertain'});assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
  }
});
test('definite not-owned/validation/unauthorized refusals are exposed without a hidden write retry',async()=>{
  for(const [status,code] of [[409,'not-owned'],[400,'bad-request'],[401,'unauthorized']]){
    const f=fixture((path,options)=>options.method==='PATCH'?new ApiError('http',status,code):undefined);
    await assert.rejects(f.service.saveRoom(moveRoomTarget(baseline,'DESK',2,2,catalog),baseline),status===409?{reason:'not-owned'}:{status});assert.equal(f.calls.filter(call=>call.method==='PATCH').length,1);
  }
});

function mockFixture(){let raw=null,fail=false;const storage={async getItem(){return raw;},async setItem(key,value){assert.equal(key,MOCK_STUDY_STORAGE_KEY);if(fail)throw new Error('storage');raw=value;}};
  const home={profile:{nickname:'모리',bolt:500,level:10,hearts:4},room:{name:'방',characterLabel:'모리'},todayStudySeconds:0,attendance:{studySeconds:0,requiredSeconds:1800,achieved:false},bugs:{count:0,progressSeconds:0,requiredSeconds:3600}};
  const make=()=>createMockStudyBackend({storage,initialHome:home,isOnline:async()=>true,now:()=>Date.parse('2026-11-03T02:00:00Z'),createId:()=> 'session-room'});
  return{backend:make(),reopen:make,raw:()=>raw,setRaw:value=>{raw=value;},fail:value=>{fail=value;}};
}
test('Mock editing shares shop equipment, persists after reopening and never changes study, goals or balance',async()=>{
  const f=mockFixture();await f.backend.startSession();await f.backend.finishSession('session-room');await f.backend.createGoal(200,'2026-11-04');
  await f.backend.purchase('mock-green_plant');const before=JSON.parse(f.raw()),room=await f.backend.getRoom();
  let draft=moveRoomTarget(room.layout,'PLANT',1.23,2.34,room.items);draft=changeRoomEquipment(draft,room.items.find(item=>item.slot==='CLOCK'),room.items,room.ownedItemIds);
  await f.backend.saveRoom(draft,room.layout);const after=JSON.parse(f.raw());for(const key of ['bolt','days','results','goals','active'])assert.deepEqual(after[key],before[key]);
  assert.deepEqual((await f.reopen().getRoom()).layout,draft);const home=await f.reopen().getHome();assert.equal(home.room.appearance.items.some(item=>item.slot==='CLOCK'),false);assert.equal(home.room.appearance.placements.find(one=>one.target==='PLANT').x,1.23);
  assert.equal((await f.backend.getShop()).equippedItemIds.includes('mock-basic_clock'),false);
});
test('Mock room purchases scale placements and already-owned purchases preserve the edited layout',async()=>{
  const f=mockFixture(),room=await f.backend.getRoom();const draft=moveRoomTarget(room.layout,'DESK',1.5,1.5,room.items);await f.backend.saveRoom(draft,room.layout);
  await f.backend.purchase('mock-spacious_two_room');const large=await f.backend.getRoom();assert.equal(roomSize(large.layout,large.items),5);assert.deepEqual(large.layout.placements,[{target:'DESK',x:2.5,y:2.5}]);
  await f.backend.purchase('mock-shabby_gosiwon');assert.ok(sameRoomLayout((await f.backend.getRoom()).layout,large.layout));
});
test('Mock failed saves preserve the existing ledger, stale baselines are rejected and malformed saved placements are not erased',async()=>{
  const f=mockFixture(),room=await f.backend.getRoom(),draft=moveRoomTarget(room.layout,'DESK',1,1,room.items),before=f.raw();f.fail(true);
  await assert.rejects(f.backend.saveRoom(draft,room.layout),{reason:'storage'});assert.equal(f.raw(),before);f.fail(false);
  await f.backend.saveRoom(draft,room.layout);await assert.rejects(f.backend.saveRoom(moveRoomTarget(room.layout,'DESK',2,2,room.items),room.layout),{reason:'changed'});
  const corrupt=JSON.parse(f.raw());corrupt.placements=[{target:'DESK',x:.25,y:0}];f.setRaw(JSON.stringify(corrupt));const bad=f.raw();await assert.rejects(f.reopen().getRoom(),{code:'invalid-record'});assert.equal(f.raw(),bad);
});
test('legacy Mock ledgers without placements load their equipped room without rewriting stored study data',async()=>{
  const f=mockFixture();await f.backend.getHome();const data=JSON.parse(f.raw());delete data.placements;delete data.shop;f.setRaw(JSON.stringify(data));const before=f.raw();
  const room=await f.reopen().getRoom();assert.equal(room.layout.equipped.some(one=>one.slot==='ROOM'),true);assert.deepEqual(room.layout.placements,[]);assert.equal(f.raw(),before);
});
