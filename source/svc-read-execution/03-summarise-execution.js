// Turns an n8n execution into a compact summary an AI can read: the error, the failing node, and for each
// node its item count and a trimmed sample. Long strings (whole web pages) are cut to a preview with their
// length, lists to their first few entries, so one execution never floods the model's context.
const req=$('When Called').first().json;
const MAX_CHARS=Math.min(Math.max(Number(req.max_chars)||12000,2000),30000);
const STR=Number(req.max_string)||400,LIST=5,DEPTH=5;
const raw=String($input.first().json.data??$input.first().json.body??'');
const line=raw.split('\n').find(l=>l.startsWith('data: '));
if(!line)throw new Error('The n8n MCP server returned no data.');
const rpc=JSON.parse(line.slice(6));
if(rpc.error)throw new Error('n8n MCP error: '+JSON.stringify(rpc.error).slice(0,300));
const textOut=(rpc.result?.content||[]).map(c=>c.text||'').join('');
if(rpc.result?.isError)return [{json:{error:textOut.slice(0,1000)}}];
const e=JSON.parse(textOut);
const trim=(v,d=0)=>{
 if(typeof v==='string')return v.length>STR?v.slice(0,STR)+'… ['+v.length+' chars]':v;
 if(Array.isArray(v))return d>=DEPTH?'[list of '+v.length+']':[...v.slice(0,LIST).map(x=>trim(x,d+1)),...(v.length>LIST?['… '+(v.length-LIST)+' more']:[])];
 if(v&&typeof v==='object'){if(d>=DEPTH)return '{object}';const o={};for(const [k,x] of Object.entries(v))o[k]=trim(x,d+1);return o;}
 return v;
};
const result=e.data?.resultData||{};
const err=result.error||{};
const nodes={};
for(const [name,runs] of Object.entries(result.runData||{})){
 const r=runs[runs.length-1]||{};
 const main=r.data?.main||[];
 nodes[name]={runs:runs.length,status:r.executionStatus||(r.error?'error':'success'),error:r.error?trim({message:r.error.message,description:r.error.description}):undefined,
  outputs:main.map(o=>(o||[]).length),first_item:main[0]?.[0]?.json!==undefined?trim(main[0][0].json):undefined};
}
let summary={execution:trim(e.execution||{}),error:err.message?trim({message:err.message,description:err.description,node:err.node?.name}):null,
 last_node:result.lastNodeExecuted||null,nodes};
let out=JSON.stringify(summary);
// Still too long: keep the error and the nodes nearest the failure, drop samples from the rest.
if(out.length>MAX_CHARS){const names=Object.keys(nodes);const keep=new Set(names.slice(-4).concat(result.lastNodeExecuted||[]));
 for(const n of names)if(!keep.has(n))delete nodes[n].first_item;out=JSON.stringify(summary);}
if(out.length>MAX_CHARS)out=out.slice(0,MAX_CHARS)+'… [summary cut at '+MAX_CHARS+' chars]';
return [{json:{summary:out}}];
