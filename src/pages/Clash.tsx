import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import AnimatedSprite from '@/components/AnimatedSprite';
import RaidGame from '@/components/RaidGame';
import { useWalletContext } from '@/contexts/WalletContext';
import { usePlayerData } from '@/hooks/usePlayerData';
import { SHARED_RESOURCES_KEY } from '@/lib/constants';
type Phase = 'search' | 'searching' | 'selecting' | 'playing';

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
  const [searchProgress, setSearchProgress] = useState(0);
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

      if (result === 'Won') {
        try {
          const raw = localStorage.getItem(SHARED_RESOURCES_KEY);
          const current = raw ? JSON.parse(raw) : { ore: 1000, gold: 564, diamond: 276, mana: 821 };
          const updated = {
            ore:     (current.ore     ?? 0) + resources.ore,
            gold:    (current.gold    ?? 0) + resources.gold,
            diamond: (current.diamond ?? 0) + resources.diamond,
            mana:    (current.mana    ?? 0) + resources.mana,
          };
          localStorage.setItem(SHARED_RESOURCES_KEY, JSON.stringify(updated));
        } catch { /* ignore storage errors */ }
      }
    },
    [player],
  );

  const handleSearch = useCallback(() => {
    setPhase('searching');
    setSearchProgress(0);
    const delay = 1200 + Math.random() * 800; // 1.2–2s
    setTimeout(() => setPhase('selecting'), delay);
  }, []);

  useEffect(() => {
    if (phase !== 'searching') {
      if (phase === 'selecting' || phase === 'playing') setSearchProgress(100);
      return;
    }
    setSearchProgress(0);
    const start = performance.now();
    const duration = 1800; // slightly longer than min delay so it rarely hits 100 early
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out curve that plateaus around 90% so it never looks complete prematurely
      const eased = 1 - Math.pow(1 - t, 2.5);
      setSearchProgress(Math.min(Math.round(eased * 90), 90));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

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
    <PageLayout
      style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}
      videoSrc="/videos/grimbackground.mp4"
      forceWhiteNavText
    >

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
          {/* Progress bar */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              width: '100%', height: 6, borderRadius: 99,
              background: 'rgba(239,68,68,0.18)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${searchProgress}%`,
                borderRadius: 99,
                background: 'linear-gradient(90deg, #ef4444, #f97316)',
                boxShadow: '0 0 10px rgba(239,68,68,0.6)',
                transition: 'width 0.25s ease-out',
              }} />
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: '11px',
              letterSpacing: '2px', color: 'rgba(239,68,68,0.8)',
              textAlign: 'right',
            }}>
              {searchProgress}%
            </div>
          </div>
          <style>{`
            @keyframes clash-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          </div>
        </div>
      )}

      {/* ── Search phase ── */}
      {phase === 'search' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          paddingLeft: '20px', paddingRight: '20px',
          zIndex: 10,
        }}>
          <button
            onClick={handleSearch}
            style={{
              padding: '18px 58px',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px',
              fontWeight: 800, letterSpacing: '3px',
              cursor: 'pointer', fontFamily: 'monospace',
              boxShadow: '0 0 54px rgba(239,68,68,0.40), 0 6px 26px rgba(0,0,0,0.7)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 0 86px rgba(239,68,68,0.65), 0 6px 28px rgba(0,0,0,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 54px rgba(239,68,68,0.40), 0 6px 26px rgba(0,0,0,0.7)';
            }}
          >
            SEARCH FOR CLASH
          </button>
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
    </PageLayout>
  );
};

export default Clash;
