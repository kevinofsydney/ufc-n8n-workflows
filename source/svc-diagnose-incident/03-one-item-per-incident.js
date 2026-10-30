// The AI step runs once per incident; with nothing to diagnose, nothing runs after this.
const p=$input.first().json;
const dry=$('When Called').first().json.dry_run===true;
return (p.incidents||[]).map(i=>({json:{...i,dry_run:dry}}));
