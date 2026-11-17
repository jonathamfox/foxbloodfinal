import type { ArmorDef, ArmorId, EnemyId, WeaponDef, WeaponId } from './types';

// Data-only module: also used by save migration and deterministic gameplay tests.
export const RELIC_SETS = [
  ['madre', 'Foice das Mil Bocas', 'Manto da Madre', 'foice', 'melee', '#e8aa71', 'blood'],
  ['santo', 'Cetro do Sino Afogado', 'Vestes do Santo', 'cajado', 'magic', '#78ded0', 'robe'],
  ['rei', 'Montante da Coroa Partida', 'Armadura do Rei Velado', 'montante', 'melee', '#edc96d', 'plate'],
  ['rom', 'Arco do Lago Vazio', 'Manto da Lua Submersa', 'arco', 'bow', '#9bd9ff', 'ranger'],
  ['amigdala', 'Incensário do Pesadelo', 'Carapaça Astral', 'incensario', 'pyro', '#c898ff', 'eclipse'],
  ['bruxa', 'Cajado dos Enforcados', 'Mortalha do Bosque', 'cajado', 'magic', '#9cd78c', 'robe'],
  ['martir', 'Lâmina do Mártir', 'Cota da Nobreza Gelada', 'espada', 'melee', '#d5edff', 'plate'],
  ['renascido', 'Machado do Ossuário', 'Couraça do Renascido', 'machado', 'melee', '#c5c2a8', 'blood'],
  ['ebrietas', 'Olho da Filha Estelar', 'Vestes do Coro Dourado', 'cajado', 'magic', '#ffe9a2', 'robe'],
  ['ama', 'Foice da Lua Vermelha', 'Manto das Seis Lâminas', 'foice', 'melee', '#ff758b', 'eclipse'],
  ['cacador', 'Besta do Caçador Caído', 'Sobretudo da Última Caçada', 'besta', 'bow', '#e5a06a', 'coat'],
  ['fera', 'Garra da Fera Devota', 'Armadura da Prece', 'espada', 'melee', '#d69665', 'blood'],
  ['sinos', 'Arco da Ressonância', 'Manto dos Três Sinos', 'arco', 'bow', '#70e5dd', 'ranger'],
  ['luas', 'Cajado das Marés', 'Vestes das Três Luas', 'cajado', 'magic', '#97b9ff', 'robe'],
  ['chamas', 'Chama da Aurora', 'Placas da Forja Antiga', 'chama', 'pyro', '#ffc478', 'pyro'],
] as const;
export type RelicSource = typeof RELIC_SETS[number][0];
export const bossHasRelic = (id: EnemyId): id is EnemyId & RelicSource => RELIC_SETS.slice(0,12).some(r=>r[0]===id);
export const relicIds = (source: RelicSource, ng: number) => ({weapon: `relic_w_${source}_${ng}` as WeaponId, armor: `relic_a_${source}_${ng}` as ArmorId});
const tint = (hex: string, scale: number) => '#' + [1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*scale).toString(16).padStart(2,'0')).join('');
export function makeRelics(ng: number): {weapons: WeaponDef[]; armors: ArmorDef[]} {
  const weapons: WeaponDef[] = [], armors: ArmorDef[] = [];
  for(const [source, name, armorName, type, category, col, style] of RELIC_SETS) {
    const ids = relicIds(source,ng);
    const form = ng % 3;
    const color = form===1 ? '#ffc477' : form===2 ? '#bfa6ff' : col;
    const suffix = ng ? ` · ${['Ancestral','Ígneo','Lunar'][form]} +${ng}` : ' · Relíquia';
    const status = source==='bruxa' ? 'poison' : category==='pyro' || form===1 ? 'burn' : 'bleed';
    const damage = Math.round((type==='montante'||type==='machado'?39:category==='magic'?30:31)*(1+ng*0.14));
    weapons.push({id:ids.weapon,label:name+suffix,type,category,
      buildAffinity:category==='bow'?'arqueiro':category==='magic'?'mago':category==='pyro'?'piromante':'guerreiro',
      reach:type==='foice'||type==='montante'?62:category==='magic'?48:43,
      dmg:damage, spd:type==='montante'||type==='machado'?1.24:form===2?0.92:1.04,
      projSpd:category==='bow'?650:460,projCol:color,statusApply:status,pierce:category==='bow'&&form===2,
      relicTint:color,
      desc:`Tesouro de ${source}. ${damage} de dano base. ${status==='burn'?'Inflige queimadura':status==='poison'?'Inflige veneno':'Inflige sangramento'}. ${form===2?'Forma lunar: golpes mais rápidos.':form===1?'Forma ígnea: runas de fogo.':'Forma ancestral: metal gravado e gema viva.'}`});
    const defense=Math.min(.30,.12+ng*.012+(style==='plate'?.04:0));
    armors.push({id:ids.armor,label:armorName+suffix,
      desc:`Conjunto de ${source}. Defesa ${Math.round(defense*100)}%, +${20+ng*5} vida. ${form===2?'Manto lunar com mobilidade extra.':form===1?'Filigranas de brasa.':'Ombreiras e gema do guardião.'}`,
      def:defense,hpBonus:20+ng*5,spdMult:form===2?1.04:style==='plate'?.96:1,
      meleeMult:category==='melee'?1.08:1,bowMult:category==='bow'?1.08:1,magicMult:category==='magic'?1.08:1,pyroMult:category==='pyro'?1.08:1,
      staminaRegen:1.06,coat:tint(color,.26),coatL:tint(color,.48),coatD:tint(color,.13),scarf:tint(color,.5),trim:color,style,relicTint:color});
  }
  return {weapons,armors};
}

export interface PuzzleDef { id:RelicSource; zone:number; x:number; y:number; title:string; kind:'sequence'|'phases'|'lights'; }
export interface PuzzleProgress { values:number[]; step:number; solved:boolean; }
export const PUZZLES: PuzzleDef[] = [
  {id:'sinos',zone:0,x:600,y:440,title:'Cripta dos Três Sinos',kind:'sequence'},
  {id:'luas',zone:3,x:3*7160+2250,y:440,title:'Observatório das Marés',kind:'phases'},
  {id:'chamas',zone:6,x:6*7160+3920,y:380,title:'Forja da Aurora',kind:'lights'},
];
export const puzzleTarget = (p:PuzzleDef,ng:number) => p.kind==='sequence' ? [2,0,1].map(n=>(n+ng)%3) : p.kind==='phases' ? [0,1,2].map(n=>(n+ng)%3) : [1,1,1];
export const newPuzzle = (p:PuzzleDef):PuzzleProgress=>({values:p.kind==='lights'?[0,1,0]:[0,0,0],step:0,solved:false});
export function advancePuzzle(p:PuzzleDef, state:PuzzleProgress, index:number, ng:number):PuzzleProgress {
  const s={...state,values:[...state.values]}; if(s.solved||index<0||index>2)return s;
  const target=puzzleTarget(p,ng);
  if(p.kind==='sequence') {s.step=index===target[s.step]?s.step+1:index===target[0]?1:0;s.solved=s.step===3;}
  else {if(p.kind==='phases')s.values[index]=(s.values[index]+1)%3;
    else for(let i=Math.max(0,index-1);i<=Math.min(2,index+1);i++)s.values[i]=1-s.values[i];
    s.solved=s.values.every((v,i)=>v===target[i]);}
  return s;
}
export function puzzleClue(p:PuzzleDef,ng:number):string {
  const target=puzzleTarget(p,ng);
  return p.kind==='sequence'?`Toque os sinos: ${target.map(i=>['I','II','III'][i]).join(' → ')}. Um erro reinicia a sequência.`:
    p.kind==='phases'?`Alinhe os discos: ${target.map(i=>['Nova','Meia','Cheia'][i]).join(' · ')}. Cada uso gira uma fase.`:
    'Acenda as três chamas. Cada alavanca inverte a sua chama e as vizinhas.';
}
export interface Breakable {id:string;x:number;y:number;kind:'urn'|'crate'|'pillar'|'wall';}
