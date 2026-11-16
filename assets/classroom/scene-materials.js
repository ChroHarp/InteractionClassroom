import * as T from './vendor/three.module.min.js';

// A single palette and orthographic surface graphics; none are sampled from panorama.webp.
export const PALETTE = {mint:0x60d8ad, lavender:0xa58ae9, blue:0x62b3ed, ink:0x24374e, oak:0xc9935c};
export function canvasTexture(w,h,draw){
 const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
export function surfaces(){
 const floor=canvasTexture(1024,1024,(c,w,h)=>{
  let seed=347;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle='#b69573';c.fillRect(0,0,w,h);
  for(let row=0;row<8;row++)for(let k=-1;k<3;k++){
   const x=k*512+(row%2)*256,y=row*128;const value=Math.floor(rand()*6);
   c.fillStyle=`rgb(${196+value},${161+value},${120+value})`;c.fillRect(x+1,y+1,510,126);
   for(let i=0;i<34;i++){const gy=y+rand()*125;c.strokeStyle=`rgba(102,68,43,${.025+rand()*.07})`;c.lineWidth=1;c.beginPath();c.moveTo(x,gy);c.bezierCurveTo(x+170,gy+rand()*8,x+340,gy-rand()*8,x+512,gy);c.stroke();}
   c.fillStyle='rgba(255,244,218,.3)';c.fillRect(x+2,y+2,508,1);
  }
 });floor.wrapS=floor.wrapT=T.RepeatWrapping;floor.repeat.set(3,5);
 const blackboard=canvasTexture(1400,760,(c,w,h)=>{
 c.fillStyle='#165343';c.fillRect(0,0,w,h);c.strokeStyle='#d9e9cb';c.lineWidth=4;
 c.beginPath();c.moveTo(125,470);c.lineTo(665,470);c.moveTo(335,650);c.lineTo(335,100);c.stroke();
 for(let i=0;i<9;i++){c.beginPath();c.moveTo(145+i*60,460);c.lineTo(145+i*60,480);c.stroke();}
 c.beginPath();for(let i=-170;i<=200;i++){const x=335+i,y=470-i*i*i/37000;i===-170?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
 c.fillStyle='#e5f1d8';c.font='italic 96px Georgia';c.fillText('∫ x² dx',790,350);c.font='italic 42px Georgia';c.fillText('= ⅓ x³ + C',790,445);
 c.font='26px sans-serif';c.fillStyle='#91c5a8';c.fillText('OBSERVE  ·  QUESTION  ·  EXPLORE',110,700);
 });
 const courses=canvasTexture(800,650,(c,w,h)=>{c.fillStyle='#ba8b55';c.fillRect(0,0,w,h);c.fillStyle='#f3e8cc';c.font='bold 44px sans-serif';c.fillText('三年探索路徑',65,80);
 ['啟發試探','探究實作','適性分流'].forEach((s,i)=>{c.fillStyle=['#e1f2dc','#ece1fa','#dbeffa'][i];c.fillRect(55,125+i*163,690,138);c.fillStyle='#33566a';c.font='bold 34px sans-serif';c.fillText(`${7+i} 年級  /  ${s}`,90,205+i*163);c.fillStyle=['#64ba91','#a07bd2','#5da8d5'][i];c.beginPath();c.arc(400,138+i*163,10,0,Math.PI*2);c.fill();});});
 const entry=canvasTexture(320,640,(c,w,h)=>{c.fillStyle='#233b57';c.fillRect(0,0,w,h);c.strokeStyle='#e6c87b';c.lineWidth=7;c.strokeRect(16,16,w-32,h-32);c.fillStyle='#f0d795';c.textAlign='center';c.font='bold 42px sans-serif';['平興','數資','探索','教室'].forEach((s,i)=>c.fillText(s,160,115+i*115));});
 const gallery=canvasTexture(1200,800,(c,w,h)=>{
 c.fillStyle='#d6e7ed';c.fillRect(0,0,w,h);c.fillStyle='#2b5265';c.font='bold 34px sans-serif';c.fillText('探索紀事  /  LEARNING MOMENTS',65,60);
 for(let i=0;i<6;i++){const x=45+(i%3)*390,y=100+Math.floor(i/3)*340;c.fillStyle=['#efb9b1','#b8a5e0','#e8c67b'][i%3];c.fillRect(x,y,355,300);c.fillStyle='#263f62';c.fillRect(x+14,y+14,327,272);c.save();c.translate(x+175,y+150);c.strokeStyle='#e8d594';c.fillStyle='#75d2b8';c.lineWidth=5;
 if(i===0||i===4){for(let j=0;j<5;j++){c.beginPath();c.arc((j-2)*48,Math.sin(j)*35,18,0,Math.PI*2);c.fill();}c.beginPath();c.moveTo(-120,75);c.lineTo(110,75);c.stroke();}
 else if(i===1||i===5){c.beginPath();c.moveTo(-90,80);c.lineTo(0,-85);c.lineTo(90,80);c.closePath();c.stroke();c.beginPath();c.moveTo(-90,80);c.lineTo(15,10);c.lineTo(90,80);c.moveTo(15,10);c.lineTo(0,-85);c.stroke();}
 else{c.beginPath();c.ellipse(0,0,100,40,-.5,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,50,0,Math.PI*2);c.fill();}c.restore();}
 });
 return {'floor':floor,'blackboard.webp':blackboard,'courses-board.webp':courses,'entry-sign.webp':entry,'photos-board.webp':gallery};
}
