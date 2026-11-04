import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../source/'+p,import.meta.url),'utf8');
const builder=read('svc-populate-fight-card/16-build-verified-ufc-card.js'),matrix=read('svc-populate-fight-card/21-build-fight-card-matrix.js');
const context=read('3-analyse-picker-video-transcripts/14-build-fight-card-context.js'),compare=read('svc-detect-card-changes/09-compare-card-changes.js'),sweep=read('svc-health-sweep/08-sweep-pipeline-health.js');
const wrap=rows=>rows.map(json=>({json}));
function run(code,input,nodes={}){return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+code+'})()',{$input:{all:()=>wrap(input),first:()=>({json:input[0]})},$:name=>{if(!(name in nodes))throw Error('Not executed');return {all:()=>wrap(nodes[name]),first:()=>({json:nodes[name][0]})};},Date})));}

// Fight card fixtures: UFC lists 'José Souza' where ESPN lists 'Jose Henrique'.
const SOURCE_URL='https://www.ufc.com/event/test-card';
const EVENT={event_key:'test-event',event_name:'Test <Event>',spreadsheet_id:'sheet',event_datetime_local:'2099-01-01T01:00:00.000Z',source_url:SOURCE_URL};
const athlete=s=>'https://www.ufc.com/athlete/'+s;
const official={canonical:SOURCE_URL,main_timestamp:Date.parse(EVENT.event_datetime_local)/1000,main_ids:['1','2'],main_a:['Waldo Cortes Acosta','Jonny Parsons'],main_b:['Johnny Walker','José Souza'],main_a_url:[athlete('waldo-cortes-acosta'),athlete('jonny-parsons')],main_b_url:[athlete('johnny-walker'),athlete('jose-henrique')],prelim_ids:[],prelim_a:[],prelim_b:[],prelim_a_url:[],prelim_b_url:[],early_ids:[],early_a:[],early_b:[],early_a_url:[],early_b_url:[]};
const competition=(id,a,b,periods)=>({id,date:EVENT.event_datetime_local,status:{type:{name:'STATUS_SCHEDULED'}},format:{regulation:{periods}},type:{abbreviation:'Welterweight'},competitors:[{athlete:{displayName:a}},{athlete:{displayName:b}}]});
const espn={statusCode:200,body:{events:[{id:'600',date:EVENT.event_datetime_local,competitions:[competition('11','Waldo Cortes Acosta','Johnny Walker',5),competition('12','Jonny Parsons','Jose Henrique',3)]}]}};
const cardNodes={'Prepare UFC Card Request':[EVENT],'Extract Official UFC Card':[official],'Fetch Official UFC Card':[{statusCode:200}]};
const buildCard=()=>run(builder,[espn],cardNodes)[0].json;
function buildMatrix(nicknames){
 const candidate=buildCard();
 const fighters=candidate.card.flatMap(b=>[[b.fighter_a,b.fighter_a_url],[b.fighter_b,b.fighter_b_url]]);
 const requests=fighters.map(([fighter_name,profile_url])=>({fighter_name,profile_url,profile_status:200}));
 const lookups=fighters.map(([name])=>({profile_name:name,nickname:nicknames[name]||''}));
 return run(matrix,lookups,{'Build Verified UFC Card':[candidate],'Prepare Profile HTML':requests})[0].json;
}
const renamedRow=m=>m.matrix.find(r=>r[2]==='José Souza');

test('builder records the ESPN spelling for the renamed opponent only',()=>{const [main,renamed]=buildCard().card;assert.equal(renamed.fighter_b_aliases,'Jose Henrique');assert.equal(renamed.fighter_a_aliases,'');assert.equal(main.fighter_a_aliases,'');});
test('ESPN spelling and verified nickname both survive',()=>assert.equal(renamedRow(buildMatrix({'José Souza':'Canela'}))[4],'Jose Henrique, Canela'));
test('ESPN spelling survives when the nickname is unavailable',()=>assert.equal(renamedRow(buildMatrix({}))[4],'Jose Henrique'));
test('a nickname alone is unchanged for other fighters',()=>{const r=buildMatrix({'Waldo Cortes Acosta':'Salsa Boy','Jonny Parsons':'The Sluggernaut'});assert.equal(r.matrix[0][3],'Salsa Boy');assert.equal(r.matrix[0][4],'');assert.equal(renamedRow(r)[3],'The Sluggernaut');});
test('a nickname matching the ESPN spelling is not repeated',()=>assert.equal(renamedRow(buildMatrix({'José Souza':'JOSÉ henrique'}))[4],'Jose Henrique'));
test('the saved card, matrix and fingerprint carry the same merged alias',()=>{const m=buildMatrix({'José Souza':'Canela'});assert.equal(m.card.find(b=>b.fighter_b==='José Souza').fighter_b_aliases,'Jose Henrique, Canela');const without=buildMatrix({});assert.notEqual(m.card_fingerprint,without.card_fingerprint);});
test('analysis passes the merged alias cell to the prompt as one line',()=>{const m=buildMatrix({'José Souza':'Canela'});const rows=m.card.map(b=>({...b}));const out=run(context,rows)[0].json;assert.match(out.fight_card_context,/- Fighter B: José Souza\n- Fighter B aliases: Jose Henrique, Canela\n/);});

// Card check fixtures. A sheet row needs A:I; the state row holds the streak.
const NOW=Date.now();
const iso=hoursAgo=>new Date(NOW-hoursAgo*3600e3).toISOString();
const sheetRow=(b,i)=>[i+1,b.fighter_a,b.fighter_b,'','',b.bout_type,b.scheduled_rounds,b.weight_class,b.bout_id];
function check(state,{fight=official,response=espn,rows}={}){
 const card=buildCard().card;
 const sheet=rows??[['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds','weight_class','bout_id'],...card.map(sheetRow)];
 const base={event_key:EVENT.event_key,spreadsheet_id:EVENT.spreadsheet_id,...state};
 return run(compare,[response],{...cardNodes,'Extract Official UFC Card':[fight],'Read Fight Card State':[base],'Read Fight Card':[{rows:sheet}]})[0].json.card_check;
}
const broken={...official,canonical:'https://www.ufc.com/event/another-card'};

test('first failed check starts a streak with a reason',()=>{const c=check({},{fight:broken});assert.equal(c.status,'UNAVAILABLE');assert.equal(c.unavailable_count,1);assert.equal(c.unavailable_since,c.checked_at);assert.match(c.unavailable_reason,/does not match the stored event URL/);});
test('a repeat failure keeps the start time and counts up',()=>{const c=check({card_unavailable_since:iso(6),card_unavailable_count:1},{fight:broken});assert.equal(c.unavailable_count,2);assert.equal(c.unavailable_since,iso(6));});
test('an empty sheet counts towards the streak',()=>{const c=check({},{rows:[['fight_order']]});assert.equal(c.status,'UNAVAILABLE');assert.equal(c.unavailable_count,1);assert.equal(c.unavailable_reason,'Fight Card is empty.');});
test('a failed check keeps the pending change',()=>{const c=check({pending_change_fingerprint:'fp',pending_seen_count:1,pending_change_json:'[{"type":"removed"}]'},{fight:broken});assert.equal(c.fingerprint,'fp');assert.equal(c.seen_count,1);assert.equal(c.pending_change_json,'[{"type":"removed"}]');});
test('a verified check clears the streak',()=>{const c=check({card_unavailable_since:iso(6),card_unavailable_count:3,card_unavailable_reason:'old'});assert.equal(c.status,'IN_SYNC');assert.equal(c.unavailable_since,null);assert.equal(c.unavailable_count,0);assert.equal(c.unavailable_reason,'');});
test('a detected change also clears the streak',()=>{const card=buildCard().card;const sheet=[['h'],...card.map((b,i)=>{const r=sheetRow(b,i);r[6]=i===1?5:r[6];return r;})];const c=check({card_unavailable_since:iso(6),card_unavailable_count:3},{rows:sheet});assert.equal(c.status,'CHANGED');assert.equal(c.unavailable_count,0);assert.equal(c.unavailable_since,null);});

// Sweep fixtures: healthy runs, one active event, so only the condition under test can fire.
const hoursAhead=h=>new Date(NOW+h*3600e3).toISOString();
const KEY='health|card_check_unavailable|'+EVENT.event_key;
function runSweep({state={},daysOut=3,incidents=[]}={}){
 const runs=[{id:1,workflow_id:'y20ZZYzBVS6y8kC0',state:'success',started_at:iso(1)},{id:2,workflow_id:'BvLnPFMwQ2vhPkgv',state:'success',started_at:iso(1)}];
 return run(sweep,[{}],{'Read Pipeline Runs':runs,'Read Events':[{id:1,active:true,...EVENT,event_datetime_local:hoursAhead(daysOut*24)}],'Read Card States':[{id:1,event_key:EVENT.event_key,spreadsheet_id:EVENT.spreadsheet_id,status:'READY',...state}],'Read Videos':[],'Read Incidents':incidents})[0].json;
}
const failing=(count,hoursAgo,reason='Official card could not be verified: UFC <page> changed')=>({change_status:'UNAVAILABLE',card_unavailable_since:iso(hoursAgo),card_unavailable_count:count,card_unavailable_reason:reason});
const openIncident=(alertedHoursAgo)=>({id:9,incident_key:KEY,source:'health',status:'open',occurrences:4,first_seen_at:iso(30),last_alerted_at:iso(alertedHoursAgo),last_message:'old'});

test('one recent failure does not alert',()=>{const r=runSweep({state:failing(1,2)});assert.deepEqual(r.problems,[]);assert.equal(r.telegram_message,'');});
test('two failed checks in a row alert',()=>{const r=runSweep({state:failing(2,6)});assert.deepEqual(r.problems,[KEY]);assert.equal(r.updates[0].status,'open');assert.equal(r.updates[0].workflow_name,'svc.detect_card_changes');assert.match(r.telegram_message,/2 checks in a row over 6 hours/);});
test('one failure older than twelve hours alerts',()=>{const r=runSweep({state:failing(1,13)});assert.deepEqual(r.problems,[KEY]);assert.match(r.telegram_message,/1 check in a row/);});
test('the stored reason is escaped in the alert',()=>assert.match(runSweep({state:failing(2,6)}).telegram_message,/UFC &lt;page&gt; changed/));
test('no alert outside the five-day window',()=>assert.deepEqual(runSweep({state:failing(5,48),daysOut:6}).problems,[]));
test('no alert once the event has started',()=>assert.deepEqual(runSweep({state:failing(5,48),daysOut:-0.5}).problems,[]));
test('a card that is not READY keeps its own condition only',()=>assert.deepEqual(runSweep({state:{...failing(5,48),status:'WRITING'}}).problems,['health|card_not_ready|'+EVENT.event_key]));
test('a PRESERVED card is covered',()=>assert.deepEqual(runSweep({state:{...failing(2,6),status:'PRESERVED'}}).problems,[KEY]));
test('an UNAVAILABLE status from before the columns existed does not alert',()=>assert.deepEqual(runSweep({state:{change_status:'UNAVAILABLE'}}).problems,[]));
test('a change_status overwritten by svc.apply_card_changes does not hide the streak',()=>assert.deepEqual(runSweep({state:{...failing(2,6),change_status:'APPLIED'}}).problems,[KEY]));
test('a continuing incident stays quiet within a day',()=>{const r=runSweep({state:failing(3,10),incidents:[openIncident(2)]});assert.equal(r.telegram_message,'');assert.equal(r.updates[0].occurrences,5);assert.equal(r.updates[0].last_alerted_at,iso(2));});
test('a continuing incident reminds after a day',()=>{const r=runSweep({state:failing(3,30),incidents:[openIncident(25)]});assert.match(r.telegram_message,/still open/);});
test('the incident resolves when a check succeeds',()=>{const r=runSweep({state:{change_status:'IN_SYNC',card_unavailable_since:null,card_unavailable_count:0},incidents:[openIncident(2)]});assert.deepEqual(r.problems,[]);assert.equal(r.updates[0].status,'resolved');assert.equal(r.updates[0].resolution,'Condition cleared');assert.match(r.telegram_message,/Resolved/);});

const WAIT='health|card_change_waiting|'+EVENT.event_key;
const waiting=hoursAgo=>({change_status:'CHANGED',pending_first_seen_at:iso(hoursAgo),pending_change_json:'[{"type":"removed"}]'});
test('a waiting card change alerts after 6 hours in the last two days',()=>assert.deepEqual(runSweep({state:waiting(7),daysOut:1.5}).problems,[WAIT]));
test('a waiting card change stays quiet for 5 hours in the last two days',()=>assert.deepEqual(runSweep({state:waiting(5),daysOut:1.5}).problems,[]));
test('earlier in the week a waiting card change still waits 24 hours',()=>{assert.deepEqual(runSweep({state:waiting(7),daysOut:3}).problems,[]);assert.deepEqual(runSweep({state:waiting(25),daysOut:3}).problems,[WAIT]);});
