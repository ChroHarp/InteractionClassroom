import * as T from './vendor/three.module.min.js';
import { canvasTexture, PALETTE } from './scene-materials.js';
import { plant } from './scene-props.js';
const basic=(color,opts={})=>new T.MeshBasicMaterial({color,...opts});
const shade=color=>new T.MeshLambertMaterial({color,flatShading:true});
function box(g,w,h,d,color,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),typeof color==='number'?shade(color):color);m.position.set(x,y,z);g.add(m);return m;}
function plane(g,w,h,mat,x,y,z,ry=0){const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=ry;g.add(m);return m;}
function wall(g,w,x,z,rot){
 const p=new T.Group();p.position.set(x,0,z);p.rotation.y=rot;g.add(p);
 box(p,w,3.55,.10,0xd2dce6,0,1.775,-.06);
 box(p,w,1.05,.055,0x8fb58e,0,.525,.01);
 box(p,w,.055,.08,0xb2d1ac,0,1.075,.035);box(p,w,.065,.07,0x61788a,0,.04,.035);
 for(let xx=-w/2+.28;xx<w/2;xx+=.42)box(p,.012,.93,.012,0x749b76,xx,.55,.045);
 return p;
}
export function environment(scene,textures){
 const g=new T.Group();scene.add(g);
 const floor=plane(g,6.2,13,basic(0xffffff,{map:textures.floor}),0,0,2.0);floor.geometry.dispose();floor.geometry=new T.PlaneGeometry(6.2,13,12,26);floor.rotation.x=-Math.PI/2;
 wall(g,6,0,-3.8,0);wall(g,11,3,1.7,-Math.PI/2);
 // Each window is a real opening in the left wall, with an independently layered outdoor view.
 const lower=new T.Group();lower.position.set(-3,0,.8);lower.rotation.y=Math.PI/2;g.add(lower);
 box(lower,9.2,1.05,.10,0x8fb58e,0,.525,-.05);box(lower,9.2,.055,.16,0xd6e7de,0,1.07,0);
 for(let x=-4.5;x<4.6;x+=.42)box(lower,.012,.94,.012,0x749b76,x,.54,.012);
 box(g,.16,.83,9.2,0x263a51,-3,3.135,.8);
 for(const [za,zb] of [[-3.8,-1.92],[.16,.62],[2.5,3.42]])box(g,.18,1.65,zb-za,0xaebfcf,-3,1.875,(za+zb)/2);
 for(const [za,zb] of [[-1.92,.16],[.62,2.50]]){
 const z=(za+zb)/2,w=zb-za;
 box(g,.28,.065,w+.10,0xe1eeeb,-2.94,1.08,z);box(g,.10,.08,w,0x415970,-3,2.70,z);
 box(g,.07,1.60,.055,0x476177,-3.04,1.88,z);box(g,.07,.05,w,0x476177,-3.04,2.07,z);
 box(g,.045,.25,w-.08,0xf1f0e5,-2.99,2.55,z);
 }
 plant(g,-2.86,1.12,1.18);
 // No mirrored school-image tiles: one sky field and real low-poly trees behind the windows.
 const sky=canvasTexture(512,512,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#71bce5');gr.addColorStop(1,'#def3f0');c.fillStyle=gr;c.fillRect(0,0,w,h);c.fillStyle='#f1fbfa';[[90,110,70],[300,230,100],[380,70,60]].forEach(([x,y,r])=>{c.beginPath();c.ellipse(x,y,r,18,0,0,Math.PI*2);c.fill();});});
 plane(g,27,8,basic(0xffffff,{map:sky}),-6,2,-1,Math.PI/2);
 box(g,.3,1.6,15,0xd5e3e8,-5.5,.9,-1);for(let z=-7;z<6;z+=.65)box(g,.32,.55,.42,0x83b9cc,-5.3,1.2,z);
 for(let i=0;i<12;i++){const z=-6+i*.9;box(g,.09,1.6,.09,0x9c8660,-4.3,.8,z);for(let j=0;j<3;j++){const crown=new T.Mesh(new T.IcosahedronGeometry(.42+j*.05,1),shade([0x83bd65,0xa1cd72,0x60a670][j]));crown.position.set(-4.3+Math.sin(j)*.20,1.5+j*.23,z+Math.cos(i+j)*.18);g.add(crown);}}
 // Full-height entry frame and simple oak door; hardware is geometry.
 box(g,.14,2.85,1.0,0xe2d4b8,-2.98,1.425,3.96);box(g,.16,2.65,.82,0xbb8552,-2.88,1.325,3.96);
 box(g,.045,.23,.065,0x7890a1,-2.78,1.02,3.69);box(g,.12,.035,.18,0xd2dfe3,-2.74,1.07,3.75);
 // A single non-repeating original mural. UV window removes only unused starfield;
 // its physical aspect ratio matches that UV window, keeping planets circular.
 const mural=textures['solar-system.webp'];mural.repeat.set(1,.52);mural.offset.set(0,.27);
 plane(g,7.6,.98,basic(0x101639),2.935,2.98,0,-Math.PI/2);
 plane(g,5.6,5.6/3*.52,basic(0xffffff,{map:mural}),2.927,2.98,-.35,-Math.PI/2);
 box(g,.06,.035,7.6,0x9b9ed3,2.92,2.56,0);
 // Sun patches are authored as light masks, not cut out of a rendered room.
 const sun=canvasTexture(512,512,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='rgba(255,244,194,.30)';for(let r=0;r<3;r++)for(let col=0;col<2;col++)c.fillRect(30+col*230,25+r*165,200,140);});
 const patch=plane(g,2.8,4.4,basic(0xffffff,{map:sun,transparent:true,depthWrite:false}),-1.25,.008,.5);patch.rotation.x=-Math.PI/2;patch.rotation.z=-.28;
 // Structural grid and deliberately diagonal suspended baffles (13.75 degrees in plan).
 box(g,6.2,.06,12,0x182635,0,3.60,1.8);
 for(let x=-2.8;x<3;x+=.7)box(g,.045,.08,11.6,0x2d4053,x,3.57,1.7);
 for(let z=-3.4;z<7;z+=.8)box(g,6.0,.08,.045,0x304356,0,3.57,z);
 for(const z of [-2.75,-1.55,-.35,.85,2.05,3.25]){
 const b=new T.Group();b.position.set(0,3.40,z);b.rotation.y=-.24;g.add(b);
 for(const [x,col] of [[-1.52,PALETTE.mint],[1.52,PALETTE.blue]]){
 const side=basic(col),bottom=basic(col===PALETTE.mint?0x8cf0c7:0x8bceff);
 box(b,3.04,.15,.27,[side,side,side,bottom,side,side],x,0,0);
 }
 for(const x of [-1.9,0,1.9]){const rim=new T.Mesh(new T.CylinderGeometry(.105,.105,.025,24),basic(0xafccd8));rim.position.set(x,-.084,0);b.add(rim);const light=new T.Mesh(new T.CircleGeometry(.083,24),basic(0xfffcee));light.rotation.x=Math.PI/2;light.position.set(x,-.098,0);b.add(light);}
 }
}
