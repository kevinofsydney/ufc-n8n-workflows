function durationSeconds(value) {
 const match=/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(value||''));
 if(!match||!match.slice(1).some(v=>v!==undefined))return null;
 const seconds=Number(match[1]||0)*86400+Number(match[2]||0)*3600+Number(match[3]||0)*60+Number(match[4]||0);
 return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
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

const request=$('Parse Add Video').first().json;
const events=$('Read UFC Events').all().map(i=>i.json).filter(e=>e.event_key);
const active=events.filter(e=>e.active===true||e.active==='true');
const fail=(outcome,text,extra={})=>[{json:{...request,...extra,accepted:false,should_process:false,outcome,text}}];
if(active.length!==1)return fail('invalid_active_event','Cannot add a video: expected exactly one active UFC event.');
const event=active[0];
if(!event.spreadsheet_id)return fail('missing_spreadsheet','The active event spreadsheet is not ready. Run /capture first, then try /addvideo again.');
if(Date.parse(event.event_datetime_local)<=Date.now())return fail('event_started','The active event has started. Add videos only before the event begins.');
const rows=$('Read Existing Video').all().map(i=>i.json).filter(r=>r.video_id===request.video_id);
if(rows.length){
 const completed=rows.length===1&&rows[0].analysis_status==='COMPLETED';
 const same=rows.length===1&&rows[0].event_key===event.event_key;
 return fail('duplicate',completed?'This video has already been analysed. Nothing was added or rerun.':same?'This video is already recorded. Use /status or /retry '+request.video_id+' for unfinished work.':'This video is already recorded for another event, or has duplicate records. Nothing was changed.');
}
const response=$('Read YouTube Metadata').first().json;
let metadata=response.body??response.data??response;
if(typeof metadata==='string'){try{metadata=JSON.parse(metadata);}catch{metadata={};}}
if(response.error||(response.statusCode&&response.statusCode!==200)||!metadata.title||!metadata.author_name)return fail('metadata_unavailable','Could not read this YouTube video. Check that it is public and available, then try again.');
const durationResponse=$input.first().json;
const seconds=durationSeconds(durationResponse.items?.find(v=>v.id===request.video_id)?.contentDetails?.duration);
if(durationResponse.error||seconds===null)return fail('duration_unavailable','Video not added: its duration could not be verified. Try again later; unverified clips are blocked.');
if(seconds<=181||/\bshorts\b|#short\b/i.test(String(metadata.title||'')))return fail('short_excluded','Video not added: Shorts and clips three minutes or shorter are excluded. Please submit the full breakdown instead.');
const video_title=String(metadata.title).trim(),channel_name=String(metadata.author_name).trim();
const match=classifyUfcVideo(video_title,event,events);
if(match.event_match_status!=='MATCHED')return fail('event_mismatch','Video not added: '+match.event_match_reason+'. Active event: '+event.event_name+'.',{video_title,channel_name,...match});
const video={video_id:request.video_id,channel_name,video_title,published_at:null,event_key:event.event_key,analysis_profile:channel_name.toLowerCase().includes('ufc predictions tracker')?'predictions_tracker':'standard_capper',...match};
return [{json:{...request,...video,accepted:true,should_process:!request.dry_run,outcome:request.dry_run?'dry_run_ready':'ready',text:(request.dry_run?'Preview: would add ':'Adding ')+channel_name+' — '+video_title+' for '+event.event_name+'. English transcript extraction will run first, followed by analysis using OpenRouter credits.'}}];
