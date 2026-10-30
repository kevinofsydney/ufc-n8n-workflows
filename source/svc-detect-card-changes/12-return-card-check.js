// Return the caller's event unchanged plus a compact card_check summary (the bulky JSON stays in the state table).
let check;
try{check=$('Compare Card Changes').first().json.card_check;}catch(e){check=$('Card Check Skipped').first().json.card_check;}
const {adopted_source_card_json:_adopted,pending_change_json:_pending,official_card_json:_official,...summary}=check;
return [{json:{...$('When Called').first().json,card_check:summary}}];
