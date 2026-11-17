import React from 'react';
import { ARMORS, BUILDS, getKarmaAlignment, SHIELDS, WEAPONS } from '../game/constants';
import { LORE_ENTRIES } from '../game/lore';
import type { ArmorId, RestSnapshot, ShieldId, WeaponId } from '../game/types';

interface PauseSheetProps {
  muted: boolean;
  musicVolume: number;
  restData: RestSnapshot;
  onSelectWeapon: (w: WeaponId) => void;
  onSelectArmor: (a: ArmorId) => void;
  onSelectShield: (s: ShieldId) => void;
  onVolumeChange: (v: number) => void;
  onResume: () => void;
  onOpenBestiary: () => void;
  onOpenLore: () => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onQuit: () => void;
}

export const PauseSheet: React.FC<PauseSheetProps> = ({
  muted,
  musicVolume,
  restData,
  onSelectWeapon,
  onSelectArmor,
  onSelectShield,
  onVolumeChange,
  onResume,
  onOpenBestiary,
  onOpenLore,
  onToggleFullscreen,
  onToggleMute,
  onQuit,
}) => {
  const bDef = BUILDS[restData.build];
  const alignment = getKarmaAlignment(restData.karma);

  return (
    <section className="sheet-backdrop" aria-label="Pausa">
      <div className="m-auto w-full max-w-[600px] flex flex-col gap-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-[15px] tracking-[0.16em] uppercase text-[var(--ember)] m-0 font-normal">
              Pausa · {bDef.name}
              {restData.ng > 0 ? ` · NG+${restData.ng}` : ''}
            </h3>
            <h2 className="font-display text-[30px] font-normal tracking-[0.05em] m-0">
              A noite espera
            </h2>
          </div>
          <span className="font-display text-xs px-2.5 py-1 border border-[var(--line)] bg-black/45" style={{ color: alignment.col }}>
            Karma: {alignment.label} ({restData.karma > 0 ? `+${restData.karma}` : restData.karma})
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="gothic-btn primary" onClick={onResume}>
            Continuar
          </button>
          <button type="button" className="gothic-btn" onClick={onOpenBestiary}>
            Bestiário
          </button>
          <button type="button" className="gothic-btn" onClick={onOpenLore}>
            Crônicas ({restData.unlockedLore.length}/{LORE_ENTRIES.length})
          </button>
          <button type="button" className="gothic-btn" onClick={onToggleFullscreen}>
            Tela cheia
          </button>
          <button type="button" className="gothic-btn" onClick={onToggleMute}>
            Som: {muted ? 'desligado' : 'ligado'}
          </button>
          <button type="button" className="gothic-btn" onClick={onQuit}>
            Voltar ao título
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xs tracking-[0.06em] uppercase text-[var(--bone)]">
                Armas encontradas
              </span>
              <span className="text-xs text-[var(--mist)] italic">{WEAPONS[restData.weapon].desc}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {restData.unlockedWeapons.map((wId) => (
                <button
                  key={wId}
                  type="button"
                  className="gothic-btn gothic-choice text-xs py-1 px-2.5"
                  aria-pressed={restData.weapon === wId}
                  onClick={() => onSelectWeapon(wId)}
                >
                  {WEAPONS[wId].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xs tracking-[0.06em] uppercase text-[var(--bone)]">
                Armaduras &amp; Escudos
              </span>
              <span className="text-xs text-[var(--mist)] italic">{ARMORS[restData.armor].desc}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {restData.unlockedArmors.map((aId) => (
                <button
                  key={aId}
                  type="button"
                  className="gothic-btn gothic-choice text-xs py-1 px-2.5"
                  aria-pressed={restData.armor === aId}
                  onClick={() => onSelectArmor(aId)}
                >
                  {ARMORS[aId].label}
                </button>
              ))}
              {restData.unlockedShields.map((sId) => {
                const sh = SHIELDS.find((x) => x.id === sId) || SHIELDS[0];
                return (
                  <button
                    key={sId}
                    type="button"
                    className="gothic-btn gothic-choice text-xs py-1 px-2.5"
                    aria-pressed={restData.shield === sId}
                    onClick={() => onSelectShield(sId)}
                  >
                    {sh.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 border-t border-[var(--line)] pt-3 text-sm text-[var(--mist)]">
          <span className="font-display tracking-[0.06em] text-[var(--bone)]">Volume da música</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(musicVolume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="flex-1 max-w-[200px] accent-[var(--ember)] cursor-pointer"
            aria-label="Volume da música"
          />
          <span className="tabular-nums min-w-[4ch] text-right text-[var(--bone)]">
            {Math.round(musicVolume * 100)}%
          </span>
        </label>

        <p className="m-0 text-[var(--mist)] text-sm italic">
          Troque armas e armaduras descobertas a qualquer instante pela pausa ou num braseiro.
        </p>
      </div>
    </section>
  );
};
