from pathlib import Path
import json,math,hashlib,re
R=Path(__file__).resolve().parent;config=json.loads((R/'public/cerebro.intro.json').read_text());keys=config['motion']['cameraKeys'];FPS=60
def smooth(x):x=max(0,min(1,x));return x*x*x*(x*(x*6-15)+10)
def sample(t,key):
 f=t*FPS;i=next((i for i in range(len(keys)-1) if f<=keys[i+1]['frame']),len(keys)-2);a,b=keys[i:i+2];dt=(b['frame']-a['frame'])/FPS;u=max(0,min(1,(f-a['frame'])/(b['frame']-a['frame'])));vec=isinstance(a[key],list);av=a[key] if vec else [a[key]];bv=b[key] if vec else [b[key]];out=[]
 for k,x in enumerate(av):
  prev=keys[max(0,i-1)];nxt=keys[min(len(keys)-1,i+2)];pv=prev[key][k] if vec else prev[key];nv=nxt[key][k] if vec else nxt[key]
  m0=0 if i==0 else (bv[k]-pv)/((b['frame']-prev['frame'])/FPS);m1=0 if i+1==len(keys)-1 else (nv-x)/((nxt['frame']-a['frame'])/FPS)
  out.append((2*u**3-3*u*u+1)*x+(u**3-2*u*u+u)*dt*m0+(-2*u**3+3*u*u)*bv[k]+(u**3-u*u)*dt*m1)
 return out if vec else out[0]
rows=[]
for frame in range(10800):
 t=frame/FPS;ch=next((c for c in config['chapters'] if c['startFrame']<=frame<c['endFrameExclusive']),config['chapters'][-1]);local=frame-ch['textStartFrame'];opacity=smooth((ch['endFrameExclusive']-frame)/24);asset=config['assets'].get(ch['mediaId'],{});p=smooth((frame-ch['mediaOpenFrame'])/90)*(1-smooth((frame-ch['mediaCloseFrame'])/60)) if ch['mediaId'] and asset.get('src') else 0
 rows.append({'frame':frame,'time':round(t,6),'chapter':ch['id'],'camera':{'position':[round(x,7) for x in sample(t,'position')],'target':[round(x,7) for x in sample(t,'target')],'focalMm':round(sample(t,'focalMm'),6)},'headlineWordOpacity':[round(smooth((local-i*6)/42)*opacity,5) for i,_ in enumerate(ch['headline'].split())],'media':{'id':ch['mediaId'],'open':round(p,6),'sourceTime':round(max(0,t-ch['mediaOpenFrame']/60),6) if p else None,'bound':bool(asset.get('src'))},'shaderTime':round(t,6)})
sourceFiles=[];seen=set();queue=[R/'src/intro/main.tsx']
while queue:
 p=queue.pop()
 if p in seen or not p.is_file():continue
 seen.add(p);sourceFiles.append(p)
 if p.suffix not in ['.ts','.tsx','.js','.jsx']:continue
 for match in re.finditer(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",p.read_text()):
  base=(p.parent/match.group(1)).resolve()
  for candidate in [base,Path(str(base)+'.ts'),Path(str(base)+'.tsx'),Path(str(base)+'.js'),base/'index.ts',base/'index.tsx']:
   if candidate.is_file():queue.append(candidate);break
for n in ['package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json','tsconfig.intro.json','qa.mjs','mix_audio.py','assemble_json.py','README.md','requirements.txt','public/proofs.html']:
 sourceFiles.append(R/n)
config['runtime']={'entry':'src/intro/main.tsx','jsonIsData':'JSON is interpreted by the included React/Three.js runtime. It is not executable WebGL by itself.','sources':[{'path':str(p.relative_to(R)),'source':p.read_text(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sourceFiles]}
config['frameTable']=rows
config['assetFiles']=[{'path':str(p.relative_to(R/'public')),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (R/'public/assets').rglob('*') if p.is_file()]
(R/'CEREBRO_INTRO_FULL.json').write_text(json.dumps(config,ensure_ascii=False,separators=(',',':')))
(R/'FRAME_TABLE.json').write_text(json.dumps(rows,separators=(',',':')))
print('Full JSON:',len(rows),'frames;',len(config['runtime']['sources']),'literal runtime/shader source files;',len(config['assetFiles']),'bound asset files')
