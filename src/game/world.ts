import { G, NZ, WORLD, ZONE } from './constants';
import type { ArenaDef, EnemyId, LootChest, NpcDef, Point, SolidSeg } from './types';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rnd = (a = 1, b?: number) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const seeded = (s: number) => () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};

const SOL0: SolidSeg[] = [
  { x: 0, w: 1500, y: 440 },
  { x: 1620, w: 980, y: 440 },
  { x: 2600, w: 600, y: 380 },
  { x: 3330, w: 970, y: 380 },
  { x: 4300, w: 900, y: 440 },
  { x: 5330, w: 1830, y: 440 },
];
const PLAT0: SolidSeg[] = [
  { x: 900, w: 120, y: 345 },
  { x: 1900, w: 170, y: 340 },
  { x: 2760, w: 120, y: 285 },
  { x: 3600, w: 180, y: 280 },
  { x: 4600, w: 170, y: 340 },
  { x: 5420, w: 130, y: 345 },
];
const BRAZ0: Point[] = [
  { x: 150, y: 440 },
  { x: 3420, y: 380 },
  { x: 6060, y: 440 },
];
const SHARD0: Point[] = [
  { x: 930, y: 345 },
  { x: 2790, y: 285 },
  { x: 5455, y: 345 },
  { x: 4060, y: 380 },
];

export const SOL: SolidSeg[] = [];
export const PLAT: SolidSeg[] = [];
export const BRAZ: Point[] = [];
export const SHARDS: Point[] = [];

for (let k = 0; k < NZ; k++) {
  const shift = <T extends { x: number }>(arr: T[]) => arr.map((s) => ({ ...s, x: s.x + k * ZONE }));
  const walk: SolidSeg[] = [
    {x:0,w:2480,y:440},
    ...Array.from({length:12},(_,i)=>({x:2480+i*10,w:10,y:435-i*5})),
    {x:2600,w:1700,y:380},
    ...Array.from({length:12},(_,i)=>({x:4300+i*10,w:10,y:385+i*5})),
    {x:4420,w:2740,y:440},
  ];
  SOL.push(...shift(walk));
  PLAT.push(...shift(PLAT0));
  BRAZ.push(...shift(BRAZ0));
  SHARDS.push(...shift(SHARD0));
}

export const LOOT_SPAWNS: Omit<LootChest, 'opened'>[] = [
  // Região 0 — Velmora
  { id: 'w_machado', x: 985, y: 345, zone: 0, kind: 'weapon', itemId: 'machado_velmora' },
  { id: 'w_besta', x: 2845, y: 285, zone: 0, kind: 'weapon', itemId: 'besta_prata' },
  { id: 's_vigilia', x: 3780, y: 380, zone: 0, kind: 'shield', itemId: 2 },
  { id: 'a_bastilha', x: 4460, y: 440, zone: 0, kind: 'armor', itemId: 'placa_bastilha' },

  // Região 1 — Catedral Submersa
  { id: 'w_foice', x: ZONE + 985, y: 345, zone: 1, kind: 'weapon', itemId: 'foice_lunar' },
  { id: 'w_esporos', x: ZONE + 2845, y: 285, zone: 1, kind: 'weapon', itemId: 'cetro_esporos' },
  { id: 'a_sangue', x: ZONE + 3690, y: 280, zone: 1, kind: 'armor', itemId: 'cota_sangue' },
  { id: 'w_incensario', x: ZONE + 4685, y: 340, zone: 1, kind: 'weapon', itemId: 'incensario_abissal' },
  { id: 's_muralha', x: ZONE + 5515, y: 345, zone: 1, kind: 'shield', itemId: 3 },

  // Região 2 — Salão da Coroa Velada
  { id: 'w_arco_carm', x: 2 * ZONE + 985, y: 345, zone: 2, kind: 'weapon', itemId: 'arco_carmesim' },
  { id: 'w_montante', x: 2 * ZONE + 2845, y: 285, zone: 2, kind: 'weapon', itemId: 'montante_carrasco' },
  { id: 'w_eclipse', x: 2 * ZONE + 4685, y: 340, zone: 2, kind: 'weapon', itemId: 'cajado_eclipse' },
  { id: 'a_eclipse', x: 2 * ZONE + 5515, y: 345, zone: 2, kind: 'armor', itemId: 'mortalha_eclipse' },

  // Região 3 & 4 — Lago / Altar Astral
  { id: 'a_brasas', x: 3 * ZONE + 1985, y: 340, zone: 3, kind: 'armor', itemId: 'manto_brasas' },
  { id: 'w_profana', x: 3 * ZONE + 2845, y: 285, zone: 3, kind: 'weapon', itemId: 'tocha_profana' },

  // Região 5..9 — Novas Terras de Velmora
  { id: 'w_katana_cain', x: 6 * ZONE + 985, y: 345, zone: 6, kind: 'weapon', itemId: 'katana_cainhurst' },
  { id: 'a_cainhurst', x: 6 * ZONE + 4685, y: 340, zone: 6, kind: 'armor', itemId: 'traje_cainhurst' },
  { id: 'w_trovao', x: 7 * ZONE + 2845, y: 285, zone: 7, kind: 'weapon', itemId: 'lamina_trovao' },
  { id: 'w_arco_estelar', x: 8 * ZONE + 985, y: 345, zone: 8, kind: 'weapon', itemId: 'arco_estelar' },
  { id: 'w_olho_coro', x: 8 * ZONE + 4685, y: 340, zone: 8, kind: 'weapon', itemId: 'olho_coro' },
  { id: 'a_coro', x: 8 * ZONE + 5515, y: 345, zone: 8, kind: 'armor', itemId: 'veste_coro' },

  // Runas ocultas pelas 10 regiões
  { id: 'r_cacador', x: 1985, y: 340, zone: 0, kind: 'rune', itemId: 'runa_cacador' },
  { id: 'r_brasa', x: ZONE + 1985, y: 340, zone: 1, kind: 'rune', itemId: 'runa_brasa' },
  { id: 'r_ferro', x: 2 * ZONE + 3690, y: 280, zone: 2, kind: 'rune', itemId: 'runa_ferro' },
  { id: 'r_sangue', x: 3 * ZONE + 985, y: 345, zone: 3, kind: 'rune', itemId: 'runa_sangue' },
  { id: 'r_abismo', x: 4 * ZONE + 4685, y: 340, zone: 4, kind: 'rune', itemId: 'runa_abismo' },
  { id: 'r_alvor', x: 5 * ZONE + 2845, y: 285, zone: 5, kind: 'rune', itemId: 'runa_alvor' },
  { id: 'r_pesadelo', x: 9 * ZONE + 3690, y: 280, zone: 9, kind: 'rune', itemId: 'runa_pesadelo' },
];

export const ZONE_NAMES = [
  'Velmora · Ruas da Meia-Noite',
  'Esgotos da Catedral',
  'Salão da Coroa Velada',
  'Lago da Névoa Vazia',
  'Altar do Pesadelo Astral',
  'Bosque dos Enforcados',
  'Castelo de Cainhurst',
  'Subsolos de Yahar’gul',
  'Câmara do Coro Celeste',
  'Sótão de Mergo · Lua Vermelha',
];

export const ZONE_SUBTITLES = [
  'Onde o primeiro sino despertou o sangue cinzento',
  'Degraus alagados ecoando cânticos submersos',
  'Estandartes carmesins sob o eclipse imóvel',
  'Espelho prateado que separa sonho e abismo',
  'Antenas de ferro voltadas às estrelas',
  'Lanternas de costelas e olhos vigiando a bruma',
  'Torres congeladas da nobreza esquecida',
  'Sinos proibidos fundem ossos e relâmpagos',
  'O santuário mais alto acima da catedral',
  'Onde o Karma sela o último amanhecer de Velmora',
];

export const ARENAS: ArenaDef[] = [
  { x0: 0 * ZONE + 6200, x1: 1 * ZONE, boss: 'madre', zoneName: ZONE_NAMES[0] },
  { x0: 1 * ZONE + 6200, x1: 2 * ZONE, boss: 'santo', zoneName: ZONE_NAMES[1] },
  { x0: 2 * ZONE + 6200, x1: 3 * ZONE, boss: 'rei', zoneName: ZONE_NAMES[2] },
  { x0: 3 * ZONE + 6200, x1: 4 * ZONE, boss: 'rom', zoneName: ZONE_NAMES[3] },
  { x0: 4 * ZONE + 6200, x1: 5 * ZONE, boss: 'amigdala', zoneName: ZONE_NAMES[4] },
  { x0: 5 * ZONE + 6200, x1: 6 * ZONE, boss: 'bruxa', zoneName: ZONE_NAMES[5] },
  { x0: 6 * ZONE + 6200, x1: 7 * ZONE, boss: 'martir', zoneName: ZONE_NAMES[6] },
  { x0: 7 * ZONE + 6200, x1: 8 * ZONE, boss: 'renascido', zoneName: ZONE_NAMES[7] },
  { x0: 8 * ZONE + 6200, x1: 9 * ZONE, boss: 'ebrietas', zoneName: ZONE_NAMES[8] },
  { x0: 9 * ZONE + 6200, x1: 10 * ZONE, boss: 'ama', zoneName: ZONE_NAMES[9] },
];

export const FIELD_BOSS_SPAWNS: { id: string; type: 'cacador' | 'fera'; x: number; zone: number }[] = [
  { id: 'field_malakor', type: 'cacador', x: 4620, zone: 0 },
  { id: 'field_fera', type: 'fera', x: ZONE + 4620, zone: 1 },
];

export const NPCS: NpcDef[] = [
  {
    id: 'npc_eileen',
    name: 'Eileen, a Corva da Vigília',
    title: 'Caçadora de Caçadores',
    zone: 0,
    x: 280,
    y: 440,
    coat: '#1e1c24',
    trim: '#9eb4c2',
    accent: '#9ed7f0',
    hat: 'crow',
    targetFieldBoss: 'field_malakor',
    questTitle: 'A Caçada do Vigário',
    questObjective: 'Derrote o Vigário Malakor na ponte leste de Velmora e retorne com seu voto.',
    introText:
      'Ah, mais uma raposa desperta na névoa... Escute bem: o Vigário Malakor enlouqueceu na ponte adiante. Seus olhos já brilham com o frenesi das feras. Dê fim ao seu tormento e volte até mim — e decida o que fazer com a memória dele.',
    activeText:
      'Malakor patrulha a ponte além da segunda fogueira de Velmora. Derrube-o antes que o cheiro de sangue domine toda a rua.',
    readyText:
      'Senti o estalar da lâmina até aqui... Malakor descansou, enfim. Agora escolha o selo que sua vigília carregará:',
    completedLightText: 'Que as penas da Corva protejam teus passos rumo ao amanhecer, caçadora.',
    completedDarkText: 'Tua lâmina bebeu fundo hoje... cuidado para não se tornar aquilo que caçamos.',
    choices: [
      {
        id: 'eileen_light',
        label: 'Honrar o antigo voto de Malakor (+25 Luz)',
        sublabel: 'Purificar a memória do caçador e receber cinzas abençoadas',
        karmaDelta: 25,
        rewardCinzas: 850,
        rewardLore: 'reliquias_ordem',
        outcomeText: 'Você acende um incenso pelo velho vigário. Eileen inclina o bico de prata em respeito.',
        nextStatus: 'completed_light',
      },
      {
        id: 'eileen_dark',
        label: 'Extrair o sangue feral da lâmina (-25 Abismo)',
        sublabel: 'Absorver a sede de sangue para ganhar poder brutal',
        karmaDelta: -25,
        rewardCinzas: 1400,
        outcomeText: 'Você sorve a brasa carmesim caída do machado. Eileen recua um passo, silenciosa.',
        nextStatus: 'completed_dark',
      },
    ],
  },
  {
    id: 'npc_alfred',
    name: 'Irmão Alfred, o Peregrino Cego',
    title: 'Guardião do Véu',
    zone: 3,
    x: 3 * ZONE + 3520,
    y: 380,
    coat: '#2e2b26',
    trim: '#f6d27a',
    accent: '#f6d27a',
    hat: 'hood',
    targetBossIdx: 2,
    questTitle: 'A Queda da Coroa Velada',
    questObjective: 'Derrote o Rei Sob a Pele no Salão da Coroa e julgue o trono.',
    introText:
      'O lago reflete um céu que tenta nos enganar... Três máscaras governavam o Salão atrás de nós. Se já derrubaste — ou quando derrubares — o Rei Sob a Pele, traze-me o eco de sua coroa para selar o destino deste espelho.',
    activeText:
      'O Rei Sob a Pele aguarda no fundo do Salão da Coroa Velada. Somente após sua queda o lago ouvirá nossa prece.',
    readyText:
      'As três máscaras racharam! Sinto o vento livre soprar sobre as águas. O que faremos com os restos da coroa real?',
    completedLightText: 'A bênção do Alvor repousa sobre tua lanterna. Segue além do lago, vigilante.',
    completedDarkText: 'As águas ficaram escuras como vinho antigo... Que os Antigos respondam ao teu chamado.',
    choices: [
      {
        id: 'alfred_light',
        label: 'Consagrar o espelho lunar (+25 Luz)',
        sublabel: 'Receber a Runa do Alvor Dourado e +1500 Cinzas',
        karmaDelta: 25,
        rewardCinzas: 1500,
        rewardRune: 'runa_alvor',
        outcomeText: 'Uma luz dourada percorre o lago imóvel. O cego sorri sob o capuz.',
        nextStatus: 'completed_light',
      },
      {
        id: 'alfred_dark',
        label: 'Quebrar o selo para despertar o sangue (-25 Abismo)',
        sublabel: 'Receber +2800 Cinzas manchadas pelo eclipse',
        karmaDelta: -25,
        rewardCinzas: 2800,
        outcomeText: 'A água ferve em vermelho por um instante. Alfred baixa a cabeça em temor.',
        nextStatus: 'completed_dark',
      },
    ],
  },
  {
    id: 'npc_annalise',
    name: 'Annalise, Dama de Cainhurst',
    title: 'Herdeira do Trono Gelado',
    zone: 6,
    x: 6 * ZONE + 280,
    y: 440,
    coat: '#3d1522',
    trim: '#e4e8f0',
    accent: '#e05348',
    hat: 'crown',
    targetBossIdx: 6,
    questTitle: 'Juramento de Cainhurst',
    questObjective: 'Vença Mártir Logarius nos telhados de Cainhurst e retorne à Dama.',
    introText:
      'Poucos ousam pisar nestas neves... Logarius mantém o selo fechado com seu cadáver flamejante no cume deste castelo. Derruba o mártir e retorna diante de mim — ou para libertar minha linhagem à luz, ou para beber o sangue real.',
    activeText:
      'Mártir Logarius ainda empunha sua foice escarlate no limite leste de Cainhurst.',
    readyText:
      'O gelo cedeu e o selo de Logarius quebrou-se! Ajoelha-te, raposa... qual será teu voto diante do trono de Cainhurst?',
    completedLightText: 'Foste justa até com os amaldiçoados. Carrega nossa lâmina em honra.',
    completedDarkText: 'O sangue real corre agora em tuas veias... ninguém deterá tua ascensão.',
    choices: [
      {
        id: 'annalise_light',
        label: 'Libertar as almas de Cainhurst (+30 Luz)',
        sublabel: 'Purificar o castelo e receber a Armadura Real de Cainhurst',
        karmaDelta: 30,
        rewardCinzas: 3200,
        rewardArmor: 'traje_cainhurst',
        outcomeText: 'As bandeiras congeladas estremecem sob um sopro cálido de alívio.',
        nextStatus: 'completed_light',
      },
      {
        id: 'annalise_dark',
        label: 'Selar o Pacto do Sangue Vil (-30 Abismo)',
        sublabel: 'Receber a Chikage de Cainhurst e +3800 Cinzas',
        karmaDelta: -30,
        rewardCinzas: 3800,
        rewardWeapon: 'katana_cainhurst',
        outcomeText: 'Goticulas escarlates envolvem a lâmina real. Você jura fidelidade à Lua Sangrenta.',
        nextStatus: 'completed_dark',
      },
    ],
  },
  {
    id: 'npc_mensageiro',
    name: 'Erudito Arrependido do Sótão',
    title: 'Testemunha do Eclipse',
    zone: 9,
    x: 9 * ZONE + 5920,
    y: 440,
    coat: '#262032',
    trim: '#c98cf2',
    accent: '#c98cf2',
    hat: 'cage',
    targetBossIdx: 8,
    questTitle: 'Última Palavra Antes do Berço',
    questObjective: 'Derrote Ebrietas na Câmara do Coro Celeste e faça sua escolha final.',
    introText:
      'Estamos diante do último véu... A Aia da Lua Vermelha guarda o fim de tudo logo além da névoa. Antes de entrar, prova que venceste Ebrietas, a Filha do Cosmos, e dize-me que destino desejas para Velmora.',
    activeText:
      'Ebrietas ainda chora na Câmara do Coro Celeste. Só quem a enfrentou compreende o peso dos Antigos.',
    readyText:
      'Ouvi o lamento das estrelas cessar... A última porta está diante de nós. Qual é a intenção do teu coração para o desfecho final?',
    completedLightText: 'Então derruba a Aia e devolve o sol a Velmora!',
    completedDarkText: 'Que o berço cósmico se abra para a tua ascensão sob a Lua Vermelha...',
    choices: [
      {
        id: 'mensageiro_light',
        label: 'Despertar Velmora para o Amanhecer (+30 Luz)',
        sublabel: 'Inclinar o Karma para o final do Alvor Purificado',
        karmaDelta: 30,
        rewardCinzas: 5000,
        outcomeText: 'A lanterna brilha como ouro vivo contra a lua vermelha.',
        nextStatus: 'completed_light',
      },
      {
        id: 'mensageiro_neutral',
        label: 'Manter a vigília eterna na névoa (Equilíbrio)',
        sublabel: 'Conservar o equilíbrio entre Luz e Abismo (+4500 Cinzas)',
        karmaDelta: 0,
        rewardCinzas: 4500,
        outcomeText: 'Você ajusta o sobretudo e silencia a gaiola do erudito sem inclinar a balança.',
        nextStatus: 'completed_neutral',
      },
      {
        id: 'mensageiro_dark',
        label: 'Reivindicar os Olhos dos Antigos (-30 Abismo)',
        sublabel: 'Inclinar o Karma para o final da Lua Sangrenta (+Runa)',
        karmaDelta: -30,
        rewardCinzas: 5000,
        rewardRune: 'runa_pesadelo',
        outcomeText: 'Olhos invisíveis abrem-se na névoa ao redor da tua silhueta.',
        nextStatus: 'completed_dark',
      },
    ],
  },
];

const ZSPAWN: [EnemyId, number][][] = [
  // 0: Velmora
  [
    ['peregrino', 520],
    ['peregrino', 820],
    ['peregrino', 1180],
    ['cao', 1380],
    ['cao', 1440],
    ['atirador', 1760],
    ['costureira', 2090],
    ['peregrino', 2260],
    ['cao', 2420],
    ['alquimista', 2520],
    ['peregrino', 2880],
    ['costureira', 3090],
    ['peregrino', 3560],
    ['atirador', 3880],
    ['cao', 3990],
    ['carrasco', 4210],
    ['cao', 5060],
    ['atirador', 5200],
    ['peregrino', 5560],
    ['carrasco', 5880],
  ],
  // 1: Catedral Submersa
  [
    ['peregrino', 520],
    ['cao', 700],
    ['alquimista', 820],
    ['costureira', 1150],
    ['atirador', 1360],
    ['gargula', 1650],
    ['viuva', 1920],
    ['peregrino', 2260],
    ['carrasco', 2480],
    ['costureira', 2900],
    ['gargula', 3100],
    ['peregrino', 3560],
    ['viuva', 3900],
    ['alquimista', 4150],
    ['gargula', 5220],
    ['carrasco', 5520],
    ['cavaleiro', 5720],
    ['viuva', 5880],
  ],
  // 2: Salão da Coroa Velada
  [
    ['peregrino', 480],
    ['atirador', 620],
    ['cavaleiro', 900],
    ['cao', 1250],
    ['gargula', 1380],
    ['costureira', 1500],
    ['viuva', 1850],
    ['sentinela', 2250],
    ['alquimista', 2480],
    ['cavaleiro', 2900],
    ['costureira', 3100],
    ['cao', 3600],
    ['atirador', 3760],
    ['gargula', 3960],
    ['viuva', 4090],
    ['sentinela', 4320],
    ['peregrino', 4560],
    ['alquimista', 4740],
    ['cao', 5020],
    ['carrasco', 5480],
    ['sentinela', 5720],
    ['cavaleiro', 5900],
  ],
  // 3: Lago da Névoa Vazia
  [
    ['peregrino', 520],
    ['gargula', 760],
    ['alquimista', 980],
    ['emissario', 1240],
    ['viuva', 1420],
    ['atirador', 1660],
    ['cavaleiro', 1960],
    ['gargula', 2300],
    ['sentinela', 2620],
    ['costureira', 2960],
    ['emissario', 3180],
    ['gargula', 3820],
    ['viuva', 4120],
    ['sentinela', 4460],
    ['cavaleiro', 4820],
    ['atirador', 5140],
    ['carrasco', 5480],
    ['sentinela', 5840],
  ],
  // 4: Altar do Pesadelo Astral
  [
    ['sentinela', 540],
    ['atirador', 780],
    ['monge_gaiola', 1020],
    ['gargula', 1220],
    ['cavaleiro', 1460],
    ['viuva', 1760],
    ['emissario', 2080],
    ['sentinela', 2420],
    ['gargula', 2780],
    ['monge_gaiola', 3060],
    ['viuva', 3640],
    ['cavaleiro', 3960],
    ['sentinela', 4280],
    ['gargula', 4620],
    ['atirador', 4940],
    ['cavaleiro', 5580],
  ],
  // 5: Bosque dos Enforcados
  [
    ['cao', 500],
    ['lobisomem', 820],
    ['atirador', 1120],
    ['costureira', 1420],
    ['lobisomem', 1780],
    ['sombra', 2140],
    ['alquimista', 2460],
    ['lobisomem', 2820],
    ['viuva', 3090],
    ['cao', 3640],
    ['sombra', 3960],
    ['carrasco', 4320],
    ['lobisomem', 4680],
    ['gargula', 5060],
    ['sombra', 5520],
    ['carrasco', 5820],
  ],
  // 6: Castelo de Cainhurst
  [
    ['gargula', 560],
    ['sentinela', 860],
    ['sombra', 1200],
    ['atirador', 1450],
    ['lobisomem', 1820],
    ['gargula', 2140],
    ['sentinela', 2480],
    ['viuva', 2840],
    ['sombra', 3100],
    ['sentinela', 3660],
    ['gargula', 4020],
    ['cavaleiro', 4380],
    ['sombra', 4740],
    ['lobisomem', 5120],
    ['sentinela', 5560],
    ['sombra', 5840],
  ],
  // 7: Ossuário de Yahar'gul
  [
    ['peregrino', 520],
    ['besta_eletrica', 880],
    ['monge_gaiola', 1220],
    ['carrasco', 1520],
    ['besta_eletrica', 1940],
    ['alquimista', 2280],
    ['cavaleiro', 2620],
    ['sombra', 2980],
    ['besta_eletrica', 3680],
    ['viuva', 4020],
    ['monge_gaiola', 4360],
    ['carrasco', 4740],
    ['besta_eletrica', 5140],
    ['sentinela', 5560],
    ['monge_gaiola', 5840],
  ],
  // 8: Câmara do Coro Celeste
  [
    ['emissario', 560],
    ['monge_gaiola', 920],
    ['gargula', 1260],
    ['emissario', 1620],
    ['sentinela', 1980],
    ['sombra', 2360],
    ['emissario', 2740],
    ['besta_eletrica', 3060],
    ['emissario', 3660],
    ['monge_gaiola', 4020],
    ['cavaleiro', 4420],
    ['gargula', 4780],
    ['emissario', 5140],
    ['sentinela', 5540],
    ['sombra', 5840],
  ],
  // 9: Sótão de Mergo & Lua Vermelha (último braseiro x=6060 permanece pacífico!)
  [
    ['sombra', 540],
    ['lobisomem', 860],
    ['monge_gaiola', 1220],
    ['besta_eletrica', 1620],
    ['sentinela', 2020],
    ['emissario', 2400],
    ['sombra', 2780],
    ['gargula', 3080],
    ['lobisomem', 3640],
    ['besta_eletrica', 4020],
    ['monge_gaiola', 4420],
    ['sentinela', 4780],
    ['sombra', 5140],
  ],
];

export const supported = (x: number, y: number) =>
  SOL.some((s) => x >= s.x && x <= s.x + s.w && Math.abs(s.y - y) < 3) ||
  PLAT.some((s) => x >= s.x && x <= s.x + s.w && Math.abs(s.y - y) < 3);

export const groundAt = (x: number) => {
  for (const s of SOL) {
    if (x >= s.x && x <= s.x + s.w) return s.y;
  }
  return null;
};

export const SPAWNS: [EnemyId, number, number, number][] = [];
ZSPAWN.forEach((list, k) =>
  list.forEach(([t, x]) => {
    const gx = x + k * ZONE;
    SPAWNS.push([t, gx, groundAt(gx) ?? 440, k]);
  })
);

export function moveEntity(
  e: { x: number; y: number; vx: number; vy: number; hw: number; onGround: boolean },
  dt: number
) {
  const px = e.x;
  e.x += e.vx * dt;
  // Climb shallow stair risers by walking; retain gravity on ledges and ladders.
  if(e.onGround) {
    const next = groundAt(e.x + Math.sign(e.vx)*e.hw);
    if(next !== null && next < e.y && e.y-next <= 16) e.y=next;
  }
  for (const s of SOL) {
    if (e.y > s.y + 0.5 && e.x + e.hw > s.x && e.x - e.hw < s.x + s.w) {
      if (px <= s.x) e.x = s.x - e.hw;
      else if (px >= s.x + s.w) e.x = s.x + s.w + e.hw;
      else e.x = px;
      e.vx = 0;
    }
  }
  e.x = clamp(e.x, e.hw, WORLD - e.hw);
  const py = e.y;
  e.vy = Math.min(e.vy + G * dt, 1100);
  e.y += e.vy * dt;
  e.onGround = false;
  if (e.vy >= 0) {
    for (const s of SOL) {
      if (e.x + e.hw > s.x && e.x - e.hw < s.x + s.w && py <= s.y + 0.5 && e.y >= s.y) {
        e.y = s.y;
        e.vy = 0;
        e.onGround = true;
      }
    }
    for (const s of PLAT) {
      if (e.x + e.hw > s.x && e.x - e.hw < s.x + s.w && py <= s.y + 0.5 && e.y >= s.y) {
        e.y = s.y;
        e.vy = 0;
        e.onGround = true;
      }
    }
  }
}

export interface BuildingLayerItem {
  x: number;
  w: number;
  h: number;
  sp: boolean;
  wins?: [number, number, boolean][];
}

export interface DecorItem {
  type: 'tree' | 'grave' | 'fence' | 'lamp';
  x: number;
  y: number;
  segs: [number, number, number, number, number][] | null;
  v: number;
}

export const farLayer: BuildingLayerItem[] = [];
export const midLayer: BuildingLayerItem[] = [];
export const decorItems: DecorItem[] = [];

const R = seeded(11);
for (let x = 0; x < 2400; ) {
  const w = 40 + R() * 70;
  farLayer.push({ x, w, h: 90 + R() * 190, sp: R() < 0.6 });
  x += w + R() * 30;
}
for (let x = 0; x < 2400; ) {
  const w = 70 + R() * 110;
  midLayer.push({
    x,
    w,
    h: 110 + R() * 190,
    sp: R() < 0.45,
    wins: [
      [R(), R(), R() < 0.4],
      [R(), R(), R() < 0.3],
      [R(), R(), R() < 0.3],
    ],
  });
  x += w - 4 + R() * 50;
}

function mkTree() {
  const segs: [number, number, number, number, number][] = [];
  (function br(x: number, y: number, a: number, l: number, w: number, dp: number) {
    const x2 = x + Math.cos(a) * l;
    const y2 = y + Math.sin(a) * l;
    segs.push([x, y, x2, y2, w]);
    if (dp > 0) {
      br(x2, y2, a - 0.35 - R() * 0.4, l * 0.7, w * 0.65, dp - 1);
      br(x2, y2, a + 0.3 + R() * 0.4, l * 0.72, w * 0.65, dp - 1);
    }
  })(0, 0, -Math.PI / 2 + (R() - 0.5) * 0.3, 36 + R() * 22, 6, 3);
  return segs;
}

for (let x = 70; x < WORLD - 40; x += 80 + R() * 90) {
  const s = SOL.find((seg) => x > seg.x + 30 && x < seg.x + seg.w - 30);
  if (!s) continue;
  if (BRAZ.some((b) => Math.abs(b.x - x) < 70)) continue;
  const r = R();
  const type: DecorItem['type'] = r < 0.25 ? 'tree' : r < 0.5 ? 'grave' : r < 0.78 ? 'fence' : 'lamp';
  decorItems.push({
    type,
    x,
    y: s.y,
    segs: type === 'tree' ? mkTree() : null,
    v: R(),
  });
}
