import { ROUTES, routeAvailable } from '../game/routes';
import React, { useMemo } from 'react';
import { Compass, Eye, EyeOff } from 'lucide-react';
import { EXPLORE_BINS, getKarmaAlignment, NZ, ZONE } from '../game/constants';
import { LORE_STONES } from '../game/lore';
import type { MiniMapSnapshot } from '../game/types';
import { ARENAS, BRAZ, FIELD_BOSS_SPAWNS, LOOT_SPAWNS, NPCS, PLAT, SOL, ZONE_NAMES } from '../game/world';

interface MiniMapProps {
  snapshot: MiniMapSnapshot;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const BINS_PER_ZONE = EXPLORE_BINS / NZ;
const MAP_W = 240;
const MAP_H = 44;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const toMapX = (localX: number) => Math.max(0, Math.min(MAP_W, (localX / ZONE) * MAP_W));
const toMapY = (worldY: number) => {
  // World ground/platforms sit roughly between y=260 and y=450
  const norm = (worldY - 240) / 230;
  return Math.max(4, Math.min(MAP_H - 4, 6 + norm * (MAP_H - 12)));
};

export const MiniMap: React.FC<MiniMapProps> = ({ snapshot, collapsed, onToggleCollapse }) => {
  const {
    playerX,
    playerY,
    playerFace,
    zone,
    inArena,
    explored,
    litBraziers,
    bossesDead,
    deadField,
    openedChests,
    readLore,
    drop,
    karma,
    quests,
  } = snapshot;

  const alignment = getKarmaAlignment(karma);

  const zoneStart = zone * ZONE;
  const binWidthWorld = ZONE / BINS_PER_ZONE;
  const zoneBinOffset = zone * BINS_PER_ZONE;

  const isWorldXExplored = (wx: number) => {
    const idx = Math.max(0, Math.min(EXPLORE_BINS - 1, Math.floor((wx / (ZONE * NZ)) * EXPLORE_BINS)));
    return !!explored[idx];
  };

  const zoneProgress = useMemo(() => {
    let count = 0;
    for (let i = 0; i < BINS_PER_ZONE; i++) {
      if (explored[zoneBinOffset + i]) count++;
    }
    return Math.round((count / BINS_PER_ZONE) * 100);
  }, [explored, zoneBinOffset]);

  const zoneSolids = useMemo(
    () =>
      SOL.filter((s) => s.x >= zoneStart - 10 && s.x < zoneStart + ZONE).map((s) => ({
        x: toMapX(s.x - zoneStart),
        w: Math.max(2, toMapX(s.x + s.w - zoneStart) - toMapX(s.x - zoneStart)),
        y: toMapY(s.y),
      })),
    [zoneStart]
  );

  const zonePlats = useMemo(
    () =>
      PLAT.filter((p) => p.x >= zoneStart - 10 && p.x < zoneStart + ZONE).map((p) => ({
        x: toMapX(p.x - zoneStart),
        w: Math.max(3, toMapX(p.x + p.w - zoneStart) - toMapX(p.x - zoneStart)),
        y: toMapY(p.y),
      })),
    [zoneStart]
  );

  const zoneBraziers = useMemo(
    () =>
      BRAZ.map((b, i) => ({ ...b, idx: i })).filter(
        (b) => b.x >= zoneStart && b.x < zoneStart + ZONE
      ),
    [zoneStart]
  );

  const zoneChests = useMemo(
    () => LOOT_SPAWNS.filter((c) => c.zone === zone && !openedChests.includes(c.id)),
    [zone, openedChests]
  );

  const zoneLore = useMemo(() => LORE_STONES.filter((l) => l.zone === zone), [zone]);

  const zoneFieldBosses = useMemo(
    () => FIELD_BOSS_SPAWNS.filter((fb) => fb.zone === zone && !deadField.includes(fb.id)),
    [zone, deadField]
  );

  const zoneNpcs = useMemo(() => NPCS.filter((n) => n.zone === zone), [zone]);

  const zoneArena = ARENAS[zone];
  const arenaX = toMapX(zoneArena.x0 - zoneStart);

  const px = toMapX(playerX - zoneStart);
  const py = toMapY(playerY) - 3;

  if (collapsed) {
    return (
      <div className="minimap-hud pointer-events-auto">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="bg-[#0a0c0e]/85 border border-[var(--line)] hover:border-[var(--ember)] rounded-[2px] px-2.5 py-1 flex items-center gap-1.5 text-xs font-display text-[var(--bone)] cursor-pointer transition-colors"
          title="Mostrar minimapa (M)"
          aria-label="Mostrar minimapa"
        >
          <Compass className="w-3.5 h-3.5 text-[var(--ember)]" />
          <span>Mapa · {zoneProgress}%</span>
          <Eye className="w-3 h-3 text-[var(--mist)]" />
        </button>
      </div>
    );
  }

  return (
    <aside
      className="minimap-hud pointer-events-none select-none w-[244px] sm:w-[262px] bg-[#0a0c0e]/86 border border-[var(--line)] rounded-[2px] shadow-[0_6px_22px_rgba(0,0,0,0.7)] overflow-hidden"
      aria-label="Minimapa de Velmora"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1 border-b border-[var(--line)]/80 bg-[#121619]/90">
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass className="w-3.5 h-3.5 text-[var(--ember)] shrink-0" />
          <span className="font-display text-[11px] tracking-[0.04em] text-[var(--bone)] truncate">
            {ZONE_NAMES[zone]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-display text-[10px] text-[var(--ember)] tabular-nums">
            {zoneProgress}%
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="pointer-events-auto text-[var(--mist)] hover:text-[var(--bone)] p-0.5 cursor-pointer bg-transparent border-0"
            title="Ocultar minimapa (M)"
            aria-label="Ocultar minimapa"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Active Region Terrain & Fog of War */}
      <div className="relative px-1.5 pt-1.5 pb-1">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full h-[46px] block bg-[#07090b] border border-[#242b31] rounded-[1px]"
          role="img"
          aria-label={`Mapa da região ${ZONE_NAMES[zone]}`}
        >
          {/* Subtle grid backdrop */}
          <line x1={0} y1={MAP_H * 0.5} x2={MAP_W} y2={MAP_H * 0.5} stroke="rgba(141,150,146,0.08)" strokeWidth={0.6} />

          {/* Terrain solids & elevated platforms */}
          {zoneSolids.map((s, idx) => (
            <g key={`sol-${idx}`}>
              <rect x={s.x} y={s.y} width={s.w} height={MAP_H - s.y} fill="#1f262c" />
              <line x1={s.x} y1={s.y} x2={s.x + s.w} y2={s.y} stroke="#78827e" strokeWidth={1.2} />
            </g>
          ))}
          {zonePlats.map((p, idx) => (
            <line
              key={`plat-${idx}`}
              x1={p.x}
              y1={p.y}
              x2={p.x + p.w}
              y2={p.y}
              stroke="#9ea7a2"
              strokeWidth={1.4}
            />
          ))}

          {ROUTES.filter(r=>r.x>=zoneStart&&r.x<zoneStart+ZONE&&isWorldXExplored(r.x)).map(r=>(
            <g key={r.id}><title>{r.label}</title>
              <circle cx={toMapX(r.x-zoneStart)} cy={toMapY(r.y)-4} r={r.kind==='ladder'?1.5:2.5} fill={routeAvailable(r,bossesDead)?'#78c8b5':'#a77851'} />
            </g>
          ))}
          {/* Boss Fog Gate Divider */}
          <line
            x1={arenaX}
            y1={3}
            x2={arenaX}
            y2={MAP_H - 2}
            stroke={bossesDead[zone] ? 'rgba(141,150,146,0.3)' : 'rgba(194,58,58,0.65)'}
            strokeWidth={1.1}
            strokeDasharray="2 2"
          />

          {/* Explored land markers */}
          {zoneBraziers.map((b) => {
            if (!isWorldXExplored(b.x)) return null;
            const bx = toMapX(b.x - zoneStart);
            const by = toMapY(b.y) - 3;
            const lit = !!litBraziers[b.idx];
            return (
              <g key={`braz-${b.idx}`}>
                <circle
                  cx={bx}
                  cy={by}
                  r={lit ? 2.8 : 2}
                  fill={lit ? '#f6b040' : '#4a4f54'}
                  stroke="#0a0c0e"
                  strokeWidth={0.6}
                />
                {lit && <circle cx={bx} cy={by} r={5} fill="rgba(246,176,64,0.22)" />}
              </g>
            );
          })}

          {zoneLore.map((ls) => {
            if (!isWorldXExplored(ls.x)) return null;
            const lx = toMapX(ls.x - zoneStart);
            const ly = toMapY(ls.y) - 3;
            const read = readLore.includes(ls.loreId);
            return (
              <rect
                key={ls.id}
                x={lx - 1.2}
                y={ly - 2.4}
                width={2.4}
                height={4.2}
                fill={read ? '#4d6a78' : '#9ed7f0'}
              />
            );
          })}

          {zoneChests.map((c) => {
            if (!isWorldXExplored(c.x)) return null;
            const cx = toMapX(c.x - zoneStart);
            const cy = toMapY(c.y) - 3;
            const col = c.kind === 'rune' ? '#d878ff' : '#f6c86e';
            return (
              <polygon
                key={c.id}
                points={`${cx},${cy - 2.6} ${cx + 2.4},${cy} ${cx},${cy + 2.6} ${cx - 2.4},${cy}`}
                fill={col}
                stroke="#0a0c0e"
                strokeWidth={0.5}
              />
            );
          })}

          {zoneNpcs.map((npc) => {
            if (!isWorldXExplored(npc.x)) return null;
            const nx = toMapX(npc.x - zoneStart);
            const ny = toMapY(npc.y) - 3;
            const st = quests[npc.id] || 'unstarted';
            const done = st === 'completed_light' || st === 'completed_dark' || st === 'completed_neutral';
            const ready = st === 'ready';
            return (
              <g key={npc.id}>
                <circle
                  cx={nx}
                  cy={ny}
                  r={ready ? 2.9 : 2.3}
                  fill={done ? '#5c7c77' : ready ? '#f6d27a' : '#7ae8d8'}
                  stroke="#0a0c0e"
                  strokeWidth={0.6}
                />
                {!done && <circle cx={nx} cy={ny} r={4.6} fill="rgba(122, 232, 216, 0.2)" />}
              </g>
            );
          })}

          {zoneFieldBosses.map((fb) => {
            if (!isWorldXExplored(fb.x)) return null;
            const fx = toMapX(fb.x - zoneStart);
            const fy = toMapY(440) - 5;
            return (
              <polygon
                key={fb.id}
                points={`${fx},${fy - 3.4} ${fx + 3.2},${fy} ${fx},${fy + 3.4} ${fx - 3.2},${fy}`}
                fill="#e04343"
                stroke="#0a0c0e"
                strokeWidth={0.6}
              />
            );
          })}

          {!bossesDead[zone] && (isWorldXExplored(zoneArena.x0 + 650) || inArena) && (
            <g>
              {(() => {
                const bx = toMapX(zoneArena.x0 + 650 - zoneStart);
                const by = toMapY(440) - 5;
                return (
                  <polygon
                    points={`${bx},${by - 3.8} ${bx + 3.6},${by} ${bx},${by + 3.8} ${bx - 3.6},${by}`}
                    fill="#ff4a4a"
                    stroke="#f6d27a"
                    strokeWidth={0.6}
                  />
                );
              })()}
            </g>
          )}

          {/* Dropped Cinzas beacon */}
          {drop && drop.x >= zoneStart && drop.x < zoneStart + ZONE && (
            <circle
              cx={toMapX(drop.x - zoneStart)}
              cy={toMapY(drop.y) - 4}
              r={2.8}
              fill="#9be0c0"
              stroke="#0a0c0e"
              strokeWidth={0.6}
            />
          )}

          {/* Fog of War over unexplored sectors */}
          {Array.from({ length: BINS_PER_ZONE }).map((_, idx) => {
            if (explored[zoneBinOffset + idx]) return null;
            const fx = toMapX(idx * binWidthWorld);
            const fw = toMapX((idx + 1) * binWidthWorld) - fx + 0.5;
            return (
              <rect
                key={`fog-${idx}`}
                x={fx}
                y={0}
                width={fw}
                height={MAP_H}
                fill="rgba(8, 10, 13, 0.94)"
              />
            );
          })}

          {/* Player marker with facing arrow */}
          <g transform={`translate(${px}, ${py})`}>
            <circle cx={0} cy={0} r={5.5} fill="rgba(246, 210, 122, 0.24)" />
            <polygon
              points={playerFace >= 0 ? '4.2,0 -2.6,-2.8 -1.4,0 -2.6,2.8' : '-4.2,0 2.6,-2.8 1.4,0 2.6,2.8'}
              fill="#f6d27a"
              stroke="#0a0c0e"
              strokeWidth={0.7}
            />
          </g>
        </svg>

        {/* World Region Strip (10 regions of Velmora) */}
        <div className="mt-1.5 grid grid-cols-5 gap-1">
          {Array.from({ length: NZ }).map((_, z) => {
            let zCount = 0;
            for (let i = 0; i < BINS_PER_ZONE; i++) {
              if (explored[z * BINS_PER_ZONE + i]) zCount++;
            }
            const pct = Math.round((zCount / BINS_PER_ZONE) * 100);
            const isCurrent = z === zone;
            const visited = zCount > 0;
            const bossDone = !!bossesDead[z];
            return (
              <div
                key={`z-${z}`}
                className={`relative h-[15px] rounded-[1px] border flex items-center justify-between px-1 overflow-hidden ${
                  isCurrent
                    ? 'border-[var(--ember)] bg-[#2a1910]'
                    : visited
                      ? 'border-[var(--line)] bg-[#14181c]'
                      : 'border-[#20262b] bg-[#090b0d] opacity-65'
                }`}
                title={`${ZONE_NAMES[z]} (${pct}% explorado)`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#d9772f]/20"
                  style={{ width: `${pct}%` }}
                />
                <span
                  className={`relative z-[1] font-display text-[9px] leading-none ${
                    isCurrent ? 'text-[#f6d27a]' : visited ? 'text-[var(--bone)]' : 'text-[var(--mist)]'
                  }`}
                >
                  {ROMAN[z]}
                </span>
                <span
                  className={`relative z-[1] w-1.5 h-1.5 rounded-full ${
                    bossDone
                      ? 'bg-[#78c257]'
                      : visited
                        ? 'bg-[#b83232]'
                        : 'bg-[#2a3137]'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Compact Legend & Karma */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[9px] font-display text-[var(--mist)] px-0.5">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f6b040]" /> Braseiro
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7ae8d8]" /> Viajante
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rotate-45 bg-[#f6c86e]" /> Baú
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rotate-45 bg-[#ff4a4a]" /> Chefe
          </span>
          <span className="ml-auto tabular-nums" style={{ color: alignment.col }}>
            Karma {karma > 0 ? `+${karma}` : karma}
          </span>
        </div>
      </div>
    </aside>
  );
};
