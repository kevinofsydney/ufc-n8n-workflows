
const classification=$('Classify Existing Fight Card').first().json;
const result=classification.needs_population||classification.needs_weight_class_backfill?$input.first().json:classification;
const event=$('Prepare UFC Card Request').first().json;
return [{json:{...event,fight_card_status:result.fight_card_status||result.status||'READY',fight_card_count:result.fight_card_count||Number(JSON.parse(result.source_card_json||'[]').length),fight_card_fingerprint:result.fight_card_fingerprint||result.card_fingerprint||null,...(result.dry_run?{fight_card_preview:result.matrix||result.weight_class_preview,alias_warnings:result.alias_warnings,source_url:result.source_url}:{})}}];
