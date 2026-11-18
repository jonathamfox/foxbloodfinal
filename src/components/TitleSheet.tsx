import React from 'react';
import { Flame, Shield, Sparkles, Sword, Target } from 'lucide-react';
import { ARMORS, BUILD_LIST, BUILDS, SHIELDS, WEAPONS } from '../game/constants';
import { LORE_ENTRIES } from '../game/lore';
import type { ArmorId, BuildId, PlayerLook, ShieldId, WeaponId } from '../game/types';
import { HunterPortrait } from './HunterPortrait';

interface TitleSheetProps {
  hasSave: boolean;
  look: PlayerLook;
  unlockedWeapons: WeaponId[];
  unlockedArmors: ArmorId[];
  unlockedShields: ShieldId[];
  unlockedLoreCount?: number;
  onContinue: () => void;
  onNewGame: () => void;
  onSelectBuild: (b: BuildId) => void;
  onSelectWeapon: (w: WeaponId) => void;
  onSelectArmor: (a: ArmorId) => void;
  onSelectShield: (s: ShieldId) => void;
  onOpenBestiary: () => void;
  onOpenLore: () => void;
}

const BUILD_ICONS: Record<BuildId, React.ComponentType<{ className?: string }>> = {
  guerreiro: Sword,
  arqueiro: Target,
  mago: Sparkles,
  piromante: Flame,
};

export const TitleSheet: React.FC<TitleSheetProps> = ({
  hasSave,
  look,
  unlockedWeapons,
  unlockedArmors,
  unlockedShields,
  unlockedLoreCount = 1,
  onContinue,
  onNewGame,
  onSelectBuild,
  onSelectWeapon,
  onSelectArmor,
  onSelectShield,
  onOpenBestiary,
  onOpenLore,
}) => {
  const currentBuild = BUILDS[look.build];
  const currentWeapon = WEAPONS[look.weapon];
  const currentArmor = ARMORS[look.armor];
  const currentShield = SHIELDS.find((s) => s.id === look.shield) || SHIELDS[0];

  return (
    <section className="sheet-backdrop title-backdrop" aria-label="Menu inicial">
      <div className="m-auto w-full max-w-[960px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-6 items-center py-4">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display text-[15px] tracking-[0.16em] uppercase text-[var(--ember)] m-0 font-normal">
              Velmora, a cidade velada
            </h3>
            <h1
              className="font-display font-normal m-0 leading-none tracking-[0.05em] text-[clamp(42px,8vw,72px)]"
              style={{ textWrap: 'balance', textShadow: '0 0 34px rgba(217,119,47,0.35)' }}
            >
              Fox Borne
            </h1>
            <p className="m-0 text-[var(--mist)] italic max-w-[54ch]">
              Ruas, esgotos e subsolos ligados por escadas e passagens. Sem pulo ou escudo: controle a estamina e esquive. Descubra enigmas, enfrente doze chefes e conquiste suas relíquias.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {hasSave && (
              <button type="button" className="gothic-btn primary" onClick={onContinue}>
                Continuar vigília
              </button>
            )}
            <button type="button" className="gothic-btn primary" onClick={onNewGame}>
              Nova jornada
            </button>
            <button type="button" className="gothic-btn" onClick={onOpenBestiary}>
              Bestiário
            </button>
            <button type="button" className="gothic-btn" onClick={onOpenLore}>
              Crônicas ({unlockedLoreCount}/{LORE_ENTRIES.length})
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm tracking-[0.06em] text-[var(--bone)]">
                  Classe / Build inicial
                </span>
                <span className="text-sm text-[var(--mist)] italic">{currentBuild.subtitle}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" role="group" aria-label="Escolha de classe">
                {BUILD_LIST.map((b) => {
                  const Icon = BUILD_ICONS[b.id];
                  const active = look.build === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className="gothic-btn gothic-choice flex flex-col items-start text-left gap-1 p-2.5"
                      aria-pressed={active}
                      onClick={() => onSelectBuild(b.id)}
                    >
                      <span className="flex items-center gap-1.5 font-display text-[15px] text-[var(--bone)]">
                        <Icon className="w-3.5 h-3.5 text-[var(--ember)]" />
                        {b.name}
                      </span>
                      <span className="text-xs text-[var(--mist)] leading-snug">{b.subtitle}</span>
                    </button>
                  );
                })}
              </div>
              <p className="m-0 text-sm text-[var(--mist)] italic">
                {currentBuild.desc}{' '}
                <span className="text-[var(--bone)] not-italic">Especial ({currentBuild.specialName}):</span>{' '}
                {currentBuild.specialDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <span className="font-display text-xs tracking-[0.06em] uppercase text-[var(--bone)]">
                  Arma equipada
                </span>
                {unlockedWeapons.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {unlockedWeapons.map((wId) => (
                      <button
                        key={wId}
                        type="button"
                        className="gothic-btn gothic-choice text-xs py-1 px-2"
                        aria-pressed={look.weapon === wId}
                        onClick={() => onSelectWeapon(wId)}
                      >
                        {WEAPONS[wId].label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--ember)]">{currentWeapon.label}</div>
                )}
                <span className="text-xs text-[var(--mist)] italic">{currentWeapon.desc}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-display text-xs tracking-[0.06em] uppercase text-[var(--bone)]">
                  Armadura
                </span>
                {unlockedArmors.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {unlockedArmors.map((aId) => (
                      <button
                        key={aId}
                        type="button"
                        className="gothic-btn gothic-choice text-xs py-1 px-2"
                        aria-pressed={look.armor === aId}
                        onClick={() => onSelectArmor(aId)}
                      >
                        {ARMORS[aId].label}
                      </button>
                    ))}
                    
                  </div>
                ) : (
                  <div className="text-sm text-[var(--ember)]">
                    {currentArmor.label}
                  </div>
                )}
                <span className="text-xs text-[var(--mist)] italic">{currentArmor.desc}</span>
              </div>
            </div>
          </div>

          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-[14px] border-t border-[var(--line)] pt-3">
            <dt className="font-display text-[var(--bone)]">A / D ou setas</dt>
            <dd className="m-0 text-[var(--mist)]">andar</dd>
            <dt className="font-display text-[var(--bone)]">J / K</dt>
            <dd className="m-0 text-[var(--mist)]">ataque rápido e ataque forte (corpo a corpo, flechas, magia ou piromancia)</dd>
            <dt className="font-display text-[var(--bone)]">F</dt>
            <dd className="m-0 text-[var(--mist)]">alternar tipo de magia ou piromancia (com cajado ou chama equipada)</dd>
            <dt className="font-display text-[var(--bone)]">C</dt>
            <dd className="m-0 text-[var(--mist)]">especial da build quando a carga atingir 100%</dd>
            <dt className="font-display text-[var(--bone)]">Espaço / L / Shift</dt>
            <dd className="m-0 text-[var(--mist)]">
              rolar (i-frames etéreos; esquiva perfeita concede +35% de contra-golpe)
            </dd>
            <dt className="font-display text-[var(--bone)]">Q</dt>
            <dd className="m-0 text-[var(--mist)]">beber um frasco de brasa (cura e purifica status)</dd>
            <dt className="font-display text-[var(--bone)]">E</dt>
            <dd className="m-0 text-[var(--mist)]">
              subir escadas, atravessar passagens, falar, abrir baús e descansar
            </dd>
          </dl>
        </div>

        <aside className="hidden md:flex items-center justify-center">
          <HunterPortrait className="w-full max-w-[280px]" />
        </aside>
      </div>
    </section>
  );
};
