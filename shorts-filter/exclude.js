function durationSeconds(value) {
 const match=/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(value||''));
 if(!match||!match.slice(1).some(v=>v!==undefined))return null;
 const seconds=Number(match[1]||0)*86400+Number(match[2]||0)*3600+Number(match[3]||0)*60+Number(match[4]||0);
 return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
const candidates=$('Prepare Video Duration Batches').all().flatMap(i=>i.json.videos);
const metadata=new Map();
for(const response of $input.all()){
 if(response.json.error||!Array.isArray(response.json.items))throw new Error('YouTube duration lookup failed; processing blocked to prevent Shorts.');
 for(const video of response.json.items)metadata.set(video.id,video);
}
const kept=[],excluded=[];
for(const candidate of candidates){
 const seconds=durationSeconds(metadata.get(candidate.video_id)?.contentDetails?.duration);
 if(seconds===null)throw new Error('YouTube duration unavailable for '+candidate.video_id+'; processing blocked to prevent Shorts.');
 const explicit=/\/shorts\//i.test(String(candidate.video_url||''))||/(?:#short\b|\bshorts\b)/i.test(String(candidate.video_title||''));
 if(seconds<=181||explicit){excluded.push({video_id:candidate.video_id,seconds,reason:explicit?'explicit_shorts_marker':'duration_at_most_181_seconds'});continue;}
 kept.push({...candidate,video_duration_seconds:seconds});
}
if(kept.length)return kept.map(v=>({json:{...v,shorts_excluded_count:excluded.length}}));
let context={...candidates[0]};
delete context.video_id;
try{context.scan_stats=$('Select Videos To Process').first().json.scan_stats;}catch{}
return [{json:{...context,__no_capture_work:true,__no_analysis_work:true,shorts_excluded_count:excluded.length,shorts_excluded:excluded,capture_run_state:'idle',capture_run_summary:'No eligible long-form videos; '+excluded.length+' Shorts/short clips excluded (three minutes or shorter, or explicit Shorts marker).'}}];
