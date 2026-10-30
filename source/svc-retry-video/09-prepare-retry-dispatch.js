const request=$('Validate Video Retry').first().json;
const saved=$input.all().map(item=>item.json).filter(row=>row.video_id===request.target_video_id&&row.event_key===request.event_key);
if(saved.length!==1)throw new Error('Could not reserve the requested UFC video retry.');
return [{json:{...request,target_video_row:saved[0]}}];
