import {
  audioInit,
  getMusicVolume,
  isMuted,
  playEndingTheme,
  roar,
  setBossMusic,
  setMusicVolume,
  setMusicZone,
  SFX,
  toggleMute,
} from './audio';
import {
  ARMORS,
  ARQUEIRO_IFRAME_BONUS,
  BUILDS,
  defaultLook,
  ET,
  EXPLORE_BINS,
  FLASKS,
  H,
  IFRAME_END,
  IFRAME_START,
  JUMP,
  MAGIC_SPELLS,
  MAX_RUNE_SLOTS,
  NZ,
  PYRO_SPELLS,
  RDUR,
  ROLL,
  RUNES,
  SHIELDS,
  SPEED,
  STARTER_RUNES,
  W,
  WEAPONS,
  WORLD,
  ZONE,
} from './constants';
import { LORE_ENTRIES, LORE_STONES } from './lore';
import { renderScene } from './renderer';
import type {
  ArmorId,
  BuildId,
  Cloud,
  Debris,
  DropPool,
  EndingId,
  EndingSnapshot,
  Enemy,
  EnemyId,
  GameMode,
  LootChest,
  Mark,
  Meteor,
  MiniMapSnapshot,
  NpcDef,
  NpcDialogSnapshot,
  Particle,
  Player,
  PlayerLook,
  QuestStatus,
  RestSnapshot,
  RollGhost,
  RuneId,
  SaveStats,
  ShieldId,
  Shot,
  StatusEffectId,
  StatusHudSnapshot,
  Trap,
  WeaponId,
  ZoneTransition,
} from './types';
import {
  ARENAS,
  BRAZ,
  FIELD_BOSS_SPAWNS,
  LOOT_SPAWNS,
  NPCS,
  SHARDS,
  SPAWNS,
  ZONE_NAMES,
  ZONE_SUBTITLES,
  clamp,
  groundAt,
  moveEntity,
  rnd,
  supported,
} from './world';

const STORAGE_KEY = 'fox-borne-2';

const ZONE_TRANSITION_COLORS = [
  '#d9772f',
  '#7ae8d8',
  '#d13838',
  '#9ed7f0',
  '#c98cf2',
  '#8fc474',
  '#dbe8ff',
  '#7eb6ff',
  '#ffe178',
  '#ff4a54',
];

const newStats = (build: BuildId = 'guerreiro'): SaveStats => {
  const b = BUILDS[build];
  return {
    level: 1,
    vig: 0,
    end: 0,
    str: 0,
    arc: 0,
    flask: 0,
    cinzas: 0,
    cp: 0,
    dead: Array(NZ).fill(false),
    deadField: [],
    ng: 0,
    lit: BRAZ.map((_, i) => i === 0),
    got: [],
    build,
    unlockedWeapons: [b.starterWeapon],
    unlockedArmors: Array.from(new Set<ArmorId>(['sobretudo_velmora', b.starterArmor])),
    unlockedShields: [1],
    unlockedRunes: [...STARTER_RUNES],
    equippedRunes: [],
    looted: [],
    unlockedLore: ['prologo'],
    explored: Array(EXPLORE_BINS).fill(false),
    karma: 0,
    quests: {},
    endingSeen: false,
  };
};

export interface EngineCallbacks {
  onModeChange: (mode: GameMode) => void;
  onSaveStatus: (hasSave: boolean) => void;
  onRestUpdate: (snap: RestSnapshot) => void;
  onMuteChange: (muted: boolean) => void;
  onLookChange: (look: PlayerLook) => void;
  onStatusChange: (snap: StatusHudSnapshot) => void;
  onMiniMapChange: (snap: MiniMapSnapshot) => void;
  onNpcDialog: (snap: NpcDialogSnapshot | null) => void;
  onEnding: (snap: EndingSnapshot | null) => void;
}

export class FoxBorneEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private raf = 0;
  private last = 0;
  private rs = 1;

  private reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private isTouch = matchMedia('(pointer:coarse)').matches;
  private portraitMQ = matchMedia('(orientation: portrait)');

  public look: PlayerLook = defaultLook();
  private S: SaveStats = newStats();
  private chests: LootChest[] = [];
  private drop: DropPool | null = null;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private marks: Mark[] = [];
  private traps: Trap[] = [];
  private clouds: Cloud[] = [];
  private debris: Debris[] = [];
  private meteors: Meteor[] = [];
  private meteorClock = 6;
  private arenaHazardClock = 3.8;
  private parts: Particle[] = [];
  private rollGhosts: RollGhost[] = [];
  private rollGhostTimer = 0;
  private walls: { l: number; r: number; tl: number; tr: number; life: number } | null = null;
  private banner: { text: string; sub: string; t: number; dur: number; col: string } | null = null;
  private safe = { x: 160, y: 440 };

  private mode: GameMode = 'title';
  private time = 0;
  private cam = 0;
  private shake = 0;
  private hitstop = 0;
  private redFlash = 0;
  private impactFlash = 0;
  private arena = -1;
  private lastZone = 0;
  private statusEmitTimer = 0;
  private lastStatusSig = '';
  private lastMiniMapSig = '';
  private enemyUid = 0;
  private zoneTrans: ZoneTransition | null = null;
  private activeNpc: NpcDef | null = null;
  private lastNpcOutcome: string | undefined = undefined;
  private endingTimer: number | null = null;

  private keys: Record<string, boolean> = {};
  private pressed: Record<string, boolean> = {};

  private P: Player = {
    x: 190,
    y: 440,
    vx: 0,
    vy: 0,
    hw: 11,
    h: 58,
    face: 1,
    onGround: true,
    state: 'free',
    t: 0,
    anim: 0,
    hp: 100,
    st: 90,
    rally: 0,
    rallyT: 0,
    inv: 0,
    stDelay: 0,
    flasks: FLASKS,
    coyote: 0,
    buf: null,
    bufT: 0,
    atkId: 0,
    dead: false,
    deadT: 0,
    aw: 0.1,
    aa: 0.1,
    ar: 0.22,
    blockT: 0,
    statuses: [],
    poisonBuild: 0,
    bleedBuild: 0,
    energy: 40,
    spin: 0,
    spinTick: 0,
    evadedHit: false,
    evadeBuff: 0,
    inIframe: false,
    spellIdx: 0,
  };

  private static KEY_MAP: Record<string, string> = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Space: 'jump',
    KeyW: 'jump',
    ArrowUp: 'jump',
    ShiftLeft: 'roll',
    ShiftRight: 'roll',
    KeyL: 'roll',
    KeyJ: 'atk',
    KeyK: 'heavy',
    KeyC: 'special',
    KeyF: 'spell',
    KeyQ: 'heal',
    KeyR: 'heal',
    KeyE: 'use',
    KeyI: 'block',
    KeyS: 'block',
    ArrowDown: 'block',
    Escape: 'pause',
    KeyP: 'pause',
  };

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.cv = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context unavailable');
    this.ctx = context;
    this.cb = callbacks;

    const hasSave = this.load();
    this.cb.onSaveStatus(hasSave);
    this.cb.onLookChange({ ...this.look });
    this.initChests();
    this.resetEnemies();
    this.placeAtCheckpoint();
    this.emitRest();
    this.fitCanvas();

    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
    addEventListener('blur', this.onBlur);
    addEventListener('resize', this.fitCanvas);

    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  public destroy() {
    if (this.endingTimer !== null) {
      clearTimeout(this.endingTimer);
      this.endingTimer = null;
    }
    cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
    removeEventListener('blur', this.onBlur);
    removeEventListener('resize', this.fitCanvas);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = FoxBorneEngine.KEY_MAP[e.code];
    if (!k) return;
    if (this.mode === 'play' || this.mode === 'pause') e.preventDefault();
    if (!this.keys[k]) this.pressed[k] = true;
    this.keys[k] = true;
    audioInit();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = FoxBorneEngine.KEY_MAP[e.code];
    if (k) this.keys[k] = false;
  };

  private onBlur = () => {
    for (const k in this.keys) this.keys[k] = false;
  };

  public setTouchKey(k: string, down: boolean) {
    audioInit();
    if (down && !this.keys[k]) this.pressed[k] = true;
    this.keys[k] = down;
  }

  public setTouchMove(left: boolean, right: boolean) {
    this.keys.left = left;
    this.keys.right = right;
  }

  public fitCanvas = () => {
    try {
      const r = this.cv.getBoundingClientRect();
      const k = clamp(((r.width || W) * (window.devicePixelRatio || 1)) / W, 1, 3);
      const w = Math.round(W * k);
      if (this.cv.width !== w) {
        this.cv.width = w;
        this.cv.height = Math.round(H * k);
      }
      this.rs = this.cv.width / W;
    } catch {
      // ignore
    }
  };

  private buildDef = () => BUILDS[this.look.build] || BUILDS.guerreiro;
  private armorDef = () => ARMORS[this.look.armor] || ARMORS.sobretudo_velmora;
  private weaponDef = () => WEAPONS[this.look.weapon] || WEAPONS.espada_vigilia;

  private getRuneTotals() {
    const t = {
      dmgMult: 0,
      meleeMult: 0,
      bowMult: 0,
      magicMult: 0,
      pyroMult: 0,
      energyRegenBonus: 0,
      staminaRegenBonus: 0,
      luckBonus: 0,
      hpMult: 0,
      defBonus: 0,
      killHeal: 0,
      spdMult: 0,
      iframeBonus: 0,
    };
    for (const id of this.S.equippedRunes || []) {
      const r = RUNES[id];
      if (!r) continue;
      if (r.dmgMult) t.dmgMult += r.dmgMult;
      if (r.meleeMult) t.meleeMult += r.meleeMult;
      if (r.bowMult) t.bowMult += r.bowMult;
      if (r.magicMult) t.magicMult += r.magicMult;
      if (r.pyroMult) t.pyroMult += r.pyroMult;
      if (r.energyRegenBonus) t.energyRegenBonus += r.energyRegenBonus;
      if (r.staminaRegenBonus) t.staminaRegenBonus += r.staminaRegenBonus;
      if (r.luckBonus) t.luckBonus += r.luckBonus;
      if (r.hpMult) t.hpMult += r.hpMult;
      if (r.defBonus) t.defBonus += r.defBonus;
      if (r.killHeal) t.killHeal += r.killHeal;
      if (r.spdMult) t.spdMult += r.spdMult;
      if (r.iframeBonus) t.iframeBonus += r.iframeBonus;
    }
    return t;
  }

  private maxHp = () =>
    Math.max(
      70,
      Math.round((100 + this.buildDef().hpBonus + this.armorDef().hpBonus + this.S.vig * 18) * (1 + this.getRuneTotals().hpMult))
    );
  private maxSt = () => 90 + this.buildDef().stBonus + this.S.end * 12;
  private maxFlasks = () => FLASKS + (this.S.flask || 0);
  private cost = () => Math.round(90 * Math.pow(1.16, this.S.level - 1));
  private hard = () => 1 + 0.55 * this.S.ng + 0.08 * this.S.ng * this.S.ng;
  private dmgHard = () => 1 + 0.35 * this.S.ng;
  private spdHard = () => 1 + Math.min(0.45, 0.08 * this.S.ng);
  private cdHard = () => Math.max(0.55, 1 - 0.08 * this.S.ng);

  private initChests() {
    this.chests = LOOT_SPAWNS.map((c) => ({
      ...c,
      opened: this.S.looted.includes(c.id),
    }));
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ look: this.look, S: this.S, drop: this.drop }));
      this.cb.onSaveStatus(true);
    } catch {
      // ignore
    }
  }

  private load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d && d.S && d.look) {
        const build: BuildId =
          d.S.build === 'arqueiro' ||
          d.S.build === 'mago' ||
          d.S.build === 'piromante' ||
          d.S.build === 'guerreiro'
            ? d.S.build
            : 'guerreiro';
        const base = newStats(build);
        const deadArr: boolean[] = Array.isArray(d.S.dead) ? [...d.S.dead] : [];
        while (deadArr.length < NZ) deadArr.push(false);
        const litArr: boolean[] = Array.isArray(d.S.lit) ? [...d.S.lit] : [true];
        while (litArr.length < BRAZ.length) litArr.push(false);
        this.S = {
          ...base,
          ...d.S,
          arc: d.S.arc ?? 0,
          dead: deadArr,
          deadField: Array.isArray(d.S.deadField) ? d.S.deadField : [],
          lit: litArr,
          build,
          unlockedWeapons: Array.isArray(d.S.unlockedWeapons) && d.S.unlockedWeapons.length
            ? d.S.unlockedWeapons
            : [BUILDS[build].starterWeapon],
          unlockedArmors: Array.isArray(d.S.unlockedArmors) && d.S.unlockedArmors.length
            ? d.S.unlockedArmors
            : ['sobretudo_velmora', BUILDS[build].starterArmor],
          unlockedShields: Array.isArray(d.S.unlockedShields) && d.S.unlockedShields.length
            ? d.S.unlockedShields
            : [1],
          unlockedRunes: Array.isArray(d.S.unlockedRunes) && d.S.unlockedRunes.length
            ? Array.from(new Set<RuneId>([...STARTER_RUNES, ...d.S.unlockedRunes.filter((r: string): r is RuneId => r in RUNES)]))
            : [...STARTER_RUNES],
          equippedRunes: Array.isArray(d.S.equippedRunes)
            ? d.S.equippedRunes.filter((r: string): r is RuneId => r in RUNES).slice(0, MAX_RUNE_SLOTS)
            : [],
          looted: Array.isArray(d.S.looted) ? d.S.looted : [],
          unlockedLore: Array.isArray(d.S.unlockedLore) && d.S.unlockedLore.length
            ? d.S.unlockedLore
            : ['prologo'],
          explored:
            Array.isArray(d.S.explored) && d.S.explored.length === EXPLORE_BINS
              ? d.S.explored.map(Boolean)
              : Array(EXPLORE_BINS).fill(false),
          karma: typeof d.S.karma === 'number' ? d.S.karma : 0,
          quests: d.S.quests && typeof d.S.quests === 'object' ? d.S.quests : {},
          endingSeen: !!d.S.endingSeen,
        };
        if (!this.S.unlockedLore.includes('prologo')) this.S.unlockedLore.unshift('prologo');
        // Migrate legacy numeric weapon IDs
        let migratedWeapon: WeaponId = BUILDS[build].starterWeapon;
        if (typeof d.look.weapon === 'number') {
          migratedWeapon = (['espada_vigilia', 'machado_velmora', 'foice_lunar'][d.look.weapon] as WeaponId) || 'espada_vigilia';
        } else if (typeof d.look.weapon === 'string' && d.look.weapon in WEAPONS) {
          migratedWeapon = d.look.weapon as WeaponId;
        }
        const migratedArmor: ArmorId =
          typeof d.look.armor === 'string' && d.look.armor in ARMORS
            ? (d.look.armor as ArmorId)
            : BUILDS[build].starterArmor;
        this.look = {
          name: d.look.name || 'Raposa',
          build,
          weapon: migratedWeapon,
          armor: migratedArmor,
          shield: d.look.shield === 2 || d.look.shield === 3 ? d.look.shield : 1,
        };
        if (!this.S.unlockedWeapons.includes(this.look.weapon)) this.S.unlockedWeapons.push(this.look.weapon);
        if (!this.S.unlockedArmors.includes(this.look.armor)) this.S.unlockedArmors.push(this.look.armor);
        this.drop = d.drop || null;
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  public setBuild(b: BuildId) {
    const def = BUILDS[b];
    this.look.build = b;
    this.look.weapon = def.starterWeapon;
    this.look.armor = def.starterArmor;
    this.look.shield = def.starterShield;
    this.S.build = b;
    this.P.spellIdx = 0;
    if (!this.S.unlockedWeapons.includes(def.starterWeapon)) this.S.unlockedWeapons.push(def.starterWeapon);
    if (!this.S.unlockedArmors.includes(def.starterArmor)) this.S.unlockedArmors.push(def.starterArmor);
    this.P.hp = Math.min(this.P.hp, this.maxHp());
    this.cb.onLookChange({ ...this.look });
    this.emitStatus(true);
    this.emitRest();
    SFX.equip();
  }

  public setWeapon(w: WeaponId) {
    if (!this.S.unlockedWeapons.includes(w)) return;
    this.look.weapon = w;
    this.cb.onLookChange({ ...this.look });
    this.save();
    SFX.equip();
    this.emitStatus(true);
    this.emitRest();
  }

  public setArmor(a: ArmorId) {
    if (!this.S.unlockedArmors.includes(a)) return;
    this.look.armor = a;
    this.P.hp = Math.min(this.maxHp(), Math.max(1, this.P.hp));
    this.cb.onLookChange({ ...this.look });
    this.save();
    SFX.equip();
    this.emitRest();
  }

  public setShield(s: ShieldId) {
    if (!this.S.unlockedShields.includes(s)) return;
    this.look.shield = s;
    this.cb.onLookChange({ ...this.look });
    this.save();
    SFX.equip();
    this.emitRest();
  }

  public toggleRune(r: RuneId) {
    if (!(r in RUNES) || !this.S.unlockedRunes.includes(r)) return;
    const eq = this.S.equippedRunes;
    const idx = eq.indexOf(r);
    if (idx >= 0) {
      eq.splice(idx, 1);
    } else {
      if (eq.length >= MAX_RUNE_SLOTS) return;
      eq.push(r);
    }
    this.P.hp = Math.min(this.maxHp(), Math.max(1, this.P.hp));
    if (this.mode === 'rest') this.P.hp = this.maxHp();
    this.save();
    SFX.equip();
    this.emitRest();
  }

  public startGame(fresh: boolean) {
    audioInit();
    if (this.endingTimer !== null) {
      clearTimeout(this.endingTimer);
      this.endingTimer = null;
    }
    this.zoneTrans = null;
    this.activeNpc = null;
    this.lastNpcOutcome = undefined;
    this.cb.onNpcDialog(null);
    this.cb.onEnding(null);
    if (fresh) {
      const chosenBuild = this.look.build;
      this.S = newStats(chosenBuild);
      this.look = defaultLook(chosenBuild);
      this.drop = null;
      this.cb.onLookChange({ ...this.look });
    }
    this.initChests();
    this.placeAtCheckpoint();
    this.resetEnemies();
    this.parts = [];
    this.save();
    this.emitRest();
    this.setMode('play');
    this.setBanner('Velmora', `${this.buildDef().name} · A raposa inicia a vigília`, 3);
  }

  public resumeGame() {
    this.setMode('play');
  }

  public openBestiary(from: 'title' | 'pause') {
    this.bestiaryReturn = from;
    this.setMode('bestiary');
  }

  private bestiaryReturn: 'title' | 'pause' = 'title';
  public closeBestiary() {
    this.setMode(this.bestiaryReturn);
  }

  private loreReturn: 'title' | 'pause' | 'rest' = 'title';
  public openLore(from: 'title' | 'pause' | 'rest') {
    this.loreReturn = from;
    this.setMode('lore');
  }

  public closeLore() {
    this.setMode(this.loreReturn);
  }

  public quitToTitle() {
    if (this.endingTimer !== null) {
      clearTimeout(this.endingTimer);
      this.endingTimer = null;
    }
    this.activeNpc = null;
    this.lastNpcOutcome = undefined;
    this.zoneTrans = null;
    this.cb.onNpcDialog(null);
    this.cb.onEnding(null);
    this.setMode('title');
  }

  public toggleAudio(): boolean {
    const m = toggleMute();
    this.cb.onMuteChange(m);
    return m;
  }

  public isAudioMuted(): boolean {
    return isMuted();
  }

  public setMusicVolume(v: number) {
    setMusicVolume(v);
  }

  public getMusicVolume(): number {
    return getMusicVolume();
  }

  public upgradeStat(stat: 'vig' | 'end' | 'str' | 'arc' | 'flask') {
    const c = this.cost();
    if (this.S.cinzas < c) return;
    if (stat === 'flask' && this.S.flask >= 5) return;
    this.S.cinzas -= c;
    this.S[stat]++;
    this.S.level++;
    this.P.hp = this.maxHp();
    this.P.st = this.maxSt();
    this.P.flasks = this.maxFlasks();
    this.save();
    SFX.heal();
    this.emitRest();
  }

  public startNewCycle() {
    if (this.endingTimer !== null) {
      clearTimeout(this.endingTimer);
      this.endingTimer = null;
    }
    this.activeNpc = null;
    this.lastNpcOutcome = undefined;
    this.zoneTrans = null;
    this.cb.onNpcDialog(null);
    this.cb.onEnding(null);
    this.S.ng++;
    this.S.dead = Array(NZ).fill(false);
    this.S.deadField = [];
    this.S.got = [];
    this.S.cp = 0;
    this.S.lit = BRAZ.map((_, i) => i === 0);
    this.S.explored = Array(EXPLORE_BINS).fill(false);
    this.S.karma = 0;
    this.S.quests = {};
    this.S.endingSeen = false;
    this.drop = null;
    this.initChests();
    this.placeAtCheckpoint();
    this.resetEnemies();
    this.save();
    this.emitRest();
    this.emitStatus(true);
    this.setMode('play');
    this.setBanner(`Nova Vigília · NG+${this.S.ng}`, 'As 10 regiões despertaram mais cruéis', 3.4, '#c23a3a');
  }

  private setMode(m: GameMode) {
    this.mode = m;
    this.cb.onModeChange(m);
    if (m === 'pause' || m === 'rest' || m === 'lore') this.emitRest();
  }

  private emitRest() {
    this.cb.onRestUpdate({
      cinzas: this.S.cinzas,
      level: this.S.level,
      cost: this.cost(),
      vig: this.S.vig,
      end: this.S.end,
      str: this.S.str,
      arc: this.S.arc || 0,
      flask: this.S.flask || 0,
      maxFlasks: this.maxFlasks(),
      allBossesDead: this.S.dead.every(Boolean),
      ng: this.S.ng,
      karma: this.S.karma,
      build: this.look.build,
      weapon: this.look.weapon,
      armor: this.look.armor,
      shield: this.look.shield,
      unlockedWeapons: [...this.S.unlockedWeapons],
      unlockedArmors: [...this.S.unlockedArmors],
      unlockedShields: [...this.S.unlockedShields],
      unlockedRunes: [...this.S.unlockedRunes],
      equippedRunes: [...this.S.equippedRunes],
      unlockedLore: [...this.S.unlockedLore],
      quests: { ...this.S.quests },
    });
  }

  private setBanner(text: string, sub: string, dur: number, col = '#d8d0bd') {
    this.banner = { text, sub, t: 0, dur, col };
  }

  private unlockLore(id: string, showToast = false) {
    if (this.S.unlockedLore.includes(id)) return false;
    this.S.unlockedLore.push(id);
    this.save();
    this.emitRest();
    if (showToast) {
      const entry = LORE_ENTRIES.find((l) => l.id === id);
      if (entry) {
        SFX.lore();
        this.floatText(this.P.x, this.P.y - 84, `Crônica: ${entry.title}`, '#9ed7f0');
      }
    }
    return true;
  }

  private resetEnemies() {
    const lastBraz = BRAZ[BRAZ.length - 1];
    this.enemies = SPAWNS.filter(([, x]) => !lastBraz || Math.abs(x - lastBraz.x) >= 620).map(([t, x, y, k], idx) => {
      const e = this.mkEnemy(t, x, y, k);
      const canAmbush =
        x > 1300 &&
        idx % 5 === 2 &&
        (t === 'cao' ||
          t === 'costureira' ||
          t === 'viuva' ||
          t === 'cavaleiro' ||
          t === 'lobisomem' ||
          t === 'sombra' ||
          t === 'besta_eletrica');
      if (canAmbush) {
        e.pending = true;
        e.spawnTime = 0;
        e.spawnMode = idx % 2 === 0 ? 'sky' : 'ground';
        e.spawnTotal = e.spawnMode === 'sky' ? 1.25 : 1.0;
      }
      return e;
    });
    FIELD_BOSS_SPAWNS.forEach((fb) => {
      if (!this.S.deadField.includes(fb.id)) {
        const gy = groundAt(fb.x) ?? 440;
        const e = this.mkEnemy(fb.type, fb.x, gy, fb.zone);
        e.fieldBoss = true;
        e.fieldId = fb.id;
        e.minX = fb.x - 420;
        e.maxX = fb.x + 420;
        this.enemies.push(e);
      }
    });
    ARENAS.forEach((a, k) => {
      if (!this.S.dead[k]) this.enemies.push(this.mkEnemy(a.boss, a.x0 + 650, 440, k));
    });
    this.shots = [];
    this.marks = [];
    this.traps = [];
    this.clouds = [];
    this.debris = [];
    this.meteors = [];
    this.rollGhosts = [];
    this.meteorClock = 6;
    this.walls = null;
  }

  private mkEnemy(type: EnemyId, x: number, y: number, k: number): Enemy {
    const d = ET[type];
    const boss = !!d.name;
    const zm = boss ? 1 : 1 + 0.25 * k;
    const hp = Math.round(d.hp * this.hard() * zm);
    const e: Enemy = {
      uid: ++this.enemyUid,
      type,
      x,
      y,
      k,
      zm,
      boss,
      vx: 0,
      vy: 0,
      hw: d.hw,
      h: d.h,
      hp,
      maxHp: hp,
      face: -1,
      state: 'idle',
      t: 0,
      cd: rnd(0.3),
      anim: rnd(10),
      hitBy: -1,
      flash: 0,
      shown: 0,
      dead: false,
      onGround: true,
      ph: 0,
      n: 0,
      dur: 0,
      minX: k * ZONE + 20,
      maxX: k * ZONE + 6178,
      bells: 4,
      mask: 0,
      statuses: [],
      poiseDmg: 0,
      bleedBuild: 0,
      bleedCd: 0,
    };
    if (type === 'santo') {
      e.ceil = true;
      e.y = 230;
    } else if (type === 'gargula') {
      e.baseY = y;
      e.y = y - 110;
      e.onGround = false;
    } else if (type === 'sentinela') {
      e.guarding = true;
    }
    return e;
  }

  private placeAtCheckpoint() {
    const b = BRAZ[this.S.cp];
    Object.assign(this.P, {
      x: b.x + 44,
      y: b.y,
      vx: 0,
      vy: 0,
      state: 'free',
      dead: false,
      deadT: 0,
      bannered: false,
      inv: 1,
      rally: 0,
      buf: null,
      face: 1,
      blockT: 0,
      evadedHit: false,
      evadeBuff: 0,
      inIframe: false,
    });
    this.P.hp = this.maxHp();
    this.P.st = this.maxSt();
    this.P.flasks = this.maxFlasks();
    this.P.energy = 40;
    this.P.spin = 0;
    this.P.spinTick = 0;
    this.arena = -1;
    this.walls = null;
    this.rollGhosts = [];
    this.P.slow = 0;
    this.P.statuses = [];
    this.P.poisonBuild = 0;
    this.P.bleedBuild = 0;
    this.revealAroundPlayer();
    this.emitStatus(true);
    this.emitMiniMap(true);
    this.safe = { x: this.P.x, y: this.P.y };
    this.lastZone = Math.floor(this.P.x / ZONE);
    this.cam = clamp(this.P.x - W * 0.42, 0, WORLD - W);
  }

  private revealAroundPlayer(): boolean {
    if (!Array.isArray(this.S.explored) || this.S.explored.length !== EXPLORE_BINS) {
      this.S.explored = Array(EXPLORE_BINS).fill(false);
    }
    const minBin = clamp(Math.floor(((this.P.x - 360) / WORLD) * EXPLORE_BINS), 0, EXPLORE_BINS - 1);
    const maxBin = clamp(Math.floor(((this.P.x + 380) / WORLD) * EXPLORE_BINS), 0, EXPLORE_BINS - 1);
    let newlyRevealed = false;
    for (let i = minBin; i <= maxBin; i++) {
      if (!this.S.explored[i]) {
        this.S.explored[i] = true;
        newlyRevealed = true;
      }
    }
    return newlyRevealed;
  }

  private emitMiniMap(force = false) {
    const z = clamp(Math.floor(this.P.x / ZONE), 0, NZ - 1);
    const qx = Math.round(this.P.x / 28);
    const qy = Math.round(this.P.y / 24);
    const exploredCount = this.S.explored.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    const questSig = Object.entries(this.S.quests).map(([k, v]) => `${k}:${v}`).join(',');
    const sig = `${qx}:${qy}:${this.P.face}:${z}:${this.arena >= 0 ? 1 : 0}:${exploredCount}:${this.S.lit.join('')}:${this.S.dead.join('')}:${this.S.deadField.length}:${this.S.looted.length}:${this.S.unlockedLore.length}:${this.drop ? Math.round(this.drop.x) : -1}:${this.S.karma}:${questSig}`;
    if (!force && sig === this.lastMiniMapSig) return;
    this.lastMiniMapSig = sig;
    this.cb.onMiniMapChange({
      playerX: this.P.x,
      playerY: this.P.y,
      playerFace: this.P.face,
      zone: z,
      inArena: this.arena >= 0,
      explored: [...this.S.explored],
      litBraziers: [...this.S.lit],
      bossesDead: [...this.S.dead],
      deadField: [...this.S.deadField],
      openedChests: [...this.S.looted],
      readLore: [...this.S.unlockedLore],
      drop: this.drop ? { ...this.drop } : null,
      karma: this.S.karma,
      quests: { ...this.S.quests },
    });
  }

  private addRubble(x: number, y: number, n = 16) {
    for (let i = 0; i < n; i++) {
      this.debris.push({
        x,
        y,
        vx: rnd(-190, 190),
        vy: rnd(-310, -90),
        life: rnd(0.55, 1.05),
        size: rnd(3, 8),
        angle: rnd(Math.PI * 2),
      });
    }
  }

  private spark(x: number, y: number, n: number, col: string, spd: number, life: number, grav = 600, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = rnd(Math.PI * 2);
      const s = rnd(spd * 0.3, spd);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - spd * 0.3,
        life: rnd(life * 0.5, life),
        max: life,
        col,
        grav,
        size,
      });
    }
  }

  private impactRing(x: number, y: number, col: string, startR: number, endR: number, life = 0.24) {
    this.parts.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life,
      max: life,
      col,
      grav: 0,
      size: startR,
      endSize: endR,
      kind: 'ring',
    });
  }

  private sparkStreaks(
    x: number,
    y: number,
    dir: number,
    n: number,
    col: string,
    spd: number,
    life: number,
    size = 2.4
  ) {
    for (let i = 0; i < n; i++) {
      const a = dir === 0 ? rnd(Math.PI * 2) : (dir > 0 ? 0 : Math.PI) + rnd(-1.15, 1.15);
      const s = rnd(spd * 0.45, spd);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rnd(15, 70),
        life: rnd(life * 0.55, life),
        max: life,
        col,
        grav: 420,
        size,
        kind: 'streak',
        drag: 0.9,
      });
    }
  }

  private dustPuff(x: number, y: number, dir: number, n = 6) {
    for (let i = 0; i < n; i++) {
      const sz = rnd(4, 7.5);
      this.parts.push({
        x: x + rnd(-10, 10),
        y: y + rnd(-4, 2),
        vx: dir * rnd(24, 95) + rnd(-22, 22),
        vy: rnd(-38, -10),
        life: rnd(0.28, 0.52),
        max: 0.52,
        col: '#7d8380',
        grav: -18,
        size: sz,
        endSize: sz * rnd(2.1, 2.8),
        kind: 'dust',
        drag: 0.92,
      });
    }
  }

  private blood(x: number, y: number, dir: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const isStreak = i % 3 !== 0;
      this.parts.push({
        x,
        y,
        vx: dir * rnd(75, 290) + rnd(-50, 50),
        vy: rnd(-240, 30),
        life: rnd(0.25, 0.58),
        max: 0.58,
        col: i % 4 === 0 ? '#b32424' : '#8c1a1a',
        grav: 900,
        size: rnd(2, 3.6),
        kind: isStreak ? 'streak' : 'square',
        drag: isStreak ? 0.94 : undefined,
      });
    }
  }

  private floatText(x: number, y: number, text: string, col: string) {
    this.parts.push({ x, y, vx: 0, vy: -34, life: 1.2, max: 1.2, col, grav: 0, size: 2, text });
  }

  private computeWeaponDmg(heavy: boolean, combo = 1): number {
    const wp = this.weaponDef();
    const bd = this.buildDef();
    const ad = this.armorDef();
    const rt = this.getRuneTotals();
    const baseDmg = wp.dmg || 24;
    const cat = wp.category || 'melee';
    let statMult = 1;
    let buildMult = 1;
    let armorMult = 1;
    let runeMult = 1 + rt.dmgMult;
    if (cat === 'bow') {
      statMult = 1 + 0.065 * this.S.str + 0.045 * this.S.end;
      buildMult = bd.bowMult;
      armorMult = ad.bowMult;
      runeMult += rt.bowMult;
    } else if (cat === 'magic') {
      statMult = 1 + 0.11 * (this.S.arc || 0) + 0.025 * this.S.str;
      buildMult = bd.magicMult;
      armorMult = ad.magicMult;
      runeMult += rt.magicMult;
    } else if (cat === 'pyro') {
      statMult = 1 + 0.11 * (this.S.arc || 0) + 0.03 * this.S.str;
      buildMult = bd.pyroMult ?? bd.magicMult;
      armorMult = ad.pyroMult ?? ad.magicMult;
      runeMult += rt.pyroMult;
    } else {
      statMult = 1 + 0.095 * this.S.str;
      buildMult = bd.meleeMult;
      armorMult = ad.meleeMult;
      runeMult += rt.meleeMult;
    }
    const comboMult = heavy ? (cat === 'melee' ? 2.1 : 1.55) : combo === 3 ? 1.3 : 1;
    const counterMult = this.P.evadeBuff > 0 ? 1.35 : 1;
    return Math.round(baseDmg * statMult * buildMult * armorMult * runeMult * comboMult * counterMult);
  }

  private isRollIframe(): boolean {
    const end =
      IFRAME_END +
      (this.look.build === 'arqueiro' ? ARQUEIRO_IFRAME_BONUS : 0) +
      this.getRuneTotals().iframeBonus;
    return this.P.state === 'roll' && this.P.t >= IFRAME_START && this.P.t <= end;
  }

  public cycleSpell() {
    const cat = this.weaponDef().category;
    if (cat !== 'magic' && cat !== 'pyro') return;
    this.P.spellIdx = ((this.P.spellIdx || 0) + 1) % 3;
    const list = cat === 'pyro' ? PYRO_SPELLS : MAGIC_SPELLS;
    const sp = list[this.P.spellIdx];
    SFX.equip();
    this.spark(this.P.x, this.P.y - 44, 10, sp.col, 130, 0.4, -20, 2.2);
    this.floatText(this.P.x, this.P.y - 82, sp.name, sp.col);
    this.emitStatus(true);
  }

  private startAttack(heavy: boolean, combo: number) {
    const wp = this.weaponDef();
    const s = wp.spd || 1;
    const cat = wp.category || 'melee';
    Object.assign(this.P, { state: 'atk', t: 0, heavy, combo, swung: false, buf: null });
    this.P.atkId++;
    if (cat === 'bow' || cat === 'magic' || cat === 'pyro') {
      this.P.aw = (heavy ? 0.25 : 0.1) * s;
      this.P.aa = 0.1;
      this.P.ar = (heavy ? 0.27 : 0.18) * s;
      this.P.st = Math.max(0, this.P.st - (heavy ? 24 : 11));
    } else {
      this.P.aw = (heavy ? 0.34 : combo === 3 ? 0.15 : 0.1) * s;
      this.P.aa = heavy ? 0.13 : 0.1;
      this.P.ar = (heavy ? 0.36 : 0.22) * s;
      this.P.st = Math.max(0, this.P.st - (heavy ? 34 : 16));
    }
    this.P.stDelay = 0.72;
  }

  private startRoll(mv: number) {
    Object.assign(this.P, { state: 'roll', t: 0, buf: null, evadedHit: false });
    this.rollGhostTimer = 0;
    this.P.rdir = mv || this.P.face;
    this.P.face = this.P.rdir;
    const rollCost = this.look.build === 'arqueiro' ? 14 : 20;
    this.P.st = Math.max(0, this.P.st - rollCost);
    this.P.stDelay = 0.7;
    SFX.roll();
  }

  private firePlayerWeapon() {
    const wp = this.weaponDef();
    const cat = wp.category || 'melee';
    const P = this.P;
    const dmg = this.computeWeaponDmg(!!P.heavy, P.combo || 1);
    const spellMode = (P.spellIdx || 0) % 3;

    if (cat === 'bow') {
      SFX.bow();
      const spd = wp.projSpd || 680;
      const kind = wp.type === 'besta' ? 'bolt' : 'arrow';
      const vyOffsets = P.heavy ? [-105, -24, 58] : [-22];
      const shotDmg = P.heavy ? Math.round(dmg * 0.62) : dmg;
      for (const vy of vyOffsets) {
        this.shots.push({
          kind,
          x: P.x + P.face * 22,
          y: P.y - 46,
          vx: P.face * (spd + (P.heavy ? 70 : 0)),
          vy,
          hw: 12,
          h: 8,
          dmg: shotDmg,
          life: 1.4,
          friendly: true,
          pierce: !!wp.pierce || !!P.heavy,
          hitIds: [],
          status: wp.statusApply,
          col: wp.projCol || '#e8dcc8',
          grav: 110,
        });
      }
      this.sparkStreaks(P.x + P.face * 24, P.y - 46, P.face, P.heavy ? 8 : 4, wp.projCol || '#e8dcc8', 220, 0.2, 2);
      if (P.heavy) this.shake = Math.max(this.shake, 4.5);
    } else if (cat === 'magic') {
      SFX.cast();
      const spd = wp.projSpd || 520;
      const spellCol = MAGIC_SPELLS[spellMode].col;
      const baseKind = wp.statusApply === 'poison' ? 'poison_orb' : wp.pierce ? 'star' : 'arcane';

      if (spellMode === 1) {
        // Lança Estelar: piercing arcane beams
        if (P.heavy) {
          const shotDmg = Math.round(dmg * 0.65);
          for (const vy of [-85, 0, 85]) {
            this.shots.push({
              kind: 'arcane_lance',
              x: P.x + P.face * 26,
              y: P.y - 48,
              vx: P.face * (spd * 1.45),
              vy,
              hw: 20,
              h: 9,
              dmg: shotDmg,
              life: 1.15,
              friendly: true,
              pierce: true,
              hitIds: [],
              status: wp.statusApply,
              col: wp.statusApply === 'poison' ? '#8ce06c' : '#d2f4ff',
            });
          }
          this.impactRing(P.x + P.face * 24, P.y - 48, spellCol, 6, 42, 0.22);
          this.shake = Math.max(this.shake, 5.5);
        } else {
          this.shots.push({
            kind: 'arcane_lance',
            x: P.x + P.face * 26,
            y: P.y - 48,
            vx: P.face * (spd * 1.45),
            vy: 0,
            hw: 18,
            h: 8,
            dmg: Math.round(dmg * 1.05),
            life: 1.2,
            friendly: true,
            pierce: true,
            hitIds: [],
            status: wp.statusApply,
            col: wp.statusApply === 'poison' ? '#8ce06c' : '#d2f4ff',
          });
          this.sparkStreaks(P.x + P.face * 24, P.y - 48, P.face, 6, spellCol, 240, 0.2, 2.2);
        }
      } else if (spellMode === 2) {
        // Cometa do Vazio: explosive void orb + lunar pillars
        if (P.heavy) {
          for (let i = 0; i < 3; i++) {
            const tx = clamp(P.x + P.face * (115 + i * 95), 40, WORLD - 40);
            const gy = groundAt(tx) ?? P.y;
            this.marks.push({ x: tx, t: 0.28 + i * 0.14, kind: 'lunar', dmg: Math.round(dmg * 0.72), gy, friendly: true });
          }
          this.impactRing(P.x + P.face * 22, P.y - 48, '#c49eff', 8, 44, 0.24);
          this.shake = Math.max(this.shake, 6.5);
        } else {
          this.shots.push({
            kind: 'void_comet',
            x: P.x + P.face * 24,
            y: P.y - 48,
            vx: P.face * (spd * 0.88),
            vy: -35,
            hw: 14,
            h: 14,
            dmg: Math.round(dmg * 1.15),
            life: 1.45,
            friendly: true,
            status: wp.statusApply,
            col: '#c49eff',
            grav: 160,
            explodeR: 66,
          });
          this.sparkStreaks(P.x + P.face * 24, P.y - 48, P.face, 6, '#c49eff', 200, 0.22, 2.4);
        }
      } else if (P.heavy) {
        // Orbe Teleguiado (Heavy): 3 homing orbs + lunar sigil
        const shotDmg = Math.round(dmg * 0.58);
        for (const vy of [-90, 0, 90]) {
          this.shots.push({
            kind: baseKind,
            x: P.x + P.face * 24,
            y: P.y - 48,
            vx: P.face * spd,
            vy,
            hw: 12,
            h: 14,
            dmg: shotDmg,
            life: 1.35,
            friendly: true,
            pierce: !!wp.pierce,
            hitIds: [],
            status: wp.statusApply,
            col: wp.projCol || '#9ed7f0',
            homing: true,
          });
        }
        const tx = clamp(P.x + P.face * 175, 40, WORLD - 40);
        const gy = groundAt(tx) ?? P.y;
        this.marks.push({ x: tx, t: 0.42, kind: 'lunar', dmg: Math.round(dmg * 0.9), gy, friendly: true });
        this.impactRing(P.x + P.face * 22, P.y - 48, wp.projCol || '#9ed7f0', 6, 36, 0.22);
        this.shake = Math.max(this.shake, 5.5);
      } else {
        this.shots.push({
          kind: baseKind,
          x: P.x + P.face * 24,
          y: P.y - 48,
          vx: P.face * spd,
          vy: 0,
          hw: 11,
          h: 12,
          dmg,
          life: 1.5,
          friendly: true,
          pierce: !!wp.pierce,
          hitIds: [],
          status: wp.statusApply,
          col: wp.projCol || '#9ed7f0',
          homing: true,
        });
        this.sparkStreaks(P.x + P.face * 24, P.y - 48, P.face, 5, wp.projCol || '#9ed7f0', 180, 0.22, 2.2);
      }
    } else if (cat === 'pyro') {
      const spd = wp.projSpd || 510;
      if (spellMode === 1) {
        // Onda Ígnea: blazing fire waves hugging the ground
        SFX.fire();
        const gy = groundAt(P.x) ?? P.y;
        if (P.heavy) {
          SFX.eruption();
          for (const dir of [-P.face, P.face]) {
            this.shots.push({
              kind: 'fire_wave',
              x: P.x + dir * 24,
              y: gy,
              vx: dir * 420,
              vy: 0,
              hw: 20,
              h: 42,
              dmg: Math.round(dmg * 0.88),
              life: 1.15,
              gy,
              friendly: true,
              pierce: true,
              hitIds: [],
              status: 'burn',
              col: '#ff642e',
            });
          }
          const tx = clamp(P.x + P.face * 155, 40, WORLD - 40);
          this.marks.push({ x: tx, t: 0.36, kind: 'pyro_pillar', dmg: Math.round(dmg * 0.95), gy: groundAt(tx) ?? P.y, friendly: true });
          this.impactRing(P.x, P.y - 34, '#ff732e', 8, 56, 0.26);
          this.shake = Math.max(this.shake, 7);
        } else {
          this.shots.push({
            kind: 'fire_wave',
            x: P.x + P.face * 24,
            y: gy,
            vx: P.face * 410,
            vy: 0,
            hw: 18,
            h: 38,
            dmg,
            life: 1.1,
            gy,
            friendly: true,
            pierce: true,
            hitIds: [],
            status: 'burn',
            col: '#ff642e',
          });
          this.sparkStreaks(P.x + P.face * 26, P.y - 24, P.face, 7, '#ff8d3b', 220, 0.24, 2.5);
        }
      } else if (spellMode === 2) {
        // Chama Negra: piercing abyssal fire + black flame volcanic pillars
        if (P.heavy) {
          SFX.eruption();
          for (let i = 0; i < 3; i++) {
            const tx = clamp(P.x + P.face * (105 + i * 90), 40, WORLD - 40);
            const gy = groundAt(tx) ?? P.y;
            this.marks.push({ x: tx, t: 0.25 + i * 0.14, kind: 'black_pillar', dmg: Math.round(dmg * 0.78), gy, friendly: true });
          }
          this.impactRing(P.x + P.face * 20, P.y - 46, '#d878ff', 8, 46, 0.25);
          this.shake = Math.max(this.shake, 7);
        } else {
          SFX.fire();
          this.shots.push({
            kind: 'black_flame',
            x: P.x + P.face * 24,
            y: P.y - 46,
            vx: P.face * (spd * 1.12),
            vy: 0,
            hw: 14,
            h: 14,
            dmg: Math.round(dmg * 1.12),
            life: 1.35,
            friendly: true,
            pierce: true,
            hitIds: [],
            status: 'burn',
            col: '#d878ff',
          });
          this.sparkStreaks(P.x + P.face * 24, P.y - 46, P.face, 7, '#d878ff', 220, 0.24, 2.4);
        }
      } else if (P.heavy) {
        // Bola de Fogo (Heavy): 3 explosive fireballs
        SFX.eruption();
        const shotDmg = Math.round(dmg * 0.66);
        for (const [vxMul, vy] of [
          [0.9, -240],
          [1.08, -140],
          [1.22, -55],
        ] as const) {
          this.shots.push({
            kind: 'fireball',
            x: P.x + P.face * 24,
            y: P.y - 48,
            vx: P.face * spd * vxMul,
            vy,
            hw: 13,
            h: 13,
            dmg: shotDmg,
            life: 1.4,
            friendly: true,
            status: 'burn',
            col: wp.projCol || '#f68a38',
            grav: 520,
            explodeR: 60,
          });
        }
        this.impactRing(P.x + P.face * 22, P.y - 48, '#ff7d30', 8, 42, 0.24);
        this.shake = Math.max(this.shake, 6.5);
      } else {
        // Bola de Fogo (Light)
        SFX.fire();
        this.shots.push({
          kind: 'fireball',
          x: P.x + P.face * 24,
          y: P.y - 46,
          vx: P.face * spd,
          vy: -95,
          hw: 12,
          h: 12,
          dmg: Math.round(dmg * 1.06),
          life: 1.45,
          friendly: true,
          status: 'burn',
          col: wp.projCol || '#f68a38',
          grav: 360,
          explodeR: 54,
        });
        this.sparkStreaks(P.x + P.face * 24, P.y - 46, P.face, 6, '#f6a844', 210, 0.24, 2.3);
      }
    }
  }

  private attackHits() {
    const wp = this.weaponDef();
    const cat = wp.category || 'melee';
    if (cat !== 'melee') return;

    const r = wp.reach + (this.P.heavy ? 36 : 28);
    const x0 = this.P.face > 0 ? this.P.x - 8 : this.P.x - r;
    const x1 = x0 + r + 8;
    for (const e of this.enemies) {
      if (e.dead || e.pending || (e.spawnTime || 0) > 0 || e.hitBy === this.P.atkId) continue;
      if (e.x + e.hw > x0 && e.x - e.hw < x1 && e.y > this.P.y - 84 && e.y - e.h < this.P.y + 4) {
        e.hitBy = this.P.atkId;
        const dmg = this.computeWeaponDmg(!!this.P.heavy, this.P.combo || 1);
        this.damageEnemy(e, dmg, !!this.P.heavy, this.P.face, false);
        const rt = this.getRuneTotals();
        this.P.energy = Math.min(100, this.P.energy + 14 * this.buildDef().energyGainMult * (1 + rt.energyRegenBonus));
        const ix = (this.P.x + e.x) * 0.5;
        const iy = e.y - e.h * 0.55;
        if (this.P.heavy) {
          this.hitstop = 0.11;
          this.shake = Math.max(this.shake, 13.5);
          this.impactFlash = Math.max(this.impactFlash, 0.28);
          this.impactRing(ix, iy, '#f6d27a', 8, 58, 0.25);
          this.impactRing(ix, iy, '#c23a3a', 4, 38, 0.2);
          this.sparkStreaks(ix, iy, this.P.face, 14, '#ffe19c', 420, 0.34, 2.8);
          this.addRubble(e.x, e.y, 7);
          this.dustPuff(e.x, e.y - 4, this.P.face, 6);
        } else {
          this.hitstop = 0.05;
          this.shake = Math.max(this.shake, 4.5);
          this.impactRing(ix, iy, '#e8dcc8', 4, 24, 0.16);
          this.sparkStreaks(ix, iy, this.P.face, 5, '#e8dcc8', 240, 0.22, 2.0);
        }
        if (this.P.rally > 0) {
          const h = Math.min(this.P.rally, dmg * 0.35);
          this.P.hp = Math.min(this.maxHp(), this.P.hp + h);
          this.P.rally -= h;
        }
      }
    }
    this.traps = this.traps.filter((tp) => {
      if (tp.x + tp.w / 2 > x0 && tp.x - tp.w / 2 < x1 && Math.abs(tp.y - this.P.y) < 40) {
        this.spark(tp.x, tp.y - 12, 6, '#c23a3a', 120, 0.4);
        SFX.snip();
        return false;
      }
      return true;
    });
  }

  private startSpecial() {
    const P = this.P;
    if (P.dead) return;
    if (P.energy < 100) {
      this.floatText(P.x, P.y - 88, `Especial ${Math.floor(P.energy)}%`, this.buildDef().accent);
      return;
    }
    P.energy = 0;
    const b = this.look.build;
    const baseDmg = this.computeWeaponDmg(true, 1);

    if (b === 'arqueiro') {
      // Chuva de Flechas: acrobatic vault + 7-arrow piercing fan
      P.inv = Math.max(P.inv, 0.75);
      P.vy = -270;
      P.vx = -P.face * 210;
      this.shake = Math.max(this.shake, 10);
      this.impactFlash = Math.max(this.impactFlash, 0.24);
      this.impactRing(P.x, P.y - 44, '#78c257', 10, 90, 0.32);
      this.sparkStreaks(P.x + P.face * 18, P.y - 44, P.face, 16, '#e05348', 360, 0.36, 2.5);
      for (let i = -3; i <= 3; i++) {
        this.shots.push({
          kind: 'arrow',
          x: P.x + P.face * 20,
          y: P.y - 48,
          vx: P.face * 780,
          vy: i * 85 - 30,
          hw: 13,
          h: 9,
          dmg: Math.round(baseDmg * 0.72),
          life: 1.5,
          friendly: true,
          pierce: true,
          hitIds: [],
          status: 'bleed',
          col: '#f26a5b',
          grav: 90,
        });
      }
      SFX.bow();
      SFX.special();
      this.floatText(P.x, P.y - 84, 'Chuva de Flechas!', '#9be07a');
    } else if (b === 'mago') {
      // Tempestade Lunar: 6 homing star orbs + 3 lunar pillar strikes on nearby enemies
      P.inv = Math.max(P.inv, 0.85);
      this.shake = Math.max(this.shake, 11);
      this.impactFlash = Math.max(this.impactFlash, 0.28);
      this.impactRing(P.x, P.y - 44, '#9ed7f0', 12, 120, 0.38);
      this.sparkStreaks(P.x, P.y - 44, 0, 22, '#cffbff', 380, 0.44, 2.8);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        this.shots.push({
          kind: 'star',
          x: P.x + Math.cos(a) * 28,
          y: P.y - 48 + Math.sin(a) * 28,
          vx: Math.cos(a) * 420 + P.face * 140,
          vy: Math.sin(a) * 240,
          hw: 13,
          h: 13,
          dmg: Math.round(baseDmg * 0.75),
          life: 1.7,
          friendly: true,
          pierce: true,
          hitIds: [],
          col: '#bdf0fa',
          homing: true,
        });
      }
      const targets = this.enemies
        .filter((e) => !e.dead && !e.pending && (e.spawnTime || 0) <= 0 && Math.abs(e.x - P.x) < 460)
        .sort((a, c) => Math.abs(a.x - P.x) - Math.abs(c.x - P.x))
        .slice(0, 3);
      if (targets.length === 0) {
        this.marks.push({
          x: clamp(P.x + P.face * 160, 40, WORLD - 40),
          t: 0.4,
          kind: 'lunar',
          dmg: Math.round(baseDmg * 1.15),
          gy: groundAt(clamp(P.x + P.face * 160, 40, WORLD - 40)) ?? P.y,
          friendly: true,
        });
      } else {
        targets.forEach((e, idx) => {
          this.marks.push({
            x: e.x,
            t: 0.32 + idx * 0.14,
            kind: 'lunar',
            dmg: Math.round(baseDmg * 1.15),
            gy: groundAt(e.x) ?? e.y,
            friendly: true,
          });
        });
      }
      SFX.cast();
      SFX.special();
      this.floatText(P.x, P.y - 84, 'Tempestade Lunar!', '#9ed7f0');
    } else if (b === 'piromante') {
      // Erupção das Cinzas: fire burst + 6 fireballs + volcanic pillars under enemies
      P.inv = Math.max(P.inv, 0.9);
      this.shake = Math.max(this.shake, 13);
      this.impactFlash = Math.max(this.impactFlash, 0.3);
      this.impactRing(P.x, P.y - 40, '#f68a38', 14, 145, 0.4);
      this.sparkStreaks(P.x, P.y - 40, 0, 26, '#ffb85c', 420, 0.46, 3);
      const gy = groundAt(P.x) ?? P.y;
      for (const dir of [-1, 1]) {
        this.shots.push({
          kind: 'fire_wave',
          x: P.x + dir * 20,
          y: gy,
          vx: dir * 440,
          vy: 0,
          hw: 22,
          h: 46,
          dmg: Math.round(baseDmg * 0.95),
          life: 1.2,
          gy,
          friendly: true,
          pierce: true,
          hitIds: [],
          status: 'burn',
          col: '#ff642e',
        });
      }
      for (let i = 0; i < 6; i++) {
        const vx = -340 + i * 136;
        this.shots.push({
          kind: 'fireball',
          x: P.x,
          y: P.y - 52,
          vx,
          vy: -320 - (i % 2) * 90,
          hw: 13,
          h: 13,
          dmg: Math.round(baseDmg * 0.72),
          life: 1.5,
          friendly: true,
          status: 'burn',
          col: '#ff7d30',
          grav: 640,
          explodeR: 62,
        });
      }
      const targets = this.enemies
        .filter((e) => !e.dead && !e.pending && (e.spawnTime || 0) <= 0 && Math.abs(e.x - P.x) < 480)
        .sort((a, c) => Math.abs(a.x - P.x) - Math.abs(c.x - P.x))
        .slice(0, 4);
      if (targets.length === 0) {
        const tx = clamp(P.x + P.face * 150, 40, WORLD - 40);
        this.marks.push({
          x: tx,
          t: 0.34,
          kind: 'pyro_pillar',
          dmg: Math.round(baseDmg * 1.2),
          gy: groundAt(tx) ?? P.y,
          friendly: true,
        });
      } else {
        targets.forEach((e, idx) => {
          this.marks.push({
            x: e.x,
            t: 0.25 + idx * 0.12,
            kind: 'pyro_pillar',
            dmg: Math.round(baseDmg * 1.2),
            gy: groundAt(e.x) ?? e.y,
            friendly: true,
          });
        });
      }
      SFX.eruption();
      SFX.special();
      this.floatText(P.x, P.y - 84, 'Erupção das Cinzas!', '#f68a38');
    } else {
      // Guerreiro: Ciclone da Vigília
      P.spin = 1.35;
      P.spinTick = 0;
      P.inv = Math.max(P.inv, 1.45);
      this.shake = Math.max(this.shake, 9);
      this.impactFlash = Math.max(this.impactFlash, 0.22);
      this.impactRing(P.x, P.y - 40, '#bdf0fa', 12, 110, 0.36);
      this.sparkStreaks(P.x, P.y - 40, 0, 18, '#cffbff', 360, 0.42, 2.6);
      this.spark(P.x, P.y - 40, 22, '#bdf0fa', 240, 0.55, 160, 2.8);
      SFX.special();
      this.floatText(P.x, P.y - 84, 'Ciclone da Vigília!', '#f6d27a');
    }
    this.emitStatus(true);
  }

  private static STATUS_LABELS: Record<StatusEffectId, string> = {
    poison: 'Envenenado',
    stagger: 'Atordoado',
    bleed: 'Hemorragia',
    slow: 'Fio Preso',
    burn: 'Em Chamas',
  };

  private emitStatus(force = false) {
    const buildups: StatusHudSnapshot['buildups'] = [];
    if (this.P.poisonBuild > 2) {
      buildups.push({ id: 'poison', label: 'Veneno', value: Math.round(this.P.poisonBuild) });
    }
    if (this.P.bleedBuild > 2) {
      buildups.push({ id: 'bleed', label: 'Hemorragia', value: Math.round(this.P.bleedBuild) });
    }
    const effects = this.P.statuses.map((s) => ({ ...s }));
    const energy = Math.round(this.P.energy);
    const evadeBuff = this.P.evadeBuff;
    const inIframe = !!this.P.inIframe;
    const wpCat = this.weaponDef().category;
    const spellKind = wpCat === 'pyro' ? 'pyro' : wpCat === 'magic' ? 'magic' : undefined;
    const spellObj = spellKind
      ? (spellKind === 'pyro' ? PYRO_SPELLS : MAGIC_SPELLS)[(this.P.spellIdx || 0) % 3]
      : undefined;
    const sig =
      effects.map((s) => `${s.id}:${Math.ceil(s.remaining * 10)}`).join('|') +
      ';' +
      buildups.map((b) => `${b.id}:${b.value}`).join('|') +
      ';' +
      energy +
      ';' +
      this.look.build +
      ';' +
      Math.ceil(evadeBuff * 10) +
      ';' +
      (inIframe ? 1 : 0) +
      ';' +
      this.S.karma +
      ';' +
      this.S.ng +
      ';' +
      (spellObj ? `${spellKind}:${spellObj.id}` : '');
    if (force || sig !== this.lastStatusSig) {
      this.lastStatusSig = sig;
      this.cb.onStatusChange({
        effects,
        buildups,
        energy,
        build: this.look.build,
        evadeBuff,
        inIframe,
        karma: this.S.karma,
        ng: this.S.ng,
        spellLabel: spellObj?.name,
        spellDesc: spellObj?.desc,
        spellCol: spellObj?.col,
        spellKind,
      });
    }
  }

  private applyPlayerStatus(id: StatusEffectId, duration: number) {
    if (this.P.dead) return;
    const existing = this.P.statuses.find((s) => s.id === id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.duration = Math.max(existing.duration, duration);
    } else {
      this.P.statuses.push({
        id,
        label: FoxBorneEngine.STATUS_LABELS[id],
        remaining: duration,
        duration,
        tick: id === 'poison' ? 0.75 : id === 'bleed' ? 0.65 : undefined,
      });
    }
    if (id === 'stagger') {
      this.P.state = 'stagger';
      this.P.t = 0;
      this.P.blocking = false;
      this.P.buf = null;
      this.floatText(this.P.x, this.P.y - 78, 'Atordoado!', '#e8b070');
    } else if (id === 'poison') {
      this.floatText(this.P.x, this.P.y - 78, 'Envenenado!', '#78c257');
    } else if (id === 'bleed') {
      this.floatText(this.P.x, this.P.y - 78, 'Hemorragia!', '#d13838');
    } else if (id === 'slow') {
      this.floatText(this.P.x, this.P.y - 72, 'Preso no arame', '#c8b8a6');
    }
    this.emitStatus(true);
  }

  private applyEnemyStatus(e: Enemy, id: StatusEffectId, duration: number) {
    if (e.dead) return;
    if (id === 'bleed') {
      e.bleedBuild = (e.bleedBuild || 0) + 55;
      if ((e.bleedCd || 0) <= 0 && (e.bleedBuild || 0) >= 100) {
        e.bleedBuild = 0;
        e.bleedCd = 2.0;
        const burst = e.boss ? Math.min(260, Math.round(e.maxHp * 0.08)) : Math.max(18, Math.round(e.maxHp * 0.14));
        e.hp -= burst;
        e.flash = 0.16;
        e.shown = 4;
        this.blood(e.x, e.y - e.h * 0.5, this.P.face);
        this.floatText(e.x, e.y - e.h - 14, `Hemorragia -${burst}`, '#d13838');
        const ex = e.statuses.find((s) => s.id === 'bleed');
        if (ex) {
          ex.remaining = Math.max(ex.remaining, duration);
          ex.duration = Math.max(ex.duration, duration);
        } else {
          e.statuses.push({
            id: 'bleed',
            label: FoxBorneEngine.STATUS_LABELS.bleed,
            remaining: duration,
            duration,
            tick: 0.6,
          });
        }
        if (e.hp <= 0) this.killEnemy(e, this.P.face);
      } else {
        this.blood(e.x, e.y - e.h * 0.55, this.P.face, 4);
      }
      return;
    }

    const existing = e.statuses.find((s) => s.id === id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.duration = Math.max(existing.duration, duration);
    } else {
      e.statuses.push({
        id,
        label: FoxBorneEngine.STATUS_LABELS[id],
        remaining: duration,
        duration,
        tick: id === 'poison' ? 0.8 : id === 'burn' ? 0.65 : undefined,
      });
    }
    if (id === 'stagger') {
      e.vuln = true;
      e.guarding = false;
      if (!e.boss) {
        e.state = 'hurt';
        e.t = Math.max(e.t, duration);
      }
      this.spark(e.x, e.y - e.h * 0.75, 10, '#f6d27a', 170, 0.45, 300, 2.5);
      this.floatText(e.x, e.y - e.h - 14, 'Atordoado', '#f6d27a');
    } else if (id === 'poison') {
      this.spark(e.x, e.y - e.h * 0.6, 8, '#78c257', 120, 0.45, 80, 2.2);
    } else if (id === 'burn') {
      this.spark(e.x, e.y - e.h * 0.55, 10, '#ff7d30', 150, 0.5, -40, 2.5);
    }
  }

  private killEnemy(e: Enemy, dir: number) {
    if (e.dead) return;
    const d = ET[e.type];
    const rt = this.getRuneTotals();
    e.dead = true;
    e.t = e.boss ? 1.4 : 0.7;
    e.vx = dir * 120;
    this.addRubble(e.x, e.y, e.boss ? 28 : 12);
    const n = Math.round(d.souls * this.hard() * e.zm * (1 + rt.luckBonus));
    this.S.cinzas += n;
    this.floatText(e.x, e.y - e.h - 10, '+' + n, '#e8b070');
    if (rt.killHeal > 0 && !this.P.dead && this.P.hp < this.maxHp()) {
      this.P.hp = Math.min(this.maxHp(), this.P.hp + rt.killHeal);
      this.spark(this.P.x, this.P.y - 36, 6, '#d94854', 110, 0.4, -40, 2);
    }
    if (e.boss) this.bossDown(e);
    else SFX.groan();
  }

  private updatePlayerStatuses(dt: number) {
    const P = this.P;
    if (P.dead) {
      if (P.statuses.length || P.poisonBuild || P.bleedBuild) {
        P.statuses = [];
        P.poisonBuild = 0;
        P.bleedBuild = 0;
        this.emitStatus(true);
      }
      return;
    }

    P.poisonBuild = Math.max(0, P.poisonBuild - 10 * dt);
    P.bleedBuild = Math.max(0, P.bleedBuild - 12 * dt);

    for (const s of P.statuses) {
      s.remaining -= dt;
      if (s.id === 'poison') {
        s.tick = (s.tick ?? 0.75) - dt;
        if (Math.random() < 0.25) {
          this.parts.push({
            x: P.x + rnd(-10, 10),
            y: P.y - rnd(12, 48),
            vx: rnd(-12, 12),
            vy: rnd(-38, -14),
            life: 0.55,
            max: 0.55,
            col: '#78c257',
            grav: -20,
            size: 2.4,
          });
        }
        if (s.tick <= 0) {
          s.tick = 0.75;
          const dmg = Math.max(2, Math.round(this.maxHp() * 0.032));
          P.hp -= dmg;
          this.redFlash = Math.max(this.redFlash, 0.14);
          if (P.hp <= 0) this.killPlayer();
        }
      } else if (s.id === 'bleed') {
        s.tick = (s.tick ?? 0.65) - dt;
        if (s.tick <= 0) {
          s.tick = 0.65;
          const dmg = Math.max(1, Math.round(this.maxHp() * 0.02));
          P.hp -= dmg;
          this.blood(P.x, P.y - 34, -P.face, 4);
          if (P.hp <= 0) this.killPlayer();
        }
      }
    }

    const prevLen = P.statuses.length;
    P.statuses = P.statuses.filter((s) => s.remaining > 0);
    if (P.state === 'stagger' && !P.statuses.some((s) => s.id === 'stagger')) {
      P.state = 'free';
    }

    this.statusEmitTimer -= dt;
    if (prevLen !== P.statuses.length || this.statusEmitTimer <= 0) {
      this.statusEmitTimer = 0.08;
      this.emitStatus(prevLen !== P.statuses.length);
    }
  }

  private hurtPlayer(dmg: number, fromX: number, attacker?: Enemy): boolean {
    const P = this.P;
    if (P.dead || P.inv > 0) return false;
    if (this.isRollIframe()) {
      if (!P.evadedHit) {
        P.evadedHit = true;
        P.inv = Math.max(P.inv, 0.14);
        P.st = Math.min(this.maxSt(), P.st + 18);
        P.energy = Math.min(100, P.energy + 15);
        P.evadeBuff = 1.8;
        SFX.evade();
        this.impactRing(P.x, P.y - 34, '#7ae8d8', 8, 52, 0.24);
        this.sparkStreaks(P.x, P.y - 34, -P.face, 10, '#bff7ee', 260, 0.28, 2.2);
        this.floatText(P.x, P.y - 78, 'Esquiva Perfeita!', '#7ae8d8');
        this.emitStatus(true);
      }
      return false;
    }
    const defTotal = Math.min(0.6, this.armorDef().def + this.getRuneTotals().defBonus);
    dmg = Math.round(dmg * this.dmgHard() * (1 - defTotal));

    if (P.blocking && P.state === 'free' && (fromX - P.x) * P.face >= 0) {
      const shieldDef = SHIELDS.find((s) => s.id === this.look.shield) || SHIELDS[0];
      if (P.blockT <= 0.18) {
        SFX.parry();
        this.impactRing(P.x + P.face * 16, P.y - 38, '#f6d27a', 8, 56, 0.24);
        this.sparkStreaks(P.x + P.face * 16, P.y - 38, P.face, 14, '#ffe19c', 320, 0.34, 2.5);
        this.spark(P.x + P.face * 16, P.y - 38, 12, '#f6d27a', 210, 0.45, 250, 2.5);
        this.floatText(P.x, P.y - 76, 'Aparado', '#f6d27a');
        P.st = Math.min(this.maxSt(), P.st + 12);
        P.inv = 0.28;
        this.hitstop = 0.065;
        this.impactFlash = Math.max(this.impactFlash, 0.22);
        this.shake = Math.max(this.shake, 7.5);
        if (attacker && !attacker.boss) {
          this.applyEnemyStatus(attacker, 'stagger', 1.35);
          attacker.vx = -attacker.face * 140;
        }
        return true;
      }

      P.st -= (dmg * 1.1) / shieldDef.stability;
      P.stDelay = 0.9;
      P.vx = -P.face * (120 / shieldDef.stability);
      SFX.block();
      this.impactRing(P.x + P.face * 14, P.y - 38, '#d8d0bd', 6, 32, 0.18);
      this.sparkStreaks(P.x + P.face * 14, P.y - 38, -P.face, 7, '#e8dcc8', 220, 0.24, 2.0);
      this.spark(P.x + P.face * 14, P.y - 38, 6, '#d8d0bd', 140, 0.3);
      this.shake = Math.max(this.shake, 5.5);
      if (P.st > 0) {
        P.hp -= Math.round(dmg * 0.1);
        P.inv = 0.2;
        if (P.hp <= 0) this.killPlayer();
        return true;
      }
      P.st = 0;
      P.stDelay = 1.4;
      dmg = Math.round(dmg * 0.4);
      this.floatText(P.x, P.y - 74, 'Guarda quebrada', '#d9772f');
      this.applyPlayerStatus('stagger', 0.9);
    }

    P.blocking = false;
    P.hp -= dmg;
    P.rally = Math.min(P.rally + dmg, this.maxHp() - Math.max(0, P.hp));
    P.rallyT = 3.2;

    const heavyHit =
      attacker &&
      (attacker.type === 'carrasco' ||
        attacker.type === 'cavaleiro' ||
        attacker.type === 'sentinela' ||
        attacker.type === 'besta_eletrica' ||
        attacker.type === 'renascido' ||
        (attacker.type === 'rei' && attacker.state === 'slam') ||
        (attacker.type === 'santo' && attacker.state === 'dash'));

    if (P.state !== 'stagger') {
      if (heavyHit) {
        this.applyPlayerStatus('stagger', 0.52);
        P.inv = 0.85;
        P.vy = -170;
      } else {
        Object.assign(P, { state: 'hurt', t: 0, inv: 0.7, vy: -160 });
      }
    } else {
      P.inv = 0.75;
    }

    if ((attacker?.type === 'costureira' || attacker?.type === 'lobisomem') && P.hp > 0) {
      P.bleedBuild = Math.min(100, P.bleedBuild + (attacker.type === 'lobisomem' ? 42 : 38));
      if (P.bleedBuild >= 100) {
        P.bleedBuild = 0;
        const bleedBurst = Math.round(this.maxHp() * 0.14);
        P.hp -= bleedBurst;
        this.blood(P.x, P.y - 36, -P.face);
        this.applyPlayerStatus('bleed', 4.0);
      } else {
        this.emitStatus(true);
      }
    }

    const hitDir = P.x >= fromX ? 1 : -1;
    P.vx = hitDir * (heavyHit ? 250 : 210);
    this.hitstop = Math.max(this.hitstop, heavyHit ? 0.08 : 0.045);
    this.shake = Math.max(this.shake, heavyHit ? 15 : 11);
    this.redFlash = Math.max(this.redFlash, heavyHit ? 0.58 : 0.44);
    SFX.hurt();
    this.impactRing(P.x, P.y - 38, '#d13838', 10, heavyHit ? 66 : 44, 0.28);
    this.sparkStreaks(P.x, P.y - 38, hitDir, heavyHit ? 16 : 10, '#e8523f', 360, 0.36, 2.8);
    this.blood(P.x, P.y - 36, hitDir, heavyHit ? 14 : 10);
    this.dustPuff(P.x, P.y - 4, hitDir, heavyHit ? 7 : 4);
    if (P.hp <= 0) this.killPlayer();
    return true;
  }

  private killPlayer() {
    if (this.P.dead) return;
    this.P.hp = 0;
    this.P.rally = 0;
    this.P.dead = true;
    this.P.deadT = 0;
    this.P.bannered = false;
    SFX.die();
  }

  private respawn() {
    if (this.S.cinzas > 0) {
      this.drop = { x: this.safe.x, y: this.safe.y, n: this.S.cinzas };
      this.S.cinzas = 0;
    }
    this.placeAtCheckpoint();
    this.resetEnemies();
    this.save();
  }

  private gate = () => {
    const k = this.S.dead.indexOf(false);
    return k < 0 ? null : ARENAS[k];
  };

  private nearFog = () => {
    const g = this.gate();
    return !!g && this.arena < 0 && this.P.x > g.x0 - 80 && this.P.x < g.x0;
  };

  private nearBrazier = () => {
    for (let i = 0; i < BRAZ.length; i++) {
      if (Math.abs(BRAZ[i].x - this.P.x) < 56 && Math.abs(BRAZ[i].y - this.P.y) < 12) return i;
    }
    return -1;
  };

  private nearChest = () => {
    for (let i = 0; i < this.chests.length; i++) {
      const c = this.chests[i];
      if (!c.opened && Math.abs(c.x - this.P.x) < 46 && Math.abs(c.y - this.P.y) < 32) return i;
    }
    return -1;
  };

  private nearLore = () => {
    for (let i = 0; i < LORE_STONES.length; i++) {
      const ls = LORE_STONES[i];
      if (Math.abs(ls.x - this.P.x) < 52 && Math.abs(ls.y - this.P.y) < 34) return i;
    }
    return -1;
  };

  private nearNpc = (): NpcDef | null => {
    for (const npc of NPCS) {
      if (Math.abs(npc.x - this.P.x) < 58 && Math.abs(npc.y - this.P.y) < 42) return npc;
    }
    return null;
  };

  private getNpcStatus(npc: NpcDef): QuestStatus {
    return this.S.quests[npc.id] || 'unstarted';
  }

  private isNpcObjectiveMet(npc: NpcDef): boolean {
    if (npc.targetFieldBoss) return this.S.deadField.includes(npc.targetFieldBoss);
    if (typeof npc.targetBossIdx === 'number') return !!this.S.dead[npc.targetBossIdx];
    return false;
  }

  private isNpcCompleted(status: QuestStatus): boolean {
    return status === 'completed_light' || status === 'completed_dark' || status === 'completed_neutral';
  }

  private openNpcDialog(npc: NpcDef) {
    let status = this.getNpcStatus(npc);
    const met = this.isNpcObjectiveMet(npc);
    if (status === 'unstarted') {
      status = met ? 'ready' : 'active';
      this.S.quests[npc.id] = status;
      this.save();
      this.emitRest();
      this.emitMiniMap(true);
      SFX.quest();
    } else if (status === 'active' && met) {
      status = 'ready';
      this.S.quests[npc.id] = 'ready';
      this.save();
    }
    SFX.npcChime();
    this.activeNpc = npc;
    this.lastNpcOutcome = undefined;
    this.cb.onNpcDialog({
      npc,
      status,
      karma: this.S.karma,
      objectiveMet: met,
    });
    this.setMode('npc');
  }

  public chooseNpcOption(npcId: string, choiceId: string) {
    const npc = NPCS.find((n) => n.id === npcId);
    if (!npc) return;
    const choice = npc.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    const cur = this.getNpcStatus(npc);
    if (this.isNpcCompleted(cur) || !this.isNpcObjectiveMet(npc)) return;

    this.S.quests[npc.id] = choice.nextStatus;
    this.S.karma = clamp(this.S.karma + choice.karmaDelta, -100, 100);
    if (choice.rewardCinzas) {
      this.S.cinzas += choice.rewardCinzas;
    }
    if (choice.rewardWeapon && !this.S.unlockedWeapons.includes(choice.rewardWeapon)) {
      this.S.unlockedWeapons.push(choice.rewardWeapon);
    }
    if (choice.rewardArmor && !this.S.unlockedArmors.includes(choice.rewardArmor)) {
      this.S.unlockedArmors.push(choice.rewardArmor);
    }
    if (choice.rewardRune && !this.S.unlockedRunes.includes(choice.rewardRune)) {
      this.S.unlockedRunes.push(choice.rewardRune);
    }
    if (choice.rewardLore) {
      this.unlockLore(choice.rewardLore, false);
    }

    if (choice.karmaDelta > 0) SFX.karmaLight();
    else if (choice.karmaDelta < 0) SFX.karmaDark();
    else SFX.quest();

    this.lastNpcOutcome = choice.outcomeText;
    this.save();
    this.emitRest();
    this.emitStatus(true);
    this.emitMiniMap(true);

    this.cb.onNpcDialog({
      npc,
      status: choice.nextStatus,
      karma: this.S.karma,
      objectiveMet: true,
      lastOutcome: this.lastNpcOutcome,
    });
  }

  public closeNpcDialog() {
    this.activeNpc = null;
    this.lastNpcOutcome = undefined;
    this.cb.onNpcDialog(null);
    this.setMode('play');
  }

  private computeEnding(): EndingId {
    if (this.S.karma >= 25) return 'alvor';
    if (this.S.karma <= -25) return 'eclipse';
    return 'vigilia';
  }

  private buildEndingSnapshot(): EndingSnapshot {
    const questsCompleted = Object.values(this.S.quests).filter((st) => this.isNpcCompleted(st)).length;
    return {
      ending: this.computeEnding(),
      karma: this.S.karma,
      level: this.S.level,
      ng: this.S.ng,
      cinzas: this.S.cinzas,
      bossesDefeated: this.S.dead.filter(Boolean).length,
      questsCompleted,
      unlockedLoreCount: this.S.unlockedLore.length,
      build: this.look.build,
    };
  }

  public openEnding() {
    if (!this.S.dead.every(Boolean)) return;
    this.triggerEnding();
  }

  private triggerEnding() {
    if (this.endingTimer !== null) {
      clearTimeout(this.endingTimer);
      this.endingTimer = null;
    }
    const snap = this.buildEndingSnapshot();
    setBossMusic(false);
    playEndingTheme(snap.ending);
    this.cb.onEnding(snap);
    this.setMode('ending');
  }

  private readLore(idx: number) {
    const ls = LORE_STONES[idx];
    if (!ls) return;
    const isNew = this.unlockLore(ls.loreId, false);
    SFX.lore();
    this.impactRing(ls.x, ls.y - 34, '#9ed7f0', 6, 46, 0.34);
    this.spark(ls.x, ls.y - 34, 14, '#9ed7f0', 140, 0.55, -20, 2.2);
    const entry = LORE_ENTRIES.find((l) => l.id === ls.loreId);
    this.setBanner(
      entry ? entry.title : 'Crônica gravada',
      ls.inscription,
      4.0,
      isNew ? '#9ed7f0' : '#d8d0bd'
    );
  }

  private openChest(idx: number) {
    const c = this.chests[idx];
    if (!c || c.opened) return;
    c.opened = true;
    if (!this.S.looted.includes(c.id)) this.S.looted.push(c.id);

    let label = '';
    let subBanner = 'Relíquia obtida · Equipe na Pausa (Esc) ou no Braseiro';
    let col = '#f6d27a';
    if (c.kind === 'weapon') {
      const wId = c.itemId as WeaponId;
      if (!this.S.unlockedWeapons.includes(wId)) this.S.unlockedWeapons.push(wId);
      label = WEAPONS[wId].label || wId;
    } else if (c.kind === 'armor') {
      const aId = c.itemId as ArmorId;
      if (!this.S.unlockedArmors.includes(aId)) this.S.unlockedArmors.push(aId);
      label = ARMORS[aId].label;
    } else if (c.kind === 'rune') {
      const rId = c.itemId as RuneId;
      if (!this.S.unlockedRunes.includes(rId)) this.S.unlockedRunes.push(rId);
      label = RUNES[rId].label;
      subBanner = 'Runa obtida · Equipe na aba Runas do Braseiro';
      col = RUNES[rId].col;
    } else {
      const sId = c.itemId as ShieldId;
      if (!this.S.unlockedShields.includes(sId)) this.S.unlockedShields.push(sId);
      label = (SHIELDS.find((s) => s.id === sId) || SHIELDS[0]).label;
    }

    SFX.soul();
    SFX.equip();
    this.impactRing(c.x, c.y - 18, col, 6, 52, 0.35);
    this.spark(c.x, c.y - 18, 22, col, 210, 0.65, 220, 2.8);
    this.setBanner(label, subBanner, 3.4, col);
    this.save();
    this.emitRest();
    this.emitMiniMap(true);
  }

  private rest(i: number) {
    this.S.lit[i] = true;
    this.S.cp = i;
    this.P.hp = this.maxHp();
    this.P.st = this.maxSt();
    this.P.flasks = this.maxFlasks();
    this.P.rally = 0;
    this.P.vx = 0;
    this.P.spin = 0;
    this.P.statuses = [];
    this.P.poisonBuild = 0;
    this.P.bleedBuild = 0;
    this.emitStatus(true);
    this.arena = -1;
    this.resetEnemies();
    this.save();
    SFX.light();
    this.emitRest();
    this.setMode('rest');
  }

  private captureInput() {
    for (const k of ['atk', 'heavy', 'roll', 'jump']) {
      if (this.pressed[k]) {
        this.P.buf = k;
        this.P.bufT = 0.2;
      }
    }
  }

  private updatePlayer(dt: number) {
    const P = this.P;
    P.anim += dt;
    P.inv = Math.max(0, P.inv - dt);
    P.slow = Math.max(0, (P.slow || 0) - dt);
    P.evadeBuff = Math.max(0, P.evadeBuff - dt);
    P.inIframe = this.isRollIframe();
    for (const g of this.rollGhosts) g.a -= dt * 3.8;
    this.rollGhosts = this.rollGhosts.filter((g) => g.a > 0);
    const wasBlock = P.blocking;
    P.blocking = false;

    if (P.dead) {
      P.deadT += dt;
      P.vx *= 0.9;
      if (P.y < H + 200) moveEntity(P, dt);
      if (P.deadT > 0.7 && !P.bannered) {
        P.bannered = true;
        this.setBanner(
          'Cinzas às cinzas',
          this.S.cinzas > 0 ? 'Suas cinzas ficaram onde você caiu' : '',
          2.6,
          '#c23a3a'
        );
      }
      if (P.deadT > 3.4) this.respawn();
      return;
    }

    const rt = this.getRuneTotals();
    const energyPassiveRate =
      (5 + (this.S.arc || 0) * 0.45) * this.buildDef().energyGainMult * (1 + rt.energyRegenBonus);
    P.energy = Math.min(100, P.energy + energyPassiveRate * dt);
    if (this.pressed.spell) {
      this.cycleSpell();
    }
    if (this.pressed.special && (P.state === 'free' || P.state === 'atk' || P.state === 'roll')) {
      this.startSpecial();
    }

    if (P.spin > 0) {
      P.spin = Math.max(0, P.spin - dt);
      P.spinTick -= dt;
      if (P.spinTick <= 0) {
        P.spinTick = 0.16;
        this.spark(P.x, P.y - 38, 6, '#cffbff', 160, 0.35, 100, 2.2);
        const dmg = Math.round(this.computeWeaponDmg(false, 1) * 0.92);
        for (const e of this.enemies) {
          if (e.dead || e.pending || (e.spawnTime || 0) > 0) continue;
          if (Math.abs(e.x - P.x) < 135 && Math.abs(e.y - P.y) < 110) {
            this.damageEnemy(e, dmg, false, e.x >= P.x ? 1 : -1, true);
            this.shake = Math.max(this.shake, 5.5);
            this.impactRing(e.x, e.y - e.h * 0.55, '#bdf0fa', 6, 34, 0.18);
            if (P.rally > 0) {
              const h = Math.min(P.rally, dmg * 0.3);
              P.hp = Math.min(this.maxHp(), P.hp + h);
              P.rally -= h;
            }
          }
        }
      }
    }

    const mv = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    P.bufT -= dt;
    if (P.bufT <= 0) P.buf = null;
    P.coyote = P.onGround ? 0.09 : P.coyote - dt;
    P.stDelay -= dt;
    if (P.stDelay <= 0 && P.state !== 'roll' && P.state !== 'atk') {
      P.st = Math.min(
        this.maxSt(),
        P.st + 50 * this.armorDef().staminaRegen * (1 + rt.staminaRegenBonus) * dt * (wasBlock ? 0.3 : 1)
      );
    }
    if (P.rally > 0) {
      P.rallyT -= dt;
      if (P.rallyT <= 0) P.rally = Math.max(0, P.rally - 45 * dt);
    }

    const isSlowed = P.statuses.some((s) => s.id === 'slow') || (P.slow || 0) > 0;
    const moveSpd = SPEED * this.buildDef().spdMult * this.armorDef().spdMult * (1 + rt.spdMult);
    if (P.state === 'free') {
      P.blocking = !!(this.keys.block && P.onGround && this.look.shield > 0);
      if (P.blocking) P.blockT = wasBlock ? P.blockT + dt : 0;
      else P.blockT = 0;

      P.vx +=
        (mv * moveSpd * (P.blocking ? 0.4 : 1) * (isSlowed ? 0.48 : 1) - P.vx) *
        Math.min(1, dt * (P.onGround ? 14 : 7));
      if (mv) P.face = mv;
      if (P.buf === 'jump' && P.coyote > 0) {
        P.vy = -JUMP;
        P.coyote = 0;
        P.buf = null;
        P.onGround = false;
      } else if (P.buf === 'roll' && P.onGround && P.st > 0) this.startRoll(mv);
      else if ((P.buf === 'atk' || P.buf === 'heavy') && P.st > 0) this.startAttack(P.buf === 'heavy', 1);
      else if (
        this.pressed.heal &&
        P.flasks > 0 &&
        (P.hp < this.maxHp() || P.statuses.some((s) => s.id === 'poison' || s.id === 'bleed'))
      ) {
        P.state = 'heal';
        P.t = 0;
        P.healed = false;
        P.flasks--;
      }
      if (this.pressed.use && P.onGround) {
        const chestIdx = this.nearChest();
        const loreIdx = this.nearLore();
        const npc = this.nearNpc();
        if (chestIdx >= 0) {
          this.openChest(chestIdx);
        } else if (loreIdx >= 0) {
          this.readLore(loreIdx);
        } else if (npc) {
          this.openNpcDialog(npc);
        } else if (this.nearFog()) {
          Object.assign(P, { state: 'fog', t: 0, face: 1, buf: null });
          SFX.roll();
        } else {
          const i = this.nearBrazier();
          if (i >= 0) this.rest(i);
        }
      }
    } else if (P.state === 'stagger') {
      P.t += dt;
      P.vx *= 0.88;
      if (Math.random() < 0.25) {
        this.spark(P.x + rnd(-10, 10), P.y - 62, 1, '#f6d27a', 50, 0.3, 0, 2);
      }
    } else if (P.state === 'atk') {
      P.t += dt;
      const { aw, aa, ar } = P;
      const wp = this.weaponDef();
      const cat = wp.category || 'melee';
      if (P.onGround) P.vx *= Math.pow(0.001, dt);
      if (P.t >= aw && P.t < aw + aa) {
        if (!P.swung) {
          P.swung = true;
          if (cat === 'melee') {
            SFX.swing();
            if (P.onGround) P.vx = P.face * (P.heavy ? 170 : 110);
            if (P.heavy) {
              this.shake = Math.max(this.shake, 3);
              this.dustPuff(P.x, P.y - 3, -P.face, 6);
              this.sparkStreaks(P.x + P.face * 20, P.y - 40, P.face, 6, '#f6d27a', 260, 0.22, 2.2);
            }
          } else {
            this.firePlayerWeapon();
          }
        }
        this.attackHits();
      }
      if (P.t >= aw + aa + ar) P.state = 'free';
      else if (P.t >= aw + aa + ar * 0.45 && P.buf) {
        if (P.buf === 'roll' && P.onGround && P.st > 0) this.startRoll(mv);
        else if (P.buf === 'atk' && !P.heavy && (P.combo || 1) < (cat === 'melee' ? 3 : 2) && P.st > 0) {
          if (mv) P.face = mv;
          this.startAttack(false, (P.combo || 1) + 1);
        } else if (P.buf === 'heavy' && P.st > 0) {
          if (mv) P.face = mv;
          this.startAttack(true, 1);
        }
      }
    } else if (P.state === 'roll') {
      P.t += dt;
      P.vx = (P.rdir || P.face) * ROLL * (1 - (0.5 * P.t) / RDUR);
      this.rollGhostTimer -= dt;
      if (this.isRollIframe() && this.rollGhostTimer <= 0) {
        this.rollGhostTimer = 0.045;
        this.rollGhosts.push({
          x: P.x,
          y: P.y,
          face: P.face,
          rot: (P.t / RDUR) * Math.PI * 2,
          a: 0.55,
        });
      }
      if (P.t >= RDUR) {
        P.state = 'free';
        P.inIframe = false;
      }
    } else if (P.state === 'hurt') {
      P.t += dt;
      P.vx *= 0.92;
      if (P.t >= 0.32) P.state = 'free';
    } else if (P.state === 'fog') {
      P.t += dt;
      P.vx = 75;
      P.inv = 0.4;
      if (Math.random() < 0.5) this.spark(P.x + rnd(-8, 8), P.y - rnd(10, 60), 1, '#cfd8d4', 40, 0.6, -20);
      const g = this.gate();
      if (!g) P.state = 'free';
      else if (P.x >= g.x0 + 64 || P.t > 2.5) {
        P.x = Math.max(P.x, g.x0 + 64);
        P.state = 'free';
        P.vx = 0;
        this.arena = ARENAS.indexOf(g);
        this.enemies = this.enemies.filter((e) => e.boss);
        this.shots = [];
        this.marks = [];
        this.traps = [];
        this.clouds = [];
        const bd = ET[g.boss];
        this.setBanner(bd.name || '', bd.sub || '', 3.2, '#e0b060');
        roar();
        this.shake = 10;
      }
    } else if (P.state === 'heal') {
      P.t += dt;
      P.vx = mv * 50;
      if (mv) P.face = mv;
      if (!P.healed && P.t >= 0.5) {
        P.healed = true;
        P.hp = Math.min(this.maxHp(), P.hp + this.maxHp() * 0.4 + 20);
        P.rally = 0;
        P.statuses = P.statuses.filter((s) => s.id !== 'poison' && s.id !== 'bleed');
        P.poisonBuild = 0;
        P.bleedBuild = 0;
        this.emitStatus(true);
        SFX.heal();
        this.spark(P.x, P.y - 40, 14, '#e89a3c', 120, 0.7, -200);
      }
      if (P.t >= 0.8) P.state = 'free';
    }

    this.updatePlayerStatuses(dt);

    moveEntity(P, dt);

    if (this.arena >= 0) {
      const a = ARENAS[this.arena];
      P.x = clamp(P.x, a.x0 + 18, a.x1 - 18);
      if (this.walls) P.x = clamp(P.x, this.walls.l + 16, this.walls.r - 16);
    } else {
      const g = this.gate();
      if (g && P.state !== 'fog') P.x = Math.min(P.x, g.x0 - 14);
    }

    const revealed = this.revealAroundPlayer();
    if (revealed) this.save();
    this.emitMiniMap(revealed);

    const z = clamp(Math.floor(P.x / ZONE), 0, NZ - 1);
    if (z !== this.lastZone && this.arena < 0) {
      const prevZ = this.lastZone;
      this.lastZone = z;
      const col = ZONE_TRANSITION_COLORS[z] || '#d8d0bd';
      this.zoneTrans = {
        fromZone: prevZ,
        toZone: z,
        title: ZONE_NAMES[z],
        subtitle: ZONE_SUBTITLES[z] || '',
        col,
        t: 0,
        dur: 2.8,
      };
      SFX.zoneTransition();
      this.setBanner(ZONE_NAMES[z], ZONE_SUBTITLES[z] || '', 2.6, col);
      const zoneLoreMap: Record<number, string> = {
        1: 'catedral_submersa',
        2: 'salao_coroa',
        3: 'lago_vazio',
        4: 'altar_pesadelo',
        5: 'bosque_enforcados',
        6: 'castelo_cainhurst',
        7: 'ossuario_yahargul',
        8: 'coro_celeste',
        9: 'sotao_mergo',
      };
      if (zoneLoreMap[z]) this.unlockLore(zoneLoreMap[z], true);
    }

    if (P.onGround && P.state === 'free' && supported(P.x, P.y)) {
      this.safe = { x: P.x, y: P.y };
    }
    if (P.y > H + 120) {
      this.killPlayer();
      return;
    }
    if (this.drop && Math.abs(this.drop.x - P.x) < 26 && Math.abs(this.drop.y - P.y) < 50) {
      this.S.cinzas += this.drop.n;
      this.floatText(P.x, P.y - 70, `+${this.drop.n} cinzas recuperadas`, '#9be0c0');
      this.drop = null;
      SFX.soul();
      this.save();
    }
    SHARDS.forEach((s, i) => {
      if (!this.S.got.includes(i) && Math.abs(s.x - P.x) < 22 && Math.abs(s.y - P.y) < 50) {
        this.S.got.push(i);
        const bonusCinzas = Math.round(150 * (1 + this.getRuneTotals().luckBonus));
        this.S.cinzas += bonusCinzas;
        this.floatText(s.x, s.y - 60, `Brasa antiga  +${bonusCinzas}`, '#bfe6ff');
        SFX.soul();
        this.save();
      }
    });
  }

  private bellsOf = (e: Enemy) => clamp(Math.ceil((4 * e.hp) / e.maxHp), 1, 4);
  private wave = (x: number, y: number, s: number, dmg = 24): Shot => ({
    kind: 'wave',
    x,
    y,
    vx: s * 330,
    vy: 0,
    hw: 14,
    h: 30,
    dmg,
    life: 1.5,
    gy: y,
  });

  private addCloud(x: number, y: number) {
    if (this.clouds.length > 9) this.clouds.shift();
    this.clouds.push({ x, y, r: 58, life: 7, tick: 0 });
    SFX.hiss();
  }

  private damageEnemy(
    e: Enemy,
    dmg: number,
    heavy: boolean,
    dir: number,
    isRangedOrMagic = false,
    applyStatus?: 'bleed' | 'poison' | 'burn'
  ) {
    const d = ET[e.type];
    if (e.state === 'reveal' || e.state === 'blink') return;
    if (e.boss && !e.fieldBoss && this.arena !== e.k) return;

    // Sentinela frontal tower shield block check
    if (e.type === 'sentinela' && e.guarding && !heavy && !isRangedOrMagic && dir !== e.face) {
      const chip = Math.max(2, Math.round(dmg * 0.2));
      e.hp -= chip;
      e.shown = 4;
      SFX.block();
      this.impactRing(e.x + e.face * 16, e.y - 44, '#d8d0bd', 4, 24, 0.16);
      this.sparkStreaks(e.x + e.face * 16, e.y - 44, -dir, 6, '#e8dcc8', 220, 0.22, 2);
      this.floatText(e.x, e.y - e.h - 10, 'Escudo!', '#d8d0bd');
      if (e.hp <= 0) this.killEnemy(e, dir);
      return;
    }

    if (e.type === 'sentinela' && e.guarding && (heavy || isRangedOrMagic || dir === e.face)) {
      e.guarding = false;
      this.floatText(e.x, e.y - e.h - 14, 'Guarda rompida!', '#f6d27a');
    }

    const rt = this.getRuneTotals();
    const isCrit = rt.luckBonus > 0 && Math.random() < rt.luckBonus * 0.6;
    if (isCrit) dmg = Math.round(dmg * 1.5);
    if (e.vuln) dmg = Math.round(dmg * 1.5);
    e.hp -= dmg;
    e.flash = 0.12;
    e.shown = 4;
    this.blood(e.x, e.y - e.h * 0.6, dir);
    if (isCrit) {
      this.spark(e.x, e.y - e.h * 0.65, 10, '#f2c96d', 200, 0.4, 240, 2.5);
      this.floatText(e.x, e.y - e.h - 22, `Crítico! -${dmg}`, '#f2c96d');
    }
    SFX.hit();
    if (e.state === 'idle' || e.state === 'ring') e.state = 'chase';
    e.heard = 4;
    if (e.type === 'viuva' && e.hp > 0) {
      const b = this.bellsOf(e);
      if (b < e.bells) {
        e.bells = b;
        this.floatText(e.x, e.y - e.h - 12, 'Sino partido', '#b08a3c');
        SFX.crack();
        this.spark(e.x, e.y - 60, 10, '#a67c32', 200, 0.6);
      }
    }
    if (e.hp <= 0) {
      this.killEnemy(e, dir);
    } else {
      const wp = this.weaponDef();
      const poiseHit = (heavy ? 55 : 22) * (wp.type === 'machado' || wp.type === 'montante' ? 1.5 : 1);
      e.poiseDmg = (e.poiseDmg || 0) + poiseHit;
      const threshold = e.boss ? 160 : d.poise ? 95 : 45;
      if (e.poiseDmg >= threshold) {
        e.poiseDmg = 0;
        this.applyEnemyStatus(e, 'stagger', e.boss ? 1.1 : 1.25);
        e.vx = dir * (e.boss ? 0 : 180);
      } else if (!d.poise || (heavy && !e.boss && e.type !== 'viuva')) {
        e.state = 'hurt';
        e.t = heavy ? 0.42 : 0.22;
        e.vx = dir * (heavy ? 230 : 120);
      }

      const st = applyStatus || wp.statusApply;
      const statusChance = (heavy ? 0.72 : 0.4) + rt.luckBonus * 0.5;
      if (st && !e.dead && Math.random() < statusChance) {
        this.applyEnemyStatus(e, st, 3.2);
      }
    }
  }

  private bossDown(e: Enemy) {
    if (e.fieldBoss) {
      if (e.fieldId && !this.S.deadField.includes(e.fieldId)) this.S.deadField.push(e.fieldId);
      const fLore = e.type === 'cacador' ? 'boss_cacador' : e.type === 'fera' ? 'boss_fera' : '';
      if (fLore) this.unlockLore(fLore, false);
      this.setBanner(
        e.type === 'cacador' ? 'O caçador repousa' : 'A prece silenciou',
        ET[e.type].name || 'Fera derrotada',
        3.6,
        '#e0b060'
      );
      SFX.bell();
      this.spark(e.x, e.y - 60, 50, '#e89a3c', 320, 1.4, 200, 2.8);
      this.impactRing(e.x, e.y - 60, '#f6d27a', 16, 140, 0.45);
      this.shake = 14;
      this.save();
      return;
    }

    this.S.dead[e.k] = true;
    this.arena = -1;
    this.shots = [];
    this.marks = [];
    this.traps = [];
    this.clouds = [];
    this.walls = null;
    const last = this.S.dead.every(Boolean);
    const bossLoreIds = [
      'boss_madre',
      'boss_santo',
      'boss_rei',
      'boss_rom',
      'boss_amigdala',
      'boss_bruxa',
      'boss_martir',
      'boss_renascido',
      'boss_ebrietas',
      'boss_ama',
    ];
    if (bossLoreIds[e.k]) this.unlockLore(bossLoreIds[e.k], false);
    this.setBanner(
      [
        'As bocas se fecharam',
        'O santo desceu',
        'O rei está nu',
        'O véu do lago se partiu',
        'O pesadelo foi silenciado',
        'Os olhos do bosque cegaram',
        'O selo de Cainhurst ruiu',
        'A carne do ossuário tombou',
        'O lamento estelar cessou',
        'O eclipse se inclina diante de ti',
      ][e.k] || 'Horror derrotado',
      last ? 'O destino final de Velmora desperta' : 'O caminho adiante se abre',
      5,
      '#e0b060'
    );
    SFX.bell();
    this.spark(e.x, e.y - 60, 70, '#e89a3c', 380, 1.6, 200, 3);
    this.impactRing(e.x, e.y - 60, '#f6d27a', 20, 180, 0.55);
    this.shake = 16;
    if (e.k === 9) {
      this.S.endingSeen = true;
      if (this.endingTimer !== null) clearTimeout(this.endingTimer);
      this.endingTimer = window.setTimeout(() => this.triggerEnding(), 2200);
    }
    this.save();
    this.emitRest();
    this.emitMiniMap(true);
  }

  private canStep = (e: Enemy, m: number) => m === 0 || supported(e.x + m * (e.hw + 8), e.y);

  private meleeHit(e: Enemy, range: number, dmg: number) {
    if (e.hit) return;
    const x0 = e.face > 0 ? e.x : e.x - range;
    const x1 = x0 + range;
    if (
      this.P.x + this.P.hw > x0 &&
      this.P.x - this.P.hw < x1 &&
      this.P.y > e.y - e.h - 10 &&
      this.P.y - this.P.h < e.y + 6
    ) {
      if (this.hurtPlayer(dmg, e.x, e)) e.hit = true;
    }
  }

  private alertNear(e: Enemy) {
    for (const o of this.enemies) {
      if (!o.boss && !o.dead && !o.pending && (o.spawnTime || 0) <= 0 && o !== e && o.k === e.k && Math.abs(o.x - e.x) < 650) {
        o.alert = 7;
        if (o.state === 'idle') o.state = 'chase';
      }
    }
  }

  private updateEnemy(e: Enemy, dt: number) {
    const d = ET[e.type];
    e.anim += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.shown = Math.max(0, e.shown - dt);
    e.bleedCd = Math.max(0, (e.bleedCd || 0) - dt);
    e.bleedBuild = Math.max(0, (e.bleedBuild || 0) - 8 * dt);
    if (e.pending) {
      if (!this.P.dead && Math.abs(this.P.x - e.x) < 520 && Math.abs(this.P.y - e.y) < 220) {
        e.pending = false;
        e.spawnTime = e.spawnTotal || (e.spawnMode === 'sky' ? 1.25 : 1.0);
        e.face = this.P.x >= e.x ? 1 : -1;
        SFX.chain();
      }
      return;
    }
    if ((e.spawnTime || 0) > 0) {
      e.spawnTime = (e.spawnTime || 0) - dt;
      if (e.spawnTime <= 0) {
        e.spawnTime = 0;
        this.addRubble(e.x, e.y, e.spawnMode === 'sky' ? 20 : 14);
        this.shake = Math.max(this.shake, 5);
        SFX.slam();
      }
      return;
    }
    if (e.statuses.length) {
      for (const s of e.statuses) {
        s.remaining -= dt;
        if (s.id === 'poison') {
          s.tick = (s.tick ?? 0.8) - dt;
          if (s.tick <= 0) {
            s.tick = 0.8;
            e.hp -= Math.max(4, Math.round(e.maxHp * 0.025));
            e.shown = 4;
            this.spark(e.x, e.y - e.h * 0.5, 4, '#78c257', 60, 0.4, -20, 2);
            if (e.hp <= 0) this.killEnemy(e, e.face);
          }
        } else if (s.id === 'burn') {
          s.tick = (s.tick ?? 0.65) - dt;
          if (Math.random() < 0.3) {
            this.spark(e.x + rnd(-e.hw * 0.6, e.hw * 0.6), e.y - rnd(12, e.h * 0.8), 1, '#ff7d30', 35, 0.35, -90, 2.2);
          }
          if (s.tick <= 0) {
            s.tick = 0.65;
            e.hp -= Math.max(6, Math.round(e.maxHp * 0.03));
            e.shown = 4;
            this.spark(e.x, e.y - e.h * 0.55, 5, '#ff6a2e', 90, 0.4, -70, 2.3);
            if (e.hp <= 0) this.killEnemy(e, e.face);
          }
        }
      }
      e.statuses = e.statuses.filter((s) => s.remaining > 0);
      if (!e.statuses.some((s) => s.id === 'stagger') && e.state === 'hurt' && e.vuln) {
        e.vuln = false;
      }
    }
    if (e.dead) {
      e.t -= dt;
      e.vx *= 0.9;
      moveEntity(e, dt);
      if (e.t <= 0) e.gone = true;
      return;
    }
    if (e.y > H + 200) {
      e.gone = true;
      return;
    }
    if (e.boss) {
      if (e.fieldBoss) {
        if (e.type === 'cacador') this.aiCacador(e, dt);
        else if (e.type === 'fera') this.aiFera(e, dt);
      } else if (this.arena === e.k) {
        if (e.type === 'madre') this.aiMadre(e, dt);
        else if (e.type === 'santo') this.aiSanto(e, dt);
        else if (e.type === 'rei') this.aiRei(e, dt);
        else if (e.type === 'rom') this.aiRom(e, dt);
        else if (e.type === 'amigdala') this.aiAmigdala(e, dt);
        else if (e.type === 'bruxa') this.aiBruxa(e, dt);
        else if (e.type === 'martir') this.aiMartir(e, dt);
        else if (e.type === 'renascido') this.aiRenascido(e, dt);
        else if (e.type === 'ebrietas') this.aiEbrietas(e, dt);
        else if (e.type === 'ama') this.aiAma(e, dt);
      } else if (e.type !== 'santo') moveEntity(e, dt);
      return;
    }

    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const dy = Math.abs(this.P.y - e.y);

    // Flying Gargoyle AI
    if (e.type === 'gargula') {
      this.aiGargula(e, dt, dx, dist, dy);
      return;
    }

    if (dist > 1400 && e.state === 'idle') return;
    e.cd = Math.max(0, e.cd - dt);
    e.alert = Math.max(0, (e.alert || 0) - dt);

    const blind = e.type === 'costureira';
    if (blind) {
      const loud =
        !this.P.dead &&
        dy < 130 &&
        ((this.P.onGround && Math.abs(this.P.vx) > 100 && dist < (d.aggro || 440)) || dist < 60);
      if (loud) e.heard = 3;
      else e.heard = Math.max(0, (e.heard || 0) - dt);
      e.tcd = Math.max(0, (e.tcd || 0) - dt);
    }
    const see = !this.P.dead && (blind ? (e.heard || 0) > 0 : dist < (d.aggro || 360) && dy < 150);

    switch (e.state) {
      case 'idle':
        e.vx = 0;
        e.vuln = false;
        if (e.type === 'sentinela') e.guarding = true;
        if (see) {
          if (e.type === 'peregrino' && !e.rung && dist > 90) {
            e.rung = true;
            e.state = 'ring';
            e.t = 0.9;
            e.face = dx >= 0 ? 1 : -1;
          } else e.state = 'chase';
        }
        break;
      case 'ring':
        e.vx = 0;
        e.t -= dt;
        if (e.t <= 0) {
          SFX.handbell();
          this.alertNear(e);
          this.spark(e.x, e.y - 56, 10, '#d8c9a0', 160, 0.6, 0);
          e.state = 'chase';
        }
        break;
      case 'chase':
        e.vuln = false;
        if (e.type === 'sentinela') e.guarding = true;
        if (
          this.P.dead ||
          (blind ? !((e.heard || 0) > 0) : dist > (d.aggro || 360) * 1.7 && !((e.alert || 0) > 0))
        ) {
          e.state = 'idle';
          break;
        }
        e.face = dx >= 0 ? 1 : -1;
        const spdM = this.spdHard();
        const cdM = this.cdHard();
        if (e.type === 'viuva') {
          const m = dist > 280 ? e.face : 0;
          e.vx = this.canStep(e, m) ? m * (d.spd || 26) * spdM : 0;
          if (e.cd <= 0 && dist < (d.range || 460) && dy < 110) {
            e.state = 'wind';
            e.t = (d.wind || 0.9) * cdM;
            e.vx = 0;
            SFX.handbell();
          }
        } else if (e.type === 'atirador' || e.type === 'alquimista' || e.type === 'emissario' || e.type === 'monge_gaiola') {
          const isCaster = e.type === 'emissario' || e.type === 'monge_gaiola';
          const idealMin = e.type === 'atirador' ? 180 : isCaster ? 165 : 140;
          const range = d.range || 420;
          if (e.type === 'monge_gaiola' && dist < 85 && e.cd <= 0 && Math.random() < 0.5) {
            // Erudito da Gaiola fades in fog when cornered
            this.spark(e.x, e.y - 40, 14, '#9ed7f0', 180, 0.45, -20, 2.2);
            const targetX = clamp(e.x - e.face * 190, e.minX + 30, e.maxX - 30);
            if (supported(targetX, e.y)) e.x = targetX;
            this.spark(e.x, e.y - 40, 14, '#9ed7f0', 180, 0.45, -20, 2.2);
            SFX.cosmic();
            e.cd = 1.4 * cdM;
          } else if (dist < idealMin) {
            const back = -e.face;
            e.vx = this.canStep(e, back) ? back * (d.spd || 60) * 0.9 * spdM : 0;
          } else if (dist > range * 0.92) {
            e.vx = this.canStep(e, e.face) ? e.face * (d.spd || 60) * spdM : 0;
          } else {
            e.vx = 0;
          }
          if (e.cd <= 0 && dist < range && dy < 150) {
            e.state = 'wind';
            e.t = (d.wind || 0.7) * cdM;
            e.vx = 0;
            if (isCaster) SFX.cast();
          }
        } else if (blind && (e.tcd || 0) <= 0 && dist > 120 && dist < 400 && e.onGround) {
          e.state = 'sew';
          e.t = 0.6 * cdM;
          e.vx = 0;
        } else {
          const range = d.range || 50;
          const isLeaper = e.type === 'cao' || e.type === 'lobisomem' || e.type === 'besta_eletrica';
          const inR = dist < range * (isLeaper ? 1 : 0.88) && dy < 80;
          if (inR && e.cd <= 0) {
            e.state = 'wind';
            e.t = (d.wind || 0.5) * cdM;
            e.vx = 0;
            e.n = 0;
            if (isLeaper) SFX.growl();
          } else {
            const m = dist > range * 0.55 ? e.face : 0;
            e.vx = this.canStep(e, m) ? m * (d.spd || 70) * spdM : 0;
          }
          if (e.type === 'cavaleiro') {
            e.scd = (e.scd === undefined ? 3 : e.scd) - dt;
            if (e.scd <= 0) {
              e.scd = 4.5 * cdM;
              this.addCloud(e.x, e.y);
            }
          }
          if (e.type === 'besta_eletrica' && dist > 180 && dist < 380 && e.cd <= 0) {
            e.state = 'wind';
            e.t = 0.58 * cdM;
            e.vx = 0;
            e.n = 1; // electrical bolt mode
            SFX.lightning();
          }
        }
        break;
      case 'sew':
        e.vx = 0;
        e.t -= dt;
        if (e.t <= 0) {
          const tx = e.x + e.face * clamp(dist * 0.55, 70, 190);
          if (supported(tx, e.y) && this.traps.length < 10) {
            this.traps.push({ x: tx, y: e.y, w: 56, life: 10 });
          }
          e.tcd = 4.5 * this.cdHard();
          e.state = 'chase';
          SFX.snip();
        }
        break;
      case 'wind':
        e.vx = 0;
        e.t -= dt;
        if (e.t <= 0) {
          e.state = 'act';
          e.t = (d.act || 0.14);
          e.hit = false;
          if (e.type === 'sentinela') e.guarding = false;
          const spdM = this.spdHard();
          const cdM = this.cdHard();
          if (e.type === 'cao') {
            e.vx = e.face * 440 * spdM;
            e.vy = -250;
            SFX.bark();
          } else if (e.type === 'lobisomem') {
            e.vx = e.face * 420 * spdM;
            e.vy = -210;
            SFX.growl();
          } else if (e.type === 'besta_eletrica') {
            if (e.n === 1) {
              SFX.lightning();
              const aimX = this.P.x - e.x;
              const aimY = this.P.y - 36 - (e.y - 36);
              const len = Math.hypot(aimX, aimY) || 1;
              this.shots.push({
                kind: 'lightning',
                x: e.x + e.face * 24,
                y: e.y - 36,
                vx: (aimX / len) * 540 * spdM,
                vy: (aimY / len) * 540 * spdM,
                hw: 12,
                h: 10,
                dmg: (d.dmg || 30) * e.zm,
                life: 1.4,
                col: '#9fe6ff',
              });
              e.state = 'rec';
              e.t = (d.rec || 0.85) * cdM;
            } else {
              e.vx = e.face * 460 * spdM;
              e.vy = -220;
              SFX.lightning();
            }
          } else if (e.type === 'emissario') {
            SFX.cast();
            const aimX = this.P.x - e.x;
            const aimY = this.P.y - 36 - (e.y - 44);
            const len = Math.hypot(aimX, aimY) || 1;
            for (const angOff of [-0.14, 0.14]) {
              const baseAng = Math.atan2(aimY / len, aimX / len) + angOff;
              this.shots.push({
                kind: 'star',
                x: e.x + e.face * 18,
                y: e.y - 44,
                vx: Math.cos(baseAng) * 340 * spdM,
                vy: Math.sin(baseAng) * 340 * spdM,
                hw: 10,
                h: 10,
                dmg: (d.dmg || 22) * e.zm,
                life: 1.8,
                col: '#9ed7f0',
              });
            }
            e.state = 'rec';
            e.t = (d.rec || 1.05) * cdM;
          } else if (e.type === 'monge_gaiola') {
            SFX.cosmic();
            const aimX = this.P.x - e.x;
            const aimY = this.P.y - 38 - (e.y - 44);
            const len = Math.hypot(aimX, aimY) || 1;
            this.shots.push({
              kind: 'arcane_lance',
              x: e.x + e.face * 20,
              y: e.y - 44,
              vx: (aimX / len) * 470 * spdM,
              vy: (aimY / len) * 470 * spdM,
              hw: 15,
              h: 9,
              dmg: (d.dmg || 28) * e.zm,
              life: 1.5,
              col: '#c98cf2',
            });
            if (Math.random() < 0.55) {
              this.marks.push({
                x: clamp(this.P.x, e.minX + 30, e.maxX - 30),
                t: 0.72,
                kind: 'bind_ring',
                dmg: 16 * e.zm,
              });
            }
            e.state = 'rec';
            e.t = (d.rec || 0.96) * cdM;
          } else if (e.type === 'viuva') {
            e.state = 'volley';
            e.n = this.bellsOf(e);
            e.t = 0;
          } else if (e.type === 'atirador') {
            SFX.gunshot();
            this.shots.push({
              kind: 'bullet',
              x: e.x + e.face * 24,
              y: e.y - 42,
              vx: e.face * 640 * spdM,
              vy: 0,
              hw: 8,
              h: 6,
              dmg: (d.dmg || 22) * e.zm,
              life: 1.3,
              gy: e.y,
            });
            this.sparkStreaks(e.x + e.face * 26, e.y - 42, e.face, 7, '#f6d27a', 260, 0.2, 2);
            e.state = 'rec';
            e.t = (d.rec || 1.15) * cdM;
          } else if (e.type === 'alquimista') {
            SFX.swing();
            const throwVx = clamp((this.P.x - e.x) * 1.15, -340, 340);
            this.shots.push({
              kind: 'vial',
              x: e.x + e.face * 16,
              y: e.y - 42,
              vx: throwVx,
              vy: -430,
              hw: 8,
              h: 10,
              dmg: (d.dmg || 15) * e.zm,
              life: 2.0,
              gy: e.y,
              grav: 980,
            });
            e.state = 'rec';
            e.t = (d.rec || 1.1) * cdM;
          } else {
            e.vx = e.face * (e.type === 'sentinela' ? 140 : e.type === 'sombra' ? 240 : 70) * spdM;
            if (e.type === 'sombra') {
              SFX.fire();
              if (dist > 70) {
                this.shots.push({
                  kind: 'fire_wave',
                  x: e.x + e.face * 24,
                  y: e.y,
                  vx: e.face * 340 * spdM,
                  vy: 0,
                  hw: 16,
                  h: 34,
                  dmg: 22 * e.zm,
                  life: 0.9,
                  gy: e.y,
                  col: '#ff642e',
                });
              }
            } else {
              SFX.swing();
            }
            if (e.type === 'cavaleiro') this.addCloud(e.x + e.face * 70, e.y);
          }
        }
        break;
      case 'volley':
        e.t -= dt;
        if (e.t <= 0) {
          if (e.n <= 0) {
            e.state = 'rec';
            e.t = (d.rec || 1.2) * this.cdHard();
          } else {
            const high = this.bellsOf(e) >= 3 && e.n % 2 === 0;
            this.shots.push({
              kind: 'sound',
              x: e.x + e.face * 26,
              y: e.y - (high ? 40 : 0),
              vx: e.face * 290 * this.spdHard(),
              vy: 0,
              hw: 10,
              h: high ? 26 : 30,
              dmg: (d.dmg || 20) * e.zm,
              life: 1.7,
              gy: e.y,
            });
            SFX.handbell();
            e.n--;
            e.t = 0.45 * this.cdHard();
          }
        }
        break;
      case 'act':
        e.t -= dt;
        if (e.type === 'cao' || e.type === 'lobisomem' || e.type === 'besta_eletrica') {
          if (
            !e.hit &&
            Math.abs(this.P.x - e.x) < e.hw + this.P.hw + 8 &&
            this.P.y > e.y - e.h &&
            this.P.y - this.P.h < e.y
          ) {
            if (this.hurtPlayer((d.dmg || 20) * e.zm, e.x, e)) e.hit = true;
          }
          if (e.t <= 0 || (e.onGround && e.t < (d.act || 0.35) - 0.12)) {
            e.state = 'rec';
            e.t = (e.hit ? d.rec || 0.65 : 1.05) * this.cdHard();
            e.vuln = !e.hit;
          }
        } else {
          this.meleeHit(e, d.range || 50, (d.dmg || 20) * e.zm);
          if (e.t <= 0) {
            if ((blind || e.type === 'sombra') && e.n < 1) {
              e.n++;
              e.state = 'wind';
              e.t = 0.16 * this.cdHard();
            } else {
              e.state = 'rec';
              e.t = (d.rec || 0.6) * this.cdHard();
              if (e.type === 'carrasco' || e.type === 'sentinela') {
                e.vuln = true;
                this.spark(e.x + e.face * 65, e.y, 10, '#8a8478', 180, 0.5);
                this.addRubble(e.x + e.face * 55, e.y, 10);
                this.shake = Math.max(this.shake, 5);
                SFX.slam();
                if (e.type === 'sentinela') {
                  this.shots.push(this.wave(e.x + e.face * 30, e.y, e.face, 18));
                }
              }
            }
          }
        }
        break;
      case 'rec':
        e.vx *= 0.85;
        e.t -= dt;
        if (e.t <= 0) {
          e.state = 'chase';
          e.vuln = false;
          if (e.type === 'sentinela') e.guarding = true;
          e.cd = (e.type === 'viuva' ? 1.4 : e.type === 'atirador' ? 0.9 : 0.35) * this.cdHard();
        }
        break;
      case 'hurt':
        e.t -= dt;
        e.vx *= 0.88;
        if (e.t <= 0) {
          e.state = 'chase';
          e.vuln = false;
          if (e.type === 'sentinela') e.guarding = true;
        }
        break;
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, e.minX, e.maxX);
  }

  private aiGargula(e: Enemy, dt: number, dx: number, dist: number, dy: number) {
    const d = ET.gargula;
    const baseY = (e.baseY ?? 440) - 110;
    e.cd = Math.max(0, e.cd - dt);
    const see = !this.P.dead && dist < (d.aggro || 540) && dy < 240;

    if (e.state === 'idle') {
      e.vx = 0;
      e.y += (baseY + Math.sin(e.anim * 2.5) * 8 - e.y) * Math.min(1, dt * 4);
      if (see) e.state = 'chase';
    } else if (e.state === 'chase') {
      if (this.P.dead || dist > 860) {
        e.state = 'idle';
        return;
      }
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 70 ? e.face * (d.spd || 125) : 0;
      e.y += (baseY + Math.sin(e.anim * 3.5) * 14 - e.y) * Math.min(1, dt * 4);
      if (e.cd <= 0 && dist < 290) {
        e.state = 'wind';
        e.t = d.wind || 0.58;
        e.vx = 0;
        e.n = dist < 170 ? 0 : 1; // 0 = swoop dive, 1 = feather bolts
        SFX.shriek();
      }
    } else if (e.state === 'wind') {
      e.t -= dt;
      e.y += (baseY - 22 - e.y) * Math.min(1, dt * 6);
      if (e.t <= 0) {
        if (e.n === 1) {
          // Drop two cursed ash feathers
          for (const spread of [-65, 65]) {
            this.shots.push({
              kind: 'feather',
              x: e.x + e.face * 12,
              y: e.y - 20,
              vx: clamp(dx * 1.4 + spread, -260, 260),
              vy: 360,
              hw: 8,
              h: 12,
              dmg: 22 * e.zm,
              life: 1.5,
              gy: e.baseY ?? 440,
            });
          }
          e.state = 'rec';
          e.t = 0.7;
        } else {
          e.state = 'act';
          e.t = 0.48;
          e.hit = false;
          e.vx = e.face * 340;
          e.vy = 290;
        }
      }
    } else if (e.state === 'act') {
      e.t -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y >= (e.baseY ?? 440)) {
        e.y = e.baseY ?? 440;
        e.vy = -120;
      }
      if (
        !e.hit &&
        Math.abs(this.P.x - e.x) < e.hw + this.P.hw + 6 &&
        this.P.y > e.y - e.h &&
        this.P.y - this.P.h < e.y + 8
      ) {
        if (this.hurtPlayer((d.dmg || 28) * e.zm, e.x, e)) e.hit = true;
      }
      if (e.t <= 0) {
        e.state = 'rec';
        e.t = 0.85;
      }
    } else if (e.state === 'rec' || e.state === 'hurt') {
      e.t -= dt;
      e.vx *= 0.9;
      e.x += e.vx * dt;
      e.y += (baseY - e.y) * Math.min(1, dt * 3.5);
      if (e.t <= 0) {
        e.state = 'chase';
        e.vuln = false;
        e.cd = 0.85;
      }
    }
    e.x = clamp(e.x, e.minX, e.maxX);
  }

  private bossStart(e: Enemy, st: string, dur: number) {
    e.state = st;
    e.ph = 0;
    e.t = 0;
    e.dur = dur;
    e.n = 0;
    e.hit = false;
    e.vx = 0;
  }

  private aiMadre(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const p2 = e.hp < e.maxHp * 0.5;
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    e.cd = Math.max(0, e.cd - dt);
    e.ecd = Math.max(0, (e.ecd === undefined ? 5 : e.ecd) - dt);
    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('O manto se abre', 'As mandíbulas clamam por sangue', 2.4, '#e0752d');
      roar();
      this.shake = 12;
      this.impactRing(e.x, e.y - 60, '#a32424', 18, 140, 0.4);
      // Summon one hound minion in Phase 2
      if (!e.summoned) {
        e.summoned = true;
        const hx = clamp(e.x - e.face * 120, A.x0 + 60, A.x1 - 60);
        const h = this.mkEnemy('cao', hx, 440, e.k);
        h.minX = A.x0 + 20;
        h.maxX = A.x1 - 20;
        h.state = 'chase';
        this.enemies.push(h);
      }
    }
    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 150 ? e.face * (p2 ? 36 : 24) : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (p2 && e.ecd <= 0) {
          e.ecd = 11;
          this.walls = {
            l: Math.max(A.x0 + 4, this.P.x - 240),
            r: Math.min(A.x1 - 4, this.P.x + 240),
            tl: this.P.x - 100,
            tr: this.P.x + 100,
            life: 4.6,
          };
          this.bossStart(e, 'bites', 0.45);
          e.n = 6;
          SFX.slam();
        } else if (dist < 170 && r < 0.45) {
          this.bossStart(e, 'lash', 0.58);
        } else if (r < 0.72) {
          this.bossStart(e, 'bites', 0.4);
          e.n = p2 ? 6 : 4;
        } else {
          // Blood ember & pyromancy spit barrage
          this.bossStart(e, 'spit', 0.55);
          e.n = p2 ? 4 : 3;
        }
      }
    } else if (e.state === 'bites') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = p2 ? 0.32 : 0.44;
        e.n--;
        this.marks.push({
          x: clamp(this.P.x + this.P.vx * 0.2, A.x0 + 30, A.x1 - 30),
          t: 0.62,
          kind: p2 && e.n % 2 === 0 ? 'pyro_pillar' : 'maw',
          dmg: 24,
        });
      } else if (e.n <= 0 && e.t >= 0.9) {
        e.state = 'chase';
        e.cd = p2 ? 0.45 : 0.85;
      }
    } else if (e.state === 'spit') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.26;
        e.n--;
        SFX.fire();
        const aimVx = clamp((this.P.x - e.x) * 1.1 + rnd(-70, 70), -380, 380);
        this.shots.push({
          kind: p2 || e.n % 2 === 0 ? 'fireball' : 'ember',
          x: e.x + e.face * 20,
          y: e.y - 76,
          vx: aimVx,
          vy: -360,
          hw: 11,
          h: 11,
          dmg: 21,
          life: 1.8,
          gy: 440,
          grav: 840,
          explodeR: 54,
          col: '#ff7d30',
        });
        if (p2 && e.n === 1) {
          this.marks.push({
            x: clamp(this.P.x + rnd(-50, 50), A.x0 + 40, A.x1 - 40),
            t: 0.72,
            kind: 'pyro_pillar',
            dmg: 24,
          });
        }
      } else if (e.n <= 0 && e.t >= 0.6) {
        e.state = 'chase';
        e.cd = p2 ? 0.5 : 0.85;
      }
    } else if (e.state === 'lash') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          SFX.swing();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 180, 30);
        if (e.t >= 0.2) {
          e.ph = 2;
          e.t = 0;
          if (p2) {
            SFX.fire();
            this.shots.push({
              kind: 'fire_wave',
              x: e.x + e.face * 45,
              y: 440,
              vx: e.face * 360,
              vy: 0,
              hw: 18,
              h: 38,
              dmg: 24,
              life: 1.35,
              gy: 440,
              col: '#ff642e',
            });
          }
        }
      } else if (e.t >= 0.75) {
        e.state = 'chase';
        e.cd = 0.5;
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 80, A.x1 - 80);
  }

  private aiSanto(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const gy = 440;
    const dx = this.P.x - e.x;
    if (e.ceil) {
      if (e.hp < e.maxHp * 0.55 && e.state !== 'fall') {
        e.state = 'fall';
        e.vy = 0;
        this.setBanner('O santo despenca', 'As correntes rompem na catedral', 2.3, '#e0752d');
        roar();
      }
      if (e.state === 'fall') {
        e.vy += 1500 * dt;
        e.y += e.vy * dt;
        if (e.y >= gy) {
          e.y = gy;
          e.vy = 0;
          e.ceil = false;
          e.h = 64;
          e.hw = 44;
          this.shake = 15;
          this.addRubble(e.x, gy, 24);
          this.impactRing(e.x, gy - 20, '#d8c9a0', 14, 120, 0.38);
          SFX.slam();
          for (const s of [-1, 1]) this.shots.push(this.wave(e.x + s * 40, gy, s, 26));
          this.bossStart(e, 'tired', 1.1);
        }
        return;
      }
      e.t += dt;
      if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
        e.state = 'hover';
        e.t = 0;
      }
      if (e.state !== 'descend') e.x += clamp(this.P.x - e.x, -165 * dt, 165 * dt);
      let ty = 230;
      if (e.state === 'hover') {
        if (e.t >= 1.0) {
          e.state = 'chains';
          e.t = 0;
          e.n = 3;
          e.dur = 0;
        }
      } else if (e.state === 'chains') {
        if (e.n > 0 && e.t >= e.dur) {
          e.t = 0;
          e.dur = 0.45;
          e.n--;
          this.marks.push({
            x: this.P.x,
            t: 0.68,
            kind: e.n % 2 === 0 ? 'solar_glyph' : 'chain',
            dmg: 24,
          });
          // Also drop golden bell bolt / solar lance toward player
          this.shots.push({
            kind: e.n === 0 ? 'arcane_lance' : 'sound',
            x: e.x,
            y: e.y - 20,
            vx: clamp(dx * 0.9, -240, 240),
            vy: 320,
            hw: 10,
            h: 16,
            dmg: 19,
            life: 1.5,
            gy,
            col: e.n === 0 ? '#ffe178' : undefined,
          });
        } else if (e.n <= 0 && e.t >= 0.85) {
          e.state = 'descend';
          e.t = 0;
          e.swept = false;
        }
      } else if (e.state === 'descend') {
        ty = 404;
        if (!e.swept && e.t > 0.55) {
          e.swept = true;
          SFX.chain();
          for (const s of [-1, 1]) {
            this.shots.push(this.wave(e.x + s * 30, gy, s));
            this.shots.push({
              kind: 'arcane_lance',
              x: e.x + s * 24,
              y: gy - 34,
              vx: s * 440,
              vy: 0,
              hw: 16,
              h: 8,
              dmg: 20,
              life: 1.25,
              col: '#ffe178',
            });
          }
        }
        if (e.t >= 2.8) {
          e.state = 'hover';
          e.t = 0;
        }
      }
      e.y += (ty - e.y) * Math.min(1, dt * 4);
      e.x = clamp(e.x, A.x0 + 60, A.x1 - 60);
      e.face = dx >= 0 ? 1 : -1;
      return;
    }

    // Phase 2 Fallen Saint
    e.t += dt;
    if (e.state === 'tired') {
      e.vx *= 0.85;
      e.vuln = true;
      if (e.t >= e.dur) {
        e.vuln = false;
        if ((e.dn || 0) >= 2) {
          e.dn = 0;
          e.state = 'chains';
          e.t = 0;
          e.n = 4;
          e.dur = 0;
          // Bell nova burst
          SFX.handbell();
          for (const s of [-1, 1]) {
            this.shots.push({
              kind: 'sound',
              x: e.x + s * 20,
              y: e.y - 34,
              vx: s * 310,
              vy: 0,
              hw: 12,
              h: 24,
              dmg: 22,
              life: 1.6,
              gy,
            });
          }
        } else {
          e.state = 'cwind';
          e.t = 0;
          e.face = dx >= 0 ? 1 : -1;
        }
      }
    } else if (e.state === 'cwind') {
      e.vx = 0;
      if (e.t >= 0.48) {
        e.state = 'dash';
        e.t = 0;
        e.hit = false;
        e.sx = this.P.x;
        SFX.shriek();
      }
    } else if (e.state === 'dash') {
      e.vx = e.face * 590;
      if (
        !e.hit &&
        Math.abs(this.P.x - e.x) < e.hw + this.P.hw &&
        this.P.y > e.y - e.h &&
        this.P.y - this.P.h < e.y
      ) {
        if (this.hurtPlayer(30, e.x - e.face * 10, e)) e.hit = true;
      }
      if (
        e.t > 1.2 ||
        e.x <= A.x0 + 70 ||
        e.x >= A.x1 - 70 ||
        (e.x - (e.sx || 0)) * e.face > 280
      ) {
        e.dn = (e.dn || 0) + 1;
        if (e.dn === 1) {
          // Instant feint second dash!
          e.state = 'cwind';
          e.t = 0.16;
          e.face = this.P.x >= e.x ? 1 : -1;
        } else {
          this.bossStart(e, 'tired', 1.15);
        }
      }
    } else if (e.state === 'chains') {
      e.vx = 0;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.36;
        e.n--;
        this.marks.push({
          x: clamp(this.P.x + rnd(-90, 90), A.x0 + 50, A.x1 - 50),
          t: 0.65,
          kind: e.n % 2 === 0 ? 'solar_glyph' : 'chain',
          dmg: 24,
        });
        if (e.n === 1) {
          SFX.cast();
          this.shots.push({
            kind: 'arcane_lance',
            x: e.x + e.face * 24,
            y: e.y - 36,
            vx: e.face * 490,
            vy: 0,
            hw: 16,
            h: 8,
            dmg: 22,
            life: 1.3,
            col: '#ffe178',
          });
        }
      } else if (e.n <= 0 && e.t >= 0.55) {
        e.state = 'cwind';
        e.t = 0;
        e.face = dx >= 0 ? 1 : -1;
      }
    } else this.bossStart(e, 'tired', 0.6);
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 60, A.x1 - 60);
  }

  private aiRei(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const m = e.hp > (e.maxHp * 2) / 3 ? 0 : e.hp > e.maxHp / 3 ? 1 : 2;
    const sp = [1, 0.72, 0.74][m];
    if (m !== e.mask) {
      e.mask = m;
      this.bossStart(e, 'reveal', 1.3);
      this.setBanner(
        'Uma máscara se parte',
        ['', 'Fase II · A fera por baixo', 'Fase III · A sombra despida'][m],
        2.5,
        '#e0752d'
      );
      roar();
      SFX.crack();
      this.spark(e.x, e.y - 140, 30, '#d8d0bd', 300, 1, 400, 3);
      this.impactRing(e.x, e.y - 80, '#f6d27a', 14, 150, 0.42);
      this.shake = 14;
    }
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    e.cd = Math.max(0, e.cd - dt);
    if (e.state === 'reveal') {
      e.vx = 0;
      e.t += dt;
      if (e.t >= e.dur) {
        e.state = 'chase';
        e.cd = 0.25;
      }
    } else if (e.state === 'blink') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= 0.32) {
        e.ph = 1;
        this.spark(e.x, e.y - 70, 18, '#a8424a', 220, 0.5, 40, 2.8);
        e.x = clamp(this.P.x - this.P.face * 130, A.x0 + 70, A.x1 - 70);
        e.face = this.P.x >= e.x ? 1 : -1;
        this.impactRing(e.x, e.y - 70, '#d13838', 10, 75, 0.3);
        SFX.shriek();
      } else if (e.ph === 1 && e.t >= 0.52) {
        this.bossStart(e, 'swing', 0.34);
      }
    } else if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 110 ? e.face * [70, 140, 115][m] : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (m === 0) {
          if (dist < 170) this.bossStart(e, 'swing', 0.58);
          else if (r < 0.6) this.bossStart(e, 'toll', 0.85);
          else e.cd = 0.45;
        } else if (m === 1) {
          if (dist < 165 && r < 0.55) this.bossStart(e, 'swing', 0.48 * sp);
          else if (r < 0.8) this.bossStart(e, 'slam', 0.45 * sp);
          else this.bossStart(e, 'toll', 0.72);
        } else {
          // Mask 2: Shadow blink + slam + toll
          if (r < 0.32 && dist > 150) this.bossStart(e, 'blink', 0.55);
          else if (dist < 165 && r < 0.65) this.bossStart(e, 'swing', 0.46 * sp);
          else if (r < 0.85) this.bossStart(e, 'slam', 0.46 * sp);
          else this.bossStart(e, 'toll', 0.7);
        }
      }
    } else if (e.state === 'swing') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vx = e.face * 150;
          SFX.swing();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 160, 34);
        if (e.t >= 0.18) {
          const maxSwings = m === 2 ? 2 : m === 1 ? 1 : 0;
          if (e.n < maxSwings) {
            e.n++;
            e.ph = 0;
            e.t = 0;
            e.dur = 0.32;
            e.face = dx >= 0 ? 1 : -1;
          } else {
            e.ph = 2;
            e.t = 0;
          }
        }
      } else {
        e.vx = 0;
        if (e.t >= 0.7 * sp) {
          e.state = 'chase';
          e.cd = 0.42 * sp;
        }
      }
    } else if (e.state === 'slam') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.vy = -640;
          e.vx = clamp(dx / 0.85, -520, 520);
        }
      } else if (e.ph === 1) {
        if (e.onGround && e.t > 0.12) {
          e.ph = 2;
          e.t = 0;
          e.vx = 0;
          this.shake = 15;
          SFX.slam();
          this.spark(e.x, e.y, 26, '#8a8478', 260, 0.7);
          this.impactRing(e.x, e.y - 10, '#f6d27a', 14, 130, 0.36);
          this.addRubble(e.x, e.y, 22);
          if (Math.abs(this.P.x - e.x) < 100 && this.P.y > e.y - 40) this.hurtPlayer(40, e.x, e);
          for (const s of [-1, 1]) {
            if (m === 1) {
              SFX.fire();
              this.shots.push({
                kind: 'fire_wave',
                x: e.x + s * 40,
                y: e.y,
                vx: s * 360,
                vy: 0,
                hw: 18,
                h: 38,
                dmg: 26,
                life: 1.4,
                gy: e.y,
                col: '#ff642e',
              });
            } else {
              this.shots.push(this.wave(e.x + s * 40, e.y, s, 26));
              if (m === 2) {
                this.shots.push({
                  kind: 'black_flame',
                  x: e.x + s * 32,
                  y: e.y - 48,
                  vx: s * 410,
                  vy: 0,
                  hw: 14,
                  h: 14,
                  dmg: 24,
                  life: 1.35,
                  col: '#d878ff',
                });
              }
            }
          }
        }
      } else if (e.t >= 0.9 * sp) {
        e.state = 'chase';
        e.cd = 0.38;
      }
    } else if (e.state === 'toll') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        SFX.bell();
        if (m === 0) {
          for (let i = 0; i < 6; i++) {
            this.marks.push({
              x: clamp(e.x + e.face * (90 + i * 80), A.x0 + 30, A.x1 - 30),
              t: 0.6 + i * 0.14,
              kind: 'maw',
            });
          }
        } else {
          this.marks.push({ x: this.P.x, t: 0.72, kind: m === 2 ? 'black_pillar' : 'pyro_pillar', dmg: 26 });
          for (let i = 0; i < (m === 2 ? 7 : 5); i++) {
            this.marks.push({
              x: rnd(A.x0 + 50, A.x1 - 50),
              t: 0.82 + i * 0.14,
              kind: i % 2 === 0 ? (m === 2 ? 'black_pillar' : 'pyro_pillar') : undefined,
              dmg: 24,
            });
          }
        }
      } else if (e.ph === 1 && e.t >= 0.95) {
        e.state = 'chase';
        e.cd = 0.55;
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 50, A.x1 - 50);
  }

  private aiCacador(e: Enemy, dt: number) {
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const dy = Math.abs(this.P.y - e.y);
    e.cd = Math.max(0, e.cd - dt);
    const p2 = e.hp < e.maxHp * 0.5;

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('O sangue ferve', 'A razão de Malakor se rompeu', 2.4, '#d13838');
      roar();
      this.shake = Math.max(this.shake, 11);
      this.impactRing(e.x, e.y - 44, '#d13838', 12, 110, 0.36);
      e.hw = 22;
      e.h = 84;
    }

    if (e.state === 'idle') {
      e.vx = 0;
      if (!this.P.dead && dist < 500 && dy < 160) {
        e.state = 'chase';
        e.face = dx >= 0 ? 1 : -1;
        this.setBanner(ET.cacador.name || '', ET.cacador.sub || '', 2.6, '#e0b060');
        SFX.growl();
      }
      moveEntity(e, dt);
      return;
    }

    if (this.P.dead || dist > 860) {
      e.state = 'idle';
      e.vx = 0;
      moveEntity(e, dt);
      return;
    }

    if (e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      const spd = p2 ? 205 : 148;
      e.vx = dist > 70 ? e.face * spd : 0;
      if (e.cd <= 0) {
        const r = Math.random();
        if (dist < 115) {
          this.bossStart(e, 'swing', p2 ? 0.28 : 0.4);
        } else if (!p2 && dist < 380 && r < 0.42) {
          this.bossStart(e, 'shoot', 0.48);
        } else {
          this.bossStart(e, 'pounce', p2 ? 0.3 : 0.42);
        }
      }
    } else if (e.state === 'swing') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vx = e.face * (p2 ? 280 : 190);
          SFX.swing();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, p2 ? 120 : 100, p2 ? 32 : 25);
        if (e.t >= 0.18) {
          if (e.n < (p2 ? 2 : 1)) {
            e.n++;
            e.ph = 0;
            e.t = 0;
            e.dur = p2 ? 0.2 : 0.28;
            e.face = dx >= 0 ? 1 : -1;
          } else {
            e.ph = 2;
            e.t = 0;
            if (p2) {
              this.shots.push({
                kind: 'axe_wave',
                x: e.x + e.face * 32,
                y: e.y,
                vx: e.face * 360,
                vy: 0,
                hw: 16,
                h: 34,
                dmg: 24,
                life: 1.2,
                gy: e.y,
              });
            }
          }
        }
      } else if (e.t >= (p2 ? 0.4 : 0.56)) {
        e.state = 'chase';
        e.cd = p2 ? 0.32 : 0.52;
      }
    } else if (e.state === 'shoot') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        SFX.gunshot();
        for (const vy of [-55, 0, 55]) {
          this.shots.push({
            kind: 'bullet',
            x: e.x + e.face * 24,
            y: e.y - 44,
            vx: e.face * 600,
            vy,
            hw: 8,
            h: 6,
            dmg: 18,
            life: 1.0,
            gy: e.y,
          });
        }
        this.sparkStreaks(e.x + e.face * 24, e.y - 44, e.face, 9, '#f6d27a', 260, 0.22, 2);
      } else if (e.ph === 1 && e.t >= 0.52) {
        e.state = 'chase';
        e.cd = 0.65;
      }
    } else if (e.state === 'pounce') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vy = p2 ? -410 : -340;
          e.vx = e.face * (p2 ? 430 : 340);
          SFX.growl();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, p2 ? 96 : 82, p2 ? 34 : 26);
        if ((e.onGround && e.t > 0.14) || e.t > 0.65) {
          e.ph = 2;
          e.t = 0;
          e.vx = 0;
          this.shake = Math.max(this.shake, 7);
          this.addRubble(e.x, e.y, 10);
          SFX.slam();
          if (p2) {
            this.shots.push({
              kind: 'axe_wave',
              x: e.x + e.face * 24,
              y: e.y,
              vx: e.face * 340,
              vy: 0,
              hw: 15,
              h: 32,
              dmg: 22,
              life: 1.1,
              gy: e.y,
            });
          }
        }
      } else if (e.t >= (p2 ? 0.36 : 0.55)) {
        e.state = 'chase';
        e.cd = p2 ? 0.3 : 0.55;
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, e.minX, e.maxX);
  }

  private aiFera(e: Enemy, dt: number) {
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const dy = Math.abs(this.P.y - e.y);
    e.cd = Math.max(0, e.cd - dt);
    const p2 = e.hp < e.maxHp * 0.5;

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('Oração de Sangue', 'Garras e chifres brilham em ouro corrompido', 2.6, '#f6d27a');
      roar();
      SFX.bell();
      this.shake = Math.max(this.shake, 13);
      this.impactRing(e.x, e.y - 60, '#f6d27a', 14, 140, 0.45);
      for (const s of [-1, 1]) this.shots.push(this.wave(e.x + s * 36, e.y, s, 22));
    }

    if (e.state === 'idle') {
      e.vx = 0;
      if (!this.P.dead && dist < 540 && dy < 180) {
        e.state = 'chase';
        e.face = dx >= 0 ? 1 : -1;
        this.setBanner(ET.fera.name || '', ET.fera.sub || '', 2.8, '#e0b060');
        roar();
      }
      moveEntity(e, dt);
      return;
    }

    if (this.P.dead || dist > 920) {
      e.state = 'idle';
      e.vx = 0;
      moveEntity(e, dt);
      return;
    }

    if (e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 110 ? e.face * (p2 ? 125 : 88) : 0;
      if (e.cd <= 0) {
        const r = Math.random();
        if (dist < 140 && r < 0.5) this.bossStart(e, 'slash', p2 ? 0.36 : 0.48);
        else if (dist < 220 && r < 0.85) this.bossStart(e, 'slam', p2 ? 0.5 : 0.65);
        else this.bossStart(e, 'pounce', p2 ? 0.38 : 0.5);
      }
    } else if (e.state === 'slash') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vx = e.face * 190;
          SFX.swing();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 145, p2 ? 36 : 28);
        if (e.t >= 0.2) {
          if (p2 && e.n === 0) {
            e.n = 1;
            e.ph = 0;
            e.t = 0;
            e.dur = 0.26;
            e.face = dx >= 0 ? 1 : -1;
          } else {
            e.ph = 2;
            e.t = 0;
          }
        }
      } else if (e.t >= 0.55) {
        e.state = 'chase';
        e.cd = p2 ? 0.42 : 0.65;
      }
    } else if (e.state === 'slam') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          this.shake = Math.max(this.shake, 12);
          SFX.slam();
          this.addRubble(e.x + e.face * 68, e.y, 18);
          this.impactRing(e.x + e.face * 68, e.y - 10, p2 ? '#f6d27a' : '#d8d0bd', 12, 110, 0.36);
          this.meleeHit(e, 165, p2 ? 42 : 34);
          this.shots.push(this.wave(e.x + e.face * 50, e.y, e.face, p2 ? 28 : 22));
          if (p2) this.shots.push(this.wave(e.x - e.face * 30, e.y, -e.face, 22));
        }
      } else if (e.t >= (p2 ? 0.65 : 0.85)) {
        e.state = 'chase';
        e.cd = p2 ? 0.48 : 0.72;
      }
    } else if (e.state === 'pounce') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vy = -540;
          e.vx = clamp(dx / 0.75, -420, 420);
          SFX.growl();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 110, 32);
        if (e.onGround && e.t > 0.14) {
          e.ph = 2;
          e.t = 0;
          e.vx = 0;
          this.shake = Math.max(this.shake, 11);
          SFX.slam();
          this.addRubble(e.x, e.y, 16);
          if (Math.abs(this.P.x - e.x) < 105 && this.P.y > e.y - 45) this.hurtPlayer(32, e.x, e);
          for (const s of [-1, 1]) this.shots.push(this.wave(e.x + s * 36, e.y, s, 20));
        }
      } else if (e.t >= 0.72) {
        e.state = 'chase';
        e.cd = p2 ? 0.45 : 0.68;
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, e.minX, e.maxX);
  }

  private aiRom(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    e.cd = Math.max(0, e.cd - dt);
    e.ecd = Math.max(0, (e.ecd === undefined ? 3 : e.ecd) - dt);

    const stage = e.hp > e.maxHp * 0.7 ? 0 : e.hp > e.maxHp * 0.38 ? 1 : 2;
    if (stage > e.mask) {
      e.mask = stage;
      e.raged = stage >= 1;
      this.setBanner(
        'O véu lunar oscila',
        stage === 1 ? 'As crias do lago despertam' : 'Chuva de estrelas do vazio!',
        2.4,
        '#9ed7f0'
      );
      this.bossStart(e, 'blink', 0.85);
      return;
    }

    if (e.state === 'blink') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= 0.38) {
        e.ph = 1;
        this.spark(e.x, e.y - 36, 28, '#9ed7f0', 220, 0.7, -30, 2.8);
        this.impactRing(e.x, e.y - 36, '#cfeaff', 14, 120, 0.36);
        // Teleport to opposite side of arena
        const mid = (A.x0 + A.x1) * 0.5;
        e.x = this.P.x < mid ? A.x1 - 180 : A.x0 + 180;
        e.face = this.P.x >= e.x ? 1 : -1;
        this.spark(e.x, e.y - 36, 26, '#9ed7f0', 220, 0.7, -30, 2.8);
        SFX.cast();
        // Summon up to 2 soot spiderlings (fast hounds) if not overcrowded
        const liveAdds = this.enemies.filter((o) => !o.boss && !o.dead).length;
        const toAdd = Math.min(2, 4 - liveAdds);
        for (let i = 0; i < toAdd; i++) {
          const sx = clamp(e.x + (i === 0 ? -90 : 90), A.x0 + 50, A.x1 - 50);
          const minion = this.mkEnemy('cao', sx, 440, e.k);
          minion.minX = A.x0 + 20;
          minion.maxX = A.x1 - 20;
          minion.state = 'chase';
          this.enemies.push(minion);
        }
      } else if (e.ph === 1 && e.t >= 0.8) {
        e.state = 'chase';
        e.cd = 0.4;
      }
      return;
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 260 ? e.face * 32 : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (dist < 130 && r < 0.55) {
          this.bossStart(e, 'thrash', 0.45);
        } else if (e.ecd <= 0 && dist < 170) {
          e.ecd = 8;
          this.bossStart(e, 'blink', 0.85);
        } else if (r < 0.55) {
          this.bossStart(e, 'barrage', 0.5);
          e.n = stage === 2 ? 5 : 3;
        } else {
          this.bossStart(e, 'meteors', 0.55);
          e.n = stage === 2 ? 6 : 4;
        }
      }
    } else if (e.state === 'thrash') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        SFX.arcaneHit();
        this.impactRing(e.x, e.y - 36, '#9ed7f0', 16, 155, 0.36);
        if (dist < 145 && this.P.y > e.y - 95) this.hurtPlayer(28, e.x, e);
        for (const s of [-1, 1]) {
          this.shots.push({
            kind: 'spider_orb',
            x: e.x + s * 28,
            y: e.y - 32,
            vx: s * 250,
            vy: -120,
            hw: 11,
            h: 11,
            dmg: 20,
            life: 1.4,
            gy: 440,
            grav: 360,
          });
        }
      } else if (e.ph === 1 && e.t >= 0.65) {
        e.state = 'chase';
        e.cd = 0.65;
      }
    } else if (e.state === 'barrage') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.24;
        e.n--;
        SFX.cast();
        const aimX = this.P.x - e.x;
        const aimY = this.P.y - 34 - (e.y - 44);
        const len = Math.hypot(aimX, aimY) || 1;
        const spd = 340 + stage * 40;
        const shotKind =
          stage >= 1 && e.n === 0
            ? 'void_comet'
            : e.n % 2 === 1
              ? 'arcane_lance'
              : 'crystal';
        this.shots.push({
          kind: shotKind,
          x: e.x + e.face * 24,
          y: e.y - 44,
          vx: (aimX / len) * (shotKind === 'arcane_lance' ? spd * 1.28 : spd),
          vy: (aimY / len) * (shotKind === 'arcane_lance' ? spd * 1.28 : spd),
          hw: shotKind === 'void_comet' ? 13 : 11,
          h: shotKind === 'void_comet' ? 13 : 11,
          dmg: shotKind === 'void_comet' ? 25 : 22,
          life: 2.0,
          col: shotKind === 'void_comet' ? '#c49eff' : shotKind === 'arcane_lance' ? '#d2f4ff' : '#9ed7f0',
          explodeR: shotKind === 'void_comet' ? 58 : undefined,
        });
      } else if (e.n <= 0 && e.t >= 0.6) {
        e.state = 'chase';
        e.cd = stage === 2 ? 0.5 : 0.85;
      }
    } else if (e.state === 'meteors') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.25;
        e.n--;
        SFX.cast();
        this.marks.push({
          x: clamp(this.P.x + rnd(-90, 90), A.x0 + 40, A.x1 - 40),
          t: 0.72,
          kind: e.n % 2 === 0 ? 'lunar' : 'judgment',
          dmg: 24,
        });
      } else if (e.n <= 0 && e.t >= 0.75) {
        e.state = 'chase';
        e.cd = stage === 2 ? 0.55 : 0.9;
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 80, A.x1 - 80);
  }

  private aiAmigdala(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const p2 = e.hp < e.maxHp * 0.5;
    e.cd = Math.max(0, e.cd - dt);

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('Braços arrancados!', 'A Fera das Mil Órbitas amplia seu alcance astral', 2.8, '#c98cf2');
      roar();
      SFX.crack();
      this.shake = Math.max(this.shake, 16);
      this.impactRing(e.x, e.y - 90, '#c98cf2', 20, 175, 0.5);
      this.spark(e.x, e.y - 90, 32, '#e2b5ff', 300, 1.0, 200, 3);
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 180 ? e.face * (p2 ? 84 : 62) : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (dist < (p2 ? 230 : 175) && r < 0.44) {
          this.bossStart(e, 'slam', p2 ? 0.52 : 0.65);
        } else if (r < 0.76) {
          this.bossStart(e, 'laser', 0.62);
          e.laserX = this.P.x + (this.P.x > e.x ? -110 : 110);
          e.laserW = 22;
        } else {
          this.bossStart(e, 'jump', 0.45);
        }
      }
    } else if (e.state === 'slam') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        this.shake = Math.max(this.shake, 14);
        SFX.slam();
        const reach = p2 ? 235 : 175;
        const slamX = e.x + e.face * (p2 ? 120 : 88);
        this.addRubble(slamX, e.y, 24);
        this.impactRing(slamX, e.y - 12, '#c98cf2', 14, p2 ? 150 : 110, 0.4);
        if (Math.abs(this.P.x - e.x) < reach && this.P.y > e.y - 75) {
          this.hurtPlayer(p2 ? 42 : 34, e.x, e);
        }
        for (const s of [-1, 1]) {
          this.shots.push({
            kind: 'spider_orb',
            x: slamX,
            y: e.y - 16,
            vx: s * 280,
            vy: -190,
            hw: 12,
            h: 12,
            dmg: 24,
            life: 1.4,
            gy: 440,
            grav: 420,
          });
          if (p2) {
            this.shots.push({
              kind: 'black_flame',
              x: slamX + s * 24,
              y: e.y - 36,
              vx: s * 390,
              vy: 0,
              hw: 14,
              h: 14,
              dmg: 24,
              life: 1.3,
              col: '#d878ff',
            });
          }
        }
      } else if (e.ph === 1 && e.t >= (p2 ? 0.6 : 0.85)) {
        e.state = 'chase';
        e.cd = p2 ? 0.45 : 0.72;
      }
    } else if (e.state === 'laser') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        e.n = 0;
        SFX.laser();
        if (p2) {
          this.marks.push({
            x: clamp(this.P.x, A.x0 + 50, A.x1 - 50),
            t: 0.78,
            kind: 'black_pillar',
            dmg: 26,
          });
        }
      } else if (e.ph === 1) {
        const sweepDir = this.P.x >= (e.laserX ?? e.x) ? 1 : -1;
        e.laserX = clamp((e.laserX ?? this.P.x) + sweepDir * (p2 ? 330 : 250) * dt, A.x0 + 30, A.x1 - 30);
        e.n += dt;
        if (e.n >= 0.08) {
          e.n = 0;
          this.shots.push({
            kind: 'laser',
            x: e.laserX,
            y: 440,
            vx: 0,
            vy: 0,
            hw: 16,
            h: 440,
            dmg: 26,
            life: 0.16,
            col: '#d99bff',
          });
          this.spark(e.laserX, 434, 4, '#e2b5ff', 160, 0.35, 180, 2.2);
          this.shake = Math.max(this.shake, 4.5);
        }
        if (e.t >= (p2 ? 1.5 : 1.15)) {
          e.ph = 2;
          e.t = 0;
        }
      } else if (e.t >= 0.6) {
        e.state = 'chase';
        e.cd = p2 ? 0.5 : 0.75;
      }
    } else if (e.state === 'jump') {
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        e.vy = -780;
        e.vx = clamp(dx / 0.9, -460, 460);
        SFX.shriek();
      } else if (e.ph === 1) {
        if (e.onGround && e.t > 0.18) {
          e.ph = 2;
          e.t = 0;
          e.vx = 0;
          this.shake = Math.max(this.shake, 16);
          SFX.slam();
          this.addRubble(e.x, e.y, 26);
          this.impactRing(e.x, e.y - 16, '#c98cf2', 18, 160, 0.45);
          if (Math.abs(this.P.x - e.x) < 130 && this.P.y > e.y - 60) {
            this.hurtPlayer(40, e.x, e);
          }
          for (const s of [-1, 1]) {
            this.shots.push(this.wave(e.x + s * 44, e.y, s, 26));
          }
          this.marks.push({
            x: clamp(this.P.x, A.x0 + 50, A.x1 - 50),
            t: 0.76,
            kind: 'black_pillar',
            dmg: 25,
          });
        }
      } else if (e.t >= 0.78) {
        e.state = 'chase';
        e.cd = 0.55;
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 80, A.x1 - 80);
  }

  private aiBruxa(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const p2 = e.hp < e.maxHp * 0.55;
    e.cd = Math.max(0, e.cd - dt);
    e.ecd = Math.max(0, (e.ecd === undefined ? 5 : e.ecd) - dt);

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('Os olhos do manto se abrem', 'A Bruxa convoca Sombras da névoa!', 2.6, '#8fc474');
      SFX.witchLaugh();
      roar();
      this.shake = 12;
      this.impactRing(e.x, e.y - 54, '#8fc474', 16, 140, 0.4);
      const sx = clamp(e.x - e.face * 140, A.x0 + 60, A.x1 - 60);
      const min = this.mkEnemy('sombra', sx, 440, e.k);
      min.minX = A.x0 + 20;
      min.maxX = A.x1 - 20;
      min.state = 'chase';
      this.enemies.push(min);
    }

    if (e.state === 'blink') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= 0.42) {
        e.ph = 1;
        this.spark(e.x, e.y - 50, 18, '#8fc474', 200, 0.5, -20, 2.4);
        const mid = (A.x0 + A.x1) * 0.5;
        e.x = this.P.x < mid ? A.x1 - 160 : A.x0 + 160;
        e.face = this.P.x >= e.x ? 1 : -1;
        SFX.witchLaugh();
        this.spark(e.x, e.y - 50, 22, '#9ed7f0', 220, 0.5, -20, 2.5);
      } else if (e.ph === 1 && e.t >= 0.78) {
        e.state = 'chase';
        e.cd = 0.45 * this.cdHard();
      }
      return;
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 220 ? e.face * (p2 ? 85 : 65) * this.spdHard() : dist < 110 ? -e.face * 60 : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (e.ecd <= 0 && dist < 160) {
          e.ecd = 6.5 * this.cdHard();
          this.bossStart(e, 'blink', 0.8);
        } else if (dist < 130 && r < 0.45) {
          this.bossStart(e, 'lash', 0.46 * this.cdHard());
        } else if (r < 0.72) {
          this.bossStart(e, 'bind', 0.42 * this.cdHard());
          e.n = p2 ? 4 : 3;
        } else {
          this.bossStart(e, 'orbs', 0.45 * this.cdHard());
          e.n = p2 ? 4 : 2;
        }
      }
    } else if (e.state === 'lash') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          SFX.slashHeavy();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 125, 30);
        if (e.t >= 0.18) {
          e.ph = 2;
          e.t = 0;
        }
      } else if (e.t >= 0.6 * this.cdHard()) {
        e.state = 'chase';
        e.cd = 0.45 * this.cdHard();
      }
    } else if (e.state === 'bind') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.34;
        e.n--;
        SFX.cast();
        this.marks.push({
          x: clamp(this.P.x + this.P.vx * 0.22 + rnd(-60, 60), A.x0 + 40, A.x1 - 40),
          t: 0.72,
          kind: 'bind_ring',
          dmg: 22,
        });
      } else if (e.n <= 0 && e.t >= 0.65) {
        e.state = 'chase';
        e.cd = 0.65 * this.cdHard();
      }
    } else if (e.state === 'orbs') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.3;
        e.n--;
        SFX.cast();
        const aimX = this.P.x - e.x;
        const aimY = this.P.y - 36 - (e.y - 60);
        const len = Math.hypot(aimX, aimY) || 1;
        this.shots.push({
          kind: 'poison_orb',
          x: e.x + e.face * 24,
          y: e.y - 60,
          vx: (aimX / len) * 370 * this.spdHard(),
          vy: (aimY / len) * 370 * this.spdHard(),
          hw: 12,
          h: 12,
          dmg: 24,
          life: 2.0,
          col: '#8fc474',
        });
      } else if (e.n <= 0 && e.t >= 0.55) {
        e.state = 'chase';
        e.cd = 0.6 * this.cdHard();
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 70, A.x1 - 70);
  }

  private aiMartir(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const p2 = e.hp < e.maxHp * 0.5;
    e.cd = Math.max(0, e.cd - dt);

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('A Foice Real incendeia', 'Logarius ergue-se na tormenta gelada!', 2.6, '#e05348');
      roar();
      SFX.thunder();
      this.shake = 14;
      this.impactRing(e.x, e.y - 70, '#e05348', 18, 155, 0.45);
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 130 ? e.face * (p2 ? 128 : 74) * this.spdHard() : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (dist < 155 && r < 0.45) {
          this.bossStart(e, 'scythe', (p2 ? 0.36 : 0.5) * this.cdHard());
        } else if (r < 0.74) {
          this.bossStart(e, 'skulls', 0.42 * this.cdHard());
          e.n = p2 ? 5 : 3;
        } else {
          this.bossStart(e, 'dive', 0.46 * this.cdHard());
        }
      }
    } else if (e.state === 'scythe') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vx = e.face * 210 * this.spdHard();
          SFX.slashHeavy();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 155, p2 ? 38 : 30);
        if (e.t >= 0.2) {
          e.ph = 2;
          e.t = 0;
          this.shots.push({
            kind: 'blood_slash',
            x: e.x + e.face * 34,
            y: e.y,
            vx: e.face * 420 * this.spdHard(),
            vy: 0,
            hw: 18,
            h: 42,
            dmg: 26,
            life: 1.35,
            gy: e.y,
            col: '#e04e58',
          });
        }
      } else if (e.t >= (p2 ? 0.45 : 0.65) * this.cdHard()) {
        e.state = 'chase';
        e.cd = (p2 ? 0.38 : 0.62) * this.cdHard();
      }
    } else if (e.state === 'skulls') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.22;
        e.n--;
        SFX.cast();
        const aimX = this.P.x - e.x;
        const aimY = this.P.y - 38 - (e.y - 78);
        const len = Math.hypot(aimX, aimY) || 1;
        this.shots.push({
          kind: 'ice_skull',
          x: e.x + e.face * 24,
          y: e.y - 78,
          vx: (aimX / len) * 410 * this.spdHard() + rnd(-35, 35),
          vy: (aimY / len) * 410 * this.spdHard() + rnd(-35, 35),
          hw: 13,
          h: 13,
          dmg: 25,
          life: 1.9,
          col: '#e04e58',
        });
      } else if (e.n <= 0 && e.t >= 0.55) {
        e.state = 'chase';
        e.cd = 0.6 * this.cdHard();
      }
    } else if (e.state === 'dive') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.vy = -720;
          e.vx = clamp(dx / 0.85, -520, 520);
          SFX.shriek();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 115, 36);
        if (e.onGround && e.t > 0.16) {
          e.ph = 2;
          e.t = 0;
          e.vx = 0;
          SFX.slam();
          this.shake = 14;
          this.addRubble(e.x, e.y, 18);
          for (const s of [-1, 1]) {
            this.shots.push({
              kind: 'blood_slash',
              x: e.x + s * 36,
              y: e.y,
              vx: s * 380 * this.spdHard(),
              vy: 0,
              hw: 18,
              h: 40,
              dmg: 25,
              life: 1.25,
              gy: e.y,
            });
          }
        }
      } else if (e.t >= 0.65 * this.cdHard()) {
        e.state = 'chase';
        e.cd = 0.5 * this.cdHard();
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 70, A.x1 - 70);
  }

  private aiRenascido(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const p2 = e.hp < e.maxHp * 0.5;
    e.cd = Math.max(0, e.cd - dt);

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('Carne e Ossos Fervem', 'O Ossuário desaba em chuva ácida e relâmpagos!', 2.7, '#78c257');
      roar();
      SFX.acid();
      this.shake = 15;
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 165 ? e.face * (p2 ? 78 : 54) * this.spdHard() : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (dist < 185 && r < 0.44) {
          this.bossStart(e, 'crush', 0.58 * this.cdHard());
        } else if (r < 0.74) {
          this.bossStart(e, 'acid_barrage', 0.45 * this.cdHard());
          e.n = p2 ? 5 : 3;
        } else {
          this.bossStart(e, 'acid_storm', 0.5 * this.cdHard());
          e.n = p2 ? 6 : 4;
        }
      }
    } else if (e.state === 'crush') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          this.shake = 15;
          SFX.slam();
          const sx = e.x + e.face * 95;
          this.addRubble(sx, e.y, 24);
          this.impactRing(sx, e.y - 12, '#78c257', 16, 130, 0.38);
          if (Math.abs(this.P.x - sx) < 110 && this.P.y > e.y - 75) {
            this.hurtPlayer(p2 ? 42 : 34, e.x, e);
          }
          for (const s of [-1, 1]) {
            this.shots.push(this.wave(sx + s * 20, e.y, s, 26));
          }
        }
      } else if (e.t >= 0.72 * this.cdHard()) {
        e.state = 'chase';
        e.cd = 0.55 * this.cdHard();
      }
    } else if (e.state === 'acid_barrage') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.25;
        e.n--;
        SFX.acid();
        this.shots.push({
          kind: 'acid',
          x: e.x + e.face * 24,
          y: e.y - 95,
          vx: clamp((this.P.x - e.x) * 1.15 + rnd(-90, 90), -420, 420),
          vy: -390,
          hw: 12,
          h: 12,
          dmg: 24,
          life: 2.0,
          gy: 440,
          grav: 860,
          col: '#78c257',
        });
      } else if (e.n <= 0 && e.t >= 0.6) {
        e.state = 'chase';
        e.cd = 0.6 * this.cdHard();
      }
    } else if (e.state === 'acid_storm') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.24;
        e.n--;
        this.marks.push({
          x: clamp(this.P.x + rnd(-110, 110), A.x0 + 45, A.x1 - 45),
          t: 0.75,
          kind: e.n % 2 === 0 ? 'acid_rain' : 'lightning_strike',
          dmg: 25,
        });
      } else if (e.n <= 0 && e.t >= 0.7) {
        e.state = 'chase';
        e.cd = 0.65 * this.cdHard();
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 90, A.x1 - 90);
  }

  private aiEbrietas(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const p2 = e.hp < e.maxHp * 0.55;
    e.cd = Math.max(0, e.cd - dt);

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('O Cosmos se Fende', 'Asas estelares de Ebrietas brilham em êxtase!', 2.7, '#9ed7f0');
      roar();
      SFX.cosmic();
      this.shake = 15;
      this.impactRing(e.x, e.y - 80, '#9ed7f0', 20, 170, 0.48);
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 155 ? e.face * (p2 ? 96 : 68) * this.spdHard() : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (dist > 180 && r < 0.36) {
          this.bossStart(e, 'charge', 0.45 * this.cdHard());
        } else if (r < 0.68) {
          this.bossStart(e, 'beam', 0.6 * this.cdHard());
          e.laserX = this.P.x + (this.P.x > e.x ? -115 : 115);
        } else {
          this.bossStart(e, 'starfall', 0.46 * this.cdHard());
          e.n = p2 ? 6 : 4;
        }
      }
    } else if (e.state === 'charge') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vx = e.face * 540 * this.spdHard();
          SFX.growl();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 130, 38);
        if (e.t >= 0.55 || e.x <= A.x0 + 85 || e.x >= A.x1 - 85) {
          e.ph = 2;
          e.t = 0;
          e.vx = 0;
          SFX.slam();
          this.shake = 12;
        }
      } else if (e.t >= 0.6 * this.cdHard()) {
        e.state = 'chase';
        e.cd = 0.5 * this.cdHard();
      }
    } else if (e.state === 'beam') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= e.dur) {
        e.ph = 1;
        e.t = 0;
        e.n = 0;
        SFX.cosmic();
      } else if (e.ph === 1) {
        const sweepDir = this.P.x >= (e.laserX ?? e.x) ? 1 : -1;
        e.laserX = clamp((e.laserX ?? this.P.x) + sweepDir * (p2 ? 320 : 240) * dt, A.x0 + 35, A.x1 - 35);
        e.n += dt;
        if (e.n >= 0.08) {
          e.n = 0;
          this.shots.push({
            kind: 'cosmic_beam',
            x: e.laserX,
            y: 440,
            vx: 0,
            vy: 0,
            hw: 17,
            h: 440,
            dmg: 28,
            life: 0.16,
            col: '#9ed7f0',
          });
          this.spark(e.laserX, 434, 4, '#fff2c8', 180, 0.35, 160, 2.2);
          this.shake = Math.max(this.shake, 4.5);
        }
        if (e.t >= (p2 ? 1.4 : 1.05)) {
          e.ph = 2;
          e.t = 0;
        }
      } else if (e.t >= 0.6 * this.cdHard()) {
        e.state = 'chase';
        e.cd = 0.55 * this.cdHard();
      }
    } else if (e.state === 'starfall') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.22;
        e.n--;
        SFX.cast();
        this.marks.push({
          x: clamp(this.P.x + rnd(-80, 80), A.x0 + 45, A.x1 - 45),
          t: 0.68,
          kind: e.n % 2 === 0 ? 'solar_glyph' : 'lunar',
          dmg: 26,
        });
      } else if (e.n <= 0 && e.t >= 0.65) {
        e.state = 'chase';
        e.cd = 0.6 * this.cdHard();
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 80, A.x1 - 80);
  }

  private aiAma(e: Enemy, dt: number) {
    const A = ARENAS[e.k];
    const dx = this.P.x - e.x;
    const dist = Math.abs(dx);
    const p2 = e.hp < e.maxHp * 0.55;
    e.cd = Math.max(0, e.cd - dt);
    e.ecd = Math.max(0, (e.ecd === undefined ? 4 : e.ecd) - dt);

    if (p2 && !e.raged) {
      e.raged = true;
      this.setBanner('Seis Lâminas sob a Lua Vermelha', 'A Aia dança com fúria sangrenta!', 2.8, '#ff4a54');
      roar();
      SFX.bell();
      this.shake = 16;
      this.impactRing(e.x, e.y - 80, '#ff4a54', 20, 180, 0.5);
    }

    if (e.state === 'blink') {
      e.vx = 0;
      e.t += dt;
      if (e.ph === 0 && e.t >= 0.28) {
        e.ph = 1;
        this.spark(e.x, e.y - 70, 20, '#ff4a54', 240, 0.5, -20, 2.8);
        e.x = clamp(this.P.x - this.P.face * 135, A.x0 + 70, A.x1 - 70);
        e.face = this.P.x >= e.x ? 1 : -1;
        SFX.slashHeavy();
        this.impactRing(e.x, e.y - 70, '#ff4a54', 10, 80, 0.3);
      } else if (e.ph === 1 && e.t >= 0.45) {
        this.bossStart(e, 'flurry', 0.24 * this.cdHard());
      }
      return;
    }

    if (e.state === 'idle' || e.state === 'chase' || e.state === 'hurt') {
      e.state = 'chase';
      e.face = dx >= 0 ? 1 : -1;
      e.vx = dist > 115 ? e.face * (p2 ? 175 : 128) * this.spdHard() : 0;
      if (e.cd <= 0 && !this.P.dead) {
        const r = Math.random();
        if (e.ecd <= 0 && dist > 130) {
          e.ecd = 5.5 * this.cdHard();
          this.bossStart(e, 'blink', 0.45);
        } else if (dist < 175 && r < 0.48) {
          this.bossStart(e, 'flurry', 0.34 * this.cdHard());
        } else if (r < 0.76) {
          this.bossStart(e, 'crescents', 0.38 * this.cdHard());
          e.n = p2 ? 4 : 3;
        } else {
          this.bossStart(e, 'pillars', 0.45 * this.cdHard());
          e.n = p2 ? 5 : 3;
        }
      }
    } else if (e.state === 'flurry') {
      e.t += dt;
      if (e.ph === 0) {
        e.vx = 0;
        if (e.t >= e.dur) {
          e.ph = 1;
          e.t = 0;
          e.hit = false;
          e.vx = e.face * 270 * this.spdHard();
          SFX.slashHeavy();
        }
      } else if (e.ph === 1) {
        this.meleeHit(e, 165, p2 ? 36 : 29);
        if (e.t >= 0.16) {
          const maxHits = p2 ? 2 : 1;
          if (e.n < maxHits) {
            e.n++;
            e.ph = 0;
            e.t = 0;
            e.dur = 0.22 * this.cdHard();
            e.face = dx >= 0 ? 1 : -1;
          } else {
            e.ph = 2;
            e.t = 0;
          }
        }
      } else if (e.t >= 0.48 * this.cdHard()) {
        e.state = 'chase';
        e.cd = 0.4 * this.cdHard();
      }
    } else if (e.state === 'crescents') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.22;
        e.n--;
        SFX.slashHeavy();
        this.shots.push({
          kind: 'blood_slash',
          x: e.x + e.face * 30,
          y: e.y,
          vx: e.face * (420 + e.n * 35) * this.spdHard(),
          vy: 0,
          hw: 20,
          h: 46,
          dmg: 28,
          life: 1.4,
          gy: e.y,
          col: '#ff4a54',
        });
      } else if (e.n <= 0 && e.t >= 0.52) {
        e.state = 'chase';
        e.cd = 0.48 * this.cdHard();
      }
    } else if (e.state === 'pillars') {
      e.vx = 0;
      e.t += dt;
      if (e.n > 0 && e.t >= e.dur) {
        e.t = 0;
        e.dur = 0.24;
        e.n--;
        SFX.cast();
        this.marks.push({
          x: clamp(this.P.x + rnd(-95, 95), A.x0 + 45, A.x1 - 45),
          t: 0.68,
          kind: e.n % 2 === 0 ? 'blood_pillar' : 'black_pillar',
          dmg: 28,
        });
      } else if (e.n <= 0 && e.t >= 0.62) {
        e.state = 'chase';
        e.cd = 0.55 * this.cdHard();
      }
    }
    moveEntity(e, dt);
    e.x = clamp(e.x, A.x0 + 70, A.x1 - 70);
  }

  private detonateShot(s: Shot, x: number, y: number, skipEnemyUid = -1) {
    const rad = s.explodeR || 56;
    const isVoid = s.kind === 'void_comet';
    const col = isVoid ? '#c49eff' : '#ff7d30';
    if (isVoid) SFX.arcaneHit();
    else SFX.eruption();
    this.impactRing(x, y, col, 10, rad + 14, 0.28);
    this.impactRing(x, y, isVoid ? '#e8d8ff' : '#ffe178', 5, rad * 0.65, 0.2);
    this.spark(x, y, 16, col, 240, 0.48, -60, 2.5);
    this.shake = Math.max(this.shake, isVoid ? 7 : 6);
    if (s.friendly) {
      for (const e of this.enemies) {
        if (e.uid === skipEnemyUid) continue;
        if (e.dead || e.pending || (e.spawnTime || 0) > 0) continue;
        if (Math.abs(e.x - x) < e.hw + rad && Math.abs(e.y - e.h * 0.5 - y) < e.h * 0.6 + rad) {
          const splashDmg = skipEnemyUid >= 0 ? Math.round(s.dmg * 0.72) : s.dmg;
          this.damageEnemy(e, splashDmg, isVoid, e.x >= x ? 1 : -1, true, s.status);
          if (isVoid) e.poiseDmg = (e.poiseDmg || 0) + 22;
        }
      }
    } else if (!this.P.dead) {
      if (Math.abs(this.P.x - x) < rad && Math.abs(this.P.y - 34 - y) < rad + 20) {
        this.hurtPlayer(s.dmg, x);
      }
    }
  }

  private updateShots(dt: number) {
    const A = this.arena >= 0 ? ARENAS[this.arena] : null;
    for (const m of this.marks) {
      m.t -= dt;
      if (m.t <= 0) {
        m.gone = true;
        const gy = m.gy || groundAt(m.x) || 440;
        if (m.kind === 'lunar') {
          SFX.arcaneHit();
          this.impactRing(m.x, gy - 32, '#9ed7f0', 10, 74, 0.34);
          this.spark(m.x, gy - 40, 20, '#bdf0fa', 280, 0.5, 140, 2.8);
          this.shake = Math.max(this.shake, 7);
          if (m.friendly) {
            for (const e of this.enemies) {
              if (!e.dead && !e.pending && (e.spawnTime || 0) <= 0 && Math.abs(e.x - m.x) < e.hw + 52) {
                this.damageEnemy(e, m.dmg || 42, true, e.x >= this.P.x ? 1 : -1, true);
              }
            }
          } else if (Math.abs(this.P.x - m.x) < 42 && this.P.y > gy - 115) {
            this.hurtPlayer(m.dmg || 24, m.x);
          }
        } else if (m.kind === 'pyro_pillar' || m.kind === 'black_pillar' || m.kind === 'solar_glyph') {
          const isBlack = m.kind === 'black_pillar';
          const isSolar = m.kind === 'solar_glyph';
          const colA = isBlack ? '#d878ff' : isSolar ? '#ffe178' : '#ff7d30';
          const colB = isBlack ? '#7a1e8f' : isSolar ? '#fff2b8' : '#ffb84d';
          if (isSolar) SFX.arcaneHit();
          else SFX.eruption();
          this.impactRing(m.x, gy - 26, colA, 10, 76, 0.34);
          this.spark(m.x, gy - 50, 22, colA, 260, 0.56, -240, 2.9);
          this.spark(m.x, gy - 20, 12, colB, 180, 0.44, -180, 2.3);
          this.shake = Math.max(this.shake, 7.5);
          if (m.friendly) {
            const stApply = isSolar ? undefined : 'burn';
            for (const e of this.enemies) {
              if (!e.dead && !e.pending && (e.spawnTime || 0) <= 0 && Math.abs(e.x - m.x) < e.hw + 56) {
                this.damageEnemy(e, m.dmg || 40, true, e.x >= this.P.x ? 1 : -1, true, stApply);
              }
            }
          } else if (Math.abs(this.P.x - m.x) < 38 && this.P.y > gy - 110) {
            this.hurtPlayer(m.dmg || 25, m.x);
          }
        } else if (m.kind === 'bind_ring') {
          SFX.arcaneHit();
          this.impactRing(m.x, gy - 12, '#8fc474', 8, 56, 0.3);
          this.spark(m.x, gy - 20, 14, '#8fc474', 180, 0.45, -40, 2.2);
          if (Math.abs(this.P.x - m.x) < 42 && Math.abs(this.P.y - gy) < 60) {
            this.applyPlayerStatus('slow', 2.4);
            this.hurtPlayer(m.dmg || 18, m.x);
          }
        } else if (m.kind === 'acid_rain') {
          SFX.acid();
          this.impactRing(m.x, gy - 16, '#78c257', 10, 64, 0.32);
          this.addCloud(m.x, gy);
          if (Math.abs(this.P.x - m.x) < 44 && Math.abs(this.P.y - gy) < 85) {
            this.hurtPlayer(m.dmg || 24, m.x);
          }
        } else if (m.kind === 'lightning_strike') {
          SFX.lightning();
          this.impactRing(m.x, gy - 20, '#9fe6ff', 10, 74, 0.3);
          this.spark(m.x, gy - 60, 20, '#9fe6ff', 280, 0.45, 180, 2.6);
          this.shake = Math.max(this.shake, 7);
          if (Math.abs(this.P.x - m.x) < 38 && this.P.y > gy - 140) {
            this.hurtPlayer(m.dmg || 26, m.x);
          }
        } else if (m.kind === 'blood_pillar') {
          SFX.eruption();
          this.impactRing(m.x, gy - 24, '#e04e58', 12, 82, 0.35);
          this.spark(m.x, gy - 55, 22, '#ff4a54', 260, 0.55, -220, 2.8);
          this.shake = Math.max(this.shake, 8);
          if (Math.abs(this.P.x - m.x) < 40 && this.P.y > gy - 120) {
            this.hurtPlayer(m.dmg || 28, m.x);
            this.P.bleedBuild = Math.min(100, this.P.bleedBuild + 35);
          }
        } else if (m.kind === 'maw') {
          this.shots.push({
            kind: 'maw',
            x: m.x,
            y: gy,
            vx: 0,
            vy: 0,
            hw: 22,
            h: 60,
            dmg: m.dmg || 24,
            life: 0.3,
          });
          SFX.chomp();
        } else if (m.kind === 'chain') {
          this.shots.push({
            kind: 'chain',
            x: m.x,
            y: gy,
            vx: 0,
            vy: 0,
            hw: 12,
            h: 440,
            dmg: m.dmg || 24,
            life: 0.28,
          });
          SFX.chain();
        } else {
          this.shots.push({
            kind: 'ember',
            x: m.x,
            y: 0,
            vx: 0,
            vy: 740,
            hw: 10,
            h: 16,
            dmg: 22,
            life: 1,
            gy,
          });
        }
      }
    }
    this.marks = this.marks.filter((m) => !m.gone);

    for (const s of this.shots) {
      s.life -= dt;
      if (s.grav) s.vy += s.grav * dt;

      // Subtle homing for player magic projectiles
      if (s.friendly && s.homing) {
        let best: Enemy | null = null;
        let bestD = 320;
        for (const e of this.enemies) {
          if (e.dead || e.pending || (e.spawnTime || 0) > 0) continue;
          const dist = Math.hypot(e.x - s.x, e.y - e.h * 0.5 - s.y);
          if (dist < bestD) {
            bestD = dist;
            best = e;
          }
        }
        if (best) {
          const tx = best.x - s.x;
          const ty = best.y - best.h * 0.55 - s.y;
          const len = Math.hypot(tx, ty) || 1;
          const curSpd = Math.hypot(s.vx, s.vy) || 460;
          s.vx += ((tx / len) * curSpd - s.vx) * Math.min(1, dt * 4.5);
          s.vy += ((ty / len) * curSpd - s.vy) * Math.min(1, dt * 4.5);
        }
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const g = groundAt(s.x);

      if (s.kind === 'fire_wave' && Math.random() < 0.45) {
        this.spark(s.x + rnd(-10, 10), s.y - rnd(6, 26), 1, '#ff9840', 40, 0.28, -90, 2);
      }

      if (s.kind === 'vial' && g !== null && s.y >= g) {
        s.life = 0;
        SFX.glass();
        this.addCloud(s.x, g);
        this.spark(s.x, g - 8, 10, '#78c257', 160, 0.45, 220, 2.2);
        continue;
      }

      if (s.kind === 'acid' && g !== null && s.y >= g) {
        s.life = 0;
        SFX.acid();
        this.addCloud(s.x, g);
        this.spark(s.x, g - 8, 12, '#a8e28f', 170, 0.48, 220, 2.4);
        continue;
      }

      if ((s.kind === 'fireball' || s.kind === 'void_comet') && g !== null && s.y >= g) {
        s.life = 0;
        this.detonateShot(s, s.x, g - 6);
        continue;
      }

      if (
        (s.kind === 'wave' ||
          s.kind === 'axe_wave' ||
          s.kind === 'fire_wave' ||
          s.kind === 'blood_slash' ||
          s.kind === 'sound' ||
          s.kind === 'ember' ||
          s.kind === 'bullet' ||
          s.kind === 'feather') &&
        (g === null || g < (s.gy ?? 440) - 2 || (A && (s.x < A.x0 + 10 || s.x > A.x1 - 10)))
      ) {
        if (s.kind !== 'feather' || (g !== null && s.y >= g)) {
          s.life = 0;
        }
      }

      if (s.kind === 'spider_orb' && g !== null && s.y >= g) {
        s.life = 0;
        this.spark(s.x, g - 6, 8, '#9ed7f0', 160, 0.4, 220, 2);
      }

      if (s.friendly) {
        // Player projectile hits enemies
        for (const e of this.enemies) {
          if (e.dead || e.pending || (e.spawnTime || 0) > 0) continue;
          if (!s.hitIds) s.hitIds = [];
          const eid = e.uid;
          if (s.hitIds.includes(eid)) continue;
          if (
            Math.abs(s.x - e.x) < s.hw + e.hw &&
            s.y > e.y - e.h &&
            s.y - s.h < e.y
          ) {
            s.hitIds.push(eid);
            const hitDir = s.vx >= 0 ? 1 : -1;
            this.damageEnemy(e, s.dmg, false, hitDir, true, s.status);
            this.P.energy = Math.min(
              100,
              this.P.energy + 10 * this.buildDef().energyGainMult * (1 + this.getRuneTotals().energyRegenBonus)
            );
            if (s.kind === 'fireball' || s.kind === 'void_comet') {
              this.detonateShot(s, s.x, s.y, eid);
            } else if (
              s.kind === 'arcane' ||
              s.kind === 'arcane_lance' ||
              s.kind === 'poison_orb' ||
              s.kind === 'star' ||
              s.kind === 'black_flame' ||
              s.kind === 'fire_wave'
            ) {
              if (s.kind === 'fire_wave' || s.kind === 'black_flame') SFX.fire();
              else SFX.arcaneHit();
              this.impactRing(s.x, s.y - s.h * 0.3, s.col || '#9ed7f0', 5, 32, 0.22);
              this.sparkStreaks(s.x, s.y - s.h * 0.3, hitDir, 8, s.col || '#9ed7f0', 250, 0.26, 2.3);
            } else {
              this.sparkStreaks(s.x, s.y, hitDir, 5, s.col || '#e8dcc8', 220, 0.22, 2);
            }
            if (this.P.rally > 0) {
              const h = Math.min(this.P.rally, s.dmg * 0.28);
              this.P.hp = Math.min(this.maxHp(), this.P.hp + h);
              this.P.rally -= h;
            }
            if (!s.pierce) {
              s.life = 0;
              break;
            }
          }
        }
      } else if (
        s.life > 0 &&
        Math.abs(s.x - this.P.x) < s.hw + this.P.hw &&
        s.y > this.P.y - this.P.h &&
        s.y - s.h < this.P.y
      ) {
        const hit = this.hurtPlayer(s.dmg, s.x - s.vx);
        if (s.kind === 'fireball' || s.kind === 'void_comet') {
          this.detonateShot(s, s.x, s.y);
          s.life = 0;
        } else if (
          hit &&
          s.kind !== 'wave' &&
          s.kind !== 'axe_wave' &&
          s.kind !== 'fire_wave' &&
          s.kind !== 'blood_slash' &&
          s.kind !== 'maw' &&
          s.kind !== 'laser' &&
          s.kind !== 'cosmic_beam'
        ) {
          s.life = 0;
        }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  private updateHazards(dt: number) {
    for (const tp of this.traps) {
      tp.life -= dt;
      if (
        tp.life > 0 &&
        !this.P.dead &&
        this.P.onGround &&
        Math.abs(this.P.x - tp.x) < tp.w / 2 + this.P.hw &&
        Math.abs(this.P.y - tp.y) < 8
      ) {
        if (this.hurtPlayer(12, tp.x)) {
          tp.life = 0;
          this.applyPlayerStatus('slow', 2.2);
          this.P.bleedBuild = Math.min(100, this.P.bleedBuild + 45);
          if (this.P.bleedBuild >= 100) {
            this.P.bleedBuild = 0;
            this.P.hp -= Math.round(this.maxHp() * 0.14);
            this.applyPlayerStatus('bleed', 4.0);
            if (this.P.hp <= 0) this.killPlayer();
          } else {
            this.emitStatus(true);
          }
          SFX.snip();
        }
      }
    }
    this.traps = this.traps.filter((t) => t.life > 0);
    for (const c of this.clouds) {
      c.life -= dt;
      if (!this.P.dead && !this.isRollIframe() && Math.abs(this.P.x - c.x) < c.r && Math.abs(this.P.y - c.y) < 80) {
        this.P.slow = Math.max(this.P.slow || 0, 0.25);
        this.P.poisonBuild = Math.min(100, this.P.poisonBuild + 55 * dt);
        if (this.P.poisonBuild >= 100) {
          this.P.poisonBuild = 0;
          this.applyPlayerStatus('poison', 8.0);
          SFX.hiss();
        }
        c.tick -= dt;
        if (c.tick <= 0) {
          c.tick = 0.6;
          this.P.hp -= Math.round(4 * this.dmgHard());
          this.redFlash = Math.max(this.redFlash, 0.15);
          if (this.P.hp <= 0) this.killPlayer();
        }
      }
    }
    this.clouds = this.clouds.filter((c) => c.life > 0);
    if (this.walls) {
      this.walls.life -= dt;
      const sp = 120 * dt;
      this.walls.l = Math.min(this.walls.tl, this.walls.l + sp);
      this.walls.r = Math.max(this.walls.tr, this.walls.r - sp);
      if (this.walls.life <= 0) this.walls = null;
    }

    for (const d of this.debris) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 760 * dt;
      d.angle += 4.5 * dt;
      d.life -= dt;
    }
    this.debris = this.debris.filter((d) => d.life > 0);

    // Arena-specific environmental magic & pyromancy hazards during Boss Fights
    if (!this.P.dead && this.arena >= 0) {
      this.arenaHazardClock -= dt;
      if (this.arenaHazardClock <= 0) {
        this.arenaHazardClock = 4.5 * this.cdHard();
        const A = ARENAS[this.arena];
        const px = clamp(this.P.x + rnd(-110, 110), A.x0 + 55, A.x1 - 55);
        const gy = groundAt(px) ?? 440;
        if (this.arena === 0) {
          this.marks.push({ x: px, t: 0.78, kind: 'pyro_pillar', dmg: 22, gy });
        } else if (this.arena === 1) {
          this.marks.push({ x: px, t: 0.78, kind: 'solar_glyph', dmg: 22, gy });
        } else if (this.arena === 2) {
          this.marks.push({ x: px, t: 0.78, kind: Math.random() < 0.5 ? 'black_pillar' : 'pyro_pillar', dmg: 24, gy });
        } else if (this.arena === 3) {
          this.marks.push({ x: px, t: 0.76, kind: 'lunar', dmg: 24, gy });
        } else if (this.arena === 4) {
          this.marks.push({ x: px, t: 0.75, kind: Math.random() < 0.6 ? 'black_pillar' : 'lunar', dmg: 26, gy });
        } else if (this.arena === 5) {
          this.marks.push({ x: px, t: 0.76, kind: 'bind_ring', dmg: 20, gy });
        } else if (this.arena === 6) {
          this.marks.push({ x: px, t: 0.76, kind: Math.random() < 0.5 ? 'blood_pillar' : 'lunar', dmg: 26, gy });
        } else if (this.arena === 7) {
          this.marks.push({ x: px, t: 0.74, kind: Math.random() < 0.5 ? 'lightning_strike' : 'acid_rain', dmg: 26, gy });
        } else if (this.arena === 8) {
          this.marks.push({ x: px, t: 0.74, kind: Math.random() < 0.5 ? 'solar_glyph' : 'lunar', dmg: 26, gy });
        } else if (this.arena === 9) {
          this.marks.push({ x: px, t: 0.72, kind: 'blood_pillar', dmg: 28, gy });
        }
      }
    }

    if (!this.P.dead && (this.P.x > 4200 || this.arena >= 0)) {
      this.meteorClock -= dt;
      if (this.meteorClock <= 0) {
        this.meteorClock = this.arena >= 0 ? 6.5 : 9.0;
        const mx = clamp(this.P.x + rnd(-160, 220), 200, WORLD - 200);
        const gy = groundAt(mx);
        const nearBrazier = BRAZ.some((b, i) => Math.abs(b.x - mx) < (i === BRAZ.length - 1 ? 620 : 170));
        if (gy !== null && !nearBrazier) {
          this.meteors.push({ x: mx, gy, t: 0, hit: false });
        }
      }
    }
    for (const m of this.meteors) {
      m.t += dt;
      if (m.t >= 1.55 && !m.hit) {
        m.hit = true;
        this.addRubble(m.x, m.gy, 24);
        this.spark(m.x, m.gy - 10, 22, '#f6d27a', 260, 0.7, 360, 2.8);
        this.spark(m.x, m.gy - 14, 14, '#a6def0', 220, 0.5, 220, 2.2);
        this.shake = Math.max(this.shake, 11);
        SFX.meteor();
        if (Math.abs(this.P.x - m.x) < 72 && Math.abs(this.P.y - m.gy) < 88) {
          this.hurtPlayer(22, m.x);
        }
      }
    }
    this.meteors = this.meteors.filter((m) => m.t < 2.25);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;

    if (this.mode === 'play' && this.isTouch && this.portraitMQ.matches) {
      // Wait for landscape orientation on mobile
    } else if (this.mode === 'play') {
      if (this.pressed.pause) {
        this.setMode('pause');
      } else {
        this.captureInput();
        if (this.hitstop > 0) this.hitstop -= dt;
        else {
          this.updatePlayer(dt);
          if (this.mode === 'play') {
            for (const e of this.enemies) this.updateEnemy(e, dt);
            this.enemies = this.enemies.filter((e) => !e.gone);
            this.updateShots(dt);
            this.updateHazards(dt);
          }
        }
        const target =
          this.arena >= 0
            ? ARENAS[this.arena].x0
            : clamp(this.P.x - W * 0.42 + this.P.face * 40, 0, WORLD - W);
        this.cam += (target - this.cam) * Math.min(1, dt * 5);
      }
    } else if (this.mode === 'pause') {
      if (this.pressed.pause) this.setMode('play');
    } else if (this.mode === 'npc') {
      if (this.pressed.pause) this.closeNpcDialog();
    } else if (this.mode === 'title' || this.mode === 'bestiary') {
      this.cam = 520 + Math.sin(this.time * 0.12) * 420;
      for (const e of this.enemies) e.anim += dt;
    }

    if (this.zoneTrans && this.mode === 'play') {
      this.zoneTrans.t += dt;
      if (this.zoneTrans.t >= this.zoneTrans.dur) this.zoneTrans = null;
    }

    const activeFieldBoss =
      this.arena < 0
        ? this.enemies.find(
            (e) => e.boss && e.fieldBoss && !e.dead && e.state !== 'idle' && Math.abs(e.x - this.P.x) < 620
          )
        : null;
    const activeBoss =
      (this.arena >= 0 ? this.enemies.find((e) => e.boss && !e.fieldBoss && e.k === this.arena) : null) ||
      activeFieldBoss;
    const isBossPhase2 = Boolean(
      activeBoss && (activeBoss.raged || activeBoss.mask > 0 || activeBoss.hp < activeBoss.maxHp * 0.55)
    );
    const activeZone = clamp(Math.floor((this.cam + W * 0.5) / ZONE), 0, NZ - 1);
    setMusicZone(activeZone, isBossPhase2);
    setBossMusic(this.arena >= 0 || !!activeFieldBoss);

    this.shake = Math.max(0, this.shake - dt * 32);
    this.redFlash = Math.max(0, this.redFlash - dt * 1.15);
    this.impactFlash = Math.max(0, this.impactFlash - dt * 2.2);

    if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) this.fitCanvas();

    const g = this.gate();
    renderScene(
      this.ctx,
      this.rs,
      {
        time: this.time,
        cam: this.cam,
        shake: this.shake,
        redFlash: this.redFlash,
        impactFlash: this.impactFlash,
        arena: this.arena,
        mode: this.mode,
        reduceMotion: this.reduceMotion,
        isTouch: this.isTouch,
        look: this.look,
        S: this.S,
        P: this.P,
        drop: this.drop,
        chests: this.chests,
        enemies: this.enemies,
        shots: this.shots,
        marks: this.marks,
        traps: this.traps,
        clouds: this.clouds,
        debris: this.debris,
        meteors: this.meteors,
        walls: this.walls,
        parts: this.parts,
        rollGhosts: this.rollGhosts,
        banner: this.banner,
        nearBrazierIdx: this.nearBrazier(),
        nearChestIdx: this.nearChest(),
        nearLoreIdx: this.nearLore(),
        nearFog: this.nearFog(),
        nearNpc: this.nearNpc(),
        npcs: NPCS.map((def) => ({
          def,
          status: this.getNpcStatus(def),
          ready: this.isNpcObjectiveMet(def),
        })),
        zoneTrans: this.zoneTrans,
        maxHp: this.maxHp(),
        maxSt: this.maxSt(),
        maxFlasks: this.maxFlasks(),
        gateX0: g && this.arena < 0 ? g.x0 : null,
      },
      dt
    );

    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }
    for (const k in this.pressed) this.pressed[k] = false;

    this.raf = requestAnimationFrame(this.frame);
  };
}
