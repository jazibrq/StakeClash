import React, { useRef, useEffect, useState, useCallback } from 'react';

/* ─── types ─────────────────────────────────────────────────── */

type PState = 'idle' | 'running' | 'attacking' | 'dead';
type EState = 'running' | 'attacking' | 'dying' | 'dead';

interface Vec2 { x: number; y: number; }

interface Player extends Vec2 {
  vx: number; vy: number;
  hp: number;
  state:          PState;
  frameIndex:     number;
  animTimer:      number;    // ms accumulated in current frame
  attackCooldown: number;    // ms remaining before next melee
  facing:         1 | -1;   // 1 = right, -1 = left
  damageDealt:    boolean;   // melee burst fired this swing
  shieldActive:   boolean;
  shieldTimer:    number;    // ms of shield remaining
  shieldCooldown: number;    // ms until shield can be used again
  dashActive:     boolean;
  dashTimer:      number;    // ms of dash remaining
  dashCooldown:   number;    // ms until dash can be used again
}

interface Enemy extends Vec2 {
  id: number;
  hp: number;
  type:              'knight' | 'mage' | 'skeleton' | 'kitsune' | 'boss' | 'minotaur_boss';
  state:             EState;
  frameIndex:        number;
  animTimer:         number;
  facing:            1 | -1;
  damageDealt:       boolean;  // knight: whether this attack swing dealt damage
  attackCooldown:    number;   // mage: ms remaining before next ranged attack
  projectileSpawned: boolean;  // mage: projectile fired this attack cycle
}

interface Projectile {
  id:     number;
  x:      number; y:  number;
  vx:     number; vy: number;
  radius: number;
  done:   boolean;
}

interface KitsuneBeam {
  id:          number;
  ox:          number; oy: number;   // origin position
  dx:          number; dy: number;   // normalised direction
  life:        number;               // seconds remaining
  length:      number;               // current beam extent (px) — grows over time
  maxLength:   number;               // full length to screen edge
  damageDealt: boolean;
}

interface Particle extends Vec2 {
  id: number; vx: number; vy: number;
  life: number; r: number; color: string;
}

interface GS {
  player:           Player;
  enemies:          Enemy[];
  particles:        Particle[];
  enemyProjectiles: Projectile[];
  kitsuneBeams:     KitsuneBeam[];
  keys:             Record<string, boolean>;
  timer:            number;
  lastSpawn:        number;
  running:          boolean;
  uid:              number;
  wave:             1 | 2 | 3;
  waveAnnounceTimer: number;
  bossSpawned:         boolean;
  minotaurRageTimer:    number;   // seconds until rage fires; -1 = idle
  minotaurEnrageTimer:  number;   // seconds remaining on enrage buff (0 = not enraged)
  playerParalyzeTimer:  number;   // seconds of post-rage paralysis remaining
}

interface AfterimageState {
  x: number; y: number;
  alpha: number;        // starts at ~0.55, fades to 0
  fadeRate: number;     // alpha drained per second — origin fast, near-dest slow
  state: PState;
  frameIndex: number;
  facing: 1 | -1;
}

type PlayerSprites   = Record<PState, HTMLImageElement | null>;
type KnightSprites   = Record<'running' | 'attacking' | 'dead', HTMLImageElement | null>;
type MageSprites     = Record<'run' | 'attack' | 'death', HTMLImageElement | null>;
type SkeletonSprites = Record<'run' | 'attack' | 'death', HTMLImageElement | null>;
type KitsuneSprites     = Record<'run' | 'attack' | 'death', HTMLImageElement | null>;
type MinotaurBossSprites = Record<'walk' | 'attack' | 'death', HTMLImageElement | null>;

/* ─── constants ─────────────────────────────────────────────── */

const GAME_DURATION    = 60;
const PLAYER_RADIUS    = 14;   // hitbox radius
const PLAYER_MAX_HP    = 100;
const PLAYER_SPEED     = 230;
const ENEMY_RADIUS     = 12;
const ENEMY_MAX_HP     = 40;
const ENEMY_BASE_SPEED = 75;
const ENEMY_DAMAGE     = 14;
/* ── wave constants ── */
const WAVE_EASY_END   = 20;   // seconds elapsed before medium wave starts
const WAVE_MEDIUM_END = 40;   // seconds elapsed before hard wave starts
const BOSS_SPAWN_ELAPSED = 42; // spawn boss this many seconds into the game
const BOSS_RENDER_SIZE   = 280; // placeholder boss draw size
const BOSS_HIT_POINTS    = 10;  // hits required to kill boss
const BOSS_DAMAGE        = 30;  // damage boss deals per swing

const RENDER_SIZE        = 160;  // player sprite draw size (px)
const ENEMY_RENDER_SIZE  = 136;  // knight sprite draw size (px) — 85% of player
const MELEE_RADIUS       = 60;   // melee attack reach
const ATTACK_COOLDOWN    = 600;  // ms between melee uses
const CONTACT_RADIUS     = PLAYER_RADIUS + ENEMY_RADIUS;

const SHIELD_DURATION  = 5000;   // ms shield stays active
const SHIELD_COOLDOWN  = 10000;  // ms before shield can be used again

const BLADESTORM_CHARGE_MAX  = 100;  // full bar = 100 charge
const BLADESTORM_PER_KILL    = 20;   // charge gained per enemy kill
const BLADESTORM_PER_BOSS_HIT = 5;  // charge gained per hit on the minotaur boss

/* ── skeleton constants ── */
const SKELETON_RENDER_SIZE     = 136;
const SKELETON_MOVE_SPEED      = 2.8;   // multiplier on base speed
const SKELETON_ATTACK_RANGE    = 55;
const SKELETON_ATTACK_COOLDOWN = 900;   // ms
const SKELETON_CONTACT_DAMAGE  = 15;

/* ── kitsune constants ── */
const KITSUNE_RENDER_SIZE     = 136;
const KITSUNE_MOVE_SPEED      = 1.6;   // multiplier on base speed (slower — ranged)
const KITSUNE_ATTACK_RANGE    = 320;   // px — fires beam from distance
const KITSUNE_ATTACK_COOLDOWN = 1600;  // ms
const KITSUNE_BEAM_DAMAGE      = 14;
const KITSUNE_BEAM_WIDTH       = 6;     // px — collision half-width (skinny)
const KITSUNE_BEAM_DURATION    = 2.0;   // seconds beam stays active (lingers)
const KITSUNE_BEAM_SPEED       = 1400;  // px/s — fast extension to screen edge
const KITSUNE_BEAM_SPAWN_FRAME = 6;     // 0-indexed frame that fires beam

/* ── knight constants ── */
const KNIGHT_HIT_POINTS = 2;   // hits required to kill a knight

/* ── minotaur boss constants ── */
const MINOTAUR_BOSS_RENDER_SIZE      = 180;
const MINOTAUR_BOSS_HITBOX_RADIUS    = 52;  // extra reach added to MELEE_RADIUS when hitting boss
const MINOTAUR_BOSS_MOVE_SPEED       = 0.9;
const MINOTAUR_BOSS_ATTACK_RANGE     = 85;
const MINOTAUR_BOSS_ATTACK_COOLDOWN  = 1800;
const MINOTAUR_BOSS_CONTACT_DAMAGE   = 45;
const MINOTAUR_BOSS_MAX_HP           = 400;
const MINOTAUR_BOSS_PLAYER_MELEE_DMG  = 20;   // player melee damage vs boss (~20 hits to kill)
const MINOTAUR_BOSS_DAMAGE_FRAME      = 3;    // 0-indexed frame that deals damage
const MINOTAUR_RAGE_DELAY             = 3.5;  // seconds after boss spawn before rage triggers
const MINOTAUR_BOSS_ENRAGED_SPEED_MULT = 2.5; // 2.5x speed boost after rage — faster than player

/* ── dash constants ── */
const DASH_DISTANCE = 130;   // px — instant snap displacement
const DASH_DURATION = 230;   // ms — stutter duration after snap
const DASH_COOLDOWN = 1200;  // ms — cooldown after stutter ends

/* ── mage constants ── */
const MAGE_RENDER_SIZE            = 136;  // 85% of player
const MAGE_ATTACK_RANGE           = 300;
const MAGE_ATTACK_COOLDOWN        = 1400;   // ms
const MAGE_PROJECTILE_SPEED       = 240;    // px/s  (4 px/frame × 60 fps)
const MAGE_PROJECTILE_RADIUS      = 6;
const MAGE_PROJECTILE_DAMAGE      = 10;
const MAGE_PROJECTILE_SPAWN_FRAME = 6;      // 0-indexed frame that fires the projectile

/* ── player (samurai) anim config ── */
const ANIM_CONFIG: Record<PState, { frames: number; frameDuration: number; loop: boolean }> = {
  idle:      { frames: 6, frameDuration: 120, loop: true  },
  running:   { frames: 8, frameDuration: 80,  loop: true  },
  attacking: { frames: 4, frameDuration: 70,  loop: false },
  dead:      { frames: 6, frameDuration: 100, loop: false },
};
const MELEE_DAMAGE_START_FRAME = 3; // 0-indexed: damage on last frame of 4-frame attack

/* ── knight anim config ── */
const KNIGHT_ANIM_CONFIG: Record<'running' | 'attacking' | 'dead', { frames: number; frameDuration: number; loop: boolean }> = {
  running:   { frames: 7, frameDuration: 80,  loop: true  },
  attacking: { frames: 5, frameDuration: 90,  loop: true  },
  dead:      { frames: 6, frameDuration: 100, loop: false },
};
const KNIGHT_ATTACK_DAMAGE_FRAME = 3;

/* ── mage anim config ── */
const MAGE_ANIM_CONFIG: Record<'run' | 'attack' | 'death', { frames: number; frameDuration: number; loop: boolean }> = {
  run:    { frames: 8, frameDuration: 90,  loop: true  },
  attack: { frames: 9, frameDuration: 100, loop: false },
  death:  { frames: 4, frameDuration: 110, loop: false },
};

/* ── skeleton anim config (vertical sprite sheets) ── */
const SKELETON_ANIM_CONFIG: Record<'run' | 'attack' | 'death', { frames: number; frameDuration: number; loop: boolean }> = {
  run:    { frames: 6, frameDuration: 90,  loop: true  },
  attack: { frames: 4, frameDuration: 100, loop: false },
  death:  { frames: 5, frameDuration: 110, loop: false },
};
const SKELETON_ATTACK_DAMAGE_FRAME = 3; // 0-indexed

/* ── kitsune anim config (horizontal sprite sheets) ── */
const KITSUNE_ANIM_CONFIG: Record<'run' | 'attack' | 'death', { frames: number; frameDuration: number; loop: boolean }> = {
  run:    { frames: 8,  frameDuration: 90,  loop: true  },
  attack: { frames: 10, frameDuration: 90,  loop: false },
  death:  { frames: 10, frameDuration: 100, loop: false },
};

/* ── minotaur boss anim config (horizontal sprite sheets) ── */
const MINOTAUR_BOSS_ANIM_CONFIG: Record<'walk' | 'attack' | 'death', { frames: number; frameDuration: number; loop: boolean }> = {
  walk:   { frames: 12, frameDuration: 90,  loop: true  },
  attack: { frames: 5,  frameDuration: 120, loop: false },
  death:  { frames: 5,  frameDuration: 130, loop: false },
};

/* ── sprite sheet paths ── */
const PLAYER_SPRITE_FILE: Record<PState, string> = {
  idle:      'Idle',
  running:   'Run',
  attacking: 'Attack',
  dead:      'Dead',
};
const KNIGHT_SPRITE_FILE: Record<'running' | 'attacking' | 'dead', string> = {
  running:   'Run',
  attacking: 'Attack',
  dead:      'Dead',
};
const MAGE_SPRITE_FILE: Record<'run' | 'attack' | 'death', string> = {
  run:    'Run',
  attack: 'Attack',
  death:  'Dead',
};
const SKELETON_SPRITE_FILE: Record<'run' | 'attack' | 'death', string> = {
  run:    'Run',
  attack: 'Attack',
  death:  'Dead',
};
const KITSUNE_SPRITE_FILE: Record<'run' | 'attack' | 'death', string> = {
  run:    'Run',
  attack: 'Attack_2',
  death:  'Dead',
};
const MINOTAUR_BOSS_SPRITE_FILE: Record<'walk' | 'attack' | 'death', string> = {
  walk:   'Walk',
  attack: 'Attack',
  death:  'Dead',
};

/* ─── helpers ────────────────────────────────────────────────── */

const dist2 = (ax: number, ay: number, bx: number, by: number) =>
  (ax - bx) ** 2 + (ay - by) ** 2;

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

/** Maps mage/skeleton EState → sprite/anim key */
const mageAnimKey = (state: EState): 'run' | 'attack' | 'death' => {
  if (state === 'attacking')              return 'attack';
  if (state === 'dying' || state === 'dead') return 'death';
  return 'run';
};
const skeletonAnimKey = mageAnimKey; // same mapping
const kitsuneAnimKey  = mageAnimKey; // same mapping
const minotaurBossAnimKey = (state: EState): 'walk' | 'attack' | 'death' => {
  if (state === 'attacking')                 return 'attack';
  if (state === 'dying' || state === 'dead') return 'death';
  return 'walk';
};

/* ─── component ─────────────────────────────────────────────── */

interface Props { onReturn: () => void; autoStart?: boolean; }

const RaidGame: React.FC<Props> = ({ onReturn, autoStart = false }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rootRef    = useRef<HTMLDivElement>(null);
  const gsRef      = useRef<GS | null>(null);
  const rafRef     = useRef(0);
  const playerSpritesRef = useRef<PlayerSprites>({ idle: null, running: null, attacking: null, dead: null });
  const knightSpritesRef = useRef<KnightSprites>({ running: null, attacking: null, dead: null });
  const mageSpritesRef     = useRef<MageSprites>({ run: null, attack: null, death: null });
  const skeletonSpritesRef = useRef<SkeletonSprites>({ run: null, attack: null, death: null });
  const kitsuneSpritesRef      = useRef<KitsuneSprites>({ run: null, attack: null, death: null });
  const minotaurBossSpritesRef  = useRef<MinotaurBossSprites>({ walk: null, attack: null, death: null });
  const rageVideoRef    = useRef<HTMLVideoElement | null>(null);
  const rageActiveRef   = useRef(false);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bladestormVideoRef = useRef<HTMLVideoElement | null>(null);
  const bladestormChargeRef = useRef(0);   // 0 → BLADESTORM_CHARGE_MAX
  const bladestormActiveRef  = useRef(false); // true while bladestorm video plays
  const afterimageRef = useRef<AfterimageState[]>([]);
  const [started, setStarted] = useState(autoStart);
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null);
  const [bladestormPlaying, setBladestormPlaying] = useState(false);
  const [ragePlaying, setRagePlaying] = useState(false);

  /* ── load sprites + background once on mount ── */
  useEffect(() => {
    (Object.keys(PLAYER_SPRITE_FILE) as PState[]).forEach(state => {
      const img = new Image();
      img.src = `/heroes/${PLAYER_SPRITE_FILE[state]}.png`;
      img.onload  = () => { playerSpritesRef.current[state] = img; };
      img.onerror = () => { playerSpritesRef.current[state] = null; };
    });
    (Object.keys(KNIGHT_SPRITE_FILE) as Array<keyof typeof KNIGHT_SPRITE_FILE>).forEach(state => {
      const img = new Image();
      img.src = `/enemies/knights/${KNIGHT_SPRITE_FILE[state]}.png`;
      img.onload  = () => { knightSpritesRef.current[state] = img; };
      img.onerror = () => { knightSpritesRef.current[state] = null; };
    });
    (Object.keys(MAGE_SPRITE_FILE) as Array<keyof typeof MAGE_SPRITE_FILE>).forEach(state => {
      const img = new Image();
      img.src = `/enemies/mage/${MAGE_SPRITE_FILE[state]}.png`;
      img.onload  = () => { mageSpritesRef.current[state] = img; };
      img.onerror = () => { mageSpritesRef.current[state] = null; };
    });
    (Object.keys(SKELETON_SPRITE_FILE) as Array<keyof typeof SKELETON_SPRITE_FILE>).forEach(state => {
      const img = new Image();
      img.src = `/enemies/skelly/${SKELETON_SPRITE_FILE[state]}.png`;
      img.onload  = () => { skeletonSpritesRef.current[state] = img; };
      img.onerror = () => { skeletonSpritesRef.current[state] = null; };
    });
    (Object.keys(KITSUNE_SPRITE_FILE) as Array<keyof typeof KITSUNE_SPRITE_FILE>).forEach(state => {
      const img = new Image();
      img.src = `/enemies/Kitsune/${KITSUNE_SPRITE_FILE[state]}.png`;
      img.onload  = () => { kitsuneSpritesRef.current[state] = img; };
      img.onerror = () => { kitsuneSpritesRef.current[state] = null; };
    });
    (Object.keys(MINOTAUR_BOSS_SPRITE_FILE) as Array<keyof typeof MINOTAUR_BOSS_SPRITE_FILE>).forEach(state => {
      const img = new Image();
      img.src = `/enemies/minotaur-boss/${MINOTAUR_BOSS_SPRITE_FILE[state]}.png`;
      img.onload  = () => { minotaurBossSpritesRef.current[state] = img; };
      img.onerror = () => { minotaurBossSpritesRef.current[state] = null; };
    });
    const bg = new Image();
    bg.src = '/images/finalbattlebackground.png';
    bg.onload  = () => { bgImageRef.current = bg; };
    bg.onerror = () => { bgImageRef.current = null; };

    // preload bladestorm video
    const bsVideo = document.createElement('video');
    bsVideo.src = '/videos/bladestorm.mp4';
    bsVideo.preload = 'auto';
    bsVideo.muted = true;
    bsVideo.playsInline = true;
    bsVideo.playbackRate = 3;
    bladestormVideoRef.current = bsVideo;

    // preload minotaur rage video
    const rageVid = document.createElement('video');
    rageVid.src = '/videos/rage.mp4';
    rageVid.preload = 'auto';
    rageVid.muted = true;
    rageVid.playsInline = true;
    rageVid.playbackRate = 2;
    rageVideoRef.current = rageVid;
  }, []);

  /* ── initial game state ── */
  const makeGS = useCallback((w: number, h: number): GS => ({
    player: {
      x: w / 2, y: h / 2, vx: 0, vy: 0,
      hp: PLAYER_MAX_HP,
      state: 'idle', frameIndex: 0, animTimer: 0,
      attackCooldown: 0, facing: 1, damageDealt: false,
      shieldActive: false, shieldTimer: 0, shieldCooldown: 0,
      dashActive: false, dashTimer: 0, dashCooldown: 0,
    },
    enemies: [], particles: [], enemyProjectiles: [], kitsuneBeams: [],
    keys: {}, timer: GAME_DURATION,
    lastSpawn: 0,
    running: true, uid: 0,
    wave: 1, waveAnnounceTimer: 0, bossSpawned: false,
    minotaurRageTimer: -1, minotaurEnrageTimer: 0, playerParalyzeTimer: 0,
  }), []);

  /* ── bladestorm trigger ── */
  const triggerBladestorm = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !gs.running) return;
    if (gs.player.state === 'dead') return;
    if (bladestormChargeRef.current < BLADESTORM_CHARGE_MAX) return;

    bladestormChargeRef.current = 0;  // consume full bar
    bladestormActiveRef.current = true;
    setBladestormPlaying(true);

    // play video — enemies are killed when it finishes
    const vid = bladestormVideoRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.playbackRate = 3;
      vid.play().catch(() => {});
      vid.onended = () => {
        // kill all alive enemies after video completes; boss takes 25% HP damage only
        const g = gsRef.current;
        if (g) {
          for (const e of g.enemies) {
            if (e.state === 'dead' || e.state === 'dying') continue;
            if (e.type === 'boss' || e.type === 'minotaur_boss') {
              const dmg = Math.round(MINOTAUR_BOSS_MAX_HP * 0.25);
              e.hp = Math.max(1, e.hp - dmg);
            } else {
              e.state = e.type === 'knight' ? 'dead' : 'dying';
              e.frameIndex = 0;
              e.animTimer  = 0;
            }
          }
        }
        bladestormActiveRef.current = false;
        setBladestormPlaying(false);
      };
    } else {
      // fallback if video not loaded — kill immediately; boss takes 25% HP damage only
      for (const e of gs.enemies) {
        if (e.state === 'dead' || e.state === 'dying') continue;
        if (e.type === 'boss' || e.type === 'minotaur_boss') {
          const dmg = Math.round(MINOTAUR_BOSS_MAX_HP * 0.25);
          e.hp = Math.max(1, e.hp - dmg);
        } else {
          e.state = e.type === 'knight' ? 'dead' : 'dying';
          e.frameIndex = 0;
          e.animTimer  = 0;
        }
      }
      setTimeout(() => {
        bladestormActiveRef.current = false;
        setBladestormPlaying(false);
      }, 1500);
    }
  }, []);

  /* ── main effect (only runs after player presses START) ── */
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bb = canvas.getBoundingClientRect();
    canvas.width  = Math.round(bb.width)  || 960;
    canvas.height = Math.round(bb.height) || 580;
    const W = canvas.width;
    const H = canvas.height;

    canvas.focus(); // ensure keyboard events work immediately (critical for autoStart)
    gsRef.current = makeGS(W, H);

    /* ── state transition (resets frame + timer) ── */
    const transitionState = (p: Player, next: PState) => {
      if (p.state === next) return;
      p.state       = next;
      p.frameIndex  = 0;
      p.animTimer   = 0;
      p.damageDealt = false;
    };

    /* ── spawners ── */
    const spawnEnemy = (gs: GS, now: number, typeOverride?: 'knight' | 'mage' | 'skeleton' | 'kitsune' | 'boss' | 'minotaur_boss') => {
      const side = (Math.random() * 4) | 0;
      const pad = 40;
      let x = 0, y = 0;
      if (side === 0)      { x = pad + Math.random() * (W - pad * 2); y = pad; }
      else if (side === 1) { x = W - pad; y = pad + Math.random() * (H - pad * 2); }
      else if (side === 2) { x = pad + Math.random() * (W - pad * 2); y = H - pad; }
      else                 { x = pad;    y = pad + Math.random() * (H - pad * 2); }

      let enemyType: 'knight' | 'mage' | 'skeleton' | 'kitsune' | 'boss' | 'minotaur_boss';
      if (typeOverride) {
        enemyType = typeOverride;
      } else {
        const roll = Math.random();
        // All enemy types present every wave — difficulty comes from damage scaling
        enemyType = roll < 0.25 ? 'skeleton' : roll < 0.50 ? 'mage' : roll < 0.75 ? 'kitsune' : 'knight';
      }

      gs.enemies.push({
        id: gs.uid++, x, y,
        hp: enemyType === 'minotaur_boss' ? MINOTAUR_BOSS_MAX_HP : enemyType === 'boss' ? BOSS_HIT_POINTS : (enemyType === 'knight') ? KNIGHT_HIT_POINTS : ENEMY_MAX_HP,
        type: enemyType,
        state: 'running',
        frameIndex: 0, animTimer: 0,
        facing: 1, damageDealt: false,
        attackCooldown: 0, projectileSpawned: false,
      });
      gs.lastSpawn = now;
    };

    const burst = (gs: GS, x: number, y: number, color: string, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 50 + Math.random() * 110;
        gs.particles.push({
          id: gs.uid++, x, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1, r: 2 + Math.random() * 3, color,
        });
      }
    };

    /* ── draw helpers ── */
    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.028)';
      ctx.lineWidth = 1;
      const g = 52;
      for (let x = 0; x < W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    };
    void drawGrid; // defined but intentionally unused

    const drawPlayer = (p: Player) => {
      const cfg = ANIM_CONFIG[p.state];
      const img = playerSpritesRef.current[p.state];
      const half = RENDER_SIZE / 2;

      /* Madden/2K-style ground ring under player feet */
      {
        const footX = p.x - 38 * p.facing;
        const footY = p.y + RENDER_SIZE * 0.50;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = '#a8d8ff';
        ctx.shadowBlur = 10;
        // outer soft halo
        ctx.fillStyle = 'rgba(180,220,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(footX, footY, 34, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // bright core ring
        ctx.fillStyle = 'rgba(220,240,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(footX, footY, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* crisp pixel-art stutter: flip ±1.5px every 50ms for DASH_DURATION */
      const jitterX = p.dashActive
        ? (Math.floor(p.dashTimer / 50) % 2 === 0 ? 1.5 : -1.5)
        : 0;

      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = img.width / cfg.frames;
        ctx.save();
        ctx.translate(p.x + jitterX, p.y);
        if (p.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          p.frameIndex * frameW, 0, frameW, img.height,
          -half, -half, RENDER_SIZE, RENDER_SIZE,
        );
        ctx.restore();
      } else {
        /* fallback: glowing circle */
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur  = 20;
        ctx.fillStyle   = '#00bcd4';
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#e0f7fa';
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_RADIUS * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      /* shield orb — centered on sprite body */
      if (p.shieldActive) {
        const shieldX = p.x - p.facing * 30;  // character is left-of-center in frame; flips when mirrored
        const shieldY = p.y + 22;              // character torso sits in lower half of 160px frame
        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.fillStyle   = '#42a5f5';
        ctx.shadowColor = '#1e88e5';
        ctx.shadowBlur  = 22;
        ctx.beginPath();
        ctx.arc(shieldX, shieldY, RENDER_SIZE * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#90caf9';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawKnight = (e: Enemy) => {
      // 'dying' is not a valid knight state; guard maps it to 'dead' just in case
      const kstate = (e.state === 'dying' ? 'dead' : e.state) as 'running' | 'attacking' | 'dead';
      const cfg  = KNIGHT_ANIM_CONFIG[kstate];
      const img  = knightSpritesRef.current[kstate];
      const isBoss = e.type === 'boss';
      const renderSize = isBoss ? BOSS_RENDER_SIZE : ENEMY_RENDER_SIZE;
      const half = renderSize / 2;

      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = img.width / cfg.frames;
        ctx.save();
        if (isBoss) {
          // tint boss a deep crimson
          ctx.filter = 'hue-rotate(330deg) saturate(3) brightness(1.15)';
        }
        ctx.translate(e.x, e.y);
        if (e.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          e.frameIndex * frameW, 0, frameW, img.height,
          -half, -half, renderSize, renderSize,
        );
        ctx.restore();
      } else {
        /* fallback: red circle */
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur  = isBoss ? 24 : 8;
        ctx.fillStyle   = isBoss ? 'rgba(180,0,0,0.9)' : 'rgba(210,48,48,0.85)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, isBoss ? ENEMY_RADIUS * 2.5 : ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (e.state !== 'dead' && e.state !== 'dying') {
        const maxHp = isBoss ? BOSS_HIT_POINTS : KNIGHT_HIT_POINTS;
        const hf = e.hp / maxHp;
        const bw = renderSize * (isBoss ? 0.65 : 0.5);
        const hpY = e.y - renderSize * 0.22;
        const barH = isBoss ? 6 : 3;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(e.x - bw / 2, hpY, bw, barH);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, hpY, bw * hf, barH);
        if (isBoss) {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('BOSS', e.x, hpY - 4);
        }
      }
    };

    const drawMage = (e: Enemy) => {
      const key  = mageAnimKey(e.state);
      const cfg  = MAGE_ANIM_CONFIG[key];
      const img  = mageSpritesRef.current[key];
      const half = MAGE_RENDER_SIZE / 2;

      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = img.width / cfg.frames;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          e.frameIndex * frameW, 0, frameW, img.height,
          -half, -half, MAGE_RENDER_SIZE, MAGE_RENDER_SIZE,
        );
        ctx.restore();
      } else {
        /* fallback: purple orb */
        ctx.shadowColor = '#9c27b0';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = 'rgba(156,39,176,0.85)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (e.state !== 'dead' && e.state !== 'dying') {
        const hf = e.hp / ENEMY_MAX_HP;
        const bw = MAGE_RENDER_SIZE * 0.5;
        const hpY = e.y - MAGE_RENDER_SIZE * 0.22;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, hpY, bw, 3);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, hpY, bw * hf, 3);
      }
    };

    const drawSkeleton = (e: Enemy) => {
      const key  = skeletonAnimKey(e.state);
      const scfg = SKELETON_ANIM_CONFIG[key];
      const img  = skeletonSpritesRef.current[key];
      const half = SKELETON_RENDER_SIZE / 2;

      if (img && img.complete && img.naturalWidth > 0) {
        /* horizontal slicing: frames are side-by-side in a single row */
        const frameW = img.width / scfg.frames;
        const frameH = img.height;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          e.frameIndex * frameW, 0, frameW, frameH,
          -half, -half, SKELETON_RENDER_SIZE, SKELETON_RENDER_SIZE,
        );
        ctx.restore();
      } else {
        /* fallback: green circle */
        ctx.shadowColor = '#76ff03';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = 'rgba(118,255,3,0.7)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (e.state !== 'dead' && e.state !== 'dying') {
        const hf = e.hp / ENEMY_MAX_HP;
        const bw = SKELETON_RENDER_SIZE * 0.6;
        const hpY = e.y - SKELETON_RENDER_SIZE * 0.28;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, hpY, bw, 3);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, hpY, bw * hf, 3);
      }
    };

    const drawKitsune = (e: Enemy) => {
      const key  = kitsuneAnimKey(e.state);
      const kcfg = KITSUNE_ANIM_CONFIG[key];
      const img  = kitsuneSpritesRef.current[key];
      const half = KITSUNE_RENDER_SIZE / 2;

      if (img && img.complete && img.naturalWidth > 0) {
        /* horizontal slicing: frames are side-by-side in a single row */
        const frameW = img.width / kcfg.frames;
        const frameH = img.height;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          e.frameIndex * frameW, 0, frameW, frameH,
          -half, -half, KITSUNE_RENDER_SIZE, KITSUNE_RENDER_SIZE,
        );
        ctx.restore();
      } else {
        /* fallback: orange circle */
        ctx.shadowColor = '#ff6f00';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = 'rgba(255,111,0,0.7)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (e.state !== 'dead' && e.state !== 'dying') {
        const hf = e.hp / ENEMY_MAX_HP;
        const bw = KITSUNE_RENDER_SIZE * 0.5;
        const hpY = e.y - KITSUNE_RENDER_SIZE * 0.22;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, hpY, bw, 3);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, hpY, bw * hf, 3);
      }
    };

    const drawMinotaurBoss = (e: Enemy) => {
      const key  = minotaurBossAnimKey(e.state);
      const mcfg = MINOTAUR_BOSS_ANIM_CONFIG[key];
      const img  = minotaurBossSpritesRef.current[key];
      const SIZE = MINOTAUR_BOSS_RENDER_SIZE;
      const half = SIZE / 2;
      const enraged = (gsRef.current?.minotaurEnrageTimer ?? 0) > 0;

      if (img && img.complete && img.naturalWidth > 0) {
        /* HORIZONTAL slicing: frames are side-by-side in a single row */
        const frameW = img.width / mcfg.frames;
        const frameH = img.height;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          e.frameIndex * frameW, 0, frameW, frameH,
          -half, -half, SIZE, SIZE,
        );
        ctx.restore();
      } else {
        /* fallback: dark red circle */
        ctx.shadowColor = '#b00000';
        ctx.shadowBlur  = 18;
        ctx.fillStyle   = 'rgba(160,0,0,0.9)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_RADIUS * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      /* ── golden enrage glow ── */
      if (enraged) {
        const pulse = 0.5 + 0.35 * Math.abs(Math.sin(performance.now() / 320));
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 28;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth   = 4;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + SIZE * 0.08, SIZE * 0.44, SIZE * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // inner bright ring
        ctx.globalAlpha = pulse * 0.5;
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + SIZE * 0.08, SIZE * 0.38, SIZE * 0.44, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (e.state !== 'dead' && e.state !== 'dying') {
        const hf  = e.hp / MINOTAUR_BOSS_MAX_HP;
        const bw  = SIZE * 0.70;
        const hpY = e.y - SIZE * 0.42;
        const barH = 7;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(e.x - bw / 2, hpY, bw, barH);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, hpY, bw * hf, barH);
        ctx.fillStyle = enraged ? '#ffd700' : 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MINOTAUR BOSS', e.x, hpY - 5);
      }
    };

    const drawProjectiles = (projs: Projectile[]) => {
      for (const proj of projs) {
        ctx.save();
        ctx.shadowColor = '#ce93d8';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = '#ab47bc';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawKitsuneBeams = (beams: KitsuneBeam[]) => {
      for (const beam of beams) {
        const alpha = Math.min(1, beam.life / KITSUNE_BEAM_DURATION * 1.5); // fade out
        const endX = beam.ox + beam.dx * beam.length;
        const endY = beam.oy + beam.dy * beam.length;

        ctx.save();

        /* outer glow */
        ctx.globalAlpha = alpha * 0.25;
        ctx.strokeStyle = '#1565c0';
        ctx.shadowColor = '#1565c0';
        ctx.shadowBlur  = 28;
        ctx.lineWidth   = KITSUNE_BEAM_WIDTH * 3;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(beam.ox, beam.oy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        /* mid glow */
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = '#42a5f5';
        ctx.shadowColor = '#42a5f5';
        ctx.shadowBlur  = 14;
        ctx.lineWidth   = KITSUNE_BEAM_WIDTH * 1.5;
        ctx.beginPath();
        ctx.moveTo(beam.ox, beam.oy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        /* bright core */
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#e3f2fd';
        ctx.shadowColor = '#90caf9';
        ctx.shadowBlur  = 8;
        ctx.lineWidth   = KITSUNE_BEAM_WIDTH * 0.5;
        ctx.beginPath();
        ctx.moveTo(beam.ox, beam.oy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.restore();
      }
    };

    const drawHUD = (gs: GS) => {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      /* HP bar */
      const bx = 20, by = 18, bw = 260, bh = 22;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, 4); ctx.fill();
      const hf = gs.player.hp / PLAYER_MAX_HP;
      ctx.fillStyle = hf > 0.5 ? '#22c55e' : hf > 0.25 ? '#f59e0b' : '#ef4444';
      roundRect(ctx, bx, by, bw * hf, bh, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.ceil(gs.player.hp)} / ${PLAYER_MAX_HP}`, bx + 8, by + 15);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px monospace';
      ctx.fillText('HP', bx, by - 6);

      /* wave counter (replaces timer) */
      const waveColorTop = gs.wave === 1 ? '#22c55e' : gs.wave === 2 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, W / 2 - 54, 8, 108, 50, 8); ctx.fill();
      ctx.fillStyle = waveColorTop;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${gs.wave}`, W / 2, 38);
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(gs.wave === 1 ? 'EASY' : gs.wave === 2 ? 'MEDIUM' : 'HARD', W / 2, 52);

      /* ultimate (bladestorm) charge bar */
      {
        const ux = 20, uy = 62, uw = 140, uh = 12;
        const chargeFrac = bladestormChargeRef.current / BLADESTORM_CHARGE_MAX;
        const ready = chargeFrac >= 1;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, ux - 2, uy - 2, uw + 4, uh + 4, 3); ctx.fill();
        ctx.fillStyle = ready ? '#ff6f00' : '#5d4037';
        roundRect(ctx, ux, uy, uw * Math.min(1, chargeFrac), uh, 2); ctx.fill();
        if (ready) {
          ctx.shadowColor = '#ff6f00'; ctx.shadowBlur = 10;
          roundRect(ctx, ux, uy, uw, uh, 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = ready ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(ready ? 'X  READY' : 'X  ULTIMATE', ux, uy - 5);
      }

      /* shield indicator */
      {
        const sx = 20, sy = 100, sw = 140, sh = 12;
        const shReady = gs.player.shieldCooldown <= 0 && !gs.player.shieldActive;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, sx - 2, sy - 2, sw + 4, sh + 4, 3); ctx.fill();
        const shFill = gs.player.shieldActive
          ? 1
          : Math.max(0, 1 - gs.player.shieldCooldown / SHIELD_COOLDOWN);
        ctx.fillStyle = gs.player.shieldActive ? '#42a5f5' : shReady ? '#1565c0' : '#455a64';
        roundRect(ctx, sx, sy, sw * shFill, sh, 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('F  SHIELD', sx, sy - 5);
      }

      /* dash indicator */
      {
        const dx2 = 20, dy2 = 138, dw = 140, dh = 12;
        const dashReady = gs.player.dashCooldown <= 0 && !gs.player.dashActive;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, dx2 - 2, dy2 - 2, dw + 4, dh + 4, 3); ctx.fill();
        const dashFill = gs.player.dashActive
          ? 1
          : Math.max(0, 1 - gs.player.dashCooldown / DASH_COOLDOWN);
        ctx.fillStyle = gs.player.dashActive ? '#f59e0b' : dashReady ? '#b45309' : '#455a64';
        roundRect(ctx, dx2, dy2, dw * dashFill, dh, 2); ctx.fill();
        if (gs.player.dashActive) {
          ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8;
          roundRect(ctx, dx2, dy2, dw, dh, 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('⇧  DASH', dx2, dy2 - 5);
      }

      /* enemy count */
      const eCount = gs.enemies.filter(e => e.state !== 'dead' && e.state !== 'dying').length;
      const ecW = 100, ecH = 54;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, W - ecW - 12, 8, ecW, ecH, 8); ctx.fill();
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`${eCount}`, W - 20, 42);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('ENEMIES', W - 20, 56);
      ctx.textAlign = 'left';

      /* wave indicator (bottom-left) */
      const waveColor = gs.wave === 1 ? '#22c55e' : gs.wave === 2 ? '#f59e0b' : '#ef4444';
      const waveLabel = gs.wave === 1 ? 'WAVE 1 — EASY' : gs.wave === 2 ? 'WAVE 2 — MEDIUM' : 'WAVE 3 — HARD';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, 18, H - 34, 174, 22, 5); ctx.fill();
      ctx.fillStyle = waveColor;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(waveLabel, 26, H - 18);

      /* wave announcement banner (fades in & out) */
      if (gs.waveAnnounceTimer > 0) {
        const bannerAlpha = Math.min(1, (3.0 - gs.waveAnnounceTimer) / 0.4, gs.waveAnnounceTimer / 0.4);
        ctx.save();
        ctx.globalAlpha = Math.max(0, bannerAlpha);
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        roundRect(ctx, W / 2 - 200, H / 2 - 36, 400, 72, 12); ctx.fill();
        ctx.fillStyle = waveColor;
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(waveLabel, W / 2, H / 2 - 6);
        const subText = gs.wave === 1 ? 'Normal damage' : gs.wave === 2 ? '+35% enemy damage' : gs.bossSpawned ? '+75% damage — Boss is here!' : '+75% damage — Boss incoming!';
        ctx.font = '13px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(subText, W / 2, H / 2 + 18);
        ctx.restore();
      }
    };

    /* ── game loop ── */
    let last = performance.now();

    const loop = (now: number) => {
      const gs = gsRef.current;
      if (!gs || !gs.running) return;

      const dt   = Math.min((now - last) / 1000, 0.05);
      const dtMs = dt * 1000;
      last = now;

      const p = gs.player;

      /* ── timer (used for wave tracking only — victory is kill-based) ── */
      if (p.state !== 'dead') {
        gs.timer = Math.max(0, gs.timer - dt);
      }

      /* ── cooldown ticks ── */
      if (p.attackCooldown > 0) p.attackCooldown -= dtMs;
      if (gs.playerParalyzeTimer > 0) gs.playerParalyzeTimer -= dt;
      if (gs.minotaurEnrageTimer  > 0) gs.minotaurEnrageTimer  -= dt;
      // bladestorm charge is gained per kill, no passive tick needed
      if (p.shieldActive) {
        p.shieldTimer -= dtMs;
        if (p.shieldTimer <= 0) { p.shieldActive = false; p.shieldCooldown = SHIELD_COOLDOWN; }
      }
      if (p.shieldCooldown > 0) p.shieldCooldown -= dtMs;
      if (p.dashActive) {
        p.dashTimer -= dtMs;
        if (p.dashTimer <= 0) { p.dashActive = false; p.dashCooldown = DASH_COOLDOWN; }
      }
      if (p.dashCooldown > 0) p.dashCooldown -= dtMs;

      /* ── state transitions (dead overrides all; attacking holds until complete) ── */
      if (p.state !== 'dead' && p.state !== 'attacking') {
        const moving = gs.playerParalyzeTimer <= 0 && (
          gs.keys['KeyW'] || gs.keys['ArrowUp']   ||
          gs.keys['KeyS'] || gs.keys['ArrowDown']  ||
          gs.keys['KeyA'] || gs.keys['ArrowLeft']  ||
          gs.keys['KeyD'] || gs.keys['ArrowRight']);
        transitionState(p, moving ? 'running' : 'idle');
      }

      /* ── advance player animation ── */
      const cfg = ANIM_CONFIG[p.state];
      p.animTimer += dtMs;
      while (p.animTimer >= cfg.frameDuration) {
        p.animTimer -= cfg.frameDuration;

        /* melee burst fires on damage frame */
        if (p.state === 'attacking' && p.frameIndex >= MELEE_DAMAGE_START_FRAME && !p.damageDealt) {
          p.damageDealt = true;
          for (const e of gs.enemies) {
            if (e.state === 'dead' || e.state === 'dying') continue;
            const meleeReach = e.type === 'minotaur_boss'
              ? MELEE_RADIUS + MINOTAUR_BOSS_HITBOX_RADIUS
              : MELEE_RADIUS;
            if (dist2(p.x, p.y, e.x, e.y) < meleeReach ** 2) {
              burst(gs, e.x, e.y, '#fbbf24', 6);
              if (e.type === 'knight') {
                // knights require 2 hits
                e.hp -= 1;
                if (e.hp <= 0) {
                  e.state      = 'dead';
                  e.frameIndex = 0;
                  e.animTimer  = 0;
                  bladestormChargeRef.current = Math.min(
                    BLADESTORM_CHARGE_MAX,
                    bladestormChargeRef.current + BLADESTORM_PER_KILL,
                  );
                }
              } else if (e.type === 'minotaur_boss') {
                // boss takes real damage per melee hit (~20 hits to kill)
                e.hp -= MINOTAUR_BOSS_PLAYER_MELEE_DMG;
                // charge ultimate on every hit
                bladestormChargeRef.current = Math.min(
                  BLADESTORM_CHARGE_MAX,
                  bladestormChargeRef.current + BLADESTORM_PER_BOSS_HIT,
                );
                if (e.hp <= 0) {
                  e.hp         = 0;
                  e.state      = 'dying';
                  e.frameIndex = 0;
                  e.animTimer  = 0;
                  bladestormChargeRef.current = Math.min(
                    BLADESTORM_CHARGE_MAX,
                    bladestormChargeRef.current + BLADESTORM_PER_KILL,
                  );
                }
              } else {
                // mage, skeleton, kitsune: one-hit, play death animation
                e.state      = 'dying';
                e.frameIndex = 0;
                e.animTimer  = 0;
                bladestormChargeRef.current = Math.min(
                  BLADESTORM_CHARGE_MAX,
                  bladestormChargeRef.current + BLADESTORM_PER_KILL,
                );
              }
            }
          }
        }

        p.frameIndex++;
        if (p.frameIndex >= cfg.frames) {
          if (cfg.loop) {
            p.frameIndex = 0;
          } else {
            p.frameIndex = cfg.frames - 1; // hold last frame
            if (p.state === 'attacking') {
              if (p.hp > 0) transitionState(p, 'idle');
            } else if (p.state === 'dead') {
              gs.running = false;
              setResult('defeat'); return;
            }
          }
        }
      }

      /* ── movement (locked while attacking, dead, or paralyzed) ── */
      if (p.state !== 'attacking' && p.state !== 'dead' && gs.playerParalyzeTimer <= 0) {
        let mx = 0, my = 0;
        if (gs.keys['KeyW'] || gs.keys['ArrowUp'])    my -= 1;
        if (gs.keys['KeyS'] || gs.keys['ArrowDown'])  my += 1;
        if (gs.keys['KeyA'] || gs.keys['ArrowLeft'])  mx -= 1;
        if (gs.keys['KeyD'] || gs.keys['ArrowRight']) mx += 1;
        if (mx < 0) p.facing = -1;
        else if (mx > 0) p.facing = 1;
        const mLen = Math.sqrt(mx * mx + my * my) || 1;
        if (mx !== 0 || my !== 0) {
          p.vx = (mx / mLen) * PLAYER_SPEED;
          p.vy = (my / mLen) * PLAYER_SPEED;
        } else {
          p.vx *= 0.75; p.vy *= 0.75;
        }
        const border = RENDER_SIZE * 0.42;
        p.x = Math.max(border, Math.min(W - border, p.x + p.vx * dt));
        p.y = Math.max(border, Math.min(H - border, p.y + p.vy * dt));
      } else {
        p.vx *= 0.75; p.vy *= 0.75;
      }

      /* ── enemy state machines + movement ── */
      if (p.state !== 'dead' && !bladestormActiveRef.current && !rageActiveRef.current) {
        const speed = (ENEMY_BASE_SPEED + (GAME_DURATION - gs.timer) * 0.9) * (gs.wave === 2 ? 1.5 : 1.0);

        for (const e of gs.enemies) {
          if (e.state === 'dying' || e.state === 'dead') continue;

          const dx  = p.x - e.x;
          const dy  = p.y - e.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;

          e.facing = dx >= 0 ? 1 : -1;

          if (e.type === 'skeleton') {
            /* ── skeleton state machine (melee) ── */
            if (e.attackCooldown > 0) e.attackCooldown -= dtMs;

            if (e.state === 'attacking') {
              // locked — no movement, animation section handles transition
            } else {
              // state === 'running'
              if (len > SKELETON_ATTACK_RANGE) {
                // chase player
                e.x += (dx / len) * speed * SKELETON_MOVE_SPEED * dt;
                e.y += (dy / len) * speed * SKELETON_MOVE_SPEED * dt;
              } else if (e.attackCooldown <= 0) {
                // in range, cooldown ready → begin attack
                e.state       = 'attacking';
                e.frameIndex  = 0;
                e.animTimer   = 0;
                e.damageDealt = false;
              }
              // else: in range but cooldown not ready → stand still
            }
          } else if (e.type === 'mage') {
            /* ── mage state machine (free movement + ranged) ── */
            if (e.attackCooldown > 0) e.attackCooldown -= dtMs;

            // always move toward player (free movement)
            if (e.state !== 'attacking') {
              e.x += (dx / len) * speed * dt;
              e.y += (dy / len) * speed * dt;
            }

            // can attack from any distance when cooldown ready
            if (e.state !== 'attacking' && e.attackCooldown <= 0) {
              e.state             = 'attacking';
              e.frameIndex        = 0;
              e.animTimer         = 0;
              e.projectileSpawned = false;
            }
          } else if (e.type === 'kitsune') {
            /* ── kitsune state machine (ranged beam) ── */
            if (e.attackCooldown > 0) e.attackCooldown -= dtMs;

            // always move toward player (free movement like mage)
            if (e.state !== 'attacking') {
              e.x += (dx / len) * speed * KITSUNE_MOVE_SPEED * dt;
              e.y += (dy / len) * speed * KITSUNE_MOVE_SPEED * dt;
            }

            // can attack when cooldown ready
            if (e.state !== 'attacking' && e.attackCooldown <= 0) {
              e.state       = 'attacking';
              e.frameIndex  = 0;
              e.animTimer   = 0;
              e.damageDealt = false;  // reused as "beam spawned" flag
            }
          } else if (e.type === 'minotaur_boss') {
            /* ── minotaur boss state machine (melee) ── */
            if (e.attackCooldown > 0) e.attackCooldown -= dtMs;

            if (e.state === 'attacking') {
              // locked during attack animation — no movement
            } else {
              const baseEnraged = gs.minotaurEnrageTimer > 0;
              const mbSpeed = MINOTAUR_BOSS_MOVE_SPEED * (baseEnraged ? MINOTAUR_BOSS_ENRAGED_SPEED_MULT : 1.0);
              if (len > MINOTAUR_BOSS_ATTACK_RANGE) {
                e.x += (dx / len) * speed * mbSpeed * dt;
                e.y += (dy / len) * speed * mbSpeed * dt;
                // leave red motion trail when enraged
                if (baseEnraged && Math.random() < 0.35) {
                  burst(gs, e.x, e.y, '#ff3300', 2);
                }
              } else if (e.attackCooldown <= 0) {
                e.state       = 'attacking';
                e.frameIndex  = 0;
                e.animTimer   = 0;
                e.damageDealt = false;
              }
            }
          } else {
            /* ── knight / boss state machine ── */
            const contactRange = e.type === 'boss' ? CONTACT_RADIUS + 50 : CONTACT_RADIUS + 10;
            const inContact = len < contactRange;

            if (inContact) {
              if (e.state !== 'attacking') {
                e.state       = 'attacking';
                e.frameIndex  = 0;
                e.animTimer   = 0;
                e.damageDealt = false;
              }
            } else {
              if (e.state !== 'attacking') {
                if (e.state !== 'running') {
                  e.state      = 'running';
                  e.frameIndex = 0;
                  e.animTimer  = 0;
                }
                e.x += (dx / len) * speed * dt;
                e.y += (dy / len) * speed * dt;
              } else {
                // was attacking but player moved away → back to running
                e.state      = 'running';
                e.frameIndex = 0;
                e.animTimer  = 0;
              }
            }
          }
        }
      }

      /* ── advance enemy animations ── */
      for (const e of gs.enemies) {
        if (e.type === 'skeleton') {
          /* ── skeleton animation (vertical slicing) ── */
          const skey = skeletonAnimKey(e.state);
          const scfg = SKELETON_ANIM_CONFIG[skey];
          e.animTimer += dtMs;

          while (e.animTimer >= scfg.frameDuration) {
            e.animTimer -= scfg.frameDuration;

            // deal damage on designated frame
            if (e.state === 'attacking' && e.frameIndex === SKELETON_ATTACK_DAMAGE_FRAME && !e.damageDealt) {
              e.damageDealt = true;
              if (p.state !== 'dead') {
                const adx = p.x - e.x;
                const ady = p.y - e.y;
                const alen = Math.sqrt(adx * adx + ady * ady) || 1;
                if (alen <= SKELETON_ATTACK_RANGE && !p.shieldActive && !p.dashActive) {
                  const wm = gs.wave === 1 ? 1.0 : gs.wave === 2 ? 1.35 : 1.75;
                  p.hp -= Math.round(SKELETON_CONTACT_DAMAGE * wm);
                  if (p.hp <= 0) { p.hp = 0; transitionState(p, 'dead'); }
                }
              }
            }

            e.frameIndex++;
            if (e.frameIndex >= scfg.frames) {
              if (scfg.loop) {
                e.frameIndex = 0;
              } else {
                e.frameIndex = scfg.frames - 1;
                if (e.state === 'attacking') {
                  // attack done → return to running, start cooldown
                  e.state          = 'running';
                  e.frameIndex     = 0;
                  e.animTimer      = 0;
                  e.attackCooldown = SKELETON_ATTACK_COOLDOWN;
                } else if (e.state === 'dying') {
                  e.state = 'dead';
                }
              }
            }
          }
        } else if (e.type === 'mage') {
          /* ── mage animation ── */
          const key  = mageAnimKey(e.state);
          const mcfg = MAGE_ANIM_CONFIG[key];
          e.animTimer += dtMs;

          while (e.animTimer >= mcfg.frameDuration) {
            e.animTimer -= mcfg.frameDuration;

            e.frameIndex++;

            /* spawn projectile when animation reaches the spawn frame */
            if (
              e.state === 'attacking' &&
              e.frameIndex === MAGE_PROJECTILE_SPAWN_FRAME &&
              !e.projectileSpawned
            ) {
              e.projectileSpawned = true;
              const dx  = p.x - e.x;
              const dy  = p.y - e.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              gs.enemyProjectiles.push({
                id: gs.uid++,
                x: e.x, y: e.y,
                vx: (dx / len) * MAGE_PROJECTILE_SPEED,
                vy: (dy / len) * MAGE_PROJECTILE_SPEED,
                radius: MAGE_PROJECTILE_RADIUS,
                done: false,
              });
            }

            if (e.frameIndex >= mcfg.frames) {
              if (mcfg.loop) {
                e.frameIndex = 0;
              } else {
                e.frameIndex = mcfg.frames - 1; // hold last frame
                if (e.state === 'attacking') {
                  /* attack complete → return to running, start cooldown */
                  e.state          = 'running';
                  e.frameIndex     = 0;
                  e.animTimer      = 0;
                  e.attackCooldown = MAGE_ATTACK_COOLDOWN;
                } else if (e.state === 'dying') {
                  e.state = 'dead';
                }
              }
            }
          }
        } else if (e.type === 'kitsune') {
          /* ── kitsune animation (horizontal slicing) ── */
          const kkey = kitsuneAnimKey(e.state);
          const kcfg2 = KITSUNE_ANIM_CONFIG[kkey];
          e.animTimer += dtMs;

          while (e.animTimer >= kcfg2.frameDuration) {
            e.animTimer -= kcfg2.frameDuration;

            // spawn beam on designated frame
            if (e.state === 'attacking' && e.frameIndex === KITSUNE_BEAM_SPAWN_FRAME && !e.damageDealt) {
              e.damageDealt = true;
              // direction toward player at moment of firing
              const bdx = p.x - e.x;
              const bdy = p.y - e.y;
              const blen = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
              gs.kitsuneBeams.push({
                id: gs.uid++,
                ox: e.x, oy: e.y,
                dx: bdx / blen, dy: bdy / blen,
                life: KITSUNE_BEAM_DURATION,
                length: 0,
                maxLength: Math.sqrt(W * W + H * H),
                damageDealt: false,
              });
            }

            e.frameIndex++;
            if (e.frameIndex >= kcfg2.frames) {
              if (kcfg2.loop) {
                e.frameIndex = 0;
              } else {
                e.frameIndex = kcfg2.frames - 1;
                if (e.state === 'attacking') {
                  // hold last frame until all beams from this kitsune are gone
                  const hasBeam = gs.kitsuneBeams.some(b => b.life > 0);
                  if (!hasBeam) {
                    e.state          = 'running';
                    e.frameIndex     = 0;
                    e.animTimer      = 0;
                    e.attackCooldown = KITSUNE_ATTACK_COOLDOWN;
                  }
                } else if (e.state === 'dying') {
                  e.state = 'dead';
                }
              }
            }
          }
        } else if (e.type === 'minotaur_boss') {
          /* ── minotaur boss animation (vertical slicing) ── */
          const mbkey = minotaurBossAnimKey(e.state);
          const mbcfg = MINOTAUR_BOSS_ANIM_CONFIG[mbkey];
          e.animTimer += dtMs;

          while (e.animTimer >= mbcfg.frameDuration) {
            e.animTimer -= mbcfg.frameDuration;

            if (e.state === 'attacking' && e.frameIndex === MINOTAUR_BOSS_DAMAGE_FRAME && !e.damageDealt) {
              e.damageDealt = true;
              if (p.state !== 'dead') {
                const adx  = p.x - e.x;
                const ady  = p.y - e.y;
                const alen = Math.sqrt(adx * adx + ady * ady) || 1;
                if (alen <= MINOTAUR_BOSS_ATTACK_RANGE + PLAYER_RADIUS && !p.shieldActive && !p.dashActive) {
                  const wm = gs.wave === 1 ? 1.0 : gs.wave === 2 ? 1.35 : 1.75;
                  p.hp -= Math.round(MINOTAUR_BOSS_CONTACT_DAMAGE * wm);
                  if (p.hp <= 0) { p.hp = 0; transitionState(p, 'dead'); }
                }
              }
            }

            e.frameIndex++;
            if (e.frameIndex >= mbcfg.frames) {
              if (mbcfg.loop) {
                e.frameIndex = 0;
              } else {
                e.frameIndex = mbcfg.frames - 1;
                if (e.state === 'attacking') {
                  e.state          = 'running';
                  e.frameIndex     = 0;
                  e.animTimer      = 0;
                  e.attackCooldown = MINOTAUR_BOSS_ATTACK_COOLDOWN;
                } else if (e.state === 'dying') {
                  e.state = 'dead';
                }
              }
            }
          }
        } else {
          /* ── knight animation (unchanged) ── */
          const kstate = (e.state === 'dying' ? 'dead' : e.state) as 'running' | 'attacking' | 'dead';
          const kcfg   = KNIGHT_ANIM_CONFIG[kstate];
          e.animTimer += dtMs;

          while (e.animTimer >= kcfg.frameDuration) {
            e.animTimer -= kcfg.frameDuration;

            // deal damage on designated frame
            if (e.state === 'attacking' && e.frameIndex === KNIGHT_ATTACK_DAMAGE_FRAME && !e.damageDealt) {
              e.damageDealt = true;
              if (p.state !== 'dead') {
                const dx  = p.x - e.x;
                const dy  = p.y - e.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                if (len < CONTACT_RADIUS + 50 && !p.shieldActive && !p.dashActive) {
                  const wm = gs.wave === 1 ? 1.0 : gs.wave === 2 ? 1.35 : 1.75;
                  const base = e.type === 'boss' ? BOSS_DAMAGE : ENEMY_DAMAGE;
                  p.hp -= Math.round(base * wm);
                  if (p.hp <= 0) {
                    p.hp = 0;
                    transitionState(p, 'dead');
                  }
                }
              }
            }

            e.frameIndex++;
            if (e.frameIndex >= kcfg.frames) {
              if (kcfg.loop) {
                e.frameIndex  = 0;
                e.damageDealt = false; // reset for next attack cycle
              } else {
                e.frameIndex = kcfg.frames - 1; // hold last frame
              }
            }
          }
        }
      }

      /* ── remove finished enemies ── */
      gs.enemies = gs.enemies.filter(e => {
        if (e.state !== 'dead') return true;
        if (e.type === 'skeleton') return false;    // dying → dead transition means fully done
        if (e.type === 'mage') return false;         // same: dead = animation finished
        if (e.type === 'kitsune') return false;      // same: dead = animation finished
        if (e.type === 'minotaur_boss') return false; // same: dead = animation finished
        // knight: dead state plays anim then holds last frame → remove at last frame
        return e.frameIndex < KNIGHT_ANIM_CONFIG.dead.frames - 1;
      });

      /* ── victory: kill all enemies (after boss has spawned) ── */
      if (gs.bossSpawned && gs.enemies.length === 0) {
        gs.running = false;
        setResult('victory');
        return;
      }

      /* ── update enemy projectiles ── */
      for (const proj of gs.enemyProjectiles) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        /* off-screen → discard */
        if (proj.x < -60 || proj.x > W + 60 || proj.y < -60 || proj.y > H + 60) {
          proj.done = true;
          continue;
        }

        /* collision with player */
        if (!proj.done && p.state !== 'dead') {
          if (dist2(proj.x, proj.y, p.x, p.y) < (proj.radius + PLAYER_RADIUS) ** 2) {
            proj.done = true;
            burst(gs, proj.x, proj.y, '#ce93d8', 4);
            if (!p.shieldActive && !p.dashActive) {
              const wm = gs.wave === 1 ? 1.0 : gs.wave === 2 ? 1.35 : 1.75;
              p.hp -= Math.round(MAGE_PROJECTILE_DAMAGE * wm);
              if (p.hp <= 0) { p.hp = 0; transitionState(p, 'dead'); }
            }
          }
        }
      }
      gs.enemyProjectiles = gs.enemyProjectiles.filter(proj => !proj.done);

      /* ── update kitsune beams ── */
      for (const beam of gs.kitsuneBeams) {
        beam.life -= dt;
        // extend beam gradually
        beam.length = Math.min(beam.maxLength, beam.length + KITSUNE_BEAM_SPEED * dt);

        /* collision: point-to-ray segment distance (only up to current length) */
        if (!beam.damageDealt && p.state !== 'dead' && !p.shieldActive && !p.dashActive) {
          const apx = p.x - beam.ox;
          const apy = p.y - beam.oy;
          const t   = apx * beam.dx + apy * beam.dy; // dot along ray
          if (t > 0 && t <= beam.length) { // player is within current beam extent
            const perpX = beam.ox + beam.dx * t - p.x;
            const perpY = beam.oy + beam.dy * t - p.y;
            const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
            if (perpDist < KITSUNE_BEAM_WIDTH + PLAYER_RADIUS) {
              beam.damageDealt = true;
              burst(gs, p.x, p.y, '#42a5f5', 5);
              const wm = gs.wave === 1 ? 1.0 : gs.wave === 2 ? 1.35 : 1.75;
              p.hp -= Math.round(KITSUNE_BEAM_DAMAGE * wm);
              if (p.hp <= 0) { p.hp = 0; transitionState(p, 'dead'); }
            }
          }
        }
      }
      gs.kitsuneBeams = gs.kitsuneBeams.filter(b => b.life > 0);

      /* ── wave tracking ── */
      const elapsed = GAME_DURATION - gs.timer;
      const newWave: 1 | 2 | 3 = elapsed < WAVE_EASY_END ? 1 : elapsed < WAVE_MEDIUM_END ? 2 : 3;
      if (newWave !== gs.wave) {
        gs.wave = newWave;
        gs.waveAnnounceTimer = 3.0;
      }
      if (gs.waveAnnounceTimer > 0) gs.waveAnnounceTimer -= dt;

      /* ── boss spawn (once at BOSS_SPAWN_ELAPSED seconds) ── */
      if (!gs.bossSpawned && elapsed >= BOSS_SPAWN_ELAPSED) {
        gs.bossSpawned = true;
        gs.minotaurRageTimer = MINOTAUR_RAGE_DELAY;
        spawnEnemy(gs, now, 'minotaur_boss');
      }

      /* ── minotaur rage timer ── */
      if (gs.minotaurRageTimer > 0) {
        gs.minotaurRageTimer -= dt;
        if (gs.minotaurRageTimer <= 0) {
          gs.minotaurRageTimer = -1;
          rageActiveRef.current = true;
          setRagePlaying(true);
          const vid = rageVideoRef.current;
          if (vid) {
            vid.currentTime = 0;
            vid.playbackRate = 2;
            vid.play().catch(() => {});
            vid.onended = () => {
              rageActiveRef.current = false;
              setRagePlaying(false);
              const g = gsRef.current;
              if (g) {
                g.minotaurEnrageTimer = 5.0;
                g.playerParalyzeTimer = 1.0;
              }
            };
          } else {
            setTimeout(() => {
              rageActiveRef.current = false;
              setRagePlaying(false);
              const g = gsRef.current;
              if (g) { g.minotaurEnrageTimer = 5.0; g.playerParalyzeTimer = 1.0; }
            }, 2000);
          }
        }
      }

      /* ── spawn (stops once boss has spawned) ── */
      const spawnInterval = gs.wave === 2 ? 2250 : 4500;
      if (!gs.bossSpawned && now - gs.lastSpawn > spawnInterval) {
        spawnEnemy(gs, now);
        if (gs.wave === 2) spawnEnemy(gs, now); // twice as many in wave 2
      }

      /* ── player HP regen (2 hp/s, capped at max) ── */
      if (p.state !== 'dead') {
        p.hp = Math.min(PLAYER_MAX_HP, p.hp + 2 * dt);
      }

      /* ── particles ── */
      for (const pt of gs.particles) {
        pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        pt.vx *= 0.92; pt.vy *= 0.92;
        pt.life -= dt * 2.2;
      }
      gs.particles = gs.particles.filter(pt => pt.life > 0);

      /* ── render ── */
      const bg = bgImageRef.current;
      if (bg && bg.complete && bg.naturalWidth > 0) {
        ctx.drawImage(bg, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#0d0d16';
        ctx.fillRect(0, 0, W, H);
      }

      for (const pt of gs.particles) {
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const e of gs.enemies) {
        if (e.type === 'skeleton') drawSkeleton(e);
        else if (e.type === 'mage') drawMage(e);
        else if (e.type === 'kitsune') drawKitsune(e);
        else if (e.type === 'minotaur_boss') drawMinotaurBoss(e);
        else drawKnight(e);
      }
      drawProjectiles(gs.enemyProjectiles);
      drawKitsuneBeams(gs.kitsuneBeams);

      /* ── phase dash trail (flickering ghosts from origin → destination) ── */
      if (afterimageRef.current.length > 0) {
        const half = RENDER_SIZE / 2;
        for (const ai of afterimageRef.current) {
          if (ai.alpha <= 0) continue;
          /* per-ghost random flicker — skip ~40% of frames for each ghost */
          if (Math.random() < 0.4) continue;
          const aiCfg = ANIM_CONFIG[ai.state];
          const aiImg = playerSpritesRef.current[ai.state];
          if (aiImg && aiImg.complete && aiImg.naturalWidth > 0) {
            const frameW = aiImg.width / aiCfg.frames;
            ctx.save();
            ctx.globalAlpha = Math.max(0, ai.alpha);
            ctx.filter = 'grayscale(70%) brightness(0.6)';
            ctx.translate(ai.x, ai.y);
            if (ai.facing === -1) ctx.scale(-1, 1);
            ctx.drawImage(aiImg, ai.frameIndex * frameW, 0, frameW, aiImg.height, -half, -half, RENDER_SIZE, RENDER_SIZE);
            ctx.restore();
          }
          /* origin ghost fades fastest, near-dest ghost fades slowest */
          ai.alpha -= dt * ai.fadeRate;
        }
        afterimageRef.current = afterimageRef.current.filter(ai => ai.alpha > 0);
      }

      drawPlayer(p);
      drawHUD(gs);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    /* ── key listeners ── */
    const onDown = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (gs) {
        gs.keys[e.code] = true;
        const p = gs.player;
        const canAttack = p.state !== 'attacking' && p.state !== 'dead' && p.attackCooldown <= 0 && gs.playerParalyzeTimer <= 0;

        /* SPACE → melee attack */
        if (e.code === 'Space' && canAttack) {
          transitionState(p, 'attacking');
          p.attackCooldown = ATTACK_COOLDOWN;
        }
        /* F → shield */
        if (e.code === 'KeyF' &&
            !p.shieldActive && p.shieldCooldown <= 0 && p.state !== 'dead' && gs.playerParalyzeTimer <= 0) {
          p.shieldActive = true;
          p.shieldTimer  = SHIELD_DURATION;
        }
        /* SHIFT → phase dash (instant snap + afterimage + stutter) */
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') &&
            !p.dashActive && p.dashCooldown <= 0 && p.state !== 'dead' && gs.playerParalyzeTimer <= 0) {
          /* 1. compute direction from held movement keys */
          let ddx = 0, ddy = 0;
          if (gs.keys['KeyW'] || gs.keys['ArrowUp'])    ddy -= 1;
          if (gs.keys['KeyS'] || gs.keys['ArrowDown'])  ddy += 1;
          if (gs.keys['KeyA'] || gs.keys['ArrowLeft'])  ddx -= 1;
          if (gs.keys['KeyD'] || gs.keys['ArrowRight']) ddx += 1;
          if (ddx === 0 && ddy === 0) ddx = p.facing;
          const dLen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          /* 2. compute snap destination */
          const snapBorder = RENDER_SIZE * 0.42;
          const snapX = Math.max(snapBorder, Math.min(W - snapBorder, p.x + (ddx / dLen) * DASH_DISTANCE));
          const snapY = Math.max(snapBorder, Math.min(H - snapBorder, p.y + (ddy / dLen) * DASH_DISTANCE));
          /* 3. spawn trail ghosts evenly spaced from origin to destination */
          const TRAIL_COUNT = 5;
          afterimageRef.current = [];
          for (let i = 0; i < TRAIL_COUNT; i++) {
            const t = (i / (TRAIL_COUNT - 1)) * 0.85; // 0 → 0.85 (stops before hero)
            const fadeRate = 4.0 - t * 3.9;           // origin: ~4.0/s fast, near-dest: ~0.68/s slow
            afterimageRef.current.push({
              x: p.x + (snapX - p.x) * t,
              y: p.y + (snapY - p.y) * t,
              alpha: 0.62 - t * 0.15,                 // origin brighter, near-dest dimmer
              fadeRate,
              state: p.state,
              frameIndex: p.frameIndex,
              facing: p.facing,
            });
          }
          /* 4. instant snap */
          p.x = snapX;
          p.y = snapY;
          /* 5. begin stutter phase */
          p.dashActive = true;
          p.dashTimer  = DASH_DURATION;
        }
        /* X → bladestorm */
        if (e.code === 'KeyX') {
          triggerBladestorm();
        }
      }
      /* G → toggle fullscreen */
      if (e.code === 'KeyG') {
        const root = rootRef.current;
        if (!document.fullscreenElement) root?.requestFullscreen();
        else document.exitFullscreen();
      }
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyX','KeyS','KeyF'].includes(e.code))
        e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (gsRef.current) gsRef.current.keys[e.code] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
    };
  }, [makeGS, started, triggerBladestorm]);

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        width: '100%', height: autoStart ? '100%' : '580px',
        borderRadius: autoStart ? 0 : '12px', overflow: 'hidden',
        background: '#000',
        border: autoStart ? 'none' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: autoStart ? 'none' : '0 0 60px rgba(0,229,255,0.04), 0 24px 80px rgba(0,0,0,0.8)',
      }}
      onClick={() => canvasRef.current?.focus()}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />

      {/* Rage video overlay */}
      {ragePlaying && (
        <video
          ref={(el) => {
            if (el && rageVideoRef.current) {
              el.src = rageVideoRef.current.src;
              el.playbackRate = 2;
              el.play().catch(() => {});
            }
          }}
          muted
          playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 31,
            pointerEvents: 'none',
            opacity: 0.75,
          }}
        />
      )}

      {/* Bladestorm video overlay */}
      {bladestormPlaying && (
        <video
          ref={(el) => {
            if (el && bladestormVideoRef.current) {
              el.srcObject = null;
              el.src = bladestormVideoRef.current.src;
              el.playbackRate = 3;
              el.play().catch(() => {});
              el.onended = () => {
                const g = gsRef.current;
                if (g) {
                  for (const e of g.enemies) {
                    if (e.state === 'dead' || e.state === 'dying') continue;
                    if (e.type === 'boss' || e.type === 'minotaur_boss') {
                      const dmg = Math.round(MINOTAUR_BOSS_MAX_HP * 0.25);
                      e.hp = Math.max(1, e.hp - dmg);
                    } else {
                      e.state = e.type === 'knight' ? 'dead' : 'dying';
                      e.frameIndex = 0;
                      e.animTimer  = 0;
                    }
                  }
                }
                setBladestormPlaying(false);
              };
            }
          }}
          muted
          playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 30,
            pointerEvents: 'none',
            opacity: 0.75,
          }}
        />
      )}

      {/* ── start overlay ── */}
      {!started && !result && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(5,5,12,0.82)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '20px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            fontSize: '2.2rem', fontWeight: 900,
            letterSpacing: '6px', fontFamily: 'monospace',
            color: '#00e5ff',
            textShadow: '0 0 40px rgba(0,229,255,0.5)',
          }}>
            RAID MODE
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '12px', fontFamily: 'monospace',
            letterSpacing: '1px',
          }}>
            WASD move · SPACE attack · F shield · SHIFT dash · X bladestorm · G fullscreen
          </div>
          <button
            onClick={() => setStarted(true)}
            style={{
              marginTop: '8px',
              padding: '14px 48px',
              background: 'linear-gradient(135deg, #00bcd4, #00838f)',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '14px',
              fontWeight: 700, letterSpacing: '3px',
              cursor: 'pointer', fontFamily: 'monospace',
              boxShadow: '0 4px 28px rgba(0,188,212,0.4)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            START
          </button>
        </div>
      )}

      {started && !result && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.28)',
          fontSize: '11px', fontFamily: 'monospace',
          userSelect: 'none', pointerEvents: 'none',
          letterSpacing: '0.5px',
        }}>
          WASD move · SPACE attack · SHIFT shield · X bladestorm · F fullscreen
        </div>
      )}

      {result && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(5,5,12,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '16px',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            fontSize: '2.6rem', fontWeight: 900,
            letterSpacing: '4px', fontFamily: 'monospace',
            color: result === 'victory' ? '#00e5ff' : '#ef4444',
            textShadow: `0 0 50px ${result === 'victory' ? 'rgba(0,229,255,0.55)' : 'rgba(239,68,68,0.55)'}`,
          }}>
            {result === 'victory' ? 'RAID COMPLETE' : 'RAID FAILED'}
          </div>

          <div style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '13px', fontFamily: 'monospace',
          }}>
            {result === 'victory'
              ? 'You survived the raid. Resources secured.'
              : 'Your forces were overwhelmed.'}
          </div>

          <button
            onClick={onReturn}
            style={{
              marginTop: '18px',
              padding: '12px 36px',
              background: 'linear-gradient(135deg, #00bcd4, #00838f)',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '13px',
              fontWeight: 700, letterSpacing: '1.5px',
              cursor: 'pointer', fontFamily: 'monospace',
              boxShadow: '0 4px 24px rgba(0,188,212,0.35)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            RETURN TO WEBSITE
          </button>
        </div>
      )}
    </div>
  );
};

export default RaidGame;
