function durationSeconds(value) {
 const match=/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(value||''));
 if(!match||!match.slice(1).some(v=>v!==undefined))return null;
 const seconds=Number(match[1]||0)*86400+Number(match[2]||0)*3600+Number(match[3]||0)*60+Number(match[4]||0);
 return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
const batches=$('Prepare Video Duration Batches').all();
const candidates=batches.flatMap(i=>i.json.videos);
const responses=$input.all();
if(responses.length<batches.length)throw new Error('YouTube duration lookup failed; processing blocked to prevent Shorts.');
const metadata=new Map();
for(const response of responses){
 if(response.json.error||!Array.isArray(response.json.items))throw new Error('YouTube duration lookup failed; processing blocked to prevent Shorts.');
 for(const video of response.json.items)metadata.set(video.id,video);
}
const kept=[],excluded=[],unverified=[];
for(const candidate of candidates){
 const video=metadata.get(candidate.video_id);
 const seconds=durationSeconds(video?.contentDetails?.duration);
 if(seconds===null){unverified.push({video_id:candidate.video_id,video_title:candidate.video_title,channel_name:candidate.channel_name,reason:video?'no_usable_duration':'absent_from_api_response'});continue;}
 const explicit=/\/shorts\//i.test(String(candidate.video_url||''))||/(?:#short\b|\bshorts\b)/i.test(String(candidate.video_title||''));
 if(seconds<=900||explicit){excluded.push({video_id:candidate.video_id,seconds,reason:explicit?'explicit_shorts_marker':'duration_at_most_900_seconds'});continue;}
 kept.push({...candidate,video_duration_seconds:seconds});
}
const unverifiedNote=unverified.length?'; '+unverified.length+' unverified skipped, no usable duration ('+unverified.slice(0,3).map(v=>v.video_id).join(', ')+(unverified.length>3?', …':'')+')':'';
const guard={shorts_excluded_count:excluded.length,shorts_unverified_count:unverified.length,shorts_unverified:unverified,shorts_unverified_note:unverifiedNote};
if(kept.length)return kept.map(v=>({json:{...v,...guard}}));
let context={...candidates[0]};
delete context.video_id;
try{context.scan_stats=$('Select Videos To Process').first().json.scan_stats;}catch{}
return [{json:{...context,__no_capture_work:true,__no_analysis_work:true,...guard,shorts_excluded:excluded,capture_run_state:'idle',capture_run_summary:'No eligible long-form videos'+unverifiedNote+'; '+excluded.length+' Shorts/short clips excluded (15 minutes or shorter, or explicit Shorts marker).'}}];
