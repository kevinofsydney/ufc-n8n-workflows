"""Remove deployment identities from snapshots using only ignored local input data."""
import json,re,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def replacements_from_private():
 replacements={}
 for path in sorted((ROOT/'.private/workflows').glob('*.json')):
  w=json.loads(path.read_text())['workflow']
  for node in w.get('nodes',[]):
   p=node.get('parameters',{})
   for key in ['chatId','chatIds']:
    value=p.get(key,p.get('additionalFields',{}).get(key))
    if value is not None and re.fullmatch(r'-?\d{7,}',str(value)):replacements[str(value)]='0'
   for key in ['fileId','folderId','documentId']:
    value=p.get(key,{})
    value=value.get('value') if isinstance(value,dict) else value
    if isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9_-]{20,}',value):replacements[value]='YOUR_'+key.upper()
   for typ,ref in node.get('credentials',{}).items():replacements[ref['name']]=typ+' credential'
  for resource in re.findall(r'(?:spreadsheets/d/|folders/)([A-Za-z0-9_-]{20,})',json.dumps(w)):
   if not resource.startswith('YOUR_'):replacements.setdefault(resource,'YOUR_GOOGLE_RESOURCE_ID')
 return replacements
def sanitize_text(text,replacements):
 for old,new in sorted(replacements.items(),key=lambda pair:-len(pair[0])):text=text.replace(old,new)
 text=re.sub(r'https?://[A-Za-z0-9.-]+\.app\.n8n\.cloud','https://N8N_INSTANCE.example',text)
 text=re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}','OWNER_EMAIL_REDACTED',text)
 text=re.sub(r'https://t\.me/[A-Za-z0-9_]+','https://t.me/YOUR_TELEGRAM_BOT',text)
 text=re.sub(r'\[@[A-Za-z0-9_]+\]\(https://t\.me/YOUR_TELEGRAM_BOT\)','[your Telegram bot](https://t.me/YOUR_TELEGRAM_BOT)',text)
 text=re.sub(r'(?m)[ \t]+$','',text)
 return text
def sanitize_value(value,replacements):
 if isinstance(value,dict):return {k:sanitize_value(v,replacements) for k,v in value.items()}
 if isinstance(value,list):return [sanitize_value(v,replacements) for v in value]
 if isinstance(value,str):return sanitize_text(value,replacements)
 if isinstance(value,int) and str(value) in replacements and replacements[str(value)]=='0':return 0
 return value
if __name__=='__main__':
 replacements=replacements_from_private()
 paths=[ROOT/'README.md',*(ROOT/'docs').rglob('*.md'),*(ROOT/'scripts').glob('*.json')]
 for path in paths:path.write_text(sanitize_text(path.read_text(),replacements))
 print('Sanitized narrative documentation; rebuild generated references next.')
