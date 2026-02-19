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
}

interface Enemy extends Vec2 {
  id: number;
  hp: number;
  type:              'knight' | 'mage' | 'skeleton';
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

interface Particle extends Vec2 {
  id: number; vx: number; vy: number;
  life: number; r: number; color: string;
}

interface GS {
  player:           Player;
  enemies:          Enemy[];
  particles:        Particle[];
  enemyProjectiles: Projectile[];
  keys:             Record<string, boolean>;
  timer:            number;
  lastSpawn:        number;
  running:          boolean;
  uid:              number;
}

type PlayerSprites   = Record<PState, HTMLImageElement | null>;
type KnightSprites   = Record<'running' | 'attacking' | 'dead', HTMLImageElement | null>;
type MageSprites     = Record<'run' | 'attack' | 'death', HTMLImageElement | null>;
type SkeletonSprites = Record<'run' | 'attack' | 'death', HTMLImageElement | null>;

/* ─── constants ─────────────────────────────────────────────── */

const GAME_DURATION    = 60;
const PLAYER_RADIUS    = 14;   // hitbox radius
const PLAYER_MAX_HP    = 100;
const PLAYER_SPEED     = 230;
const ENEMY_RADIUS     = 12;
const ENEMY_MAX_HP     = 40;
const ENEMY_BASE_SPEED = 75;
const ENEMY_DAMAGE     = 14;
const SPAWN_RATE_START = 3500;  // ~60% fewer enemies than original
const SPAWN_RATE_MIN   = 950;

const RENDER_SIZE        = 160;  // player sprite draw size (px)
const ENEMY_RENDER_SIZE  = 128;  // knight sprite draw size (px) — 80% of player
const MELEE_RADIUS       = 60;   // melee attack reach
const ATTACK_COOLDOWN    = 600;  // ms between melee uses
const CONTACT_RADIUS     = PLAYER_RADIUS + ENEMY_RADIUS;

const SHIELD_DURATION  = 5000;   // ms shield stays active
const SHIELD_COOLDOWN  = 10000;  // ms before shield can be used again

const BLADESTORM_CHARGE_MAX  = 100;  // full bar = 100 charge
const BLADESTORM_PER_KILL   = 20;   // charge gained per enemy kill

/* ── skeleton constants ── */
const SKELETON_RENDER_SIZE     = 96;
const SKELETON_MOVE_SPEED      = 1.6;   // multiplier on base speed
const SKELETON_ATTACK_RANGE    = 55;
const SKELETON_ATTACK_COOLDOWN = 900;   // ms
const SKELETON_CONTACT_DAMAGE  = 15;

/* ── mage constants ── */
const MAGE_RENDER_SIZE            = 128;  // 80% of player
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

/* ─── component ─────────────────────────────────────────────── */

interface Props { onReturn: () => void; }

const RaidGame: React.FC<Props> = ({ onReturn }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rootRef    = useRef<HTMLDivElement>(null);
  const gsRef      = useRef<GS | null>(null);
  const rafRef     = useRef(0);
  const playerSpritesRef = useRef<PlayerSprites>({ idle: null, running: null, attacking: null, dead: null });
  const knightSpritesRef = useRef<KnightSprites>({ running: null, attacking: null, dead: null });
  const mageSpritesRef     = useRef<MageSprites>({ run: null, attack: null, death: null });
  const skeletonSpritesRef = useRef<SkeletonSprites>({ run: null, attack: null, death: null });
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bladestormVideoRef = useRef<HTMLVideoElement | null>(null);
  const bladestormChargeRef = useRef(0);   // 0 → BLADESTORM_CHARGE_MAX
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null);
  const [bladestormPlaying, setBladestormPlaying] = useState(false);

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
  }, []);

  /* ── initial game state ── */
  const makeGS = useCallback((w: number, h: number): GS => ({
    player: {
      x: w / 2, y: h / 2, vx: 0, vy: 0,
      hp: PLAYER_MAX_HP,
      state: 'idle', frameIndex: 0, animTimer: 0,
      attackCooldown: 0, facing: 1, damageDealt: false,
      shieldActive: false, shieldTimer: 0, shieldCooldown: 0,
    },
    enemies: [], particles: [], enemyProjectiles: [],
    keys: {}, timer: GAME_DURATION,
    lastSpawn: 0,
    running: true, uid: 0,
  }), []);

  /* ── bladestorm trigger ── */
  const triggerBladestorm = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || !gs.running) return;
    if (gs.player.state === 'dead') return;
    if (bladestormChargeRef.current < BLADESTORM_CHARGE_MAX) return;

    bladestormChargeRef.current = 0;  // consume full bar
    setBladestormPlaying(true);

    // play video — enemies are killed when it finishes
    const vid = bladestormVideoRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.playbackRate = 3;
      vid.play().catch(() => {});
      vid.onended = () => {
        // kill all alive enemies after video completes
        const g = gsRef.current;
        if (g) {
          for (const e of g.enemies) {
            if (e.state === 'dead' || e.state === 'dying') continue;
            e.state = e.type === 'knight' ? 'dead' : 'dying';
            e.frameIndex = 0;
            e.animTimer  = 0;
          }
        }
        setBladestormPlaying(false);
      };
    } else {
      // fallback if video not loaded — kill immediately
      for (const e of gs.enemies) {
        if (e.state === 'dead' || e.state === 'dying') continue;
        e.state = e.type === 'knight' ? 'dead' : 'dying';
        e.frameIndex = 0;
        e.animTimer  = 0;
      }
      setTimeout(() => setBladestormPlaying(false), 1500);
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
    const spawnEnemy = (gs: GS, now: number) => {
      const side = (Math.random() * 4) | 0;
      const pad = 40; // spawn just inside the canvas edges so player sees them appear
      let x = 0, y = 0;
      if (side === 0)      { x = pad + Math.random() * (W - pad * 2); y = pad; }
      else if (side === 1) { x = W - pad; y = pad + Math.random() * (H - pad * 2); }
      else if (side === 2) { x = pad + Math.random() * (W - pad * 2); y = H - pad; }
      else                 { x = pad;    y = pad + Math.random() * (H - pad * 2); }

      const roll = Math.random();
      const enemyType: 'knight' | 'mage' | 'skeleton' = roll < 0.30 ? 'skeleton' : roll < 0.60 ? 'mage' : 'knight';
      gs.enemies.push({
        id: gs.uid++, x, y,
        hp: ENEMY_MAX_HP,
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

      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = img.width / cfg.frames;
        ctx.save();
        ctx.translate(p.x, p.y);
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

      /* shield orb — centered on sprite */
      if (p.shieldActive) {
        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.fillStyle   = '#42a5f5';
        ctx.shadowColor = '#1e88e5';
        ctx.shadowBlur  = 22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, RENDER_SIZE * 0.38, 0, Math.PI * 2);
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
      const half = ENEMY_RENDER_SIZE / 2;

      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = img.width / cfg.frames;
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(
          img,
          e.frameIndex * frameW, 0, frameW, img.height,
          -half, -half, ENEMY_RENDER_SIZE, ENEMY_RENDER_SIZE,
        );
        ctx.restore();
      } else {
        /* fallback: red circle */
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = 'rgba(210,48,48,0.85)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (e.state !== 'dead' && e.state !== 'dying') {
        const hf = e.hp / ENEMY_MAX_HP;
        const bw = ENEMY_RENDER_SIZE * 0.5;
        const hpY = e.y - ENEMY_RENDER_SIZE * 0.22;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, hpY, bw, 3);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, hpY, bw * hf, 3);
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

    const drawHUD = (gs: GS) => {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      /* HP bar */
      const bx = 20, by = 18, bw = 200, bh = 16;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, 4); ctx.fill();
      const hf = gs.player.hp / PLAYER_MAX_HP;
      ctx.fillStyle = hf > 0.5 ? '#22c55e' : hf > 0.25 ? '#f59e0b' : '#ef4444';
      roundRect(ctx, bx, by, bw * hf, bh, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.ceil(gs.player.hp)} / ${PLAYER_MAX_HP}`, bx + 6, by + 11);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.fillText('HP', bx, by - 5);

      /* timer */
      const secs = Math.ceil(gs.timer);
      const urgent = secs <= 10;
      ctx.fillStyle = urgent ? '#f87171' : '#f5f5f5';
      ctx.font = `bold ${urgent ? 30 : 24}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${secs}s`, W / 2, 36);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('SURVIVE', W / 2, 52);

      /* shield indicator (bottom-left) */
      {
        const sx = 20, sy = 46, sw = 80, sh = 8;
        const shReady = gs.player.shieldCooldown <= 0 && !gs.player.shieldActive;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, sx - 2, sy - 2, sw + 4, sh + 4, 3); ctx.fill();
        const shFill = gs.player.shieldActive
          ? 1
          : Math.max(0, 1 - gs.player.shieldCooldown / SHIELD_COOLDOWN);
        ctx.fillStyle = gs.player.shieldActive ? '#42a5f5' : shReady ? '#1565c0' : '#455a64';
        roundRect(ctx, sx, sy, sw * shFill, sh, 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SHIELD', sx, sy - 4);
      }

      /* ultimate (bladestorm) charge bar */
      {
        const ux = 20, uy = 66, uw = 80, uh = 8;
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
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(ready ? 'X  READY' : 'X  ULTIMATE', ux, uy - 4);
      }

      /* enemy count */
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${gs.enemies.length}`, W - 20, 30);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('enemies', W - 20, 46);
      ctx.textAlign = 'left';
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

      /* ── timer (paused during death animation) ── */
      if (p.state !== 'dead') {
        gs.timer -= dt;
        if (gs.timer <= 0) {
          gs.timer = 0; gs.running = false;
          setResult('victory'); return;
        }
      }

      /* ── cooldown ticks ── */
      if (p.attackCooldown > 0) p.attackCooldown -= dtMs;
      // bladestorm charge is gained per kill, no passive tick needed
      if (p.shieldActive) {
        p.shieldTimer -= dtMs;
        if (p.shieldTimer <= 0) { p.shieldActive = false; p.shieldCooldown = SHIELD_COOLDOWN; }
      }
      if (p.shieldCooldown > 0) p.shieldCooldown -= dtMs;

      /* ── state transitions (dead overrides all; attacking holds until complete) ── */
      if (p.state !== 'dead' && p.state !== 'attacking') {
        const moving =
          gs.keys['KeyW'] || gs.keys['ArrowUp']   ||
          gs.keys['KeyS'] || gs.keys['ArrowDown']  ||
          gs.keys['KeyA'] || gs.keys['ArrowLeft']  ||
          gs.keys['KeyD'] || gs.keys['ArrowRight'];
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
            if (dist2(p.x, p.y, e.x, e.y) < MELEE_RADIUS ** 2) {
              burst(gs, e.x, e.y, '#fbbf24', 6);
              // mage & skeleton play death animation; knight snaps straight to dead
              e.state      = e.type === 'knight' ? 'dead' : 'dying';
              e.frameIndex = 0;
              e.animTimer  = 0;
              // charge ultimate
              bladestormChargeRef.current = Math.min(
                BLADESTORM_CHARGE_MAX,
                bladestormChargeRef.current + BLADESTORM_PER_KILL,
              );
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

      /* ── movement (locked while attacking or dead) ── */
      if (p.state !== 'attacking' && p.state !== 'dead') {
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
        p.x = Math.max(PLAYER_RADIUS, Math.min(W - PLAYER_RADIUS, p.x + p.vx * dt));
        p.y = Math.max(PLAYER_RADIUS, Math.min(H - PLAYER_RADIUS, p.y + p.vy * dt));
      } else {
        p.vx *= 0.75; p.vy *= 0.75;
      }

      /* ── enemy state machines + movement ── */
      if (p.state !== 'dead') {
        const speed = ENEMY_BASE_SPEED + (GAME_DURATION - gs.timer) * 0.9;

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
          } else {
            /* ── knight state machine (unchanged) ── */
            const inContact = len < CONTACT_RADIUS + 10;

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
                if (alen <= SKELETON_ATTACK_RANGE && !p.shieldActive) {
                  p.hp -= SKELETON_CONTACT_DAMAGE;
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
                if (len < CONTACT_RADIUS + 10 && !p.shieldActive) {
                  p.hp -= ENEMY_DAMAGE;
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
        if (e.type === 'skeleton') return false; // dying → dead transition means fully done
        if (e.type === 'mage') return false;      // same: dead = animation finished
        // knight: dead state plays anim then holds last frame → remove at last frame
        return e.frameIndex < KNIGHT_ANIM_CONFIG.dead.frames - 1;
      });

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
            if (!p.shieldActive) {
              p.hp -= MAGE_PROJECTILE_DAMAGE;
              if (p.hp <= 0) { p.hp = 0; transitionState(p, 'dead'); }
            }
          }
        }
      }
      gs.enemyProjectiles = gs.enemyProjectiles.filter(proj => !proj.done);

      /* ── spawn ── */
      const rate = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_START - (GAME_DURATION - gs.timer) * 17);
      if (now - gs.lastSpawn > rate) spawnEnemy(gs, now);

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
        else drawKnight(e);
      }
      drawProjectiles(gs.enemyProjectiles);
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
        const canAttack = p.state !== 'attacking' && p.state !== 'dead' && p.attackCooldown <= 0;

        /* SPACE → melee attack */
        if (e.code === 'Space' && canAttack) {
          transitionState(p, 'attacking');
          p.attackCooldown = ATTACK_COOLDOWN;
        }
        /* SHIFT → shield */
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') &&
            !p.shieldActive && p.shieldCooldown <= 0 && p.state !== 'dead') {
          p.shieldActive = true;
          p.shieldTimer  = SHIELD_DURATION;
        }
        /* X → bladestorm */
        if (e.code === 'KeyX') {
          triggerBladestorm();
        }
      }
      /* F → toggle fullscreen */
      if (e.code === 'KeyF') {
        const root = rootRef.current;
        if (!document.fullscreenElement) root?.requestFullscreen();
        else document.exitFullscreen();
      }
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyX'].includes(e.code))
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
        width: '100%', height: '580px',
        borderRadius: '12px', overflow: 'hidden',
        background: '#000',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 0 60px rgba(0,229,255,0.04), 0 24px 80px rgba(0,0,0,0.8)',
      }}
      onClick={() => canvasRef.current?.focus()}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />

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
                    e.state = e.type === 'knight' ? 'dead' : 'dying';
                    e.frameIndex = 0;
                    e.animTimer  = 0;
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
            WASD move · SPACE attack · SHIFT shield · X bladestorm · F fullscreen
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
            RETURN TO CLASH
          </button>
        </div>
      )}
    </div>
  );
};

export default RaidGame;
