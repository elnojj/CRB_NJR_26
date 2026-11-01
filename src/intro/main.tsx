import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import {soundEngine} from '../utils/soundEngine';
soundEngine.setMuted(true);
import {CosmographCanvas} from '../components/CosmographCanvas';
import {introBridge,FPS,smoother,clamp} from './bridge';
import './styles.css';
import {exportProof} from './export-proof';
const config=await fetch(new URL('cerebro.intro.json',document.baseURI)).then(r=>{if(!r.ok)throw Error('Timeline JSON unavailable');return r.json()});
const params=new URLSearchParams(location.search),proof=params.has('frame'),record=params.get('record')==='1';
class TimelinePlayer {
 audio=new Audio(new URL(config.audio.masterSrc,document.baseURI).href);playing=false;position=clamp(Number(params.get('frame')||0)/FPS,0,180);base=0;started=0;audioReady=false;error='';
 constructor(){this.audio.preload='auto';this.audio.addEventListener('canplay',()=>{this.audioReady=true});this.audio.addEventListener('error',()=>{this.error='Music and effects mix unavailable. Visual review remains available.'});this.audio.load();}
 time=()=>this.playing?(this.audioReady&&!this.audio.paused?this.audio.currentTime:Math.min(180,this.position+(performance.now()-this.started)/1000)):this.position;
 async play(){if(this.time()>=179.99)this.seek(0);this.position=this.time();this.started=performance.now();this.playing=true;introBridge.resume();if(this.audioReady){this.audio.currentTime=this.position;try{await this.audio.play()}catch{this.playing=false;this.error='Tap Begin to enable sound.'}}}
 pause(){this.position=this.time();this.playing=false;this.audio.pause();}
 seek(t:number){this.position=clamp(t,0,180);this.started=performance.now();if(this.audio.readyState>=1)this.audio.currentTime=this.position;introBridge.resume();}
}
const player=new TimelinePlayer();introBridge.configure(config,player.time,()=>player.playing);
const noOp=()=>{};
export function CerebroIntro({onEnterWorkspace,renderWorkspace}:{onEnterWorkspace?:(context:any)=>void,renderWorkspace?:(context:any)=>React.ReactNode}={}){
 const stage=useRef<HTMLDivElement>(null),headline=useRef<HTMLHeadingElement>(null),kicker=useRef<HTMLDivElement>(null),body=useRef<HTMLParagraphElement>(null),caption=useRef<HTMLParagraphElement>(null),credit=useRef<HTMLDivElement>(null),brand=useRef<HTMLImageElement>(null),progress=useRef<HTMLInputElement>(null),stamp=useRef<HTMLSpanElement>(null),lastChapter=useRef('');
 const [webglReason,setWebglReason]=useState(''),[ready,setReady]=useState(false),[begun,setBegun]=useState(proof),[playing,setPlaying]=useState(false),[controls,setControls]=useState(!record),[exploring,setExploring]=useState(false),[audioError,setAudioError]=useState('');
 const notify=()=>{setPlaying(player.playing);setAudioError(player.error)};
 const toggle=async()=>{if(player.playing)player.pause();else{setBegun(true);await player.play()}notify()};
 const enter=()=>{player.pause();setPlaying(false);setExploring(true);introBridge.inspectPose=introBridge.currentPose();const detail={pose:introBridge.currentPose(),world:player.time()>=126?'cde':'hq',scene:introBridge.ctx?.scene,renderer:introBridge.ctx?.renderer,source:'cerebro-intro',claimCamera:(sampler:(t:number)=>any)=>{introBridge.hostPoseSampler=sampler;introBridge.inspectPose=null},releaseCamera:()=>{introBridge.hostPoseSampler=null}};onEnterWorkspace?.(detail);window.dispatchEvent(new CustomEvent('cerebro:intro-enter',{detail}));if(onEnterWorkspace){/* Host workspace remounts its own canvas; release intro camera ownership. */introBridge.enabled=false;}};
 const selectNode=(id:string)=>{player.pause();setPlaying(false);const asset=id==='YAH'?'young-human':id==='EL-BATRON'?'el-batron':id==='people'?'tarek':id==='media'?'el-batron':id==='projects'?'production':id==='production'?'laliga':null;if(asset)introBridge.open(asset);};
 useEffect(()=>{introBridge.enabled=true;introBridge.onReady=()=>{setReady(true);introBridge.preload()};if(introBridge.ready){setReady(true);introBridge.preload();}
  introBridge.onFrame=(t:number)=>{
   const ch=introBridge.chapter(t);if(!ch)return;
   if(lastChapter.current!==ch.id){lastChapter.current=ch.id;if(headline.current){headline.current.replaceChildren(...ch.headline.split(' ').map((word:string)=>{const span=document.createElement('span');span.textContent=word+' ';return span}))}if(kicker.current)kicker.current.textContent=ch.kicker;if(body.current)body.current.textContent=ch.body;const asset=config.assets[ch.mediaId];if(credit.current)credit.current.textContent=asset?.src?asset.label:asset?.status==='NEEDS_CONFIRMED_PORTRAIT'&&!record?'Portrait source awaiting confirmation':'';if(brand.current){brand.current.hidden=!asset?.brandLogo;brand.current.src=asset?.brandLogo?new URL(asset.brandLogo,document.baseURI).href:'';brand.current.alt=asset?.label||'';}}
   const local=t*FPS-ch.textStartFrame,remaining=ch.endFrameExclusive-t*FPS,exit=smoother(remaining/24),intro=smoother(local/42);if(headline.current)Array.from(headline.current.children).forEach((el,i)=>{const p=smoother((local-i*6)/42)*exit;(el as HTMLElement).style.opacity=String(p);(el as HTMLElement).style.transform=`translateY(${(1-p)*18}px)`});
   if(kicker.current)kicker.current.style.opacity=String(intro*exit);if(body.current)body.current.style.opacity=String(smoother((local-24)/42)*exit);if(credit.current)credit.current.style.opacity=String(smoother((local-60)/42)*exit);
   const words=config.audio.captions?.find((x:any)=>t>=x.start&&t<x.end);if(caption.current)caption.current.textContent=words?.text||'';
   if(progress.current)progress.current.value=String(t);if(stamp.current)stamp.current.textContent=`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')} / 3:00`;
   if(t>=179.96&&player.playing){player.pause();player.position=180;setPlaying(false)}
  };
  const world=document.querySelector('.source-world');const watch=new MutationObserver(()=>{const reason=world?.getAttribute('data-webgl-reason')||'';if(reason)setWebglReason(reason)});if(world)watch.observe(world,{attributes:true,attributeFilter:['data-webgl-status','data-webgl-reason']});
  const captureMessage=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='CEREBRO_PROOF_CAPTURE')void exportProof(stage.current!,e.data.name||'CEREBRO-proof').catch(err=>setAudioError(err.message));};window.addEventListener('message',captureMessage);
  const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.matches('input,textarea,select'))return;if(e.code==='Space'){e.preventDefault();void toggle()}if(e.key.toLowerCase()==='h')setControls(v=>!v);if(e.key.toLowerCase()==='f')void stage.current?.requestFullscreen();if(e.key==='ArrowRight')player.seek(player.time()+5);if(e.key==='ArrowLeft')player.seek(player.time()-5);if(e.key==='Escape')introBridge.close()};window.addEventListener('keydown',key);
  (window as any).cerebroIntro={seek:async(t:number)=>{player.pause();player.seek(t);setBegun(true);setPlaying(false);await introBridge.settled();return {time:player.time(),frame:Math.round(player.time()*FPS),pose:introBridge.currentPose()}},play:()=>player.play(),pause:()=>player.pause(),config,pose:()=>introBridge.currentPose(),openMedia:(id:string)=>{player.pause();introBridge.open(id)},closeMedia:()=>introBridge.close(),ready:()=>introBridge.ready,diagnostics:()=>({audioReady:player.audioReady,audioError:player.error,missingAssets:config.gates.missingConfirmedPortraits})};
  return()=>{watch.disconnect();window.removeEventListener('message',captureMessage);window.removeEventListener('keydown',key);player.pause();introBridge.onFrame=noOp;introBridge.onReady=noOp;introBridge.enabled=false;};
 },[]);
 const drag=useRef<{x:number,y:number,pose:any}|null>(null);
 const pointerDown=(e:React.PointerEvent)=>{if((e.target as HTMLElement).closest('button,input,a'))return;player.pause();setPlaying(false);drag.current={x:e.clientX,y:e.clientY,pose:introBridge.currentPose()};};
 const pointerMove=(e:React.PointerEvent)=>{if(!drag.current||!e.buttons)return;const d=drag.current,dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)<5)return;const target=new THREE.Vector3().fromArray(d.pose.target),v=new THREE.Vector3().fromArray(d.pose.position).sub(target),s=new THREE.Spherical().setFromVector3(v);s.theta-=dx*.003;s.phi=clamp(s.phi+dy*.003,.25,Math.PI-.25);v.setFromSpherical(s).add(target);introBridge.inspectPose={...d.pose,position:v.toArray()};};
 return <main className={`intro-shell ${record?'record':''} ${proof?'proof':''}`}>
  <div id="cerebro-stage" ref={stage} className={`stage ${exploring?'exploring':''}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>drag.current=null} onPointerLeave={()=>drag.current=null}>
   <CosmographCanvas activeSphere="hq" focusedNodeId={null} tourHighlightId={null} captionBubble={null} reducedMotion={false} cameraCommand={null} onSelectNode={selectNode} onUserTouchPauseTour={()=>{if(player.playing){player.pause();setPlaying(false)}}} onTelemetryChange={noOp}/>
   {webglReason&&<div className="renderer-unavailable" role="alert"><strong>WebGL is unavailable in this browser.</strong><p>The code needs a WebGL 2 capable browser to show the actual sphere and optical materials. No substitute image is being shown.</p><small>{webglReason}</small></div>}
   <header className="identity"><img src={new URL(config.brand.logo,document.baseURI).href} alt="NOJARA Studios — نُچارة"/><span>NOJARA PRESENTS</span></header>
   <section className="editorial" aria-live="off"><div className="eyebrow" ref={kicker}/><h1 ref={headline}/><p className="subline" ref={body}/><img ref={brand} className="subbrand" hidden alt=""/></section>
   <div className="media-credit" ref={credit}/><p className="captions" ref={caption}/>
   {exploring&&renderWorkspace?.({scene:introBridge.ctx?.scene,renderer:introBridge.ctx?.renderer,pose:introBridge.currentPose(),claimCamera:(sampler:(t:number)=>any)=>{introBridge.hostPoseSampler=sampler;introBridge.inspectPose=null},openMedia:(id:string)=>introBridge.open(id),closeMedia:()=>introBridge.close()})}
   {exploring&&<button className="return-story" onClick={()=>{setExploring(false);introBridge.hostPoseSampler=null;player.seek(0);setBegun(false);introBridge.resume()}}>Back to the story</button>}
   {begun&&!exploring&&<button className="enter" onClick={enter}>Enter Cerebro <span aria-hidden="true">↗</span></button>}
   {!begun&&<div className="start-layer"><div><span className="eyebrow">A 3-MINUTE SPATIAL INTRODUCTION</span><h2>The work.<br/>The people.<br/>The system.</h2><p>A continuous journey. Music and sound design.</p><button onClick={toggle} disabled={!ready}>{ready?'Begin with sound ↗':'Preparing the spatial scene…'}</button><button className="quiet" onClick={()=>{setBegun(true);player.audio.muted=true;void player.play().then(notify)}} disabled={!ready}>Explore silently</button></div></div>}
   {controls&&<footer className="transport" aria-label="Introduction playback"><button onClick={toggle} aria-label={playing?'Pause introduction':'Play introduction'}>{playing?'Pause':'Play'}</button><span ref={stamp}>0:00 / 3:00</span><input ref={progress} type="range" min="0" max="180" step="0.0166666667" aria-label="Timeline position" defaultValue={player.position} onChange={e=>{player.seek(Number(e.target.value));setBegun(true)}}/><button onClick={()=>{player.audio.muted=!player.audio.muted;setAudioError(player.audio.muted?'Sound muted':'')}}>Sound</button><button onClick={()=>void stage.current?.requestFullscreen()}>Fullscreen</button><button onClick={()=>setControls(false)} aria-label="Hide controls">Hide</button><button disabled={!ready} onClick={()=>void exportProof(stage.current!,`CEREBRO-${introBridge.chapter(player.time()).id}-F${Math.round(player.time()*60)}`)}>Save frame</button></footer>}
   {audioError&&controls&&<div className="audio-status" role="status">{audioError}</div>}
   {introBridge.manualId&&controls&&<button className="close-media" onClick={()=>introBridge.close()}>Return to context ↙</button>}
  </div>
 </main>
}
if(document.documentElement.dataset.cerebroStandalone==='true')createRoot(document.getElementById('root')!).render(<CerebroIntro/>);
