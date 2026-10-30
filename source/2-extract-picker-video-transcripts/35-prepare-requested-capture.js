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
const source=$('Resolve Capture Request').first().json;
const row=source.target_video_row;
if(!row || row.video_id!==source.target_video_id || row.event_key!==source.event_key) throw new Error('Requested UFC capture does not match the active event.');
if(row.transcript_appended===true||row.transcript_appended==='true') throw new Error('This video already has a captured transcript.');
const match=classifyUfcVideo(row.video_title,source,$('Get UFC Events For Matching').all().map(item=>item.json));
if(match.event_match_status!=='MATCHED') throw new Error('Cannot capture this video: '+match.event_match_reason);
const {target_video_row,...event}=source;
return [{json:{...row,...event,...match,video_url:'https://www.youtube.com/watch?v='+row.video_id,is_retry:true,next_attempt_count:Number(row.attempt_count||0)+1}}];
