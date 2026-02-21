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
  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-16" />
);

const Step = ({
  n, title, body,
}: { n: number; title: string; body: string }) => (
  <div className="flex gap-5">
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/30
                    flex items-center justify-center font-mono text-sm font-bold text-primary mt-0.5">
      {n}
    </div>
    <div>
      <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                   bg-primary/10 text-primary border border-primary/20">
    {children}
  </span>
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
    // ghost copies shifted left (partially clipped at canvas edge)
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

const DiffCard = ({
  title, body,
}: { title: string; body: string }) => (
  <div className="card-surface rounded-xl p-5 border-l-2 border-primary">
    <p className="font-semibold text-foreground text-sm mb-2">{title}</p>
    <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
  </div>
);

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
          <Pill>Documentation</Pill>
          <h1 className="text-4xl sm:text-5xl font-black mt-4 mb-5 leading-tight">
            How StakeClash Works
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            A complete, plain-language guide to the game, the staking layer,
            and how you earn — without risking your principal.
          </p>
        </div>

        {/* ── What is StakeClash ── */}
        <section id="what-is">
          <SectionLabel>Overview</SectionLabel>
          <SectionTitle>What is StakeClash?</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            StakeClash is a competitive strategy game built on top of decentralized finance.
            Players deposit real assets — ETH, stablecoins, and more — which are automatically
            put to work in yield-generating protocols. The <em className="text-foreground not-italic font-medium">interest earned</em> on
            those deposits becomes in-game resources. Players use those resources to build
            fortresses, compete in battles, and earn a share of the collective yield pool.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The key principle: <span className="text-foreground font-medium">your principal is never at risk.</span> You
            are not gambling your deposit. You are playing with the returns your money was already
            generating — StakeClash just makes that process interactive and competitive.
          </p>
          <div className="card-surface rounded-xl p-5 mt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
              The core idea in one sentence
            </p>
            <p className="text-base font-semibold text-foreground leading-snug">
              "Stake your assets. The yield becomes the game. Win more yield."
            </p>
          </div>
        </section>

        <Divider />

        {/* ── How It Works ── */}
        <section id="how-it-works">
          <SectionLabel>Step by Step</SectionLabel>
          <SectionTitle>How It Works</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            From connecting your wallet to earning rewards, here is the complete journey.
          </p>
          <div className="space-y-7">
            <Step
              n={1}
              title="Connect Your Wallet"
              body="Use MetaMask, WalletConnect, or any compatible Web3 wallet. No account creation, no email, no KYC. Your wallet is your identity."
            />
            <Step
              n={2}
              title="Deposit Supported Assets"
              body="Deposit ETH, USDC, or other supported tokens into your StakeClash Vault. You can deposit any amount above the protocol minimum. Your funds are held in a non-custodial smart contract — not by us."
            />
            <Step
              n={3}
              title="Your Principal is Staked Automatically"
              body="Immediately after deposit, your assets are delegated to audited yield-generating protocols (liquid staking, lending pools, or similar). Your principal remains intact and continues accruing yield around the clock."
            />
            <Step
              n={4}
              title="Yield Converts to In-Game Resources"
              body="The interest your deposit earns is converted into four in-game resources — Ore, Gold, Diamond, and Mana — at real-time rates. No yield, no resources. The game is self-funding from returns your money was already earning."
            />
            <Step
              n={5}
              title="Compete and Earn"
              body="Use your resources to build and upgrade your Fortress, then enter Clash battles against other players. Winners receive a larger share of the collective yield pool for that round."
            />
            <Step
              n={6}
              title="Withdrawal"
              body="You can only withdraw your full principal and earned yield at the end of the season."
            />
          </div>
        </section>

        <Divider />

        {/* ── Where Yield Comes From ── */}
        <section id="yield">
          <SectionLabel>The Finance Layer</SectionLabel>
          <SectionTitle>Where the Yield Comes From</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Yield is generated by putting deposited assets to work in established DeFi protocols.
            StakeClash does not create returns out of thin air — the yield is real and comes from
            one of several sources depending on the asset type.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              {
                label: 'Liquid Staking (ETH)',
                body: 'ETH deposits are staked via liquid staking protocols (e.g. Lido, Rocket Pool). Stakers earn Ethereum network validation rewards (~3–5% APY) while keeping their assets liquid.',
              },
              {
                label: 'Lending Pools (Stablecoins)',
                body: 'Stablecoins are supplied to lending protocols (e.g. Aave, Compound). Borrowers pay interest; depositors receive a share of that interest as yield.',
              },
              {
                label: 'Yield Aggregators',
                body: 'For maximum efficiency, assets may be routed through yield aggregators that automatically move funds to the highest-returning strategy at any given time.',
              },
              {
                label: 'Restaking Protocols',
                body: 'As restaking matures (e.g. EigenLayer), eligible assets may participate to generate additional yield on top of base staking rewards.',
              },
            ].map(({ label, body }) => (
              <div key={label} className="card-surface rounded-xl p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All yield-generating integrations are audited and disclosed in the protocol documentation.
            Yield rates fluctuate with market conditions and are never guaranteed — but the principal
            deposit itself is not exposed to the game outcome.
          </p>
        </section>

        <Divider />

        {/* ── How You Play ── */}
        <section id="gameplay">
          <SectionLabel>The Game Layer</SectionLabel>
          <SectionTitle>How You Play</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Gameplay is built around four resource types, each mapped to a class of in-game
            activity. Resources are generated passively from yield and consumed through strategic
            decisions.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <Resource
              name="Ore"
              icon="ore"
              description="The foundational resource. Used to construct and reinforce Fortress structures. High ore production means a more durable, harder-to-raid fortress."
            />
            <Resource
              name="Gold"
              icon="gold"
              description="The economy resource. Powers upgrades, boosts attack strength, and expands your storage capacity. More gold means faster progression."
            />
            <Resource
              name="Diamond"
              icon="diamond"
              description="The rare resource. Unlocks high-tier upgrades and elite abilities. Diamond production scales slowly — managing it strategically matters."
            />
            <Resource
              name="Mana"
              icon="mana"
              description="The power resource. Fuels special abilities in battle — shield spells, dash abilities, and the devastating Bladestorm ultimate."
            />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Resources accumulate over time based on your Fortress level and the yield your deposit
            is earning. Upgrading your Fortress increases production rates — giving players who
            engage more actively a compounding advantage over time.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In the Clash battle mode, you deploy into a 60-second real-time combat arena. Survive
            the raid and eliminate enemies to earn charge for your ultimate abilities and a stronger
            position in the rewards pool.
          </p>

          {/* ── Controls quick-reference ── */}
          <div className="mt-8">
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
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Sprint</p>
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
                <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* placeholder — ultimate animation coming */}
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

        {/* ── How You Win ── */}
        <section id="winning">
          <SectionLabel>Rewards</SectionLabel>
          <SectionTitle>How You Win</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Winning in StakeClash is not binary. Rewards are distributed continuously based on
            performance, not just placement.
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Yield Pool Allocation',
                body: 'All deposited assets earn yield collectively. A portion of that yield is pooled each round and redistributed among players weighted by battle performance. Stronger players earn a larger slice.',
              },
              {
                title: 'Fortress Ranking Bonuses',
                body: 'Players with higher-level Fortresses receive a passive yield bonus on their share — rewarding long-term engagement and resource investment.',
              },
              {
                title: 'Battle Outcomes',
                body: 'Surviving a Clash raid and defeating enemies earns you a performance score that directly increases your reward allocation for that epoch.',
              },
              {
                title: 'No Losers Scenario',
                body: 'Even players who lose battles continue earning base yield on their principal. The game layer is competitive for bonus yield — not survival of your deposit.',
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

        {/* ── Why It's Different ── */}
        <section id="why">
          <SectionLabel>Differentiators</SectionLabel>
          <SectionTitle>Why It's Different</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Most blockchain games either require you to speculate on game tokens or risk your
            deposit directly. StakeClash is built on a different set of principles.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <DiffCard
              title="No Speculation Required"
              body="You deposit assets you already hold. There is no native game token to buy, no speculative asset to acquire first. Your deposit is productive from day one."
            />
            <DiffCard
              title="Principal-Safe Architecture"
              body="The game is funded entirely by yield. Your deposit is never exposed to battle outcomes. You cannot lose your principal by playing — or by losing."
            />
            <DiffCard
              title="Real Underlying Yield"
              body="Rewards come from actual economic activity — staking validators, lending markets, liquidity protocols. Not from token inflation or unsustainable emissions."
            />
            <DiffCard
              title="Skill Has Meaning"
              body="Better players earn a larger share of the yield pool. This creates a genuinely competitive layer on top of passive staking — strategy and skill are rewarded."
            />
            <DiffCard
              title="Non-Custodial by Design"
              body="Your assets are held in smart contracts you can verify. StakeClash never takes custody of your funds. You can verify all movements on-chain."
            />
            <DiffCard
              title="Withdraw Anytime"
              body="No lock-up periods enforced by the game. Exit whenever you want. Your principal and unused yield are always accessible subject only to the underlying protocol's rules."
            />
          </div>
        </section>

        <Divider />

        {/* ── FAQ ── */}
        <section id="faq" className="mb-24">
          <SectionLabel>FAQ</SectionLabel>
          <SectionTitle>Frequently Asked Questions</SectionTitle>
          <div className="card-surface rounded-xl p-6 sm:p-8 space-y-6">
            <FAQ
              q="Do I need to understand DeFi to play?"
              a="No. StakeClash handles the staking and yield mechanics automatically after you deposit. You interact with the game layer — the protocol layer runs in the background. You do not need to understand liquid staking or lending pools to participate."
            />
            <FAQ
              q="Is this gambling?"
              a="No. Gambling involves risking your principal on an uncertain outcome. In StakeClash, your principal is never at risk. You are competing for a portion of yield that your deposit was already generating. The worst outcome of a lost battle is a smaller yield allocation — not a loss of your deposit."
            />
            <FAQ
              q="What happens to my deposit if I lose every battle?"
              a="Nothing. Your full principal remains staked and continues earning base yield. Only the competitive portion of the yield pool (the bonus layer) is affected by battle performance. Losing battles means earning less bonus yield, not losing your deposit."
            />
            <FAQ
              q="How are the underlying protocols selected?"
              a="StakeClash integrates only with audited, battle-tested DeFi protocols with substantial track records and total value locked. The full list of integrated protocols is disclosed in the on-chain documentation. Any change to the protocol set is governed by the StakeClash governance process."
            />
            <FAQ
              q="What are the fees?"
              a="StakeClash charges a small protocol fee on yield distributed through the game layer — not on your principal. The exact fee structure is detailed in the smart contract documentation and is set by governance."
            />
            <FAQ
              q="Which assets can I deposit?"
              a="Currently ETH and major stablecoins (USDC, DAI) are supported. Additional assets will be added via governance as new yield integrations are audited and approved."
            />
            <FAQ
              q="How long does it take to withdraw?"
              a="Withdrawals of yield are typically instant. Principal withdrawals depend on the underlying protocol: liquid staking may involve a 1–7 day unstaking queue, while stablecoin lending positions are usually instant. StakeClash imposes no additional lock-up beyond what the protocol requires."
            />
            <FAQ
              q="Is the code audited?"
              a="Yes. All StakeClash smart contracts are audited prior to mainnet deployment. Audit reports are published publicly. Given the non-custodial nature of the protocol, on-chain verification is always available."
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
