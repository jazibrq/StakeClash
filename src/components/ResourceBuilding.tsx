import React, { useState, memo } from 'react';
import '../styles/resource-building.css';

interface ResourceBuildingProps {
  type: 'mana' | 'gold' | 'diamond' | 'ore';
  symbol: string;
  yieldRate: number;
  color: string;
}

const videoMap: Partial<Record<string, string>> = {
  ore:  '/animations/ore1.mp4',
  gold: '/animations/gold1.mp4',
};

const placeholderMeta: Record<string, { emoji: string; label: string }> = {
  mana:    { emoji: '🔮', label: 'Mana Tower' },
  gold:    { emoji: '🏦', label: 'Gold Treasury' },
  diamond: { emoji: '💎', label: 'Crystal Forge' },
  ore:     { emoji: '⛏️', label: 'Mining Outpost' },
};

// Memoized so the video element never remounts on parent state changes
const BuildingVideo = memo(({ src }: { src: string }) => (
  <video
    src={src}
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: 'scale(1.35)',
      pointerEvents: 'none',
    }}
  />
));
BuildingVideo.displayName = 'BuildingVideo';

export const ResourceBuilding: React.FC<ResourceBuildingProps> = ({
  type,
  symbol,
  yieldRate,
  color,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { emoji, label } = placeholderMeta[type];
  const videoSrc = videoMap[type];

  return (
    <div
      className={`resource-building building-${type}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--building-color': color,
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      } as React.CSSProperties}
    >
      {/* Card */}
      <div
        className="building-content"
        style={{
          height: '280px',
          flexShrink: 0,
          flexDirection: 'column',
          gap: '10px',
          overflow: 'hidden',
          borderRadius: '12px',
          /* semi-transparent bg for all buildings */
          background: videoSrc
            ? 'rgba(10, 10, 18, 0.45)'
            : `linear-gradient(135deg, ${color}18, ${color}08)`,
          border: videoSrc
            ? '1px solid rgba(255,255,255,0.07)'
            : `2px dashed ${color}${isHovered ? '80' : '40'}`,
          transition: 'border-color 0.3s ease',
          backdropFilter: 'blur(2px)',
        }}
      >
        {videoSrc ? (
          <BuildingVideo src={videoSrc} />
        ) : (
          <>
            <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{emoji}</span>
            <span style={{ color, fontSize: '0.9rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {label}
            </span>
            <span style={{ color: '#8b7355', fontSize: '0.7rem', fontStyle: 'italic' }}>
              {symbol} · {yieldRate}% APY
            </span>
            <span style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
              [placeholder image]
            </span>
          </>
        )}
      </div>

      {/* Name + Level 1 below the card */}
      <div style={{ textAlign: 'center', pointerEvents: 'none', lineHeight: 1 }}>
        <div style={{
          color,
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          marginBottom: '5px',
        }}>
          {label}
        </div>
        <div style={{
          display: 'inline-block',
          color: '#a89070',
          fontSize: '0.62rem',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          border: '1px solid rgba(168,144,112,0.35)',
          borderRadius: '4px',
          padding: '2px 8px',
        }}>
          Level 1
        </div>
      </div>
    </div>
  );
};

export default ResourceBuilding;
