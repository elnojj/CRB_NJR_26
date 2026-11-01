import * as THREE from 'three';
export const FPS=60;
export const clamp=(x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smoother=(x:number)=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
export function hermite(keys:any[],t:number,key:string):any {
 const f=t*FPS;let i=keys.findIndex((x:any,j:number)=>j<keys.length-1&&f<=keys[j+1].frame);if(i<0)i=keys.length-2;
 const a=keys[i],b=keys[i+1],dt=(b.frame-a.frame)/FPS,u=clamp((f-a.frame)/(b.frame-a.frame));
 const vec=Array.isArray(a[key]);const av=vec?a[key]:[a[key]],bv=vec?b[key]:[b[key]];
 const val=av.map((x:number,k:number)=>{const prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)];const pv=vec?prev[key][k]:prev[key],nv=vec?next[key][k]:next[key];
  const m0=i===0?0:(bv[k]-pv)/((b.frame-prev.frame)/FPS),m1=i+1===keys.length-1?0:(nv-x)/((next.frame-a.frame)/FPS);
  return (2*u*u*u-3*u*u+1)*x+(u*u*u-2*u*u+u)*dt*m0+(-2*u*u*u+3*u*u)*bv[k]+(u*u*u-u*u)*dt*m1;});return vec?val:val[0];
}
export function samplePose(config:any,t:number){const k=config.motion.cameraKeys;return {position:hermite(k,t,'position'),target:hermite(k,t,'target'),focalMm:hermite(k,t,'focalMm')};}
type SceneContext={scene:THREE.Scene,camera:THREE.PerspectiveCamera,renderer:THREE.WebGLRenderer};
class IntroBridge {
 /** Only true while CerebroIntro owns the canvas. Workspace Cosmograph uses normal camera when false. */
 enabled=false;private randomState=39;random(){this.randomState=(1664525*this.randomState+1013904223)>>>0;return this.randomState/4294967296;}hostPoseSampler:((t:number)=>any)|null=null;config:any;ctx:SceneContext|null=null;ready=false;onReady=()=>{};onFrame:(t:number)=>void=()=>{};
 private getTime=()=>0;private getPlaying=()=>false;private media=new Map<string,any>();private portal:THREE.Mesh|null=null;private trim:THREE.LineSegments|null=null;private currentId='';private anchors=new Map<string,THREE.Object3D>();private autoSuppressed=false;private sourceTexture:THREE.Texture|null=null;
 manualId:string|null=null;manualSince=0;manualClosing=false;manualCloseSince=0;resumeFrom:any=null;resumeSince=0;inspectPose:any=null;
 configure(config:any,time:()=>number,playing:()=>boolean){this.config=config;this.randomState=config.scene.randomSeed||39;this.getTime=time;this.getPlaying=playing;}
 audioRms(t:number){return this.config?.audio.rmsByFrame?.[Math.min(10799,Math.max(0,Math.floor(t*60)))]||0;}
 time(){return clamp(this.getTime(),0,180);}
 attach(ctx:SceneContext){this.ctx=ctx;this.ready=true;ctx.scene.traverse(o=>{const id=o.userData?.nodeId;if(id&&o instanceof THREE.Group&&!this.anchors.has(id))this.anchors.set(id,o);});
  const mat=new THREE.ShaderMaterial({uniforms:{map:{value:null},alpha:{value:0},aspect:{value:16/9}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform sampler2D map;uniform float alpha;uniform float aspect;varying vec2 vUv;void main(){vec2 p=abs(vUv-.5)-vec2(.492,.486);float d=length(max(p,0.0))+min(max(p.x,p.y),0.0)-.008;float a=(1.0-smoothstep(-.002,.002,d))*alpha;vec4 c=texture2D(map,vUv);gl_FragColor=vec4(c.rgb,a);
#include <colorspace_fragment>
}`.replace(';#include',';\n#include'),transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
  this.portal=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);this.portal.renderOrder=100;this.portal.visible=false;ctx.scene.add(this.portal);
  this.trim=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1)),new THREE.LineBasicMaterial({color:0xC5CCD6,transparent:true,opacity:0,depthTest:false,depthWrite:false}));this.trim.renderOrder=101;ctx.scene.add(this.trim);
  this.onReady();
 }
 applyCamera(camera:THREE.PerspectiveCamera,state:any,t:number){if(!this.config)return;let p=this.hostPoseSampler?this.hostPoseSampler(t):samplePose(this.config,t);
  if(this.resumeFrom){const u=smoother((performance.now()-this.resumeSince)/1400);p={position:this.resumeFrom.position.map((x:number,i:number)=>THREE.MathUtils.lerp(x,p.position[i],u)),target:this.resumeFrom.target.map((x:number,i:number)=>THREE.MathUtils.lerp(x,p.target[i],u)),focalMm:THREE.MathUtils.lerp(this.resumeFrom.focalMm,p.focalMm,u)};if(u>=1)this.resumeFrom=null;}
  if(this.inspectPose)p=this.inspectPose;
  camera.position.fromArray(p.position);camera.up.set(0,1,0);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(24/(2*p.focalMm)));camera.clearViewOffset();camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3().fromArray(p.target));camera.updateMatrixWorld();
  const centre=new THREE.Vector3().fromArray(p.target);state.currentCenter.copy(centre);state.targetCenter.copy(centre);state.radius=camera.position.distanceTo(centre);state.targetRadius=state.radius;state.focalLengthMm=p.focalMm;state.targetFocalLengthMm=p.focalMm;state.flightActive=false;state.autoOrbit=false;state.activeLoopMode='off';state.cameraRollDeg=0;state.targetRollDeg=0;state.panOffset.set(0,0,0);state.targetPanOffset.set(0,0,0);
 }
 chapter(t:number){return this.config?.chapters.find((x:any)=>t*FPS>=x.startFrame&&t*FPS<x.endFrameExclusive)||this.config?.chapters.at(-1);}
 private getAsset(id:string){if(this.media.has(id))return this.media.get(id);const a=this.config.assets[id];if(!a?.src)return null;
  if(a.type==='video'){const el=document.createElement('video');el.src=new URL(a.src,document.baseURI).href;el.muted=true;el.playsInline=true;el.preload='auto';el.loop=!!a.loop;el.crossOrigin='anonymous';el.load();const texture=new THREE.VideoTexture(el);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;const m={el,texture,asset:a,aspect:16/9};el.addEventListener('loadedmetadata',()=>m.aspect=el.videoWidth/el.videoHeight);this.media.set(id,m);return m;}
  const m:any={texture:null,asset:a,aspect:3/4};const texture=new THREE.TextureLoader().load(new URL(a.src,document.baseURI).href,t=>{m.aspect=t.image.width/t.image.height});texture.colorSpace=THREE.SRGBColorSpace;m.texture=texture;this.media.set(id,m);return m;
 }
 preload(){for(const id of Object.keys(this.config.assets))this.getAsset(id);}
 open(id:string){this.autoSuppressed=true;const m=this.getAsset(id);if(m?.el&&m.el.readyState>=1)m.el.currentTime=0;this.manualId=id;this.manualSince=performance.now();this.manualClosing=false;this.inspectPose=this.currentPose();}
 close(){if(!this.manualId)return;this.manualClosing=true;this.manualCloseSince=performance.now();}
 resume(){this.autoSuppressed=false;if(this.inspectPose){this.resumeFrom=this.inspectPose;this.resumeSince=performance.now();this.inspectPose=null;}this.manualId=null;this.manualClosing=false;}
 currentPose(){if(!this.ctx)return samplePose(this.config,this.time());return {position:this.ctx.camera.position.toArray(),target:this.inspectPose?.target||samplePose(this.config,this.time()).target,focalMm:12/Math.tan(THREE.MathUtils.degToRad(this.ctx.camera.fov/2))};}
 update=(t:number)=>{if(!this.ctx||!this.config||!this.portal||!this.trim)return;const ch=this.chapter(t),frame=t*FPS;
  let id=this.manualId||(this.autoSuppressed?null:ch.mediaId);let p=0;
  if(this.manualId){p=smoother((performance.now()-this.manualSince)/1500);if(this.manualClosing){p=1-smoother((performance.now()-this.manualCloseSince)/1000);if(p<=0){this.manualId=null;this.manualClosing=false;}}}
  else if(id){p=smoother((frame-ch.mediaOpenFrame)/this.config.motion.media.openFrames)*(1-smoother((frame-ch.mediaCloseFrame)/this.config.motion.media.closeFrames));}
  const media=id?this.getAsset(id):null;if(this.currentId!==id){for(const [other,m] of this.media)if(other!==id)m.el?.pause();this.currentId=id||'';}
  this.portal.visible=!!media&&p>.001;this.trim.visible=this.portal.visible;
  if(media&&this.portal.visible){const c=this.ctx.camera;c.updateMatrixWorld();const right=new THREE.Vector3(1,0,0).applyQuaternion(c.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(c.quaternion),forward=new THREE.Vector3(0,0,-1).applyQuaternion(c.quaternion);
   const centre=new THREE.Vector3(...(t>=126?[38,4,-22]:[0,0,0]) as [number,number,number]);const nodeId=t>=126?'production':({'young-human':'YAH','el-batron':'EL-BATRON','tarek':'people','production':'projects','laliga':'media'} as Record<string,string>)[id];const node=this.anchors.get(nodeId);const anchor=node?node.getWorldPosition(new THREE.Vector3()):centre.clone().add(new THREE.Vector3(-2,.3,2));const dest=c.position.clone().addScaledVector(forward,12).addScaledVector(right,2.7).addScaledVector(up,-.2);
   this.portal.position.copy(anchor).lerp(dest,p);this.portal.quaternion.copy(c.quaternion);let h=media.aspect<1?5.7:4.5,w=h*media.aspect;this.portal.scale.set(w*(.025+.975*p),h*(.025+.975*p),1);
   const mat=this.portal.material as THREE.ShaderMaterial;mat.uniforms.map.value=media.texture;mat.uniforms.alpha.value=smoother(p*4);this.trim.position.copy(this.portal.position).addScaledVector(forward,-.008);this.trim.quaternion.copy(this.portal.quaternion);this.trim.scale.copy(this.portal.scale);(this.trim.material as THREE.LineBasicMaterial).opacity=.32*p;
   if(media.el){const el=media.el as HTMLVideoElement;const local=Math.max(0,t-ch.mediaOpenFrame/FPS);const duration=Number.isFinite(el.duration)?el.duration:30;const desired=media.asset.loop?local%Math.max(.01,duration-.04):Math.min(local,Math.max(0,duration-.05));
    if(el.readyState>=1&&(!this.getPlaying()||Math.abs(el.currentTime-desired)>.18)&&!this.manualId){try{el.currentTime=desired}catch{}}
    if((this.getPlaying()||this.manualId)&&el.paused){el.play().catch(()=>{});}else if(!this.getPlaying()&&!this.manualId&&!el.paused)el.pause();
   }
  }
  this.onFrame(t);
 };
 async settled(){await document.fonts.ready;const promises=[];for(const m of this.media.values())if(m.el?.seeking)promises.push(new Promise(r=>m.el.addEventListener('seeked',r,{once:true})));await Promise.all(promises);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
 detach(){for(const m of this.media.values()){m.el?.pause();m.texture.dispose();}this.hostPoseSampler=null;this.media.clear();this.anchors.clear();this.ctx=null;this.ready=false;this.portal=null;this.trim=null;}
}
export const introBridge=new IntroBridge();
