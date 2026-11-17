import { H, W, ZONE } from './constants';
import { SOL, PLAT, groundAt } from './world';
import { PUZZLES, newPuzzle, puzzleClue, puzzleTarget, type Breakable } from './expansion';
import type { Enemy, Player, SaveStats } from './types';
const colors=['#a1c4c8','#73c6bd','#d9a267','#b2d7ef','#b59bdf','#9cbd89','#bed8ed','#aaa3ca','#e9d79f','#dd93a1'];
const poly=(c:CanvasRenderingContext2D,points:number[][],color:string)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};

export function drawDepthBack(c:CanvasRenderingContext2D,cam:number,time:number,zone:number,still:boolean) {
  c.save();
  const accent=colors[zone];
  // A near architectural layer with receding side faces, distinct from the skyline.
  const offset=cam*.68;
  for(let i=Math.floor(offset/460)-1;i<Math.ceil((offset+W)/460)+1;i++) {
    const x=i*460-offset, y=438, h=220+(i%3)*25;
    c.fillStyle='#101b20';c.fillRect(x,y-h,32,h);c.fillRect(x+302,y-h,36,h);
    poly(c,[[x+32,y-h],[x+54,y-h-22],[x+54,y-22],[x+32,y]],'#233038');
    poly(c,[[x+302,y-h],[x+324,y-h-22],[x+360,y-h-22],[x+338,y-h]],'#303a3d');
    c.strokeStyle='#26363c';c.lineWidth=18;c.beginPath();c.moveTo(x+25,y-h+65);
    c.bezierCurveTo(x+72,y-h-90,x+254,y-h-90,x+318,y-h+65);c.stroke();
    c.strokeStyle=accent+'45';c.lineWidth=2;c.beginPath();c.moveTo(x+27,y-h+62);c.bezierCurveTo(x+85,y-h-72,x+249,y-h-72,x+316,y-h+62);c.stroke();
    for(let j=0;j<4;j++){c.strokeStyle='#48505245';c.lineWidth=1;c.strokeRect(x+4,y-h+j*48+10,23,28);}
    const glow=c.createRadialGradient(x+168,y-h+50,2,x+168,y-h+50,110);
    glow.addColorStop(0,accent+'2b');glow.addColorStop(1,accent+'00');c.fillStyle=glow;c.fillRect(x+50,y-h-60,236,220);
    c.fillStyle=accent+'85';c.fillRect(x+165,y-h+30,5,26);
    // Ruined flying buttress, leaning away from the play lane.
    poly(c,[[x+350,y],[x+410,y-140],[x+432,y-146],[x+380,y]],'#17242a');
  }
  // Horizontal mist does not move when reduced motion is requested.
  const t=still?0:time;
  for(let i=0;i<4;i++) {const x=((i*340+t*9-cam*.5)%(W+440)+W+440)%(W+440)-220;
    const g=c.createRadialGradient(x,405,10,x,405,190);g.addColorStop(0,accent+'13');g.addColorStop(1,accent+'00');c.fillStyle=g;c.fillRect(x-190,290,380,230);}
  c.restore();
}

export function drawDepthFloor(c:CanvasRenderingContext2D,cam:number,zone:number,enemies:Enemy[],P:Player) {
  c.save();
  for(const s of [...SOL,...PLAT]) {
    if(s.x+s.w<cam-50||s.x>cam+W+50)continue;
    const depth=PLAT.includes(s)?18:30,dx=depth*.65;
    const g=c.createLinearGradient(0,s.y-depth,0,s.y);g.addColorStop(0,'#202e32');g.addColorStop(1,'#54615e');
    c.fillStyle=g;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.x+dx,s.y-depth);c.lineTo(s.x+s.w+dx,s.y-depth);c.lineTo(s.x+s.w,s.y);c.closePath();c.fill();
    c.strokeStyle=colors[zone]+'55';c.lineWidth=1;c.stroke();
    const start=Math.max(s.x,Math.floor(cam/56)*56);
    for(let x=start;x<s.x+s.w&&x<cam+W+60;x+=56){c.strokeStyle='#0c151c90';c.beginPath();c.moveTo(x,s.y);c.lineTo(x+dx,s.y-depth);c.stroke();}
    c.strokeStyle='#18222780';c.beginPath();c.moveTo(s.x+dx/2,s.y-depth/2);c.lineTo(s.x+s.w+dx/2,s.y-depth/2);c.stroke();
    poly(c,[[s.x+s.w,s.y],[s.x+s.w+dx,s.y-depth],[s.x+s.w+dx,s.y+14],[s.x+s.w,s.y+35]],'#131e24');
  }
  for(const e of [P,...enemies.filter(e=>!e.dead&&!e.pending)]) {
    if(Math.abs(e.x-cam-W/2)>W/2+80)continue;
    const gy=groundAt(e.x);if(gy===null)continue;
    const altitude=Math.max(0,gy-e.y);
    c.fillStyle=`rgba(0,0,0,${Math.max(.08,.35-altitude/600)})`;c.beginPath();
    c.ellipse(e.x+14,gy-5,Math.max(9,e.hw*1.5-altitude*.05),6, -.15,0,Math.PI*2);c.fill();
  }
  c.restore();
}

export function drawRuins(c:CanvasRenderingContext2D,cam:number,props:Breakable[],S:SaveStats,time:number) {
 c.save();
 for(const b of props) {
  if(b.x<cam-90||b.x>cam+W+90)continue;
  c.save();c.translate(b.x,b.y);
  if(S.brokenProps?.includes(b.id)) {
    for(let j=0;j<5;j++)poly(c,[[j*9-22,-2],[j*9-17,-7-(j%2)*4],[j*9-11,-1]],'#5a5750');
  } else {
    c.fillStyle='#0006';c.beginPath();c.ellipse(8,-2,26,6,0,0,Math.PI*2);c.fill();
    if(b.kind==='crate') {
      poly(c,[[-19,-3],[-19,-39],[15,-39],[15,-3]],'#76573b');poly(c,[[15,-3],[25,-13],[25,-49],[15,-39]],'#3c3027');poly(c,[[-19,-39],[-9,-49],[25,-49],[15,-39]],'#987854');
      c.strokeStyle='#332b24';c.lineWidth=3;c.strokeRect(-17,-38,30,33);c.beginPath();c.moveTo(-17,-36);c.lineTo(12,-7);c.moveTo(-17,-7);c.lineTo(12,-36);c.stroke();
    } else if(b.kind==='urn') {
      const g=c.createLinearGradient(-17,0,18,0);g.addColorStop(0,'#453d39');g.addColorStop(.4,'#b9a48a');g.addColorStop(1,'#51443b');c.fillStyle=g;
      c.beginPath();c.moveTo(-8,-42);c.bezierCurveTo(-5,-25,-24,-24,-16,-7);c.quadraticCurveTo(0,4,16,-7);c.bezierCurveTo(24,-24,5,-25,8,-42);c.closePath();c.fill();c.fillStyle='#c6b393';c.fillRect(-10,-43,20,4);
      c.strokeStyle='#4f514b';c.strokeRect(-8,-22,16,5);
    } else {
      const h=b.kind==='wall'?82:120,w=b.kind==='wall'?56:25;
      poly(c,[[-w,0],[-w,-h],[w,-h+8],[w,0]],'#546064');poly(c,[[w,0],[w+14,-12],[w+14,-h-4],[w,-h+8]],'#27343a');
      for(let y=-h+18;y<0;y+=22){c.strokeStyle='#1b282d';c.beginPath();c.moveTo(-w,y);c.lineTo(w,y);c.stroke();}
      c.strokeStyle='#bdc3ac';c.lineWidth=1.5;c.beginPath();c.moveTo(-4,-h+8);c.lineTo(8,-h*.7);c.lineTo(-7,-h*.4);c.lineTo(3,-10);c.stroke();
      if(b.kind==='wall'){c.fillStyle=`rgba(244,198,98,${.5+Math.sin(time*2)*.2})`;c.fillRect(-2,-44,4,12);}
    }
  }
  c.restore();
 }
 c.restore();
}

export function drawPuzzleWorld(c:CanvasRenderingContext2D,cam:number,S:SaveStats,time:number) {
 c.save();
 for(const p of PUZZLES) {
  if(p.x<cam-230||p.x>cam+W+230)continue;
  const s=S.puzzles?.[p.id]||newPuzzle(p),col=s.solved?'#eaca83':'#70d9d4';
  // Vault in the rear plane; pillars remain in the same interactable lane.
  c.fillStyle='#0a1920';c.fillRect(p.x-42,p.y-145,84,105);c.strokeStyle=col+'77';c.lineWidth=3;c.strokeRect(p.x-42,p.y-145,84,105);
  c.fillStyle=col;c.font='13px Georgia';c.textAlign='center';c.fillText(s.solved?'CRIPTA ABERTA':'SELO ANTIGO',p.x,p.y-121);
  if(!s.solved){c.strokeStyle='#829b9c';for(let x=-24;x<=24;x+=16){c.beginPath();c.moveTo(p.x+x,p.y-110);c.lineTo(p.x+x,p.y-43);c.stroke();}}
  else {const g=c.createRadialGradient(p.x,p.y-65,3,p.x,p.y-65,60);g.addColorStop(0,'#fbd88a77');g.addColorStop(1,'#fbd88a00');c.fillStyle=g;c.fillRect(p.x-60,p.y-125,120,120);}
  for(let i=0;i<3;i++) {
    const x=p.x+(i-1)*95,y=p.y;c.fillStyle='#33494e';c.fillRect(x-15,y-44,30,44);poly(c,[[x+15,y],[x+25,y-9],[x+25,y-53],[x+15,y-44]],'#142b32');
    const active=s.solved||(p.kind==='lights'?s.values[i]===1:p.kind==='sequence'?puzzleTarget(p,S.ng).slice(0,s.step).includes(i):false);
    c.strokeStyle=active?'#ffe298':col;c.fillStyle=active?'#f6d27a':'#1b303b';c.lineWidth=2;
    c.beginPath();c.arc(x,y-61,18,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle=active?'#172329':'#d5f5f3';c.font='bold 15px Georgia';c.textAlign='center';
    c.fillText(p.kind==='phases'?['○','◐','●'][s.values[i]]:['I','II','III'][i],x,y-56);
  }
 }
 c.restore();
}
export function drawPuzzleHint(c:CanvasRenderingContext2D,P:Player,S:SaveStats,isTouch:boolean) {
 const p=PUZZLES.find(p=>Math.abs(P.x-p.x)<230&&Math.abs(P.y-p.y)<100);if(!p)return;
 const s=S.puzzles?.[p.id]||newPuzzle(p);
 c.save();c.textAlign='center';c.fillStyle='#061219ed';c.fillRect(W/2-345,111,690,87);c.strokeStyle='#68aeb77a';c.strokeRect(W/2-345,111,690,87);
 c.font='18px Georgia';c.fillStyle='#eedba5';c.fillText(p.title,W/2,134);
 c.font='14px Georgia';c.fillStyle='#d5e9e7';c.fillText(s.solved?'Relíquias recolhidas. Equipe no braseiro ou no menu de pausa.':puzzleClue(p,S.ng),W/2,158);
 c.fillStyle='#79dace';c.fillText(s.solved?'O selo voltará a despertar no próximo NG+.':`${isTouch?'Usar':'E'} junto de cada pedestal${p.kind==='sequence'?` · Ecos ${s.step}/3`:''}`,W/2,181);
 c.restore();
}
export function drawDepthFront(c:CanvasRenderingContext2D,cam:number,P:Player,zone:number) {
 c.save();
 // Occluders occupy the margins and fade near the player, preserving combat clarity.
 const offset=cam*1.12;
 for(let i=Math.floor(offset/820);i<=Math.ceil((offset+W)/820);i++) {
  const x=i*820-offset;const playerX=P.x-cam;c.globalAlpha=Math.abs(x-playerX)<110?.12:.62;
  poly(c,[[x-38,H],[x-32,H-215],[x-16,H-232],[x+7,H-220],[x+18,H]],'#060d12');
  poly(c,[[x-32,H-215],[x-16,H-232],[x+7,H-220],[x-8,H-205]],'#29353b');
  c.strokeStyle=colors[zone]+'45';c.lineWidth=2;c.beginPath();c.moveTo(x-19,H-194);c.lineTo(x-12,H-90);c.stroke();
 }
 c.globalAlpha=1;
 const g=c.createLinearGradient(0,H-40,0,H);g.addColorStop(0,'#03091000');g.addColorStop(1,'#030910aa');c.fillStyle=g;c.fillRect(0,H-40,W,40);
 c.restore();
}
