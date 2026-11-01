/** Capture the actual WebGL canvas and the measured brand/type overlay.
 * This never invents a sphere or substitutes an illustration for the renderer.
 */
export async function exportProof(stage:HTMLElement,name:string){
 await document.fonts.ready;
 const webgl=stage.querySelector<HTMLCanvasElement>('.source-world canvas');
 if(!webgl)throw Error('A WebGL-capable browser is required to export an optical proof.');
 const box=stage.getBoundingClientRect(),out=document.createElement('canvas');out.width=1920;out.height=1080;const ctx=out.getContext('2d')!;const sx=out.width/box.width,sy=out.height/box.height;
 ctx.drawImage(webgl,0,0,1920,1080);
 for(const image of stage.querySelectorAll<HTMLImageElement>('.identity img,.subbrand')){if(image.hidden||!image.complete||!image.naturalWidth)continue;const r=image.getBoundingClientRect();ctx.drawImage(image,(r.x-box.x)*sx,(r.y-box.y)*sy,r.width*sx,r.height*sy);}
 for(const el of stage.querySelectorAll<HTMLElement>('.identity span,.eyebrow,h1 span,.subline,.captions,.media-credit')){const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none'||Number(s.opacity)<=0)continue;const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;ctx.save();ctx.scale(sx,sy);ctx.globalAlpha=Number(s.opacity);ctx.fillStyle=s.color;ctx.font=`${s.fontWeight} ${s.fontSize} Jaapokki`;ctx.textBaseline='top';const size=parseFloat(s.fontSize),line=parseFloat(s.lineHeight)||size*1.4;let words=(el.textContent||'').split(/\s+/),row='',y=r.y-box.y+Math.max(0,(line-size)*.5);
  for(const word of words){const next=row?row+' '+word:word;if(ctx.measureText(next).width>r.width+1&&row){ctx.fillText(row,r.x-box.x,y);row=word;y+=line;}else row=next;}if(row)ctx.fillText(row,r.x-box.x,y);ctx.restore();}
 const blob=await new Promise<Blob>((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(Error('PNG capture failed')),'image/png'));
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
}
