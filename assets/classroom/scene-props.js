import * as T from './vendor/three.module.min.js';

// Original orthographic graphics and geometry: no scene-image crops.
const mat = color => new T.MeshLambertMaterial({color, flatShading:true});
function mesh(g, geo, color, x=0,y=0,z=0) {
  const m=new T.Mesh(geo, typeof color==='number'?mat(color):color); m.position.set(x,y,z); g.add(m); return m;
}
const box=(g,w,h,d,c,x=0,y=0,z=0)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z);
const cyl=(g,r,h,c,x=0,y=0,z=0,rt=r)=>mesh(g,new T.CylinderGeometry(rt,r,h,24),c,x,y,z);
function rod(g,a,b,r,c) {
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);
  const m=cyl(g,r,delta.length(),c);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function graphic(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:t});}
function label(g,text,w,h,x,y,z,bg='#f5efdf',fg='#294459'){
 const m=graphic(512,128,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;c.font='600 48px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,W-30);});
 return mesh(g,new T.PlaneGeometry(w,h),m,x,y,z);
}
function ring(g,r,t,c,x,y,z){const m=mesh(g,new T.TorusGeometry(r,t,6,24),c,x,y,z);m.rotation.x=Math.PI/2;return m;}
export function plant(g,x,y,z){
 const p=new T.Group();p.position.set(x,y,z);g.add(p);cyl(p,.075,.13,0xe0a777,0,.065,0,.09);
 // Small plants are fully modelled as leaves; no alpha-cutout background fringe.
 for(let i=0;i<9;i++){const a=i*2.4;const end=[Math.cos(a)*.13,.19+(i%3)*.05,Math.sin(a)*.11];rod(p,[0,.12,0],end,.005,0x46785a);const leaf=mesh(p,new T.SphereGeometry(1,8,6),i%2?0x60966b:0x3a7858,...end);leaf.scale.set(.065,.025,.035);leaf.rotation.z=a;}
}
export function honors(){
 const g=new T.Group();box(g,3.74,1.79,.055,0x263e50);
 for(const y of [-.88,.88])box(g,3.82,.045,.085,0xc6d6d8,0,y,.025);
 for(const x of [-1.89,1.89])box(g,.045,1.79,.085,0xc6d6d8,x,0,.025);
 label(g,'探索 · 實踐 · 榮耀',1.8,.15,0,.73,.035,'#263e50','#f3de9e');
 const fronts=['數學探索','科學研究','創意實作','團隊合作'];
 const plaqueMaterials=fronts.map((s,i)=>graphic(384,256,(c,w,h)=>{
  c.fillStyle='#eee2be';c.fillRect(0,0,w,h);c.strokeStyle='#ae8744';c.lineWidth=5;c.strokeRect(12,12,w-24,h-24);
  c.fillStyle='#a77b32';c.beginPath();c.arc(w/2,65,28,0,Math.PI*2);c.fill();c.fillStyle='#fff2c5';c.font='32px serif';c.textAlign='center';c.fillText('✦',w/2,76);
  c.fillStyle='#344a55';c.font='bold 33px sans-serif';c.fillText(s,w/2,140);c.font='20px sans-serif';c.fillText('平興數資 · 成果典藏',w/2,185);
 }));
 for(let r=0;r<4;r++)for(let c=0;c<6;c++){
 const x=(c-2.5)*.59,y=.45-r*.36;
 box(g,.52,.30,.065,0x966640,x,y,.072);box(g,.49,.275,.015,0xc79b60,x,y,.111);
 mesh(g,new T.PlaneGeometry(.455,.25),plaqueMaterials[(c+r)%4],x,y,.12);
 }
 g.rotation.y=-Math.PI/2;g.position.set(2.90,1.66,-.15);return g;
}
function beaker(g,x,y,z,r=.09,h=.23,color=0x29ccec){
 const glass=new T.MeshBasicMaterial({color:0xbde5eb,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false});
 mesh(g,new T.CylinderGeometry(r,r,h,24,1,true),glass,x,y+h/2,z);
 cyl(g,r*.90,h*.46,color,x,y+h*.23,z);ring(g,r,.009,0xccecf0,x,y+h,z);ring(g,r,.006,0xa2c7cf,x,y+.005,z);
 for(let i=1;i<5;i++)box(g,i%2?.026:.043,.004,.003,0xf5ffff,x+r*.35,y+i*h/6,z+r*.94);
 rod(g,[x-r*.7,y+.025,z+r*.7],[x-r*.7,y+h-.03,z+r*.7],.003,0xecffff);
}
function flask(g,x,y,z,color,scale=1){
 const p=new T.Group();p.position.set(x,y,z);p.scale.setScalar(scale);g.add(p);
 const profile=[[0,0],[.085,0],[.10,.025],[.028,.19],[.027,.30],[.036,.305]].map(([r,h])=>new T.Vector2(r,h));
 const glass=new T.MeshBasicMaterial({color:0xc8f4ff,transparent:true,opacity:.26,depthWrite:false,side:T.DoubleSide});
 mesh(p,new T.LatheGeometry(profile,24),glass);cyl(p,.083,.095,color,0,.055,0,.054);ring(p,.03,.006,0xe2faff,0,.305,0);ring(p,.088,.005,0xb5e6f3,0,.008,0);
}
export function experiment(){
 const g=new T.Group();box(g,3.16,.71,.66,0xb3c2ca,0,.425,-.01);box(g,3.05,.10,.57,0x354b5b,0,.08,-.02);
 for(let i=0;i<6;i++){const x=(i-2.5)*.515;box(g,.49,.63,.035,0xe4eceb,x,.445,.338);box(g,.15,.019,.025,0x647e8c,x,.67,.365);}
 // Counter wraps around a genuinely recessed sink.
 box(g,1.08,.07,.72,0x465d6c,-1.07,.815,0);box(g,1.46,.07,.72,0x465d6c,.85,.815,0);
 box(g,.66,.07,.13,0x465d6c,-.2,.815,-.295);box(g,.66,.07,.13,0x465d6c,-.2,.815,.295);
 box(g,.66,.025,.46,0x718f9b,-.2,.735,0);for(const x of [-.52,.12])box(g,.025,.10,.46,0x9db6bf,x,.79,0);
 for(const z of [-.225,.225])box(g,.64,.10,.025,0x9db6bf,-.2,.79,z);
 cyl(g,.027,.26,0xb8ced4,-.2,.98,-.27);rod(g,[-.2,1.11,-.27],[-.2,1.16,-.10],.023,0xc6dce0);rod(g,[-.2,1.16,-.10],[-.2,1.08,-.07],.022,0xc6dce0);
 box(g,.46,.07,.37,0x77dfbf,-1.15,.885,.015);cyl(g,.15,.025,0x394958,-1.15,.932,.015);beaker(g,-1.15,.95,.015,.105,.27);
 label(g,'HOT PLATE',.23,.035,-1.15,.88,.204);
 box(g,.30,.035,.27,0x344c5c,-.68,.867,-.07);rod(g,[-.77,.88,-.15],[-.77,1.50,-.15],.012,0xbfd1d8);rod(g,[-.77,1.36,-.15],[-.53,1.36,-.15],.012,0xbfd1d8);
 flask(g,-.55,1.065,-.15,0x40e0b3,.72);
 beaker(g,.40,.85,.1,.08,.20,0xc476f1);beaker(g,.68,.85,-.12,.065,.27,0x30d9be);

 // Violet and cyan flasks plus a four-tube rack echo the reference's jewel colours.
 flask(g,.32,.85,-.14,0xb45fea,.68);
 box(g,.31,.025,.14,0x507691,.80,.87,.15);box(g,.31,.022,.14,0xa6c8d8,.80,1.035,.15);
 for(const xx of [.66,.94])rod(g,[xx,.88,.15],[xx,1.05,.15],.009,0x7396aa);
 for(let i=0;i<4;i++){const x=.69+i*.075;beaker(g,x,.89,.15,.022,.22,[0xd77bed,0x36ccea,0xf3c64a,0x59dfb1][i]);}
 plant(g,-1.42,.85,-.12);
 // Microscope: base, angled support, stage, optical barrel and eyepiece.
 const m=new T.Group();m.position.set(1.16,.85,.02);g.add(m);box(m,.34,.045,.28,0xd6e4e4,0,.022,0);
 rod(m,[.09,.04,-.07],[.09,.34,-.10],.033,0x72919c);box(m,.24,.025,.17,0x334e61,0,.20,.025);
 rod(m,[0,.29,.02],[-.055,.46,-.055],.04,0xd9e5e6);rod(m,[-.055,.46,-.055],[-.08,.51,-.09],.026,0x2d4558);
 cyl(m,.025,.07,0x49687c,0,.265,.02);mesh(m,new T.SphereGeometry(.035,12,8),0x385165,.135,.28,-.08);
 g.rotation.y=Math.PI/2;g.position.set(-2.62,0,-.55);return g;
}
function exhibit(g,type,x,y){
 const p=new T.Group();p.position.set(x,y,0);g.add(p);
 if(type===0){ // Miniature 3D printer, open frame and pink print.
  box(p,.37,.035,.30,0xdde8ee,0,.02,0);box(p,.37,.03,.30,0x30465b,0,.31,0);
  for(const xx of [-.165,.165])for(const zz of [-.125,.125])box(p,.024,.28,.024,0x405870,xx,.165,zz);
  box(p,.28,.018,.22,0x8799ad,0,.075,0);rod(p,[-.16,.23,0],[.16,.23,0],.009,0xb8d0d9);box(p,.055,.06,.05,0x3a5268,.04,.23,0);
  const print=mesh(p,new T.TorusKnotGeometry(.056,.016,40,6),0xef87b7,0,.15,.01);
  ring(p,.067,.014,0x2b4056,0,.36,-.05).rotation.set(0,0,0);
 }
 if(type===1){ // Golden vertices and violet polyhedral struts.
  const geo=new T.IcosahedronGeometry(.155,0),pts=[];
  const a=geo.attributes.position;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i);if(!pts.some(q=>q.distanceTo(v)<.001))pts.push(v);}
  const center=new T.Vector3(0,.18,0);
  for(const v of pts)mesh(p,new T.SphereGeometry(.018,8,6),0xffce5b,...v.clone().add(center).toArray());
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)if(pts[i].distanceTo(pts[j])<.18)rod(p,pts[i].clone().add(center).toArray(),pts[j].clone().add(center).toArray(),.006,0xe2c1ff);
 }
 if(type===2){ // DNA double helix, two continuous strands and coloured rungs.
  const paths=[[],[]];for(let i=0;i<=28;i++){const t=i/28,a=t*Math.PI*3.5;for(let j=0;j<2;j++)paths[j].push(new T.Vector3(Math.cos(a+j*Math.PI)*.072,.035+t*.30,Math.sin(a+j*Math.PI)*.055));}
  for(const path of paths)mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(path),40,.009,6,false),0xe8f4ff);
  for(let i=0;i<=28;i+=3)rod(p,paths[0][i].toArray(),paths[1][i].toArray(),.007,[0xfac36a,0xb5eebc,0xf6b4d6][i%3]);
 }
 if(type===3){ // Small lidded storage boxes.
  for(const [xx,yy,col] of [[-.10,.035,0x30c3b4],[.12,.03,0x54a8ed]]){box(p,.19,.12,.20,col,xx,yy+.06,0);box(p,.205,.025,.215,col,xx,yy+.13,0);box(p,.065,.014,.008,0x21556e,xx,yy+.09,.105);}
 }
 if(type===4){ // Colourful architectural blocks.
  for(const [xx,h,col] of [[-.14,.19,0xf0bf42],[0,.27,0xec87b3],[.14,.16,0x78d7ca]])box(p,.085,h,.12,col,xx,h/2,0);
  box(p,.25,.065,.13,0x8fa8ef,0,.05,0);const roof=mesh(p,new T.ConeGeometry(.105,.10,4),0xffc689,0,.32,0);roof.rotation.y=Math.PI/4;
 }
 if(type===5){ // Two real wireframe pyramids.
  for(const [xx,r,h,col] of [[-.10,.09,.25,0xffcc3c],[.12,.085,.20,0x73d8ff]]){const corners=[[-r,0,-r],[r,0,-r],[r,0,r],[-r,0,r]];for(let i=0;i<4;i++){rod(p,[xx, h,0],[xx+corners[i][0],.012,corners[i][2]],.007,col);rod(p,[xx+corners[i][0],.012,corners[i][2]],[xx+corners[(i+1)%4][0],.012,corners[(i+1)%4][2]],.007,col);}}
 }
}
export function maker(){
 const g=new T.Group();
 const colors=[0x60d8ad,0xa58ae9,0x62b3ed],backs=[0x286f65,0x554882,0x285a8c];
 // Each of the three units owns its coloured sides, shelves and drawer; no oak surround.
 for(let c=0;c<3;c++){
  const x=(c-1)*.58,col=colors[c];box(g,.58,1.20,.035,backs[c],x,.67,-.225);
  for(const y of [.10,.46,.85,1.25])box(g,.58,.04,.48,col,x,y,0);
  for(const side of [-1,1])box(g,.027,1.19,.48,col,x+side*.277,.675,0);
  box(g,.515,.30,.425,col,x,.28,.012);box(g,.135,.018,.014,0x28485f,x,.37,.233);
  exhibit(g,c,x,.875);exhibit(g,c+3,x,.485);
 }
 for(const x of [-.76,.76])for(const z of [-.16,.16])box(g,.065,.08,.065,0x3e5665,x,.04,z);
 plant(g,.68,1.275,-.06);
 g.rotation.y=-Math.PI/2;g.position.set(2.68,0,2.76);return g;
}
export function mathProps(g,y){
 const cube=new T.Group();cube.position.set(-.37,y+.145,-.25);cube.rotation.y=.24;g.add(cube);
 const colors=[0xe8b955,0x659cbf,0xcd7180,0x68af98,0xf0e4c5,0xa18dc7];
 const materials=colors.map(mat);for(let x=0;x<3;x++)for(let yy=0;yy<3;yy++)for(let z=0;z<3;z++)box(cube,.081,.081,.081,materials,(x-1)*.087,(yy-1)*.087,(z-1)*.087);
 const pyramid=mesh(g,new T.ConeGeometry(.18,.30,4),0xa17be4,.04,y+.16,-.30);pyramid.rotation.y=Math.PI/4;
 const d=mesh(g,new T.DodecahedronGeometry(.16),0xf090b5,.43,0,-.20);d.rotation.set(.2,.4,.1);d.updateMatrixWorld(true);d.position.y=y+.01-new T.Box3().setFromObject(d).min.y;
 const edges=new T.LineSegments(new T.EdgesGeometry(d.geometry),new T.LineBasicMaterial({color:0x734f66}));d.add(edges);
 const paper=graphic(768,512,(c,w,h)=>{c.fillStyle='#367fc5';c.fillRect(0,0,w,h);c.strokeStyle='#68a1d3';c.lineWidth=1;for(let i=0;i<w;i+=32){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();}for(let i=0;i<h;i+=32){c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}c.strokeStyle='#daeeff';c.lineWidth=5;c.beginPath();c.arc(330,270,155,0,Math.PI*2);c.moveTo(175,270);c.lineTo(485,270);c.lineTo(330,115);c.closePath();c.stroke();c.fillStyle='#e1f3ff';c.font='28px sans-serif';c.fillText('GEOMETRY / 幾何探索',35,45);});
 const p=mesh(g,new T.BoxGeometry(.65,.004,.42),[mat(0x367fc5),mat(0x367fc5),paper,mat(0x367fc5),mat(0x367fc5),mat(0x367fc5)],0,y+.013,.26);p.rotation.y=-.08;
 const s=new T.Shape();s.moveTo(0,0);s.lineTo(.29,0);s.lineTo(0,.24);s.closePath();const h=new T.Path();h.moveTo(.04,.04);h.lineTo(.04,.15);h.lineTo(.18,.04);h.closePath();s.holes.push(h);
 const sq=mesh(g,new T.ExtrudeGeometry(s,{depth:.009,bevelEnabled:false}),0x75b6a3,-.60,y+.012,.11);sq.rotation.x=-Math.PI/2;
 const cp=new T.Group();g.add(cp);cp.position.set(.28,y+.025,.48);rod(cp,[0,0,-.12],[-.075,0,.13],.011,0x6b8594);rod(cp,[0,0,-.12],[.075,0,.13],.011,0x6b8594);cyl(cp,.025,.016,0xcda253,0,.004,-.12);
}
