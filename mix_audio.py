"""Music and frame-synchronized sound design. Spoken voice omitted by owner."""
from pathlib import Path
import json,subprocess,wave
import numpy as np
R=Path(__file__).resolve().parent;A=R/'public/assets/audio';C=R/'public/cerebro.intro.json';cfg=json.loads(C.read_text());SR=48000;N=180*SR
def read(p,channels=2):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac',str(channels),'-f','f32le','-']),dtype='<f4').reshape(-1,channels)
def wav(p,a):
 with wave.open(str(p),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
music=read(A/'score-source.m4a')[:N]*1.7;voice=np.zeros((N,2));sfx=np.zeros_like(voice);events=[];rng=np.random.default_rng(39)
has_voice=False
def add(start,a,pan=0):
 i=round(start*SR);n=min(len(a),N-i)
 if n>0:sfx[i:i+n]+=a[:n,None]*np.sqrt(np.array([(1-pan)/2,(1+pan)/2]))
for i,ch in enumerate(cfg['chapters']):
 start=ch['startFrame']/60
 t=np.arange(round(.9*SR))/SR;tone=np.sin(2*np.pi*[440,523.25,587.33,659.25][i%4]*t)*np.exp(-t*6)*(1-np.exp(-t*100))*.009;add(start+.9,tone,(-.2 if i%2 else .2));events.append({'frame':ch['startFrame']+54,'type':'headline-glass-detail'})
 if ch['mediaId'] and cfg['assets'][ch['mediaId']].get('src'):
  for frame,direction in [(ch['mediaOpenFrame'],'open'),(ch['mediaCloseFrame'],'return')]:
   tt=np.arange(round(1.5*SR))/SR;air=rng.standard_normal(len(tt));air=np.convolve(air,np.ones(120)/120,'same');air*=np.sin(np.pi*tt/1.5)**3*.008;add(frame/60,air,.25 if direction=='open' else -.25);events.append({'frame':frame,'type':'media-'+direction})
for boundary in [30,48,62,76,94,112,128,146,165,174]:
 tt=np.arange(round(3*SR))/SR;n=rng.standard_normal(len(tt));n=np.convolve(n,np.ones(180)/180,'same');add(boundary-1.5,n*np.sin(np.pi*tt/3)**3*.009)
level=np.max(abs(voice),axis=1).reshape(-1,480).max(axis=1);env=[];last=0
for x in level:last=max(x,last*.985);env.append(last)
duck=np.repeat(.3+.7/(1+np.array(env)*18),480);mix=voice*.85+music*duck[:,None]+sfx;tt=np.arange(N)/SR;mix*=np.minimum(tt/1.2,1)[:,None]*np.minimum((180-tt)/1.5,1)[:,None]
wav(A/'premix.wav',mix);target=-18
q=subprocess.run(['ffmpeg','-hide_banner','-i',str(A/'premix.wav'),'-af',f'loudnorm=I={target}:TP=-1.8:LRA=8:print_format=json','-f','null','-'],capture_output=True,text=True,check=True);j=json.loads(q.stderr[q.stderr.rfind('{'):q.stderr.rfind('}')+1]);af=f"loudnorm=I={target}:TP=-1.8:LRA=8:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
name='intro-music-sfx.m4a'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(A/'premix.wav'),'-af',af,'-ar','48000','-c:a','aac','-b:a','256k',str(A/name)],check=True)
q=subprocess.run(['ffmpeg','-hide_banner','-i',str(A/name),'-af',f'loudnorm=I={target}:TP=-1.5:LRA=8:print_format=json','-f','null','-'],capture_output=True,text=True,check=True);measured=json.loads(q.stderr[q.stderr.rfind('{'):q.stderr.rfind('}')+1]);(R/'AUDIO_QA.json').write_text(json.dumps({'voicePresent':has_voice,'measured':measured,'events':events},indent=2))
cfg['audio']['masterSrc']='assets/audio/'+name;cfg['audio']['voiceEnabled']=False;cfg['audio']['mix']['status']='MEASURED_MUSIC_AND_SFX';cfg['audio']['mix']['measured']=measured;cfg['audio']['events']=events;cfg['audio']['rmsByFrame']=[round(min(1,float(np.sqrt(np.mean(mix[i:i+800]**2)))*24),5) for i in range(0,N,800)]
gain=10**((target-float(j['input_i']))/20)
fade=np.minimum(tt/1.2,1)*np.minimum((180-tt)/1.5,1)
for stem,data in [('music',music),('sfx',sfx)]:
 temp=A/(stem+'-temp.wav');wav(temp,data*gain*fade[:,None]);subprocess.run(['ffmpeg','-v','error','-y','-i',str(temp),'-c:a','aac','-b:a','256k',str(A/(stem+'.m4a'))],check=True);temp.unlink()
cfg['audio']['musicSrc']='assets/audio/music.m4a';cfg['audio']['sfxSrc']='assets/audio/sfx.m4a'
C.write_text(json.dumps(cfg,indent=2,ensure_ascii=False));(A/'premix.wav').unlink();print(json.dumps({'voicePresent':False,'file':name,'LUFS':measured['input_i'],'truePeak':measured['input_tp']}))
