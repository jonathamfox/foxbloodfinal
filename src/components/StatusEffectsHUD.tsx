import React from 'react';
import { Biohazard, Droplets, Flame, Link2, Scale, Skull, Sparkles, Wind, Zap } from 'lucide-react';
import { getKarmaAlignment } from '../game/constants';
import type { StatusEffectId, StatusHudSnapshot } from '../game/types';

interface StatusEffectsHUDProps {
  snapshot: StatusHudSnapshot;
}

const META: Record<
  StatusEffectId,
  {
    borderColor: string;
    barColor: string;
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  poison: {
    borderColor: 'border-[#589e42]/70',
    barColor: 'bg-[#78c257]',
    textColor: 'text-[#a8e28f]',
    icon: Biohazard,
  },
  stagger: {
    borderColor: 'border-[#d9772f]/80',
    barColor: 'bg-[#f6d27a]',
    textColor: 'text-[#f6d27a]',
    icon: Zap,
  },
  bleed: {
    borderColor: 'border-[#9a2222]/80',
    barColor: 'bg-[#d13838]',
    textColor: 'text-[#f28b8b]',
    icon: Droplets,
  },
  slow: {
    borderColor: 'border-[#8d9692]/70',
    barColor: 'bg-[#c8b8a6]',
    textColor: 'text-[#d8d0bd]',
    icon: Link2,
  },
  burn: {
    borderColor: 'border-[#e87028]/80',
    barColor: 'bg-[#ff7d30]',
    textColor: 'text-[#ffb870]',
    icon: Flame,
  },
};

export const StatusEffectsHUD: React.FC<StatusEffectsHUDProps> = ({ snapshot }) => {
  const { effects, buildups, evadeBuff, inIframe, spellLabel, spellCol, spellKind, karma, ng } = snapshot;
  const showMeta = karma !== 0 || ng > 0;
  if (effects.length === 0 && buildups.length === 0 && evadeBuff <= 0 && !inIframe && !spellLabel && !showMeta) {
    return null;
  }

  const alignment = getKarmaAlignment(karma);

  return (
    <div
      className="pointer-events-none absolute top-[19.5%] left-[2.3%] z-[5] flex flex-col gap-1.5 max-w-[340px]"
      aria-live="polite"
      aria-label="Efeitos de estado ativos"
    >
      {(showMeta || spellLabel || inIframe || evadeBuff > 0 || effects.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {ng > 0 && (
            <div className="bg-[#0a0c0e]/85 border border-[#c23a3a]/70 rounded-[2px] px-2 py-1 flex items-center gap-1">
              <Skull className="w-3 h-3 shrink-0 text-[#f28b8b]" />
              <span className="font-display text-[11px] tracking-[0.04em] whitespace-nowrap text-[#f28b8b]">
                NG+{ng}
              </span>
            </div>
          )}
          {karma !== 0 && (
            <div
              className="bg-[#0a0c0e]/85 border rounded-[2px] px-2 py-1 flex items-center gap-1"
              style={{ borderColor: `${alignment.col}99` }}
            >
              <Scale className="w-3 h-3 shrink-0" style={{ color: alignment.col }} />
              <span className="font-display text-[11px] tracking-[0.04em] whitespace-nowrap" style={{ color: alignment.col }}>
                {alignment.label} ({karma > 0 ? `+${karma}` : karma})
              </span>
            </div>
          )}
          {spellLabel && (
            <div
              className="relative overflow-hidden bg-[#0a0c0e]/85 border rounded-[2px] px-2.5 py-1 flex items-center gap-1.5"
              style={{ borderColor: spellCol || '#9ed7f0' }}
            >
              {spellKind === 'pyro' ? (
                <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: spellCol || '#f68a38' }} />
              ) : (
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: spellCol || '#9ed7f0' }} />
              )}
              <span
                className="font-display text-xs tracking-[0.04em] whitespace-nowrap"
                style={{ color: spellCol || '#9ed7f0' }}
              >
                {spellLabel}
              </span>
              <span className="font-display text-[10px] text-[var(--mist)] whitespace-nowrap">[F]</span>
            </div>
          )}

          {inIframe && (
            <div className="relative overflow-hidden bg-[#0a0c0e]/85 border border-[#7fe6ee]/80 rounded-[2px] px-2.5 py-1 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 shrink-0 text-[#9cf4fa]" />
              <span className="font-display text-xs tracking-[0.04em] whitespace-nowrap text-[#9cf4fa]">
                Esquiva Etérea
              </span>
            </div>
          )}

          {evadeBuff > 0 && (
            <div className="relative overflow-hidden bg-[#0a0c0e]/85 border border-[#7fe6ee]/80 rounded-[2px] px-2.5 py-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#9cf4fa]" />
              <span className="font-display text-xs tracking-[0.04em] whitespace-nowrap text-[#e6fbff]">
                Contra-golpe +35%
              </span>
              <span className="font-display text-[11px] text-[#9cf4fa] tabular-nums whitespace-nowrap">
                {evadeBuff.toFixed(1)}s
              </span>
              <div
                className="absolute bottom-0 left-0 h-[2px] bg-[#7fe6ee]"
                style={{ width: `${Math.max(0, Math.min(100, (evadeBuff / 1.8) * 100))}%` }}
              />
            </div>
          )}

          {effects.map((eff) => {
            const cfg = META[eff.id];
            const Icon = cfg.icon;
            const pct = Math.max(0, Math.min(100, (eff.remaining / eff.duration) * 100));
            return (
              <div
                key={eff.id}
                className={`relative overflow-hidden bg-[#0a0c0e]/85 border ${cfg.borderColor} rounded-[2px] px-2.5 py-1 flex items-center gap-1.5`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.textColor}`} />
                <span className={`font-display text-xs tracking-[0.04em] whitespace-nowrap ${cfg.textColor}`}>
                  {eff.label}
                </span>
                <span className="font-display text-[11px] text-[var(--mist)] tabular-nums whitespace-nowrap">
                  {eff.remaining.toFixed(1)}s
                </span>
                <div
                  className={`absolute bottom-0 left-0 h-[2px] ${cfg.barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {buildups.length > 0 && (
        <div className="flex flex-col gap-1">
          {buildups.map((b) => {
            const isPoison = b.id === 'poison';
            const barCol = isPoison ? 'bg-[#78c257]' : 'bg-[#d13838]';
            const textCol = isPoison ? 'text-[#a8e28f]' : 'text-[#f28b8b]';
            const Icon = isPoison ? Biohazard : Droplets;
            return (
              <div
                key={b.id}
                className="bg-[#0a0c0e]/85 border border-[var(--line)] rounded-[2px] px-2.5 py-1 flex flex-col gap-1 min-w-[148px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1 font-display text-[11px] tracking-[0.04em] ${textCol}`}>
                    <Icon className="w-3 h-3 shrink-0" />
                    {b.label}
                  </span>
                  <span className="font-display text-[11px] text-[var(--mist)] tabular-nums">
                    {b.value}%
                  </span>
                </div>
                <div className="w-full h-[3px] bg-black/70 overflow-hidden">
                  <div className={`h-full ${barCol}`} style={{ width: `${b.value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
