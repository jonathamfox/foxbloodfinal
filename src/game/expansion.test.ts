import assert from 'node:assert/strict';
import { PUZZLES, advancePuzzle, newPuzzle, puzzleTarget, makeRelics, relicIds } from './expansion';
import { ensureRelics, WEAPONS, ARMORS, WEAPON_LIST, ZONE } from './constants';
import { ARENAS, groundAt, FIELD_BOSS_SPAWNS } from './world';
import { FoxBorneEngine } from './engine';

for(const ng of [0,1,2,3,10]) {
  for(const p of PUZZLES) {
    assert.equal(groundAt(p.x),p.y,'Puzzle must be on reachable ground');
    assert.equal(Math.floor(p.x/ZONE),p.zone);
    // Search all reachable mechanism states rather than duplicating the solution.
    const queue=[newPuzzle(p)],seen=new Set<string>();let solved=false;
    while(queue.length) {const s=queue.shift()!;if(s.solved){solved=true;break;}const key=JSON.stringify(s);if(seen.has(key))continue;seen.add(key);for(let i=0;i<3;i++)queue.push(advancePuzzle(p,s,i,ng));}
    assert(solved,`Unsolvable puzzle ${p.id} in NG+${ng}`);
    const complete={...newPuzzle(p),solved:true};assert.deepEqual(advancePuzzle(p,complete,0,ng),complete,'No duplicate reward after completion');
  }
  const r=makeRelics(ng);assert.equal(r.weapons.length,15);assert.equal(r.armors.length,15);
  ensureRelics(ng);const count=WEAPON_LIST.length;ensureRelics(ng);assert.equal(WEAPON_LIST.length,count);
  for(const w of r.weapons){assert(w.id && WEAPONS[w.id]);assert(w.dmg!>0);assert(w.relicTint);}
}
const p=PUZZLES[0],target=puzzleTarget(p,0);let s=advancePuzzle(p,newPuzzle(p),target[0],0);
s=advancePuzzle(p,s,target[0],0);assert.equal(s.step,1,'A wrong repeated first bell starts a new sequence');
assert.notEqual(relicIds('madre',0).weapon,relicIds('madre',1).weapon);
assert(WEAPONS[relicIds('madre',1).weapon].dmg!>WEAPONS[relicIds('madre',0).weapon].dmg!);
assert.notEqual(ARMORS[relicIds('madre',1).armor].trim,ARMORS[relicIds('madre',2).armor].trim);

const data=new Map<string,string>();
Object.assign(globalThis,{
  localStorage:{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)},
  matchMedia:()=>({matches:false}),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},
  addEventListener:()=>{},removeEventListener:()=>{},window:{devicePixelRatio:1,setTimeout:()=>1,clearTimeout:()=>{}},
});
const noop=()=>{};
const cb={onSaveStatus:noop,onLookChange:noop,onModeChange:noop,onRestUpdate:noop,onMuteChange:noop,onStatusChange:noop,onMiniMapChange:noop,onNpcDialog:noop,onEnding:noop};
const canvas={getContext:()=>({}),getBoundingClientRect:()=>({width:960}),width:960,height:540} as unknown as HTMLCanvasElement;
const e:any=new FoxBorneEngine(canvas,cb);
e.S.dead[0]=true;e.S.deadField=[FIELD_BOSS_SPAWNS[0].id];e.S.cinzas=321;e.S.level=7;
delete e.S.puzzles;delete e.S.brokenProps;e.save();
const loaded:any=new FoxBorneEngine(canvas,cb);
assert.equal(loaded.S.cinzas,321);assert.equal(loaded.S.level,7);assert(loaded.S.dead[0]);
assert(loaded.S.unlockedWeapons.includes(relicIds('madre',0).weapon));
assert(loaded.S.unlockedWeapons.includes(relicIds('cacador',0).weapon));
// Each boss grants both pieces once, without changing equipment unexpectedly.
const oldWeapon=loaded.look.weapon;
for(const boss of [...ARENAS.map(a=>a.boss),'cacador','fera']) {
  const ids=relicIds(boss as any,0);loaded.grantRelic(boss);loaded.grantRelic(boss);
  assert.equal(loaded.S.unlockedWeapons.filter((id:string)=>id===ids.weapon).length,1);
  assert(loaded.S.unlockedArmors.includes(ids.armor));
}
assert.equal(loaded.look.weapon,oldWeapon);
// Actual interaction, reward and persistence, not only pure puzzle logic.
for(const index of target){loaded.P.x=p.x+(index-1)*95;loaded.P.y=p.y;assert(loaded.usePuzzle());}
assert(loaded.S.puzzles.sinos.solved);const coins=loaded.S.cinzas;loaded.usePuzzle();assert.equal(loaded.S.cinzas,coins);
const b=loaded.breakables[0];loaded.shatterProps(b.x-1,b.x+1,b.y);const reward=loaded.S.cinzas;
loaded.shatterProps(b.x-1,b.x+1,b.y);assert.equal(loaded.S.cinzas,reward);assert(loaded.S.brokenProps.includes(b.id));
const resumed:any=new FoxBorneEngine(canvas,cb);assert(resumed.S.puzzles.sinos.solved);assert(resumed.S.brokenProps.includes(b.id));
const gear=[...resumed.S.unlockedWeapons];resumed.startNewCycle();assert.equal(resumed.S.ng,1);assert.deepEqual(resumed.S.puzzles,{});assert.deepEqual(resumed.S.brokenProps,[]);
assert(gear.every(id=>resumed.S.unlockedWeapons.includes(id)));assert(resumed.S.dead.every((v:boolean)=>!v));
resumed.grantRelic('madre');assert(resumed.S.unlockedWeapons.includes(relicIds('madre',1).weapon));
resumed.setWeapon(relicIds('madre',1).weapon);assert.equal(resumed.look.weapon,relicIds('madre',1).weapon);
resumed.save();const again:any=new FoxBorneEngine(canvas,cb);assert.equal(again.look.weapon,resumed.look.weapon);assert(again.S.unlockedWeapons.includes(relicIds('madre',0).weapon));
console.log('PASS: 3 reachable puzzles over 5 cycles; all relics; legacy save migration; rewards once; destruction persistence; NG+ reset and retained equipment.');

// Traversal regression: walk the complete ground both ways without jump input.
const {moveEntity,PLAT,LOOT_SPAWNS} = await import('./world') as any;
const {ROUTES,routeAvailable}=await import('./routes');
for(const direction of [1,-1]) {
 const actor={x:direction===1?40:71500,y:440,vx:direction*170,vy:0,hw:14,onGround:true};
 for(let i=0;i<26000;i++)moveEntity(actor,1/60);
 assert(direction===1?actor.x>71400:actor.x<100,'Full campaign terrain must be walkable in both directions');
 assert(actor.y<=440,'No mandatory pits remain');
}
for(const platform of PLAT)assert(ROUTES.some(r=>r.kind==='ladder'&&r.y===platform.y&&r.x>=platform.x&&r.x<=platform.x+platform.w),'Every treasure platform needs a ladder');
for(const chest of LOOT_SPAWNS)assert(Math.abs((groundAt(chest.x)??-999)-chest.y)<10||PLAT.some((p:any)=>chest.x>=p.x&&chest.x<=p.x+p.w&&chest.y===p.y),'All chests remain reachable');
assert(!routeAvailable(ROUTES.find(r=>r.id==='catedral_a')!,Array(10).fill(false)));
assert(routeAvailable(ROUTES.find(r=>r.id==='ruas_esgoto_a')!,Array(10).fill(false)));
loaded.arena=-1;loaded.P.dead=false;loaded.P.statuses=[];
for(const r of ROUTES){loaded.S.dead=Array(10).fill(true);loaded.P.x=r.x;loaded.P.y=r.y;assert(loaded.useRoute());loaded.updatePlayer(1.1);assert.equal(loaded.P.x,r.to.x);assert.equal(loaded.P.y,r.to.y);assert(!loaded.traversal);}
loaded.P.st=1;loaded.P.state='free';loaded.startAttack(false,1);assert.equal(loaded.P.state,'free');loaded.startRoll(1);assert.equal(loaded.P.state,'free');
assert(!Object.values((FoxBorneEngine as any).KEY_MAP).includes('jump'));assert(!Object.values((FoxBorneEngine as any).KEY_MAP).includes('block'));
console.log('PASS: full ground route both directions; all ladders and chests reachable; bidirectional passages; boss locks; insufficient stamina blocks attacks and dodges.');

// Climbing input must never activate a doorway or the wrong end of a ladder.
const ladder=ROUTES.find(r=>r.kind==='ladder'&&r.to.y<r.y)!;
loaded.P.x=ladder.x;loaded.P.y=ladder.y;assert(!loaded.useRoute(1));assert(loaded.useRoute(-1));loaded.updatePlayer(1.1);
const door=ROUTES.find(r=>r.kind==='passage')!;loaded.P.x=door.x;loaded.P.y=door.y;assert(!loaded.useRoute(-1));
for(const r of ROUTES){const reverse=ROUTES.find(q=>q.x===r.to.x&&q.y===r.to.y&&q.to.x===r.x&&q.to.y===r.y);assert(reverse,'Each door must return through its paired endpoint');}
console.log('PASS: directional climbing stays separate from interaction; all doors return through the same paired doorway.');
