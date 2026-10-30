const view=$('Choose Video View').first().json;
const row=view.selected_video;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const short=(v,n)=>{const s=String(v??'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
const rowsOf=name=>$(name).all().map(i=>i.json);
const pickData=rowsOf('Read Saved Picks'),propData=rowsOf('Read Saved Props');
const keyboard_rows=[];
const buttons=[];
const back={text:'🎬 Back to videos',additionalFields:{callback_data:'videos '+view.list_page}};
const watch={text:'▶️ Watch video',additionalFields:{url:'https://www.youtube.com/watch?v='+row.video_id}};
const sheet={text:'📄 Spreadsheet',additionalFields:{url:view.spreadsheet_url||'https://docs.google.com/spreadsheets/d/'+view.spreadsheet_id+'/edit'}};
if([...pickData,...propData].some(r=>r.error)){
 return [{json:{...view,text:'Could not load the saved summary from the event spreadsheet. Try again in a moment.',keyboard_rows:[{row:{buttons:[back,sheet]}}],summary_available:false}}];
}
const picks=pickData.filter(p=>p.video_id===row.video_id&&p.event_key===view.event_key&&p.picked_fighter).sort((a,b)=>Number(a.fight_order||999)-Number(b.fight_order||999));
const props=propData.filter(p=>p.video_id===row.video_id&&p.event_key===view.event_key&&p.market);
const header=['<b>Saved video summary</b>','<b>'+esc(short(row.channel_name,70))+'</b>',esc(short(row.video_title,120)),esc(short(view.event_name,120)),picks.length+' picks · '+props.length+' props'].join('\n');
function method(pick){
 const priorities=['method_and_round','method_of_victory','inside_distance','winning_round'];
 const matching=props.filter(p=>Number(p.fight_order)===Number(pick.fight_order)&&p.fighter===pick.picked_fighter);
 let p;
 for(const market of priorities){p=matching.find(p=>p.market===market);if(p)break;}
 if(!p)return 'to win';
 const round=p.round?' in R'+p.round:p.round_range?' in '+short(p.round_range,20):'';
 if(p.method==='KO_TKO')return 'by KO/TKO'+round;
 if(p.method==='submission')return 'by submission'+round;
 if(p.method==='decision')return 'by decision';
 if(p.market==='inside_distance')return 'inside the distance'+round;
 if(p.market==='winning_round')return 'to win'+round;
 return 'to win';
}
const sections=[];
if(picks.length)sections.push('<b>Fight-card picks</b>');
for(const p of picks){
 const opponent=p.picked_fighter===p.fighter_a?p.fighter_b:p.fighter_a;
 const confidence=Number(p.confidence_score);
 let text='<b>'+Number(p.fight_order||0)+'. '+esc(short(p.picked_fighter,55))+' '+esc(method(p))+'</b> over '+esc(short(opponent,55));
 if(Number.isFinite(confidence)&&confidence>0)text+=' — '+confidence+'/10';
 if(p.reasoning_summary)text+='\n↳ '+esc(short(p.reasoning_summary,150));
 sections.push(text);
}
const recommended=props.filter(p=>['lean','recommended_bet','best_bet'].includes(p.recommendation_strength)).sort((a,b)=>Number(a.fight_order||999)-Number(b.fight_order||999));
if(recommended.length)sections.push('<b>Betting leans and recommendations</b>');
for(const p of recommended)sections.push('• Fight '+Number(p.fight_order||0)+': '+esc(short(p.selection,140))+(p.odds_mentioned?' at '+esc(short(p.odds_mentioned,20)):'')+' — '+esc(String(p.recommendation_strength).replace(/_/g,' ')));
if(!sections.length)sections.push('No saved picks or betting recommendations were found. Open the spreadsheet to inspect the extraction.');
const pages=[];let chunk='';
const budget=Math.max(1200,3600-header.length);
for(const section of sections){
 const next=chunk?chunk+'\n\n'+section:section;
 if(next.length>budget&&chunk){pages.push(chunk);chunk=section;}else chunk=next;
}
if(chunk)pages.push(chunk);
const page=Math.min(view.page,pages.length),nav=[];
if(page>1)nav.push({text:'← Previous',additionalFields:{callback_data:'video '+row.video_id+' '+(page-1)+' '+view.list_page}});
if(page<pages.length)nav.push({text:'More →',additionalFields:{callback_data:'video '+row.video_id+' '+(page+1)+' '+view.list_page}});
if(nav.length)keyboard_rows.push({row:{buttons:nav}});
keyboard_rows.push({row:{buttons:[back,watch]}},{row:{buttons:[sheet]}});
return [{json:{...view,text:header+'\nPage '+page+' of '+pages.length+'\n\n'+pages[page-1],keyboard_rows,summary_available:picks.length>0||props.length>0,pick_count:picks.length,prop_count:props.length,summary_page:page,summary_pages:pages.length}}];
