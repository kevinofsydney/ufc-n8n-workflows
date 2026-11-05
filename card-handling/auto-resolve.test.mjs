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
