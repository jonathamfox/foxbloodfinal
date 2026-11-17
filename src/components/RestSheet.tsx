import React, { useMemo, useState } from 'react';
import { Lock, Scale, ScrollText, Sparkles, X } from 'lucide-react';
import {
  ARMOR_LIST,
  ARMORS,
  BUILDS,
  getKarmaAlignment,
  MAX_RUNE_SLOTS,
  RUNE_LIST,
  RUNES,
  SHIELDS,
  WEAPON_LIST,
  WEAPONS,
} from '../game/constants';
import { LORE_ENTRIES } from '../game/lore';
import type { ArmorId, RestSnapshot, RuneId, ShieldId, WeaponId } from '../game/types';
import { NPCS, ZONE_NAMES } from '../game/world';

interface RestSheetProps {
  data: RestSnapshot;
  onUpgrade: (stat: 'vig' | 'end' | 'str' | 'arc' | 'flask') => void;
  onSelectWeapon: (w: WeaponId) => void;
  onSelectArmor: (a: ArmorId) => void;
  onSelectShield: (s: ShieldId) => void;
  onToggleRune: (r: RuneId) => void;
  onLeave: () => void;
  onOpenLore: () => void;
  onNewCycle: () => void;
  onOpenEnding?: () => void;
}

type RestTab = 'stats' | 'gear' | 'runes' | 'quests';

const STATS: { key: 'vig' | 'end' | 'str' | 'arc' | 'flask'; name: string; desc: string }[] = [
  { key: 'vig', name: 'Vigor', desc: 'Mais vida máxima' },
  { key: 'end', name: 'Fôlego', desc: 'Mais energia para golpes e rolamentos' },
  { key: 'str', name: 'Força & Destreza', desc: 'Mais dano com lâminas, arcos e bestas' },
  { key: 'arc', name: 'Arcanismo', desc: 'Mais poder com cajados e chamas, e recarga mais rápida do especial' },
  { key: 'flask', name: 'Frascos de Brasa', desc: 'Carrega +1 frasco de cura (máx. 9)' },
];

export const RestSheet: React.FC<RestSheetProps> = ({
  data,
  onUpgrade,
  onSelectWeapon,
  onSelectArmor,
  onSelectShield,
  onToggleRune,
  onLeave,
  onOpenLore,
  onNewCycle,
  onOpenEnding,
}) => {
  const [activeTab, setActiveTab] = useState<RestTab>('stats');

  const buildDef = BUILDS[data.build];
  const alignment = getKarmaAlignment(data.karma);
  const completedQuestsCount = useMemo(
    () =>
      NPCS.filter((n) => {
        const st = data.quests[n.id];
        return st === 'completed_light' || st === 'completed_dark' || st === 'completed_neutral';
      }).length,
    [data.quests]
  );
  const eqWeapon = WEAPONS[data.weapon];
  const eqArmor = ARMORS[data.armor];
  const eqShield = SHIELDS.find((s) => s.id === data.shield) || SHIELDS[0];

  const runeTotals = useMemo(() => {
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
    for (const id of data.equippedRunes) {
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
  }, [data.equippedRunes]);

  const activeBonusLabels = useMemo(() => {
    const items: { label: string; col: string }[] = [];
    if (runeTotals.dmgMult > 0)
      items.push({ label: `+${Math.round(runeTotals.dmgMult * 100)}% Dano Geral`, col: '#d96b43' });
    if (runeTotals.meleeMult > 0)
      items.push({ label: `+${Math.round(runeTotals.meleeMult * 100)}% Dano Lâminas`, col: '#d9772f' });
    if (runeTotals.bowMult > 0)
      items.push({ label: `+${Math.round(runeTotals.bowMult * 100)}% Dano Arcos`, col: '#78c257' });
    if (runeTotals.magicMult > 0)
      items.push({ label: `+${Math.round(runeTotals.magicMult * 100)}% Dano Arcano`, col: '#9ed7f0' });
    if (runeTotals.pyroMult > 0)
      items.push({ label: `+${Math.round(runeTotals.pyroMult * 100)}% Dano Piromancia`, col: '#f68a38' });
    if (runeTotals.energyRegenBonus > 0)
      items.push({ label: `+${Math.round(runeTotals.energyRegenBonus * 100)}% Regen. Energia`, col: '#88d4f2' });
    if (runeTotals.staminaRegenBonus > 0)
      items.push({ label: `+${Math.round(runeTotals.staminaRegenBonus * 100)}% Regen. Fôlego`, col: '#9be07a' });
    if (runeTotals.luckBonus > 0)
      items.push({
        label: `+${Math.round(runeTotals.luckBonus * 100)}% Sorte (${Math.round(runeTotals.luckBonus * 60)}% Crítico)`,
        col: '#f2c96d',
      });
    if (runeTotals.hpMult > 0)
      items.push({ label: `+${Math.round(runeTotals.hpMult * 100)}% Vida Máxima`, col: '#d94854' });
    if (runeTotals.defBonus > 0)
      items.push({ label: `+${Math.round(runeTotals.defBonus * 100)}% Defesa`, col: '#b8c2cc' });
    if (runeTotals.killHeal > 0)
      items.push({ label: `+${runeTotals.killHeal} Vida por Abate`, col: '#d94854' });
    if (runeTotals.spdMult > 0)
      items.push({ label: `+${Math.round(runeTotals.spdMult * 100)}% Velocidade`, col: '#78c257' });
    if (runeTotals.iframeBonus > 0)
      items.push({ label: `+${Math.round(runeTotals.iframeBonus * 1000)}ms I-Frames`, col: '#7ae8d8' });
    return items;
  }, [runeTotals]);

  const slotsFull = data.equippedRunes.length >= MAX_RUNE_SLOTS;

  return (
    <section className="sheet-backdrop" aria-label="Descanso no braseiro">
      <div className="m-auto w-full max-w-[680px] flex flex-col gap-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-[15px] tracking-[0.16em] uppercase text-[var(--ember)] m-0 font-normal">
              Braseiro aceso · {buildDef.name}
              {data.ng > 0 ? ` · NG+${data.ng}` : ''}
            </h3>
            <h2 className="font-display text-[30px] font-normal tracking-[0.05em] m-0">Descanso</h2>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-[var(--mist)] italic">
              Especial: <b className="text-[var(--bone)] not-italic font-display">{buildDef.specialName}</b>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-display" style={{ color: alignment.col }}>
              <Scale className="w-3.5 h-3.5" />
              Karma: {alignment.label} ({data.karma > 0 ? `+${data.karma}` : data.karma})
            </span>
          </div>
        </div>

        <p className="m-0 text-[var(--mist)] italic text-sm">
          Vida e {data.maxFlasks} frascos restaurados. As ruas voltaram a se encher.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[var(--line)] pb-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[var(--mist)]">
            <span>
              Cinzas{' '}
              <b className="text-[var(--ember)] font-display font-normal text-xl tabular-nums">
                {data.cinzas}
              </b>
            </span>
            <span>
              Nível{' '}
              <b className="text-[var(--ember)] font-display font-normal text-xl tabular-nums">
                {data.level}
              </b>
            </span>
            <span>
              Próximo nível{' '}
              <b className="text-[var(--ember)] font-display font-normal text-xl tabular-nums">
                {data.cost}
              </b>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Abas do braseiro">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'stats'}
              aria-pressed={activeTab === 'stats'}
              className="gothic-btn gothic-choice text-xs py-1.5 px-3"
              onClick={() => setActiveTab('stats')}
            >
              Atributos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'gear'}
              aria-pressed={activeTab === 'gear'}
              className="gothic-btn gothic-choice text-xs py-1.5 px-3"
              onClick={() => setActiveTab('gear')}
            >
              Equipamento
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'runes'}
              aria-pressed={activeTab === 'runes'}
              className="gothic-btn gothic-choice text-xs py-1.5 px-3 flex items-center gap-1.5"
              onClick={() => setActiveTab('runes')}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d878ff]" />
              Runas ({data.equippedRunes.length}/{MAX_RUNE_SLOTS})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'quests'}
              aria-pressed={activeTab === 'quests'}
              className="gothic-btn gothic-choice text-xs py-1.5 px-3 flex items-center gap-1.5"
              onClick={() => setActiveTab('quests')}
            >
              <ScrollText className="w-3.5 h-3.5 text-[#7ae8d8]" />
              Pactos ({completedQuestsCount}/{NPCS.length})
            </button>
          </div>
        </div>

        {activeTab === 'stats' && (
          <div className="flex flex-col gap-2">
            {STATS.map((st) => {
              const maxed = st.key === 'flask' && data.flask >= 5;
              return (
                <div
                  key={st.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 items-center border-b border-[var(--line)] pb-2"
                >
                  <div>
                    <div>{st.name}</div>
                    <small className="block text-[var(--mist)] text-sm">{st.desc}</small>
                  </div>
                  <div className="font-display text-[22px] tabular-nums min-w-[2ch] text-right">
                    {st.key === 'flask' ? data.maxFlasks : data[st.key]}
                  </div>
                  <button
                    type="button"
                    className="gothic-btn"
                    disabled={maxed || data.cinzas < data.cost}
                    onClick={() => onUpgrade(st.key)}
                  >
                    {maxed ? 'Máximo' : 'Fortalecer'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'gear' && (
          <div className="flex flex-col gap-3.5 border-b border-[var(--line)] pb-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-display text-[var(--bone)]">
                  Armas ({data.unlockedWeapons.length}/{WEAPON_LIST.length})
                </span>
                <span className="text-xs text-[var(--mist)] italic">{eqWeapon.desc}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEAPON_LIST.map((w) => {
                  const wId = w.id as WeaponId;
                  const unlocked = data.unlockedWeapons.includes(wId);
                  return (
                    <button
                      key={wId}
                      type="button"
                      disabled={!unlocked}
                      className="gothic-btn gothic-choice text-xs py-1.5 px-2.5 flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                      aria-pressed={data.weapon === wId}
                      title={unlocked ? w.desc : 'Relíquia oculta em algum baú de Velmora'}
                      onClick={() => unlocked && onSelectWeapon(wId)}
                    >
                      {!unlocked && <Lock className="w-3 h-3 opacity-70" />}
                      {unlocked ? w.label : '??? · Relíquia'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-display text-[var(--bone)]">
                  Armaduras ({data.unlockedArmors.length}/{ARMOR_LIST.length})
                </span>
                <span className="text-xs text-[var(--mist)] italic">{eqArmor.desc}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARMOR_LIST.map((a) => {
                  const unlocked = data.unlockedArmors.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={!unlocked}
                      className="gothic-btn gothic-choice text-xs py-1.5 px-2.5 flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                      aria-pressed={data.armor === a.id}
                      title={unlocked ? a.desc : 'Armadura oculta em algum baú de Velmora'}
                      onClick={() => unlocked && onSelectArmor(a.id)}
                    >
                      {!unlocked && <Lock className="w-3 h-3 opacity-70" />}
                      {unlocked ? a.label : '??? · Armadura'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-display text-[var(--bone)]">
                  Escudos ({data.unlockedShields.length}/{SHIELDS.length})
                </span>
                <span className="text-xs text-[var(--mist)] italic">{eqShield.desc}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SHIELDS.map((s) => {
                  const unlocked = data.unlockedShields.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!unlocked}
                      className="gothic-btn gothic-choice text-xs py-1.5 px-2.5 flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                      aria-pressed={data.shield === s.id}
                      title={unlocked ? s.desc : 'Escudo oculto em algum baú de Velmora'}
                      onClick={() => unlocked && onSelectShield(s.id)}
                    >
                      {!unlocked && <Lock className="w-3 h-3 opacity-70" />}
                      {unlocked ? s.label : '??? · Escudo'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'runes' && (
          <div className="flex flex-col gap-3.5 border-b border-[var(--line)] pb-4">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <span className="text-sm font-display text-[var(--bone)]">
                  Runas Gravadas ({data.equippedRunes.length}/{MAX_RUNE_SLOTS} espaços)
                </span>
                <span className="text-xs text-[var(--mist)] italic">
                  Escolha até {MAX_RUNE_SLOTS} runas para fortalecer sua build com bônus passivos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Array.from({ length: MAX_RUNE_SLOTS }).map((_, idx) => {
                  const rId = data.equippedRunes[idx];
                  const rune = rId ? RUNES[rId] : null;
                  if (!rune) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="border border-dashed border-[var(--line)] bg-black/25 px-3 py-2.5 flex flex-col justify-center min-h-[68px]"
                      >
                        <span className="font-display text-xs text-[var(--mist)] uppercase tracking-wider">
                          Espaço {idx + 1} · Vazio
                        </span>
                        <span className="text-xs text-[var(--mist)]/70 italic">
                          Selecione uma runa abaixo
                        </span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={rune.id}
                      type="button"
                      onClick={() => onToggleRune(rune.id)}
                      className="text-left border bg-black/45 px-3 py-2 flex flex-col justify-between min-h-[68px] cursor-pointer hover:bg-black/65 transition-colors"
                      style={{ borderColor: rune.col }}
                      title="Clique para remover esta runa"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-display text-xs leading-tight" style={{ color: rune.col }}>
                          {rune.label}
                        </span>
                        <X className="w-3.5 h-3.5 text-[var(--mist)] shrink-0 mt-0.5" />
                      </div>
                      <span className="text-[11px] text-[var(--mist)] italic">{rune.subtitle} · Remover</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-black/30 border border-[var(--line)] px-3 py-2">
              <div className="font-display text-xs uppercase tracking-wider text-[var(--mist)] mb-1">
                Bônus Passivos Ativos
              </div>
              {activeBonusLabels.length === 0 ? (
                <p className="m-0 text-xs text-[var(--mist)]/75 italic">
                  Nenhuma runa gravada no momento.
                </p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {activeBonusLabels.map((b) => (
                    <span key={b.label} className="font-display" style={{ color: b.col }}>
                      ◆ {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-sm font-display text-[var(--bone)]">
                  Grimório de Runas ({data.unlockedRunes.length}/{RUNE_LIST.length})
                </span>
                {slotsFull && (
                  <span className="text-xs text-[var(--ember)] italic">
                    Todos os espaços cheios — remova uma runa para trocar
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RUNE_LIST.map((r) => {
                  const unlocked = data.unlockedRunes.includes(r.id);
                  const equipped = data.equippedRunes.includes(r.id);
                  const blockedByFull = !equipped && slotsFull;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!unlocked || blockedByFull}
                      aria-pressed={equipped}
                      onClick={() => unlocked && onToggleRune(r.id)}
                      className="gothic-btn gothic-choice text-left px-3 py-2.5 flex flex-col gap-1 disabled:opacity-45 disabled:cursor-not-allowed"
                      style={equipped ? { borderColor: r.col } : undefined}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span
                          className="font-display text-sm flex items-center gap-1.5"
                          style={{ color: unlocked ? r.col : 'var(--mist)' }}
                        >
                          {!unlocked && <Lock className="w-3.5 h-3.5 opacity-75" />}
                          {unlocked ? r.label : '??? · Runa Oculta'}
                        </span>
                        <span className="text-[11px] font-display uppercase tracking-wider text-[var(--mist)]">
                          {equipped ? 'Equipada' : unlocked ? r.category : 'Bloqueada'}
                        </span>
                      </div>
                      <p className="m-0 text-xs text-[var(--mist)] leading-snug">
                        {unlocked ? r.desc : r.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-black/30 border border-[var(--line)] px-3 py-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" style={{ color: alignment.col }} />
                <div>
                  <div className="font-display text-sm" style={{ color: alignment.col }}>
                    {alignment.label} ({data.karma > 0 ? `+${data.karma}` : data.karma})
                  </div>
                  <div className="text-xs text-[var(--mist)]">{alignment.desc}</div>
                </div>
              </div>
              <span className="text-xs text-[var(--mist)] italic">
                Influencia o desfecho final após o 10º chefe
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {NPCS.map((npc) => {
                const st = data.quests[npc.id] || 'unstarted';
                const statusText =
                  st === 'completed_light'
                    ? 'Juramento da Luz'
                    : st === 'completed_dark'
                      ? 'Pacto do Abismo'
                      : st === 'completed_neutral'
                        ? 'Equilíbrio Selado'
                        : st === 'ready'
                          ? 'Pronto para Entrega'
                          : st === 'active'
                            ? 'Em Andamento'
                            : 'Não Encontrado';
                const statusCol =
                  st === 'completed_light'
                    ? '#f6d27a'
                    : st === 'completed_dark'
                      ? '#f28b8b'
                      : st === 'completed_neutral'
                        ? '#9ed7f0'
                        : st === 'ready'
                          ? '#a8e28f'
                          : st === 'active'
                            ? '#f6b040'
                            : 'var(--mist)';
                return (
                  <div
                    key={npc.id}
                    className="border border-[var(--line)] bg-[#111518]/80 px-3 py-2 flex flex-col gap-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm text-[var(--bone)]">
                        {npc.name} · <span className="text-[var(--mist)]">{ZONE_NAMES[npc.zone]}</span>
                      </span>
                      <span className="font-display text-xs" style={{ color: statusCol }}>
                        {statusText}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--ember)] font-display">{npc.questTitle}</div>
                    <p className="m-0 text-xs text-[var(--mist)]">{npc.questObjective}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="gothic-btn primary" onClick={onLeave}>
            Voltar à vigília
          </button>
          <button type="button" className="gothic-btn" onClick={onOpenLore}>
            Crônicas ({data.unlockedLore.length}/{LORE_ENTRIES.length})
          </button>
          {data.allBossesDead && onOpenEnding && (
            <button type="button" className="gothic-btn" onClick={onOpenEnding}>
              Rever Desfecho Final
            </button>
          )}
          {data.allBossesDead && (
            <button type="button" className="gothic-btn" onClick={onNewCycle}>
              Nova vigília, mais cruel (NG+{data.ng + 1})
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

