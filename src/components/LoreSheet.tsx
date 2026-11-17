import React, { useState } from 'react';
import { BookOpen, Lock } from 'lucide-react';
import { LORE_ENTRIES } from '../game/lore';
import type { LoreEntry } from '../game/types';

interface LoreSheetProps {
  unlockedIds: string[];
  onClose: () => void;
}

type CategoryFilter = 'Todas' | LoreEntry['category'];

const CATEGORIES: CategoryFilter[] = ['Todas', 'Mundo', 'Ordem', 'Chefes'];

export const LoreSheet: React.FC<LoreSheetProps> = ({ unlockedIds, onClose }) => {
  const [filter, setFilter] = useState<CategoryFilter>('Todas');

  const unlockedSet = new Set(unlockedIds);
  const unlockedCount = LORE_ENTRIES.filter((entry) => unlockedSet.has(entry.id)).length;
  const visible =
    filter === 'Todas' ? LORE_ENTRIES : LORE_ENTRIES.filter((entry) => entry.category === filter);

  return (
    <section className="sheet-backdrop" aria-label="Crônicas de Velmora">
      <div className="m-auto w-full max-w-[840px] flex flex-col gap-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-3">
          <div>
            <h3 className="font-display text-[15px] tracking-[0.16em] uppercase text-[var(--ember)] m-0 font-normal">
              Memórias da Vigília · {unlockedCount}/{LORE_ENTRIES.length}
            </h3>
            <h2 className="font-display text-[30px] font-normal tracking-[0.05em] m-0">
              Crônicas de Velmora
            </h2>
          </div>
          <button type="button" className="gothic-btn primary" onClick={onClose}>
            Voltar
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categorias das crônicas">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={filter === cat}
                aria-pressed={filter === cat}
                className="gothic-btn gothic-choice text-xs py-1 px-3"
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-xs text-[var(--mist)] italic">
            Examine obeliscos pelas ruas e derrote horrores para revelar fragmentos perdidos.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {visible.map((entry) => {
            const unlocked = unlockedSet.has(entry.id);
            return (
              <article
                key={entry.id}
                className={`border-b border-[var(--line)] pb-3.5 flex flex-col gap-1.5 ${
                  unlocked ? '' : 'opacity-65'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-display text-lg font-normal m-0 text-[var(--bone)] flex items-center gap-2">
                    {unlocked ? (
                      <BookOpen className="w-3.5 h-3.5 text-[#7fe6ee] shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[var(--mist)] shrink-0" />
                    )}
                    <span>{unlocked ? entry.title : 'Fragmento Selado'}</span>
                  </h4>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ember)] shrink-0">
                    {entry.category}
                  </span>
                </div>
                {unlocked ? (
                  <>
                    <div className="text-xs text-[#9fb8c2] italic">{entry.subtitle}</div>
                    <p className="m-0 text-sm text-[var(--mist)] leading-relaxed">{entry.body}</p>
                  </>
                ) : (
                  <p className="m-0 text-xs text-[var(--mist)] italic">{entry.unlockHint}</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
