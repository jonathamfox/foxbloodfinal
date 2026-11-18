import { drawAtmosphere, drawWeaponArc, drawPassage, drawRegionVeil } from './polish';
import { drawRoutes, drawRouteHint, drawUnderground } from './routes';
import { drawDepthBack, drawDepthFloor, drawDepthFront, drawRuins, drawPuzzleWorld, drawPuzzleHint } from './depth';
import type { Breakable } from './expansion';
import {
  ARMORS,
  BUILDS,
  ET,
  FLASKS,
  FONT_B,
  FONT_D,
  FOX_PALETTE,
  H,
  LOOKS,
  MAGIC_SPELLS,
  NZ,
  PYRO_SPELLS,
  RDUR,
  REI_LOOKS,
  RUNES,
  W,
  WEAPONS,
  ZONE,
} from './constants';
import { LORE_STONES } from './lore';
import type {
  AppearanceDef,
  Cloud,
  Debris,
  DropPool,
  Enemy,
  EnemyTypeDef,
  GameMode,
  LootChest,
  Mark,
  Meteor,
  NpcDef,
  Particle,
  Player,
  PlayerLook,
  QuestStatus,
  RollGhost,
  SaveStats,
  Shot,
  Trap,
  WeaponDef,
  ZoneTransition,
} from './types';
import {
  ARENAS,
  BRAZ,
  PLAT,
  SHARDS,
  SOL,
  clamp,
  decorItems,
  farLayer,
  groundAt,
  lerp,
  midLayer,
  rnd,
} from './world';
import type { DecorItem, BuildingLayerItem } from './world';

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}

function shade(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = a < 0 ? 0 : 255;
  const t = Math.abs(a);
  r = Math.round(r + (f - r) * t);
  g = Math.round(g + (f - g) * t);
  b = Math.round(b + (f - b) * t);
  return `rgb(${r},${g},${b})`;
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

interface PoseParams {
  t?: number;
  run?: number;
  air?: boolean;
  arm?: number;
  arm2?: number;
  weapon?: WeaponDef;
  rel?: number;
  glow?: boolean;
  sway?: number;
  lean?: number;
  roll?: number;
  block?: boolean;
  trail?: [number, number] | null;
}

export function drawWeapon(c: CanvasRenderingContext2D, w: WeaponDef, L: { trim: string }) {
  const r = w.reach;
  const ink = '#0d0f12';
  if (w.type === 'espada') {
    c.fillStyle = '#241d1a';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-7, -1.6, 8, 3.2);
    c.fillStyle = L.trim;
    c.beginPath();
    c.arc(-7.5, 0, 2, 0, 7);
    c.fill();
    c.beginPath();
    c.moveTo(0, -6.5);
    c.lineTo(3.2, -5);
    c.lineTo(3.2, 5);
    c.lineTo(0, 6.5);
    c.closePath();
    c.fill();
    c.stroke();

    // Jagged bloodborne hunter blade with beveled ridge
    c.fillStyle = w.rust ? '#7d6a58' : '#b7bec4';
    c.beginPath();
    c.moveTo(3, -2.7);
    if (!w.rust) {
      c.lineTo(r * 0.34, -2.4);
      c.lineTo(r * 0.4, -3.5);
      c.lineTo(r * 0.48, -2.2);
      c.lineTo(r * 0.64, -2.1);
      c.lineTo(r * 0.7, -3.2);
      c.lineTo(r * 0.78, -1.9);
    }
    c.lineTo(r - 6, -1.9);
    c.lineTo(r + 1, 0);
    c.lineTo(r - 6, 1.9);
    c.lineTo(3, 2.7);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = w.rust ? 'rgba(210,190,170,0.35)' : 'rgba(245,250,255,0.65)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(4, -0.4);
    c.lineTo(r - 5, 0);
    c.stroke();
  } else if (w.type === 'machado') {
    c.fillStyle = '#473222';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-9, -1.7, r + 6, 3.4);
    c.strokeRect(-9, -1.7, r + 6, 3.4);
    c.fillStyle = '#adb4b8';
    c.beginPath();
    c.moveTo(r - 17, -1.6);
    c.lineTo(r - 20, -15.5);
    c.quadraticCurveTo(r - 7, -21, r + 3.5, -13.5);
    c.quadraticCurveTo(r + 1, -6, r - 3, -1.6);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(240,246,250,0.6)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(r - 18, -14.5);
    c.quadraticCurveTo(r - 7, -19.2, r + 2, -13);
    c.stroke();
    c.fillStyle = L.trim;
    c.fillRect(r - 17.5, -2.2, 15.5, 2.4);
  } else if (w.type === 'foice') {
    c.fillStyle = '#3b2c20';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-13, -1.7, r + 10, 3.4);
    c.strokeRect(-13, -1.7, r + 10, 3.4);
    c.fillStyle = '#c0c8cc';
    c.beginPath();
    c.moveTo(r - 7, -1.6);
    c.quadraticCurveTo(r + 1, -21.5, r - 32, -29);
    c.quadraticCurveTo(r - 11, -15, r - 15.5, -1.6);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = 'rgba(240,248,255,0.65)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(r - 8, -3);
    c.quadraticCurveTo(r - 4, -18, r - 29, -27);
    c.stroke();
    c.fillStyle = L.trim;
    c.fillRect(r - 16, -2.2, 10, 4.4);
  } else if (w.type === 'montante') {
    c.fillStyle = '#241a18';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-10, -2, 12, 4);
    c.fillStyle = L.trim;
    c.fillRect(0, -9, 4, 18);
    c.strokeRect(0, -9, 4, 18);
    c.fillStyle = '#4e545b';
    c.beginPath();
    c.moveTo(4, -4.5);
    c.lineTo(r - 8, -3.5);
    c.lineTo(r + 4, 0);
    c.lineTo(r - 8, 3.5);
    c.lineTo(4, 4.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = '#c84b44';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(7, 0);
    c.lineTo(r - 10, 0);
    c.stroke();
  } else if (w.type === 'arco') {
    c.strokeStyle = '#5a3b24';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(4, -17);
    c.quadraticCurveTo(18, 0, 4, 17);
    c.stroke();
    c.strokeStyle = 'rgba(220,214,200,0.7)';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(4, -17);
    c.lineTo(1, 0);
    c.lineTo(4, 17);
    c.stroke();
    c.strokeStyle = w.projCol || '#e8dcc8';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(1, 0);
    c.lineTo(19, 0);
    c.stroke();
  } else if (w.type === 'cajado') {
    c.fillStyle = '#2b2220';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-14, -1.6, r + 14, 3.2);
    c.strokeRect(-14, -1.6, r + 14, 3.2);
    const col = w.projCol || '#9ed7f0';
    c.strokeStyle = L.trim;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(r + 3, 0, 5.5, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(r + 3, 0, 3.2, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  } else if (w.type === 'chama') {
    const col = w.projCol || '#f68a38';
    c.fillStyle = '#33221a';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    rr(c, -4, -3.5, 11, 7, 2);
    c.fill();
    c.stroke();
    const aura = c.createRadialGradient(8, 0, 1, 8, 0, 14);
    aura.addColorStop(0, '#fff0b8');
    aura.addColorStop(0.45, col);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = aura;
    c.beginPath();
    c.arc(8, 0, 14, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(4, -4);
    c.quadraticCurveTo(14, -6, 17, 0);
    c.quadraticCurveTo(14, 6, 4, 4);
    c.closePath();
    c.fill();
  } else if (w.type === 'incensario') {
    const col = w.projCol || '#d878ff';
    c.fillStyle = '#2d2320';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-10, -1.5, r, 3);
    c.strokeRect(-10, -1.5, r, 3);
    c.strokeStyle = L.trim;
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(r - 10, 0);
    c.lineTo(r - 4, 9);
    c.stroke();
    c.fillStyle = '#3a2b28';
    c.beginPath();
    c.arc(r - 4, 13, 5.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 9;
    c.beginPath();
    c.arc(r - 4, 13, 2.8, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  } else if (w.type === 'mosquete') {
    c.fillStyle = '#472f1f';
    c.fillRect(-7, -1.5, 16, 4.2);
    c.fillStyle = '#6f777d';
    c.fillRect(4, -2.5, r - 2, 2.5);
    c.fillStyle = L.trim;
    c.fillRect(10, -2.6, 3, 3.2);
  } else if (w.type === 'besta') {
    c.fillStyle = '#4a3524';
    c.fillRect(-4, -2, 22, 4);
    c.strokeStyle = '#8a8f92';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(13, -11);
    c.quadraticCurveTo(22, 0, 13, 11);
    c.stroke();
  } else if (w.type === 'cutelo') {
    c.fillStyle = '#2a2320';
    c.fillRect(-6, -2, 11, 4);
    c.fillStyle = '#6f7477';
    c.beginPath();
    c.moveTo(4, -10);
    c.lineTo(r - 6, -10);
    c.lineTo(r, -4);
    c.lineTo(r, 2);
    c.lineTo(4, 2);
    c.fill();
    c.fillStyle = '#5a2020';
    c.fillRect(r - 14, -1, 14, 3);
  } else if (w.type === 'agulha') {
    c.strokeStyle = '#d0d4d6';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-4, 0);
    c.lineTo(r, 0);
    c.stroke();
    c.strokeStyle = '#8c1c1c';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(-4, 0);
    c.quadraticCurveTo(-10, 8, -6, 14);
    c.stroke();
  } else if (w.type === 'alabarda') {
    c.fillStyle = '#3d2e22';
    c.fillRect(-22, -1.5, r + 18, 3);
    c.fillStyle = '#9aa0a2';
    c.beginPath();
    c.moveTo(r - 6, -1.5);
    c.lineTo(r + 10, 0);
    c.lineTo(r - 6, 1.5);
    c.fill();
    c.beginPath();
    c.moveTo(r - 22, -1.5);
    c.quadraticCurveTo(r - 16, -17, r - 4, -13);
    c.quadraticCurveTo(r - 12, -8, r - 8, -1.5);
    c.fill();
    c.beginPath();
    c.moveTo(r - 18, 1.5);
    c.lineTo(r - 13, 9);
    c.lineTo(r - 9, 1.5);
    c.fill();
  } else if (w.type === 'garra') {
    c.strokeStyle = '#d8d0bd';
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (const o of [-5, 0, 5]) {
      c.beginPath();
      c.moveTo(0, o * 0.5);
      c.quadraticCurveTo(r * 0.6, o - 6, r, o + 3);
      c.stroke();
    }
  } else if (w.type === 'sino') {
    c.fillStyle = '#2e241c';
    c.fillRect(-12, -1.5, r + 4, 3);
    c.fillStyle = w.hot ? '#e89a3c' : '#a67c32';
    c.beginPath();
    c.moveTo(r - 10, -4);
    c.lineTo(r, -6);
    c.quadraticCurveTo(r + 3, -11, r + 6, -11);
    c.lineTo(r + 6, 11);
    c.quadraticCurveTo(r + 3, 11, r, 6);
    c.lineTo(r - 10, 4);
    c.fill();
    c.fillStyle = '#5e4318';
    c.fillRect(r + 4, -11, 2, 22);
  }
  if(w.relicTint) {
    c.save();c.strokeStyle=w.relicTint;c.fillStyle=w.relicTint;c.lineWidth=1.4;
    c.shadowColor=w.relicTint;c.shadowBlur=6;
    for(let i=0;i<3;i++) {const x=9+i*7;c.beginPath();c.moveTo(x,-2);c.lineTo(x+3,-5);c.lineTo(x+5,-1);c.stroke();}
    c.beginPath();c.moveTo(-2,-3);c.lineTo(2,-7);c.lineTo(6,-3);c.lineTo(2,1);c.closePath();c.fill();
    c.restore();
  }

}

export function drawShield(
  c: CanvasRenderingContext2D,
  L: { coat: string; trim: string; shield: number },
  x: number,
  y: number,
  k: number
) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.fillStyle = shade(L.coat, 0.16);
  c.strokeStyle = L.trim;
  c.lineWidth = 1.6;
  if (L.shield === 1) {
    c.beginPath();
    c.arc(0, 0, 9, 0, 7);
    c.fill();
    c.stroke();
    c.fillStyle = L.trim;
    c.beginPath();
    c.arc(0, 0, 2.5, 0, 7);
    c.fill();
  } else if (L.shield === 2) {
    c.beginPath();
    c.moveTo(-7, -10);
    c.lineTo(7, -10);
    c.lineTo(7, 2);
    c.quadraticCurveTo(7, 10, 0, 13);
    c.quadraticCurveTo(-7, 10, -7, 2);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = L.trim;
    c.fillRect(-0.8, -10, 1.6, 22);
    c.fillRect(-7, -3, 14, 1.6);
  } else {
    rr(c, -6.5, -15, 13, 30, 2);
    c.fill();
    c.stroke();
    c.fillStyle = L.trim;
    c.fillRect(-6.5, -2, 13, 2);
  }
  c.restore();
}

export function drawHumanoid(c: CanvasRenderingContext2D, L: AppearanceDef, p: PoseParams) {
  const bw = [0.85, 1, 1.2][L.build];
  const t = p.t || 0;
  const run = p.run || 0;
  const sw = Math.sin(t * 10) * 0.6 * run;
  const bob = run ? Math.abs(Math.sin(t * 10)) * 2 : Math.sin(t * 2) * 0.6;
  const wp = p.weapon || WEAPONS.espada_vigilia;
  const rel = p.rel === undefined ? -0.5 : p.rel;
  c.save();
  if (p.roll != null) {
    c.translate(0, -20);
    c.rotate(p.roll);
    c.scale(0.74, 0.74);
    c.translate(0, 30);
  }
  c.translate(0, -bob);
  if (p.lean) c.rotate(p.lean);
  if (L.capeStyle > 0) {
    const len = [0, 22, 40, 36][L.capeStyle];
    const sway = (p.sway || 0) * 12 + Math.sin(t * 3) * 2;
    c.fillStyle = L.cape;
    c.beginPath();
    c.moveTo(4 * bw, -48);
    c.lineTo(-8 * bw, -48);
    c.lineTo(-13 * bw - sway, -48 + len);
    if (L.capeStyle === 3) {
      c.lineTo(-10 * bw - sway, -56 + len);
      c.lineTo(-7 * bw - sway * 0.8, -47 + len);
      c.lineTo(-4 * bw - sway * 0.7, -58 + len);
    }
    c.lineTo(-1 - sway * 0.5, -50 + len);
    c.closePath();
    c.fill();
  }
  const arm = (a: number, front: boolean) => {
    c.save();
    c.translate(front ? 2 * bw : -3 * bw, -45);
    c.rotate(a);
    c.fillStyle = front ? shade(L.coat, 0.12) : shade(L.coat, -0.28);
    rr(c, -3, -3, 15, 6, 3);
    c.fill();
    c.fillStyle = L.skin;
    c.beginPath();
    c.arc(13, 0, 3, 0, 7);
    c.fill();
    if (front) {
      c.translate(13, 0);
      c.rotate(rel);
      drawWeapon(c, wp, L);
    } else if (L.bell) {
      c.translate(13, 0);
      c.rotate(-a);
      c.fillStyle = '#a67c32';
      c.beginPath();
      c.moveTo(-1, 1);
      c.lineTo(1, 1);
      c.lineTo(5, 10);
      c.lineTo(-5, 10);
      c.fill();
      c.fillRect(-1, 10, 2, 2);
    }
    c.restore();
  };
  const a2 = p.arm2 === undefined ? 1.2 - sw * 0.9 : p.arm2;
  arm(a2, false);

  const legC = shade(L.coat, -0.38);
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * 3 * bw, -24);
    c.rotate(p.air ? s * 0.4 : s * sw);
    c.fillStyle = s < 0 ? shade(L.coat, -0.5) : legC;
    c.fillRect(-3.5, 0, 7, 17);
    c.fillStyle = '#14110f';
    c.fillRect(-3.5, 15, 9, 9);
    c.restore();
  }
  c.fillStyle = L.coat;
  rr(c, -9 * bw, -49, 18 * bw, 27, 3);
  c.fill();
  c.beginPath();
  c.moveTo(-9 * bw, -27);
  c.lineTo(-12 * bw, -9);
  c.lineTo(-2 * bw, -23);
  c.fill();
  if (L.robe) {
    c.beginPath();
    c.moveTo(-9 * bw, -26);
    c.lineTo(-13 * bw, 0);
    c.lineTo(12 * bw, 0);
    c.lineTo(9 * bw, -26);
    c.fill();
    c.fillStyle = L.trim;
    c.fillRect(-13 * bw, -3, 25 * bw, 3);
  }
  c.fillStyle = L.trim;
  c.fillRect(-9 * bw, -30, 18 * bw, 3);
  c.fillRect(3 * bw, -47, 2, 17);

  c.fillStyle = L.skin;
  c.beginPath();
  c.arc(1, -57, 8, 0, 7);
  c.fill();
  if (L.hairStyle > 0 && L.hat !== 3) {
    c.fillStyle = L.hair;
    c.beginPath();
    c.arc(1, -58, 8.6, Math.PI * 0.95, Math.PI * 1.95);
    c.fill();
    c.fillRect(-8, -60, 5, 7);
    if (L.hairStyle === 2) c.fillRect(-9, -60, 6, 21);
  }
  if (L.hat === 2) {
    c.fillStyle = L.cape;
    c.beginPath();
    c.arc(0, -57, 10.6, Math.PI * 0.55, Math.PI * 1.88);
    c.fill();
    c.beginPath();
    c.moveTo(-9, -62);
    c.lineTo(-15, -50);
    c.lineTo(-6, -50);
    c.fill();
  }
  if (L.hat === 3) {
    c.fillStyle = '#8b9296';
    c.beginPath();
    c.arc(1, -58, 9.2, Math.PI, 0);
    c.fill();
    c.fillRect(-8.2, -58, 18.4, 6);
    c.fillStyle = '#5b6165';
    c.fillRect(-8.2, -52, 7, 5);
    c.fillStyle = '#111';
    c.fillRect(1, -59, 9.2, 2.6);
    c.fillStyle = L.trim;
    c.fillRect(0, -67.5, 2, 6);
  }
  if (L.hat === 4) {
    c.fillStyle = L.trim;
    c.fillRect(-6, -67, 14, 3);
    c.beginPath();
    c.moveTo(-6, -67);
    c.lineTo(-4, -74);
    c.lineTo(-2, -67);
    c.lineTo(1, -67);
    c.lineTo(3, -75);
    c.lineTo(5, -67);
    c.lineTo(6, -67);
    c.lineTo(7, -70);
    c.lineTo(8, -67);
    c.fill();
  }
  if (L.hat === 5) {
    c.strokeStyle = '#6f7477';
    c.lineWidth = 1.2;
    c.strokeRect(-9, -69, 20, 20);
    for (let i = -5; i <= 7; i += 4) {
      c.beginPath();
      c.moveTo(i, -69);
      c.lineTo(i, -49);
      c.stroke();
    }
    c.fillStyle = '#b08a3c';
    c.fillRect(-1, -55, 4, 5);
  }
  if (L.hat === 6) {
    c.fillStyle = '#cfc8b6';
    c.fillRect(-7.5, -62, 17.5, 5.5);
    c.fillStyle = '#9a9484';
    c.fillRect(-7.5, -59.5, 17.5, 1);
    c.fillStyle = L.hair;
    c.beginPath();
    c.arc(-3, -67, 4.5, 0, 7);
    c.fill();
  }
  if (L.candles) {
    for (const [x, hh] of [
      [-4, 7],
      [1, 10],
      [6, 6],
    ]) {
      c.fillStyle = '#e8dcc8';
      c.fillRect(x - 1.2, -67 - hh, 2.4, hh + 2);
      c.fillStyle = '#f6b040';
      c.beginPath();
      c.ellipse(x, -69 - hh + Math.sin(t * 9 + x) * 0.5, 1.4, 2.6, 0, 0, 7);
      c.fill();
    }
  }
  if (L.shrooms) {
    for (const [x, y, r] of [
      [-8, -50, 4.5],
      [-11, -44, 3.2],
      [6, -51, 3.6],
      [-5, -54, 2.6],
    ]) {
      c.fillStyle = '#b9a886';
      c.fillRect(x - 0.8, y, 1.6, 4);
      c.fillStyle = '#8d9a6a';
      c.beginPath();
      c.arc(x, y, r, Math.PI, 0);
      c.fill();
    }
  }
  if (L.beak) {
    c.fillStyle = '#d4ccb8';
    c.beginPath();
    c.moveTo(6, -61);
    c.lineTo(18, -55);
    c.lineTo(6, -53);
    c.closePath();
    c.fill();
  }
  if (L.hat !== 6) {
    c.fillStyle = L.eyes;
    if (p.glow) {
      c.shadowColor = L.eyes;
      c.shadowBlur = 10;
    }
    c.fillRect(4.5, -59, 3, 2);
    c.shadowBlur = 0;
  }
  arm(p.arm === undefined ? 0.9 + sw * 0.5 : p.arm, true);
  if (p.trail) {
    c.translate(2 * bw, -45);
    c.strokeStyle = 'rgba(235,230,215,.45)';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.beginPath();
    const a = p.trail[0] + rel;
    const b = p.trail[1] + rel;
    c.arc(0, 0, 13 + wp.reach, a, b, b < a);
    c.stroke();
  }
  c.restore();
}

export function drawFox(c: CanvasRenderingContext2D, p: PoseParams, look: PlayerLook) {
  const t = p.t || 0;
  const run = p.run || 0;
  const sw = Math.sin(t * 10) * 0.62 * run;
  const bob = run ? Math.abs(Math.sin(t * 10)) * 2 : Math.sin(t * 2.2) * 0.65;
  const sway = (p.sway || 0) * 12 + Math.sin(t * 3) * 2;
  const wp = WEAPONS[look.weapon] || WEAPONS.espada_vigilia;
  const armor = ARMORS[look.armor] || ARMORS.sobretudo_velmora;
  const rel = wp.category === 'bow' || wp.category === 'magic' || wp.category === 'pyro' ? -0.18 : -0.5;
  const tw = Math.sin(t * 3.1) * 3 - sway * 0.45;
  const ink = '#0c0d10';

  const tri = (a: number, b: number, d: number, e: number, f: number, g: number) => {
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(d, e);
    c.lineTo(f, g);
    c.closePath();
    c.fill();
  };

  c.save();
  if (p.roll != null) {
    c.translate(0, -20);
    c.rotate(p.roll);
    c.scale(0.76, 0.76);
    c.translate(0, 30);
  }
  c.translate(0, -bob);
  if (p.lean) c.rotate(p.lean);

  // Subtle ground anchor shadow
  c.fillStyle = 'rgba(0,0,0,0.34)';
  c.beginPath();
  c.ellipse(0, 0, 14, 3.2, 0, 0, Math.PI * 2);
  c.fill();

  // Multi-tuft high-detail Fox Tail
  c.save();
  const tailGrad = c.createLinearGradient(-4, -30, -34, -2 + tw);
  tailGrad.addColorStop(0, '#963d1e');
  tailGrad.addColorStop(0.62, FOX_PALETTE.fur);
  tailGrad.addColorStop(0.82, '#443c40');
  tailGrad.addColorStop(1, '#262124');
  c.fillStyle = tailGrad;
  c.strokeStyle = ink;
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(-4, -29);
  c.quadraticCurveTo(-18, -39 + tw * 0.6, -29, -24 + tw);
  c.lineTo(-34, -20 + tw);
  c.lineTo(-31, -15 + tw);
  c.lineTo(-35, -9 + tw);
  c.quadraticCurveTo(-30, -1 + tw, -20, -3 + tw);
  c.lineTo(-17, -7 + tw * 0.7);
  c.quadraticCurveTo(-10, -13, -3, -21);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = '#cf6d3d';
  c.beginPath();
  c.moveTo(-8, -26);
  c.quadraticCurveTo(-18, -33 + tw * 0.6, -26, -21 + tw * 0.85);
  c.quadraticCurveTo(-17, -23 + tw * 0.6, -8, -21);
  c.closePath();
  c.fill();
  c.fillStyle = FOX_PALETTE.light;
  c.beginPath();
  c.arc(-26, -5.5 + tw, 2.2, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // Ranger quiver on back
  if (armor.style === 'ranger') {
    c.save();
    c.translate(-8, -46);
    c.rotate(-0.35);
    c.fillStyle = '#4a3222';
    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillRect(-3, -12, 5, 16);
    c.strokeRect(-3, -12, 5, 16);
    c.fillStyle = '#e8dcc8';
    c.fillRect(-2.5, -16, 1.5, 4);
    c.fillRect(0.5, -15, 1.5, 3);
    c.restore();
  }

  // Arcane lunar or Pyromancer cinder halo behind robes
  if (armor.style === 'robe' || armor.style === 'eclipse' || armor.style === 'pyro') {
    c.save();
    c.strokeStyle = armor.style === 'pyro' ? '#f68a38' : armor.trim;
    c.globalAlpha = 0.48 + 0.22 * Math.sin(t * (armor.style === 'pyro' ? 7 : 4));
    c.lineWidth = armor.style === 'pyro' ? 1.8 : 1.3;
    c.beginPath();
    c.arc(-1, -56, 16, Math.PI * 0.85, Math.PI * 2.15);
    c.stroke();
    if (armor.style === 'pyro') {
      c.fillStyle = 'rgba(255, 130, 48, 0.35)';
      c.beginPath();
      c.arc(-11, -40 + Math.sin(t * 8) * 3, 2.2, 0, Math.PI * 2);
      c.arc(9, -36 + Math.cos(t * 7) * 3, 1.8, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // Back tattered coat tail + inner armor scarf lining
  c.fillStyle = armor.coatD;
  c.strokeStyle = ink;
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(4, -49);
  c.lineTo(-8, -49);
  c.lineTo(-17 - sway, -8);
  c.lineTo(-12.5 - sway * 0.9, -14);
  c.lineTo(-9 - sway * 0.8, -6);
  c.lineTo(-5.5 - sway * 0.6, -13);
  c.lineTo(-1.5 - sway * 0.3, -7);
  c.lineTo(3, -15);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = armor.scarf;
  tri(-6, -20, -10.5 - sway * 0.75, -6, -3, -12);

  // Off-hand arm
  const a2 = p.arm2 === undefined ? 0.55 - sw * 0.6 : p.arm2;
  const hx = -3 + 13.5 * Math.cos(a2);
  const hy = -45 + 13.5 * Math.sin(a2);
  c.save();
  c.translate(-3, -45);
  c.rotate(a2);
  c.fillStyle = armor.coatD;
  c.strokeStyle = ink;
  c.lineWidth = 1;
  rr(c, -3, -3.2, 15.5, 6.4, 3);
  c.fill();
  c.stroke();
  c.fillStyle = '#5a544d';
  c.fillRect(5, -3.4, 5.5, 6.8);
  c.fillStyle = FOX_PALETTE.glove;
  c.beginPath();
  c.arc(13.5, 0, 3.3, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();

  // Articulated legs & buckled boots
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * 3.2, -24);
    c.rotate(p.air ? s * 0.42 : s * sw);
    c.fillStyle = s < 0 ? '#1b1817' : '#2e2927';
    c.strokeStyle = ink;
    c.lineWidth = 1;
    c.fillRect(-3.6, 0, 7.2, 16);
    c.strokeRect(-3.6, 0, 7.2, 16);
    if (s > 0) {
      c.fillStyle = armor.style === 'plate' || armor.style === 'blood' ? armor.coatL : '#6f6960';
      c.beginPath();
      c.moveTo(-3.2, 4);
      c.lineTo(4.4, 6);
      c.lineTo(3.2, 10.5);
      c.lineTo(-3.2, 9.5);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#181413';
    c.beginPath();
    c.moveTo(-3.8, 12);
    c.lineTo(3.8, 12);
    c.lineTo(4.2, 20);
    c.lineTo(6.6, 21.5);
    c.lineTo(6.6, 24);
    c.lineTo(-3.8, 24);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = armor.trim;
    c.fillRect(-3.6, 14.5, 7.2, 1.7);
    c.fillRect(1, 13.8, 2.4, 3);
    c.restore();
  }

  // Coat / Armor torso & tattered lower skirts
  c.fillStyle = armor.coat;
  c.strokeStyle = ink;
  c.lineWidth = 1.1;
  rr(c, -8.8, -50, 17.6, 25, 3);
  c.fill();
  c.stroke();

  if (armor.style === 'plate' || armor.style === 'blood') {
    c.fillStyle = armor.coatL;
    rr(c, -7.2, -47, 14.4, 14, 2);
    c.fill();
    c.stroke();
    c.fillStyle = armor.trim;
    c.fillRect(-1.1, -46, 2.2, 11);
    c.fillRect(-5, -42, 10, 1.8);
  }

  c.fillStyle = armor.coat;
  c.beginPath();
  c.moveTo(-9, -29);
  c.lineTo(-13, -8);
  c.lineTo(-8.5, -14);
  c.lineTo(-5, -7);
  c.lineTo(-2, -14);
  c.lineTo(1.5, -27);
  c.closePath();
  c.fill();
  c.stroke();

  c.beginPath();
  c.moveTo(2, -29);
  c.lineTo(3.2, -12);
  c.lineTo(6.4, -8);
  c.lineTo(8.5, -13);
  c.lineTo(11, -8.5);
  c.lineTo(8.8, -29);
  c.closePath();
  c.fill();
  c.stroke();

  // Cross leather straps, belt, pouch & flask vial
  c.fillStyle = FOX_PALETTE.leather;
  c.fillRect(-8.8, -31.5, 17.6, 3.2);
  c.save();
  c.translate(0, -39.5);
  c.rotate(0.5);
  c.fillRect(-10.5, -1.2, 21, 2.4);
  c.restore();
  rr(c, -8.4, -28.5, 5.4, 6.4, 1.2);
  c.fill();
  c.stroke();
  c.fillStyle = '#5c554c';
  c.fillRect(-1.5, -28, 3, 5);
  c.fillStyle = armor.trim;
  c.fillRect(-1.8, -29, 3.6, 1.4);
  c.fillRect(1.8, -32.2, 3.6, 4.6);

  // Tattered Hunter Mantle / Armored Shoulder Pauldron
  c.fillStyle = armor.coatL;
  c.beginPath();
  c.moveTo(-10.5, -51);
  c.lineTo(9.5, -51);
  c.lineTo(12, -41.5);
  c.lineTo(7.8, -37.5);
  c.lineTo(4.2, -41.5);
  c.lineTo(0, -36.5);
  c.lineTo(-4.2, -41);
  c.lineTo(-8.5, -35.5);
  c.lineTo(-14 - sway * 0.35, -39.5);
  c.closePath();
  c.fill();
  c.stroke();

  if (armor.style === 'plate' || armor.style === 'blood' || armor.style === 'eclipse') {
    c.fillStyle = armor.trim;
    c.beginPath();
    c.arc(-8, -46, 4.2, Math.PI, 0);
    c.fill();
    c.stroke();
  }

  c.strokeStyle = 'rgba(216,208,189,0.22)';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(-5, -49);
  c.lineTo(-8, -39);
  c.moveTo(2, -49);
  c.lineTo(4, -40);
  c.stroke();

  // Brooch & chain
  c.strokeStyle = armor.trim;
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(5, -46);
  c.quadraticCurveTo(8, -43, 10, -45);
  c.stroke();
  c.fillStyle = armor.trim;
  c.beginPath();
  c.arc(5, -46.5, 2.1, 0, Math.PI * 2);
  c.fill();

  // High collar + trailing scarf
  c.fillStyle = armor.coatD;
  c.strokeStyle = ink;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-8.5, -49);
  c.lineTo(-10.5, -59.5);
  c.lineTo(-1.5, -52);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = armor.scarf;
  c.beginPath();
  c.moveTo(-5, -52);
  c.lineTo(-18.5 - sway, -47.5 + Math.sin(t * 5) * 1.6);
  c.lineTo(-13.5 - sway * 0.85, -45 + Math.sin(t * 5) * 1.2);
  c.lineTo(-16.5 - sway * 0.9, -43 + Math.sin(t * 5) * 1.4);
  c.lineTo(-5, -46);
  c.closePath();
  c.fill();
  c.stroke();

  // High-detail Fox Head
  c.fillStyle = '#332b2d';
  c.strokeStyle = ink;
  c.lineWidth = 1;
  tri(-6.5, -63, -7.5, -77.5, 0.5, -66);
  c.stroke();

  const furGrad = c.createLinearGradient(-10, -70, 15, -54);
  furGrad.addColorStop(0, '#a34522');
  furGrad.addColorStop(0.55, FOX_PALETTE.fur);
  furGrad.addColorStop(1, '#ce6b38');
  c.fillStyle = furGrad;
  c.beginPath();
  c.moveTo(-6, -63);
  c.lineTo(-12.5, -60.5);
  c.lineTo(-9, -58);
  c.lineTo(-12, -55.5);
  c.lineTo(-5.5, -54);
  c.lineTo(5, -52);
  c.lineTo(16.8, -55.8);
  c.lineTo(7, -62.2);
  c.lineTo(3, -64.8);
  c.quadraticCurveTo(-2, -66, -6, -63);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = FOX_PALETTE.light;
  c.beginPath();
  c.moveTo(2, -56);
  c.lineTo(15.2, -55.6);
  c.lineTo(8, -52.5);
  c.lineTo(1, -53);
  c.closePath();
  c.fill();

  c.fillStyle = FOX_PALETTE.fur;
  tri(-1.2, -63.5, 3.2, -79.5, 8.2, -62.8);
  c.stroke();
  c.fillStyle = FOX_PALETTE.light;
  tri(1.3, -64.6, 3.3, -74.5, 6.1, -64.2);
  c.fillStyle = FOX_PALETTE.dark;
  tri(2.0, -74.5, 3.2, -79.5, 4.7, -74);

  c.fillStyle = '#141214';
  c.beginPath();
  c.arc(16.2, -55.8, 1.45, 0, Math.PI * 2);
  c.fill();

  // Wrapped face-scarf
  c.fillStyle = armor.scarf;
  c.beginPath();
  c.moveTo(-7.5, -54);
  c.lineTo(4.2, -57.2);
  c.lineTo(13.8, -55);
  c.lineTo(9.2, -50.8);
  c.lineTo(7.2, -45);
  c.lineTo(-7.5, -46);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = 'rgba(20,10,14,0.45)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-4, -51.5);
  c.lineTo(9, -52.5);
  c.moveTo(-5, -48.5);
  c.lineTo(7.5, -49);
  c.stroke();

  // Fierce brow & glowing amber eye
  c.fillStyle = FOX_PALETTE.dark;
  c.beginPath();
  c.moveTo(4.6, -62.5);
  c.lineTo(10.2, -61.5);
  c.lineTo(9.6, -63.1);
  c.closePath();
  c.fill();
  const eyeCol = look.build === 'mago' ? '#9ed7f0' : look.build === 'piromante' ? '#ff7d30' : '#f5b832';
  c.fillStyle = eyeCol;
  c.shadowColor = eyeCol;
  c.shadowBlur = 7;
  c.beginPath();
  c.moveTo(5.8, -61);
  c.lineTo(9.8, -61);
  c.lineTo(8.8, -59.2);
  c.lineTo(6.2, -59.5);
  c.closePath();
  c.fill();
  c.shadowBlur = 0;

  // Ornate brass cage Lantern in off-hand
  if (!p.block) {
    const lg = c.createRadialGradient(hx, hy + 11, 1, hx, hy + 11, 28);
    lg.addColorStop(0, 'rgba(252,190,78,0.58)');
    lg.addColorStop(0.5, 'rgba(232,140,48,0.22)');
    lg.addColorStop(1, 'rgba(246,176,64,0)');
    c.fillStyle = lg;
    c.fillRect(hx - 28, hy - 16, 56, 56);

    c.strokeStyle = ink;
    c.lineWidth = 0.9;
    c.fillStyle = armor.trim;
    c.beginPath();
    c.arc(hx, hy + 2.5, 2, 0, Math.PI * 2);
    c.stroke();
    tri(hx - 4.6, hy + 6.8, hx, hy + 3.4, hx + 4.6, hy + 6.8);
    c.stroke();
    c.fillRect(hx - 4, hy + 6.5, 8, 10.5);
    c.strokeRect(hx - 4, hy + 6.5, 8, 10.5);
    tri(hx - 2.8, hy + 17, hx, hy + 20.5, hx + 2.8, hy + 17);
    c.fillStyle = '#ffe082';
    c.fillRect(hx - 2.6, hy + 7.8, 5.2, 7.6);
    c.fillStyle = '#fff5cc';
    c.fillRect(hx - 1.2, hy + 9, 2.4, 5.2);
    c.fillStyle = '#473619';
    c.fillRect(hx - 0.5, hy + 7, 1, 9.5);
  }

  // Front weapon arm & metallic vambrace
  c.save();
  c.translate(2, -45);
  c.rotate(p.arm === undefined ? 0.9 + sw * 0.5 : p.arm);
  c.fillStyle = armor.coatL;
  c.strokeStyle = ink;
  c.lineWidth = 1;
  rr(c, -3, -3.2, 15.5, 6.4, 3);
  c.fill();
  c.stroke();
  c.fillStyle = '#7c766d';
  c.fillRect(4.5, -3.5, 6.5, 7);
  c.strokeRect(4.5, -3.5, 6.5, 7);
  c.fillStyle = FOX_PALETTE.glove;
  c.beginPath();
  c.arc(13.5, 0, 3.3, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.translate(13.5, 0);
  c.rotate(rel);
  drawWeapon(c, wp, { trim: armor.trim });
  c.restore();

  if(armor.relicTint) {
    c.save();c.fillStyle=armor.trim;c.strokeStyle='#17232b';c.lineWidth=.9;
    for(const side of [-1,1]) {
      c.beginPath();c.moveTo(side*7,-47);c.lineTo(side*18,-51);c.lineTo(side*21,-42);c.lineTo(side*11,-39);c.closePath();c.fill();c.stroke();
      c.strokeStyle=armor.trim;c.beginPath();c.moveTo(side*9,-34);c.lineTo(side*12,-23);c.lineTo(side*7,-17);c.stroke();
    }
    c.shadowColor=armor.relicTint;c.shadowBlur=8;c.fillStyle=armor.relicTint;
    c.beginPath();c.moveTo(0,-45);c.lineTo(4,-39);c.lineTo(0,-33);c.lineTo(-4,-39);c.closePath();c.fill();
    c.restore();
  }

  if (p.block) {
    drawShield(c, { coat: armor.coat, trim: armor.trim, shield: look.shield }, hx + 6, hy + 7, 1.35);
  }
  if (p.trail && wp.category === 'melee') {
    c.translate(2, -45);
    c.strokeStyle = 'rgba(235,230,215,0.52)';
    c.lineWidth = 5.5;
    c.lineCap = 'round';
    c.beginPath();
    const a = p.trail[0] + rel;
    const b = p.trail[1] + rel;
    c.arc(0, 0, 14 + wp.reach, a, b, b < a);
    c.stroke();
  }
  c.restore();
}

function drawGargula(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const flap = Math.sin(t * 9) * 14;
  ctx.save();
  ctx.strokeStyle = '#131618';
  ctx.lineWidth = 1.4;
  // Stone wings with ribbed bone struts
  ctx.fillStyle = '#2d3236';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 6, -38);
    ctx.quadraticCurveTo(s * 28, -66 + flap, s * 46, -46 + flap);
    ctx.lineTo(s * 30, -24 + flap * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 8, -38);
    ctx.lineTo(s * 36, -42 + flap * 0.8);
    ctx.stroke();
  }
  // Clawed stone talons
  ctx.strokeStyle = '#4f575c';
  ctx.lineWidth = 2.2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 6, -15);
    ctx.lineTo(s * 10, -4);
    ctx.lineTo(s * 15, 0);
    ctx.stroke();
  }
  // Torso & rib armor
  ctx.fillStyle = '#3f454a';
  ctx.strokeStyle = '#131618';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -32, 13, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head & horns
  ctx.beginPath();
  ctx.arc(0, -52, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#23272a';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 4, -58);
    ctx.lineTo(s * 11, -72);
    ctx.lineTo(s * 8, -55);
    ctx.closePath();
    ctx.fill();
  }
  // Glowing eyes & fissures
  ctx.fillStyle = e.state === 'wind' || e.state === 'act' ? '#ff4a2a' : '#f6b040';
  ctx.fillRect(3, -54, 4, 2.2);
  ctx.strokeStyle = e.state === 'wind' || e.state === 'act' ? 'rgba(255,96,42,0.7)' : '#181c1e';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, -40);
  ctx.lineTo(2, -32);
  ctx.lineTo(-2, -22);
  ctx.stroke();
  ctx.restore();
}

function drawHound(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const run = Math.abs(e.vx) > 20 ? 1 : 0;
  const sw = Math.sin(t * 14) * 0.6 * run;
  const cr = e.state === 'wind' ? 4 : 0;
  ctx.translate(0, cr);
  ctx.strokeStyle = '#26252a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const [x, s] of [
    [-12, 1],
    [-7, -1],
    [9, -1],
    [14, 1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, -13);
    ctx.lineTo(x + Math.sin(sw * s) * 9, -cr);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-17, -19);
  ctx.lineTo(-28, -26 + Math.sin(t * 6) * 3);
  ctx.stroke();
  ctx.fillStyle = '#2f2e33';
  ctx.beginPath();
  ctx.ellipse(0, -17, 19, 8, 0, 0, 7);
  ctx.fill();
  // Jagged dorsal spines
  ctx.fillStyle = '#1b1a1f';
  for (let i = -12; i <= 10; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i - 2, -23);
    ctx.lineTo(i, -30);
    ctx.lineTo(i + 3, -23);
    ctx.fill();
  }
  ctx.fillStyle = '#2f2e33';
  ctx.beginPath();
  ctx.ellipse(18, -22, 8, 6, 0, 0, 7);
  ctx.fill();
  ctx.fillRect(21, -23, 10, 5);
  // Bloody snout & fangs
  ctx.fillStyle = '#781c20';
  ctx.fillRect(25, -20, 6, 2.5);
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(26, -18, 1.5, 2.5);
  ctx.fillRect(29, -18, 1.5, 2.5);
  ctx.fillStyle = '#2f2e33';
  ctx.beginPath();
  ctx.moveTo(13, -26);
  ctx.lineTo(14, -34);
  ctx.lineTo(19, -27);
  ctx.fill();
  ctx.strokeStyle = e.vuln ? '#6a6670' : '#e8862c';
  ctx.lineWidth = 1.3;
  for (let i = -8; i < 8; i += 5) {
    ctx.beginPath();
    ctx.moveTo(i, -23);
    ctx.lineTo(i - 1, -12);
    ctx.stroke();
  }
  ctx.fillStyle = e.state === 'wind' ? '#ff3a2a' : '#d64538';
  ctx.fillRect(21, -25, 3, 2);
}

function drawViuva(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const b = e.bells;
  const shk = e.state === 'wind' || e.state === 'volley' ? Math.sin(t * 40) * 2 : 0;
  ctx.fillStyle = '#17141a';
  ctx.beginPath();
  ctx.moveTo(-7, -78);
  ctx.lineTo(7, -78);
  ctx.lineTo(24, 0);
  ctx.lineTo(16, -6);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, -7);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-16, -6);
  ctx.lineTo(-24, 0);
  ctx.closePath();
  ctx.fill();
  // Golden hem lace trim
  ctx.strokeStyle = 'rgba(176,138,60,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.lineTo(22, -4);
  ctx.stroke();
  ctx.strokeStyle = '#3a3340';
  ctx.lineWidth = 1;
  for (const x of [-10, -3, 4, 11]) {
    ctx.beginPath();
    ctx.moveTo(x * 0.4, -70);
    ctx.lineTo(x * 1.6, -6);
    ctx.stroke();
  }
  ctx.strokeStyle = '#b08a3c';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i * Math.PI) / 10;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, -86 + Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * 17, -86 + Math.sin(a) * 17);
    ctx.stroke();
  }
  ctx.fillStyle = '#17141a';
  ctx.beginPath();
  ctx.arc(0, -84, 8, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#b9b2a4';
  ctx.beginPath();
  ctx.ellipse(e.face * 1.5, -83, 4, 5.5, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#17141a';
  ctx.fillRect(e.face * 1.5 - 3, -85, 6, 1.4);
  ctx.strokeStyle = '#2a252e';
  ctx.lineWidth = 2.2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 5, -72);
    ctx.lineTo(s * 34, -76 + shk * 0.3);
    ctx.lineTo(s * 52, -62);
    ctx.stroke();
  }
  [
    [-34, -74],
    [34, -74],
    [-50, -60],
    [50, -60],
  ].forEach(([x, y], i) => {
    if (i >= b) {
      ctx.strokeStyle = '#4a4038';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
      return;
    }
    const sx = x + Math.sin(t * 3 + i) * 1.5 + shk;
    if (e.state === 'wind' || e.state === 'volley') {
      ctx.strokeStyle = 'rgba(246, 210, 122, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, y + 18, 9 + Math.sin(t * 18 + i) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6b5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(sx, y + 12);
    ctx.stroke();
    ctx.fillStyle = '#a67c32';
    ctx.beginPath();
    ctx.moveTo(sx - 2, y + 12);
    ctx.lineTo(sx + 2, y + 12);
    ctx.lineTo(sx + 6, y + 24);
    ctx.lineTo(sx - 6, y + 24);
    ctx.fill();
    ctx.fillStyle = '#5e4318';
    ctx.fillRect(sx - 1, y + 24, 2, 3);
  });
}

function drawLobisomem(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const run = Math.abs(e.vx) > 20 ? 1 : 0;
  const sw = Math.sin(t * 15) * 0.65 * run;
  const lunge = e.state === 'wind' ? -0.18 : e.state === 'act' ? 0.25 : 0;
  ctx.save();
  ctx.rotate(lunge);

  // Legs
  ctx.strokeStyle = '#5e1418';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 6, -30);
    ctx.lineTo(s * 7 - sw * 12 * s, -14);
    ctx.lineTo(s * 10 - sw * 15 * s, 0);
    ctx.stroke();
  }

  // Flayed crimson-muscular hunched body & hanging skin shreds
  ctx.fillStyle = '#7d1b22';
  ctx.strokeStyle = '#1c090b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(2, -44, 18, 22, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Exposed white ribs & sinew
  ctx.strokeStyle = '#d8cbb8';
  ctx.lineWidth = 1.4;
  for (let i = -3; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-4, -48 + i * 5);
    ctx.quadraticCurveTo(6, -45 + i * 5, 13, -49 + i * 5);
    ctx.stroke();
  }

  // Hanging tattered crimson hide strips
  ctx.fillStyle = '#a3282e';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 6 - 3, -36);
    ctx.lineTo(i * 7 - 5, -10 + Math.sin(t * 7 + i) * 3);
    ctx.lineTo(i * 6 + 2, -26);
    ctx.fill();
  }

  // Hunched snout & fangs
  ctx.fillStyle = '#8e2128';
  ctx.beginPath();
  ctx.ellipse(15, -52, 11, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff4e3b';
  ctx.fillRect(19, -55, 4, 2.2);

  // Oversized drooping clawed arm
  const armAng = e.state === 'wind' ? -1.9 : e.state === 'act' ? 0.85 : 0.4 + Math.sin(t * 4) * 0.1;
  ctx.save();
  ctx.translate(10, -48);
  ctx.rotate(armAng);
  ctx.fillStyle = '#6c181d';
  rr(ctx, -3, -4, 30, 8, 3);
  ctx.fill();
  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 2;
  for (const o of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.moveTo(27, o);
    ctx.lineTo(41, o + 3);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

function drawEmissario(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const bob = Math.sin(t * 3.5) * 3;
  ctx.save();
  ctx.translate(0, bob);

  // Subtle cyan cosmic halo
  const aura = ctx.createRadialGradient(0, -56, 4, 0, -56, 36);
  aura.addColorStop(0, 'rgba(130, 224, 248, 0.28)');
  aura.addColorStop(1, 'rgba(130, 224, 248, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-36, -92, 72, 72);

  // Thin pale-blue legs
  ctx.strokeStyle = '#6b859c';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  const step = Math.abs(e.vx) > 10 ? Math.sin(t * 10) * 6 : 0;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 3, -24);
    ctx.lineTo(s * 5 + step * s, 0);
    ctx.stroke();
  }

  // Slender translucent blue body
  ctx.fillStyle = '#7c9ab3';
  ctx.strokeStyle = '#1f2e3b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, -34, 8, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gesturing arms
  const wave = e.state === 'wind' ? -1.4 : Math.sin(t * 3) * 0.25;
  ctx.strokeStyle = '#7c9ab3';
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 7, -40);
    ctx.quadraticCurveTo(s * 18, -46 + wave * 12, s * 24, -34 + wave * 18);
    ctx.stroke();
  }

  // Huge bulbous veined celestial cranium
  const cg = ctx.createRadialGradient(-3, -62, 3, 0, -58, 22);
  cg.addColorStop(0, '#b5dcf5');
  cg.addColorStop(0.6, '#5c82a3');
  cg.addColorStop(1, '#2f4961');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(0, -59, 17, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pulsing cyan eyes
  ctx.fillStyle = e.state === 'wind' ? '#ffffff' : '#7ae8f8';
  ctx.shadowColor = '#7ae8f8';
  ctx.shadowBlur = 7;
  ctx.fillRect(3, -58, 4.5, 3);
  ctx.fillRect(-3, -58, 4, 3);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBestaEletrica(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const run = Math.abs(e.vx) > 20 ? 1 : 0;
  const sw = Math.sin(t * 14) * 0.6 * run;
  ctx.save();

  // Crackling static aura
  const zap = ctx.createRadialGradient(0, -34, 4, 0, -34, 52);
  zap.addColorStop(0, e.state === 'wind' ? 'rgba(135, 228, 255, 0.42)' : 'rgba(110, 200, 255, 0.22)');
  zap.addColorStop(1, 'rgba(110, 200, 255, 0)');
  ctx.fillStyle = zap;
  ctx.fillRect(-52, -86, 104, 88);

  // Dark skeletal quadruped limbs
  ctx.strokeStyle = '#1c2430';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (const [x, s] of [
    [-16, 1],
    [-9, -1],
    [11, -1],
    [17, 1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, -22);
    ctx.lineTo(x + Math.sin(sw * s) * 11, 0);
    ctx.stroke();
  }

  // Dark mane & glowing ribcage
  ctx.fillStyle = '#181f29';
  ctx.beginPath();
  ctx.ellipse(0, -28, 23, 12, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#a6e4ff';
  ctx.lineWidth = 1.6;
  for (let i = -10; i <= 8; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -35);
    ctx.lineTo(i - 2, -20);
    ctx.stroke();
  }

  // Wolf skull
  ctx.fillStyle = '#d4dde6';
  ctx.beginPath();
  ctx.ellipse(22, -34, 10, 7, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#70e2ff';
  ctx.fillRect(25, -36, 4, 2.4);

  // Static lightning arcs around body
  ctx.strokeStyle = '#bfefff';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    const a = t * 14 + i * 2.1;
    const rx = Math.cos(a) * 22;
    const ry = -32 + Math.sin(a * 1.4) * 14;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.sin(t * 40 + i) * 9, ry - 9);
    ctx.lineTo(rx - Math.cos(t * 32 + i) * 7, ry - 16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNpcs(
  ctx: CanvasRenderingContext2D,
  npcs: { def: NpcDef; status: QuestStatus; ready?: boolean }[],
  nearNpcId: string | null,
  time: number
) {
  for (const item of npcs) {
    const n = item.def;
    ctx.save();
    ctx.translate(n.x, n.y);

    // Lantern glow beside NPC
    const gl = ctx.createRadialGradient(18, -36, 2, 18, -36, 48);
    gl.addColorStop(0, `${n.accent}44`);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(-30, -84, 96, 84);

    // Coat & cloak silhouette
    ctx.fillStyle = n.coat;
    ctx.strokeStyle = '#0d0f12';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-9, -48);
    ctx.lineTo(9, -48);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Trim & shoulder mantle
    ctx.fillStyle = n.trim;
    ctx.beginPath();
    ctx.moveTo(-13, -44);
    ctx.lineTo(0, -34);
    ctx.lineTo(13, -44);
    ctx.lineTo(10, -52);
    ctx.lineTo(-10, -52);
    ctx.closePath();
    ctx.fill();

    // Head & distinct headgear
    ctx.fillStyle = '#d8d0bd';
    ctx.beginPath();
    ctx.arc(0, -58, 7, 0, Math.PI * 2);
    ctx.fill();

    if (n.hat === 'crow') {
      // Eileen's Plague Beak & tricorn hat
      ctx.fillStyle = '#18171c';
      ctx.beginPath();
      ctx.arc(0, -61, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#b9b2a4';
      ctx.beginPath();
      ctx.moveTo(4, -60);
      ctx.lineTo(16, -54);
      ctx.lineTo(4, -55);
      ctx.closePath();
      ctx.fill();
    } else if (n.hat === 'hood') {
      // Blindfolded Pilgrim hood
      ctx.fillStyle = '#2e2b26';
      ctx.beginPath();
      ctx.moveTo(-9, -54);
      ctx.lineTo(0, -72);
      ctx.lineTo(9, -54);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8dcc8';
      ctx.fillRect(-5, -59, 10, 3);
    } else if (n.hat === 'crown') {
      // Annalise metallic royal crown & veil
      ctx.strokeStyle = '#f6d27a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, -64);
      ctx.lineTo(-5, -72);
      ctx.lineTo(0, -66);
      ctx.lineTo(5, -72);
      ctx.lineTo(7, -64);
      ctx.stroke();
    } else if (n.hat === 'cage') {
      // Scholar iron wire cage
      ctx.strokeStyle = '#8b8378';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-9, -71, 18, 17);
      ctx.beginPath();
      ctx.moveTo(-4, -71);
      ctx.lineTo(-4, -54);
      ctx.moveTo(4, -71);
      ctx.lineTo(4, -54);
      ctx.stroke();
    }

    // Hanging lantern
    ctx.strokeStyle = '#4a4339';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(11, -44);
    ctx.lineTo(18, -44);
    ctx.lineTo(18, -36);
    ctx.stroke();
    ctx.fillStyle = n.accent;
    ctx.fillRect(15.5, -36, 5, 7);

    // Status Sigil above head
    const bob = Math.sin(time * 3.8) * 3;
    const isNear = nearNpcId === n.id;
    let sigil = '[!]';
    let sCol = n.accent;
    if (item.status === 'completed_light') {
      sigil = '[☀]';
      sCol = '#f6d27a';
    } else if (item.status === 'completed_dark') {
      sigil = '[☾]';
      sCol = '#e05348';
    } else if (item.status === 'completed_neutral') {
      sigil = '[◆]';
      sCol = '#9ed7f0';
    } else if (item.ready) {
      sigil = '[★]';
      sCol = '#f6d27a';
    } else if (item.status === 'active') {
      sigil = '[…]';
      sCol = '#b8c2cc';
    }
    ctx.font = `13px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = sCol;
    ctx.fillText(sigil, 0, -82 + bob);
    if (isNear) {
      ctx.font = `11px ${FONT_D}`;
      ctx.fillStyle = '#e8dcc8';
      ctx.fillText(n.name, 0, -98 + bob);
    }

    ctx.restore();
  }
}

function drawMadre(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const p2 = e.hp < e.maxHp * 0.5;
  const hungry = e.state === 'bites' || e.state === 'lash';
  const w = p2 ? 92 : 76;
  const k = p2 ? 1.15 : 1;
  const g = ctx.createLinearGradient(0, -130, 0, 0);
  g.addColorStop(0, '#3a3028');
  g.addColorStop(1, '#120f0d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.8, -60, -22, -70, -12, -124);
  ctx.lineTo(12, -124);
  ctx.bezierCurveTo(22, -70, w * 0.8, -60, w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,104,88,.35)';
  ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 3, -112);
    ctx.quadraticCurveTo(i * 10, -60, i * w * 0.3, -2);
    ctx.stroke();
  }
  [
    [-48, -18, 11],
    [-22, -30, 12],
    [8, -20, 11],
    [40, -26, 12],
    [-34, -52, 9],
    [2, -56, 10],
    [30, -58, 9],
    [-12, -82, 7],
    [12, -86, 7],
  ].forEach(([x, y, r], i) => {
    const op = (hungry ? 0.6 : 0.25) + 0.4 * Math.abs(Math.sin(t * (hungry ? 5 : 1.6) + i * 1.3));
    ctx.fillStyle = '#d9cdb8';
    ctx.beginPath();
    ctx.ellipse(x * k, y, r, r * op * 0.7 + 1.5, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = hungry ? '#7a1418' : '#3a0f14';
    ctx.beginPath();
    ctx.ellipse(x * k, y, r * 0.82, r * op * 0.5, 0, 0, 7);
    ctx.fill();
  });
  ctx.fillStyle = '#cfc6b2';
  ctx.beginPath();
  ctx.moveTo(-13, -120);
  ctx.quadraticCurveTo(0, -150, 13, -120);
  ctx.lineTo(16, -96);
  ctx.lineTo(-16, -96);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ece6d6';
  ctx.beginPath();
  ctx.ellipse(e.face * 2, -124, 7, 10, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#15120f';
  ctx.fillRect(e.face * 2 - 5, -127, 3.5, 1.6);
  ctx.fillRect(e.face * 2 + 1.5, -127, 3.5, 1.6);
  for (let i = -3; i <= 3; i++) {
    const x = i * 6;
    const hh = 8 + ((i * i * 7) % 5);
    const by = -136 + Math.abs(i) * 3;
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(x - 1.3, by - hh, 2.6, hh);
    ctx.fillStyle = '#f6b040';
    ctx.beginPath();
    ctx.ellipse(x, by - hh - 3 + Math.sin(t * 9 + i) * 0.6, 1.8, 3.4, 0, 0, 7);
    ctx.fill();
  }
}

function drawSanto(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const pale = '#b9ad9c';
  const dk = '#2a2522';
  const gold = '#b08a3c';
  ctx.lineCap = 'round';
  if (e.ceil) {
    ctx.strokeStyle = '#5a554c';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    for (const x of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(x, -130);
      ctx.lineTo(x, -e.y - 20);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6b6558';
    ctx.lineWidth = 5;
    ctx.setLineDash([22, 9]);
    ctx.beginPath();
    ctx.arc(0, -78, 58, t * 0.3, t * 0.3 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = dk;
    ctx.fillRect(-7, -130, 14, 46);
    ctx.fillStyle = '#5a1826';
    ctx.fillRect(-9, -92, 18, 10);
    ctx.fillStyle = pale;
    ctx.beginPath();
    ctx.moveTo(-9, -84);
    ctx.lineTo(9, -84);
    ctx.lineTo(12, -36);
    ctx.lineTo(-12, -36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(42,37,34,.5)';
    ctx.lineWidth = 1;
    for (let y = -76; y < -42; y += 7) {
      ctx.beginPath();
      ctx.moveTo(-9, y);
      ctx.lineTo(9, y);
      ctx.stroke();
    }
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 2 + s) * 5;
      ctx.strokeStyle = pale;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s * 11, -40);
      ctx.lineTo(s * 52, -70 + sw);
      ctx.lineTo(s * 82, -22 + sw);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (const o of [-5, 0, 5]) {
        ctx.beginPath();
        ctx.moveTo(s * 82, -22 + sw);
        ctx.lineTo(s * 82 + o, -8 + sw);
        ctx.stroke();
      }
    }
    ctx.fillStyle = pale;
    ctx.beginPath();
    ctx.ellipse(0, -22, 8, 11, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = dk;
    ctx.fillRect(-5, -20, 3.5, 1.6);
    ctx.fillRect(1.5, -20, 3.5, 1.6);
    ctx.fillRect(-2, -29, 4, 1.4);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -14, 15, 0.15, Math.PI - 0.15);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = 0.3 + (i * (Math.PI - 0.6)) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 15, -14 + Math.sin(a) * 15);
      ctx.lineTo(Math.cos(a) * 21, -14 + Math.sin(a) * 21);
      ctx.stroke();
    }
  } else {
    const f = e.face;
    const k = e.state === 'dash' ? Math.sin(t * 22) : 0;
    ctx.strokeStyle = '#5a554c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-f * 30, -20);
    ctx.lineTo(-f * 70, -2);
    ctx.lineTo(-f * 96, -3);
    ctx.stroke();
    ctx.strokeStyle = pale;
    ctx.lineWidth = 4;
    for (const [x, ph] of [
      [-26, 0],
      [-10, 1],
      [14, 0],
      [30, 1],
    ]) {
      const kk = ph ? k : -k;
      ctx.beginPath();
      ctx.moveTo(f * x, -26);
      ctx.lineTo(f * (x + 10 + kk * 8), -44);
      ctx.lineTo(f * (x + 18 + kk * 14), 0);
      ctx.stroke();
    }
    ctx.fillStyle = pale;
    ctx.beginPath();
    ctx.ellipse(0, -28, 38, 13, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#5a1826';
    ctx.fillRect(-f * 30 - 8, -38, 16, 20);
    ctx.fillStyle = pale;
    ctx.beginPath();
    ctx.ellipse(f * 42, -34, 9, 11, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = e.state === 'cwind' ? '#ff4020' : dk;
    ctx.fillRect(f * 44 - 2, -37, 4, 2);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f * 42, -40, 14, Math.PI + 0.2, -0.2);
    ctx.stroke();
  }
}

function drawAntlers(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#2a2018';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 3, -66);
    ctx.lineTo(s * 9, -80);
    ctx.lineTo(s * 8, -92);
    ctx.moveTo(s * 9, -80);
    ctx.lineTo(s * 17, -86);
    ctx.lineTo(s * 20, -95);
    ctx.moveTo(s * 13, -83);
    ctx.lineTo(s * 15, -74);
    ctx.stroke();
  }
}

function drawCacadorBeast(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const run = Math.abs(e.vx) > 20 ? 1 : 0;
  const sw = Math.sin(t * 14) * 0.55 * run;
  const lunge = e.state === 'pounce' || e.state === 'swing' ? 0.25 : 0;
  ctx.save();
  ctx.rotate(lunge);
  // Crimson rage aura
  const gr = ctx.createRadialGradient(0, -42, 6, 0, -42, 62);
  gr.addColorStop(0, 'rgba(210, 42, 42, 0.35)');
  gr.addColorStop(1, 'rgba(210, 42, 42, 0)');
  ctx.fillStyle = gr;
  ctx.fillRect(-62, -104, 124, 108);

  // Shredded hunter coat tail
  ctx.fillStyle = '#24181a';
  ctx.beginPath();
  ctx.moveTo(-10, -50);
  ctx.lineTo(-26, -8);
  ctx.lineTo(-14, -14);
  ctx.lineTo(-6, -4);
  ctx.lineTo(4, -22);
  ctx.closePath();
  ctx.fill();

  // Legs
  ctx.strokeStyle = '#1b1616';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 5, -28);
    ctx.lineTo(s * 6 - sw * 10 * s, -12);
    ctx.lineTo(s * 8 - sw * 14 * s, 0);
    ctx.stroke();
  }

  // Muscular hunched beast torso
  ctx.fillStyle = '#2e2524';
  ctx.strokeStyle = '#0e0c0d';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(2, -46, 17, 23, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Lupine beast head & fangs
  ctx.fillStyle = '#382c2a';
  ctx.beginPath();
  ctx.ellipse(11, -68, 12, 10, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, -72);
  ctx.lineTo(31, -67);
  ctx.lineTo(17, -61);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ears
  ctx.beginPath();
  ctx.moveTo(4, -76);
  ctx.lineTo(0, -90);
  ctx.lineTo(10, -77);
  ctx.closePath();
  ctx.fill();
  // Glowing red eye
  ctx.fillStyle = '#ff3828';
  ctx.shadowColor = '#ff3828';
  ctx.shadowBlur = 9;
  ctx.fillRect(15, -71, 4.5, 2.5);
  ctx.shadowBlur = 0;

  // Massive clawed arm + tattered sleeves
  const armAng = e.state === 'swing' && e.ph === 0 ? -2.2 : e.state === 'swing' && e.ph === 1 ? 0.9 : 0.45;
  ctx.save();
  ctx.translate(8, -54);
  ctx.rotate(armAng);
  ctx.fillStyle = '#261e1d';
  rr(ctx, -4, -5, 26, 10, 4);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#d8d0bd';
  ctx.lineWidth = 2.1;
  for (const o of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(22, o);
    ctx.lineTo(36, o + 3);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

function drawFera(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const p2 = !!e.raged || e.hp < e.maxHp * 0.5;
  ctx.save();
  if (p2) {
    const aura = ctx.createRadialGradient(0, -68, 10, 0, -68, 110);
    aura.addColorStop(0, 'rgba(246, 200, 96, 0.28)');
    aura.addColorStop(1, 'rgba(246, 200, 96, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-110, -178, 220, 190);
    // Golden prayer halo
    ctx.strokeStyle = 'rgba(246, 210, 122, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, -108, 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Tattered clerical shroud & fur cape
  ctx.fillStyle = '#cfc6b4';
  ctx.strokeStyle = '#151210';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-26, -95);
  ctx.quadraticCurveTo(-48, -42, -52, 0);
  ctx.lineTo(-32, -10);
  ctx.lineTo(-18, 0);
  ctx.lineTo(14, -12);
  ctx.lineTo(32, -88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Legs
  ctx.fillStyle = '#3a322d';
  for (const s of [-1, 1]) {
    ctx.fillRect(s * 16 - 7, -38, 14, 38);
    ctx.strokeRect(s * 16 - 7, -38, 14, 38);
  }

  // Massive beast torso
  ctx.fillStyle = '#38302c';
  ctx.beginPath();
  ctx.ellipse(0, -68, 30, 38, 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Golden pendant clutched in smaller right hand
  ctx.fillStyle = '#52463d';
  ctx.beginPath();
  ctx.ellipse(-12, -56, 8, 14, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6c86e';
  ctx.beginPath();
  ctx.arc(-8, -44, 5, 0, Math.PI * 2);
  ctx.fill();

  // Horned canine/deer clerical skull head
  ctx.fillStyle = '#d8ceb9';
  ctx.beginPath();
  ctx.ellipse(12, -104, 16, 15, 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, -108);
  ctx.lineTo(42, -98);
  ctx.lineTo(22, -92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Twisted great antlers
  ctx.strokeStyle = '#241c17';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(8 + s * 4, -116);
    ctx.lineTo(4 + s * 16, -138);
    ctx.lineTo(10 + s * 22, -154);
    ctx.moveTo(4 + s * 16, -138);
    ctx.lineTo(18 + s * 16, -144);
    ctx.stroke();
  }

  // Glowing beast eyes
  ctx.fillStyle = p2 ? '#ffd260' : '#ff4d2e';
  ctx.fillRect(21, -106, 5, 2.5);

  // Colossal asymmetrical left claw arm
  const swingAng =
    e.state === 'slam' && e.ph === 0
      ? -1.85
      : e.state === 'slam' && e.ph === 1
        ? 0.55
        : e.state === 'slash' && e.ph === 0
          ? -1.4
          : e.state === 'slash' && e.ph === 1
            ? 0.7
            : 0.25 + Math.sin(t * 2.5) * 0.08;
  ctx.save();
  ctx.translate(16, -78);
  ctx.rotate(swingAng);
  ctx.fillStyle = '#2d2522';
  ctx.strokeStyle = '#120f0d';
  ctx.lineWidth = 1.6;
  rr(ctx, -8, -9, 64, 18, 8);
  ctx.fill();
  ctx.stroke();
  // Giant pale claws
  ctx.strokeStyle = '#e8dec8';
  ctx.lineWidth = 3;
  for (const o of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(54, o);
    ctx.lineTo(74, o + 4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

function drawRom(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  ctx.save();
  if (e.state === 'blink') {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 24);
  }
  const aura = ctx.createRadialGradient(0, -34, 8, 0, -34, 96);
  aura.addColorStop(0, 'rgba(158, 215, 240, 0.28)');
  aura.addColorStop(1, 'rgba(158, 215, 240, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-96, -128, 192, 140);

  // Ten spindly chitin legs
  ctx.strokeStyle = '#232e3c';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const lx = i * 16;
    const step = Math.sin(t * 6 + i * 1.4) * 5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(lx, -28);
      ctx.lineTo(lx + side * 12, -48 + step);
      ctx.lineTo(lx + side * 22, 0);
      ctx.stroke();
    }
  }

  // Segmented soft silver-pale abdomen
  const segs = [
    [-34, -36, 18, 15],
    [-16, -40, 22, 18],
    [6, -42, 24, 20],
  ];
  for (const [sx, sy, rx, ry] of segs) {
    ctx.fillStyle = '#9aa8ba';
    ctx.strokeStyle = '#18222e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Cosmic pale spots
    ctx.fillStyle = '#dbeaff';
    ctx.beginPath();
    ctx.arc(sx, sy - 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Perforated stone-white spider head studded with glowing arcane eyes
  const hx = 34 * e.face;
  ctx.fillStyle = '#d8dfe6';
  ctx.strokeStyle = '#18222e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(hx, -40, 18, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const eyeOffsets = [
    [-6, -6],
    [0, -9],
    [6, -5],
    [-8, 1],
    [2, -1],
    [8, 2],
    [-3, 6],
  ];
  for (const [ex, ey] of eyeOffsets) {
    ctx.fillStyle = '#18222e';
    ctx.beginPath();
    ctx.arc(hx + ex, -40 + ey, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.state === 'barrage' || e.state === 'meteors' ? '#ffffff' : '#7ae8f8';
    ctx.beginPath();
    ctx.arc(hx + ex, -40 + ey, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAmigdala(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const p2 = !!e.raged || e.hp < e.maxHp * 0.5;
  ctx.save();

  // Cosmic violet aura
  const aura = ctx.createRadialGradient(0, -110, 14, 0, -110, 130);
  aura.addColorStop(0, p2 ? 'rgba(208, 120, 255, 0.34)' : 'rgba(155, 110, 220, 0.22)');
  aura.addColorStop(1, 'rgba(155, 110, 220, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-130, -240, 260, 250);

  // Towering slender legs
  ctx.strokeStyle = '#2d2638';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 12, -84);
    ctx.lineTo(s * 24, -44);
    ctx.lineTo(s * 18, 0);
    ctx.stroke();
  }

  // Ribbed hollow torso
  ctx.fillStyle = '#383044';
  ctx.strokeStyle = '#120d1a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -108, 22, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#5c4f70';
  ctx.lineWidth = 1.4;
  for (let y = -124; y <= -92; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-14, y);
    ctx.lineTo(14, y);
    ctx.stroke();
  }

  // Multiple long gangling arms (3 pairs)
  const slamPose =
    e.state === 'slam' && e.ph === 0
      ? -1.4
      : e.state === 'slam' && e.ph === 1
        ? 0.9
        : Math.sin(t * 2.8) * 0.16;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const yOff = -128 + i * 15;
    for (const s of [-1, 1]) {
      const ripped = p2 && i === 2;
      ctx.strokeStyle = ripped ? '#c98cf2' : '#4a3e59';
      ctx.lineWidth = ripped ? 3.5 : 4.5;
      ctx.beginPath();
      ctx.moveTo(s * 14, yOff);
      const reachMult = p2 ? 1.38 : 1.0;
      const ex = s * (42 + i * 14) * reachMult;
      const ey = yOff + (18 + i * 16) + slamPose * (32 + i * 8);
      ctx.quadraticCurveTo(s * 28, yOff - 10, ex, ey);
      ctx.stroke();
      ctx.fillStyle = p2 ? '#e2b5ff' : '#d8d0bd';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Perforated almond-shaped Great One skull studded with glowing eyes
  ctx.fillStyle = '#473c54';
  ctx.strokeStyle = '#120d1a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, -156, 20, 29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const pits = [
    [-7, -170],
    [6, -168],
    [-9, -158],
    [0, -154],
    [9, -157],
    [-6, -144],
    [6, -143],
  ];
  for (const [px, py] of pits) {
    ctx.fillStyle = '#120b18';
    ctx.beginPath();
    ctx.arc(px, py, 3.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.state === 'laser' ? '#ffe07a' : '#c98cf2';
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cosmic Laser beam preview / active trace from head to laserX
  if (e.state === 'laser' && e.laserX !== undefined) {
    const localTx = e.laserX - e.x;
    const localTy = 440 - e.y;
    ctx.strokeStyle = e.ph === 0 ? 'rgba(226, 181, 255, 0.4)' : 'rgba(232, 165, 255, 0.92)';
    ctx.lineWidth = e.ph === 0 ? 2 : 9;
    ctx.beginPath();
    ctx.moveTo(0, -154);
    ctx.lineTo(localTx, localTy);
    ctx.stroke();
    if (e.ph === 1) {
      ctx.strokeStyle = '#fff5d6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -154);
      ctx.lineTo(localTx, localTy);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawBruxa(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  ctx.save();
  if (e.state === 'blink') {
    ctx.globalAlpha = 0.22 + 0.16 * Math.sin(t * 28);
  }
  ctx.scale(e.face, 1);

  // Tattered hunched robe studded with eyeballs
  ctx.fillStyle = '#252126';
  ctx.strokeStyle = '#0d0c0e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.quadraticCurveTo(-30, -52, -10, -86);
  ctx.lineTo(14, -84);
  ctx.quadraticCurveTo(26, -42, 22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dozen blinking golden & crimson eyeballs across her cloak
  const eyes = [
    [-12, -20],
    [-4, -14],
    [8, -22],
    [-16, -38],
    [-2, -34],
    [10, -40],
    [-10, -56],
    [4, -52],
    [14, -62],
    [-6, -70],
    [6, -72],
    [-14, -28],
  ];
  eyes.forEach(([ex, ey], i) => {
    const blink = Math.abs(Math.sin(t * 2.5 + i * 1.1));
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 4.2, 3.2 * blink + 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.state === 'summon' || e.state === 'bind' ? '#c93434' : '#f6b040';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Hunched crone face & crooked sickle hand
  ctx.fillStyle = '#9aa09a';
  ctx.beginPath();
  ctx.ellipse(14, -88, 10, 12, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(8, -94 + i * 2);
    ctx.lineTo(-4, -82 + i * 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#d878ff';
  ctx.fillRect(18, -90, 4, 2.5);
  ctx.restore();
}

function drawMartir(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const p2 = !!e.raged || e.hp < e.maxHp * 0.5;
  ctx.save();
  ctx.scale(e.face, 1);

  if (p2) {
    const aura = ctx.createRadialGradient(0, -76, 8, 0, -76, 105);
    aura.addColorStop(0, 'rgba(220, 48, 52, 0.28)');
    aura.addColorStop(1, 'rgba(220, 48, 52, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-105, -180, 210, 185);
  }

  // Flowing royal gold & crimson cloak
  ctx.fillStyle = '#5c141c';
  ctx.strokeStyle = '#12080a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, -108);
  ctx.quadraticCurveTo(-42 - Math.sin(t * 4) * 5, -52, -34, 0);
  ctx.lineTo(18, -6);
  ctx.lineTo(14, -108);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden ecclesiastical robe
  ctx.fillStyle = '#8b6a2e';
  ctx.beginPath();
  ctx.moveTo(-11, -102);
  ctx.lineTo(11, -102);
  ctx.lineTo(16, 0);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Frost skull & jagged crown of illusions
  ctx.fillStyle = '#d8d4c8';
  ctx.beginPath();
  ctx.ellipse(2, -118, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f6d27a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -126);
  ctx.lineTo(-6, -142);
  ctx.lineTo(-1, -130);
  ctx.lineTo(3, -146);
  ctx.lineTo(7, -130);
  ctx.lineTo(11, -140);
  ctx.lineTo(11, -125);
  ctx.stroke();

  // Glowing arcane-frost eyes
  ctx.fillStyle = p2 ? '#ff4646' : '#9ed7f0';
  ctx.fillRect(4, -120, 4, 2.5);

  // Tall curved crimson scythe
  const ang =
    e.state === 'slash' && e.ph === 0
      ? -1.6
      : e.state === 'slash' && e.ph === 1
        ? 0.95
        : e.state === 'swoop'
          ? 0.5
          : 0.25 + Math.sin(t * 2.5) * 0.08;
  ctx.save();
  ctx.translate(10, -86);
  ctx.rotate(ang);
  ctx.strokeStyle = '#3a3430';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.lineTo(0, -68);
  ctx.stroke();
  // Crimson curved blade
  ctx.fillStyle = '#c42e32';
  ctx.strokeStyle = '#ffe1a8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -66);
  ctx.quadraticCurveTo(44, -76, 56, -42);
  ctx.quadraticCurveTo(34, -56, 0, -54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawRenascido(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  ctx.save();
  // Toxic/visceral green-ochre aura
  const aura = ctx.createRadialGradient(0, -72, 10, 0, -72, 128);
  aura.addColorStop(0, 'rgba(138, 184, 72, 0.26)');
  aura.addColorStop(1, 'rgba(138, 184, 72, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-128, -200, 256, 210);

  // Dozens of writhing bone legs supporting the fused corpse mountain
  ctx.strokeStyle = '#7c6b58';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    const step = Math.sin(t * 5 + i * 1.4) * 7;
    ctx.beginPath();
    ctx.moveTo(i * 15, -44);
    ctx.lineTo(i * 18 + step, 0);
    ctx.stroke();
  }

  // Towering mass of fused torsos and skulls
  ctx.fillStyle = '#4c382c';
  ctx.strokeStyle = '#17100c';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, -66, 54, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pulsing bloody core
  const pulse = 1 + 0.14 * Math.sin(t * 6);
  ctx.fillStyle = '#8e1c24';
  ctx.beginPath();
  ctx.ellipse(e.face * 6, -64, 18 * pulse, 22 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fused bone clusters / skulls
  const skulls = [
    [-30, -78, 9],
    [28, -76, 9],
    [-18, -104, 11],
    [16, -106, 11],
    [0, -132, 15],
  ];
  for (const [sx, sy, sr] of skulls) {
    ctx.fillStyle = '#cbbca6';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78c257';
    ctx.fillRect(sx - 3, sy - 2, 2.5, 2);
    ctx.fillRect(sx + 2, sy - 2, 2.5, 2);
  }

  // Massive bone clubs slamming
  const slam = e.state === 'slam' && e.ph === 1 ? 26 : Math.sin(t * 2.4) * 8;
  ctx.strokeStyle = '#8b7964';
  ctx.lineWidth = 9;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 34, -84);
    ctx.lineTo(s * 66, -32 + slam);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEbrietas(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const p2 = !!e.raged || e.hp < e.maxHp * 0.5;
  ctx.save();

  // Luminous starry cosmic aura
  const aura = ctx.createRadialGradient(0, -82, 12, 0, -82, 138);
  aura.addColorStop(0, p2 ? 'rgba(130, 224, 255, 0.34)' : 'rgba(158, 215, 240, 0.24)');
  aura.addColorStop(1, 'rgba(158, 215, 240, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-140, -220, 280, 230);

  // Translucent starry wings
  ctx.fillStyle = 'rgba(150, 200, 235, 0.26)';
  ctx.strokeStyle = 'rgba(205, 240, 255, 0.55)';
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    const fl = Math.sin(t * 4.5) * 10;
    ctx.beginPath();
    ctx.moveTo(s * 12, -92);
    ctx.quadraticCurveTo(s * 68, -162 + fl, s * 86, -84 + fl);
    ctx.quadraticCurveTo(s * 48, -58, s * 14, -74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Undulating pale tendrils
  ctx.strokeStyle = '#89a8bf';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 9, -28);
    ctx.quadraticCurveTo(i * 15 + Math.sin(t * 4 + i) * 14, -14, i * 20, 0);
    ctx.stroke();
  }

  // Pale cosmic slug body
  ctx.fillStyle = '#c3d6e5';
  ctx.strokeStyle = '#1b2b3a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -76, 30, 54, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Split floral cranium with luminous starry eyes
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#a8bed1';
    ctx.beginPath();
    ctx.ellipse(s * 13, -132, 13, 18, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#6c1626';
  ctx.beginPath();
  ctx.ellipse(0, -128, 7, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = e.state === 'beam' || e.state === 'nova' ? '#ffffff' : '#9ceeff';
  for (const [ex, ey] of [
    [-12, -136],
    [12, -136],
    [-8, -125],
    [8, -125],
  ]) {
    ctx.beginPath();
    ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cosmic Beam laser telegraph/active
  if (e.state === 'beam' && e.laserX !== undefined) {
    const localTx = e.laserX - e.x;
    const localTy = 440 - e.y;
    ctx.strokeStyle = e.ph === 0 ? 'rgba(158, 224, 255, 0.45)' : 'rgba(175, 240, 255, 0.94)';
    ctx.lineWidth = e.ph === 0 ? 2.5 : 12;
    ctx.beginPath();
    ctx.moveTo(0, -130);
    ctx.lineTo(localTx, localTy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAma(ctx: CanvasRenderingContext2D, e: Enemy) {
  const t = e.anim;
  const hover = Math.sin(t * 3.2) * 6;
  ctx.save();
  if (e.state === 'blink') {
    ctx.globalAlpha = 0.2 + 0.15 * Math.sin(t * 26);
  }
  ctx.translate(0, hover);
  ctx.scale(e.face, 1);

  // Dark blood-eclipse aura
  const aura = ctx.createRadialGradient(0, -90, 14, 0, -90, 128);
  aura.addColorStop(0, 'rgba(204, 34, 46, 0.3)');
  aura.addColorStop(1, 'rgba(204, 34, 46, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-130, -220, 260, 230);

  // Flowing black spectral shroud (hovers above ground)
  ctx.fillStyle = '#0e0c12';
  ctx.strokeStyle = '#3c2530';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-16, -132);
  ctx.lineTo(16, -132);
  ctx.quadraticCurveTo(38, -56, 30, -6);
  ctx.lineTo(14, -14);
  ctx.lineTo(0, -2);
  ctx.lineTo(-16, -14);
  ctx.lineTo(-32, -4);
  ctx.quadraticCurveTo(-40, -56, -16, -132);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Faceless black hood & golden crescent crown
  ctx.fillStyle = '#15111a';
  ctx.beginPath();
  ctx.ellipse(0, -146, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f6d27a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -166, 10, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Six armored arms holding six curved crimson blades
  const flurry = e.state === 'flurry' || e.state === 'slash';
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const baseAng = s * (0.45 + i * 0.42) + (flurry ? Math.sin(t * 24 + i * 1.3) * 0.85 : Math.sin(t * 2 + i) * 0.08);
      ctx.save();
      ctx.translate(s * 12, -118 + i * 16);
      ctx.rotate(baseAng);
      ctx.strokeStyle = '#4c4654';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 34, 6);
      ctx.stroke();
      // Curved blade
      ctx.strokeStyle = e.hp < e.maxHp * 0.5 ? '#ff544e' : '#d8dfe6';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(s * 32, 6);
      ctx.quadraticCurveTo(s * 54, -8, s * 64, 14);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function enemyArm(e: Enemy, d: EnemyTypeDef) {
  if (e.type === 'rei') {
    if (e.state === 'swing')
      return e.ph === 0
        ? lerp(0.9, -2.3, Math.min(1, e.t / e.dur))
        : e.ph === 1
          ? lerp(-2.3, 1.1, Math.min(1, e.t / 0.18))
          : 1.1;
    if (e.state === 'slam') return e.ph < 2 ? -2.3 : 1.2;
    if (e.state === 'toll' || e.state === 'reveal') return -1.7 + Math.sin(e.anim * 30) * 0.08;
    return 0.9;
  }
  if (e.type === 'cacador') {
    if (e.state === 'swing')
      return e.ph === 0
        ? lerp(0.9, -2.2, Math.min(1, e.t / (e.dur || 0.35)))
        : e.ph === 1
          ? lerp(-2.2, 1.1, Math.min(1, e.t / 0.18))
          : 1.1;
    if (e.state === 'shoot') return 0.15;
    if (e.state === 'pounce') return -1.8;
    return 0.85;
  }
  if (e.type === 'atirador') {
    if (e.state === 'wind') return 0.45;
    if (e.state === 'rec') return 0.25;
    return 0.65;
  }
  if (e.state === 'wind' && d.wind) return lerp(0.9, -2.3, clamp(1 - e.t / d.wind, 0, 1));
  if (e.state === 'act' && d.act) return lerp(-2.3, 1.1, clamp(1 - e.t / d.act, 0, 1));
  if (e.state === 'rec') return e.type === 'carrasco' ? 1.3 : 1.1;
  if (e.state === 'sew') return 0.2;
  return undefined;
}

export interface RenderState {
  time: number;
  cam: number;
  shake: number;
  redFlash: number;
  impactFlash?: number;
  arena: number;
  mode: GameMode;
  reduceMotion: boolean;
  isTouch: boolean;
  look: PlayerLook;
  S: SaveStats;
  P: Player;
  drop: DropPool | null;
  chests: LootChest[];
  breakables: Breakable[];
  enemies: Enemy[];
  shots: Shot[];
  marks: Mark[];
  traps: Trap[];
  clouds: Cloud[];
  debris: Debris[];
  meteors: Meteor[];
  walls: { l: number; r: number; tl: number; tr: number; life: number } | null;
  parts: Particle[];
  rollGhosts: RollGhost[];
  banner: { text: string; sub: string; t: number; dur: number; col: string } | null;
  nearBrazierIdx: number;
  nearChestIdx: number;
  nearLoreIdx: number;
  nearFog: boolean;
  nearNpc?: NpcDef | null;
  npcs?: { def: NpcDef; status: QuestStatus; ready?: boolean }[];
  zoneTrans?: ZoneTransition | null;
  passage?: {t:number;label:string}|null;
  maxHp: number;
  maxSt: number;
  maxFlasks: number;
  gateX0: number | null;
}

const ZONE_THEMES = [
  // 0: Velmora
  {
    sky0: '#070b0f',
    sky1: '#17252a',
    sky2: '#3a332c',
    moon: '#ddd8c2',
    moonGlow: 'rgba(226,222,200,.5)',
    far: '#111a1f',
    mid: '#0b1114',
    fog: 'rgba(90,104,100,.3)',
    groundTop: '#2a2e30',
    groundBot: '#08090a',
    curb: '#4a5050',
    moteCol: 'rgba(205,200,185,.3)',
  },
  // 1: Catedral Submersa
  {
    sky0: '#040a0e',
    sky1: '#0d2229',
    sky2: '#1a3634',
    moon: '#bfe8dc',
    moonGlow: 'rgba(136,216,196,.46)',
    far: '#0b1a20',
    mid: '#071217',
    fog: 'rgba(72,126,120,.28)',
    groundTop: '#243133',
    groundBot: '#060a0b',
    curb: '#4f6d6c',
    moteCol: 'rgba(140,224,195,.36)',
  },
  // 2: Salão da Coroa Velada
  {
    sky0: '#120508',
    sky1: '#2e0f17',
    sky2: '#4d2117',
    moon: '#d64538',
    moonGlow: 'rgba(224,78,52,.52)',
    far: '#1c0c12',
    mid: '#12070b',
    fog: 'rgba(128,48,38,.3)',
    groundTop: '#2d2326',
    groundBot: '#090608',
    curb: '#7a5c3c',
    moteCol: 'rgba(246,160,92,.38)',
  },
  // 3: Lago da Névoa Vazia
  {
    sky0: '#050914',
    sky1: '#10203a',
    sky2: '#1c354f',
    moon: '#e6f4ff',
    moonGlow: 'rgba(170,220,255,.58)',
    far: '#0c172b',
    mid: '#081020',
    fog: 'rgba(110,165,210,.28)',
    groundTop: '#243447',
    groundBot: '#070b12',
    curb: '#6e95b5',
    moteCol: 'rgba(195,232,255,.42)',
  },
  // 4: Altar do Pesadelo Astral
  {
    sky0: '#090412',
    sky1: '#210c34',
    sky2: '#3b1742',
    moon: '#dcb8ff',
    moonGlow: 'rgba(196,120,255,.56)',
    far: '#160a24',
    mid: '#0e0618',
    fog: 'rgba(148,74,195,.3)',
    groundTop: '#2d2238',
    groundBot: '#08050d',
    curb: '#986eb8',
    moteCol: 'rgba(220,165,255,.44)',
  },
  // 5: Bosque dos Enforcados
  {
    sky0: '#060c07',
    sky1: '#132418',
    sky2: '#233422',
    moon: '#d2dfb8',
    moonGlow: 'rgba(168,195,125,.42)',
    far: '#0e1911',
    mid: '#08110a',
    fog: 'rgba(92,126,82,.32)',
    groundTop: '#232e22',
    groundBot: '#070b07',
    curb: '#5c6b4b',
    moteCol: 'rgba(176,208,136,.38)',
  },
  // 6: Castelo de Cainhurst
  {
    sky0: '#080d16',
    sky1: '#182438',
    sky2: '#2c3d54',
    moon: '#edf5ff',
    moonGlow: 'rgba(195,222,255,.54)',
    far: '#121b2b',
    mid: '#0b111c',
    fog: 'rgba(155,186,218,.32)',
    groundTop: '#313d4d',
    groundBot: '#0a0f17',
    curb: '#a6bccc',
    moteCol: 'rgba(235,244,255,.55)',
  },
  // 7: Ossuário de Yahar'gul
  {
    sky0: '#0b0812',
    sky1: '#1e1632',
    sky2: '#322246',
    moon: '#9ed7f0',
    moonGlow: 'rgba(110,196,255,.55)',
    far: '#141022',
    mid: '#0c0916',
    fog: 'rgba(104,132,190,.3)',
    groundTop: '#272638',
    groundBot: '#07070d',
    curb: '#6d7ea8',
    moteCol: 'rgba(145,222,255,.48)',
  },
  // 8: Câmara do Coro Celeste
  {
    sky0: '#050814',
    sky1: '#101d3b',
    sky2: '#223359',
    moon: '#fff2c8',
    moonGlow: 'rgba(246,220,150,.6)',
    far: '#0b142c',
    mid: '#070e20',
    fog: 'rgba(130,178,225,.3)',
    groundTop: '#24304a',
    groundBot: '#060a14',
    curb: '#c9b37a',
    moteCol: 'rgba(255,232,165,.52)',
  },
  // 9: Sótão de Mergo · Lua Vermelha
  {
    sky0: '#140206',
    sky1: '#3a0812',
    sky2: '#5c1218',
    moon: '#e83434',
    moonGlow: 'rgba(235,48,48,.72)',
    far: '#1e060c',
    mid: '#120307',
    fog: 'rgba(182,36,42,.36)',
    groundTop: '#331b20',
    groundBot: '#0a0305',
    curb: '#a84444',
    moteCol: 'rgba(255,104,96,.48)',
  },
];

let vignette: CanvasGradient | null = null;

function drawLayer(
  ctx: CanvasRenderingContext2D,
  arr: BuildingLayerItem[],
  f: number,
  base: number,
  col: string,
  cam: number,
  zone = 0
) {
  const period = 2400;
  const off = (cam * f) % period;
  for (const b of arr) {
    let x = b.x - off;
    if (x < -220) x += period;
    if (x > W + 20) continue;
    const top = base - b.h;
    ctx.fillStyle = col;
    ctx.fillRect(x, top, b.w, b.h + 200);
    if (zone === 1) {
      // Cathedral pointed lancet arches & gothic spires
      ctx.beginPath();
      ctx.moveTo(x + b.w * 0.1, top);
      ctx.quadraticCurveTo(x + b.w * 0.5, top - b.w * 0.85, x + b.w * 0.9, top);
      ctx.fill();
      if (b.wins) {
        for (const [u, v, lit] of b.wins) {
          ctx.fillStyle = lit ? 'rgba(110,210,190,.42)' : 'rgba(0,0,0,.4)';
          const wx = x + b.w * (0.2 + 0.58 * u);
          const wy = top + 24 + v * (b.h - 75);
          ctx.fillRect(wx, wy, 4, 15);
          ctx.beginPath();
          ctx.arc(wx + 2, wy, 2, Math.PI, 0);
          ctx.fill();
        }
      }
    } else if (zone === 2) {
      // Royal veiled crown spires & tattered crimson banners
      ctx.beginPath();
      ctx.moveTo(x + b.w * 0.08, top);
      ctx.lineTo(x + b.w * 0.5, top - b.w * 1.35);
      ctx.lineTo(x + b.w * 0.92, top);
      ctx.fill();
      if (b.sp) {
        ctx.fillStyle = 'rgba(140,26,34,0.45)';
        ctx.fillRect(x + b.w * 0.45, top + 12, 5, 28);
      }
      if (b.wins) {
        for (const [u, v, lit] of b.wins) {
          ctx.fillStyle = lit ? 'rgba(232,102,62,.65)' : 'rgba(0,0,0,.4)';
          ctx.fillRect(x + b.w * (0.18 + 0.6 * u), top + 22 + v * (b.h - 70), 5, 11);
        }
      }
    } else {
      if (b.sp) {
        ctx.beginPath();
        ctx.moveTo(x + b.w * 0.15, top);
        ctx.lineTo(x + b.w * 0.5, top - b.w * 1.15);
        ctx.lineTo(x + b.w * 0.85, top);
        ctx.fill();
      } else {
        for (let i = 0; i < 3; i++) ctx.fillRect(x + (i * b.w) / 3, top - 8, b.w / 6, 8);
      }
      if (b.wins) {
        for (const [u, v, lit] of b.wins) {
          ctx.fillStyle = lit ? 'rgba(224,150,70,.75)' : 'rgba(0,0,0,.35)';
          ctx.fillRect(x + b.w * (0.18 + 0.6 * u), top + 22 + v * (b.h - 70), 5, 10);
        }
      }
    }
  }
}

function drawDecor(ctx: CanvasRenderingContext2D, d: DecorItem, time: number) {
  ctx.save();
  ctx.translate(d.x, d.y);
  if (d.type === 'tree' && d.segs) {
    ctx.strokeStyle = '#0c0f11';
    ctx.lineCap = 'round';
    for (const s of d.segs) {
      ctx.lineWidth = s[4];
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      ctx.lineTo(s[2], s[3]);
      ctx.stroke();
    }
  } else if (d.type === 'grave') {
    ctx.fillStyle = '#23292c';
    if (d.v < 0.5) {
      rr(ctx, -9, -26, 18, 28, [8, 8, 0, 0]);
      ctx.fill();
    } else {
      ctx.fillRect(-3, -34, 6, 36);
      ctx.fillRect(-11, -25, 22, 6);
    }
  } else if (d.type === 'fence') {
    ctx.fillStyle = '#0c0f11';
    ctx.fillRect(-40, -22, 80, 2);
    ctx.fillRect(-40, -8, 80, 2);
    for (let i = -40; i <= 40; i += 10) {
      ctx.fillRect(i - 1, -30, 2, 30);
      ctx.beginPath();
      ctx.moveTo(i - 3, -30);
      ctx.lineTo(i, -37);
      ctx.lineTo(i + 3, -30);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#0c0f11';
    ctx.fillRect(-2, -96, 4, 96);
    ctx.fillRect(-2, -96, 16, 3);
    ctx.fillRect(8, -94, 9, 13);
    const a = 0.5 + 0.2 * Math.sin(time * 5 + d.v * 40);
    const lg = ctx.createRadialGradient(12, -87, 1, 12, -87, 46);
    lg.addColorStop(0, `rgba(230,160,80,${a})`);
    lg.addColorStop(1, 'rgba(230,160,80,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-36, -135, 96, 96);
  }
  ctx.restore();
}

export function renderScene(ctx: CanvasRenderingContext2D, rs: number, st: RenderState, dt: number) {
  const { time, cam, shake, redFlash, impactFlash = 0, arena, mode, reduceMotion, isTouch, look, S, P, drop, enemies } = st;
  ctx.setTransform(rs, 0, 0, rs, 0, 0);

  // Smooth Zone Theme Crossfade across all 10 regions
  const cx = cam + W * 0.5;
  const zRaw = clamp(cx / ZONE, 0, NZ - 0.01);
  const zIdx = Math.floor(zRaw);
  const zFrac = clamp((cx - zIdx * ZONE - (ZONE - 600)) / 600, 0, 1);
  const zNext = Math.min(NZ - 1, zIdx + 1);
  const tA = ZONE_THEMES[Math.min(NZ - 1, zIdx)];
  const tB = ZONE_THEMES[zNext];
  const blend = zIdx === zNext ? 0 : zFrac;

  // Sky & Moon / Blood Eclipse / Astral Rift / Red Moon
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, lerpHex(tA.sky0, tB.sky0, blend));
  g.addColorStop(0.55, lerpHex(tA.sky1, tB.sky1, blend));
  g.addColorStop(1, lerpHex(tA.sky2, tB.sky2, blend));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Subtle distant lightning in Zone 0 & Yahar'gul (Zone 7)
  if ((zIdx === 0 || zIdx === 7) && !reduceMotion && Math.sin(time * (zIdx === 7 ? 1.3 : 0.7)) > 0.94 && Math.sin(time * 29) > 0.1) {
    ctx.fillStyle = zIdx === 7 ? 'rgba(145, 222, 255, 0.2)' : 'rgba(210, 224, 240, 0.12)';
    ctx.fillRect(0, 0, W, H);
  }

  // Stars in astral zones (3, 4, 8, 9)
  if (zIdx === 3 || zIdx === 4 || zIdx >= 8) {
    ctx.fillStyle = zIdx === 9 ? 'rgba(255,140,140,0.48)' : zIdx === 8 ? 'rgba(255,240,185,0.55)' : zIdx === 4 ? 'rgba(232,190,255,0.45)' : 'rgba(215,238,255,0.45)';
    for (let i = 0; i < 38; i++) {
      const sx2 = (i * 193.7) % W;
      const sy2 = (i * 61.3) % 240;
      const tw2 = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i));
      ctx.globalAlpha = tw2 * 0.65;
      ctx.fillRect(sx2, sy2, i % 4 === 0 ? 2 : 1.3, i % 4 === 0 ? 2 : 1.3);
    }
    ctx.globalAlpha = 1;
  }

  const mx = 700 - cam * 0.02;
  const mg = ctx.createRadialGradient(mx, 120, 10, mx, 120, zIdx === 9 ? 340 : zIdx >= 3 ? 280 : 240);
  mg.addColorStop(0, blend > 0.5 ? tB.moonGlow : tA.moonGlow);
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, W, H);

  // Astral cosmic rift spiral in Zone 4 & Zone 8
  if (zIdx === 4 || zIdx === 8) {
    ctx.save();
    ctx.translate(mx, 120);
    ctx.rotate(time * 0.18);
    ctx.strokeStyle = zIdx === 8 ? 'rgba(246, 220, 145, 0.28)' : 'rgba(210, 145, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 118, 44, 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(158, 224, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 92, 32, -0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = lerpHex(tA.moon, tB.moon, blend);
  ctx.beginPath();
  ctx.arc(mx, 120, zIdx === 9 ? 94 : zIdx === 2 ? 70 : zIdx === 3 ? 78 : 62, 0, 7);
  ctx.fill();
  if (zIdx === 1 || zIdx === 6) {
    ctx.strokeStyle = zIdx === 6 ? 'rgba(215,235,255,0.28)' : 'rgba(180,235,215,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, 120, 82, 0, 7);
    ctx.stroke();
  } else if (zIdx === 2) {
    ctx.fillStyle = '#120508';
    ctx.beginPath();
    ctx.arc(mx, 120, 56, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#f6b040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, 120, 69, 0, 7);
    ctx.stroke();
  } else if (zIdx === 3 || zIdx === 8) {
    ctx.strokeStyle = zIdx === 8 ? 'rgba(255,232,160,0.34)' : 'rgba(200,234,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, 120, 96, 0, 7);
    ctx.stroke();
  } else if (zIdx === 4) {
    ctx.fillStyle = 'rgba(72, 22, 110, 0.45)';
    ctx.beginPath();
    ctx.arc(mx - 12, 112, 20, 0, 7);
    ctx.fill();
  } else if (zIdx === 9) {
    // Paleblood crimson moon craters
    ctx.fillStyle = 'rgba(105, 14, 22, 0.42)';
    ctx.beginPath();
    ctx.arc(mx - 24, 102, 22, 0, 7);
    ctx.arc(mx + 26, 138, 16, 0, 7);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(120,116,100,.35)';
    ctx.beginPath();
    ctx.arc(mx - 18, 104, 13, 0, 7);
    ctx.arc(mx + 22, 138, 9, 0, 7);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(10,14,18,.5)';
  for (let i = 0; i < 5; i++) {
    const x = (((i * 260 + time * (6 + i * 2) - cam * 0.03) % (W + 400)) + W + 400) % (W + 400) - 200;
    ctx.beginPath();
    ctx.ellipse(x, 90 + i * 34, 150, 13, 0, 0, 7);
    ctx.fill();
  }
  drawLayer(ctx, farLayer, 0.12, 400, lerpHex(tA.far, tB.far, blend), cam, zIdx);
  ctx.fillStyle =
    zIdx === 1
      ? 'rgba(40,90,88,.18)'
      : zIdx === 2 || zIdx === 9
        ? 'rgba(120,28,28,.18)'
        : zIdx === 3 || zIdx === 6
          ? 'rgba(55,95,135,.18)'
          : zIdx === 4 || zIdx === 7
            ? 'rgba(100,48,145,.18)'
            : zIdx === 5
              ? 'rgba(48,88,48,.18)'
              : 'rgba(70,90,92,.16)';
  ctx.fillRect(0, 250, W, 200);
  drawLayer(ctx, midLayer, 0.38, 440, lerpHex(tA.mid, tB.mid, blend), cam, zIdx);

  // Zone 1 Cathedral / Zone 8 Celestial Choir god rays
  if (zIdx === 1 || zIdx === 8) {
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const rx = ((i * 280 - cam * 0.15) % (W + 280) + W + 280) % (W + 280) - 140;
      const rg = ctx.createLinearGradient(rx, 0, rx + 120, 440);
      rg.addColorStop(0, zIdx === 8 ? 'rgba(246, 224, 150, 0.11)' : 'rgba(142, 232, 208, 0.09)');
      rg.addColorStop(1, 'rgba(142, 232, 208, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 65, 0);
      ctx.lineTo(rx + 185, 440);
      ctx.lineTo(rx + 85, 440);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Hanging iron cages in Zone 4 & Zone 7
  if (zIdx === 4 || zIdx === 7) {
    ctx.strokeStyle = 'rgba(28, 16, 40, 0.8)';
    ctx.fillStyle = 'rgba(20, 11, 30, 0.85)';
    for (let i = 0; i < 4; i++) {
      const kx = (((i * 270 - cam * 0.25) % (W + 240)) + W + 240) % (W + 240) - 120;
      const swing = Math.sin(time * 1.4 + i) * 6;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(kx, 0);
      ctx.lineTo(kx + swing, 120 + (i % 2) * 35);
      ctx.stroke();
      const cy = 120 + (i % 2) * 35;
      ctx.strokeRect(kx + swing - 11, cy, 22, 28);
      ctx.fillRect(kx + swing - 4, cy + 7, 8, 14);
    }
  }

  const fg = ctx.createLinearGradient(0, 300, 0, 470);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, blend > 0.5 ? tB.fog : tA.fog);
  ctx.fillStyle = fg;
  ctx.fillRect(0, 300, W, 170);

  // Drifting low-lying ground mist layer
  ctx.fillStyle =
    zIdx === 2 || zIdx === 9
      ? 'rgba(140,42,35,0.12)'
      : zIdx === 3 || zIdx === 6
        ? 'rgba(165,210,248,0.12)'
        : 'rgba(165,180,175,0.08)';
  for (let i = 0; i < 6; i++) {
    const mx2 = (((i * 220 + time * 18 - cam * 0.45) % (W + 300)) + W + 300) % (W + 300) - 150;
    ctx.beginPath();
    ctx.ellipse(mx2, 434 + (i % 2) * 14, 140, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDepthBack(ctx, cam, time, zIdx, reduceMotion);

  // World space
  ctx.save();
  const sx = reduceMotion ? 0 : rnd(-shake, shake);
  const sy = reduceMotion ? 0 : rnd(-shake, shake);
  ctx.translate(Math.round(-cam + sx), Math.round(sy));

  for (const d of decorItems) {
    if (d.x > cam - 120 && d.x < cam + W + 120) drawDecor(ctx, d, time);
  }

  drawUnderground(ctx, cam, time);
  drawAtmosphere(ctx,cam,time,zIdx,reduceMotion);

  // Ground
  const gTop = lerpHex(tA.groundTop, tB.groundTop, blend);
  const gBot = lerpHex(tA.groundBot, tB.groundBot, blend);
  const gCurb = lerpHex(tA.curb, tB.curb, blend);
  for (const s of SOL) {
    if (s.x + s.w < cam - 20 || s.x > cam + W + 20) continue;
    const gr = ctx.createLinearGradient(0, s.y, 0, s.y + 130);
    gr.addColorStop(0, gTop);
    gr.addColorStop(1, gBot);
    ctx.fillStyle = gr;
    ctx.fillRect(s.x, s.y, s.w, H - s.y + 60);
    ctx.fillStyle = gCurb;
    ctx.fillRect(s.x, s.y, s.w, 3);
    // Flooded cathedral shallow water / Empty Lake silver reflection
    if (zIdx === 1 || zIdx === 3) {
      ctx.fillStyle =
        zIdx === 3
          ? `rgba(145, 205, 250, ${0.15 + 0.05 * Math.sin(time * 2.2 + s.x * 0.01)})`
          : `rgba(92, 186, 172, ${0.11 + 0.04 * Math.sin(time * 2.5 + s.x * 0.01)})`;
      ctx.fillRect(s.x, s.y + 4, s.w, zIdx === 3 ? 16 : 12);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 1;
    const x0 = Math.max(s.x, Math.floor((cam - 30) / 22) * 22);
    const x1 = Math.min(s.x + s.w - 8, cam + W + 30);
    for (let x = x0; x < x1; x += 22) {
      if (x < s.x + 4) continue;
      const o = (x * 7) % 11;
      ctx.beginPath();
      ctx.arc(x + o, s.y + 13, 9, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 11 - o, s.y + 29, 9, Math.PI, 0);
      ctx.stroke();
    }
  }
  for (const p of PLAT) {
    ctx.fillStyle = zIdx === 2 ? '#291e21' : '#22282b';
    ctx.fillRect(p.x, p.y, p.w, 12);
    ctx.fillStyle = gCurb;
    ctx.fillRect(p.x, p.y, p.w, 2);
    ctx.fillStyle = '#14181a';
    ctx.fillRect(p.x + 8, p.y + 12, 5, 16);
    ctx.fillRect(p.x + p.w - 13, p.y + 12, 5, 16);
  }

  drawDepthFloor(ctx, cam, zIdx, enemies, P);
  drawRoutes(ctx, cam, P, S, time);
  drawRuins(ctx, cam, st.breakables, S, time);
  drawPuzzleWorld(ctx, cam, S, time);

  // Braziers
  BRAZ.forEach((b, i) => {
    const lit = S.lit[i];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = '#1a1d1f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(0, -22);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = '#24282b';
    ctx.beginPath();
    ctx.moveTo(-15, -34);
    ctx.lineTo(15, -34);
    ctx.lineTo(9, -22);
    ctx.lineTo(-9, -22);
    ctx.fill();
    if (lit) {
      const gl = ctx.createRadialGradient(0, -44, 2, 0, -44, 90);
      gl.addColorStop(0, 'rgba(232,140,60,.45)');
      gl.addColorStop(1, 'rgba(232,140,60,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(-90, -134, 180, 180);
      for (let j = 0; j < 3; j++) {
        const hgt = 20 + Math.sin(time * 9 + j * 2.1) * 6 - j * 4;
        ctx.fillStyle = ['#c44a1a', '#e8862c', '#f6d27a'][j];
        ctx.beginPath();
        ctx.moveTo(-11 + j * 3, -34);
        ctx.quadraticCurveTo(Math.sin(time * 6 + j) * 4, -34 - hgt * 1.7, 11 - j * 3, -34);
        ctx.fill();
      }
      if (Math.random() < 0.2) {
        st.parts.push({
          x: b.x + rnd(-8, 8),
          y: b.y - 44,
          vx: rnd(-12, 12),
          vy: rnd(-70, -30),
          life: 1.1,
          max: 1.1,
          col: '#f0a050',
          grav: -30,
          size: 1.6,
        });
      }
    } else {
      ctx.fillStyle = '#3a2a22';
      ctx.fillRect(-9, -37, 18, 3);
    }
    ctx.restore();
  });

  // Shards
  SHARDS.forEach((s, i) => {
    if (S.got.includes(i)) return;
    const y = s.y - 24 + Math.sin(time * 3 + i) * 4;
    ctx.fillStyle = 'rgba(160,215,255,.25)';
    ctx.beginPath();
    ctx.arc(s.x, y, 13, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#cfeaff';
    ctx.beginPath();
    ctx.moveTo(s.x, y - 8);
    ctx.lineTo(s.x + 5, y);
    ctx.lineTo(s.x, y + 8);
    ctx.lineTo(s.x - 5, y);
    ctx.fill();
  });

  // Lore Obelisks (Crônicas de Velmora)
  for (const ls of LORE_STONES) {
    if (ls.x < cam - 100 || ls.x > cam + W + 100) continue;
    const read = S.unlockedLore.includes(ls.loreId);
    ctx.save();
    ctx.translate(ls.x, ls.y);
    ctx.fillStyle = '#20262b';
    ctx.strokeStyle = '#0d1014';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-10, -52);
    ctx.lineTo(0, -64);
    ctx.lineTo(10, -52);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engraved rune strip
    ctx.strokeStyle = read ? 'rgba(140, 175, 195, 0.4)' : `rgba(158, 224, 250, ${0.55 + 0.35 * Math.sin(time * 4)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(0, -14);
    ctx.moveTo(-4, -36);
    ctx.lineTo(4, -36);
    ctx.moveTo(-4, -26);
    ctx.lineTo(4, -26);
    ctx.stroke();

    if (!read) {
      const aura = ctx.createRadialGradient(0, -40, 2, 0, -40, 34);
      aura.addColorStop(0, 'rgba(158, 215, 240, 0.34)');
      aura.addColorStop(1, 'rgba(158, 215, 240, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(-34, -74, 68, 70);
    }
    ctx.restore();
  }

  // Relic Chests (Weapons, Armors & Shields)
  for (const c of st.chests) {
    if (c.x < cam - 120 || c.x > cam + W + 120) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (!c.opened) {
      const pulse = 0.28 + 0.14 * Math.sin(time * 3.4);
      const beamCol =
        c.kind === 'rune'
          ? '216,120,255'
          : c.kind === 'armor'
            ? '158,215,240'
            : c.kind === 'shield'
              ? '185,205,155'
              : '246,195,96';
      const glow = ctx.createRadialGradient(0, -18, 2, 0, -18, 42);
      glow.addColorStop(0, `rgba(${beamCol},${pulse})`);
      glow.addColorStop(1, `rgba(${beamCol},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(-42, -60, 84, 72);
    }
    // Iron-bound Victorian chest body
    ctx.fillStyle = '#241c17';
    ctx.strokeStyle = '#0e0c0a';
    ctx.lineWidth = 1.4;
    rr(ctx, -15, -18, 30, 18, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.kind === 'rune' ? '#b078d8' : '#a88446';
    ctx.fillRect(-15, -13, 30, 2);
    ctx.fillRect(-9, -18, 2.5, 18);
    ctx.fillRect(6.5, -18, 2.5, 18);
    if (c.opened) {
      ctx.fillStyle = '#17110d';
      ctx.fillRect(-14, -24, 28, 7);
      ctx.strokeRect(-14, -24, 28, 7);
    } else {
      ctx.fillStyle = '#362920';
      rr(ctx, -16, -25, 32, 9, [4, 4, 1, 1]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.kind === 'rune' ? '#d878ff' : '#f6c86e';
      ctx.fillRect(-2.5, -19, 5, 6);
    }
    ctx.restore();
  }

  // Dropped ashes
  if (drop) {
    const y = drop.y - 22;
    const r = 14 + Math.sin(time * 4) * 3;
    const gr = ctx.createRadialGradient(drop.x, y, 1, drop.x, y, r * 2.4);
    gr.addColorStop(0, 'rgba(155,224,192,.9)');
    gr.addColorStop(1, 'rgba(155,224,192,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(drop.x - 40, y - 40, 80, 80);
  }

  // Friendly / Quest NPCs
  if (st.npcs && st.npcs.length > 0) {
    drawNpcs(ctx, st.npcs, st.nearNpc?.id || null, time);
  }

  // Enemies (with Ambush spawn effects)
  for (const e of enemies) {
    if (e.pending) continue;
    if (e.x <= cam - 200 || e.x >= cam + W + 200) continue;
    const d = ET[e.type];
    const sc = d.scale || 1;
    const dl = e.boss ? 1.4 : 0.7;

    const spawning = (e.spawnTime || 0) > 0;
    const spTotal = e.spawnTotal || (e.spawnMode === 'sky' ? 1.25 : 1.0);
    const spProg = spawning ? 1 - (e.spawnTime || 0) / spTotal : 1;
    const groundY = e.y;

    ctx.save();
    if (spawning) {
      if (e.spawnMode === 'sky') {
        const dropY = groundY - (1 - spProg * spProg) * 520;
        const gr = ctx.createRadialGradient(e.x, dropY - 35, 4, e.x, dropY - 35, 70);
        gr.addColorStop(0, 'rgba(160, 225, 244, 0.32)');
        gr.addColorStop(1, 'rgba(160, 225, 244, 0)');
        ctx.fillStyle = gr;
        ctx.fillRect(e.x - 70, dropY - 105, 140, 140);
        ctx.strokeStyle = 'rgba(158, 215, 240, 0.35)';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(e.x + i * 6 - 12, dropY - 60);
          ctx.lineTo(e.x + i * 6 - 24, dropY - 150);
          ctx.stroke();
        }
        ctx.translate(e.x, dropY);
      } else {
        ctx.beginPath();
        ctx.rect(e.x - 100, 0, 200, groundY);
        ctx.clip();
        ctx.translate(e.x, groundY + (1 - spProg) * 92);
      }
    } else {
      ctx.translate(e.x, e.y);
    }

    if (e.dead) ctx.globalAlpha = clamp(e.t / dl, 0, 1);
    if (e.flash > 0) ctx.filter = 'brightness(2.4)';
    if (e.type === 'madre') drawMadre(ctx, e);
    else if (e.type === 'santo') drawSanto(ctx, e);
    else if (e.type === 'viuva') drawViuva(ctx, e);
    else if (e.type === 'fera') {
      ctx.scale(e.face, 1);
      if (e.dead) ctx.rotate(-(1 - e.t / dl) * 1.2);
      drawFera(ctx, e);
    } else if (e.type === 'rom') {
      drawRom(ctx, e);
    } else if (e.type === 'amigdala') {
      drawAmigdala(ctx, e);
    } else if (e.type === 'bruxa') {
      drawBruxa(ctx, e);
    } else if (e.type === 'martir') {
      drawMartir(ctx, e);
    } else if (e.type === 'renascido') {
      drawRenascido(ctx, e);
    } else if (e.type === 'ebrietas') {
      drawEbrietas(ctx, e);
    } else if (e.type === 'ama') {
      drawAma(ctx, e);
    } else {
      ctx.scale(e.face * sc, sc);
      if (e.dead) ctx.rotate(-(1 - e.t / dl) * 1.3);
      if (e.type === 'cao') drawHound(ctx, e);
      else if (e.type === 'gargula') drawGargula(ctx, e);
      else if (e.type === 'lobisomem') drawLobisomem(ctx, e);
      else if (e.type === 'emissario') drawEmissario(ctx, e);
      else if (e.type === 'besta_eletrica') drawBestaEletrica(ctx, e);
      else if (e.type === 'cacador' && e.raged) drawCacadorBeast(ctx, e);
      else {
        const rei = e.type === 'rei';
        const L = rei ? REI_LOOKS[e.mask] : LOOKS[e.type];
        const arm = enemyArm(e, d);
        const sw = rei ? e.state === 'swing' && e.ph === 1 : e.type === 'cacador' ? e.state === 'swing' && e.ph === 1 : e.state === 'act';
        if (rei) drawAntlers(ctx);
        if (e.type === 'sombra' && !e.dead) {
          const sa = ctx.createRadialGradient(0, -40, 4, 0, -40, 34);
          sa.addColorStop(0, 'rgba(255, 110, 40, 0.34)');
          sa.addColorStop(1, 'rgba(255, 110, 40, 0)');
          ctx.fillStyle = sa;
          ctx.fillRect(-34, -74, 68, 68);
        } else if (e.type === 'monge_gaiola' && !e.dead) {
          ctx.strokeStyle = 'rgba(158, 224, 255, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, -58, 13 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (e.type === 'atirador' && e.state === 'wind' && !e.dead) {
          ctx.save();
          ctx.strokeStyle = 'rgba(232,68,54,0.65)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(26, -42);
          ctx.lineTo(280, -42);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        drawHumanoid(ctx, L, {
          t: e.anim,
          run: Math.abs(e.vx) > 10 && e.onGround ? 1 : 0,
          air: !e.onGround,
          arm,
          arm2: e.state === 'ring' ? -1.6 + Math.sin(e.anim * 40) * 0.25 : undefined,
          weapon: d.weapon,
          glow: e.state === 'wind' || rei || e.type === 'cacador' || e.type === 'sombra',
          sway: -Math.abs(e.vx) / 300,
          lean: rei && e.mask === 1 ? 0.18 : e.state === 'sew' ? 0.25 : 0,
          trail: sw && arm !== undefined ? [-2.3, arm] : null,
        });
        if (e.type === 'sentinela' && e.guarding && !e.dead) {
          drawShield(ctx, { coat: '#38322e', trim: '#b08a3c', shield: 3 }, 13, -38, 1.32);
        }
      }
    }
    ctx.restore();

    if (spawning) {
      ctx.fillStyle = 'rgba(154, 217, 230, 0.42)';
      ctx.beginPath();
      ctx.ellipse(e.x, groundY - 2, 26 + spProg * 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a6cbd0';
      ctx.lineWidth = 1.6;
      for (let j = -2; j <= 2; j++) {
        const cx = e.x + j * 14;
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.lineTo(cx + 8, groundY + 6);
        ctx.lineTo(cx + 2, groundY + 13);
        ctx.stroke();
      }
      continue;
    }

    if (e.shown > 0 && !e.dead && !e.boss) {
      const w = e.maxHp > 150 ? 60 : 40;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(e.x - w / 2, e.y - e.h - 16, w, 4);
      ctx.fillStyle = e.vuln ? '#d9772f' : '#a02a2a';
      ctx.fillRect(e.x - w / 2, e.y - e.h - 16, (w * Math.max(0, e.hp)) / e.maxHp, 4);
    }
    if (!e.dead && e.statuses.length > 0) {
      const stag = e.statuses.find((s) => s.id === 'stagger');
      if (stag) {
        ctx.save();
        ctx.strokeStyle = '#f6d27a';
        ctx.lineWidth = 1.6;
        const hy = e.y - e.h - 24;
        ctx.beginPath();
        ctx.ellipse(e.x, hy, 12, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const a = time * 6 + (i * Math.PI * 2) / 3;
          ctx.fillStyle = '#f6d27a';
          ctx.fillRect(e.x + Math.cos(a) * 12 - 1.5, hy + Math.sin(a) * 4 - 1.5, 3, 3);
        }
        ctx.font = `11px ${FONT_D}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f6d27a';
        ctx.fillText('ATORDOADO', e.x, hy - 8);
        ctx.restore();
      }
    }
  }

  // Roll i-frame spectral afterimages
  for (const rg of st.rollGhosts) {
    ctx.save();
    ctx.translate(rg.x, rg.y);
    ctx.scale(rg.face * 1.28, 1.28);
    ctx.globalAlpha = rg.a * 0.45;
    ctx.filter = 'hue-rotate(155deg) brightness(1.65) saturate(1.4)';
    drawFox(ctx, { t: P.anim, roll: rg.rot }, look);
    ctx.restore();
  }

  // Player (high-resolution 1.28x scale + Especial Giratorio + i-frame & evade counter aura)
  if (!(P.dead && P.deadT > 2.2)) {
    const pose: PoseParams = {
      t: P.anim,
      run: P.state === 'free' && P.onGround && Math.abs(P.vx) > 30 ? 1 : 0,
      air: !P.onGround,
      sway: Math.abs(P.vx) / 260,
    };
    if (P.state === 'atk') {
      const { aw, aa, ar, t } = P;
      const [a0, a1] = P.heavy ? [-2.6, 1.2] : P.combo === 2 ? [1, -1.9] : [-2.2, 1];
      if (t < aw) pose.arm = lerp(0.9, a0, Math.pow(t / aw, .65));
      else if (t < aw + aa) {
        pose.arm = lerp(a0, a1, 1-Math.pow(1-(t-aw)/aa,2));
        pose.trail = [a0, pose.arm];
      } else {
        const settle=Math.min(1,(t-aw-aa)/ar);
        pose.arm = lerp(a1, 0.9, settle*settle*(3-2*settle));
      }
      const swing=t<aw?-Math.sin(t/aw*Math.PI/2):t<aw+aa?Math.sin((t-aw)/aa*Math.PI/2):Math.max(0,1-(t-aw-aa)/ar);
      pose.lean=swing*(P.heavy?.22:.13);
      pose.arm2=1.1-swing*.65;
      pose.sway=swing*.85;
    } else if (P.state === 'roll') pose.roll = (P.t / RDUR) * Math.PI * 2;
    else if (P.state === 'heal') {
      pose.arm = 0.6;
      pose.arm2 = -1.5;
    } else if (P.state === 'hurt') pose.lean = -0.25;
    else if (P.state === 'stagger') {
      pose.lean = -0.32 + Math.sin(time * 24) * 0.04;
      pose.arm = 1.25;
      pose.arm2 = 1.1;
    } else if (P.blocking) {
      pose.block = true;
      pose.arm2 = 0.15;
      pose.lean = 0.05;
    } else if (P.state === 'fog') {
      pose.run = 1;
      pose.arm2 = -0.3;
      pose.lean = 0.08;
    }
    if (P.dead) pose.lean = -Math.min(1, P.deadT / 0.5) * 1.45;

    // Counter-attack buff shimmer when Esquiva Perfeita triggered
    if (!P.dead && P.evadeBuff > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(122, 232, 216, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(P.x, P.y - 36, 26 + Math.sin(time * 12) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawWeaponArc(ctx,P,look,reduceMotion);
    const foxScale = 1.28;
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.scale(P.face * foxScale, foxScale);
    if (P.dead) ctx.globalAlpha = clamp(2.2 - P.deadT, 0, 1);
    else if (P.state === 'hurt' && P.t < 0.14) ctx.filter = 'brightness(2.1) saturate(1.4)';
    else if (P.inIframe) {
      ctx.globalAlpha = 0.68;
      ctx.shadowColor = '#7ae8d8';
      ctx.shadowBlur = 14;
    } else if (P.inv > 0 && P.state !== 'roll' && P.spin <= 0 && Math.floor(time * 20) % 2) ctx.globalAlpha = 0.55;
    drawFox(ctx, pose, look);
    ctx.restore();

    if (P.spin > 0 && !P.dead) {
      ctx.save();
      ctx.translate(P.x, P.y - 46);
      const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, 130);
      aura.addColorStop(0, 'rgba(170, 232, 248, 0.26)');
      aura.addColorStop(1, 'rgba(141, 204, 237, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(time * 22);
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.fillStyle = 'rgba(218, 251, 255, 0.86)';
        ctx.beginPath();
        ctx.moveTo(-14, -68);
        ctx.quadraticCurveTo(86, -104, 112, -4);
        ctx.quadraticCurveTo(56, -62, -14, -68);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (!P.dead && P.state === 'stagger') {
      ctx.save();
      ctx.strokeStyle = '#f6d27a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(P.x, P.y - 104, 12, 3.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = time * 7 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = '#f6d27a';
        ctx.fillRect(P.x + Math.cos(a) * 12 - 1.5, P.y - 104 + Math.sin(a) * 3.8 - 1.5, 3, 3);
      }
      ctx.restore();
    }
  }

  // Shots & hazards
  for (const m of st.marks) {
    const gr = m.gy || groundAt(m.x) || 440;
    const a = 0.32 + 0.52 * (1 - clamp(m.t / 0.9, 0, 1));
    const col =
      m.kind === 'maw'
        ? '170,34,44'
        : m.kind === 'chain'
          ? '190,184,170'
          : m.kind === 'lunar'
            ? '142,216,252'
            : m.kind === 'pyro_pillar'
              ? '255,120,42'
              : m.kind === 'black_pillar'
                ? '196,104,248'
                : m.kind === 'solar_glyph'
                  ? '255,220,108'
                  : m.kind === 'judgment'
                    ? '216,58,52'
                    : m.kind === 'bind_ring'
                      ? '216,120,255'
                      : m.kind === 'acid_rain'
                        ? '138,216,84'
                        : m.kind === 'lightning_strike'
                          ? '135,228,255'
                          : m.kind === 'blood_pillar'
                            ? '215,44,54'
                            : '232,134,44';
    const isPillar =
      m.kind === 'lunar' ||
      m.kind === 'pyro_pillar' ||
      m.kind === 'black_pillar' ||
      m.kind === 'solar_glyph' ||
      m.kind === 'lightning_strike' ||
      m.kind === 'blood_pillar' ||
      m.kind === 'acid_rain';
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.beginPath();
    ctx.ellipse(m.x, gr + 2, m.kind === 'maw' ? 26 : m.kind === 'bind_ring' ? 36 : isPillar ? 30 : 20, 5, 0, 0, 7);
    ctx.fill();
    if (m.kind !== 'maw') {
      ctx.fillStyle = `rgba(${col},${a * (isPillar ? 0.45 : 0.25)})`;
      ctx.fillRect(m.x - (isPillar ? 6 : 2), 0, isPillar ? 12 : 4, gr);
    }
  }
  for (const tp of st.traps) {
    const l = tp.x - tp.w / 2;
    const r = tp.x + tp.w / 2;
    ctx.fillStyle = '#8a8f92';
    ctx.fillRect(l - 1, tp.y - 22, 2, 22);
    ctx.fillRect(r - 1, tp.y - 22, 2, 22);
    ctx.strokeStyle = 'rgba(204,60,60,.9)';
    ctx.lineWidth = 1;
    for (const [a, b] of [
      [-20, -8],
      [-8, -20],
      [-14, -14],
    ]) {
      ctx.beginPath();
      ctx.moveTo(l, tp.y + a);
      ctx.lineTo(r, tp.y + b);
      ctx.stroke();
    }
  }
  for (const c of st.clouds) {
    const a = Math.min(1, c.life / 1.5) * 0.4;
    for (let i = 0; i < 5; i++) {
      const x = c.x + Math.sin(time * 0.8 + i * 2.1) * c.r * 0.5;
      const y = c.y - 22 - i * 9 + Math.cos(time + i) * 5;
      const gr = ctx.createRadialGradient(x, y, 2, x, y, c.r * 0.6);
      gr.addColorStop(0, `rgba(140,170,90,${a})`);
      gr.addColorStop(1, 'rgba(140,170,90,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - c.r, y - c.r, c.r * 2, c.r * 2);
    }
  }
  if (st.walls) {
    for (const x of [st.walls.l, st.walls.r]) {
      ctx.fillStyle = '#17120f';
      ctx.fillRect(x - 14, 150, 28, 290);
      ctx.strokeStyle = 'rgba(120,104,88,.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 14, 150, 28, 290);
      for (const y of [220, 300, 380]) {
        const op = 0.4 + 0.5 * Math.abs(Math.sin(time * 5 + y));
        ctx.fillStyle = '#d9cdb8';
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 10 * op + 1.5, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#7a1418';
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 7 * op, 0, 0, 7);
        ctx.fill();
      }
    }
  }
  for (const s of st.shots) {
    if (s.kind === 'wave') {
      const gr = ctx.createLinearGradient(0, s.y - 34, 0, s.y);
      gr.addColorStop(0, 'rgba(200,190,170,0)');
      gr.addColorStop(1, 'rgba(200,190,170,.75)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(s.x - 16, s.y);
      ctx.quadraticCurveTo(s.x + (s.vx > 0 ? 10 : -10), s.y - 48, s.x + 16, s.y);
      ctx.fill();
    } else if (s.kind === 'sound') {
      const d = s.vx > 0 ? 1 : -1;
      const cy = s.y - s.h / 2;
      ctx.strokeStyle = 'rgba(216,200,150,.85)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(s.x - d * (i * 7 + 6), cy, s.h / 2 + 2, d > 0 ? -1 : Math.PI - 1, d > 0 ? 1 : Math.PI + 1);
        ctx.stroke();
      }
    } else if (s.kind === 'maw') {
      const k = Math.min(1, (1 - s.life / 0.3) * 2.5);
      const hh = 64 * k;
      ctx.fillStyle = '#3a0f14';
      ctx.beginPath();
      ctx.moveTo(s.x - 26, s.y);
      ctx.quadraticCurveTo(s.x - 22, s.y - hh, s.x - 3, s.y - hh);
      ctx.lineTo(s.x - 3, s.y);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s.x + 26, s.y);
      ctx.quadraticCurveTo(s.x + 22, s.y - hh, s.x + 3, s.y - hh);
      ctx.lineTo(s.x + 3, s.y);
      ctx.fill();
      ctx.fillStyle = '#d9cdb8';
      for (let i = 0; i < 4; i++) {
        const y = s.y - hh * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(s.x - 4, y - 3);
        ctx.lineTo(s.x + 1, y);
        ctx.lineTo(s.x - 4, y + 3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s.x + 4, y + 1);
        ctx.lineTo(s.x - 1, y + 4);
        ctx.lineTo(s.x + 4, y + 7);
        ctx.fill();
      }
    } else if (s.kind === 'chain') {
      ctx.strokeStyle = '#9a9488';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 460);
      ctx.lineTo(s.x, s.y - 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#6b6558';
      ctx.fillRect(s.x - 7, s.y - 14, 14, 14);
    } else if (s.kind === 'arrow' || s.kind === 'bolt') {
      const ang = Math.atan2(s.vy, s.vx);
      const col = s.col || (s.kind === 'bolt' ? '#d4e9f7' : '#e8dcc8');
      ctx.save();
      ctx.translate(s.x, s.y - s.h / 2);
      ctx.rotate(ang);
      ctx.strokeStyle = col;
      ctx.lineWidth = s.kind === 'bolt' ? 2.4 : 1.8;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.fillStyle = '#f2efe6';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(8, -3.5);
      ctx.lineTo(8, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = s.status === 'bleed' ? '#c93434' : '#967c56';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-17, -3.5);
      ctx.moveTo(-13, 0);
      ctx.lineTo(-17, 3.5);
      ctx.stroke();
      ctx.restore();
    } else if (s.kind === 'arcane' || s.kind === 'poison_orb' || s.kind === 'star') {
      const col = s.col || (s.kind === 'poison_orb' ? '#8ce06c' : '#9ed7f0');
      const cy = s.y - s.h / 2;
      ctx.save();
      ctx.translate(s.x, cy);
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, s.kind === 'star' ? 20 : 14);
      aura.addColorStop(0, col);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, s.kind === 'star' ? 20 : 14, 0, 7);
      ctx.fill();
      if (s.kind === 'star') {
        ctx.rotate(time * 8);
        ctx.strokeStyle = '#fff5d6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(11, 0);
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 11);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s.kind === 'star' ? 4.5 : 3.8, 0, 7);
      ctx.fill();
      ctx.restore();
    } else if (s.kind === 'arcane_lance') {
      const ang = Math.atan2(s.vy, s.vx);
      const col = s.col || '#d2f4ff';
      ctx.save();
      ctx.translate(s.x, s.y - s.h / 2);
      ctx.rotate(ang);
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-14, -4.5);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-14, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -1.5, 24, 3);
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (s.kind === 'void_comet') {
      const cy = s.y - s.h / 2;
      const col = s.col || '#c49eff';
      ctx.save();
      ctx.translate(s.x, cy);
      const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, 24);
      aura.addColorStop(0, '#f2e4ff');
      aura.addColorStop(0.45, col);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(time * 9);
      ctx.strokeStyle = '#e5ccff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.fillStyle = '#1b0f2e';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (s.kind === 'fireball') {
      const cy = s.y - s.h / 2;
      ctx.save();
      ctx.translate(s.x, cy);
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      aura.addColorStop(0, '#fff4bd');
      aura.addColorStop(0.45, s.col || '#ff7d30');
      aura.addColorStop(0.8, 'rgba(196, 48, 18, 0.55)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5cc';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (s.kind === 'fire_wave') {
      const d = s.vx >= 0 ? 1 : -1;
      const gr = ctx.createLinearGradient(0, s.y - 46, 0, s.y);
      gr.addColorStop(0, 'rgba(255, 220, 110, 0.15)');
      gr.addColorStop(0.55, 'rgba(255, 110, 38, 0.88)');
      gr.addColorStop(1, 'rgba(180, 32, 16, 0.95)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(s.x - 18, s.y);
      ctx.quadraticCurveTo(s.x + d * 14, s.y - 54 - Math.sin(time * 22) * 5, s.x + 18, s.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 232, 145, 0.78)';
      ctx.beginPath();
      ctx.moveTo(s.x - 9, s.y);
      ctx.quadraticCurveTo(s.x + d * 8, s.y - 28, s.x + 9, s.y);
      ctx.closePath();
      ctx.fill();
    } else if (s.kind === 'black_flame') {
      const cy = s.y - s.h / 2;
      const col = s.col || '#d878ff';
      ctx.save();
      ctx.translate(s.x, cy);
      const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, 22);
      aura.addColorStop(0, '#0f0814');
      aura.addColorStop(0.5, col);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12071a';
      ctx.strokeStyle = '#f2c4ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (s.kind === 'bullet') {
      const d = s.vx >= 0 ? 1 : -1;
      ctx.fillStyle = '#f6b040';
      ctx.fillRect(s.x - d * 12, s.y - s.h / 2 - 1.5, 16, 3);
      ctx.fillStyle = '#fff4d6';
      ctx.beginPath();
      ctx.arc(s.x, s.y - s.h / 2, 3, 0, 7);
      ctx.fill();
    } else if (s.kind === 'vial') {
      ctx.save();
      ctx.translate(s.x, s.y - s.h / 2);
      ctx.rotate(time * 12);
      ctx.fillStyle = 'rgba(130,210,96,0.9)';
      ctx.strokeStyle = '#d8e8c8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 2, 5.5, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6b4f32';
      ctx.fillRect(-2, -6, 4, 4);
      ctx.restore();
    } else if (s.kind === 'feather') {
      const ang = Math.atan2(s.vy, s.vx);
      ctx.save();
      ctx.translate(s.x, s.y - s.h / 2);
      ctx.rotate(ang);
      ctx.fillStyle = '#6f787d';
      ctx.strokeStyle = '#1d2224';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, -3.5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (s.kind === 'axe_wave') {
      const gr = ctx.createLinearGradient(0, s.y - 38, 0, s.y);
      gr.addColorStop(0, 'rgba(220,58,52,0)');
      gr.addColorStop(1, 'rgba(235,88,68,.85)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(s.x - 16, s.y);
      ctx.quadraticCurveTo(s.x + (s.vx > 0 ? 12 : -12), s.y - 50, s.x + 16, s.y);
      ctx.fill();
    } else if (s.kind === 'crystal') {
      const cy = s.y - s.h / 2;
      ctx.save();
      ctx.translate(s.x, cy);
      ctx.rotate(time * 9);
      ctx.fillStyle = '#9ed7f0';
      ctx.shadowColor = '#9ed7f0';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (s.kind === 'spider_orb') {
      const cy = s.y - s.h / 2;
      const gOrb = ctx.createRadialGradient(s.x, cy, 2, s.x, cy, 16);
      gOrb.addColorStop(0, '#f4e0ff');
      gOrb.addColorStop(0.5, '#b66ee8');
      gOrb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gOrb;
      ctx.beginPath();
      ctx.arc(s.x, cy, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'laser' || s.kind === 'cosmic_beam') {
      const isCosmic = s.kind === 'cosmic_beam';
      const gr = ctx.createLinearGradient(s.x - 16, 0, s.x + 16, 0);
      gr.addColorStop(0, isCosmic ? 'rgba(130,224,255,0)' : 'rgba(180,90,255,0)');
      gr.addColorStop(0.5, isCosmic ? 'rgba(175,244,255,0.9)' : 'rgba(225,175,255,0.85)');
      gr.addColorStop(1, isCosmic ? 'rgba(130,224,255,0)' : 'rgba(180,90,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(s.x - 18, 0, 36, s.y);
      ctx.fillStyle = '#fff5e0';
      ctx.fillRect(s.x - 4, 0, 8, s.y);
    } else if (s.kind === 'lightning') {
      const cy = s.y - s.h / 2;
      ctx.save();
      ctx.strokeStyle = '#9fe6ff';
      ctx.shadowColor = '#66d6ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x - 14, cy);
      ctx.lineTo(s.x - 4, cy - 6);
      ctx.lineTo(s.x + 5, cy + 6);
      ctx.lineTo(s.x + 15, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (s.kind === 'acid') {
      const cy = s.y - s.h / 2;
      const gAcid = ctx.createRadialGradient(s.x, cy, 2, s.x, cy, 14);
      gAcid.addColorStop(0, '#d8ff8a');
      gAcid.addColorStop(0.55, '#78c257');
      gAcid.addColorStop(1, 'rgba(88,158,66,0)');
      ctx.fillStyle = gAcid;
      ctx.beginPath();
      ctx.arc(s.x, cy, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'ice_skull') {
      const cy = s.y - s.h / 2;
      ctx.save();
      ctx.translate(s.x, cy);
      const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      aura.addColorStop(0, '#ffd8d8');
      aura.addColorStop(0.55, '#e04e58');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2ede4';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (s.kind === 'blood_slash') {
      const d = s.vx >= 0 ? 1 : -1;
      const gr = ctx.createLinearGradient(0, s.y - 44, 0, s.y);
      gr.addColorStop(0, 'rgba(235, 62, 62, 0.1)');
      gr.addColorStop(1, 'rgba(180, 22, 32, 0.92)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(s.x - 16, s.y);
      ctx.quadraticCurveTo(s.x + d * 18, s.y - 52, s.x + 16, s.y);
      ctx.closePath();
      ctx.fill();
    } else {
      const gr = ctx.createLinearGradient(0, s.y - 70, 0, s.y);
      gr.addColorStop(0, 'rgba(232,134,44,0)');
      gr.addColorStop(1, 'rgba(246,210,122,.95)');
      ctx.fillStyle = gr;
      ctx.fillRect(s.x - 7, s.y - 70, 14, 70);
      ctx.fillStyle = '#fff2c8';
      ctx.beginPath();
      ctx.arc(s.x, s.y - 6, 7, 0, 7);
      ctx.fill();
    }
  }

  // Meteors (telegraphed environmental strikes)
  for (const m of st.meteors) {
    if (m.t < 1.55) {
      const pulse = 0.45 + 0.3 * Math.sin(time * 15);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#eea47a';
      ctx.beginPath();
      ctx.ellipse(m.x, m.gy - 2, 62, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f0c4a6';
      ctx.font = `14px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.fillText('☄', m.x, m.gy - 24);
      if (m.t > 0.82) {
        const f = (m.t - 0.82) / 0.73;
        const y = -120 + f * f * (m.gy + 115);
        for (let j = 4; j > 0; j--) {
          const mg = ctx.createRadialGradient(m.x - j * 14, y - j * 28, 1, m.x - j * 14, y - j * 28, 36);
          mg.addColorStop(0, 'rgba(167, 224, 255, 0.25)');
          mg.addColorStop(1, 'rgba(167, 224, 255, 0)');
          ctx.fillStyle = mg;
          ctx.fillRect(m.x - j * 14 - 36, y - j * 28 - 36, 72, 72);
        }
        ctx.fillStyle = '#c7ebef';
        ctx.strokeStyle = '#557f98';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(m.x - 16, y - 10);
        ctx.lineTo(m.x - 6, y - 24);
        ctx.lineTo(m.x + 17, y - 14);
        ctx.lineTo(m.x + 22, y + 7);
        ctx.lineTo(m.x + 1, y + 17);
        ctx.lineTo(m.x - 19, y + 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const fade = Math.max(0, 1 - (m.t - 1.55) / 0.7);
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#bbf1f4';
      ctx.beginPath();
      ctx.ellipse(m.x, m.gy - 2, 78 + (m.t - 1.55) * 110, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      const ig = ctx.createRadialGradient(m.x, m.gy - 20, 4, m.x, m.gy - 20, 140);
      ig.addColorStop(0, 'rgba(169, 225, 235, 0.4)');
      ig.addColorStop(1, 'rgba(169, 225, 235, 0)');
      ctx.fillStyle = ig;
      ctx.fillRect(m.x - 140, m.gy - 160, 280, 180);
      ctx.globalAlpha = 1;
    }
  }

  // Stone Debris
  for (const d of st.debris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.globalAlpha = Math.min(1, d.life * 2);
    ctx.fillStyle = '#69787d';
    ctx.strokeStyle = '#1b2226';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-d.size, 0);
    ctx.lineTo(0, -d.size);
    ctx.lineTo(d.size, d.size * 0.35);
    ctx.lineTo(0, d.size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Particles
  for (const p of st.parts) {
    p.life -= dt;
    const drag = p.drag ? Math.pow(p.drag, dt * 60) : 1;
    p.vx *= drag;
    p.vy = p.vy * drag + p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const lr = clamp(p.life / p.max, 0, 1);
    if (p.text) {
      ctx.globalAlpha = clamp(lr * 1.4, 0, 1);
      ctx.fillStyle = p.col;
      ctx.font = `16px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.kind === 'ring') {
      const r = lerp(p.size, p.endSize ?? p.size * 3.5, 1 - lr);
      ctx.globalAlpha = clamp(lr * 0.92, 0, 1);
      ctx.strokeStyle = p.col;
      ctx.lineWidth = Math.max(1, 3.4 * lr);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'streak') {
      const spd = Math.hypot(p.vx, p.vy);
      const len = clamp(spd * 0.045, 4, 20);
      const nx = spd > 1 ? p.vx / spd : 1;
      const ny = spd > 1 ? p.vy / spd : 0;
      ctx.globalAlpha = clamp(lr * 1.35, 0, 1);
      ctx.strokeStyle = p.col;
      ctx.lineWidth = Math.max(1.2, p.size * (0.4 + 0.6 * lr));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - nx * len, p.y - ny * len);
      ctx.lineTo(p.x + nx * len * 0.4, p.y + ny * len * 0.4);
      ctx.stroke();
    } else if (p.kind === 'dust') {
      const r = lerp(p.size, p.endSize ?? p.size * 2.4, 1 - lr);
      ctx.globalAlpha = clamp(lr * 0.45, 0, 0.45);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = clamp(lr * 1.4, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;

  // Fog gate
  if (arena >= 0) {
    ctx.fillStyle = 'rgba(200,212,208,.3)';
    ctx.fillRect(ARENAS[arena].x1 - 26, -20, 60, 480);
  }
  if (st.gateX0 !== null) {
    const ARENA0 = st.gateX0;
    const fgr = ctx.createLinearGradient(ARENA0 - 46, 0, ARENA0 + 46, 0);
    fgr.addColorStop(0, 'rgba(200,212,208,0)');
    fgr.addColorStop(0.5, 'rgba(200,212,208,.5)');
    fgr.addColorStop(1, 'rgba(200,212,208,0)');
    ctx.fillStyle = fgr;
    ctx.fillRect(ARENA0 - 46, -20, 92, 480);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(225,232,228,${0.12 + 0.08 * Math.sin(time * 2 + i)})`;
      ctx.beginPath();
      ctx.ellipse(
        ARENA0 + Math.sin(time * 1.1 + i * 1.7) * 14,
        i * 34 - ((time * 26 + i * 9) % 34),
        24 + 6 * Math.sin(i),
        30,
        0,
        0,
        7
      );
      ctx.fill();
    }
  }

  ctx.restore();

  drawDepthFront(ctx, cam, P, zIdx);

  // Zone-adaptive Atmospheric Particles (Rain, Blood-Ash, Astral Wisps & Cinders)
  ctx.fillStyle = blend > 0.5 ? tB.moteCol : tA.moteCol;
  for (let i = 0; i < 48; i++) {
    const x = (((i * 197.3 + time * (10 + (i % 7) * 3) - cam * 0.6) % (W + 40)) + W + 40) % (W + 40) - 20;
    const rawY = (i * 91.7 + time * (16 + (i % 5) * 6)) % H;
    const y = zIdx === 2 || zIdx === 4 ? H - rawY : rawY;
    ctx.fillRect(x, y, zIdx === 2 || zIdx === 4 ? 2.4 : 2, zIdx === 2 || zIdx === 4 ? 2.4 : 2);
  }
  if (zIdx === 1 || zIdx === 2 || zIdx === 6 || zIdx === 9) {
    // Misty rain / Blood Rain / Cainhurst Snow / Crimson Ashfall
    ctx.strokeStyle =
      zIdx === 2 || zIdx === 9
        ? 'rgba(218, 56, 52, 0.28)'
        : zIdx === 6
          ? 'rgba(228, 240, 255, 0.42)'
          : 'rgba(155, 224, 212, 0.22)';
    ctx.lineWidth = zIdx === 6 ? 1.8 : 1;
    for (let i = 0; i < (zIdx === 6 ? 36 : 28); i++) {
      const spdY = zIdx === 6 ? 120 : 420;
      const driftX = zIdx === 6 ? Math.sin(time * 2 + i) * 18 : 110;
      const rx = (((i * 143 + time * driftX - cam * 0.7) % (W + 40)) + W + 40) % (W + 40) - 20;
      const ry = (i * 89 + time * spdY) % H;
      if (zIdx === 6) {
        ctx.fillStyle = 'rgba(236, 245, 255, 0.52)';
        ctx.fillRect(rx, ry, 2.5, 2.5);
      } else {
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 14);
        ctx.stroke();
      }
    }
  }

  if (!vignette) {
    vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.75)');
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  if (redFlash > 0) {
    const rvg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.92);
    rvg.addColorStop(0, `rgba(140,18,18,${clamp(redFlash * 0.16, 0, 0.14)})`);
    rvg.addColorStop(1, `rgba(145,14,18,${clamp(redFlash * 0.85, 0, 0.65)})`);
    ctx.fillStyle = rvg;
    ctx.fillRect(0, 0, W, H);
  }
  if (impactFlash > 0) {
    const ivg = ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.98);
    ivg.addColorStop(0, 'rgba(246,210,122,0)');
    ivg.addColorStop(1, `rgba(246,210,122,${clamp(impactFlash * 0.45, 0, 0.22)})`);
    ctx.fillStyle = ivg;
    ctx.fillRect(0, 0, W, H);
  }
  if (P.spin > 0 && mode === 'play') {
    ctx.fillStyle = 'rgba(180,235,255,0.08)';
    ctx.fillRect(0, 0, W, H);
  }

  // HUD
  if (mode === 'play' || mode === 'pause' || mode === 'rest') {
    const mh = st.maxHp;
    const ms = st.maxSt;
    const hw = Math.min(430, 150 + mh * 0.7);
    const sw = Math.min(400, 110 + ms * 0.7);
    const ew = Math.min(260, sw * 0.72);
    const poisoned = P.statuses.some((s) => s.id === 'poison');
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(22, 20, hw + 4, 16);
    ctx.fillRect(22, 40, sw + 4, 11);
    ctx.fillRect(22, 54, ew + 4, 7);
    ctx.fillStyle = '#d9772f';
    ctx.fillRect(24, 22, hw * clamp((P.hp + P.rally) / mh, 0, 1), 12);
    ctx.fillStyle = poisoned ? '#589e42' : '#a32424';
    ctx.fillRect(24, 22, hw * clamp(P.hp / mh, 0, 1), 12);
    ctx.fillStyle = P.state === 'stagger' ? '#d9772f' : '#5f8a5a';
    ctx.fillRect(24, 42, sw * clamp(P.st / ms, 0, 1), 7);
    ctx.fillStyle = P.energy >= 100 ? '#c8f5ff' : '#6ea8c9';
    ctx.fillRect(24, 55.5, ew * clamp(P.energy / 100, 0, 1), 4);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `12px ${FONT_D}`;
    ctx.fillStyle = '#d8d0bd';
    ctx.fillText(`${Math.max(0, Math.ceil(P.hp))}/${mh}`, 28 + hw + 10, 32);

    ctx.font = `10px ${FONT_D}`;
    ctx.fillStyle = P.energy >= 100 ? '#c8f5ff' : '#8d9692';
    ctx.fillText(P.energy >= 100 ? 'ESPECIAL PRONTO · C' : `ESPECIAL ${Math.floor(P.energy)}%`, 32 + ew, 60);

    const maxF = st.maxFlasks || FLASKS;
    for (let i = 0; i < maxF; i++) {
      const x = 28 + i * 20;
      ctx.fillStyle = i < P.flasks ? '#e8862c' : 'rgba(255,255,255,.14)';
      ctx.fillRect(x - 2, 70, 4, 5);
      ctx.beginPath();
      ctx.arc(x, 82, 7, 0, 7);
      ctx.fill();
    }
    ctx.font = `14px ${FONT_D}`;
    ctx.fillStyle = '#8d9692';
    const bDef = BUILDS[look.build];
    const vigLabel =
      S.ng > 0
        ? `${bDef.name} · nv. ${S.level} · Vigília ${S.ng + 1}`
        : `${bDef.name} · nível ${S.level}`;
    ctx.fillText(vigLabel, 28 + maxF * 20 + 6, 86);
    ctx.font = `11px ${FONT_D}`;
    ctx.fillStyle = bDef.accent;
    const eqW = WEAPONS[look.weapon];
    const spellSuffix =
      eqW.category === 'pyro'
        ? ` · [F] ${PYRO_SPELLS[(P.spellIdx || 0) % 3].name}`
        : eqW.category === 'magic'
          ? ` · [F] ${MAGIC_SPELLS[(P.spellIdx || 0) % 3].name}`
          : '';
    ctx.fillText(
      `${eqW.label || ''} · ${ARMORS[look.armor].label}${spellSuffix}`,
      28 + maxF * 20 + 6,
      100
    );

    if (S.equippedRunes && S.equippedRunes.length > 0) {
      let rx = 28 + maxF * 20 + 10;
      S.equippedRunes.forEach((rId) => {
        const r = RUNES[rId];
        if (!r) return;
        ctx.save();
        ctx.translate(rx, 113);
        ctx.fillStyle = r.col;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(4.5, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-4.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        rx += 14;
      });
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(W - 160, H - 46, 138, 28);
    ctx.fillStyle = '#8d9692';
    ctx.font = `13px ${FONT_D}`;
    ctx.fillText('cinzas', W - 98, H - 27);
    ctx.fillStyle = '#e8b070';
    ctx.font = `20px ${FONT_D}`;
    ctx.fillText(String(S.cinzas), W - 30, H - 25);

    const boss =
      (arena >= 0 ? enemies.find((e) => e.boss && !e.fieldBoss && e.k === arena && !e.dead) : null) ||
      enemies.find((e) => e.boss && e.fieldBoss && !e.dead && e.state !== 'idle' && Math.abs(e.x - P.x) < 620);
    if (boss) {
      const bw = 560;
      const x = (W - bw) / 2;
      ctx.textAlign = 'left';
      ctx.font = `18px ${FONT_D}`;
      ctx.fillStyle = '#d8d0bd';
      const phaseTag =
        boss.type === 'rei'
          ? boss.mask === 2
            ? ' · Fase III'
            : boss.mask === 1
              ? ' · Fase II'
              : ''
          : boss.raged || boss.hp < boss.maxHp * 0.5
            ? ' · Fase II'
            : '';
      ctx.fillText(`${ET[boss.type].name || ''}${phaseTag}`, x, H - 58);
      if (boss.type === 'rei') {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i >= boss.mask ? '#d8d0bd' : 'rgba(255,255,255,.15)';
          ctx.beginPath();
          ctx.ellipse(x + bw - 10 - i * 18, H - 66, 5, 7, 0, 0, 7);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(x - 2, H - 52, bw + 4, 12);
      ctx.fillStyle = boss.raged || boss.mask > 0 ? '#cf382e' : '#a32424';
      ctx.fillRect(x, H - 50, bw * clamp(boss.hp / boss.maxHp, 0, 1), 8);
    }

    if (
      !P.dead &&
      P.state === 'free' &&
      (st.nearBrazierIdx >= 0 || st.nearChestIdx >= 0 || st.nearLoreIdx >= 0 || st.nearFog || !!st.nearNpc)
    ) {
      const nearChest = st.nearChestIdx >= 0 ? st.chests[st.nearChestIdx] : null;
      const actionLabel = nearChest
        ? nearChest.kind === 'rune'
          ? 'Abrir baú de runa'
          : 'Abrir relíquia'
        : st.nearLoreIdx >= 0
          ? 'Ler crônica'
          : st.nearNpc
            ? `Conversar com ${st.nearNpc.name}`
            : st.nearFog
              ? 'Atravessar a névoa'
              : S.lit[st.nearBrazierIdx]
                ? 'Descansar no braseiro'
                : 'Acender o braseiro';
      const txt = `${isTouch ? 'Usar' : 'E'}  ·  ${actionLabel}`;
      ctx.font = `18px ${FONT_B}`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(W / 2 - tw / 2 - 16, H - 112, tw + 32, 32);
      ctx.fillStyle = nearChest
        ? nearChest.kind === 'rune'
          ? '#d878ff'
          : '#f6d27a'
        : st.nearNpc
          ? st.nearNpc.accent
          : st.nearLoreIdx >= 0
            ? '#9ed7f0'
            : '#d8d0bd';
      ctx.fillText(txt, W / 2, H - 90);
    }
  }

  if(mode==='play' && !P.dead) {drawPuzzleHint(ctx, P, S, isTouch);drawRouteHint(ctx,P,S,isTouch);}

  if(st.zoneTrans&&mode==='play') drawRegionVeil(ctx,st.zoneTrans,reduceMotion);
  if(st.passage&&mode==='play') drawPassage(ctx,st.passage);

  // Banner
  if (st.banner) {
    const b = st.banner;
    const a = clamp(Math.min(b.t / 0.5, (b.dur - b.t) / 0.8), 0, 1);
    if (b.t >= b.dur) {
      st.banner = null;
    } else {
      ctx.globalAlpha = a;
      const bg = ctx.createLinearGradient(0, H / 2 - 70, 0, H / 2 + 70);
      bg.addColorStop(0, 'rgba(0,0,0,0)');
      bg.addColorStop(0.5, 'rgba(0,0,0,.8)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, H / 2 - 70, W, 140);
      ctx.textAlign = 'center';
      ctx.fillStyle = b.col;
      ctx.font = `46px ${FONT_D}`;
      if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '4px';
      ctx.fillText(b.text, W / 2, H / 2 + 10, W - 64);
      if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
      if (b.sub) {
        ctx.font = `italic 18px ${FONT_B}`;
        ctx.fillStyle = '#8d9692';
        ctx.fillText(b.sub, W / 2, H / 2 + 40, W - 64);
      }
      ctx.globalAlpha = 1;
    }
  }
}
