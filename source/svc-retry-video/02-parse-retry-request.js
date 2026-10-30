
const request=$input.first().json;
const chat_id=Number(request.chat_id);
if(chat_id!==0) return [];
const usage='Use /retry VIDEO_ID or /retry capture VIDEO_ID or /retry analyse VIDEO_ID. A YouTube watch URL also works. Only an unfinished video for the active UFC event can be retried. Analysis uses OpenRouter credits.';
const parts=String(request.args||'').trim().split(/\s+/).filter(Boolean);
let requested_stage=['capture','analyse','analyze'].includes((parts[0]||'').toLowerCase())?parts.shift().toLowerCase():'auto';
if(requested_stage==='analyze')requested_stage='analyse';
let id=parts.length===1?parts[0]:'';
if(/^https?:\/\//i.test(id)){
 const short=id.match(/^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/i);
 const watch=id.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?([^#]*)/i);
 id=short?short[1]:watch?(watch[1].split('&').find(part=>part.startsWith('v='))||'').slice(2):'';
}
const valid=/^[A-Za-z0-9_-]{11}$/.test(id);
return [{json:{chat_id,video_id:id,requested_stage,request_valid:valid,text:valid?'':usage}}];
