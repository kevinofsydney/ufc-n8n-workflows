// Card-change scenarios for svc.apply_card_changes `Plan Card Changes`, run against the real source file.
// Each scenario is a change that happened, or could happen, during fight week.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const plan=readFileSync(new URL('../source/svc-apply-card-changes/09-plan-card-changes.js',import.meta.url),'utf8');
const H=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds','weight_class'];
const bout=(order,a,b,type,id)=>({fight_order:order,fighter_a:a,fighter_b:b,fighter_a_aliases:'',fighter_b_aliases:'',bout_type:type,scheduled_rounds:type==='main_event'?5:3,weight_class:'lightweight',bout_id:id});
const slug=(a,b)=>'ufc:'+[a,b].map(n=>n.toLowerCase().replace(/[^a-z]+/g,'-')).join('--');
const CARD=[['Waldo Cortes Acosta','Johnny Walker','main_event'],['Tatiana Suarez','Virna Jandiroba','main_card'],['Gabriel Lorenco','Thomas Petersen','prelim'],['Austin Bashi','Lucas Brennan','prelim']].map(([a,b,t],i)=>bout(i+1,a,b,t,slug(a,b)));
const tab=card=>({rows:[['id','fight_order','review_status','bout_id','event_key','video_id','fighter_a','fighter_b'],...card.map(b=>['v1|pick|'+b.bout_id,b.fight_order,'OK',b.bout_id,'k','v1',b.fighter_a,b.fighter_b])]});
function run({sheet=CARD,saved=sheet,official,changes,seen=1,transcript='',firstSeen=new Date().toISOString()}){
 const state={event_key:'k',spreadsheet_id:'s',source_card_json:JSON.stringify(saved),pending_change_json:JSON.stringify(changes),official_card_json:JSON.stringify(official),pending_seen_count:seen,pending_first_seen_at:firstSeen};
 const nodes={'When Called':[{event_key:'k',spreadsheet_id:'s',event_name:'Test'}],'Read Fight Card State':[state],'Read Fight Card':[{rows:[[...H,'bout_id'],...sheet.map(b=>[...H.map(h=>b[h]),b.bout_id])]}],
  'Read Picks':[tab(sheet)],'Read Props':[tab(sheet)],'Read Fight Analysis':[tab(sheet)],'Read Transcripts':[{rows:[['video_id','transcript_text'],['v1',transcript]]}],'Read Event Videos':[{video_id:'v1',event_key:'k',analysis_status:'COMPLETED'}]};
 const $=n=>({first:()=>({json:(nodes[n]||[{}])[0]}),all:()=>(nodes[n]||[]).map(json=>({json}))});
 return new Function('$',plan)($)[0].json;
}
const renumber=card=>card.map((b,i)=>({...b,fight_order:i+1}));

test('UFC switches some bouts to numeric ids in the same check that reorders the card',()=>{
 // Lorenco vs Petersen moves up, and UFC now sends ufc:4576 for it while the sheet still has its slug.
 const official=renumber([CARD[0],{...CARD[2],bout_id:'ufc:4576',bout_type:'main_card'},{...CARD[1],bout_type:'prelim'},CARD[3]]);
 const saved=CARD.map(b=>b===CARD[2]?{...b,bout_id:'ufc:4576'}:b);
 const r=run({saved,official,seen:1,changes:[{type:'reordered',bout_id:'ufc:4576',from:3,to:2},{type:'segment_changed',bout_id:'ufc:4576',from:'prelim',to:'main_card'},{type:'reordered',bout_id:CARD[1].bout_id,from:2,to:3}]});
 assert.equal(r.status,'APPLY');
 assert.deepEqual(r.new_card.map(b=>b.fighter_a),['Waldo Cortes Acosta','Gabriel Lorenco','Tatiana Suarez','Austin Bashi']);
 assert.equal(r.new_card[1].bout_id,CARD[2].bout_id,'the sheet keeps its id so Picks rows still match');
 assert.equal(JSON.parse(r.state_update.source_card_json)[1].bout_id,'ufc:4576','the saved card keeps the adopted id for svc.sync_bout_ids');
 assert.equal(r.row_summary.Picks.voided,0);
 assert.equal(r.row_summary.Picks.renumbered,2);
});

test('an opponent change waits while ESPN still lists the old bout, then voids its picks',()=>{
 const calderon={...CARD[3],fighter_b:'Carlos Calderon',bout_id:slug('Austin Bashi','Carlos Calderon')};
 const official=[CARD[0],CARD[1],CARD[2],calderon];
 const change={type:'opponent_replaced',bout_id:calderon.bout_id,old_bout_id:CARD[3].bout_id,from:'Austin Bashi vs Lucas Brennan',to:'Austin Bashi vs Carlos Calderon',fight_order:4};
 const waiting=run({official,changes:[{...change,espn_listed:true}],seen:2});
 assert.equal(waiting.status,'WAITING');
 const applied=run({official,changes:[{...change,espn_listed:false}],seen:2,transcript:'austin bashi against carlos calderon'});
 assert.equal(applied.status,'APPLY');
 assert.equal(applied.row_summary.Picks.voided,1);
 assert.equal(applied.new_card[3].fighter_b,'Carlos Calderon');
 assert.deepEqual(applied.videos.map(v=>v.video_id),['v1']);
});

test('a bout added at the last minute applies on the first check',()=>{
 const added=bout(5,'Jose Delano','Murtazali Magomedov','prelim',slug('Jose Delano','Murtazali Magomedov'));
 const r=run({official:[...CARD,added],changes:[{type:'added',bout_id:added.bout_id,fight:'Jose Delano vs Murtazali Magomedov',fight_order:5,bout_type:'prelim'}],seen:1});
 assert.equal(r.status,'APPLY');
 assert.equal(r.new_card.length,5);
});

test('a main card reshuffle with an added bout and changed ids applies in one run',()=>{
 const added=bout(3,'Jose Delano','Murtazali Magomedov','main_card',slug('Jose Delano','Murtazali Magomedov'));
 const official=renumber([CARD[0],{...CARD[2],bout_id:'ufc:4576',bout_type:'main_card'},added,{...CARD[1],bout_id:'ufc:4584',bout_type:'prelim'},CARD[3]]);
 const r=run({official,seen:1,changes:[{type:'added',bout_id:added.bout_id,fight:'Jose Delano vs Murtazali Magomedov',fight_order:3,bout_type:'main_card'},{type:'reordered',bout_id:'ufc:4576',from:3,to:2},{type:'segment_changed',bout_id:'ufc:4584',from:'main_card',to:'prelim'}]});
 assert.equal(r.status,'APPLY');
 assert.deepEqual(r.new_card.map(b=>b.fighter_a),['Waldo Cortes Acosta','Gabriel Lorenco','Jose Delano','Tatiana Suarez','Austin Bashi']);
 assert.equal(r.row_summary.Picks.voided,0);
});

test('a row for a bout that is not on the card is set aside instead of stopping the update',()=>{
 const official=renumber([CARD[0],CARD[2],CARD[1],CARD[3]]);
 const state={event_key:'k',spreadsheet_id:'s',source_card_json:JSON.stringify(CARD),pending_change_json:JSON.stringify([{type:'reordered',bout_id:CARD[2].bout_id,from:3,to:2}]),official_card_json:JSON.stringify(official),pending_seen_count:1};
 const picks=tab(CARD);picks.rows.push(['v1|pick|ufc:ghost',9,'OK','ufc:ghost','k','v1','Ghost One','Ghost Two']);
 const nodes={'When Called':[{event_key:'k',spreadsheet_id:'s',event_name:'Test'}],'Read Fight Card State':[state],'Read Fight Card':[{rows:[[...H,'bout_id'],...CARD.map(b=>[...H.map(h=>b[h]),b.bout_id])]}],'Read Picks':[picks],'Read Props':[tab(CARD)],'Read Fight Analysis':[tab(CARD)],'Read Transcripts':[{rows:[['video_id','transcript_text']]}],'Read Event Videos':[]};
 const $=n=>({first:()=>({json:(nodes[n]||[{}])[0]}),all:()=>(nodes[n]||[]).map(json=>({json}))});
 const r=new Function('$',plan)($)[0].json;
 assert.equal(r.status,'APPLY');
 assert.deepEqual(r.rows_set_aside,['Picks row 6 (ufc:ghost)']);
 const status=r.writes.find(w=>w.label==='Picks review_status').rows.map(x=>x[0]);
 assert.equal(status[5],'VOID_UNMATCHED');
 assert.equal(status.filter(x=>x==='VOID_UNMATCHED').length,1);
 assert.match(r.telegram_message,/set aside as VOID_UNMATCHED/);
 assert.doesNotMatch(r.telegram_message,/Voided/);
 assert.deepEqual(r.new_card.map(b=>b.fighter_a),['Waldo Cortes Acosta','Gabriel Lorenco','Tatiana Suarez','Austin Bashi']);
});

test('a bout added mid-week keeps the ESPN spelling the official card carries as an alias',()=>{
 const added={...bout(5,'Jonny Parsons','Jose Souza','prelim',slug('Jonny Parsons','Jose Souza')),fighter_b_aliases:'Jose Henrique'};
 const r=run({official:[...CARD,added],changes:[{type:'added',bout_id:added.bout_id,fight:'Jonny Parsons vs Jose Souza',fight_order:5,bout_type:'prelim'}],seen:1});
 assert.equal(r.new_card[4].fighter_b_aliases,'Jose Henrique');
 assert.equal(r.new_card[0].fighter_a_aliases,'','existing bouts keep the sheet value');
});

test('a removal ESPN never confirms applies once UFC has shown it for 12 hours over three checks',()=>{
 const official=renumber([CARD[0],CARD[1],CARD[2]]);
 const change={type:'removed',bout_id:CARD[3].bout_id,fight:'Austin Bashi vs Lucas Brennan',fight_order:4,espn_listed:true};
 const hoursAgo=h=>new Date(Date.now()-h*3600e3).toISOString();
 assert.equal(run({official,changes:[change],seen:5,firstSeen:hoursAgo(11)}).status,'WAITING','too soon');
 assert.equal(run({official,changes:[change],seen:2,firstSeen:hoursAgo(20)}).status,'WAITING','too few checks');
 const r=run({official,changes:[change],seen:3,firstSeen:hoursAgo(12.5)});
 assert.equal(r.status,'APPLY');
 assert.equal(r.applied_over_espn.length,1);
 assert.match(r.telegram_message,/Applied without ESPN/);
 assert.deepEqual(r.new_card.map(b=>b.fighter_a),['Waldo Cortes Acosta','Tatiana Suarez','Gabriel Lorenco']);
});
