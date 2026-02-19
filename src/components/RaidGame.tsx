import React, { useRef, useEffect, useState, useCallback } from 'react';

/* ─── types ─────────────────────────────────────────────────── */

type PState = 'idle' | 'running' | 'attacking' | 'dead';
type EState = 'running' | 'attacking' | 'dead';

interface Vec2 { x: number; y: number; }

interface Player extends Vec2 {
  vx: number; vy: number;
  hp: number;
  state:          PState;
  frameIndex:     number;
  animTimer:      number;   // ms accumulated in current frame
  attackCooldown: number;   // ms remaining before next melee
  facing:         1 | -1;   // 1 = right, -1 = left
  damageDealt:    boolean;  // melee burst fired this swing
}

interface Enemy extends Vec2 {
  id: number; hp: number;
  state:      EState;
  frameIndex: number;
  animTimer:  number;
  facing:     1 | -1;
  damageDealt: boolean;  // whether this attack swing dealt damage
}

interface Particle extends Vec2 {
  id: number; vx: number; vy: number;
  life: number; r: number; color: string;
}

interface GS {
  player: Player;
  enemies: Enemy[];
  particles: Particle[];
  keys: Record<string, boolean>;
  timer: number;
  lastSpawn: number;
  running: boolean;
  uid: number;
}

type PlayerSprites = Record<PState, HTMLImageElement | null>;
type EnemySprites  = Record<EState, HTMLImageElement | null>;

/* ─── constants ─────────────────────────────────────────────── */

const GAME_DURATION    = 60;
const PLAYER_RADIUS    = 14;   // hitbox radius
const PLAYER_MAX_HP    = 100;
const PLAYER_SPEED     = 230;
const ENEMY_RADIUS     = 12;
const ENEMY_MAX_HP     = 40;
const ENEMY_BASE_SPEED = 75;
const ENEMY_DAMAGE     = 14;
const SPAWN_RATE_START = 1400;
const SPAWN_RATE_MIN   = 380;

const RENDER_SIZE        = 160;  // player sprite draw size (px)
const ENEMY_RENDER_SIZE  = 100;  // enemy sprite draw size (px)
const MELEE_RADIUS       = 60;   // melee attack reach
const ATTACK_COOLDOWN    = 600;  // ms between melee uses
const CONTACT_RADIUS     = PLAYER_RADIUS + ENEMY_RADIUS; // enemy→player touch

/* ── player (samurai) anim config ── */
const ANIM_CONFIG: Record<PState, { frames: number; frameDuration: number; loop: boolean }> = {
  idle:      { frames: 6, frameDuration: 120, loop: true  },
  running:   { frames: 8, frameDuration: 80,  loop: true  },
  attacking: { frames: 4, frameDuration: 70,  loop: false },
  dead:      { frames: 6, frameDuration: 100, loop: false },
};
const MELEE_DAMAGE_START_FRAME = 3; // 0-indexed: damage on last frame of 4-frame attack

/* ── enemy (iron vanguard / knight) anim config ── */
const ENEMY_ANIM_CONFIG: Record<EState, { frames: number; frameDuration: number; loop: boolean }> = {
  running:   { frames: 7, frameDuration: 80,  loop: true  },
  attacking: { frames: 5, frameDuration: 90,  loop: true  },
  dead:      { frames: 6, frameDuration: 100, loop: false },
};
const ENEMY_ATTACK_DAMAGE_FRAME = 3; // frame on which enemy deals damage

/* ── sprite sheet paths ── */
const PLAYER_SPRITE_FILE: Record<PState, string> = {
  idle:      'Idle',
  running:   'Run',
  attacking: 'Attack',
  dead:      'Dead',
};
const ENEMY_SPRITE_FILE: Record<EState, string> = {
  running:   'Run',
  attacking: 'Attack',
  dead:      'Dead',
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

/* ─── component ─────────────────────────────────────────────── */

interface Props { onReturn: () => void; }

const RaidGame: React.FC<Props> = ({ onReturn }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const gsRef      = useRef<GS | null>(null);
  const rafRef     = useRef(0);
  const playerSpritesRef = useRef<PlayerSprites>({ idle: null, running: null, attacking: null, dead: null });
  const enemySpritesRef  = useRef<EnemySprites>({ running: null, attacking: null, dead: null });
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null);

  /* ── load sprites once on mount ── */
  useEffect(() => {
    (Object.keys(PLAYER_SPRITE_FILE) as PState[]).forEach(state => {
      const img = new Image();
      img.src = `/heroes/${PLAYER_SPRITE_FILE[state]}.png`;
      img.onload  = () => { playerSpritesRef.current[state] = img; };
      img.onerror = () => { playerSpritesRef.current[state] = null; };
    });
    (Object.keys(ENEMY_SPRITE_FILE) as EState[]).forEach(state => {
      const img = new Image();
      img.src = `/enemies/knights/${ENEMY_SPRITE_FILE[state]}.png`;
      img.onload  = () => { enemySpritesRef.current[state] = img; };
      img.onerror = () => { enemySpritesRef.current[state] = null; };
    });
  }, []);

  /* ── initial game state ── */
  const makeGS = useCallback((w: number, h: number): GS => ({
    player: {
      x: w / 2, y: h / 2, vx: 0, vy: 0,
      hp: PLAYER_MAX_HP,
      state: 'idle', frameIndex: 0, animTimer: 0,
      attackCooldown: 0, facing: 1, damageDealt: false,
    },
    enemies: [], particles: [],
    keys: {}, timer: GAME_DURATION,
    lastSpawn: 0,
    running: true, uid: 0,
  }), []);

  /* ── main effect ── */
  useEffect(() => {
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
      const m = 32;
      let x = 0, y = 0;
      if (side === 0)      { x = Math.random() * W; y = -m; }
      else if (side === 1) { x = W + m; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = H + m; }
      else                 { x = -m;    y = Math.random() * H; }
      gs.enemies.push({ id: gs.uid++, x, y, hp: ENEMY_MAX_HP, state: 'running', frameIndex: 0, animTimer: 0, facing: 1, damageDealt: false });
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
    };

    const drawEnemy = (e: Enemy) => {
      const cfg = ENEMY_ANIM_CONFIG[e.state];
      const img = enemySpritesRef.current[e.state];
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

      /* HP bar */
      if (e.state !== 'dead') {
        const hf = e.hp / ENEMY_MAX_HP;
        const bw = ENEMY_RENDER_SIZE * 0.5;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - bw / 2, e.y - half - 4, bw, 3);
        ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(e.x - bw / 2, e.y - half - 4, bw * hf, 3);
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

      /* ── attack cooldown tick ── */
      if (p.attackCooldown > 0) p.attackCooldown -= dtMs;

      /* ── state transitions (dead overrides all; attacking holds until complete) ── */
      if (p.state !== 'dead' && p.state !== 'attacking') {
        const moving =
          gs.keys['KeyW'] || gs.keys['ArrowUp']   ||
          gs.keys['KeyS'] || gs.keys['ArrowDown']  ||
          gs.keys['KeyA'] || gs.keys['ArrowLeft']  ||
          gs.keys['KeyD'] || gs.keys['ArrowRight'];
        transitionState(p, moving ? 'running' : 'idle');
      }

      /* ── advance animation ── */
      const cfg = ANIM_CONFIG[p.state];
      p.animTimer += dtMs;
      while (p.animTimer >= cfg.frameDuration) {
        p.animTimer -= cfg.frameDuration;

        /* melee burst fires on damage frame (last frame of 4-frame attack) */
        if (p.state === 'attacking' && p.frameIndex >= MELEE_DAMAGE_START_FRAME && !p.damageDealt) {
          p.damageDealt = true;
          for (const e of gs.enemies) {
            if (e.state === 'dead') continue;
            if (dist2(p.x, p.y, e.x, e.y) < MELEE_RADIUS ** 2) {
              burst(gs, e.x, e.y, '#fbbf24', 6);
              e.state = 'dead';
              e.frameIndex = 0;
              e.animTimer = 0;
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

      /* ── move enemies + enemy state machine ── */
      if (p.state !== 'dead') {
        const speed = ENEMY_BASE_SPEED + (GAME_DURATION - gs.timer) * 0.9;
        for (const e of gs.enemies) {
          if (e.state === 'dead') continue; // dead enemies don't move or attack

          const dx = p.x - e.x, dy = p.y - e.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;

          // face toward player
          e.facing = dx >= 0 ? 1 : -1;

          const inContact = len < CONTACT_RADIUS + 10;

          if (inContact) {
            // switch to attacking if not already
            if (e.state !== 'attacking') {
              e.state = 'attacking';
              e.frameIndex = 0;
              e.animTimer = 0;
              e.damageDealt = false;
            }
          } else {
            // move toward player
            if (e.state !== 'attacking') {
              if (e.state !== 'running') {
                e.state = 'running';
                e.frameIndex = 0;
                e.animTimer = 0;
              }
              e.x += (dx / len) * speed * dt;
              e.y += (dy / len) * speed * dt;
            } else {
              // if was attacking but player moved out of range, go back to running
              e.state = 'running';
              e.frameIndex = 0;
              e.animTimer = 0;
            }
          }
        }
      }

      /* ── advance enemy animations ── */
      for (const e of gs.enemies) {
        const cfg = ENEMY_ANIM_CONFIG[e.state];
        e.animTimer += dtMs;
        while (e.animTimer >= cfg.frameDuration) {
          e.animTimer -= cfg.frameDuration;

          // enemy deals damage on attack damage frame
          if (e.state === 'attacking' && e.frameIndex === ENEMY_ATTACK_DAMAGE_FRAME && !e.damageDealt) {
            e.damageDealt = true;
            if (p.state !== 'dead') {
              const dx = p.x - e.x, dy = p.y - e.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              if (len < CONTACT_RADIUS + 10) {
                p.hp -= ENEMY_DAMAGE;
                if (p.hp <= 0) {
                  p.hp = 0;
                  transitionState(p, 'dead');
                }
              }
            }
          }

          e.frameIndex++;
          if (e.frameIndex >= cfg.frames) {
            if (cfg.loop) {
              e.frameIndex = 0;
              e.damageDealt = false; // reset for next attack cycle
            } else {
              e.frameIndex = cfg.frames - 1; // hold last frame
              // dead animation finished: mark for removal
            }
          }
        }
      }

      /* remove enemies whose death animation has finished */
      gs.enemies = gs.enemies.filter(e => {
        if (e.state !== 'dead') return true;
        return e.frameIndex < ENEMY_ANIM_CONFIG.dead.frames - 1;
      });

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
      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      for (const pt of gs.particles) {
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * pt.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const e of gs.enemies) drawEnemy(e);
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
        /* spacebar → melee attack */
        const p = gs.player;
        if (
          e.code === 'Space' &&
          p.state !== 'attacking' &&
          p.state !== 'dead' &&
          p.attackCooldown <= 0
        ) {
          transitionState(p, 'attacking');
          p.attackCooldown = ATTACK_COOLDOWN;
        }
      }
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
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
  }, [makeGS]);

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <div
      style={{
        position: 'relative',
        width: '100%', height: '580px',
        borderRadius: '12px', overflow: 'hidden',
        background: '#0d0d16',
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

      {!result && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.28)',
          fontSize: '11px', fontFamily: 'monospace',
          userSelect: 'none', pointerEvents: 'none',
          letterSpacing: '0.5px',
        }}>
          WASD / Arrows to move · SPACE to melee attack
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
