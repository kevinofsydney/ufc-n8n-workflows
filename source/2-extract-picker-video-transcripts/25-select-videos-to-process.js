function readCaptureFeedStats() {
 const names=["YouTube — UFC Predictions Tracker","YouTube — The MMA Guru","YouTube — Lucrative James","YouTube — MMA Lock of the Night","YouTube — Kunath MMA","YouTube — TonyHasDiedMMA","YouTube — MMA Husky Hustler","YouTube — Walk the Line MMA","YouTube — Artem MMA","YouTube — BedtimeMMA","YouTube — BetSam","YouTube — JakeGerberMMA","YouTube — Funky Bunch MMA"];
 const failed=[];let checked=0;
 let root;
 try {root=$('Get YouTube Upload Playlists').first().json;} catch {return {expected:names.length,checked:0,failed_count:0,loaded:0,failed:[]};}
 const channels=Array.isArray(root.items)?root.items:[];
 const ids=["UCaU2fDiT9fCTABiiotiG2aw","UCIhQvpinmS8Eq6PrQ021DKQ","UCrxm8U7aEu18LW3YRFZSvNg","UClwn3zgkfyne2Ecj36Dl7ZQ","UCxl-gwVZTPPhhCbQ5DKTP6Q","UCAELXX1-cUSA5Lc7aDFMZsw","UCFjXgUzCT23D11yF4bcEl2g","UCk9hwi3iECE1Xs-dpdFhXEA","UCpSQhfFzpZ9COp_WiKSUEkQ","UCQAMRRo7fPbQMzlJWOexlZg","UC7LH9bWIKZd82LpdouIBOLw","UCADS14Ed6epGTSy9I3VLxCg","UCwOnVxzxkqDOYnEhhffNMAA"];
 for(let index=0;index<names.length;index++){
  const name=names[index];let rows=[];
  try {rows=$(name).all().map(i=>i.json);} catch {}
  checked++;
  const channel=channels.find(c=>c.id===ids[index]);
  let issue='';
  if(!channel?.contentDetails?.relatedPlaylists?.uploads)issue='Channel uploads unavailable; check YouTube API access.';
  else if(!rows.length)issue='No API response received.';
  else if(rows.some(r=>r.error))issue='YouTube API request failed; check quota and credential restrictions.';
  else if(rows.some(r=>!Array.isArray(r.items)))issue='Unexpected YouTube API response.';
  else {
   const last=rows[rows.length-1];
   const old=last.items.length>0&&last.items.every(v=>Date.parse(v.contentDetails?.videoPublishedAt||v.snippet?.publishedAt)<Date.now()-6*24*60*60*1000);
   if(last.nextPageToken&&!old)issue='Scan reached the 500-video safety limit; channel check is incomplete.';
  }
  if(issue)failed.push({channel:name.replace(/^YouTube — /,''),error:issue});
 }
 return {expected:names.length,checked,failed_count:failed.length,loaded:checked-failed.length,failed};
}

const MAX_ATTEMPTS=3;
const minGapMs=5*60*60*1000;
const nowMs=Date.now();
const candidates=$('Attach Active Event').all().map(i=>i.json);
const recordedById=new Map($input.all().map(i=>i.json).filter(r=>r.id!=null&&r.video_id).map(r=>[String(r.video_id),r]));
const newVideos=[],retryVideos=[];
let alreadyRecorded=0,waitingRetries=0,exhaustedRetries=0;
for(const video of candidates){
 if(!video.video_id)continue;
 const row=recordedById.get(String(video.video_id));
 if(!row){newVideos.push({json:{...video,is_retry:false,next_attempt_count:1}});continue;}
 const status=String(row.status||'').trim().toUpperCase();
 if(status!=='RETRY_LATER'){alreadyRecorded++;continue;}
 const attempts=Number(row.attempt_count||0)||0;
 if(attempts>=MAX_ATTEMPTS){exhaustedRetries++;continue;}
 const lastAttempt=Date.parse(row.last_attempt_at);
 if(Number.isFinite(lastAttempt)&&nowMs-lastAttempt<minGapMs){waitingRetries++;continue;}
 retryVideos.push({json:{...video,is_retry:true,next_attempt_count:attempts+1}});
}
const selected=[...newVideos,...retryVideos];
if(selected.length)return selected;
const event=$('Event Ready').first().json;
const scan=readCaptureFeedStats();
const failed=scan.failed_count;
const summary=failed?'No transcripts captured; '+failed+' of '+scan.expected+' YouTube channels failed; scan incomplete':'No new eligible videos to capture';
return [{json:{...event,__no_capture_work:true,scan_stats:scan,eligible_count:candidates.filter(v=>v.video_id).length,already_recorded:alreadyRecorded,waiting_retries:waitingRetries,exhausted_retries:exhaustedRetries,capture_run_state:failed?'error':'idle',capture_run_summary:summary}}];
