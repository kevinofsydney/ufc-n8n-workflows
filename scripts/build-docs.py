#!/usr/bin/env python3
"""Build the reference from local MCP snapshots; never connects to or changes n8n."""
import json, re, pathlib, hashlib
from sanitize import replacements_from_private,sanitize_value,sanitize_text
ROOT=pathlib.Path(__file__).resolve().parents[1]
REPLACEMENTS=replacements_from_private()
def write(path,text):
 p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(sanitize_text(text,REPLACEMENTS).rstrip()+'\n')
def slug(text):return re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')
def clean(value):
 if isinstance(value,list):return [clean(v) for v in value]
 if isinstance(value,dict):
  out={k:clean(v) for k,v in value.items() if k not in {'webhookId','pinData','staticData','scopes','meta','activeVersion'}}
  if 'credentials' in out:out['credentials']={k:{'name':v['name']} for k,v in out['credentials'].items()}
  return out
 return value
raw=[json.loads(p.read_text()) for p in sorted((ROOT/'.private/workflows').glob('*.json'))]
workflows={d['workflow']['id']:sanitize_value(clean(d['workflow']),REPLACEMENTS) for d in raw}
profiles=json.loads((ROOT/'scripts/workflow-descriptions.json').read_text())
assert len(workflows)==len(profiles)==28
names={id:slug(w['name'].replace('UFC | ','')) for id,w in workflows.items()}
def link(id,prefix=''):
 return f"[{workflows[id]['name']}]({prefix}{names[id]}.md)"
def table(rows):return '\n'.join('| '+' | '.join(str(x).replace('|','\\|').replace('\n','<br>') for x in r)+' |' for r in rows)
def edges(w):
 for source,channels in w.get('connections',{}).items():
  for typ,outputs in channels.items():
   for index,targets in enumerate(outputs):
    for target in targets:yield source,typ,index,target['node'],target.get('index',0)
def calls(w):
 result=[]
 for n in w['nodes']:
  ref=n.get('parameters',{}).get('workflowId',{})
  id=ref.get('value') if isinstance(ref,dict) else ref
  if id:result.append((n['name'],id,n.get('parameters',{}).get('options',{}).get('waitForSubWorkflow','default'),n['type']))
 return result
manifest=[]
for id,w in sorted(workflows.items(),key=lambda x:x[1]['name']):
 purpose,steps,caveats=profiles[id];page=names[id];nodes=w['nodes'];rows=[]
 export={k:v for k,v in w.items() if k in {'id','name','description','nodes','connections','settings','nodeGroups','tags'}}
 write(f'workflows/{page}.json',json.dumps(export,indent=2,ensure_ascii=False))
 js=[]
 for i,n in enumerate(nodes):
  p=n.get('parameters',{});kind=n['type'].split('.')[-1]
  resource=p.get('dataTableId',{});resource=resource.get('cachedResultName',resource.get('value','')) if isinstance(resource,dict) else resource
  sheet=p.get('sheetName',{});sheet=sheet.get('value','') if isinstance(sheet,dict) else sheet
  details=''
  if kind=='code':
   path=f'source/{page}/{i+1:02d}-{slug(n["name"])}.js';write(path,p.get('jsCode',''));js.append((n['name'],path));details=f'[JavaScript](../../{path})'
  elif kind=='dataTable':details=f"{p.get('operation','insert')} {resource}"
  elif kind=='googleSheets':details=f"{p.get('operation','read')} {sheet or p.get('range','dynamic sheet')}"
  elif kind in ('executeWorkflow','toolWorkflow'):details=str(p.get('workflowId',{}).get('value',''))
  elif kind in ('httpRequest','httpRequestTool'):details=str(p.get('url',''))
  elif kind=='telegram':details=f"Telegram {p.get('operation','sendMessage')}"
  else:details=p.get('operation',p.get('mode',''))
  settings=', '.join(f'{key}={n[key]}' for key in ['disabled','onError','retryOnFail','maxTries','waitBetweenTries','alwaysOutputData','executeOnce'] if key in n)
  rows.append([i+1,n['name'],kind,details,settings])
 triggers=[{'name':n['name'],'type':n['type'],'parameters':n.get('parameters',{})} for n in nodes if 'Trigger' in n['type'] or n['type'].endswith('.errorTrigger')]
 callers=[(otherid,node) for otherid,other in workflows.items() for node,target,wait,typ in calls(other) if target==id]
 terminal=[n['name'] for n in nodes if not any(e[0]==n['name'] and e[1]=='main' for e in edges(w)) and not any(k.startswith('ai_') for k in w.get('connections',{}).get(n['name'],{})) and not n['type'].endswith('.stickyNote')]
 text=f'# {w["name"]}\n\n{purpose}\n\n[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/{id}) · [Sanitized snapshot](../../workflows/{page}.json)\n\n'
 text+=f'## Identity and version\n\n- Workflow ID: `{id}`\n- Published: `{w["active"]}`\n- Published version: `{w["activeVersionId"]}`\n- Draft version: `{w["versionId"]}`\n- Snapshot: 2026-10-30. Published graph matched draft when read.\n- Nodes: {len(nodes)}\n- Timezone: `{w.get("settings",{}).get("timezone","inherits instance timezone; not present in MCP snapshot")}`\n\n'
 text+='## How it works\n\n'+'\n'.join(f'{i+1}. {step}' for i,step in enumerate(steps))+'\n\n## Important behavior and limits\n\n'+caveats+'\n\n'
 text+='## Triggers and input contract\n\n```json\n'+json.dumps(triggers,indent=2,ensure_ascii=False)+'\n```\n\nPassthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).\n\n'
 text+='## Connections to other workflows\n\n'
 text+='Called by: '+(', '.join(link(caller)+' via `'+node+'`' for caller,node in callers) or 'No static caller in the exported workflows; entry may be scheduled, external, dynamic or error-driven.')+'\n\n'
 for node,target,wait,typ in calls(w):text+=f'- `{node}` → '+(link(target) if target in workflows else f'`{target}` (dynamic target)')+f'; waitForSubWorkflow=`{wait}`; node type `{typ}`.\n'
 if id=='G1EMMFVSzpGE4q3Q':text+='- Dynamic retry dispatch selects capture or analysis from the validated request.\n'
 if id=='SrL8ScYMIBiJ9Gki':text+='- Dynamic automatic retry dispatch is restricted in code to capture, analysis and grading.\n'
 err=w.get('settings',{}).get('errorWorkflow');text+='\nConfigured error handler: '+(link(err) if err in workflows else '`'+str(err)+'`')+'. See [monitoring](../monitoring.md) for production Error Trigger behavior.\n\n'
 text+='## Data access and output\n\n'
 access=[]
 for n in nodes:
  p=n.get('parameters',{});r=p.get('dataTableId')
  if isinstance(r,dict):access.append([n['name'],r.get('cachedResultName',r.get('value')),p.get('operation','insert'),', '.join(p.get('columns',{}).get('value',{}).keys())])
 text+=(table([['Node','Table','Operation','Written fields'],['---']*4]+access) if access else 'No direct n8n data-table access. External services, sheets or called workflows may still read/write data.')+'\n\n'
 text+='Terminal nodes in the saved graph: '+', '.join('`'+x+'`' for x in terminal)+'. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.\n\n'
 text+='## Node reference\n\n'+table([['#','Node','Type','Action / source','Execution settings'],['---']*5]+rows)+'\n\n'
 text+='## Exact graph edges\n\nMain output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.\n\n'
 text+=table([['From','Connection','Output','To','Input'],['---']*5]+[list(e) for e in edges(w)])+'\n\n'
 text+='## Code and configuration\n\n'+('\n'.join(f'- `{n}`: [source](../../{p})' for n,p in js) or 'No Code nodes.')+'\n\nFull parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).\n'
 write(f'docs/workflows/{page}.md',text)
 manifest.append({'id':id,'name':w['name'],'file':f'workflows/{page}.json','documentation':f'docs/workflows/{page}.md','active':w['active'],'activeVersionId':w['activeVersionId'],'versionId':w['versionId'],'nodeCount':len(nodes),'snapshotSha256':hashlib.sha256((ROOT/f'workflows/{page}.json').read_bytes()).hexdigest()})
write('inventory/manifest.json',json.dumps({'snapshotDate':'2026-10-30','workflowCount':len(manifest),'workflows':manifest},indent=2))
index='# Workflow catalogue\n\nAll 28 UFC workflows visible through MCP were read directly from the live instance on 2026-10-30. Every workflow was published and its published graph matched its current draft. This is a point-in-time reference, not automatic synchronization.\n\n'
index+=table([['Workflow','Nodes','Purpose'],['---']*3]+[[link(id,'workflows/'),len(w['nodes']),profiles[id][0]] for id,w in sorted(workflows.items(),key=lambda x:x[1]['name'])])
write('docs/workflows.md',index)
schedule='# Schedules\n\nTimes below are configured wall-clock values. An explicit workflow timezone wins; otherwise n8n uses the instance default, which was not supplied in the MCP workflow snapshots. Do not infer Sydney time from workflow names or owner location. Confirm the instance timezone before converting inherited schedules to local time. Weekday numbers: 0 Sunday, 1 Monday, …, 6 Saturday. Missing weekly days default to Sunday; missing minutes default to zero.\n\n'
rows=[]
for id,w in sorted(workflows.items(),key=lambda x:x[1]['name']):
 for n in w['nodes']:
  if n['type'].endswith('.scheduleTrigger'):
   for rule in n['parameters']['rule']['interval']:rows.append([link(id,'workflows/'),n['name'],json.dumps(rule),w.get('settings',{}).get('timezone','instance default')])
schedule+=table([['Workflow','Trigger','Configured rule','Timezone'],['---']*4]+rows)
write('docs/schedules.md',schedule)
used={n['parameters']['dataTableId']['value'] for w in workflows.values() for n in w['nodes'] if isinstance(n.get('parameters',{}).get('dataTableId'),dict)}
tables=[t for t in json.loads((ROOT/'.private/tables.json').read_text())['data'] if t['id'] in used]
write('inventory/data-tables.json',json.dumps(tables,indent=2))
schema='# Data table schema reference\n\nSchema only; no live table rows are included. n8n additionally supplies system row fields such as id, createdAt and updatedAt. Table IDs are instance-specific and are not credentials.\n\n'
for t in sorted(tables,key=lambda t:t['name']):
 schema+=f'## {t["name"]}\n\nID: `{t["id"]}`.\n\n'+table([['Column','Type'],['---','---']]+[[c['name'],c['type']] for c in sorted(t['columns'],key=lambda c:c['index'])])+'\n\n'
write('docs/data-tables.md',schema)
credentials={}
for w in workflows.values():
 for n in w['nodes']:
  for typ,ref in n.get('credentials',{}).items():credentials.setdefault((typ,ref['name']),set()).add(w['id'])
creds='# Credentials and external integrations\n\nThese are generic credential aliases and observed integration types. Original display names, values and credential IDs are omitted. Recreate or select credentials in n8n and bind each relevant node; never paste tokens into code or commit them.\n\n'
creds+=table([['Credential type','Name','Used by'],['---']*3]+[[typ,name,', '.join(link(id,'workflows/') for id in sorted(ids))] for (typ,name),ids in sorted(credentials.items())])
write('docs/credentials.md',creds)
graph=['flowchart LR']
for id,w in workflows.items():graph.append(f'  w{id}["{w["name"].replace("UFC | ","")}"]')
for id,w in workflows.items():
 for node,target,wait,typ in calls(w):
  if target in workflows:graph.append(f'  w{id} -->|{"tool" if "toolWorkflow" in typ else "wait" if wait is True else "dispatch" if wait is False else "call"}| w{target}')
for target in ['y20ZZYzBVS6y8kC0','BvLnPFMwQ2vhPkgv']:graph.append(f'  wG1EMMFVSzpGE4q3Q -.->|dynamic| w{target}')
for target in ['y20ZZYzBVS6y8kC0','BvLnPFMwQ2vhPkgv','PulwhLsIZhfvCGxl']:graph.append(f'  wSrL8ScYMIBiJ9Gki -.->|retry| w{target}')
write('docs/dependencies.mmd','\n'.join(graph))
write('docs/dependencies.md','# Workflow call graph\n\nSolid edges are explicit child-workflow/tool calls in the saved configuration. Dashed edges are the validated dynamic retry targets. Shared tables and sheets create additional data dependencies; they are described in the architecture guide. Error-handler links are documented per workflow and omitted here to keep the diagram readable.\n\n```mermaid\n'+'\n'.join(graph)+'\n```')
print(f'Generated {len(workflows)} workflow guides, {sum(len(w["nodes"]) for w in workflows.values())} node references, {len(tables)} table schemas and {sum(n["type"].endswith(".code") for w in workflows.values() for n in w["nodes"])} source files.')
