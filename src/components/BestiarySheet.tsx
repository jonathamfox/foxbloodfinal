import React, { useMemo, useState } from 'react';
import { ET } from '../game/constants';
import type { EnemyId } from '../game/types';

interface BestiarySheetProps {
  onClose: () => void;
}

type TierFilter = 'Todos' | 'Comum' | 'Elite' | 'Chefe';

const ORDER: EnemyId[] = [
  'peregrino',
  'cao',
  'costureira',
  'atirador',
  'alquimista',
  'lobisomem',
  'emissario',
  'sombra',
  'besta_eletrica',
  'monge_gaiola',
  'gargula',
  'carrasco',
  'viuva',
  'cavaleiro',
  'sentinela',
  'cacador',
  'madre',
  'fera',
  'santo',
  'rei',
  'rom',
  'amigdala',
  'bruxa',
  'martir',
  'renascido',
  'ebrietas',
  'ama',
];

const BESTIARY_ART = '/assets/aistudio/Besti_rio_das_Cinzas__nove_monstros_g_ticos__1__caf0037f.png';

export const BestiarySheet: React.FC<BestiarySheetProps> = ({ onClose }) => {
  const [filter, setFilter] = useState<TierFilter>('Todos');

  const filtered = useMemo(() => {
    if (filter === 'Todos') return ORDER;
    return ORDER.filter((id) => ET[id].tier === filter);
  }, [filter]);

  return (
    <section className="sheet-backdrop" aria-label="Bestiário de Velmora">
      <div className="m-auto w-full max-w-[880px] flex flex-col gap-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-3">
          <div>
            <h3 className="font-display text-[15px] tracking-[0.16em] uppercase text-[var(--ember)] m-0 font-normal">
              Crônicas da Vigília · {ORDER.length} Horrores
            </h3>
            <h2 className="font-display text-[30px] font-normal tracking-[0.05em] m-0">
              Bestiário de Velmora
            </h2>
          </div>
          <button type="button" className="gothic-btn primary" onClick={onClose}>
            Voltar
          </button>
        </div>

        <figure className="m-0 border border-[var(--line)] bg-[#0b0d10] overflow-hidden">
          <img
            src={BESTIARY_ART}
            alt="Bestiário das Cinzas: ilustrações dos horrores comuns, elites e chefes de Velmora"
            referrerPolicy="no-referrer"
            className="w-full h-auto block"
          />
        </figure>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar bestiário">
          {(['Todos', 'Comum', 'Elite', 'Chefe'] as TierFilter[]).map((tab) => {
            const count = tab === 'Todos' ? ORDER.length : ORDER.filter((id) => ET[id].tier === tab).length;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={filter === tab}
                aria-pressed={filter === tab}
                className="gothic-btn gothic-choice text-xs py-1 px-3"
                onClick={() => setFilter(tab)}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {filtered.map((id) => {
            const e = ET[id];
            const isBoss = e.tier === 'Chefe';
            return (
              <article key={id} className="border-b border-[var(--line)] pb-3 flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h4
                    className={`font-display text-lg font-normal m-0 ${
                      isBoss ? 'text-[var(--ember)]' : 'text-[var(--bone)]'
                    }`}
                  >
                    {e.title || e.name}
                  </h4>
                  <span className="text-xs text-[var(--mist)] tabular-nums shrink-0">
                    {e.tier} · {e.souls} cinzas
                  </span>
                </div>
                {e.sub && <span className="text-xs italic text-[var(--bone)]/70">{e.sub}</span>}
                <p className="m-0 text-sm text-[var(--mist)]">{e.lore}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
