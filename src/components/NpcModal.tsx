import React from 'react';
import { CheckCircle2, Flame, Moon, Scale, ScrollText, Sparkles } from 'lucide-react';
import { ARMORS, getKarmaAlignment, RUNES, WEAPONS } from '../game/constants';
import type { NpcDialogSnapshot, QuestStatus } from '../game/types';

interface NpcModalProps {
  snapshot: NpcDialogSnapshot;
  onChoose: (npcId: string, choiceId: string) => void;
  onClose: () => void;
}

function isCompleted(st: QuestStatus): boolean {
  return st === 'completed_light' || st === 'completed_dark' || st === 'completed_neutral';
}

function getStatusMeta(status: QuestStatus, objectiveMet: boolean): {
  label: string;
  colorClass: string;
} {
  if (status === 'completed_light') {
    return { label: 'Juramento da Luz Selado', colorClass: 'border-[#f6d27a]/60 text-[#f6d27a] bg-[#2a210f]/70' };
  }
  if (status === 'completed_dark') {
    return { label: 'Pacto do Abismo Selado', colorClass: 'border-[#d94854]/60 text-[#f28b8b] bg-[#2a0f14]/70' };
  }
  if (status === 'completed_neutral') {
    return { label: 'Vigília Equilibrada Selada', colorClass: 'border-[#9ed7f0]/60 text-[#9ed7f0] bg-[#10202a]/70' };
  }
  if (status === 'ready' || objectiveMet) {
    return { label: 'Objetivo Concluído', colorClass: 'border-[#78c257]/70 text-[#a8e28f] bg-[#122414]/70' };
  }
  if (status === 'active') {
    return { label: 'Em Andamento', colorClass: 'border-[var(--ember)]/60 text-[#f6b040] bg-[#26170c]/70' };
  }
  return { label: 'Nova Missão', colorClass: 'border-[var(--line)] text-[var(--bone)] bg-[#14181b]/80' };
}

export const NpcModal: React.FC<NpcModalProps> = ({ snapshot, onChoose, onClose }) => {
  const { npc, status, karma, objectiveMet, lastOutcome } = snapshot;
  const completed = isCompleted(status);
  const alignment = getKarmaAlignment(karma);
  const statusMeta = getStatusMeta(status, objectiveMet);

  let dialogue = npc.introText;
  if (status === 'completed_light' || status === 'completed_neutral') {
    dialogue = npc.completedLightText;
  } else if (status === 'completed_dark') {
    dialogue = npc.completedDarkText;
  } else if (status === 'ready' || objectiveMet) {
    dialogue = npc.readyText;
  } else if (status === 'active') {
    dialogue = npc.activeText;
  }

  return (
    <section className="sheet-backdrop" aria-label={`Diálogo com ${npc.name}`}>
      <div className="m-auto w-full max-w-[680px] bg-[#0d1013]/95 border border-[var(--line)] rounded-[2px] p-5 sm:p-6 flex flex-col gap-4 shadow-[0_18px_48px_rgba(0,0,0,0.85)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div>
            <h3
              className="font-display text-xs tracking-[0.16em] uppercase m-0 font-normal"
              style={{ color: npc.accent }}
            >
              {npc.title}
            </h3>
            <h2 className="font-display text-[26px] sm:text-[30px] font-normal tracking-[0.04em] m-0 text-[var(--bone)]">
              {npc.name}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 border border-[var(--line)] bg-black/45 px-2.5 py-1 rounded-[2px]">
              <Scale className="w-3.5 h-3.5" style={{ color: alignment.col }} />
              <span className="font-display text-xs" style={{ color: alignment.col }}>
                {alignment.label}
              </span>
              <span className="font-display text-xs text-[var(--mist)] tabular-nums">
                ({karma > 0 ? `+${karma}` : karma})
              </span>
            </div>
            <span className={`font-display text-[11px] px-2 py-0.5 border rounded-[2px] ${statusMeta.colorClass}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div className="border border-[var(--line)] bg-[#121619]/80 px-3.5 py-2.5 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm text-[var(--ember)] flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5 shrink-0" />
              {npc.questTitle}
            </span>
            {objectiveMet && (
              <span className="text-xs font-display text-[#a8e28f] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cumprido
              </span>
            )}
          </div>
          <p className="m-0 text-sm text-[var(--mist)]">{npc.questObjective}</p>
        </div>

        <blockquote className="m-0 border-l-2 pl-4 py-1 text-[var(--bone)] italic leading-relaxed" style={{ borderColor: npc.accent }}>
          “{dialogue}”
        </blockquote>

        {lastOutcome && (
          <div className="border border-[var(--ember)]/55 bg-[#24160c]/60 px-3.5 py-2.5 text-sm text-[#f6d27a] flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#f6d27a]" />
            <span>{lastOutcome}</span>
          </div>
        )}

        {objectiveMet && !completed && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="font-display text-xs uppercase tracking-[0.12em] text-[var(--mist)]">
              Escolha seu juramento
            </div>
            {npc.choices.map((choice) => {
              const isLight = choice.karmaDelta > 0;
              const isDark = choice.karmaDelta < 0;
              const rewards: string[] = [];
              if (choice.rewardCinzas) rewards.push(`+${choice.rewardCinzas} Cinzas`);
              if (choice.rewardWeapon) rewards.push(WEAPONS[choice.rewardWeapon]?.label || choice.rewardWeapon);
              if (choice.rewardArmor) rewards.push(ARMORS[choice.rewardArmor]?.label || choice.rewardArmor);
              if (choice.rewardRune) rewards.push(RUNES[choice.rewardRune]?.label || choice.rewardRune);
              if (choice.rewardLore) rewards.push('Crônica Oculta');

              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChoose(npc.id, choice.id)}
                  className="text-left border border-[var(--line)] hover:border-[var(--ember)] bg-[#14181b] hover:bg-[#1d2227] px-3.5 py-2.5 rounded-[2px] cursor-pointer transition-colors flex flex-col gap-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm text-[var(--bone)] flex items-center gap-1.5">
                      {isLight && <Flame className="w-3.5 h-3.5 text-[#f6d27a]" />}
                      {isDark && <Moon className="w-3.5 h-3.5 text-[#d94854]" />}
                      {!isLight && !isDark && <Scale className="w-3.5 h-3.5 text-[#9ed7f0]" />}
                      {choice.label}
                    </span>
                    <span
                      className={`font-display text-[11px] px-1.5 py-0.5 border rounded-[2px] ${
                        isLight
                          ? 'border-[#f6d27a]/50 text-[#f6d27a]'
                          : isDark
                            ? 'border-[#d94854]/50 text-[#f28b8b]'
                            : 'border-[#9ed7f0]/50 text-[#9ed7f0]'
                      }`}
                    >
                      {isLight ? `+${choice.karmaDelta} Luz` : isDark ? `${choice.karmaDelta} Abismo` : 'Equilíbrio'}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--mist)]">{choice.sublabel}</span>
                  {rewards.length > 0 && (
                    <span className="text-[11px] font-display text-[var(--ember)]">
                      Recompensas: {rewards.join(' · ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!objectiveMet && !completed && (
          <p className="m-0 text-xs text-[var(--mist)] italic">
            Cumpra o objetivo acima pelas ruas ou arenas de Velmora e retorne para receber sua recompensa.
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--line)] pt-3">
          <button type="button" className="gothic-btn primary" onClick={onClose}>
            Continuar Vigília [Esc]
          </button>
        </div>
      </div>
    </section>
  );
};
