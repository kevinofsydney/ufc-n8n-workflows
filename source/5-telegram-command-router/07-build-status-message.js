function ufcText(value) {
 return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function ufcHas(text, phrase) { return phrase && (' '+text+' ').includes(' '+phrase+' '); }
function ufcEventSignals(event, title) {
 const name=ufcText(event.event_name);
 const split=String(event.event_name || '').split(':');
 const prefix=ufcText(split[0]);
 const number=(prefix.match(/\bufc\s+(\d{2,4})\b/) || [])[1];
 const pair=String(split.slice(1).join(':') || '').split(/\s+v(?:s)?\.?\s+/i);
 const surname=value=>ufcText(value).split(' ').filter(word=>!['jr','sr','ii','iii','iv'].includes(word)).slice(-1)[0] || '';
 const a=surname(pair[0]), b=surname(pair[1]);
 const matchup=pair.length===2 && a.length>=3 && b.length>=3 && ufcHas(title,a) && ufcHas(title,b);
 const numbered=Boolean(number && new RegExp('\\bufc\\s+'+number+'\\b').test(title));
 const venue=prefix.replace(/\bufc\b/g,' ').replace(/\bfight\s+night\b/g,' ').replace(/\b\d+\b/g,' ').trim().replace(/\s+/g,' ');
 const location=venue.length>=3 && ufcHas(title,venue);
 return {event, score: matchup || numbered ? 10 : location ? 4 : 0, reason: matchup ? 'main-event surnames' : numbered ? 'UFC event number' : location ? 'event location' : ''};
}
function classifyUfcVideo(title, active, events) {
 const text=ufcText(title);
 const pool=[...new Map([...(events||[]),active].filter(event=>event?.event_key&&event.event_name).map(event=>[event.event_key,event])).values()];
 const matches=pool.map(event=>ufcEventSignals(event,text)).filter(match=>match.score>0);
 const strong=matches.filter(match=>match.score===10);
 const candidates=strong.length ? strong : matches;
 if(candidates.length!==1) return {event_match_status:candidates.length>1?'AMBIGUOUS':'UNCONFIRMED',event_match_reason:candidates.length>1?'Title identifies more than one known UFC event':'Title does not clearly identify a known UFC event',matched_event_key:'',event_match_version:'ufc-event-match-v2'};
 const match=candidates[0];
 return {event_match_status:match.event.event_key===active.event_key?'MATCHED':'OTHER_EVENT',event_match_reason:'Matched '+match.event.event_name+' by '+match.reason,matched_event_key:match.event.event_key,event_match_version:'ufc-event-match-v2'};
}
const chatId=$('Parse Command').first().json.chat_id;
const activeRows=$('Get Active Event').all().map(item=>item.json).filter(event=>event.event_key && (event.active===true || event.active==='true'));
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
if(activeRows.length!==1) return [{json:{chat_id:chatId,text:'UFC status: expected one active event; found '+activeRows.length+'. Check ufc_events before capturing or analysing.'}}];
const event=activeRows[0], events=$('Get UFC Events For Matching').all().map(item=>item.json);
const rows=$('Get Event Videos').all().map(item=>item.json).filter(row=>row.video_id);
const classified=rows.map(row=>({...row,...classifyUfcVideo(row.video_title,event,events)}));
const onEvent=classified.filter(row=>row.event_match_status==='MATCHED'), excluded=classified.filter(row=>row.event_match_status!=='MATCHED');
const captured=row=>row.transcript_appended===true||row.transcript_appended==='true';
const done=onEvent.filter(row=>captured(row)&&row.analysis_status==='COMPLETED');
const waiting=onEvent.filter(row=>captured(row)&&row.analysis_status!=='COMPLETED');
const needsCapture=onEvent.filter(row=>!captured(row));
const date=value=>{const time=new Date(value);return Number.isFinite(time.getTime())?time.toLocaleString('en-AU',{timeZone:'Australia/Sydney',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'not recorded';};
const lines=['<b>UFC pipeline status</b>','<b>'+esc(event.event_name)+'</b>','Main card: '+esc(date(event.event_datetime_local))+' (Sydney)','',onEvent.length+' event videos · '+done.length+' analysed · '+waiting.length+' awaiting analysis · '+needsCapture.length+' awaiting transcript'];
if(event.spreadsheet_url) lines.push('<a href="'+esc(event.spreadsheet_url)+'">Open event spreadsheet</a>');

const cardStates=$('Get UFC Fight Card Status').all().map(i=>i.json).filter(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id);
const cardState=cardStates[0];
if(cardState?.status==='READY'){let count=0;try{count=JSON.parse(cardState.source_card_json||'[]').length;}catch{}lines.push('Fight Card: '+count+' bouts · automatically populated and verified');}
else if(cardState?.status==='PRESERVED'){let count=0;try{count=JSON.parse(cardState.source_card_json||'[]').length;}catch{}lines.push('Fight Card: '+count+' bouts · existing card preserved');}
else if(cardState?.status==='WRITING')lines.push('⚠ Fight Card initialization needs review; analysis is blocked.');
else lines.push('Fight Card: no automatic initialization recorded; existing cards are validated before analysis.');
const runs=$('Get Recent UFC Runs').all().map(item=>item.json).filter(row=>row.run_key);
lines.push('','<b>Latest runs</b>');
for(const [id,label] of [['y20ZZYzBVS6y8kC0','Capture'],['BvLnPFMwQ2vhPkgv','Analysis']]){
 const row=runs.find(run=>run.workflow_id===id && (!run.event_key || run.event_key===event.event_key));
 if(!row){lines.push(label+': no run recorded yet');continue;}
 const stalled=row.state==='running' && Date.now()-Date.parse(row.started_at)>60*60*1000;
 const state=stalled?'possibly interrupted':row.state;
 const summary=String(row.summary||'').slice(0,130);
 const link=row.execution_url?'<a href="'+esc(row.execution_url)+'">'+esc(label)+'</a>':label;
 lines.push(link+': '+esc(state)+' · '+esc(date(row.finished_at||row.started_at))+(summary?' — '+esc(summary):''));
}
const tasks=[...waiting.map(row=>({...row,retry_stage:'analyse'})),...needsCapture.map(row=>({...row,retry_stage:'capture'}))];
if(tasks.length){
 lines.push('','<b>Needs attention ('+tasks.length+')</b>');
 for(const row of tasks.slice(0,5)){
  const state=row.retry_stage==='capture'?row.status:row.analysis_status||'WAITING';
  const attempts=row.retry_stage==='capture'?row.attempt_count:row.analysis_attempt_count;
  lines.push('• '+esc(row.channel_name)+' — '+esc(String(row.video_title).slice(0,85))+' ['+esc(state)+', attempts '+Number(attempts||0)+']');
  if(state==='PROCESSING'&&Date.now()-Date.parse(row.last_attempt_at||row.updatedAt)<60*60*1000)lines.push('  Already processing; retry after it finishes.');
  else lines.push('  <code>/retry '+row.retry_stage+' '+esc(row.video_id)+'</code>');
  const error=row.retry_stage==='capture'?row.last_error:row.analysis_error;
  if(error)lines.push('  '+esc(String(error).slice(0,100)));
 }
 if(tasks.length>5)lines.push('… '+(tasks.length-5)+' more videos in the event table.');
}else lines.push('','No event videos currently need attention.');
if(excluded.length)lines.push('',excluded.length+' stored rows excluded: their titles identify another event or are unclear.');
const errors=runs.filter(row=>row.state==='error').slice(0,2);
if(errors.length){lines.push('','<b>Recent failures</b>');for(const row of errors)lines.push('• '+esc(row.workflow_name)+' · '+esc(date(row.finished_at))+' — '+esc(String(row.summary||'').slice(0,110)));}
lines.push('','<code>/retry VIDEO_ID</code> picks the missing stage. Analysis uses credits.');
let text=lines.join('\n');
if(text.length>3900)text=lines.slice(0,15).join('\n')+'\n\nUse the event spreadsheet for the remaining details.';
return [{json:{chat_id:chatId,text}}];
