// Runs each card change through svc.apply_card_changes and then svc.sync_bout_ids on the resulting sheet,
// as analysis and the fight-week card check do. A sync failure would stop analysis, so the chain must hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../source/'+p,import.meta.url),'utf8');
const plan=read('svc-apply-card-changes/09-plan-card-changes.js'),sync=read('svc-sync-bout-ids/02-plan-bout-ids.js');
const H=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds','weight_class'];
const slug=(a,b)=>'ufc:'+[a,b].map(n=>n.toLowerCase().replace(/[^a-z]+/g,'-')).join('--');
const bout=(order,a,b,type,id=slug(a,b))=>({fight_order:order,fighter_a:a,fighter_b:b,fighter_a_aliases:'',fighter_b_aliases:'',bout_type:type,scheduled_rounds:type==='main_event'?5:3,weight_class:'lightweight',bout_id:id});
const CARD=[bout(1,'Waldo Cortes Acosta','Johnny Walker','main_event'),bout(2,'Tatiana Suarez','Virna Jandiroba','main_card'),bout(3,'Gabriel Lorenco','Thomas Petersen','prelim'),bout(4,'Austin Bashi','Lucas Brennan','prelim')];
const renumber=card=>card.map((b,i)=>({...b,fight_order:i+1}));
const TABS=[['Picks','pick_id',b=>'v1|pick|'+b.bout_id],['Props','prop_id',b=>'v1|prop|'+b.bout_id+'|method'],['Fight Analysis','fight_analysis_id',b=>'v1|fight|'+b.bout_id]];
function sheetFor(card){
 const s={'Fight Card':[[...H,'bout_id'],...card.map(b=>[...H.map(h=>b[h]),b.bout_id])]};
 for(const [name,idCol,id] of TABS)s[name]=[[idCol,'fight_order','fighter_a','fighter_b','event_key','video_id','review_status','bout_id'],...card.map(b=>[id(b),b.fight_order,b.fighter_a,b.fighter_b,'k','v1','',b.bout_id])];
 return s;
}
const colIndex=l=>[...l].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
function applyWrites(sheet,writes){
 for(const w of writes){
  const m=/^'(.+)'!([A-Z]+)1:([A-Z]+)\d+$/.exec(w.range);assert.ok(m,'unexpected range '+w.range);
  const rows=sheet[m[1]],first=colIndex(m[2]);
  w.rows.forEach((vals,r)=>{rows[r]=rows[r]||[];vals.forEach((v,c)=>{rows[r][first+c]=v;});});
  if(m[1]==='Fight Card')sheet[m[1]]=rows.filter((r,i)=>i===0||r.slice(0,8).some(v=>String(v??'').trim()));
 }
}
const ctx=nodes=>n=>({first:()=>({json:(nodes[n]||[{}])[0]}),all:()=>(nodes[n]||[]).map(json=>({json}))});
function chain({card=CARD,saved=card,official,changes,seen=1}){
 const sheet=sheetFor(card);
 const state={event_key:'k',spreadsheet_id:'s',status:'READY',source_card_json:JSON.stringify(saved),pending_change_json:JSON.stringify(changes),official_card_json:JSON.stringify(official),pending_seen_count:seen};
 const event={event_key:'k',spreadsheet_id:'s',event_name:'Test',dry_run:true};
 const applied=new Function('$',plan)(ctx({'When Called':[event],'Read Fight Card State':[state],'Read Fight Card':[{rows:sheet['Fight Card']}],'Read Picks':[{rows:sheet.Picks}],'Read Props':[{rows:sheet.Props}],'Read Fight Analysis':[{rows:sheet['Fight Analysis']}],'Read Transcripts':[{rows:[['video_id','transcript_text']]}],'Read Event Videos':[]}))[0].json;
 if(applied.writes.length)applyWrites(sheet,applied.writes);
 const after={...state,source_card_json:applied.state_update?applied.state_update.source_card_json:state.source_card_json};
 const synced=new Function('$',sync)(ctx({'When Called':[event],'Read Fight Card State':[after],'Read Fight Card':[{rows:sheet['Fight Card']}],'Read Picks':[{rows:sheet.Picks}],'Read Props':[{rows:sheet.Props}],'Read Fight Analysis':[{rows:sheet['Fight Analysis']}]}))[0].json;
 if(synced.writes.length)applyWrites(sheet,synced.writes);
 return {applied,synced,sheet};
}

test('UFC switches to numeric ids during a reshuffle: update applies, then sync upgrades the ids',()=>{
 const official=renumber([CARD[0],{...CARD[2],bout_id:'ufc:4576',bout_type:'main_card'},{...CARD[1],bout_type:'prelim'},CARD[3]]);
 const saved=CARD.map(b=>b===CARD[2]?{...b,bout_id:'ufc:4576'}:b);
 const {applied,synced,sheet}=chain({saved,official,changes:[{type:'reordered',bout_id:'ufc:4576',from:3,to:2},{type:'segment_changed',bout_id:'ufc:4576',from:'prelim',to:'main_card'},{type:'reordered',bout_id:CARD[1].bout_id,from:2,to:3}]});
 assert.equal(applied.status,'APPLY');
 assert.equal(synced.summary.ufc_ids_adopted,1);
 assert.ok(sheet.Picks.some(r=>r[0]==='v1|pick|ufc:4576'&&Number(r[1])===2),'pick rekeyed to the numeric id at its new position');
 assert.ok(sheet['Fight Card'].some(r=>r[8]==='ufc:4576'&&r[1]==='Gabriel Lorenco'));
});

test('an opponent change voids the old picks, then sync leaves the voided rows alone',()=>{
 const calderon={...CARD[3],fighter_b:'Carlos Calderon',bout_id:slug('Austin Bashi','Carlos Calderon')};
 const {applied,synced,sheet}=chain({official:[CARD[0],CARD[1],CARD[2],calderon],seen:2,changes:[{type:'opponent_replaced',bout_id:calderon.bout_id,old_bout_id:CARD[3].bout_id,from:'Austin Bashi vs Lucas Brennan',to:'Austin Bashi vs Carlos Calderon',fight_order:4,espn_listed:false}]});
 assert.equal(applied.status,'APPLY');
 assert.ok(sheet.Picks.every(r=>r===sheet.Picks[0]||r[7]!==CARD[3].bout_id||r[6]==='VOID_CARD_CHANGE'));
 assert.equal(synced.summary.fight_card_bout_ids_written,0);
});

const mainRemoved={type:'removed',bout_id:CARD[0].bout_id,fight:'Waldo Cortes Acosta vs Johnny Walker',fight_order:1,espn_listed:true};
test('the main event is replaced: the old one keeps fight 1 until its removal is confirmed, and the new bout waits below it',()=>{
 const newMain=bout(1,'Alex Pereira','Jiri Prochazka','main_event');
 const official=renumber([newMain,...CARD.slice(1)]);
 const first=chain({official,seen:1,changes:[mainRemoved,{type:'added',bout_id:newMain.bout_id,fight:'Alex Pereira vs Jiri Prochazka',fight_order:1,bout_type:'main_event'}]});
 assert.equal(first.applied.status,'PARTLY_APPLY');
 assert.deepEqual(first.applied.new_card.slice(0,3).map(b=>[b.fighter_a,b.bout_type]),[['Waldo Cortes Acosta','main_event'],['Alex Pereira','main_card'],['Tatiana Suarez','main_card']]);
 assert.equal(first.synced.summary.fight_card_bout_ids_written,0);
});

test('UFC drops the main event for one check: nothing moves and no update is sent while the removal waits',()=>{
 // 6 Nov: the co-main was promoted to fight 1 and the main event pushed to fight 2 on a single fetch.
 const official=renumber([{...CARD[1],bout_type:'main_event'},...CARD.slice(2)]);
 const changes=[{type:'reordered',bout_id:CARD[1].bout_id,from:2,to:1},{type:'segment_changed',bout_id:CARD[1].bout_id,from:'main_card',to:'main_event'},{type:'reordered',bout_id:CARD[2].bout_id,from:3,to:2},{type:'reordered',bout_id:CARD[3].bout_id,from:4,to:3},mainRemoved];
 const {applied,sheet}=chain({official,seen:1,changes});
 assert.equal(applied.status,'WAITING');assert.equal(applied.writes.length,0);assert.equal(applied.telegram_message,'');
 assert.deepEqual(sheet['Fight Card'].slice(1).map(r=>[r[0],r[1],r[5]]),CARD.map(b=>[b.fight_order,b.fighter_a,b.bout_type]));
});

test('an unplaceable row is set aside, and sync then skips it',()=>{
 const card=CARD;const official=renumber([CARD[0],CARD[2],CARD[1],CARD[3]]);
 const sheet=sheetFor(card);sheet.Picks.push(['v1|pick|ufc:ghost',9,'Ghost One','Ghost Two','k','v1','','ufc:ghost']);
 const state={event_key:'k',spreadsheet_id:'s',status:'READY',source_card_json:JSON.stringify(card),pending_change_json:JSON.stringify([{type:'reordered',bout_id:CARD[2].bout_id,from:3,to:2}]),official_card_json:JSON.stringify(official),pending_seen_count:1};
 const event={event_key:'k',spreadsheet_id:'s',event_name:'Test',dry_run:true};
 const nodes=()=>({'When Called':[event],'Read Fight Card State':[state],'Read Fight Card':[{rows:sheet['Fight Card']}],'Read Picks':[{rows:sheet.Picks}],'Read Props':[{rows:sheet.Props}],'Read Fight Analysis':[{rows:sheet['Fight Analysis']}],'Read Transcripts':[{rows:[['video_id','transcript_text']]}],'Read Event Videos':[]});
 assert.throws(()=>new Function('$',sync)(ctx(nodes()))[0].json,/does not match any bout/,'sync alone refuses the stray row');
 const applied=new Function('$',plan)(ctx(nodes()))[0].json;
 assert.deepEqual(applied.rows_set_aside,['Picks row 6 (ufc:ghost)']);
 applyWrites(sheet,applied.writes);state.source_card_json=applied.state_update.source_card_json;
 const synced=new Function('$',sync)(ctx(nodes()))[0].json;
 assert.ok(synced);
});

test('UFC changes an athlete URL: sync adopts the new slug id and rekeys the rows',()=>{
 // 5 Nov: José Souza's UFC URL moved from jose-henrique to jose-souza, so detect adopted a new slug id.
 const card=[...CARD.slice(0,3),bout(4,'Jonny Parsons','José Souza','prelim','ufc:jonny-parsons--jose-henrique')];
 const saved=card.map(b=>b.fight_order===4?{...b,bout_id:'ufc:jonny-parsons--jose-souza'}:b);
 const {synced,sheet}=chain({card,saved,official:saved,changes:[]});
 assert.equal(synced.summary.ufc_ids_adopted,1);
 assert.ok(sheet['Fight Card'].some(r=>r[8]==='ufc:jonny-parsons--jose-souza'));
 assert.ok(sheet.Picks.some(r=>r[0]==='v1|pick|ufc:jonny-parsons--jose-souza'));
});

test('sync still refuses a numeric id replaced by a slug, or a different bout at the same order',()=>{
 const card=[...CARD.slice(0,3),{...CARD[3],bout_id:'ufc:4600'}];
 assert.throws(()=>chain({card,saved:CARD,official:CARD,changes:[]}),/has bout_id ufc:4600 but the saved card says/);
 const other=[...CARD.slice(0,3),{...CARD[3],fighter_b:'Somebody Else'}];
 assert.throws(()=>chain({card:CARD,saved:other,official:other,changes:[]}),/does not match the saved card/);
});
