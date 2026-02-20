import React, { memo, useState, useEffect, useRef } from 'react';

type Resource = 'ore' | 'gold' | 'diamond' | 'mana';
type Level = 1 | 2 | 3;

/* ─── Stats config ─────────────────────────────────────────────── */
interface StatLine { label: string; value: string; delta?: string; }
interface LevelSpec {
  stats: StatLine[];
  requires?: { resource: Resource; label: string; amount: number }[];
}
interface FortressConfig {
  name: string;
  color: string;         // accent colour for UI
  levels: Record<Level, LevelSpec>;
}

const FORTRESS_CONFIG: Record<Resource, FortressConfig> = {
  ore: {
    name: 'Ore Mine',
    color: '#a0a0a0',
    levels: {
      1: {
        stats: [
          { label: 'Production',    value: '+2 ore/hr' },
          { label: 'Defense Boost', value: '10%' },
        ],
      },
      2: {
        stats: [
          { label: 'Production',    value: '+5 ore/hr' },
          { label: 'Defense Boost', value: '15%', delta: '+5%' },
        ],
        requires: [
          { resource: 'ore', label: 'Ore', amount: 50 },
        ],
      },
      3: {
        stats: [
          { label: 'Production',    value: '+10 ore/hr' },
          { label: 'Defense Boost', value: '25%', delta: '+10%' },
        ],
        requires: [
          { resource: 'ore', label: 'Ore', amount: 150 },
        ],
      },
    },
  },
  gold: {
    name: 'Gold Vault',
    color: '#f59e0b',
    levels: {
      1: {
        stats: [
          { label: 'Production',   value: '+1.5 gold/hr' },
          { label: 'Attack Boost', value: '5%' },
        ],
      },
      2: {
        stats: [
          { label: 'Production',   value: '+3 gold/hr' },
          { label: 'Attack Boost', value: '12%', delta: '+7%' },
        ],
        requires: [
          { resource: 'gold', label: 'Gold', amount: 30 },
        ],
      },
      3: {
        stats: [
          { label: 'Production',   value: '+6 gold/hr' },
          { label: 'Attack Boost', value: '20%', delta: '+8%' },
        ],
        requires: [
          { resource: 'gold', label: 'Gold', amount: 100 },
        ],
      },
    },
  },
  diamond: {
    name: 'Diamond Forge',
    color: '#38bdf8',
    levels: {
      1: {
        stats: [
          { label: 'Production',  value: '+0.5 diamond/hr' },
          { label: 'Speed Boost', value: '5%' },
        ],
      },
      2: {
        stats: [
          { label: 'Production',  value: '+1.2 diamond/hr' },
          { label: 'Speed Boost', value: '10%', delta: '+5%' },
        ],
        requires: [
          { resource: 'diamond', label: 'Diamond', amount: 5 },
        ],
      },
      3: {
        stats: [
          { label: 'Production',  value: '+2.5 diamond/hr' },
          { label: 'Speed Boost', value: '18%', delta: '+8%' },
        ],
        requires: [
          { resource: 'diamond', label: 'Diamond', amount: 25 },
        ],
      },
    },
  },
  mana: {
    name: 'Mana Sanctum',
    color: '#a855f7',
    levels: {
      1: {
        stats: [
          { label: 'Production',          value: '+0.8 mana/hr' },
          { label: 'Cooldown Reduction',  value: '5%' },
        ],
      },
      2: {
        stats: [
          { label: 'Production',          value: '+2 mana/hr' },
          { label: 'Cooldown Reduction',  value: '12%', delta: '+7%' },
        ],
        requires: [
          { resource: 'mana', label: 'Mana', amount: 10 },
        ],
      },
      3: {
        stats: [
          { label: 'Production',          value: '+4 mana/hr' },
          { label: 'Cooldown Reduction',  value: '20%', delta: '+8%' },
        ],
        requires: [
          { resource: 'mana', label: 'Mana', amount: 30 },
        ],
      },
    },
  },
};

/* ─── Shared resource state ────────────────────────────────────── */
/* In a real app this comes from the wallet / contract. For now we
   accumulate mock resources over time at a fixed rate.            */
export type Resources = Record<Resource, number>;

const PRODUCTION_PER_SEC: Record<Resource, number> = {
  ore:     2   / 3600,
  gold:    1.5 / 3600,
  diamond: 0.5 / 3600,
  mana:    0.8 / 3600,
};

/* ─── Tooltip ──────────────────────────────────────────────────── */
const Tooltip = ({
  resource, level, resources,
}: { resource: Resource; level: Level; resources: Resources }) => {
  const cfg   = FORTRESS_CONFIG[resource];
  const spec  = cfg.levels[level];
  const nextL = (level + 1) as Level;
  const next  = level < 3 ? cfg.levels[nextL] : null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,12,0.88)',
      backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
      padding: '18px', gap: '10px',
      zIndex: 20, pointerEvents: 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src={`/images/resources/${resource}logo.png`}
          alt={resource}
          style={{ width: 22, height: 22, imageRendering: 'pixelated', flexShrink: 0 }}
        />
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: cfg.color }}>
          {cfg.name}
        </span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'monospace', fontSize: '13px',
          color: 'rgba(255,255,255,0.4)', letterSpacing: '1px',
        }}>
          LV {level}
        </span>
      </div>

      {/* Current stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {spec.stats.map(s => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
            <span style={{ fontFamily: 'monospace', color: '#fff' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Next level upgrade */}
      {next && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
            LEVEL {nextL} UPGRADES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {next.stats.filter(s => s.delta).map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
                <span style={{ fontFamily: 'monospace', color: '#4ade80' }}>+{s.delta?.replace('+', '')}</span>
              </div>
            ))}
          </div>
          {/* Requirements */}
          {next.requires && (
            <>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
                REQUIRES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {next.requires.map(r => {
                  const have  = resources[r.resource];
                  const met   = have >= r.amount;
                  return (
                    <div key={r.resource} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <img
                          src={`/images/resources/${r.resource}logo.png`}
                          alt={r.label}
                          style={{ width: 18, height: 18, imageRendering: 'pixelated', flexShrink: 0 }}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{r.label}</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', color: met ? '#4ade80' : '#f87171' }}>
                        {Math.floor(have)} / {r.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {level === 3 && (
        <div style={{ fontSize: '13px', color: cfg.color, fontFamily: 'monospace', marginTop: 'auto' }}>
          MAX LEVEL
        </div>
      )}
    </div>
  );
};

/* ─── Individual resource panel ────────────────────────────────── */
const ResourcePanel = memo(({
  resource, resources, onLevelChange,
}: {
  resource: Resource;
  resources: Resources;
  onLevelChange: (r: Resource, l: Level) => void;
}) => {
  const [level, setLevel] = useState<Level>(1);
  const [hovered, setHovered] = useState(false);
  const levelRef = useRef(level);
  levelRef.current = level;

  const src = `/animations/${resource}${level}.mp4`;
  const cfg = FORTRESS_CONFIG[resource];

  /* Horizontal-only crop to trim black bars on sides; no vertical scaling
     so full top-to-bottom video content is visible. */
  const videoStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(1.16)',
    objectPosition: resource === 'diamond' ? 'center 55%' : 'center center',
  };

  /* auto-level when resources meet the next level's requirement */
  useEffect(() => {
    if (levelRef.current >= 3) return;
    const nextL = (levelRef.current + 1) as Level;
    const requires = cfg.levels[nextL].requires ?? [];
    const allMet = requires.every(r => resources[r.resource] >= r.amount);
    if (allMet) {
      setLevel(nextL);
      onLevelChange(resource, nextL);
    }
  }, [resources, cfg, resource, onLevelChange]);

  return (
    <div
      className="relative bg-black overflow-hidden w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <video
        key={src}
        src={src}
        autoPlay muted loop playsInline preload="auto"
        style={videoStyle}
      />

      {/* Level badge + selector */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '4px',
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          border: `1px solid ${cfg.color}55`,
          borderRadius: '6px',
          padding: '2px 10px',
          fontFamily: 'monospace', fontSize: '11px',
          color: cfg.color, fontWeight: 700, letterSpacing: '1px',
        }}>
          LV {level}
        </div>
        {([1, 2, 3] as Level[]).map(lv => (
          <button
            key={lv}
            onClick={(ev) => { ev.stopPropagation(); setLevel(lv); onLevelChange(resource, lv); }}
            style={{
              width: 22, height: 22,
              borderRadius: '4px',
              border: lv === level ? `1px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.15)',
              background: lv === level ? `${cfg.color}22` : 'rgba(0,0,0,0.6)',
              color: lv === level ? cfg.color : 'rgba(255,255,255,0.45)',
              fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {lv}
          </button>
        ))}
      </div>

      {/* Name badge */}
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 10,
        fontFamily: 'monospace', fontSize: '11px',
        color: 'rgba(255,255,255,0.55)', letterSpacing: '0.5px',
      }}>
        {cfg.name}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <Tooltip resource={resource} level={level} resources={resources} />
      )}
    </div>
  );
});
ResourcePanel.displayName = 'ResourcePanel';

/* ─── 2×2 grid ─────────────────────────────────────────────────── */
const resources: Resource[] = ['ore', 'gold', 'diamond', 'mana'];

export const FortressResourceDistrict: React.FC<{
  resources: Resources;
  onLevelChange: (r: Resource, l: Level) => void;
}> = ({ resources: res, onLevelChange }) => (
  <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-black">
    {resources.map((r) => (
      <ResourcePanel key={r} resource={r} resources={res} onLevelChange={onLevelChange} />
    ))}
  </div>
);

export default FortressResourceDistrict;
