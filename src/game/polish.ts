import { W,H,ZONE,WEAPONS,FONT_D,FONT_B } from './constants';
import type { Player,PlayerLook,ZoneTransition } from './types';
const hues=['#d7aa69','#69d0bd','#d65e6b','#91d9f1','#b788ed','#b1c477','#c4e7f2','#c4a58d','#f4d185','#cf647d'];
const names=['O campanário partido','O órgão afogado','O trono sem rei','O espelho da lua','A fenda astral','A árvore das sentenças','O salão congelado','O altar de ossos','A rosácea do coro','O eclipse de Mergo'];
export function drawWeaponArc(c:CanvasRenderingContext2D,p:Player,look:PlayerLook,still:boolean){
 if(p.state!=='atk'||p.dead)return;
 const w=WEAPONS[look.weapon],elapsed=p.t-p.aw,fade=elapsed<0?0:Math.max(0,1-elapsed/(p.aa+.16));
 const progress=Math.max(0,Math.min(1,elapsed/p.aa));
 if(fade<=0)return;
 c.save();c.translate(p.x,p.y-48);c.scale(p.face,1);
 const tint=w.relicTint|| (w.category==='pyro'?'#ff9d55':w.category==='magic'?'#b9a0ff':'#e9d7a7');
 c.globalCompositeOperation='lighter';c.shadowColor=tint;c.shadowBlur=still?0:12;
 if(w.category==='melee'){
   const reverse=p.combo===2;const start=reverse?1.1:-2.3, end=start+(reverse?-3.1:3.5)*progress;
   const radius=p.heavy?91:71;
   for(let i=0;i<4;i++){c.globalAlpha=fade*(.25-i*.05);c.strokeStyle=tint;c.lineWidth=12-i*2.5;c.beginPath();c.ellipse(5,0,radius-i*6,(radius-i*6)*.72,0,start,end,reverse);c.stroke();}
   c.globalAlpha=fade*.9;c.strokeStyle='#fff5d9';c.lineWidth=1.6;c.beginPath();c.ellipse(5,0,radius+2,(radius+2)*.72,0,start,end,reverse);c.stroke();
   // Fine tips move along the edge rather than a solid opaque flash.
   if(!still)for(let i=0;i<5;i++){const a=end-(reverse?-1:1)*i*.13;c.globalAlpha=fade*(1-i/6);c.fillStyle=tint;c.fillRect(5+Math.cos(a)*radius,Math.sin(a)*radius*.72,3,1.5);}
 }else{
   c.globalAlpha=fade*.65;c.strokeStyle=tint;c.lineWidth=2;
   for(let i=0;i<3;i++){c.beginPath();c.ellipse(36+elapsed*50,0,8+i*5,12+i*6,0,0,Math.PI*2);c.stroke();}
 }
 c.restore();
}
export function drawAtmosphere(c:CanvasRenderingContext2D,cam:number,time:number,z:number,still:boolean){
 const base=z*ZONE,col=hues[z];c.save();
 // Distinct silhouettes repeated at low density, behind enemies and the player.
 for(let i=Math.floor((cam-base)/300)-1;i<Math.ceil((cam+W-base)/300)+1;i++){
  const x=base+i*300+150;if(x<base||x>base+ZONE)continue;
  c.save();c.translate(x,0);c.strokeStyle=col+'65';c.fillStyle='#0d141acc';c.lineWidth=4;
  if(z===1){ // corroded pipes, drips and hanging chains
   c.strokeStyle='#455f5b';c.lineWidth=15;c.beginPath();c.moveTo(-130,120);c.lineTo(30,120);c.quadraticCurveTo(60,120,60,150);c.lineTo(60,230);c.stroke();c.strokeStyle=col+'55';c.lineWidth=1;for(let n=0;n<5;n++){const y=235+((n*29+(still?0:time*65))%155);c.beginPath();c.moveTo(60,y);c.lineTo(60,y+8);c.stroke();}
  }else if(z===5){ // roots and bare branches
   c.strokeStyle='#283a2b';c.lineWidth=16;c.beginPath();c.moveTo(0,440);c.bezierCurveTo(-25,310,35,235,-5,110);c.stroke();c.lineWidth=5;for(let n=0;n<4;n++){c.beginPath();c.moveTo(0,180+n*45);c.lineTo((n%2?-1:1)*(60+n*12),110+n*38);c.stroke();}
  }else if(z===3||z===4||z===9){
   c.globalAlpha=.23;c.strokeStyle=col;for(let n=0;n<3;n++){c.beginPath();c.ellipse(0,220,50+n*16,50+n*16,still?0:time*.04,0,Math.PI*2);c.stroke();}c.globalAlpha=.7;c.fillStyle=col;for(let n=0;n<6;n++)c.fillRect(Math.sin(i*9+n*4)*105,100+n*43,2,2);
  }else if(z===7){ // stacked ossuary niches
   for(let n=0;n<4;n++){c.fillStyle='#080c10';c.fillRect(-56,140+n*57,112,45);for(let k=0;k<4;k++){c.fillStyle='#7b756766';c.beginPath();c.arc(-36+k*24,160+n*57,9,0,Math.PI*2);c.fill();c.fillStyle='#080b0d';c.fillRect(-41+k*24,158+n*57,3,4);c.fillRect(-33+k*24,158+n*57,3,4);}}
  }else{ // cloth, ice and high windows use their own silhouettes
   c.strokeStyle='#40413f';c.beginPath();c.moveTo(-45,105);c.lineTo(45,105);c.stroke();c.fillStyle=col+'30';c.beginPath();c.moveTo(-32,108);c.lineTo(32,108);c.lineTo(28,280);c.lineTo(0,312);c.lineTo(-30,280);c.closePath();c.fill();c.strokeStyle=col+'65';c.lineWidth=1;c.stroke();
   if(z===6)for(let n=0;n<6;n++){c.fillStyle='#b0d6e455';c.beginPath();c.moveTo(-55+n*20,95);c.lineTo(-48+n*20,180+(n%3)*20);c.lineTo(-42+n*20,95);c.fill();}
   if(z===8){c.strokeStyle=col+'75';c.beginPath();c.arc(0,205,30,0,Math.PI*2);c.stroke();}
  }c.restore();
 }
 // Every main boss has a distinct architectural centrepiece.
 const x=base+6650;if(x>cam-420&&x<cam+W+420){c.save();c.translate(x,0);c.fillStyle='#070b10bb';c.fillRect(-260,100,520,340);c.strokeStyle=col+'80';c.lineWidth=3;
  if(z===0){c.beginPath();c.moveTo(-100,330);c.lineTo(-100,140);c.quadraticCurveTo(0,50,100,140);c.lineTo(100,330);c.stroke();c.fillStyle='#5e5448';c.beginPath();c.moveTo(-45,210);c.quadraticCurveTo(-45,140,0,140);c.quadraticCurveTo(45,140,45,210);c.lineTo(62,232);c.lineTo(-62,232);c.fill();}
  else if(z===1||z===8){for(let n=-5;n<=5;n++){const h=180-Math.abs(n)*19;c.fillStyle=col+'45';c.fillRect(n*30-9,330-h,18,h);c.strokeRect(n*30-9,330-h,18,h);} }
  else if(z===2||z===6){c.fillStyle=col+'35';c.fillRect(-75,190,150,160);c.beginPath();c.moveTo(-75,190);c.lineTo(-90,130);c.lineTo(-30,160);c.lineTo(0,100);c.lineTo(30,160);c.lineTo(90,130);c.lineTo(75,190);c.closePath();c.fill();c.stroke();c.fillStyle='#111017';c.fillRect(-48,205,96,120);}
  else if(z===5){c.strokeStyle='#59604c';c.lineWidth=25;c.beginPath();c.moveTo(0,400);c.lineTo(0,190);c.lineTo(-110,110);c.moveTo(0,220);c.lineTo(130,100);c.stroke();}
  else if(z===7){for(let n=0;n<8;n++){c.strokeStyle=col+'70';c.lineWidth=9;c.beginPath();c.ellipse(0,330,65+n*19,45+n*21,0,Math.PI,Math.PI*2);c.stroke();}}
  else{c.fillStyle=col+'45';c.beginPath();c.arc(0,220,100,0,Math.PI*2);c.fill();c.fillStyle='#080d15';c.beginPath();c.arc(z===9?18:0,212,z===4?78:86,0,Math.PI*2);c.fill();c.strokeStyle=col;for(let n=0;n<8;n++){const a=n*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*110,220+Math.sin(a)*110);c.lineTo(Math.cos(a)*125,220+Math.sin(a)*125);c.stroke();}}
  c.font=`16px ${FONT_D}`;c.fillStyle=col;c.textAlign='center';c.fillText(names[z],0,385);c.restore();
 }
 c.restore();
}
export function drawPassage(c:CanvasRenderingContext2D,p:{t:number;label:string}){
 const t=Math.max(0,Math.min(1,p.t));const a=t<.5?t*2:(1-t)*2;
 c.save();c.fillStyle=`rgba(3,7,10,${a})`;c.fillRect(0,0,W,H);
 c.globalAlpha=a;c.strokeStyle='#9cb9ad';c.lineWidth=2;const width=90+Math.abs(t-.5)*140;c.strokeRect(W/2-width/2,100,width,H-150);
 c.fillStyle='#d8d5c1';c.font=`22px ${FONT_D}`;c.textAlign='center';c.fillText(p.label,W/2,H*.77,W-70);c.restore();
}
export function drawRegionVeil(c:CanvasRenderingContext2D,tr:ZoneTransition,still:boolean){
 const p=Math.min(1,tr.t/tr.dur),a=Math.sin(p*Math.PI);c.save();
 const tint=hues[tr.toZone]||'#b4c6c3';
 for(let i=0;i<5;i++){const x=still?W/2:(p*1.4-.3)*W+i*100-200;const g=c.createRadialGradient(x,H*.55,15,x,H*.55,280);g.addColorStop(0,tint+'22');g.addColorStop(1,tint+'00');c.globalAlpha=a;c.fillStyle=g;c.fillRect(0,0,W,H);}
 c.globalAlpha=a;c.fillStyle='#080d12da';c.fillRect(0,H-128,W,100);c.fillStyle=tint;c.font=`12px ${FONT_D}`;c.textAlign='center';c.fillText('UM NOVO LIMIAR',W/2,H-106);c.fillStyle='#e3dfcf';c.font=`30px ${FONT_D}`;c.fillText(tr.title,W/2,H-74,W-80);c.font=`italic 15px ${FONT_B}`;c.fillStyle='#b9c2bd';c.fillText(tr.subtitle,W/2,H-49,W-80);c.restore();
}
