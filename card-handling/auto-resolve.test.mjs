// svc.auto_resolve_incidents `Select Stale Incidents`: card incidents close on a later successful card check, not on quiet time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../source/svc-auto-resolve-incidents/03-select-stale-incidents.js',import.meta.url),'utf8');
const ago=h=>new Date(Date.now()-h*3600e3).toISOString();
function run(incidents,states=[{}]){
 const nodes={'Read All Incidents':incidents,'Read Card State':states};
 const $=n=>({all:()=>(nodes[n]||[]).map(json=>({json}))});
 return new Function('$',code)($).map(i=>i.json);
}
const inc=(key,name,seenHours)=>({id:1,incident_key:key,status:'open',source:'error',workflow_name:name,last_seen_at:ago(seenHours)});

test('a quiet non-card incident still closes after 12 hours',()=>{
 const r=run([inc('a','UFC | 7. Grade Picks',13)]);
 assert.equal(r.length,1);assert.match(r[0].resolution,/no recurrence in 12 hours/);
});

test('a quiet card incident stays open until a later card check succeeds',()=>{
 const i=inc('c','UFC | svc.apply_card_changes',13);
 assert.equal(run([i],[{status:'READY',change_status:'CHANGED',change_checked_at:ago(1),checked_at:ago(20)}]).length,0,'a detected change that never applied is not evidence');
 assert.equal(run([i],[{status:'READY',change_status:'IN_SYNC',change_checked_at:ago(14),checked_at:ago(20)}]).length,0,'a check before the failure is not evidence');
 const r=run([i],[{status:'READY',change_status:'APPLIED',change_checked_at:ago(2),checked_at:ago(20)}]);
 assert.equal(r.length,1);assert.match(r[0].resolution,/later card check succeeded/);
});

test('a card incident with no later check closes after 72 hours with a warning',()=>{
 assert.equal(run([inc('c','UFC | svc.sync_bout_ids',50)]).length,0);
 const r=run([inc('c','UFC | svc.sync_bout_ids',73)]);
 assert.equal(r.length,1);assert.match(r[0].resolution,/no later card check succeeded/);
});

test('recent, owner and test incidents are never closed',()=>{
 const states=[{status:'READY',change_status:'IN_SYNC',change_checked_at:ago(0.1)}];
 assert.equal(run([inc('c','UFC | svc.detect_card_changes',2),{...inc('o','',100),source:'owner'},inc('test|x','UFC | 7. Grade Picks',100)],states).length,0);
});

// 8 Nov: a sync failure on one event closed because the next event's card built fine, while the failed
// event's card never recovered.
test('another event checking fine does not close a card incident while the failed event stays unhealthy',()=>{
 const i=inc('c','UFC | svc.sync_bout_ids',20);
 const failed={status:'READY',change_status:'ADOPT_IDS',change_checked_at:ago(20.1),checked_at:ago(20.05)};
 const next={status:'READY',change_status:null,checked_at:ago(14)};
 assert.equal(run([i],[failed,next]).length,0,'the failed event has no successful check since');
 const r=run([i],[{...failed,change_status:'IN_SYNC',change_checked_at:ago(15)},next]);
 assert.equal(r.length,1,'closes once the failed event checks fine too');
 assert.match(r[0].resolution,/later card check succeeded/);
});

test('an event last checked well before the failure is not counted either way',()=>{
 const i=inc('c','UFC | svc.sync_bout_ids',20);
 const old={status:'UNAVAILABLE',change_status:'CHANGED',change_checked_at:ago(200),checked_at:ago(200)};
 const r=run([i],[old,{status:'READY',change_status:'IN_SYNC',change_checked_at:ago(15),checked_at:ago(15)}]);
 assert.equal(r.length,1);
});

test('a card step failing inside analysis is treated as a card incident',()=>{
 const i={...inc('c','UFC | 3. Analyse Picker Video Transcripts',13),node_name:'Sync Bout IDs'};
 assert.equal(run([i]).length,0,'no quiet-time close without a later card check');
 assert.equal(run([{...i,node_name:'Extract Picks'}]).length,1,'other analysis failures still close on quiet time');
});
