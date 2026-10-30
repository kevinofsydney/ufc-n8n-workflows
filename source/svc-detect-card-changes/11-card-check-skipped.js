const request=$('Prepare UFC Card Request').first().json;
const status=/locked/i.test(request.skip_reason)?'LOCKED':'SKIPPED';
return [{json:{...request,card_check:{status,reason:request.skip_reason,checked_at:new Date().toISOString(),changes:[],change_count:0}}}];
