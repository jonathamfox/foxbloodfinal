/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { BestiarySheet } from './components/BestiarySheet';
import { EndingCutscene } from './components/EndingCutscene';
import { LoreSheet } from './components/LoreSheet';
import { MiniMap } from './components/MiniMap';
import { NpcModal } from './components/NpcModal';
import { PauseSheet } from './components/PauseSheet';
import { RestSheet } from './components/RestSheet';
import { StatusEffectsHUD } from './components/StatusEffectsHUD';
import { TitleSheet } from './components/TitleSheet';
import { TouchControls } from './components/TouchControls';
import { defaultLook, EXPLORE_BINS, H, NZ, W } from './game/constants';
import { FoxBorneEngine } from './game/engine';
import type {
  ArmorId,
  BuildId,
  EndingSnapshot,
  GameMode,
  MiniMapSnapshot,
  NpcDialogSnapshot,
  PlayerLook,
  RestSnapshot,
  ShieldId,
  StatusHudSnapshot,
  WeaponId,
} from './game/types';

function goFull(toggle = false) {
  try {
    const d = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
    };
    const el = d.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const on = d.fullscreenElement || d.webkitFullscreenElement;
    if (on) {
      if (toggle) {
        if (d.exitFullscreen) d.exitFullscreen();
        else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
      }
      return;
    }
    const lock = () => {
      try {
        const ori = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (ori && typeof ori.lock === 'function') {
          ori.lock('landscape').catch(() => {});
        }
      } catch {
        // ignore
      }
    };
    if (el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
        .then(lock)
        .catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      lock();
    }
  } catch {
    // ignore
  }
}

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FoxBorneEngine | null>(null);

  const [mode, setMode] = useState<GameMode>('title');
  const [hasSave, setHasSave] = useState(false);
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.55);
  const [look, setLook] = useState<PlayerLook>(defaultLook());
  const [npcDialog, setNpcDialog] = useState<NpcDialogSnapshot | null>(null);
  const [endingData, setEndingData] = useState<EndingSnapshot | null>(null);
  const [statusHud, setStatusHud] = useState<StatusHudSnapshot>({
    effects: [],
    buildups: [],
    energy: 40,
    build: 'guerreiro',
    evadeBuff: 0,
    inIframe: false,
    karma: 0,
    ng: 0,
  });
  const [miniMapCollapsed, setMiniMapCollapsed] = useState(false);
  const [miniMap, setMiniMap] = useState<MiniMapSnapshot>({
    playerX: 190,
    playerY: 440,
    playerFace: 1,
    zone: 0,
    inArena: false,
    explored: Array(EXPLORE_BINS).fill(false),
    litBraziers: [true],
    bossesDead: Array(NZ).fill(false),
    deadField: [],
    openedChests: [],
    readLore: ['prologo'],
    drop: null,
    karma: 0,
    quests: {},
  });
  const [restData, setRestData] = useState<RestSnapshot>({
    cinzas: 0,
    level: 1,
    cost: 90,
    vig: 0,
    end: 0,
    str: 0,
    arc: 0,
    flask: 0,
    maxFlasks: 4,
    allBossesDead: false,
    ng: 0,
    karma: 0,
    build: 'guerreiro',
    weapon: 'espada_vigilia',
    armor: 'cota_guardiao',
    shield: 1,
    unlockedWeapons: ['espada_vigilia'],
    unlockedArmors: ['sobretudo_velmora', 'cota_guardiao'],
    unlockedShields: [1],
    unlockedRunes: ['runa_garra', 'runa_lua', 'runa_fortuna'],
    equippedRunes: [],
    unlockedLore: ['prologo'],
    quests: {},
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new FoxBorneEngine(canvas, {
      onModeChange: setMode,
      onSaveStatus: setHasSave,
      onRestUpdate: setRestData,
      onMuteChange: setMuted,
      onLookChange: setLook,
      onStatusChange: setStatusHud,
      onMiniMapChange: setMiniMap,
      onNpcDialog: setNpcDialog,
      onEnding: setEndingData,
    });
    engineRef.current = engine;
    setMusicVolume(engine.getMusicVolume());

    const preventGesture = (e: Event) => e.preventDefault();
    const handleMapToggle = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'KeyM') setMiniMapCollapsed((v) => !v);
    };
    addEventListener('dblclick', preventGesture);
    addEventListener('gesturestart', preventGesture);
    addEventListener('keydown', handleMapToggle);

    return () => {
      removeEventListener('dblclick', preventGesture);
      removeEventListener('gesturestart', preventGesture);
      removeEventListener('keydown', handleMapToggle);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const isTouch = typeof window !== 'undefined' && matchMedia('(pointer:coarse)').matches;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2.5">
      <div className="stage">
        <canvas ref={canvasRef} id="game" width={W} height={H} aria-label="Fox Borne" />
        {(mode === 'play' || mode === 'pause') && (
          <>
            <StatusEffectsHUD snapshot={statusHud} />
            <MiniMap
              snapshot={miniMap}
              collapsed={miniMapCollapsed}
              onToggleCollapse={() => setMiniMapCollapsed((v) => !v)}
            />
          </>
        )}
      </div>

      <p className="keys-bar m-0 text-[var(--mist)] text-sm text-center flex flex-wrap gap-x-4 gap-y-1 justify-center">
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">A D</b> andar
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">Espaço</b> pular
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">J</b> golpe
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">K</b> golpe forte
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">F</b> feitiço
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">C</b> especial
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">L / Shift</b> rolar (i-frames)
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">I / S</b> escudo
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">Q</b> frasco
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">E</b> usar / ler / falar
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">M</b> mapa
        </span>
        <span>
          <b className="font-display font-normal text-[var(--bone)] tracking-[0.04em]">Esc</b> pausa / equipar
        </span>
      </p>

      <TouchControls
        hidden={mode !== 'play'}
        energy={statusHud.energy}
        showSpellBtn={!!statusHud.spellLabel}
        onKey={(k, down) => engineRef.current?.setTouchKey(k, down)}
        onMove={(l, r) => engineRef.current?.setTouchMove(l, r)}
        onPause={() => engineRef.current?.setTouchKey('pause', true)}
      />

      {mode === 'title' && (
        <TitleSheet
          hasSave={hasSave}
          look={look}
          unlockedWeapons={restData.unlockedWeapons}
          unlockedArmors={restData.unlockedArmors}
          unlockedShields={restData.unlockedShields}
          unlockedLoreCount={restData.unlockedLore.length}
          onContinue={() => {
            if (isTouch) goFull(false);
            engineRef.current?.startGame(false);
          }}
          onNewGame={() => {
            if (isTouch) goFull(false);
            engineRef.current?.startGame(true);
          }}
          onSelectBuild={(b: BuildId) => engineRef.current?.setBuild(b)}
          onSelectWeapon={(w: WeaponId) => engineRef.current?.setWeapon(w)}
          onSelectArmor={(a: ArmorId) => engineRef.current?.setArmor(a)}
          onSelectShield={(s: ShieldId) => engineRef.current?.setShield(s)}
          onOpenBestiary={() => engineRef.current?.openBestiary('title')}
          onOpenLore={() => engineRef.current?.openLore('title')}
        />
      )}

      {mode === 'rest' && (
        <RestSheet
          data={restData}
          onUpgrade={(st) => engineRef.current?.upgradeStat(st)}
          onSelectWeapon={(w) => engineRef.current?.setWeapon(w)}
          onSelectArmor={(a) => engineRef.current?.setArmor(a)}
          onSelectShield={(s) => engineRef.current?.setShield(s)}
          onToggleRune={(r) => engineRef.current?.toggleRune(r)}
          onLeave={() => engineRef.current?.resumeGame()}
          onOpenLore={() => engineRef.current?.openLore('rest')}
          onNewCycle={() => engineRef.current?.startNewCycle()}
          onOpenEnding={() => engineRef.current?.openEnding()}
        />
      )}

      {mode === 'pause' && (
        <PauseSheet
          muted={muted}
          musicVolume={musicVolume}
          restData={restData}
          onSelectWeapon={(w) => engineRef.current?.setWeapon(w)}
          onSelectArmor={(a) => engineRef.current?.setArmor(a)}
          onSelectShield={(s) => engineRef.current?.setShield(s)}
          onVolumeChange={(v) => {
            setMusicVolume(v);
            engineRef.current?.setMusicVolume(v);
          }}
          onResume={() => {
            if (isTouch) goFull(false);
            engineRef.current?.resumeGame();
          }}
          onOpenBestiary={() => engineRef.current?.openBestiary('pause')}
          onOpenLore={() => engineRef.current?.openLore('pause')}
          onToggleFullscreen={() => goFull(true)}
          onToggleMute={() => engineRef.current?.toggleAudio()}
          onQuit={() => engineRef.current?.quitToTitle()}
        />
      )}

      {mode === 'npc' && npcDialog && (
        <NpcModal
          snapshot={npcDialog}
          onChoose={(npcId, choiceId) => engineRef.current?.chooseNpcOption(npcId, choiceId)}
          onClose={() => engineRef.current?.closeNpcDialog()}
        />
      )}

      {mode === 'ending' && endingData && (
        <EndingCutscene
          snapshot={endingData}
          onNewCycle={() => engineRef.current?.startNewCycle()}
          onContinueExplore={() => engineRef.current?.resumeGame()}
          onQuitToTitle={() => engineRef.current?.quitToTitle()}
        />
      )}

      {mode === 'bestiary' && (
        <BestiarySheet onClose={() => engineRef.current?.closeBestiary()} />
      )}

      {mode === 'lore' && (
        <LoreSheet
          unlockedIds={restData.unlockedLore}
          onClose={() => engineRef.current?.closeLore()}
        />
      )}
    </div>
  );
}


// Mount the game only after the opening, keeping its controls and audio inactive.
export default function App() {
  const [opening, setOpening] = useState(true);
  const [sound, setSound] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  if (!opening) return <Game />;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        src={import.meta.env.BASE_URL + 'assets/abertura.mp4'}
        autoPlay muted={!sound} playsInline controls preload="metadata"
        aria-label="Abertura de Fox Borne"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onEnded={() => setOpening(false)}
        onError={() => setOpening(false)}
      />
      <div style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 'max(16px, env(safe-area-inset-right))', display: 'flex', gap: 12 }}>
        {!sound && <button autoFocus onClick={() => {
          setSound(true);
          if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.play().catch(() => {});
          }
        }} style={{ padding: '12px 18px', background: '#191919e8', color: '#fff', border: '1px solid #aaa', borderRadius: 6 }}>Ativar som</button>}
        <button onClick={() => setOpening(false)} style={{ padding: '12px 18px', background: '#191919e8', color: '#fff', border: '1px solid #aaa', borderRadius: 6 }}>Pular abertura</button>
      </div>
    </div>
  );
}
