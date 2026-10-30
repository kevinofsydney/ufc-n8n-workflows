import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL(n,import.meta.url),'utf8');
const batch=read('batches.js'),filter=read('exclude.js'),idle=read('idle.js'),add=read('validate-add.js');
const wrap=rows=>rows.map(json=>({json}));
function run(code,input,nodes={}){return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+code+'})()',{$input:{all:()=>wrap(input),first:()=>({json:input[0]})},$:name=>{if(!(name in nodes))throw Error('Not executed');return {all:()=>wrap(nodes[name]),first:()=>({json:nodes[name][0]})};},Date})));}
const short={video_id:'iyeMtl78dZs',video_title:'My UFC Vegas 123 Moicano vs Nolan Predictions!',video_url:'https://www.youtube.com/watch?v=iyeMtl78dZs',event_key:'test',event_name:'Test Event'};
const long={...short,video_id:'lMMkQKwfuc0',video_title:'UFC Vegas 123 Moicano vs Nolan Full Card Predictions & Breakdown'};
const meta=(id,duration)=>({id,contentDetails:{duration}});
function exclude(candidates,items){return run(filter,[{items}],{'Prepare Video Duration Batches':run(batch,candidates).map(i=>i.json)});}
for(const duration of ['PT45S','PT46S','PT60S','PT1M1S','PT2M59S','PT3M','PT3M1S'])test('rejects short duration '+duration,()=>{const r=exclude([short],[meta(short.video_id,duration)])[0].json;assert.equal(r.__no_capture_work,true);assert.equal(r.video_id,undefined);assert.equal(r.shorts_excluded_count,1);});
for(const duration of ['PT3M2S','PT10M','PT1H7M2S','P1DT1H'])test('retains long duration '+duration,()=>assert.equal(exclude([long],[meta(long.video_id,duration)])[0].json.video_id,long.video_id));
test('known short excluded while full breakdown survives reversed API order',()=>{const r=exclude([short,long],[meta(long.video_id,'PT1H7M2S'),meta(short.video_id,'PT46S')]);assert.equal(r.length,1);assert.equal(r[0].json.video_id,long.video_id);assert.equal(r[0].json.shorts_excluded_count,1);});
test('explicit Shorts path blocked even with inconsistent long duration',()=>assert.equal(exclude([{...short,video_url:'https://youtube.com/shorts/'+short.video_id}],[meta(short.video_id,'PT10M')])[0].json.__no_capture_work,true));
test('explicit Shorts title marker blocked',()=>assert.equal(exclude([{...short,video_title:'UFC picks #Shorts'}],[meta(short.video_id,'PT10M')])[0].json.__no_capture_work,true));
for(const duration of [null,'','garbage','PT0S','P','PT','P-1D'])test('blocks unknown or invalid duration '+duration,()=>assert.throws(()=>exclude([short],[meta(short.video_id,duration)]),/duration unavailable/));
test('deleted/private/missing video blocks processing',()=>assert.throws(()=>exclude([short],[]),/duration unavailable/));
test('malformed API response blocks processing',()=>assert.throws(()=>run(filter,[{error:'quota'}],{'Prepare Video Duration Batches':[{videos:[short]}]}),/lookup failed/));
test('more than 50 candidates split into bounded requests and preserve rows',()=>{const rows=Array.from({length:51},(_,i)=>({...long,video_id:String(i).padStart(11,'0')}));const r=run(batch,rows);assert.equal(r.length,2);assert.equal(r[0].json.videos.length,50);assert.equal(r[1].json.videos.length,1);assert.equal(r[1].json.videos[0].video_id,rows[50].video_id);});
test('batch deduplicates IDs',()=>assert.equal(run(batch,[short,short])[0].json.videos.length,1));
test('all-short idle output reports exclusion and maintains scan stats',()=>{const r=run(filter,[{items:[meta(short.video_id,'PT46S')]}],{'Prepare Video Duration Batches':[{videos:[short]}],'Select Videos To Process':[{scan_stats:{expected:13,checked:13,loaded:13,failed_count:0,failed:[]}}]})[0].json;const msg=run(idle,[{}],{'Exclude Shorts':[r]})[0].json.telegram_message;assert.match(msg,/1 Shorts\/short clips excluded/);assert.match(msg,/Checked 13/);});
function addResult(duration,{error=false,title=short.video_title,duplicate=false}={}){return run(add,[error?{error:'quota'}:{items:duration===undefined?[]:[meta(short.video_id,duration)]}],{'Parse Add Video':[{video_id:short.video_id,chat_id:0,args:short.video_url,dry_run:true}],'Read UFC Events':[{event_key:'test',event_name:'UFC Fight Night: Moicano vs Nolan',active:true,spreadsheet_id:'test',event_datetime_local:'2099-01-01T00:00:00Z'}],'Read Existing Video':duplicate?[{video_id:short.video_id,event_key:'test',analysis_status:'COMPLETED'}]:[],'Read YouTube Metadata':[{title,author_name:'Test Channel'}]})[0].json;}
test('addvideo rejects short before reserve/claim',()=>{const r=addResult('PT46S');assert.equal(r.outcome,'short_excluded');assert.equal(r.should_process,false);});
test('addvideo rejects missing duration without processing',()=>assert.equal(addResult(undefined).outcome,'duration_unavailable'));
test('addvideo rejects API errors without processing',()=>assert.equal(addResult(undefined,{error:true}).outcome,'duration_unavailable'));
test('addvideo retains long-form validation and dry-run semantics',()=>{const r=addResult('PT1H7M2S');assert.equal(r.accepted,true);assert.equal(r.outcome,'dry_run_ready');assert.equal(r.should_process,false);});
test('addvideo rejects long video with Shorts marker',()=>assert.equal(addResult('PT10M',{title:'UFC Moicano vs Nolan Picks #Shorts'}).outcome,'short_excluded'));
test('duplicate stays a no-op',()=>assert.equal(addResult('PT10M',{duplicate:true}).outcome,'duplicate'));
