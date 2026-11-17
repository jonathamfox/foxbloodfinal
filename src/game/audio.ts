import { NZ } from './constants';
import type { EndingId } from './types';

let AC: AudioContext | null = null;
let muted = false;
let musicVolume = 0.55;
let currentZone = 0;
let bossPhase2 = false;
let music: {
  amb: GainNode;
  bg: GainNode;
  synth: GainNode;
  filter: BiquadFilterNode;
  boss: boolean;
  src: AudioBufferSourceNode | null;
  step: number;
  timer: number | null;
} | null = null;

const SND: Record<string, AudioBuffer> = {};

const AUDIO_ASSETS = {
  amb: '/assets/aistudio/musica_460ab381.mp3',
  boss: '/assets/aistudio/chefe_9c513614.mp3',
  roar: '/assets/aistudio/rugido_72f73227.mp3',
};

// Gothic harmonic progressions per zone (0..9) & boss state (Hz)
const ZONE_SCALES: {
  bass: number[];
  notes: number[];
  cutoff: number;
  timbre: OscillatorType;
  pad: OscillatorType;
}[] = [
  // Zone 0: Velmora (D Dorian / Nocturnal Minor)
  { bass: [73.42, 65.41, 58.27, 65.41], notes: [293.66, 349.23, 440, 329.63, 293.66, 261.63, 220, 349.23], cutoff: 2600, timbre: 'sine', pad: 'triangle' },
  // Zone 1: Catedral Submersa (C# Minor Cathedral Organ)
  { bass: [69.3, 61.74, 55.0, 61.74], notes: [277.18, 329.63, 415.3, 493.88, 329.63, 277.18, 246.94, 415.3], cutoff: 1950, timbre: 'sine', pad: 'triangle' },
  // Zone 2: Salão da Coroa Velada (C Phrygian Royal Dread)
  { bass: [65.41, 69.3, 49.0, 58.27], notes: [261.63, 277.18, 392.0, 311.13, 523.25, 415.3, 392.0, 277.18], cutoff: 3400, timbre: 'triangle', pad: 'sawtooth' },
  // Zone 3: Lago da Névoa Vazia (Ethereal Astral Minor)
  { bass: [55.0, 65.41, 73.42, 49.0], notes: [440.0, 523.25, 659.25, 587.33, 493.88, 440.0, 392.0, 659.25], cutoff: 2300, timbre: 'sine', pad: 'sine' },
  // Zone 4: Altar do Pesadelo Astral (Dissonant Cosmic Choir)
  { bass: [51.91, 49.0, 61.74, 46.25], notes: [311.13, 466.16, 415.3, 293.66, 554.37, 466.16, 369.99, 277.18], cutoff: 3800, timbre: 'triangle', pad: 'sawtooth' },
  // Zone 5: Bosque dos Enforcados (Eerie Foggy B Minor / Hollow Winds)
  { bass: [61.74, 58.27, 55.0, 49.0], notes: [246.94, 293.66, 369.99, 261.63, 329.63, 246.94, 220.0, 311.13], cutoff: 1750, timbre: 'sine', pad: 'triangle' },
  // Zone 6: Castelo de Cainhurst (Icy Aristocratic Harpsichord Waltz)
  { bass: [82.41, 73.42, 65.41, 61.74], notes: [329.63, 493.88, 440.0, 392.0, 523.25, 493.88, 369.99, 329.63], cutoff: 3200, timbre: 'triangle', pad: 'triangle' },
  // Zone 7: Ossuário de Yahar'gul (Heavy Tritone Industrial Storm)
  { bass: [55.0, 51.91, 46.25, 58.27], notes: [220.0, 311.13, 233.08, 293.66, 196.0, 277.18, 220.0, 329.63], cutoff: 2150, timbre: 'sawtooth', pad: 'sawtooth' },
  // Zone 8: Câmara do Coro Celeste (Luminous Sacred Overtones)
  { bass: [65.41, 73.42, 87.31, 65.41], notes: [523.25, 659.25, 587.33, 783.99, 659.25, 523.25, 493.88, 659.25], cutoff: 4200, timbre: 'sine', pad: 'sine' },
  // Zone 9: Sótão de Mergo · Lua Vermelha (Deep Crimson Lullaby & Pulse)
  { bass: [49.0, 51.91, 43.65, 46.25], notes: [392.0, 369.99, 293.66, 311.13, 466.16, 392.0, 293.66, 233.08], cutoff: 3600, timbre: 'triangle', pad: 'sawtooth' },
];

const BOSS_MOTIF = [146.83, 155.56, 220.0, 207.65, 146.83, 174.61, 155.56, 130.81];

function loadSnd(name: string, url: string) {
  if (!AC) return Promise.resolve();
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error('Audio fetch failed');
      return r.arrayBuffer();
    })
    .then((b) => AC!.decodeAudioData(b))
    .then((buf) => {
      SND[name] = buf;
      // If boss fight already started before boss MP3 finished decoding, start it now
      if (name === 'boss' && music && music.boss && !music.src && AC) {
        const s = AC.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        s.connect(music.bg);
        s.start();
        music.src = s;
        applyMusicGains(true);
      }
    })
    .catch(() => {});
}

function playMusicVoice(freq: number, dur: number, type: OscillatorType, vol: number, detune = 0) {
  if (!AC || !music || muted || musicVolume <= 0.01) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.18, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(music.synth);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function tickMusicLayer() {
  if (!AC || !music || muted || AC.state !== 'running') return;
  const s = music.step++;
  const z = ZONE_SCALES[currentZone] || ZONE_SCALES[0];

  if (music.boss) {
    // Rhythmic gothic boss pulse & organ accent
    const root = BOSS_MOTIF[s % BOSS_MOTIF.length];
    if (s % 4 === 0) {
      playMusicVoice(root * 0.5, 1.4, 'sawtooth', 0.055, -6);
      playMusicVoice(root * 0.5, 1.4, 'triangle', 0.07, 6);
    }
    if (bossPhase2) {
      playMusicVoice(root * (s % 2 === 0 ? 1 : 1.5), 0.48, 'triangle', 0.045);
      if (s % 8 === 0) playMusicVoice(root * 2, 0.9, 'sine', 0.035);
    } else if (s % 2 === 0) {
      playMusicVoice(root, 0.7, 'triangle', 0.035);
    }
    return;
  }

  // Ambient zone accompaniment blended smoothly with MP3
  if (s % 8 === 0) {
    const bFreq = z.bass[Math.floor(s / 8) % z.bass.length];
    playMusicVoice(bFreq, 3.6, z.pad, z.pad === 'sawtooth' ? 0.032 : 0.06, -4);
    playMusicVoice(bFreq * 1.5, 3.4, 'sine', 0.038, 4);
    if (currentZone === 1 || currentZone === 3 || currentZone === 8) {
      playMusicVoice(bFreq * 3, 3.0, 'sine', 0.025);
    }
    if (currentZone === 4 || currentZone === 7 || currentZone === 9) {
      playMusicVoice(bFreq * 1.414, 2.8, 'sawtooth', 0.018);
    }
  }
  if (s % 2 === 1 || currentZone === 6 || currentZone === 9) {
    if (s % 2 === 1 || (currentZone === 6 && s % 3 === 0) || (currentZone === 9 && s % 4 === 2)) {
      const melody = z.notes[(s + currentZone * 2) % z.notes.length];
      playMusicVoice(
        melody,
        currentZone === 1 || currentZone === 3 || currentZone === 8 ? 1.85 : currentZone === 6 ? 0.95 : 1.3,
        z.timbre,
        z.timbre === 'sawtooth' ? 0.02 : 0.034,
        currentZone >= 3 ? 7 : 0
      );
    }
  }
  // Music-box chime accent in Mergo's Loft (Zone 9)
  if (currentZone === 9 && s % 4 === 0) {
    const lullaby = z.notes[(s / 4) % z.notes.length] * 2;
    playMusicVoice(lullaby, 1.1, 'sine', 0.022, 4);
  }
}

function applyMusicGains(smooth = true) {
  if (!music || !AC) return;
  const t = AC.currentTime;
  const ambTarget = muted || music.boss ? 0 : musicVolume;
  const bgTarget = !muted && music.boss && music.src ? Math.min(1, musicVolume * (bossPhase2 ? 1.22 : 1.12)) : 0;
  const synthTarget = muted ? 0 : musicVolume * 0.85;
  const z = ZONE_SCALES[currentZone] || ZONE_SCALES[0];
  const cutoff = music.boss ? (bossPhase2 ? 4800 : 3400) : z.cutoff;

  if (smooth) {
    music.amb.gain.setTargetAtTime(ambTarget, t, 0.25);
    music.bg.gain.setTargetAtTime(bgTarget, t, 0.25);
    music.synth.gain.setTargetAtTime(synthTarget, t, 0.3);
    music.filter.frequency.setTargetAtTime(cutoff, t, 0.5);
  } else {
    music.amb.gain.value = ambTarget;
    music.bg.gain.value = bgTarget;
    music.synth.gain.value = synthTarget;
    music.filter.frequency.value = cutoff;
  }
}

function startMusic() {
  if (!AC) return;
  const filter = AC.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = ZONE_SCALES[0].cutoff;
  filter.Q.value = 0.7;

  const amb = AC.createGain();
  const bg = AC.createGain();
  const synth = AC.createGain();
  amb.gain.value = muted ? 0 : musicVolume;
  bg.gain.value = 0;
  synth.gain.value = muted ? 0 : musicVolume * 0.85;

  amb.connect(filter);
  bg.connect(filter);
  filter.connect(AC.destination);
  synth.connect(AC.destination);

  const timer = window.setInterval(tickMusicLayer, 460);
  music = { amb, bg, synth, filter, boss: false, src: null, step: 0, timer };

  loadSnd('amb', AUDIO_ASSETS.amb).then(() => {
    if (!SND.amb || !AC || !music) return;
    const s = AC.createBufferSource();
    s.buffer = SND.amb;
    s.loop = true;
    s.connect(music.amb);
    s.start();
  });
  loadSnd('boss', AUDIO_ASSETS.boss);
  loadSnd('roar', AUDIO_ASSETS.roar);
}

export function audioInit() {
  if (AC) {
    if (AC.state === 'suspended') AC.resume();
    return;
  }
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = new AudioCtx();
    startMusic();
  } catch {
    // Web Audio unavailable
  }
}

export function isMuted() {
  return muted;
}

export function getMusicVolume() {
  return musicVolume;
}

export function setMusicVolume(v: number) {
  musicVolume = Math.max(0, Math.min(1, v));
  applyMusicGains(true);
}

export function toggleMute(): boolean {
  muted = !muted;
  applyMusicGains(false);
  return muted;
}

export function setMusicZone(zone: number, isPhase2 = false) {
  const z = Math.max(0, Math.min(NZ - 1, zone));
  if (z !== currentZone || isPhase2 !== bossPhase2) {
    currentZone = z;
    bossPhase2 = isPhase2;
    applyMusicGains(true);
  }
}

export function playEndingTheme(ending: EndingId) {
  if (!AC || muted) return;
  const chords: Record<EndingId, number[][]> = {
    alvor: [
      [261.63, 329.63, 392.0, 523.25],
      [293.66, 369.99, 440.0, 587.33],
      [329.63, 415.3, 493.88, 659.25],
    ],
    vigilia: [
      [220.0, 261.63, 329.63, 440.0],
      [196.0, 246.94, 293.66, 392.0],
      [174.61, 220.0, 261.63, 349.23],
    ],
    eclipse: [
      [146.83, 207.65, 293.66, 415.3],
      [130.81, 196.0, 277.18, 369.99],
      [110.0, 164.81, 233.08, 311.13],
    ],
  };
  const seq = chords[ending];
  seq.forEach((chord, idx) => {
    window.setTimeout(() => {
      if (!AC || muted) return;
      chord.forEach((f, vi) => {
        playMusicVoice(f, 3.2, vi === 0 ? 'triangle' : 'sine', ending === 'eclipse' ? 0.055 : 0.048, vi * 4);
      });
    }, idx * 1400);
  });
}

export function roar() {
  if (!music || muted || !AC) return;
  if (!SND.roar) {
    tone(70, 1.2, 'sawtooth', 0.12, -30);
    return;
  }
  const s = AC.createBufferSource();
  const g = AC.createGain();
  s.buffer = SND.roar;
  g.gain.value = Math.max(0.25, musicVolume * 1.2);
  s.connect(g);
  g.connect(AC.destination);
  s.start();
}

export function setBossMusic(on: boolean) {
  if (!music || !AC || music.boss === on) return;
  music.boss = on;
  const t = AC.currentTime;
  if (on) {
    if (SND.boss) {
      const s = AC.createBufferSource();
      s.buffer = SND.boss;
      s.loop = true;
      s.connect(music.bg);
      s.start();
      music.src = s;
      music.amb.gain.setTargetAtTime(0, t, 0.5);
      music.bg.gain.setTargetAtTime(muted ? 0 : Math.min(1, musicVolume * 1.15), t, 0.4);
    }
  } else {
    bossPhase2 = false;
    music.amb.gain.setTargetAtTime(muted ? 0 : musicVolume, t, 0.8);
    music.bg.gain.setTargetAtTime(0, t, 0.6);
    const s = music.src;
    music.src = null;
    if (s) {
      setTimeout(() => {
        try {
          s.stop();
        } catch {
          // ignore already stopped
        }
      }, 2600);
    }
  }
  applyMusicGains(true);
}

function tone(f: number, d: number, type: OscillatorType = 'sine', v = 0.06, slide = 0) {
  if (!AC || muted) return;
  const o = AC.createOscillator();
  const g = AC.createGain();
  const t = AC.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(AC.destination);
  o.start(t);
  o.stop(t + d);
}

function noise(d: number, v: number, fq: number) {
  if (!AC || muted) return;
  const n = Math.floor(AC.sampleRate * d);
  const b = AC.createBuffer(1, n, AC.sampleRate);
  const a = b.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource();
  const f = AC.createBiquadFilter();
  const g = AC.createGain();
  s.buffer = b;
  f.type = 'bandpass';
  f.frequency.value = fq;
  g.gain.value = v;
  s.connect(f);
  f.connect(g);
  g.connect(AC.destination);
  s.start();
}

export const SFX = {
  swing: () => noise(0.12, 0.07, 1800),
  slashHeavy: () => {
    noise(0.18, 0.14, 1300);
    tone(180, 0.16, 'sawtooth', 0.06, -90);
  },
  bow: () => {
    tone(290, 0.14, 'triangle', 0.08, -140);
    noise(0.08, 0.08, 3200);
  },
  cast: () => {
    tone(520, 0.24, 'sine', 0.07, 360);
    tone(780, 0.2, 'triangle', 0.04, 180);
  },
  arcaneHit: () => {
    tone(420, 0.18, 'triangle', 0.08, -220);
    noise(0.12, 0.11, 2400);
  },
  gunshot: () => {
    noise(0.18, 0.26, 950);
    tone(140, 0.15, 'sawtooth', 0.08, -100);
  },
  glass: () => {
    noise(0.12, 0.15, 5200);
    tone(1420, 0.1, 'sine', 0.04, -500);
  },
  equip: () => {
    tone(660, 0.14, 'triangle', 0.06, 220);
    tone(990, 0.2, 'sine', 0.05);
  },
  hit: () => {
    noise(0.1, 0.16, 700);
    tone(110, 0.1, 'square', 0.04);
  },
  hurt: () => {
    noise(0.18, 0.18, 400);
    tone(90, 0.2, 'sawtooth', 0.05, -40);
  },
  roll: () => noise(0.2, 0.05, 500),
  handbell: () => {
    tone(1320, 0.5, 'sine', 0.05);
    tone(1980, 0.35, 'sine', 0.025);
  },
  growl: () => {
    tone(95, 0.35, 'sawtooth', 0.06, -35);
    noise(0.3, 0.05, 300);
  },
  bark: () => {
    tone(180, 0.12, 'sawtooth', 0.08, -80);
    noise(0.1, 0.08, 900);
  },
  snip: () => {
    noise(0.04, 0.1, 6000);
    tone(2400, 0.05, 'square', 0.02);
  },
  hiss: () => noise(0.7, 0.06, 2600),
  chomp: () => {
    noise(0.09, 0.2, 500);
    tone(70, 0.12, 'square', 0.07);
  },
  chain: () => {
    noise(0.25, 0.1, 3800);
    tone(900, 0.08, 'square', 0.02);
  },
  groan: () => tone(120, 0.5, 'sawtooth', 0.05, -60),
  crack: () => {
    noise(0.2, 0.2, 2200);
    tone(300, 0.25, 'square', 0.05, -200);
  },
  shriek: () => tone(700, 0.5, 'sawtooth', 0.04, 500),
  block: () => {
    noise(0.08, 0.22, 2600);
    tone(240, 0.08, 'square', 0.04);
  },
  parry: () => {
    tone(1040, 0.22, 'triangle', 0.09, 260);
    tone(1560, 0.28, 'sine', 0.06);
    noise(0.06, 0.18, 4200);
  },
  heal: () => tone(520, 0.3, 'sine', 0.06, 260),
  bell: () => {
    tone(196, 2.4, 'sine', 0.12);
    tone(392.5, 1.7, 'sine', 0.05);
    tone(587, 1.1, 'sine', 0.03);
  },
  die: () => tone(150, 1.3, 'sawtooth', 0.06, -110),
  soul: () => tone(880, 0.3, 'sine', 0.04, 420),
  light: () => {
    noise(0.5, 0.06, 900);
    tone(260, 0.6, 'sine', 0.05, 130);
  },
  slam: () => {
    noise(0.35, 0.25, 160);
    tone(60, 0.4, 'sine', 0.14, -25);
  },
  special: () => {
    tone(320, 0.35, 'triangle', 0.09, 360);
    tone(640, 0.55, 'sine', 0.06, -180);
    noise(0.45, 0.14, 2400);
  },
  meteor: () => {
    noise(0.45, 0.28, 220);
    tone(88, 0.65, 'sawtooth', 0.12, -55);
  },
  evade: () => {
    tone(740, 0.16, 'sine', 0.06, 480);
    tone(1120, 0.22, 'triangle', 0.05, 320);
    noise(0.08, 0.07, 4200);
  },
  lore: () => {
    tone(392, 0.8, 'sine', 0.06);
    tone(587.33, 1.1, 'triangle', 0.05);
    tone(784, 1.3, 'sine', 0.035);
  },
  laser: () => {
    tone(180, 0.45, 'sawtooth', 0.11, 240);
    noise(0.35, 0.18, 1900);
  },
  fire: () => {
    noise(0.22, 0.15, 900);
    tone(220, 0.24, 'sawtooth', 0.08, -95);
    tone(330, 0.16, 'triangle', 0.05, 110);
  },
  eruption: () => {
    noise(0.42, 0.25, 360);
    tone(78, 0.48, 'sawtooth', 0.13, -38);
    tone(156, 0.34, 'triangle', 0.08, 160);
  },
  thunder: () => {
    noise(0.65, 0.28, 220);
    tone(64, 0.72, 'sawtooth', 0.14, -32);
  },
  lightning: () => {
    noise(0.2, 0.24, 3800);
    tone(980, 0.16, 'sawtooth', 0.09, -620);
    tone(1420, 0.12, 'square', 0.04, -900);
  },
  zoneTransition: () => {
    tone(220, 1.1, 'sine', 0.07, 110);
    tone(329.63, 1.2, 'triangle', 0.05, 165);
    noise(0.55, 0.08, 620);
  },
  quest: () => {
    tone(440, 0.25, 'triangle', 0.07);
    tone(554.37, 0.35, 'triangle', 0.07);
    tone(659.25, 0.55, 'sine', 0.08);
  },
  karmaLight: () => {
    tone(523.25, 0.45, 'sine', 0.07, 130);
    tone(783.99, 0.75, 'sine', 0.06, 200);
    tone(1046.5, 0.9, 'triangle', 0.04);
  },
  karmaDark: () => {
    tone(164.81, 0.65, 'sawtooth', 0.08, -70);
    tone(233.08, 0.55, 'triangle', 0.06, -90);
    noise(0.35, 0.12, 420);
  },
  cosmic: () => {
    tone(440, 0.45, 'sine', 0.08, 360);
    tone(660, 0.55, 'triangle', 0.05, 220);
    noise(0.28, 0.12, 2600);
  },
  acid: () => {
    noise(0.32, 0.16, 1750);
    tone(260, 0.25, 'sawtooth', 0.06, -130);
  },
  npcChime: () => {
    tone(587.33, 0.22, 'sine', 0.05);
    tone(880, 0.32, 'sine', 0.04);
  },
  witchLaugh: () => {
    [620, 540, 680, 490].forEach((f, idx) => {
      window.setTimeout(() => tone(f, 0.14, 'sawtooth', 0.045, -80), idx * 95);
    });
  },
};

