import React, { useRef, useEffect, useState, useCallback } from 'react';

/* ─── constants ─────────────────────────────────────────────── */

const GAME_DURATION   = 60;   // seconds
const PLAYER_RADIUS   = 14;
const PLAYER_MAX_HP   = 100;
const PLAYER_SPEED    = 230;  // px/s
const BULLET_RADIUS   = 5;
const BULLET_SPEED    = 400;  // px/s
const BULLET_DAMAGE   = 22;
const BULLET_COOLDOWN = 480;  // ms
const ENEMY_RADIUS    = 12;
const ENEMY_MAX_HP    = 40;
const ENEMY_BASE_SPEED = 75; // px/s, increases over time
const ENEMY_DAMAGE    = 14;  // hp/s on contact
const SPAWN_RATE_START = 1400; // ms
const SPAWN_RATE_MIN   = 380;  // ms

/* ─── types ─────────────────────────────────────────────────── */

interface Vec2 { x: number; y: number; }

interface Player extends Vec2 {
  vx: number; vy: number;
  hp: number;
}

interface Enemy extends Vec2 {
  id: number; hp: number;
}

interface Bullet extends Vec2 {
  id: number; vx: number; vy: number;
}

interface Particle extends Vec2 {
  id: number; vx: number; vy: number;
  life: number; r: number; color: string;
}

interface GS {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  keys: Record<string, boolean>;
  timer: number;
  lastSpawn: number;
  lastShot: number;
  running: boolean;
  uid: number;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef     = useRef<GS | null>(null);
  const rafRef    = useRef(0);
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null);

  /* ── init ── */
  const makeGS = useCallback((w: number, h: number): GS => ({
    player: { x: w / 2, y: h / 2, vx: 0, vy: 0, hp: PLAYER_MAX_HP },
    enemies: [], bullets: [], particles: [],
    keys: {}, timer: GAME_DURATION,
    lastSpawn: 0, lastShot: 0,
    running: true, uid: 0,
  }), []);

  /* ── main effect ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* resize to real pixel size */
    const bb = canvas.getBoundingClientRect();
    canvas.width  = Math.round(bb.width)  || 960;
    canvas.height = Math.round(bb.height) || 580;

    const W = canvas.width;
    const H = canvas.height;

    gsRef.current = makeGS(W, H);

    /* ── spawners ── */
    const spawnEnemy = (gs: GS, now: number) => {
      const side = (Math.random() * 4) | 0;
      const m = 32;
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * W; y = -m; }
      else if (side === 1) { x = W + m; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = H + m; }
      else                 { x = -m;    y = Math.random() * H; }
      gs.enemies.push({ id: gs.uid++, x, y, hp: ENEMY_MAX_HP });
      gs.lastSpawn = now;
    };

    const autoShoot = (gs: GS, now: number) => {
      if (!gs.enemies.length) return;
      let near = gs.enemies[0];
      let nearD = Infinity;
      for (const e of gs.enemies) {
        const d = dist2(gs.player.x, gs.player.y, e.x, e.y);
        if (d < nearD) { nearD = d; near = e; }
      }
      const dx = near.x - gs.player.x;
      const dy = near.y - gs.player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      gs.bullets.push({
        id: gs.uid++,
        x: gs.player.x, y: gs.player.y,
        vx: (dx / len) * BULLET_SPEED,
        vy: (dy / len) * BULLET_SPEED,
      });
      gs.lastShot = now;
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
      /* pulse ring */
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
    };

    const drawEnemy = (e: Enemy) => {
      const hf = e.hp / ENEMY_MAX_HP;
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = `rgba(210,48,48,${0.65 + hf * 0.35})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENEMY_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      /* mini HP bar */
      const bw = ENEMY_RADIUS * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - bw / 2, e.y - ENEMY_RADIUS - 7, bw, 3);
      ctx.fillStyle = hf > 0.5 ? '#4caf50' : hf > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(e.x - bw / 2, e.y - ENEMY_RADIUS - 7, bw * hf, 3);
    };

    const drawBullet = (b: Bullet) => {
      ctx.shadowColor = '#80deea';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = '#e0f7fa';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawHUD = (gs: GS) => {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      /* ── HP bar ── */
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

      /* ── Timer ── */
      const secs = Math.ceil(gs.timer);
      const urgent = secs <= 10;
      ctx.fillStyle = urgent ? '#f87171' : '#f5f5f5';
      ctx.font = `bold ${urgent ? 30 : 24}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${secs}s`, W / 2, 36);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('SURVIVE', W / 2, 52);

      /* ── Enemy count ── */
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

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      /* timer */
      gs.timer -= dt;
      if (gs.timer <= 0) {
        gs.timer = 0; gs.running = false;
        setResult('victory'); return;
      }

      /* player movement */
      let mx = 0, my = 0;
      if (gs.keys['KeyW'] || gs.keys['ArrowUp'])    my -= 1;
      if (gs.keys['KeyS'] || gs.keys['ArrowDown'])  my += 1;
      if (gs.keys['KeyA'] || gs.keys['ArrowLeft'])  mx -= 1;
      if (gs.keys['KeyD'] || gs.keys['ArrowRight']) mx += 1;
      const mLen = Math.sqrt(mx * mx + my * my) || 1;
      if (mx !== 0 || my !== 0) {
        gs.player.vx = (mx / mLen) * PLAYER_SPEED;
        gs.player.vy = (my / mLen) * PLAYER_SPEED;
      } else {
        gs.player.vx *= 0.75;
        gs.player.vy *= 0.75;
      }
      gs.player.x = Math.max(PLAYER_RADIUS, Math.min(W - PLAYER_RADIUS, gs.player.x + gs.player.vx * dt));
      gs.player.y = Math.max(PLAYER_RADIUS, Math.min(H - PLAYER_RADIUS, gs.player.y + gs.player.vy * dt));

      /* auto-shoot */
      if (now - gs.lastShot > BULLET_COOLDOWN && gs.enemies.length) {
        autoShoot(gs, now);
      }

      /* move bullets */
      for (const b of gs.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }

      /* bullet–enemy collisions */
      const killB = new Set<number>();
      const killE = new Set<number>();
      for (const b of gs.bullets) {
        if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { killB.add(b.id); continue; }
        for (const e of gs.enemies) {
          if (killE.has(e.id)) continue;
          if (dist2(b.x, b.y, e.x, e.y) < (BULLET_RADIUS + ENEMY_RADIUS) ** 2) {
            e.hp -= BULLET_DAMAGE;
            killB.add(b.id);
            if (e.hp <= 0) { killE.add(e.id); burst(gs, e.x, e.y, '#ff5252', 8); }
          }
        }
      }
      gs.bullets = gs.bullets.filter(b => !killB.has(b.id));
      gs.enemies = gs.enemies.filter(e => !killE.has(e.id));

      /* move enemies + player collision */
      const speed = ENEMY_BASE_SPEED + (GAME_DURATION - gs.timer) * 0.9;
      for (const e of gs.enemies) {
        const dx = gs.player.x - e.x, dy = gs.player.y - e.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        e.x += (dx / len) * speed * dt;
        e.y += (dy / len) * speed * dt;
        if (len < PLAYER_RADIUS + ENEMY_RADIUS) {
          gs.player.hp -= ENEMY_DAMAGE * dt;
          if (gs.player.hp <= 0) {
            gs.player.hp = 0; gs.running = false;
            setResult('defeat'); return;
          }
        }
      }

      /* spawn */
      const rate = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_START - (GAME_DURATION - gs.timer) * 17);
      if (now - gs.lastSpawn > rate) spawnEnemy(gs, now);

      /* particles */
      for (const p of gs.particles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.92; p.vy *= 0.92;
        p.life -= dt * 2.2;
      }
      gs.particles = gs.particles.filter(p => p.life > 0);

      /* ── render ── */
      ctx.fillStyle = '#0d0d16';
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      /* particles (behind bullets) */
      for (const p of gs.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const b of gs.bullets) drawBullet(b);
      for (const e of gs.enemies) drawEnemy(e);
      drawPlayer(gs.player);
      drawHUD(gs);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    /* key listeners — canvas must be focused */
    const onDown = (e: KeyboardEvent) => {
      if (gsRef.current) gsRef.current.keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
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
        width: '100%',
        height: '580px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#0d0d16',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 0 60px rgba(0,229,255,0.04), 0 24px 80px rgba(0,0,0,0.8)',
      }}
      /* click to ensure keyboard focus */
      onClick={() => canvasRef.current?.focus()}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />

      {/* controls hint */}
      {!result && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.28)',
          fontSize: '11px', fontFamily: 'monospace',
          userSelect: 'none', pointerEvents: 'none',
          letterSpacing: '0.5px',
        }}>
          WASD / Arrow keys to move · Auto-attacks nearest enemy
        </div>
      )}

      {/* end screen */}
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
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
