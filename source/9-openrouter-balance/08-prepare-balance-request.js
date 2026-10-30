let request={};let scheduled=true;try {request=$('When Called').first().json;scheduled=false;}catch{}
const state=$input.all().map(item=>item.json).find(row=>row.monitor_key==='openrouter')||{};
return [{json:{...request,is_scheduled:scheduled,monitor_state:state,threshold_usd:Number(state.threshold_usd??5)}}];
