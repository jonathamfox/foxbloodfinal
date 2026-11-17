export type GameMode = 'title' | 'play' | 'rest' | 'pause' | 'bestiary' | 'lore' | 'npc' | 'ending';

export type BuildId = 'guerreiro' | 'arqueiro' | 'mago' | 'piromante';
export type WeaponCategory = 'melee' | 'bow' | 'magic' | 'pyro';

export type WeaponId =
  | 'espada_vigilia'
  | 'machado_velmora'
  | 'foice_lunar'
  | 'montante_carrasco'
  | 'katana_cainhurst'
  | 'lamina_trovao'
  | 'arco_vigilia'
  | 'besta_prata'
  | 'arco_carmesim'
  | 'arco_estelar'
  | 'cajado_cinzas'
  | 'cetro_esporos'
  | 'cajado_eclipse'
  | 'olho_coro'
  | 'luva_brasa'
  | 'incensario_abissal'
  | 'tocha_profana';

export type ArmorId =
  | 'sobretudo_velmora'
  | 'cota_guardiao'
  | 'manto_patrulheiro'
  | 'veste_lunar'
  | 'manto_brasas'
  | 'placa_bastilha'
  | 'cota_sangue'
  | 'mortalha_eclipse'
  | 'traje_cainhurst'
  | 'veste_coro';

export type ShieldId = 1 | 2 | 3;

export type RuneId =
  | 'runa_garra'
  | 'runa_lua'
  | 'runa_fortuna'
  | 'runa_cacador'
  | 'runa_brasa'
  | 'runa_ferro'
  | 'runa_sangue'
  | 'runa_abismo'
  | 'runa_alvor'
  | 'runa_pesadelo';

export type EndingId = 'alvor' | 'vigilia' | 'eclipse';

export interface RuneDef {
  id: RuneId;
  label: string;
  subtitle: string;
  category: 'Dano' | 'Energia' | 'Sorte' | 'Sobrevivência';
  desc: string;
  hint: string;
  col: string;
  dmgMult?: number;
  meleeMult?: number;
  bowMult?: number;
  magicMult?: number;
  pyroMult?: number;
  energyRegenBonus?: number;
  staminaRegenBonus?: number;
  luckBonus?: number;
  hpMult?: number;
  defBonus?: number;
  killHeal?: number;
  spdMult?: number;
  iframeBonus?: number;
}

export interface PlayerLook {
  name: string;
  build: BuildId;
  weapon: WeaponId;
  armor: ArmorId;
  shield: ShieldId;
}

export interface BuildDef {
  id: BuildId;
  name: string;
  subtitle: string;
  desc: string;
  specialName: string;
  specialDesc: string;
  starterWeapon: WeaponId;
  starterArmor: ArmorId;
  starterShield: ShieldId;
  hpBonus: number;
  stBonus: number;
  spdMult: number;
  meleeMult: number;
  bowMult: number;
  magicMult: number;
  pyroMult?: number;
  energyGainMult: number;
  accent: string;
}

export interface SpellDef {
  id: string;
  name: string;
  desc: string;
  col: string;
}

export interface WeaponDef {
  id?: WeaponId;
  type:
    | 'espada'
    | 'machado'
    | 'foice'
    | 'montante'
    | 'arco'
    | 'besta'
    | 'cajado'
    | 'chama'
    | 'incensario'
    | 'cutelo'
    | 'agulha'
    | 'alabarda'
    | 'garra'
    | 'sino'
    | 'mosquete';
  category?: WeaponCategory;
  buildAffinity?: BuildId;
  label?: string;
  reach: number;
  dmg?: number;
  spd?: number;
  projSpd?: number;
  projCol?: string;
  statusApply?: 'bleed' | 'poison' | 'burn';
  pierce?: boolean;
  desc?: string;
  rust?: number;
  hot?: number;
}

export interface ArmorDef {
  id: ArmorId;
  label: string;
  desc: string;
  buildAffinity?: BuildId;
  def: number;
  hpBonus: number;
  spdMult: number;
  meleeMult: number;
  bowMult: number;
  magicMult: number;
  pyroMult?: number;
  staminaRegen: number;
  coat: string;
  coatL: string;
  coatD: string;
  scarf: string;
  trim: string;
  style: 'coat' | 'plate' | 'ranger' | 'robe' | 'pyro' | 'blood' | 'eclipse';
}

export interface ShieldDef {
  id: ShieldId;
  label: string;
  desc: string;
  stability: number;
}

export interface AppearanceDef {
  skin: string;
  hair: string;
  coat: string;
  trim: string;
  cape: string;
  eyes: string;
  hairStyle: number;
  hat: number;
  face: number;
  capeStyle: number;
  build: number;
  candles?: number;
  bell?: number;
  robe?: number;
  shrooms?: number;
  beak?: number;
}

export type EnemyId =
  | 'peregrino'
  | 'cao'
  | 'costureira'
  | 'atirador'
  | 'alquimista'
  | 'lobisomem'
  | 'emissario'
  | 'sombra'
  | 'besta_eletrica'
  | 'monge_gaiola'
  | 'carrasco'
  | 'viuva'
  | 'cavaleiro'
  | 'gargula'
  | 'sentinela'
  | 'cacador'
  | 'fera'
  | 'madre'
  | 'santo'
  | 'rei'
  | 'rom'
  | 'amigdala'
  | 'bruxa'
  | 'martir'
  | 'renascido'
  | 'ebrietas'
  | 'ama';

export type ArenaBossId =
  | 'madre'
  | 'santo'
  | 'rei'
  | 'rom'
  | 'amigdala'
  | 'bruxa'
  | 'martir'
  | 'renascido'
  | 'ebrietas'
  | 'ama';

export interface EnemyTypeDef {
  hw: number;
  h: number;
  hp: number;
  spd?: number;
  aggro?: number;
  range?: number;
  wind?: number;
  act?: number;
  rec?: number;
  dmg?: number;
  souls: number;
  scale?: number;
  poise?: number;
  weapon?: WeaponDef;
  name?: string;
  sub?: string;
  title?: string;
  tier?: 'Comum' | 'Elite' | 'Chefe';
  lore?: string;
}

export type QuestStatus = 'unstarted' | 'active' | 'ready' | 'completed_light' | 'completed_dark' | 'completed_neutral';

export interface NpcChoice {
  id: string;
  label: string;
  sublabel: string;
  karmaDelta: number;
  rewardCinzas?: number;
  rewardWeapon?: WeaponId;
  rewardArmor?: ArmorId;
  rewardRune?: RuneId;
  rewardLore?: string;
  outcomeText: string;
  nextStatus: QuestStatus;
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  zone: number;
  x: number;
  y: number;
  coat: string;
  trim: string;
  accent: string;
  hat: 'crow' | 'hood' | 'crown' | 'cage';
  targetBossIdx?: number;
  targetFieldBoss?: string;
  introText: string;
  activeText: string;
  readyText: string;
  completedLightText: string;
  completedDarkText: string;
  questTitle: string;
  questObjective: string;
  choices: NpcChoice[];
}

export interface NpcDialogSnapshot {
  npc: NpcDef;
  status: QuestStatus;
  karma: number;
  objectiveMet: boolean;
  lastOutcome?: string;
}

export interface EndingSnapshot {
  ending: EndingId;
  karma: number;
  level: number;
  ng: number;
  cinzas: number;
  bossesDefeated: number;
  questsCompleted: number;
  unlockedLoreCount: number;
  build: BuildId;
}

export interface SaveStats {
  level: number;
  vig: number;
  end: number;
  str: number;
  arc: number;
  flask: number;
  cinzas: number;
  cp: number;
  dead: boolean[];
  deadField: string[];
  ng: number;
  lit: boolean[];
  got: number[];
  build: BuildId;
  unlockedWeapons: WeaponId[];
  unlockedArmors: ArmorId[];
  unlockedShields: ShieldId[];
  unlockedRunes: RuneId[];
  equippedRunes: RuneId[];
  looted: string[];
  unlockedLore: string[];
  explored: boolean[];
  karma: number;
  quests: Record<string, QuestStatus>;
  endingSeen?: boolean;
}

export interface LoreEntry {
  id: string;
  category: 'Mundo' | 'Ordem' | 'Chefes';
  title: string;
  subtitle: string;
  body: string;
  unlockHint: string;
}

export interface LoreStone {
  id: string;
  loreId: string;
  x: number;
  y: number;
  zone: number;
  inscription: string;
}

export interface RollGhost {
  x: number;
  y: number;
  face: number;
  rot: number;
  a: number;
}

export interface LootChest {
  id: string;
  x: number;
  y: number;
  zone: number;
  kind: 'weapon' | 'armor' | 'shield' | 'rune';
  itemId: WeaponId | ArmorId | ShieldId | RuneId;
  opened: boolean;
}

export interface DropPool {
  x: number;
  y: number;
  n: number;
}

export interface SolidSeg {
  x: number;
  w: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ArenaDef {
  x0: number;
  x1: number;
  boss: ArenaBossId;
  zoneName: string;
}

export type StatusEffectId = 'poison' | 'stagger' | 'bleed' | 'slow' | 'burn';

export interface StatusEffect {
  id: StatusEffectId;
  label: string;
  remaining: number;
  duration: number;
  tick?: number;
}

export interface StatusBuildup {
  id: 'poison' | 'bleed';
  label: string;
  value: number;
}

export interface StatusHudSnapshot {
  effects: StatusEffect[];
  buildups: StatusBuildup[];
  energy: number;
  build: BuildId;
  evadeBuff: number;
  inIframe: boolean;
  karma: number;
  ng: number;
  spellLabel?: string;
  spellDesc?: string;
  spellCol?: string;
  spellKind?: 'magic' | 'pyro';
}

export interface MiniMapSnapshot {
  playerX: number;
  playerY: number;
  playerFace: number;
  zone: number;
  inArena: boolean;
  explored: boolean[];
  litBraziers: boolean[];
  bossesDead: boolean[];
  deadField: string[];
  openedChests: string[];
  readLore: string[];
  drop: DropPool | null;
  karma: number;
  quests: Record<string, QuestStatus>;
}

export interface Enemy {
  uid: number;
  type: EnemyId;
  x: number;
  y: number;
  k: number;
  zm: number;
  boss: boolean;
  fieldBoss?: boolean;
  fieldId?: string;
  vx: number;
  vy: number;
  hw: number;
  h: number;
  hp: number;
  maxHp: number;
  face: number;
  state: string;
  t: number;
  cd: number;
  anim: number;
  hitBy: number;
  flash: number;
  shown: number;
  dead: boolean;
  gone?: boolean;
  onGround: boolean;
  ph: number;
  n: number;
  dur: number;
  minX: number;
  maxX: number;
  bells: number;
  mask: number;
  ceil?: boolean;
  vuln?: boolean;
  hit?: boolean;
  rung?: boolean;
  alert?: number;
  heard?: number;
  tcd?: number;
  scd?: number;
  ecd?: number;
  raged?: boolean;
  summoned?: boolean;
  swept?: boolean;
  guarding?: boolean;
  dn?: number;
  sx?: number;
  baseY?: number;
  statuses: StatusEffect[];
  poiseDmg?: number;
  bleedBuild?: number;
  bleedCd?: number;
  pending?: boolean;
  spawnTime?: number;
  spawnTotal?: number;
  spawnMode?: 'sky' | 'ground';
  laserX?: number;
  laserW?: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hw: number;
  h: number;
  face: number;
  onGround: boolean;
  state: 'free' | 'atk' | 'roll' | 'hurt' | 'fog' | 'heal' | 'stagger';
  t: number;
  anim: number;
  hp: number;
  st: number;
  rally: number;
  rallyT: number;
  inv: number;
  stDelay: number;
  flasks: number;
  coyote: number;
  buf: string | null;
  bufT: number;
  atkId: number;
  dead: boolean;
  deadT: number;
  bannered?: boolean;
  heavy?: boolean;
  combo?: number;
  swung?: boolean;
  aw: number;
  aa: number;
  ar: number;
  rdir?: number;
  healed?: boolean;
  blocking?: boolean;
  blockT: number;
  slow?: number;
  statuses: StatusEffect[];
  poisonBuild: number;
  bleedBuild: number;
  energy: number;
  spin: number;
  spinTick: number;
  evadedHit?: boolean;
  evadeBuff: number;
  inIframe?: boolean;
  spellIdx: number;
}

export interface Shot {
  kind:
    | 'wave'
    | 'sound'
    | 'maw'
    | 'chain'
    | 'ember'
    | 'arrow'
    | 'bolt'
    | 'arcane'
    | 'arcane_lance'
    | 'void_comet'
    | 'poison_orb'
    | 'star'
    | 'fireball'
    | 'fire_wave'
    | 'black_flame'
    | 'bullet'
    | 'vial'
    | 'feather'
    | 'laser'
    | 'crystal'
    | 'axe_wave'
    | 'spider_orb'
    | 'lightning'
    | 'acid'
    | 'ice_skull'
    | 'blood_slash'
    | 'cosmic_beam';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hw: number;
  h: number;
  dmg: number;
  life: number;
  gy?: number;
  friendly?: boolean;
  pierce?: boolean;
  hitIds?: number[];
  status?: 'bleed' | 'poison' | 'burn';
  col?: string;
  grav?: number;
  homing?: boolean;
  explodeR?: number;
}

export interface Mark {
  x: number;
  t: number;
  kind?:
    | 'maw'
    | 'chain'
    | 'lunar'
    | 'judgment'
    | 'pyro_pillar'
    | 'black_pillar'
    | 'solar_glyph'
    | 'bind_ring'
    | 'acid_rain'
    | 'lightning_strike'
    | 'blood_pillar';
  dmg?: number;
  gy?: number;
  gone?: boolean;
  friendly?: boolean;
}

export interface Trap {
  x: number;
  y: number;
  w: number;
  life: number;
}

export interface Cloud {
  x: number;
  y: number;
  r: number;
  life: number;
  tick: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  angle: number;
}

export interface Meteor {
  x: number;
  gy: number;
  t: number;
  hit: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  grav: number;
  size: number;
  text?: string;
  kind?: 'square' | 'ring' | 'streak' | 'dust';
  endSize?: number;
  drag?: number;
}

export interface ZoneTransition {
  fromZone: number;
  toZone: number;
  title: string;
  subtitle: string;
  col: string;
  t: number;
  dur: number;
}

export interface RestSnapshot {
  cinzas: number;
  level: number;
  cost: number;
  vig: number;
  end: number;
  str: number;
  arc: number;
  flask: number;
  maxFlasks: number;
  allBossesDead: boolean;
  ng: number;
  karma: number;
  build: BuildId;
  weapon: WeaponId;
  armor: ArmorId;
  shield: ShieldId;
  unlockedWeapons: WeaponId[];
  unlockedArmors: ArmorId[];
  unlockedShields: ShieldId[];
  unlockedRunes: RuneId[];
  equippedRunes: RuneId[];
  unlockedLore: string[];
  quests: Record<string, QuestStatus>;
}
