#!/usr/bin/env python3
"""Verify documentation snapshots without running workflow logic or contacting services."""
import hashlib,json,pathlib,re,subprocess,sys,urllib.parse
from sanitize import replacements_from_private
ROOT=pathlib.Path(__file__).resolve().parents[1]
errors=[]
def check(ok,message):
 if not ok:errors.append(message)
def slug(text):return re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')
manifest=json.loads((ROOT/'inventory/manifest.json').read_text())
entries=manifest['workflows'];ids={e['id'] for e in entries}
profiles=json.loads((ROOT/'scripts/workflow-descriptions.json').read_text())
check(len(entries)==manifest['workflowCount']==28,'Unexpected workflow inventory count')
check(ids==set(profiles),'Narrative workflow profiles do not match inventory')
check(len(list((ROOT/'workflows').glob('*.json')))==len(entries),'Extra or missing workflow snapshots')
sources=[];node_count=0
for entry in entries:
 path=ROOT/entry['file'];w=json.loads(path.read_text());node_count+=len(w['nodes'])
 check(hashlib.sha256(path.read_bytes()).hexdigest()==entry['snapshotSha256'],'Snapshot hash differs: '+entry['file'])
 check(w['id']==entry['id'] and len(w['nodes'])==entry['nodeCount'],'Snapshot metadata differs: '+entry['file'])
 check((ROOT/entry['documentation']).exists(),'Missing workflow guide: '+entry['documentation'])
 names={n['name'] for n in w['nodes']}
 check(len(names)==len(w['nodes']),'Duplicate node names: '+w['name'])
 for source,connections in w.get('connections',{}).items():
  check(source in names,'Missing edge source: '+source)
  for outputs in connections.values():
   for targets in outputs:
    for target in targets:check(target['node'] in names,'Missing edge target: '+target['node'])
 for i,n in enumerate(w['nodes']):
  p=n.get('parameters',{});ref=p.get('workflowId');target=ref.get('value') if isinstance(ref,dict) else ref
  if target and not str(target).startswith('='):check(target in ids,'Unresolved static workflow reference: '+str(target))
  for credential in n.get('credentials',{}).values():check(set(credential)=={'name'},'Unexpected credential content: '+w['name']+'/'+n['name'])
  if n['type'].endswith('.code'):
   source=ROOT/'source'/path.stem/(f'{i+1:02d}-'+slug(n['name'])+'.js');sources.append(str(source))
   check(source.exists(),'Missing code file: '+str(source))
   if source.exists():check(source.read_text().rstrip()==p.get('jsCode','').rstrip(),'Code file differs: '+str(source))
 check('pinData' not in w and 'staticData' not in w and 'activeVersion' not in w,'Unexpected operational data: '+str(path))
check(len(sources)==len(list((ROOT/'source').rglob('*.js'))),'Extra or missing extracted code files')
for path in [ROOT/'README.md',*(ROOT/'docs').rglob('*.md')]:
 for target in re.findall(r'\]\(([^)]+)\)',path.read_text()):
  target=target.strip('<>')
  if re.match(r'^[a-z]+:',target) or target.startswith('#'):continue
  target=urllib.parse.unquote(target.split('#')[0])
  check((path.parent/target).exists(),f'Broken link in {path.relative_to(ROOT)}: {target}')
patterns=[r'gh[pousr]_[A-Za-z0-9_]{20,}',r'sk-[A-Za-z0-9_-]{20,}',r'AIza[A-Za-z0-9_-]{30,}',r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',r'Bearer [A-Za-z0-9._-]{15,}',r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----']
paths=[ROOT/'README.md',*(ROOT/'workflows').rglob('*.json'),*(ROOT/'source').rglob('*.js'),*(ROOT/'docs').rglob('*'),*(ROOT/'inventory').glob('*.json'),*(ROOT/'scripts').glob('*.py'),*(ROOT/'scripts').glob('*.json')]
private_identifiers={old for old,new in replacements_from_private().items() if new=='0' or new.startswith('YOUR_')}
for path in paths:
 if not path.is_file():continue
 body=path.read_text()
 for pattern in patterns:check(not re.search(pattern,body),'Possible secret pattern in '+str(path.relative_to(ROOT)))
 for identifier in private_identifiers:check(identifier not in body,'Private deployment identifier in '+str(path.relative_to(ROOT)))
 check(not re.search(r'https?://[A-Za-z0-9.-]+\.app\.n8n\.cloud',body),'Private n8n hostname in '+str(path.relative_to(ROOT)))
 check(not re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',body),'Email address in '+str(path.relative_to(ROOT)))
 for bot in re.findall(r'https://t\.me/([A-Za-z0-9_]+)',body):check(bot=='YOUR_TELEGRAM_BOT','Bot account in '+str(path.relative_to(ROOT)))
for entry in entries:
 w=json.loads((ROOT/entry['file']).read_text())
 for n in w['nodes']:
  p=n.get('parameters',{})
  for collection in ['headerParameters','queryParameters','bodyParameters']:
   for pair in p.get(collection,{}).get('parameters',[]):
    if str(pair.get('name','')).lower() in {'authorization','x-api-key','api_key','apikey','key','x-n8n-api-key'}:
     value=str(pair.get('value',''))
     check(not value or value.startswith('=') or '{{' in value or set(value)<=set('*•'),'Literal auth parameter in '+w['name']+'/'+n['name'])
node_check='''const fs=require('node:fs');const files=JSON.parse(fs.readFileSync(0,'utf8'));const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let bad=0;for(const file of files){try{new AsyncFunction(fs.readFileSync(file,'utf8'));}catch(e){process.stderr.write(file+': '+e.message+'\\n');bad++;}}process.exitCode=bad?1:0;'''
syntax=subprocess.run(['node','-e',node_check],input=json.dumps(sources),capture_output=True,text=True)
check(syntax.returncode==0,'JavaScript syntax check failed: '+syntax.stderr)
if errors:
 print('\n'.join(errors));sys.exit(1)
print(f'PASS: {len(entries)} workflow guides/snapshots, {node_count} nodes, {len(sources)} source files; hashes, graph references, links, syntax and secret-pattern checks.')
