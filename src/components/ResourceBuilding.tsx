import React, { useState, memo } from 'react';
import '../styles/fortress-district.css';

interface ResourceBuildingProps {
  type: 'mana' | 'gold' | 'diamond' | 'ore';
  symbol: string;
  yieldRate: number;
  color: string;
  hudIcon: string;
  hudValue: string;
}

const videoMap: Partial<Record<string, string>> = {
  ore:  '/animations/ore1.mp4',
  gold: '/animations/gold1.mp4',
};

const meta: Record<string, { label: string }> = {
  mana:    { label: 'Mana Tower'     },
  gold:    { label: 'Gold Treasury'  },
  diamond: { label: 'Crystal Forge'  },
  ore:     { label: 'Mining Outpost' },
};

/* ─── video (never remounts) ────────────────────────────────── */

const BuildingVideo = memo(({ src }: { src: string }) => (
  <video
    src={src}
    autoPlay muted loop playsInline preload="auto"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: 'scale(1.4)',
      pointerEvents: 'none',
    }}
  />
));
BuildingVideo.displayName = 'BuildingVideo';

/* ─── placeholder sprites (SVG — no card background) ────────── */

const ManaSprite: React.FC = () => (
  <svg viewBox="0 0 100 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mana-stone" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#3a3060" />
        <stop offset="100%" stopColor="#1e1838" />
      </linearGradient>
    </defs>
    {/* base */}
    <rect x="22" y="72" width="56" height="54" fill="url(#mana-stone)" stroke="#2a2048" strokeWidth="1.2" />
    {/* balcony */}
    <rect x="18" y="70" width="64" height="7" fill="#4a3c6a" stroke="#2a2048" strokeWidth="1" />
    {/* mid tower */}
    <rect x="30" y="38" width="40" height="38" fill="#2e2858" stroke="#1e1840" strokeWidth="1.2" />
    {/* cone roof */}
    <polygon points="50,6 26,40 74,40" fill="#24205a" stroke="#141438" strokeWidth="1.2" />
    {/* arched window */}
    <rect x="38" y="46" width="24" height="26" rx="12" fill="#0a0820" />
    <rect x="38" y="46" width="24" height="26" rx="12" fill="#3050d0" opacity="0.55" />
    {/* stone courses */}
    <line x1="22" y1="98"  x2="78" y2="98"  stroke="#2a2048" strokeWidth="0.8" opacity="0.6" />
    <line x1="22" y1="116" x2="78" y2="116" stroke="#2a2048" strokeWidth="0.8" opacity="0.6" />
    {/* stars */}
    <circle cx="35" cy="26" r="2"   fill="#8090ff" opacity="0.9" />
    <circle cx="50" cy="18" r="1.5" fill="#a0b0ff" opacity="0.8" />
    <circle cx="65" cy="28" r="2"   fill="#8090ff" opacity="0.7" />
    {/* battlements */}
    {[22,36,50,64].map(x => (
      <rect key={x} x={x} y="30" width="10" height="14" fill="url(#mana-stone)" stroke="#1e1840" strokeWidth="1" />
    ))}
  </svg>
);

const DiamondSprite: React.FC = () => (
  <svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dm-stone" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#4a3860" />
        <stop offset="100%" stopColor="#2a1e3a" />
      </linearGradient>
      <radialGradient id="dm-forge" cx="50%" cy="60%" r="50%">
        <stop offset="0%"   stopColor="#6030b0" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#300860" stopOpacity="0"   />
      </radialGradient>
    </defs>
    {/* foundation */}
    <rect x="12" y="68" width="76" height="48" fill="url(#dm-stone)" stroke="#2a1838" strokeWidth="1.2" rx="3" />
    {/* forge glow */}
    <circle cx="50" cy="78" r="30" fill="url(#dm-forge)" />
    {/* roof */}
    <polygon points="12,68 50,28 88,68" fill="#3a2c50" stroke="#1e1430" strokeWidth="1.2" />
    {/* main crystal */}
    <polygon points="50,40 37,64 50,82 63,64" fill="#7838d0" stroke="#5020a0" strokeWidth="1.5" />
    {/* inner highlight */}
    <polygon points="50,50 42,63 50,72 58,63" fill="#a060e8" opacity="0.65" />
    {/* stone courses on body */}
    <line x1="12" y1="92"  x2="88" y2="92"  stroke="#2a1838" strokeWidth="0.8" opacity="0.5" />
    <line x1="12" y1="108" x2="88" y2="108" stroke="#2a1838" strokeWidth="0.8" opacity="0.5" />
    {/* support beams */}
    <line x1="30" y1="68" x2="30" y2="116" stroke="#2a1c38" strokeWidth="3" />
    <line x1="70" y1="68" x2="70" y2="116" stroke="#2a1c38" strokeWidth="3" />
  </svg>
);

const spriteMap: Record<string, React.ReactNode> = {
  mana:    <ManaSprite />,
  diamond: <DiamondSprite />,
};

/* ─── main component ────────────────────────────────────────── */

const SPRITE_SIZE = 142;

export const ResourceBuilding: React.FC<ResourceBuildingProps> = ({ type, color }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { label } = meta[type];
  const videoSrc = videoMap[type];

  return (
    <div
      className="coc-building"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      {isHovered && (
        <div className="coc-tooltip">
          <div className="coc-tooltip-name" style={{ color }}>{label}</div>
          <div className="coc-tooltip-level">⚔ Level 1</div>
          <div className="coc-tooltip-arrow" />
        </div>
      )}

      {/* Sprite — no card background or border */}
      <div
        className="coc-sprite"
        style={{ width: SPRITE_SIZE, height: SPRITE_SIZE }}
      >
        {videoSrc
          ? <BuildingVideo src={videoSrc} />
          : spriteMap[type]
        }
      </div>

      {/* Ground shadow */}
      <div className="coc-ground-shadow" />
    </div>
  );
};

export default ResourceBuilding;
