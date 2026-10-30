const request=$('Normalize Video Request').first().json;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const short=(v,n)=>{const s=String(v??'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
const button=(text,data)=>({text,additionalFields:{callback_data:data}});
const keyboard=buttons=>buttons.map(b=>({row:{buttons:Array.isArray(b)?b:[b]}}));
const answer=(text,buttons=[button('🎬 Videos','videos')],extra={})=>[{json:{...request,should_read_summary:false,text,keyboard_rows:keyboard(buttons),...extra}}];
if(!request.valid)return answer('Use /videos to browse captured videos, /videos 2 for another page, or /video VIDEO_ID to reopen a saved summary.');
const events=$('Read Active Event').all().map(i=>i.json).filter(e=>e.event_key&&(e.active===true||e.active==='true'));
if(events.length!==1)return answer('Videos are unavailable: expected exactly one active UFC event.',[button('Main menu','menu')]);
const event=events[0];
const allRows=$input.all().map(i=>i.json).filter(r=>r.video_id&&r.event_key===event.event_key);
const dateValue=r=>Date.parse(r.completed_at||r.published_at||r.createdAt)||0;
const latest=new Map();
for(const row of allRows){const old=latest.get(row.video_id);if(!old||Date.parse(row.updatedAt||0)>Date.parse(old.updatedAt||0))latest.set(row.video_id,row);}
const rows=[...latest.values()].filter(r=>r.transcript_appended===true||r.transcript_appended==='true').sort((a,b)=>dateValue(b)-dateValue(a)||String(a.video_id).localeCompare(String(b.video_id)));
const status=row=>row.analysis_status==='COMPLETED'?'✅ Analysed':row.analysis_status==='PROCESSING'?'⏳ Analysing':row.analysis_status==='FAILED'?'⚠️ Analysis failed':row.analysis_status==='CARD_CHANGED'?'♻️ Analysis needs updating':'📄 Captured · awaiting analysis';
if(request.command==='video'){
 const row=rows.find(r=>r.video_id===request.video_id);
 if(!row)return answer('That video is not in the captured list for the active event. Tap Videos to refresh the list.',[button('🎬 Videos','videos')]);
 const selected={...request,event_name:event.event_name,event_key:event.event_key,spreadsheet_id:event.spreadsheet_id,spreadsheet_url:event.spreadsheet_url,selected_video:row};
 if(row.analysis_status==='COMPLETED'&&event.spreadsheet_id)return [{json:{...selected,should_read_summary:true}}];
 const lines=['<b>'+esc(short(row.channel_name,100))+'</b>',esc(short(row.video_title,180)),'',esc(status(row))];
 if(row.analysis_status==='COMPLETED')lines.push('The event spreadsheet is unavailable, so the saved summary cannot be loaded.');
 else lines.push('The transcript is captured. A saved summary will be available after analysis completes.');
 if(row.analysis_error)lines.push('',esc(short(row.analysis_error,240)));
 return answer(lines.join('\n'),[button('🎬 Back to videos','videos '+request.list_page),{text:'▶️ Watch video',additionalFields:{url:'https://www.youtube.com/watch?v='+row.video_id}}],selected);
}
if(!rows.length)return answer('<b>Captured videos</b>\n'+esc(short(event.event_name,180))+'\n\nNo videos have been captured for this event yet.',[button('Refresh','videos'),button('Main menu','menu')]);
const size=8,pages=Math.ceil(rows.length/size),page=Math.min(request.page,pages),start=(page-1)*size,visible=rows.slice(start,start+size);
const done=rows.filter(r=>r.analysis_status==='COMPLETED').length;
const lines=['<b>Captured videos</b>',esc(short(event.event_name,180)),rows.length+' captured · '+done+' analysed','Page '+page+' of '+pages,'','Tap a video button to reopen its saved summary.'];
const controls=[];
for(const [i,row] of visible.entries()){
 const number=start+i+1;
 lines.push('','<b>'+number+'. '+esc(short(row.channel_name,80))+'</b> — '+esc(status(row)),esc(short(row.video_title,140)));
 controls.push(button(number+'. '+short(row.channel_name||'Video',32)+(row.analysis_status==='COMPLETED'?' · Summary':' · Status'),'video '+row.video_id+' 1 '+page));
}
const nav=[];
if(page>1)nav.push(button('← Previous','videos '+(page-1)));
if(page<pages)nav.push(button('Next →','videos '+(page+1)));
if(nav.length)controls.push(nav);
controls.push([button('Refresh','videos '+page),button('Main menu','menu')]);
return answer(lines.join('\n'),controls,{list_page:page,event_key:event.event_key,video_count:rows.length,analysed_count:done});
