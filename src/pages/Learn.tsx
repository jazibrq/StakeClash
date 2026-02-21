import { useRef, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Footer } from '@/components/layout/Footer';
import { PartnersBanner } from '@/components/home/PartnersBanner';
import wKeyPng from '@/assets/Spritesheets/W.png';
import aKeyPng from '@/assets/Spritesheets/A.png';
import sKeyPng from '@/assets/Spritesheets/S.png';
import dKeyPng from '@/assets/Spritesheets/D.png';
import spaceKeyPng from '@/assets/Spritesheets/SPACE.png';
import shiftKeyPng from '@/assets/Spritesheets/SHIFT.png';
import fKeyPng from '@/assets/Spritesheets/F.png';
import xKeyPng from '@/assets/Spritesheets/X.png';

/* ─── small reusable pieces ─────────────────────────────── */

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
    {children}
  </p>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 leading-tight">
    {children}
  </h2>
);

const Divider = () => (
  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" />
);

const Step = ({
  n, title, body,
}: { n: number; title: string; body: React.ReactNode }) => (
  <div className="flex gap-5">
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/30
                    flex items-center justify-center font-mono text-sm font-bold text-primary mt-0.5">
      {n}
    </div>
    <div>
      <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
      <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
    </div>
  </div>
);

const FAQ = ({ q, a }: { q: string; a: string }) => (
  <div className="border-b border-border pb-6 last:border-0 last:pb-0">
    <p className="font-semibold text-foreground text-sm mb-2">{q}</p>
    <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
  </div>
);

const Resource = ({
  name, icon, description,
}: { name: string; icon: string; description: string }) => (
  <div className="card-surface rounded-xl p-4 flex gap-4 items-start">
    <img
      src={`/images/resources/${icon}logo.png`}
      alt={name}
      className="w-8 h-8 mt-0.5 flex-shrink-0"
      style={{ imageRendering: 'pixelated' }}
    />
    <div>
      <p className="font-semibold text-foreground text-sm mb-1">{name}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

/* ── Canvas-based sprite components for controls reference ── */

const AnimatedSprite = ({
  src, frames, frameWidth, frameHeight, frameDuration = 150, size = 96,
}: {
  src: string; frames: number; frameWidth: number; frameHeight: number;
  frameDuration?: number; size?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const frameRef  = useRef(0);
  const timerRef  = useRef(0);
  const rafRef    = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const img = imgRef.current;
    if (!ctx || !img || !img.complete) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, frameRef.current * frameWidth, 0, frameWidth, frameHeight, 0, 0, size, size);
  }, [frameWidth, frameHeight, size]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => { imgRef.current = img; draw(); };
    imgRef.current = img;
  }, [src, draw]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      timerRef.current += dt;
      if (timerRef.current >= frameDuration) {
        timerRef.current -= frameDuration;
        frameRef.current = (frameRef.current + 1) % frames;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, frameDuration, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', width: size, height: size, display: 'block' }}
    />
  );
};

/* ── Sprint: run animation with afterimage ghost trail ── */
const DashAnim = ({ size = 96 }: { size?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const frameRef  = useRef(0);
  const timerRef  = useRef(0);
  const rafRef    = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = imgRef.current;
    ctx.clearRect(0, 0, size, size);
    if (!img || !img.complete || !img.naturalWidth) return;
    const sx = frameRef.current * 128;
    const ghosts = [{ dx: -30, a: 0.12 }, { dx: -20, a: 0.25 }, { dx: -10, a: 0.42 }];
    for (const g of ghosts) {
      ctx.globalAlpha = g.a;
      ctx.drawImage(img, sx, 0, 128, 128, g.dx, 0, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(img, sx, 0, 128, 128, 0, 0, size, size);
  }, [size]);

  useEffect(() => {
    const img = new Image();
    img.src = '/heroes/Run.png';
    img.onload = () => { imgRef.current = img; draw(); };
    imgRef.current = img;
  }, [draw]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      timerRef.current += dt;
      if (timerRef.current >= 60) {
        timerRef.current -= 60;
        frameRef.current = (frameRef.current + 1) % 8;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', width: size, height: size, display: 'block' }}
    />
  );
};

/* ── Shield: idle character + pulsing blue orb ── */
const ShieldAnim = ({ size = 96, charOffsetX = 0 }: { size?: number; charOffsetX?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const frameRef  = useRef(0);
  const timerRef  = useRef(0);
  const pulseRef  = useRef(0);
  const imgRef    = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, frameRef.current * 128, 0, 128, 128, charOffsetX, 0, size, size);
    }
    pulseRef.current += 0.03;
    const pulse = 0.5 + 0.5 * Math.sin(pulseRef.current);
    const cx = size / 2;
    const cy = size * 0.60;
    const radius = size * 0.27 + pulse * size * 0.03;
    ctx.save();
    ctx.shadowColor = '#1e88e5';
    ctx.shadowBlur  = 22 + pulse * 8;
    ctx.globalAlpha = 0.38 + pulse * 0.10;
    ctx.fillStyle   = '#42a5f5';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  }, [size, charOffsetX]);

  useEffect(() => {
    const img = new Image();
    img.src = '/heroes/Idle.png';
    img.onload = () => { imgRef.current = img; draw(); };
    imgRef.current = img;
  }, [draw]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      timerRef.current += dt;
      if (timerRef.current >= 130) {
        timerRef.current -= 130;
        frameRef.current = (frameRef.current + 1) % 6;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
};

/* ── Pixel-art key image (static idle frame) ── */
const KeySprite = ({
  src, frameWidth, frameHeight, displayHeight,
}: {
  src: string; frameWidth: number; frameHeight: number; displayHeight: number;
}) => {
  const scale = displayHeight / frameHeight;
  const width = Math.round(frameWidth * scale);
  const bgW   = Math.round(frameWidth * scale * 2);
  return (
    <div
      style={{
        width,
        height: displayHeight,
        flexShrink: 0,
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgW}px ${displayHeight}px`,
        backgroundPosition: `-${width}px 0px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
};

/* Manual tweak point for Ultimate sprite position in Controls section */
const ULTIMATE_SPRITE_OFFSET = { x: 3, y: 28 };

/* ─── page ──────────────────────────────────────────────── */

const Learn = () => (
  <div className="min-h-screen">
    <VideoBackground />
    <GrainOverlay />
    <Navigation />

    <main className="relative z-10 pt-24 pb-0">
      <div
        className="max-w-3xl mx-auto px-8 py-10 rounded-2xl"
        style={{ background: 'rgba(5, 5, 15, 0.82)', backdropFilter: 'blur(10px)' }}
      >

        {/* ── Hero ── */}
        <div className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-black mt-4 mb-5 leading-tight">
            ⚔️ How StakeClash Works
          </h1>
        </div>

        {/* ── The Big Idea ── */}
        <section id="big-idea">
          <SectionLabel>Overview</SectionLabel>
          <SectionTitle>The Big Idea</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            StakeClash turns staking into a competitive strategy game.
          </p>
          <ul className="space-y-2 mb-6">
            {[
              'You deposit crypto like ETH, Hedera, or USDC.',
              'That deposit earns real yield in the background.',
              'The yield becomes proportional to in-game resources, with each cryptocurrency representing a resource.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            You use those resources to build, upgrade, attack, defend, and compete.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            At the end of the season, you receive:
          </p>
          <ul className="space-y-2 mb-6">
            {[
              'Your full principal back',
              'Your base yield',
              'A larger or smaller share of the bonus yield pool depending on how well you played',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-foreground font-medium">
                <span className="text-primary mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" />

        {/* ── Step by Step ── */}
        <section id="how-it-works">
          <SectionLabel>Step by Step</SectionLabel>
          <SectionTitle>How It Works</SectionTitle>
          <div className="space-y-7 mb-10">
            <Step
              n={1}
              title="Connect Your Wallet"
              body=""
            />
            <Step
              n={2}
              title="Deposit Crypto to Unlock Buildings"
              body={
                <span>
                  When you deposit supported assets (ETH, USDC, etc.), you unlock buildings in your Fortress.
                  Each building generates in-game resources over time, provides buffs to your hero or defenses,
                  and increases your share of the season's yield pool. More deposits = stronger buildings = higher resource production.
                  Your crypto is automatically put to work in real yield-generating protocols in the background.
                </span>
              }
            />
            <Step
              n={3}
              title="Yield Turns Into Resources"
              body="You earn a fixed amount of resources per day depending on how much of the corresponding cryptocurrency you deposited to be staked. This allows users that deposited more to get proportionally more resources, to give incentive to expand the prize pool."
            />
          </div>

          {/* ── Resource cards ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Resource
              name="Ore"
              icon="ore"
              description="Earned from Ore Mine and buffs defense attributes, associated with Hedera."
            />
            <Resource
              name="Gold"
              icon="gold"
              description="Earned from Gold Vault and buffs attack attributes, associated with USDC."
            />
            <Resource
              name="Diamond"
              icon="diamond"
              description="Earned from Diamond Forge and buffs Speed, associated with ETH."
            />
            <Resource
              name="Mana"
              icon="mana"
              description="Earned from Mana Sanctum, buffs cooldown reduction."
            />
          </div>
        </section>

        <Divider />

        {/* ── Season Structure ── */}
        <section id="season-structure">
          <SectionLabel>Seasons</SectionLabel>
          <SectionTitle>Season Structure</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Each cycle of StakeClash has two phases:
          </p>
          <div className="space-y-4">
            <div className="card-surface rounded-xl p-5 flex gap-4">
              <div className="flex-shrink-0 w-1.5 rounded-full bg-primary/50 self-stretch" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Deposit Period</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Players deposit supported assets to unlock buildings and prepare their Fortress. During this phase, no battles occur.
                </p>
              </div>
            </div>
            <div className="card-surface rounded-xl p-5 flex gap-4">
              <div className="flex-shrink-0 w-1.5 rounded-full bg-primary/50 self-stretch" />
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Season Period</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Once the season begins, deposits are locked for the duration of that season. Players compete, generate resources from yield, upgrade buildings, raid opponents, and climb the rankings.
                  At the end of the season, principal and yield are automatically settled according to performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── The Strategy Layer ── */}
        <section id="strategy">
          <SectionLabel>The Game Layer</SectionLabel>
          <SectionTitle>The Strategy Layer</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            StakeClash isn't passive. It's strategic. Every season, you choose how to use your resources:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              {
                title: 'Upgrade Now?',
                body: 'Invest resources into buildings or heroes for long-term production boosts and stronger stat buffs.',
              },
              {
                title: 'Save for Endgame?',
                body: 'Hold resources and unleash stronger upgrades or abilities near the end of the season.',
              },
              {
                title: 'Play Aggressively?',
                body: 'Attack other players to steal a portion of their accumulated in-game currency.',
              },
              {
                title: 'Play Defensively?',
                body: 'Upgrade fortifications to make raids against you less profitable.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="card-surface rounded-xl p-5 border-l-2 border-primary">
                <p className="font-semibold text-foreground text-sm mb-2">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            There is no single optimal path. Different strategies work in different seasons.
          </p>
        </section>

        <Divider />

        {/* ── Heroes & Battles ── */}
        <section id="heroes">
          <SectionLabel>Combat</SectionLabel>
          <SectionTitle>Heroes & Battles</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            You choose a Hero to represent you in battle. Your hero:
          </p>
          <ul className="space-y-2 mb-6">
            {[
              'Defends your fortress when others attack',
              'Attacks enemy fortresses in Clash mode',
              'Uses abilities powered by Mana',
              'Gains advantages from your building upgrades',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Battles are short, skill-based, and strategic.
          </p>

          {/* ── Controls quick-reference ── */}
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Controls</p>
            <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">How To Play</h3>
            <div className="h-px mb-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }} />
            {/* Top row: Move, Attack, Sprint */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="card-surface rounded-xl p-4 flex flex-col items-center gap-2">
                <div style={{ transform: 'translateX(16px)' }}>
                  <AnimatedSprite src="/heroes/Run.png" frames={8} frameWidth={128} frameHeight={128} frameDuration={100} size={96} />
                </div>
                <div style={{ height: 76, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <KeySprite src={wKeyPng} frameWidth={17} frameHeight={16} displayHeight={38} />
                    <div style={{ display: 'flex', gap: 3 }}>
                      <KeySprite src={aKeyPng} frameWidth={17} frameHeight={16} displayHeight={38} />
                      <KeySprite src={sKeyPng} frameWidth={17} frameHeight={16} displayHeight={38} />
                      <KeySprite src={dKeyPng} frameWidth={17} frameHeight={16} displayHeight={38} />
                    </div>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Move</p>
              </div>
              <div className="card-surface rounded-xl p-4 flex flex-col items-center gap-2">
                <div style={{ transform: 'translateX(6px)' }}>
                  <AnimatedSprite src="/heroes/Attack.png" frames={4} frameWidth={128} frameHeight={128} frameDuration={100} size={96} />
                </div>
                <div style={{ height: 76, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <KeySprite src={spaceKeyPng} frameWidth={67} frameHeight={16} displayHeight={44} />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Attack</p>
              </div>
              <div className="card-surface rounded-xl p-4 flex flex-col items-center gap-2">
                <div style={{ transform: 'translateX(14px)' }}>
                  <DashAnim size={96} />
                </div>
                <div style={{ height: 76, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <KeySprite src={shiftKeyPng} frameWidth={44} frameHeight={16} displayHeight={44} />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Dash</p>
              </div>
            </div>
            {/* Bottom row: Shield, Ultimate — centered */}
            <div className="grid grid-cols-2 gap-3" style={{ maxWidth: '67%', margin: '0 auto' }}>
              <div className="card-surface rounded-xl p-4 flex flex-col items-center gap-2">
                <div style={{ marginTop: 10 }}>
                  <ShieldAnim size={96} charOffsetX={20} />
                </div>
                <div style={{ height: 76, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <KeySprite src={fKeyPng} frameWidth={17} frameHeight={16} displayHeight={44} />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Shield</p>
              </div>
              <div className="card-surface rounded-xl p-4 flex flex-col items-center gap-2">
                <div style={{
                  width: 96,
                  height: 96,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translate(${ULTIMATE_SPRITE_OFFSET.x}px, ${ULTIMATE_SPRITE_OFFSET.y}px)`,
                }}>
                  <img
                    src="/heroes/prayer.png"
                    alt="Ultimate"
                    style={{ width: 96, height: 96, objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }}
                  />
                </div>
                <div style={{ height: 76, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <KeySprite src={xKeyPng} frameWidth={17} frameHeight={16} displayHeight={44} />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Ultimate</p>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Attacking & Raiding ── */}
        <section id="raiding">
          <SectionLabel>PvP</SectionLabel>
          <SectionTitle>Attacking & Raiding</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            You can raid other players to take a portion of their accumulated in-game resources. Raiding:
          </p>
          <ul className="space-y-2 mb-6">
            {[
              'Does not affect their principal deposit',
              'Does not affect their base yield',
              'Only affects in-game resource balances',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This creates a competitive economy without risking real deposits.
          </p>
        </section>

        <Divider />

        {/* ── End of Season ── */}
        <section id="rewards">
          <SectionLabel>Rewards</SectionLabel>
          <SectionTitle>End of Season: How Rewards Work</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            At the end of a season, all players receive their full principal back and their base yield.
            A bonus yield pool is then distributed based on performance.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">Your allocation depends on:</p>
          <ul className="space-y-2 mb-6">
            {[
              'How much in-game currency you accumulated',
              'Your battle performance',
              'Your overall strategic choices',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="card-surface rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Better play = larger share of bonus yield.</p>
            <p className="text-xs text-muted-foreground">
              But even if you lose every battle, your deposit remains intact and earning.
            </p>
          </div>
        </section>

        <Divider />

        {/* ── Where the Yield Comes From ── */}
        <section id="yield">
          <SectionLabel>The Finance Layer</SectionLabel>
          <SectionTitle>Where the Yield Comes From</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            StakeClash does not invent returns. Deposited assets are routed to real DeFi protocols:
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'ETH', body: 'Liquid staking' },
              { label: 'Stablecoins', body: 'Lending pools' },
              { label: 'Future', body: 'Yield aggregators or restaking' },
            ].map(({ label, body }) => (
              <div key={label} className="card-surface rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Yield rates fluctuate. They are not guaranteed. But your principal is never exposed to battle outcomes.
          </p>
        </section>

        <Divider />

        {/* ── How the Backend Works ── */}
        <section id="backend">
          <SectionLabel>Technical</SectionLabel>
          <SectionTitle>How the Backend Works</SectionTitle>
          <div className="space-y-4">
            {[
              {
                title: 'On-Chain Deposit Tracking',
                body: 'HBAR deposits tracked via Hedera mirror nodes. ETH and USDC are on-chain transfers to the treasury wallet. All movements verifiable publicly — no off-chain ledgers.',
              },
              {
                title: 'External Yield Generation',
                body: 'Assets are routed to audited yield protocols (liquid staking, lending pools). StakeClash does not create yield — it is generated externally and reflected in the game layer.',
              },
              {
                title: 'Network-Level Season Timing (Hedera Schedule Service)',
                body: 'Season timing uses Hedera\'s native Schedule Service — no cron jobs. On start, a time-locked transaction is scheduled. At expiry, Hedera executes it automatically, even if the backend is offline.',
              },
              {
                title: 'Mirror-Based Settlement Trigger',
                body: 'The backend listens to Hedera mirror nodes. When the scheduled transaction executes, ETH and USDC refunds are triggered automatically — event-driven, not manually initiated.',
              },
              {
                title: 'Automatic Cross-Chain Settlement',
                body: 'Hedera refund executes → mirror node confirms → backend detects → ETH and USDC refunds sent → season concludes. No admin intervention required.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="card-surface rounded-xl p-5 flex gap-4">
                <div className="flex-shrink-0 w-1.5 rounded-full bg-primary/50 self-stretch" />
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Divider />


        {/* ── FAQ ── */}
        <section id="faq" className="mb-24">
          <SectionLabel>FAQ</SectionLabel>
          <SectionTitle>Frequently Asked Questions</SectionTitle>
          <div className="card-surface rounded-xl p-6 sm:p-8 space-y-6">
            <FAQ
              q="Can I lose my deposit?"
              a="No. As soon as the season starts, Hedera scheduling service creates a transaction to refund your initial deposit at the end of the season period. Losing only affects your share of bonus yield — not your original deposit."
            />
            <FAQ
              q="Is this gambling?"
              a="No. Gambling risks your principal on uncertain outcomes. In StakeClash, you compete for yield that your deposit was already generating. The worst outcome is earning less bonus yield — not losing your deposit."
            />
            <FAQ
              q="Do I need to understand DeFi to play?"
              a="No. The staking layer runs automatically in the background. You focus on upgrading buildings, managing resources, and winning battles."
            />
          </div>
        </section>

      </div>

      <PartnersBanner className="mt-16" />
      <Footer />
    </main>
  </div>
);

export default Learn;
