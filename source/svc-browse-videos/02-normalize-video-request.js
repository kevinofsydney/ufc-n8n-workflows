const input=$input.first().json;
if(Number(input.chat_id)!==0)return [];
const command=String(input.command||'videos').toLowerCase();
const parts=String(input.args||'').trim().split(/\s+/).filter(Boolean);
const positive=v=>/^[1-9]\d{0,5}$/.test(String(v||''))?Number(v):null;
let valid=true,video_id='',page=1,list_page=1;
if(command==='video'){
 video_id=parts[0]||'';
 valid=/^[A-Za-z0-9_-]{11}$/.test(video_id)&&parts.length<=3;
 page=parts[1]?positive(parts[1]):1;
 list_page=parts[2]?positive(parts[2]):1;
 valid=valid&&Boolean(page)&&Boolean(list_page);
}else{
 valid=command==='videos'&&parts.length<=1;
 page=parts[0]?positive(parts[0]):1;
 valid=valid&&Boolean(page);
}
return [{json:{chat_id:0,command,video_id,page:page||1,list_page:list_page||1,valid,dry_run:input.dry_run===true}}];
