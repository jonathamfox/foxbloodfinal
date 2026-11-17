import React, { useEffect, useState } from 'react';
import { Crown, Flame, Moon, RotateCcw, Sparkles, Sun } from 'lucide-react';
import { BUILDS, getKarmaAlignment } from '../game/constants';
import { LORE_ENTRIES } from '../game/lore';
import type { EndingId, EndingSnapshot } from '../game/types';
import { NPCS } from '../game/world';

interface EndingCutsceneProps {
  snapshot: EndingSnapshot;
  onNewCycle: () => void;
  onContinueExplore: () => void;
  onQuitToTitle: () => void;
}

interface EndingContent {
  kicker: string;
  title: string;
  subtitle: string;
  accent: string;
  bgClass: string;
  badgeClass: string;
  verses: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const ENDING_COPY: Record<EndingId, EndingContent> = {
  alvor: {
    kicker: 'Desfecho I · Alvor Purificado',
    title: 'O Despertar de Velmora',
    subtitle: 'Pela compaixão e firmeza da lanterna, o pesadelo se desfaz em aurora dourada.',
    accent: '#f6d27a',
    bgClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(246,210,122,0.18),rgba(8,10,12,0.96)_62%)]',
    badgeClass: 'border-[#f6d27a]/60 text-[#f6d27a] bg-[#2a200e]/70',
    icon: Sun,
    verses: [
      'Quando a Aia da Lua Vermelha tombou sobre o altar de prata, o berço cósmico silenciou pela primeira vez em séculos.',
      'A névoa espessa que sufocava as dez regiões de Velmora ergueu-se em fios dourados de cinza morna.',
      'As almas presas nos sinos da catedral e nas masmorras de Cainhurst encontraram enfim o descanso.',
      'No horizonte rachado pelas torres partidas, um filete real de sol tocou os paralelepípedos frios — e a Raposa baixou a lâmina, sabendo que a vigília terminou.',
    ],
  },
  vigilia: {
    kicker: 'Desfecho II · Vigília Eterna',
    title: 'O Guardião Entre Dois Céus',
    subtitle: 'Nem entregue à luz cega nem devorado pelo abismo, você mantém o mundo em frágil equilíbrio.',
    accent: '#9ed7f0',
    bgClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(158,215,240,0.16),rgba(8,10,12,0.96)_62%)]',
    badgeClass: 'border-[#9ed7f0]/60 text-[#9ed7f0] bg-[#0f1f29]/70',
    icon: Flame,
    verses: [
      'A Aia da Lua Vermelha desfez-se em névoa prateada, mas o céu acima do Sótão permaneceu partido entre estrela e sombra.',
      'Você não quebrou a roda do pesadelo nem se curvou à fome dos Antigos; apenas tomou o lugar do sino silencioso.',
      'Enquanto os braseiros arderem pelas ruas de Velmora, nenhuma fera ousará atravessar os portões sem pagar o preço do aço e da lanterna.',
      'A madrugada não veio, mas a noite agora tem um sentinela incorruptível.',
    ],
  },
  eclipse: {
    kicker: 'Desfecho III · Ascensão do Eclipse Carmesim',
    title: 'Sobrevivência na Lua Vermelha',
    subtitle: 'O Karma sangrento abriu olhos além da humanidade — e a Raposa herdou o trono cósmico.',
    accent: '#d94854',
    bgClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(217,72,84,0.22),rgba(8,10,12,0.97)_64%)]',
    badgeClass: 'border-[#d94854]/60 text-[#f28b8b] bg-[#2a0e13]/75',
    icon: Moon,
    verses: [
      'Ao derrubar a Aia da Lua Vermelha com mãos manchadas por pactos antigos, você não apagou a marca — você a absorveu por inteiro.',
      'Dos vitrais de Cainhurst ao Ossuário de Yahar’gul, todas as criaturas restantes dobraram os joelhos diante do novo pulso escarlate no céu.',
      'O sangue velho e a cinza lunar fundiram-se sob sua capa, elevando o último vigia acima de homens, caçadores e clérigos.',
      'Velmora não acordou do pesadelo; o pesadelo apenas ganhou um novo senhor sob a Lua Vermelha.',
    ],
  },
};

export const EndingCutscene: React.FC<EndingCutsceneProps> = ({
  snapshot,
  onNewCycle,
  onContinueExplore,
  onQuitToTitle,
}) => {
  const copy = ENDING_COPY[snapshot.ending];
  const Icon = copy.icon;
  const alignment = getKarmaAlignment(snapshot.karma);
  const buildDef = BUILDS[snapshot.build];

  const [revealedCount, setRevealedCount] = useState(1);

  useEffect(() => {
    setRevealedCount(1);
    const timers: number[] = [];
    for (let i = 2; i <= copy.verses.length; i++) {
      timers.push(
        window.setTimeout(() => {
          setRevealedCount(i);
        }, (i - 1) * 1450)
      );
    }
    return () => timers.forEach((id) => clearTimeout(id));
  }, [snapshot.ending, copy.verses.length]);

  const allRevealed = revealedCount >= copy.verses.length;

  return (
    <section
      className={`sheet-backdrop ${copy.bgClass}`}
      aria-label={`Cena final: ${copy.title}`}
    >
      <div className="m-auto w-full max-w-[780px] flex flex-col gap-5 py-6 px-2">
        <div className="flex flex-col items-center text-center gap-2 border-b border-[var(--line)] pb-4">
          <div className={`inline-flex items-center gap-2 border px-3 py-1 rounded-[2px] font-display text-xs tracking-[0.14em] uppercase ${copy.badgeClass}`}>
            <Icon className="w-3.5 h-3.5" />
            {copy.kicker}
          </div>
          <h1
            className="font-display font-normal m-0 text-[clamp(30px,5vw,48px)] leading-tight tracking-[0.04em]"
            style={{ color: copy.accent, textShadow: `0 0 28px ${copy.accent}44` }}
          >
            {copy.title}
          </h1>
          <p className="m-0 text-[var(--mist)] italic max-w-[54ch]">{copy.subtitle}</p>
        </div>

        <div className="flex flex-col gap-3.5 bg-black/45 border border-[var(--line)] p-5 sm:p-6">
          {copy.verses.map((verse, idx) => {
            const visible = idx < revealedCount;
            return (
              <p
                key={idx}
                className={`m-0 leading-relaxed transition-all duration-700 ${
                  visible ? 'opacity-100 translate-y-0 text-[var(--bone)]' : 'opacity-0 translate-y-2 pointer-events-none select-none'
                }`}
              >
                {verse}
              </p>
            );
          })}

          {!allRevealed && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="gothic-btn text-xs py-1 px-3"
                onClick={() => setRevealedCount(copy.verses.length)}
              >
                Revelar crônica completa
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="border border-[var(--line)] bg-[#111518]/90 px-3 py-2 flex flex-col gap-0.5">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--mist)]">
              Karma Final
            </span>
            <span className="font-display text-sm" style={{ color: alignment.col }}>
              {alignment.label} ({snapshot.karma > 0 ? `+${snapshot.karma}` : snapshot.karma})
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[#111518]/90 px-3 py-2 flex flex-col gap-0.5">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--mist)]">
              Vocação &amp; Nível
            </span>
            <span className="font-display text-sm text-[var(--bone)] tabular-nums">
              {buildDef.name} · Nv {snapshot.level}
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[#111518]/90 px-3 py-2 flex flex-col gap-0.5">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--mist)]">
              Ciclo da Vigília
            </span>
            <span className="font-display text-sm text-[var(--ember)]">
              {snapshot.ng > 0 ? `NG+${snapshot.ng}` : '1ª Vigília'}
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[#111518]/90 px-3 py-2 flex flex-col gap-0.5">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--mist)]">
              Chefes das Regiões
            </span>
            <span className="font-display text-sm text-[#a8e28f] tabular-nums">
              {snapshot.bossesDefeated}/10 Derrubados
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[#111518]/90 px-3 py-2 flex flex-col gap-0.5">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--mist)]">
              Pactos &amp; Missões
            </span>
            <span className="font-display text-sm text-[var(--bone)] tabular-nums">
              {snapshot.questsCompleted}/{NPCS.length} Concluídas
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[#111518]/90 px-3 py-2 flex flex-col gap-0.5">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--mist)]">
              Crônicas &amp; Cinzas
            </span>
            <span className="font-display text-sm text-[var(--bone)] tabular-nums">
              {snapshot.unlockedLoreCount}/{LORE_ENTRIES.length} · {snapshot.cinzas} Cinzas
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            className="gothic-btn primary flex items-center gap-2"
            onClick={onNewCycle}
          >
            <RotateCcw className="w-4 h-4" />
            Iniciar Nova Vigília (NG+{snapshot.ng + 1})
          </button>
          <button
            type="button"
            className="gothic-btn flex items-center gap-2"
            onClick={onContinueExplore}
          >
            <Sparkles className="w-4 h-4 text-[var(--ember)]" />
            Continuar Explorando Velmora
          </button>
          <button
            type="button"
            className="gothic-btn flex items-center gap-2"
            onClick={onQuitToTitle}
          >
            <Crown className="w-4 h-4 text-[var(--mist)]" />
            Voltar ao Título
          </button>
        </div>
      </div>
    </section>
  );
};
