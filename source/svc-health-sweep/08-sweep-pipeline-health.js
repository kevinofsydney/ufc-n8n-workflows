// Health sweep: finds problems that never raise an error, keeps their incidents up to date, and resolves
// incidents that have cleared. Alerts go out as one message per sweep, each problem at most once a day.
const WATCH={y20ZZYzBVS6y8kC0:{name:'2. Extract Picker Video Transcripts',maxGapHours:38},BvLnPFMwQ2vhPkgv:{name:'3. Analyse Picker Video Transcripts',maxGapHours:38}};
const STUCK_RUN_HOURS=2,STUCK_VIDEO_HOURS=3,CARD_CHANGED_HOURS=13,CARD_READY_DAYS=5,WAITING_CHANGE_HOURS=24;
let request={};try{request=$('Run Sweep').first().json;}catch(e){request={};}
const now=Date.now(),nowIso=new Date(now).toISOString();
const hours=t=>t?(now-Date.parse(t))/3600e3:Infinity;
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rows=n=>$(n).all().map(i=>i.json).filter(r=>r&&r.id!==undefined);
const runs=rows('Read Pipeline Runs'),events=rows('Read Events'),states=rows('Read Card States'),videos=rows('Read Videos'),incidents=rows('Read Incidents');
const when=r=>r.started_at||r.finished_at||r.createdAt;

// 1. Find every problem that is true right now.
const problems=[];
const add=(check,subject,workflow,message)=>problems.push({incident_key:'health|'+check+'|'+subject,check,workflow,message});
for(const [id,w] of Object.entries(WATCH)){
 const own=runs.filter(r=>r.workflow_id===id||text(r.workflow_name).replace(/^UFC \| /,'')===w.name).sort((a,b)=>Date.parse(when(b))-Date.parse(when(a)));
 const latest=own[0];
 if(!latest)add('no_runs',id,w.name,w.name+' has no recorded runs.');
 else if(hours(when(latest))>w.maxGapHours)add('missed_runs',id,w.name,w.name+' has not run for '+Math.round(hours(when(latest)))+' hours (expected at least every '+w.maxGapHours+').');
 else if(latest.state==='running'&&hours(latest.started_at)>STUCK_RUN_HOURS)add('stuck_run',id,w.name,w.name+' started '+Math.round(hours(latest.started_at))+' hours ago and never finished (execution '+esc(latest.run_key)+').');
}
const active=events.filter(e=>e.active===true||String(e.active)==='true');
if(active.length!==1)add('active_event','count','1. Set Active UFC Event',active.length?active.length+' events are marked active; the pipeline expects exactly one.':'No UFC event is marked active.');
const event=active.length===1?active[0]:null;
if(event){
 if(!/^[A-Za-z0-9_-]+$/.test(text(event.spreadsheet_id)))add('no_spreadsheet',event.event_key,'svc.ensure_event_spreadsheet',esc(event.event_name)+' has no spreadsheet yet.');
 const state=states.find(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id);
 const daysOut=(Date.parse(event.event_datetime_local)-now)/864e5;
 if(daysOut>0&&daysOut<=CARD_READY_DAYS&&(!state||!['READY','PRESERVED'].includes(state.status)))add('card_not_ready',event.event_key,'svc.populate_fight_card','The fight card for '+esc(event.event_name)+' is '+(state?state.status:'not set up')+' with '+Math.round(daysOut*24)+' hours to go.');
 if(state&&state.change_status==='NEEDS_REVIEW')add('card_needs_review',event.event_key,'svc.apply_card_changes','A card change for '+esc(event.event_name)+' needs review (too many removals at once).');
 if(state&&['CHANGED','PARTLY_APPLIED'].includes(state.change_status)&&hours(state.pending_first_seen_at)>WAITING_CHANGE_HOURS&&daysOut>0)add('card_change_waiting',event.event_key,'svc.apply_card_changes','A card change for '+esc(event.event_name)+' has been waiting '+Math.round(hours(state.pending_first_seen_at))+' hours (removals need ESPN to drop the bout too).');
 const mine=videos.filter(v=>v.event_key===event.event_key);
 const stuck=mine.filter(v=>v.analysis_status==='PROCESSING'&&hours(v.last_attempt_at||v.updatedAt)>STUCK_VIDEO_HOURS);
 if(stuck.length)add('stuck_videos',event.event_key,'3. Analyse Picker Video Transcripts',stuck.length+' video'+(stuck.length>1?'s have':' has')+' been PROCESSING for over '+STUCK_VIDEO_HOURS+' hours: '+stuck.slice(0,3).map(v=>esc(v.channel_name)).join(', ')+'.');
 const waiting=mine.filter(v=>v.analysis_status==='CARD_CHANGED'&&hours(v.retry_requested_at||v.updatedAt)>CARD_CHANGED_HOURS);
 if(waiting.length)add('reanalysis_waiting',event.event_key,'3. Analyse Picker Video Transcripts',waiting.length+' video'+(waiting.length>1?'s':'')+' flagged for re-analysis after a card change '+(waiting.length>1?'have':'has')+' waited over '+CARD_CHANGED_HOURS+' hours.');
}

// 2. Update health incidents: open or refresh active problems, resolve cleared ones.
const byKey=new Map(incidents.map(r=>[r.incident_key,r]));
const updates=[],alertLines=[],resolvedLines=[];
for(const p of problems){
 const prev=byKey.get(p.incident_key);
 const reopened=!!prev&&prev.status==='resolved';
 const alert=!prev||reopened||hours(prev.last_alerted_at)>=24;
 updates.push({incident_key:p.incident_key,source:'health',workflow_id:'',workflow_name:p.workflow,node_name:p.check,category:'health',signature:p.check,last_message:p.message,
  status:'open',occurrences:(prev&&!reopened?Number(prev.occurrences||0):0)+1,first_seen_at:prev&&!reopened?prev.first_seen_at:nowIso,last_seen_at:nowIso,
  last_execution_id:'',last_execution_url:'',retry_count:0,last_retry_at:null,last_alerted_at:alert?nowIso:prev.last_alerted_at,resolved_at:null,resolution:''});
 if(alert)alertLines.push('• '+p.message+(prev&&!reopened?' <i>(still open)</i>':''));
}
const activeKeys=new Set(problems.map(p=>p.incident_key));
const resolve=(r,why)=>{updates.push({...r,status:'resolved',resolved_at:nowIso,resolution:why});};
for(const r of incidents){
 if(r.status==='resolved')continue;
 if(r.source==='health'){if(!activeKeys.has(r.incident_key)){resolve(r,'Condition cleared');if(r.last_alerted_at)resolvedLines.push('• '+esc(r.last_message));}continue;}
 // Error incidents: the sweep only closes them on positive evidence — a later successful run of the
 // same workflow, or a retry that held. Time-based closing after 12 quiet hours belongs to
 // svc.auto_resolve_incidents, which owns that rule so the two cannot disagree.
 if(r.status==='retrying'){if(hours(r.last_retry_at)>0.75)resolve(r,'Automatic retry succeeded (no further failure)');continue;}
 const later=runs.find(x=>(x.workflow_id===r.workflow_id)&&['success','idle'].includes(x.state)&&Date.parse(when(x))>Date.parse(r.last_seen_at));
 if(later)resolve(r,'A later run succeeded ('+text(later.run_key)+')');
}
for(const u of updates){delete u.id;delete u.createdAt;delete u.updatedAt;}
const lines=[];
if(alertLines.length)lines.push('<b>UFC pipeline health check</b>',...alertLines);
if(resolvedLines.length)lines.push(...(lines.length?['']:['<b>UFC pipeline health check</b>']),'<b>Resolved:</b>',...resolvedLines);
return [{json:{checked_at:nowIso,problems:problems.map(p=>p.incident_key),updates,telegram_message:lines.join('\n'),dry_run:request.dry_run===true}}];
