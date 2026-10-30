let request={}; try {request=$('Run On Demand').first().json;} catch {}
const event=$('Event Ready').first().json;
return [{json:{...event,target_video_id:request.manual_retry===true?String(request.target_video_id||''):'',target_video_row:request.target_video_row||null,manual_retry:request.manual_retry===true}}];
