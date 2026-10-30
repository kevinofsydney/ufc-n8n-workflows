
const request=$('Prepare Balance Request').first().json;
const credits=$('Get Credits').first()?.json??{}, key=$('Get Key Info').first()?.json?.data??{};
const valid=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const totals=credits.data||{};
const account=valid(totals.total_credits)&&valid(totals.total_usage)?Number(totals.total_credits)-Number(totals.total_usage):null;
const keyRemaining=valid(key.limit_remaining)?Number(key.limit_remaining):null;
const remaining=account!==null&&keyRemaining!==null?Math.min(account,keyRemaining):account??keyRemaining;
const source=remaining===null?'unavailable':keyRemaining!==null&&(account===null||keyRemaining<account)?'key_limit':'account';
const low=remaining!==null&&remaining<request.threshold_usd;
const old=request.monitor_state||{};
const since=Date.now()-Date.parse(old.last_alerted_at||0);
const due=!old.last_alerted_at||!Number.isFinite(since)||since>=24*60*60*1000;
const issue=low||remaining===null;
const should_alert=request.is_scheduled&&issue&&(due||old.status==='healthy');
const money=value=>valid(value)?'$'+Number(value).toFixed(2):'unavailable';
const lines=request.is_scheduled
 ? [remaining===null?'<b>UFC credit monitor unavailable</b>':'<b>UFC OpenRouter credit is low</b>',remaining===null?'The credential cannot currently report an account balance or key limit. Use /credits to inspect access.':'Remaining: <b>'+money(remaining)+'</b> ('+source.replace('_',' ')+')',remaining===null?'':'Alert threshold: US$'+request.threshold_usd.toFixed(2),'Checks run at 9 am and 9 pm Sydney time; low-balance reminders are limited to once per day.','<a href="https://openrouter.ai/settings/credits">OpenRouter credits</a>']
 : ['<b>OpenRouter credit</b>','Remaining: <b>'+money(remaining)+'</b>'+ (remaining!==null?' ('+source.replace('_',' ')+')':''),'Alert threshold: US$'+request.threshold_usd.toFixed(2),'Spend today '+money(key.usage_daily)+' · 7 days '+money(key.usage_weekly)+' · month '+money(key.usage_monthly),'Automatic checks: 9 am and 9 pm Sydney time.'];
return [{json:{chat_id:request.chat_id||0,text:lines.filter(Boolean).join('\n'),monitor_key:'openrouter',threshold_usd:request.threshold_usd,is_scheduled:request.is_scheduled,remaining_usd:remaining,balance_source:source,status:remaining===null?'unavailable':low?'low':'healthy',last_alerted_at:old.last_alerted_at||null,should_alert,should_notify:!request.is_scheduled||should_alert}}];
