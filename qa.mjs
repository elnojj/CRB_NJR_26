import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {samplePose,smoother} from './src/intro/bridge.ts';
const root=path.dirname(fileURLToPath(import.meta.url)),c=JSON.parse(fs.readFileSync(path.join(root,'public/cerebro.intro.json'),'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));const checks=[];
assert.deepEqual(c.meta.aspect,[16,9]);assert.equal(c.meta.durationSeconds,180);assert.equal(c.meta.totalFrames,10800);assert.equal(c.meta.renderedVideo,false);assert.equal(c.audio.voiceEnabled,false);
assert.equal(c.chapters.length,12);assert.equal(c.chapters[0].startFrame,0);assert.equal(c.chapters.at(-1).endFrameExclusive,10800);
for(let i=0;i<c.chapters.length;i++){const ch=c.chapters[i];if(i)assert.equal(ch.startFrame,c.chapters[i-1].endFrameExclusive);assert(ch.mediaCloseFrame+60<=ch.endFrameExclusive);assert(ch.textStartFrame<ch.endFrameExclusive);}
checks.push({id:'time-contract',status:'PASS',detail:'180 seconds; 60 fps timeline; exactly 10800 frame addresses; 12 contiguous chapters.'});
let nearHQ=Infinity,nearCDE=Infinity,maxJoinError=0;
for(let f=0;f<10800;f++){let p=samplePose(c,f/60);assert(p.position.every(Number.isFinite));assert(p.target.every(Number.isFinite));assert(p.focalMm>=20&&p.focalMm<=90);nearHQ=Math.min(nearHQ,distance(p.position,[0,0,0]));nearCDE=Math.min(nearCDE,distance(p.position,[38,4,-22]));}
assert(nearHQ>7&&nearCDE>7,'Camera intersects a sphere envelope');
for(const key of c.motion.cameraKeys.slice(1,-1)){const t=key.frame/60,h=1e-4;for(const field of ['position','target']){const a=samplePose(c,t-h)[field],b=samplePose(c,t)[field],d=samplePose(c,t+h)[field];const error=Math.hypot(...b.map((v,i)=>(v-a[i])/h-(d[i]-v)/h));maxJoinError=Math.max(maxJoinError,error);assert(error<.001)}}
checks.push({id:'camera-C1',status:'PASS',detail:{minHQDistance:nearHQ,minCDEDistance:nearCDE,maxFiniteDifferenceVelocityMismatch:maxJoinError}});
assert.equal(smoother(0),0);assert.equal(smoother(1),1);assert.equal(smoother(-1),0);assert.equal(smoother(2),1);
let assets=[];for(const [id,a] of Object.entries(c.assets)){if(!a.src){assert(['shweekar','khaled'].includes(id));continue;}const p=path.join(root,'public',a.src);assert(fs.existsSync(p),`${id} absent`);assets.push({id,path:a.src,bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});if(a.brandLogo)assert(fs.existsSync(path.join(root,'public',a.brandLogo)));}
assert(fs.existsSync(path.join(root,'public',c.brand.logo)),c.brand.logo);
assert(fs.existsSync(path.join(root,'public',c.audio.masterSrc)),c.audio.masterSrc);
const missingFonts=[c.brand.englishFont,c.brand.arabicFont].filter((p)=>!fs.existsSync(path.join(root,'public',p)));
assert.equal(c.assets.shweekar.src,null);assert.equal(c.assets.khaled.src,null);
checks.push({id:'assets',status:'PASS_WITH_DECLARED_GAPS',detail:{summary:'Media + NOJARA logo + audio present. Local Jaapokki/Arabic font files remain declared gaps (CSS webfonts still load). Portraits for shweekar/khaled unbound.',missingFonts,assets}});
const scene=fs.readFileSync(path.join(root,'src/components/CosmographCanvas.tsx'),'utf8');assert(scene.includes('if (!introBridge.enabled) {'));assert(scene.includes('introBridge.applyCamera(camera, s, elapsedTotal)'));assert(scene.includes('introBridge.update?.(elapsedTotal)'));assert(scene.includes('const sharedShellGeo = new THREE.SphereGeometry(6.2, 64, 48)'));
checks.push({id:'scene-adapter',status:'PASS_SOURCE_CHECK',detail:'Original procedural scene retained. Intro camera branch replaces the source camera-writing block; media clock precedes render.'});
const report={status:'REVIEW_BUILD_WITH_OPEN_GATES',checks,browser:{webgl:'UNVERIFIED: preview browser returned no WebGL context',shaderAppearance:'NOT_VISUALLY_VERIFIED',mediaPlayback:'NOT_BROWSER_VERIFIED',captureScreens:'NOT_RENDERED; use same-scene proof viewer on a WebGL-capable browser'},audio:JSON.parse(fs.readFileSync(path.join(root,'AUDIO_QA.json'),'utf8')),openGates:c.gates};
fs.writeFileSync(path.join(root,'QA_REPORT.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:checks.map(x=>[x.id,x.status]),cameraFrames:10800,openGates:report.openGates},null,2));
