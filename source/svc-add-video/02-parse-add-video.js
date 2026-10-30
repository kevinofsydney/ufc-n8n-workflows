const source=$input.first().json;
if(Number(source.chat_id)!==0)return [];
const dry_run=source.dry_run===true;
const usage='Use /addvideo https://www.youtube.com/watch?v=VIDEO_ID. Adds one video for the active UFC event, captures its English transcript and analyses it using OpenRouter credits.';
const parts=String(source.args||'').trim().split(/\s+/).filter(Boolean);
let raw=parts.length===1?parts[0]:'';
raw=raw.replace(/^<([^<>]+)>$/,'$1');
const match=raw.match(/^https?:\/\/((?:(?:www|m|music)\.)?youtube\.com|(?:www\.)?youtu\.be)(\/[^?#]*)(?:\?([^#]*))?(?:#.*)?$/i);
let id='';
if(match){
 const host=match[1].toLowerCase(),path=match[2],query=match[3]||'';
 if(host==='youtu.be'||host==='www.youtu.be')id=path.replace(/^\/|\/$/g,'');
 else if(path==='/watch'){
  const ids=query.split('&').filter(p=>p.split('=')[0]==='v');
  if(ids.length===1){try{id=decodeURIComponent(ids[0].slice(2));}catch{}}
 }else {const m=path.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/);if(m)id=m[1];}
}
const valid=/^[A-Za-z0-9_-]{11}$/.test(id);
return [{json:{chat_id:0,dry_run,valid,video_id:valid?id:'',video_url:valid?'https://www.youtube.com/watch?v='+id:'',outcome:valid?'valid':'invalid_url',text:valid?'':usage}}];
