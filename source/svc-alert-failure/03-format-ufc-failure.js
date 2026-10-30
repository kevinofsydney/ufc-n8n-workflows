const allowed = new Set(["VkgPostfkMxFPWj6","mxXosIjmMSiItiYM","MWmlPIyBDUKoheXO","y20ZZYzBVS6y8kC0","YeYpgLGiYlzCTopn","PulwhLsIZhfvCGxl","f2CKNtQUpZ5Rm80Z","BvLnPFMwQ2vhPkgv","MabSJBF0Vt6sMICp","GQs7zaGeF1vZBRaj","LuALxCWYzByUY2Iq","G1EMMFVSzpGE4q3Q","SBBK0hOGx2uPYpm4"]);
const input = $input.first().json;
const isTest = input.__test === true || String(input.workflow?.name || '').startsWith('UFC | test.');
// Every UFC workflow alerts (new ones included), except this alert workflow itself.
const workflowId = String(input.workflow?.id || '');
if (workflowId === 'SrL8ScYMIBiJ9Gki' || !(allowed.has(workflowId) || String(input.workflow?.name || '').startsWith('UFC | '))) return [];
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = value => String(value ?? '').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/\bsk-[A-Za-z0-9_-]+/g, '[redacted]').replace(/([?&](?:token|key|api_key|secret)=)[^&\s]+/gi, '$1[redacted]');
const execution = input.execution || {};
const failure = execution.error || input.trigger?.error || {};
const message = clean(failure.message || failure.description || 'The workflow failed. Open its execution for details.').slice(0,1400);
const when = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' });
const lines = [
 isTest ? '<b>UFC failure alert — TEST</b>' : '<b>UFC workflow failed</b>',
 '<b>Workflow:</b> ' + esc(input.workflow.name || input.workflow.id),
 '<b>Step:</b> ' + esc(execution.lastNodeExecuted || failure.node?.name || input.trigger?.error?.node?.name || 'Trigger / unavailable'),
 '<b>Time:</b> ' + esc(when) + ' (Sydney)',
 '<b>Error:</b> ' + esc(message),
];
const link = String(execution.url || '');
if (/^https:\/\//i.test(link)) lines.push('<a href="' + esc(link).replace(/"/g, '&quot;') + '">Open failed execution</a>');
else if (execution.id) lines.push('Execution: ' + esc(execution.id));
if (isTest) lines.push('Test message: failure alert delivery is working.');
return [{ json: { text: lines.join('\n'), run_key:String(execution.id || 'trigger-'+input.workflow.id+'-'+Date.now()), workflow_id: String(input.workflow.id), workflow_name:String(input.workflow.name || ''), failure_summary: message, execution_url:link, failure_description: clean(failure.description || '').slice(0,600), mode: String(execution.mode || ''), node_name: String(execution.lastNodeExecuted || failure.node?.name || ''), is_test: isTest, dry_run: input.__dry_run === true } }];
