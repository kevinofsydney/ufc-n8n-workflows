// A rejected diagnosis is handed back to the caller to fix. Nothing is written, nothing is messaged.
return [{json:{recorded:false,ok:false,incident_key:$json.incident_key||'',reason:$json.reason||'Diagnosis rejected.',retry_hint:$json.retry_hint||''}}];
