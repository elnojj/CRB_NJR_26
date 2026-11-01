from pathlib import Path
import json,struct,math
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
# Portable glTF/GLB writer; editable geometry, physical material extensions, no backdrop mesh.
def sphere(r=1,nu=64,nv=32):
 verts=[]; normals=[];uv=[];inds=[]
 for j in range(nv+1):
  th=math.pi*j/nv
  for i in range(nu+1):
   ph=2*math.pi*i/nu;n=[math.sin(th)*math.cos(ph),math.cos(th),math.sin(th)*math.sin(ph)];verts.append([r*x for x in n]);normals.append(n);uv.append([i/nu,j/nv])
 for j in range(nv):
  for i in range(nu):
   a=j*(nu+1)+i;b=a+nu+1;inds.extend([a,a+1,b,a+1,b+1,b])
 return verts,normals,uv,inds
def torus(r=1.015,t=.008,n=192,m=12,rot=None):
 v=[];nn=[];uv=[];ind=[]
 for j in range(n+1):
  a=2*math.pi*j/n
  for k in range(m+1):
   b=2*math.pi*k/m;v.append([(r+t*math.cos(b))*math.cos(a),t*math.sin(b),(r+t*math.cos(b))*math.sin(a)]);nn.append([math.cos(b)*math.cos(a),math.sin(b),math.cos(b)*math.sin(a)]);uv.append([j/n,k/m])
 for j in range(n):
  for k in range(m):
   a=j*(m+1)+k;b=a+m+1;ind.extend([a,a+1,b,a+1,b+1,b])
 if rot is not None:v=np.array(v)@rot.T;nn=np.array(nn)@rot.T
 return v,nn,uv,ind
def rotz(a):return np.array([[math.cos(a),-math.sin(a),0],[math.sin(a),math.cos(a),0],[0,0,1]])
def rotx(a):return np.array([[1,0,0],[0,math.cos(a),-math.sin(a)],[0,math.sin(a),math.cos(a)]])
glass={'name':'Glass_proposed_normalized','pbrMetallicRoughness':{'baseColorFactor':[.75,.88,1,1],'metallicFactor':0,'roughnessFactor':.04},'extensions':{'KHR_materials_transmission':{'transmissionFactor':.96},'KHR_materials_ior':{'ior':1.52},'KHR_materials_volume':{'thicknessFactor':.03,'attenuationDistance':3.4,'attenuationColor':[.063,.114,.153]},'KHR_materials_clearcoat':{'clearcoatFactor':.9,'clearcoatRoughnessFactor':.06}}}
metal={'name':'Core_proposed','pbrMetallicRoughness':{'baseColorFactor':[.72,.78,.84,1],'metallicFactor':.94,'roughnessFactor':.28}}
gold={'name':'Bronze_source_related','pbrMetallicRoughness':{'baseColorFactor':[.549,.416,.271,1],'metallicFactor':.85,'roughnessFactor':.18}}
def glb(name,items):
 doc={'asset':{'version':'2.0','generator':'KR film-derived procedural reconstruction; not original mesh'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[glass,metal,gold],'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[],'extensionsUsed':['KHR_materials_transmission','KHR_materials_ior','KHR_materials_volume','KHR_materials_clearcoat']};blob=bytearray()
 def add(arr,component,typ,target):
  nonlocal blob
  while len(blob)%4:blob.append(0)
  a=np.asarray(arr,dtype='<f4' if component==5126 else '<u4');offset=len(blob);blob.extend(a.tobytes());vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':a.nbytes,'target':target});ac={'bufferView':vi,'componentType':component,'count':len(a),'type':typ}
  if typ=='VEC3':ac.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  doc['accessors'].append(ac);return len(doc['accessors'])-1
 for label,geo,mat in items:
  v,n,u,i=geo;attr={'POSITION':add(v,5126,'VEC3',34962),'NORMAL':add(n,5126,'VEC3',34962),'TEXCOORD_0':add(u,5126,'VEC2',34962)};idx=add(i,5125,'SCALAR',34963);mi=len(doc['meshes']);doc['meshes'].append({'name':label,'primitives':[{'attributes':attr,'indices':idx,'material':mat}]});doc['nodes'].append({'name':label,'mesh':mi});doc['scenes'][0]['nodes'].append(mi)
 while len(blob)%4:blob.append(0)
 doc['buffers'][0]['byteLength']=len(blob);j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob;(ROOT/'06_3D_Assets'/f'{name}.glb').write_bytes(out)
shell=('shell',sphere(1),0);core=('core',sphere(.82),1);rings=[('equator',torus(),2),('meridian_a',torus(rot=rotz(math.pi/2)),2),('meridian_b',torus(rot=rotz(math.pi/3)),2)]
for name,items in [('sphere-assembly',[shell,core,*rings]),('glass-shell',[shell]),('metal-core',[core]),('orbital-cage',rings),('gold-node',[('node',sphere(.055,32,16),2)]),('media-portal-rim',[('rim',torus(.85,.025,128,16,rotx(math.pi/2)),0)]),('portrait-medallion',[('rim',torus(.6,.012,128,12,rotx(math.pi/2)),2)])]:glb(name,items)

