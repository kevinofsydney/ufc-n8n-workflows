const p=$('Plan Card Changes').first().json;
return [{json:{...p.event,card_apply:{status:p.status,applied:(p.applied||[]).length,waiting:p.waiting||[],videos:(p.videos||[]).map(v=>v.video_id),rows:p.row_summary||null,reason:p.reason||null,dry_run:p.dry_run}}}];
