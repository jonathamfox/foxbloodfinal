import { W, ZONE } from './constants';
import { PLAT, groundAt } from './world';
import type { Player, SaveStats } from './types';
export interface Route {id:string;kind:'ladder'|'passage';x:number;y:number;to:{x:number;y:number};label:string;requires:number;}
export const ROUTES:Route[]=[];
function pair(id:string,a:{x:number;y:number},b:{x:number;y:number},aLabel:string,bLabel:string,requires=-1,kind:Route['kind']='passage') {
  ROUTES.push({id:id+'_a',...a,to:b,label:aLabel,requires,kind},{id:id+'_b',...b,to:a,label:bLabel,requires,kind});
}
for(const [i,p] of PLAT.entries()) {
  const x=p.x+30;
  pair('ladder_'+i,{x,y:groundAt(x)??440},{x,y:p.y},'Subir escada','Descer escada',-1,'ladder');
}
const floor=(x:number)=>({x,y:groundAt(x)??440});
pair('ruas_esgoto',floor(1220),floor(2250),'Descer aos esgotos','Voltar às ruas');
pair('esgoto_cripta',floor(2390),floor(3970),'Galeria para os subsolos','Voltar aos esgotos');
pair('cripta_ruas',floor(4160),floor(5650),'Escadaria para a praça','Descer aos subsolos');
pair('catedral',floor(5850),floor(ZONE+1800),'Aqueduto da Catedral','Voltar a Velmora',0);
pair('retorno',floor(ZONE+5750),floor(820),'Elevador para Velmora','Elevador para a Catedral',0);
pair('ossuario',floor(ZONE+5900),floor(7*ZONE+5700),'Galeria do Ossuário','Retornar à Catedral',6);
pair('castelo',floor(6*ZONE+5800),floor(7*ZONE+2100),'Criptas sob o castelo','Escadaria do castelo',6);
export const routeAvailable=(r:Route,dead:boolean[])=>r.requires<0||Array.from({length:r.requires+1},(_,i)=>dead[i]).every(Boolean);
export const nearbyRoute=(p:{x:number;y:number})=>ROUTES.find(r=>Math.abs(r.x-p.x)<24&&Math.abs(r.y-p.y)<10);

export function drawRoutes(c:CanvasRenderingContext2D,cam:number,P:Player,S:SaveStats,time:number) {
  c.save();
  for(const r of ROUTES) {
    if(r.x<cam-90||r.x>cam+W+90)continue;
    const x=r.x;
    if(r.kind==='ladder') {
      if(r.y<r.to.y)continue;
      c.strokeStyle='#a28e69';c.lineWidth=4;c.beginPath();c.moveTo(x-13,r.y);c.lineTo(x-13,r.to.y-18);c.moveTo(x+13,r.y);c.lineTo(x+13,r.to.y-18);c.stroke();
      c.strokeStyle='#d2bb8b';c.lineWidth=3;
      for(let y=r.to.y-10;y<r.y;y+=13){c.beginPath();c.moveTo(x-13,y);c.lineTo(x+13,y);c.stroke();}
    } else {
      const available=routeAvailable(r,S.dead);
      c.fillStyle='#070e12';c.strokeStyle=available?'#88c8b9':'#9b7155';c.lineWidth=3;
      c.beginPath();c.moveTo(x-28,r.y);c.lineTo(x-28,r.y-58);c.arc(x,r.y-58,28,Math.PI,0);c.lineTo(x+28,r.y);c.closePath();c.fill();c.stroke();
      c.fillStyle=available?'#88c8b9':'#9b7155';c.font='12px Georgia';c.textAlign='center';c.fillText(available?'↕':'×',x,r.y-40);
      c.font='10px Georgia';c.fillText(r.label,x,r.y-96,160);
    }
  }
  c.restore();
}
export function drawRouteHint(c:CanvasRenderingContext2D,P:Player,S:SaveStats,touch:boolean) {
  const r=nearbyRoute(P);if(!r)return;
  c.save();c.fillStyle='rgba(5,12,16,.92)';c.fillRect(W/2-240,80,480,48);
  c.fillStyle='#b8e1d6';c.font='16px Georgia';c.textAlign='center';
  c.fillText(routeAvailable(r,S.dead)?`${touch?'Usar':'E / ↑ / ↓'} · ${r.label}`:'Passagem selada pelos guardiões anteriores',W/2,109,460);c.restore();
}
// World-space interiors sit behind combat silhouettes. Platforms remain readable.
export function drawUnderground(c:CanvasRenderingContext2D,cam:number,time:number) {
  const rooms=[{a:1720,b:2500,y:440,name:'ESGOTOS DE VELMORA',wet:true},{a:3470,b:4250,y:380,name:'SUBSOLOS DA VIGÍLIA',wet:false},{a:ZONE+1450,b:ZONE+5950,y:440,name:'AQUEDUTO DA CATEDRAL',wet:true},{a:7*ZONE+1450,b:7*ZONE+5950,y:440,name:'CRIPTA DO OSSUÁRIO',wet:false}];
  c.save();
  for(const r of rooms){if(r.b<cam||r.a>cam+W)continue;
    c.fillStyle=r.wet?'#102326':'#211c22';c.fillRect(r.a,0,r.b-r.a,r.y);
    c.strokeStyle=r.wet?'#253d3d':'#403440';c.lineWidth=1;
    const first=Math.floor(Math.max(r.a,cam)/80)*80;
    for(let y=85;y<r.y;y+=38){c.beginPath();c.moveTo(Math.max(r.a,cam),y);c.lineTo(Math.min(r.b,cam+W),y);c.stroke();for(let x=first+(y%76?40:0);x<Math.min(r.b,cam+W);x+=80){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+38);c.stroke();}}
    for(let x=r.a+80;x<r.b;x+=260){if(x<cam-140||x>cam+W+140)continue;c.strokeStyle='#394847';c.lineWidth=14;c.beginPath();c.moveTo(x-90,r.y);c.lineTo(x-90,220);c.arc(x,220,90,Math.PI,0);c.lineTo(x+90,r.y);c.stroke();c.fillStyle='#bc9b55';c.fillRect(x-76,245,5,17);}
    if(r.wet){c.fillStyle='#37686a65';c.fillRect(r.a,r.y-7,r.b-r.a,7);c.strokeStyle='#78c1bd80';for(let x=first;x<Math.min(r.b,cam+W);x+=64){c.beginPath();c.moveTo(x,r.y-3);c.lineTo(x+24+Math.sin(time)*8,r.y-3);c.stroke();}}
    c.fillStyle='#95b7ac';c.textAlign='center';c.font='15px Georgia';c.fillText(r.name,(r.a+r.b)/2,160,360);
  }c.restore();
}
