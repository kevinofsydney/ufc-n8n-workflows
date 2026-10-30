// Turns a failure into a stable incident key: same workflow + same error (ignoring ids, numbers, URLs) = same incident.
const f=$input.first().json;
const text=v=>String(v??'').trim();
const signature=text(f.failure_summary).toLowerCase()
 .replace(/\[line \d+\]/g,'')
 .replace(/https?:\/\/\S+/g,'<url>')
 .replace(/\b[0-9a-f]{8,}\b|\b[a-z0-9]{16,}\b/gi,'<id>')
 .replace(/\d+(\.\d+)?/g,'<n>')
 .replace(/\s+/g,' ').trim().slice(0,300);
let hash=2166136261;for(let i=0;i<signature.length;i++)hash=Math.imul(hash^signature.charCodeAt(i),16777619)>>>0;
// Temporary problems a later attempt usually gets past. Checked against the message and Google's longer description.
const TRANSIENT=/quota exceeded|rate.?limit|too many requests|\b429\b|\b50[234]\b|service unavailable|bad gateway|gateway time-?out|etimedout|econnreset|econnrefused|socket hang up|\btimed? ?out\b|temporarily unavailable|network error|eai_again/i;
const category=TRANSIENT.test(text(f.failure_summary)+' '+text(f.failure_description))?'transient':'unknown';
const key=(f.is_test?'test|':'error|')+f.workflow_id+'|fnv1a-'+hash.toString(16).padStart(8,'0');
return [{json:{...f,signature,incident_key:key,category}}];
