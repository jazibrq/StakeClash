import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Navigation } from '@/components/Navigation';
import RaidGame from '@/components/RaidGame';
import { useWalletContext } from '@/contexts/WalletContext';
import { usePlayerData } from '@/hooks/usePlayerData';
import wasdGif from '@/assets/Spritesheets/wasd-tutorial.gif';

type Phase = 'search' | 'searching' | 'selecting' | 'playing';

/* ── Animated sprite canvas ── */
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

/* ── Static random resource counts (generated once at module load) ── */
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const RESOURCE_COUNTS: [number, number, number, number][] = [
  [rand(10, 60),  rand(5, 35),   rand(2, 18),  rand(20, 80)],   // easy
  [rand(60, 150), rand(30, 90),  rand(15, 55), rand(80, 220)],  // medium
  [rand(150, 350),rand(90, 220), rand(50, 130),rand(200, 600)], // hard
];

const RESOURCES = [
  { name: 'Ore',     logo: '/images/resources/orelogo.png' },
  { name: 'Gold',    logo: '/images/resources/goldlogo.png' },
  { name: 'Diamond', logo: '/images/resources/diamondlogo.png' },
  { name: 'Mana',    logo: '/images/resources/manalogo.png' },
];

const COLUMNS = [
  {
    difficulty: 'Easy',
    stake: '0.001',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.35)',
    border: 'rgba(34,197,94,0.4)',
    wallet: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    heroName: 'Scarlet Knight',
    heroOffsetX: 56,
    heroScale: 2.2,
    heroSize: 124,
    sprite: { src: '/heroes/Knight_3/Idle.png', frames: 4, frameWidth: 128, frameHeight: 128 },
  },
  {
    difficulty: 'Medium',
    stake: '0.005',
    color: '#eab308',
    glow: 'rgba(234,179,8,0.35)',
    border: 'rgba(234,179,8,0.4)',
    wallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    heroName: 'Gold Keeper',
    heroOffsetX: 0,
    heroScale: 1.9,
    heroSize: 112,
    sprite: { src: '/heroes/Minotaur_1/Idle.png', frames: 10, frameWidth: 128, frameHeight: 128 },
  },
  {
    difficulty: 'Hard',
    stake: '0.01',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.35)',
    border: 'rgba(239,68,68,0.4)',
    wallet: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    heroName: 'Lone Nomad',
    heroOffsetX: 0,
    heroScale: 2.2,
    heroSize: 124,
    sprite: { src: '/heroes/Wanderer Magican/Idle.png', frames: 8, frameWidth: 128, frameHeight: 128 },
  },
] as const;

const RANDOM_OPPONENTS = [
  'ShadowBlade99', 'CryptoKnight', 'VaultHunter', 'NightReaper', 'IronFang77',
  'StormCaller', 'DarkForge', 'RuneWarden', 'BloodAxe', 'SilverWolf',
  'PhantomX', 'ArcaneRaider', 'GrimHollow', 'ThunderStrike', 'VoidWalker',
  'FrostByte', 'EtherSlayer', 'ObsidianX', 'ChaosEdge', 'LostSamurai',
];

const Clash = () => {
  const [phase, setPhase] = useState<Phase>('search');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const wallet = useWalletContext();
  const player = usePlayerData(wallet?.address ?? null);

  const handleMatchEnd = useCallback(
    (result: 'Won' | 'Lost', resources: { ore: number; gold: number; diamond: number; mana: number }) => {
      const opponent = RANDOM_OPPONENTS[Math.floor(Math.random() * RANDOM_OPPONENTS.length)];
      player.recordMatch({
        date:      new Date().toISOString(),
        opponent,
        size:      1,
        result,
        awards:    result === 'Won' ? '+48' : '+0',
        resources,
      });
    },
    [player],
  );

  const handleSearch = useCallback(() => {
    setPhase('searching');
    const delay = 1200 + Math.random() * 800; // 1.2–2s
    setTimeout(() => setPhase('selecting'), delay);
  }, []);

  const handlePlay = useCallback(() => {
    setPhase('playing');
    setTimeout(() => {
      containerRef.current?.requestFullscreen().catch(() => {});
    }, 50);
  }, []);

  const handleReturn = useCallback(() => {
    const exit = document.fullscreenElement
      ? document.exitFullscreen()
      : Promise.resolve();
    exit.finally(() => navigate('/'));
  }, [navigate]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <VideoBackground videoSrc="/videos/grimbackground.mp4" />
      <GrainOverlay />
      <Navigation forceWhiteNavText />

      {/* ── Searching / matchmaking loading screen ── */}
      {phase === 'searching' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10, gap: '24px',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '24px',
            background: 'linear-gradient(180deg, rgba(127,29,29,0.40), rgba(35,8,8,0.88))',
            border: '1px solid rgba(239,68,68,0.46)',
            borderRadius: '18px',
            padding: '48px 72px',
            boxShadow: '0 0 52px rgba(239,68,68,0.30), 0 8px 40px rgba(0,0,0,0.72)',
          }}>
          {/* Spinning ring */}
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            border: '3px solid rgba(239,68,68,0.15)',
            borderTop: '3px solid #ef4444',
            animation: 'clash-spin 0.9s linear infinite',
            boxShadow: '0 0 24px rgba(239,68,68,0.35)',
          }} />
          <div style={{
            fontFamily: 'monospace', fontSize: '13px',
            letterSpacing: '4px', color: 'rgba(255,255,255,0.75)',
          }}>
            FINDING MATCH
          </div>
          {/* Animated dots */}
          <div style={{
            display: 'flex', gap: '8px',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#ef4444',
                animation: `clash-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <style>{`
            @keyframes clash-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes clash-pulse {
              0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1.2); }
            }
          `}</style>
          </div>
        </div>
      )}

      {/* ── Search phase ── */}
      {phase === 'search' && (
        <div style={{
          position: 'absolute', inset: 0,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start',
          paddingTop: '120px', paddingBottom: '60px',
          zIndex: 10,
          gap: '56px',
        }}>
          {/* Search button */}
          <button
            onClick={handleSearch}
            style={{
              padding: '22px 72px',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '15px',
              fontWeight: 800, letterSpacing: '4px',
              cursor: 'pointer', fontFamily: 'monospace',
              boxShadow: '0 0 60px rgba(239,68,68,0.40), 0 6px 28px rgba(0,0,0,0.7)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 0 90px rgba(239,68,68,0.65), 0 6px 28px rgba(0,0,0,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(239,68,68,0.40), 0 6px 28px rgba(0,0,0,0.7)';
            }}
          >
            SEARCH FOR CLASH
          </button>

          {/* ── Tutorial ── */}
          <div style={{
            width: '100%', maxWidth: '680px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '32px',
          }}>
            {/* Title — matches nav: Pixelify Sans, white, uppercase, tracked */}
            <div style={{
              fontFamily: "'Pixelify Sans', system-ui, sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textShadow: '0 0 30px rgba(239,68,68,0.55)',
            }}>
              Tutorial
            </div>

            {/* Divider */}
            <div style={{
              width: '280px', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)',
            }} />

            {/* Controls grid */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
              width: '100%',
              padding: '0 16px',
              boxSizing: 'border-box',
            }}>

              {/* Movement row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(239,68,68,0.22)',
                borderRadius: '14px',
                padding: '20px 28px',
                gap: '24px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Pixelify Sans', system-ui, sans-serif",
                    fontSize: '16px',
                    color: '#ffffff',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}>
                    Movement
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.50)',
                    letterSpacing: '0.06em',
                  }}>
                    Move your character around the arena
                  </div>
                </div>
                <img
                  src={wasdGif}
                  alt="WASD movement keys"
                  style={{
                    height: '100px',
                    imageRendering: 'pixelated',
                    flexShrink: 0,
                  }}
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Selecting phase: 3 difficulty columns ── */}
      {phase === 'selecting' && (
        <div style={{
          position: 'absolute', inset: 0,
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: '80px 40px 40px',
        }}>
          <div style={{
            display: 'flex',
            gap: '28px',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: '1040px',
          }}>
            {COLUMNS.map((col, idx) => (
              <div
                key={col.difficulty}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(180deg, rgba(127,29,29,0.40), rgba(35,8,8,0.88))',
                  border: '1px solid rgba(239,68,68,0.46)',
                  borderRadius: '18px',
                  padding: '24px 20px 20px',
                  boxShadow: '0 0 52px rgba(239,68,68,0.30), 0 8px 40px rgba(0,0,0,0.72)',
                  gap: '14px',
                }}
              >
                {/* Difficulty label */}
                <div style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  textShadow: '0 0 24px rgba(239,68,68,0.7)',
                }}>
                  {col.difficulty}
                </div>

                {/* Hero name */}
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}>
                  {col.heroName}
                </div>

                {/* Hero idle animation */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  height: '214px',
                  width: '100%',
                }}>
                  <div style={{ transform: `translateX(${col.heroOffsetX}px)` }}>
                    <div style={{ transform: `scale(${col.heroScale})`, transformOrigin: 'bottom center' }}>
                      <AnimatedSprite
                        src={col.sprite.src}
                        frames={col.sprite.frames}
                        frameWidth={col.sprite.frameWidth}
                        frameHeight={col.sprite.frameHeight}
                        size={col.heroSize}
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  width: '100%',
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${col.border}, transparent)`,
                }} />

                {/* Resources available */}
                <div style={{ width: '100%' }}>
                  <div style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    marginBottom: '10px',
                    textAlign: 'center',
                  }}>
                    RESOURCES AVAILABLE:
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}>
                    {RESOURCES.map((res, ri) => (
                      <div
                        key={res.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          padding: '7px 10px',
                        }}
                      >
                        <img
                          src={res.logo}
                          alt={res.name}
                          style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }}
                        />
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.9)',
                          fontWeight: 700,
                        }}>
                          {RESOURCE_COUNTS[idx][ri]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wallet address above button */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: '2px',
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'monospace',
                    letterSpacing: '1.2px',
                    textAlign: 'center',
                  }}>
                    WALLET ADDRESS
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.78)',
                    textAlign: 'center',
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflowWrap: 'anywhere',
                    lineHeight: 1.35,
                  }}>
                    {col.wallet}
                  </div>
                </div>

                {/* Play button */}
                <button
                  onClick={handlePlay}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                    border: '1px solid rgba(248,113,113,0.75)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 900,
                    letterSpacing: '3px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    boxShadow: '0 0 34px rgba(239,68,68,0.48)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    marginTop: '4px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.boxShadow = '0 0 58px rgba(239,68,68,0.65)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 34px rgba(239,68,68,0.48)';
                  }}
                >
                  {col.difficulty}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Playing phase: fullscreen game ── */}
      {phase === 'playing' && (
        <div
          ref={containerRef}
          style={{
            position: 'fixed', inset: 0,
            zIndex: 100, background: '#000',
          }}
        >
          <RaidGame autoStart onReturn={handleReturn} onMatchEnd={handleMatchEnd} />
        </div>
      )}
    </div>
  );
};

export default Clash;
