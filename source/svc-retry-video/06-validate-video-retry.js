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
const request=$('Parse Retry Request').first().json;
const fail=text=>[{json:{accepted:false,chat_id:request.chat_id,text}}];
const events=$('Read Known UFC Events').all().map(item=>item.json).filter(event=>event.event_key);
const active=events.filter(event=>event.active===true||event.active==='true');
if(active.length!==1)return fail('Retry unavailable: expected exactly one active UFC event.');
const rows=$input.all().map(item=>item.json).filter(row=>row.video_id===request.video_id&&row.event_key===active[0].event_key);
if(rows.length!==1)return fail('That video is not uniquely recorded for the active UFC event. Use /status for its video IDs.');
const row=rows[0];
const match=classifyUfcVideo(row.video_title,active[0],events);
if(match.event_match_status!=='MATCHED')return fail('Retry blocked: '+match.event_match_reason+'.');
if(Date.now()-Date.parse(row.retry_requested_at||0)<5*60*1000)return fail('A retry for this video was requested less than five minutes ago. Please allow it to finish.');
const captured=row.transcript_appended===true||row.transcript_appended==='true';
const stage=request.requested_stage==='auto'?(captured?'analyse':'capture'):request.requested_stage;
if(stage==='capture'&&captured)return fail('This transcript is already captured. Use /retry analyse '+row.video_id+' if analysis is unfinished.');
if(stage==='analyse'&&!captured)return fail('Capture the transcript first: /retry capture '+row.video_id);
if(stage==='analyse'&&String(row.analysis_status).toUpperCase()==='COMPLETED')return fail('This video is already analysed. A retry will not run it again.');
if(stage==='analyse'&&String(row.analysis_status).toUpperCase()==='PROCESSING'&&Date.now()-Date.parse(row.last_attempt_at||row.updatedAt)<60*60*1000)return fail('This video is currently processing. Wait for completion or for the one-hour interruption timeout.');
return [{json:{...row,...match,accepted:true,chat_id:request.chat_id,retry_stage:stage,manual_retry:true,target_video_id:row.video_id,status:stage==='capture'?'RETRY_REQUESTED':row.status,analysis_status:stage==='analyse'?'RETRY_REQUESTED':row.analysis_status||null,dispatch_workflow_id:stage==='capture'?'y20ZZYzBVS6y8kC0':'BvLnPFMwQ2vhPkgv',text:'Retry queued for '+row.channel_name+' — '+row.video_title+' ('+stage+(stage==='analyse'?', uses OpenRouter credits':'')+'). Only this video will be processed.'}}];
