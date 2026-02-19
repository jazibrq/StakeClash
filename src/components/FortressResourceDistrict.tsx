import React from 'react';
import { ResourceBuilding } from './ResourceBuilding';
import '../styles/fortress-district.css';

/* ─── data ─────────────────────────────────────────────────── */

interface ResourceData {
  type: 'mana' | 'gold' | 'diamond' | 'ore';
  symbol: string;
  yieldRate: number;
  color: string;
  hudIcon: string;
  hudValue: string;
}

const resources: ResourceData[] = [
  { type: 'mana',    symbol: 'HBAR', yieldRate: 5,  color: '#60a5fa', hudIcon: '💧', hudValue: '8,400' },
  { type: 'gold',    symbol: 'SOL',  yieldRate: 8,  color: '#fbbf24', hudIcon: '🪙', hudValue: '5,230' },
  { type: 'diamond', symbol: 'ETH',  yieldRate: 12, color: '#a78bfa', hudIcon: '💎', hudValue: '120'   },
  { type: 'ore',     symbol: 'USDC', yieldRate: 6,  color: '#34d399', hudIcon: '⚙️', hudValue: '3,500' },
];

/* ─── central fortress SVG ──────────────────────────────────── */

const CentralFortress: React.FC = () => (
  <div className="coc-fortress-wrap">
    <svg viewBox="0 0 300 230" width="250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cf-stone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#8c7550" />
          <stop offset="100%" stopColor="#4e3c22" />
        </linearGradient>
        <linearGradient id="cf-keep" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#6a5838" />
          <stop offset="100%" stopColor="#3a2c18" />
        </linearGradient>
        <linearGradient id="cf-roof" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#5a4830" />
          <stop offset="100%" stopColor="#362a18" />
        </linearGradient>
      </defs>

      {/* ── LEFT TOWER ── */}
      <rect x="8"  y="72" width="78" height="158" fill="url(#cf-stone)" stroke="#3a2e18" strokeWidth="1.5" />
      {/* battlements */}
      {[10,28,46,64].map(x => (
        <rect key={x} x={x} y="54" width="14" height="22" fill="url(#cf-stone)" stroke="#3a2e18" strokeWidth="1.5" />
      ))}
      {/* stone courses */}
      <line x1="8"  y1="120" x2="86" y2="120" stroke="#3a2e18" strokeWidth="0.8" opacity="0.6" />
      <line x1="8"  y1="170" x2="86" y2="170" stroke="#3a2e18" strokeWidth="0.8" opacity="0.6" />
      {/* windows */}
      <rect x="37" y="100" width="16" height="26" rx="8" fill="#0a0810" />
      <rect x="37" y="145" width="16" height="26" rx="8" fill="#0a0810" />

      {/* ── RIGHT TOWER ── */}
      <rect x="214" y="72" width="78" height="158" fill="url(#cf-stone)" stroke="#3a2e18" strokeWidth="1.5" />
      {[216,234,252,270].map(x => (
        <rect key={x} x={x} y="54" width="14" height="22" fill="url(#cf-stone)" stroke="#3a2e18" strokeWidth="1.5" />
      ))}
      <line x1="214" y1="120" x2="292" y2="120" stroke="#3a2e18" strokeWidth="0.8" opacity="0.6" />
      <line x1="214" y1="170" x2="292" y2="170" stroke="#3a2e18" strokeWidth="0.8" opacity="0.6" />
      <rect x="247" y="100" width="16" height="26" rx="8" fill="#0a0810" />
      <rect x="247" y="145" width="16" height="26" rx="8" fill="#0a0810" />

      {/* ── CENTER KEEP ── */}
      <rect x="86" y="108" width="128" height="122" fill="url(#cf-keep)" stroke="#3a2e18" strokeWidth="1.5" />
      {/* battlements */}
      {[88,104,120,136,152,168,184,198].map(x => (
        <rect key={x} x={x} y="90" width="12" height="20" fill="url(#cf-stone)" stroke="#3a2e18" strokeWidth="1.5" />
      ))}
      <line x1="86" y1="155" x2="214" y2="155" stroke="#3a2e18" strokeWidth="0.8" opacity="0.5" />
      {/* keep windows */}
      <rect x="110" y="125" width="20" height="30" rx="10" fill="#0a0810" />
      <rect x="170" y="125" width="20" height="30" rx="10" fill="#0a0810" />

      {/* ── GATE ── */}
      <path d="M120 230 L120 188 Q120 165 150 165 Q180 165 180 188 L180 230 Z" fill="#060408" />
      {/* portcullis bars */}
      {[128,140,150,160,172].map(x => (
        <line key={x} x1={x} y1="188" x2={x} y2="230" stroke="#1c1810" strokeWidth="3" />
      ))}
      <line x1="120" y1="206" x2="180" y2="206" stroke="#1c1810" strokeWidth="2" />

      {/* ── FLAGS ── */}
      {/* left tower */}
      <line x1="47" y1="54" x2="47" y2="20" stroke="#6b5030" strokeWidth="2" />
      <rect x="47" y="20" width="28" height="18" fill="#b02020" className="cf-flag" />
      {/* right tower */}
      <line x1="253" y1="54" x2="253" y2="20" stroke="#6b5030" strokeWidth="2" />
      <rect x="253" y="20" width="28" height="18" fill="#b02020" className="cf-flag" />
      {/* center — bigger */}
      <line x1="150" y1="90" x2="150" y2="50" stroke="#6b5030" strokeWidth="2.5" />
      <rect x="150" y="50" width="36" height="24" fill="#cc2424" className="cf-flag-main" />
    </svg>

    {/* ground shadow */}
    <div className="coc-fortress-shadow" />
  </div>
);

/* ─── decorative props ──────────────────────────────────────── */

const Tree: React.FC<{ style: React.CSSProperties; s?: number }> = ({ style, s = 1 }) => (
  <div style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, ...style }}>
    <svg width={36 * s} height={48 * s} viewBox="0 0 36 48">
      <polygon points="18,1  32,18  4,18"  fill="#145408" />
      <polygon points="18,10 34,30  2,30"  fill="#1a6c0e" />
      <polygon points="18,20 36,44  0,44"  fill="#208014" />
      <rect x="14" y="43" width="8" height="5" fill="#5c3808" />
    </svg>
  </div>
);

const Rock: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, ...style }}>
    <svg width="30" height="20" viewBox="0 0 30 20">
      <ellipse cx="15" cy="14" rx="14" ry="7" fill="#4a4030" />
      <ellipse cx="15" cy="12" rx="12" ry="6" fill="#6a5e48" />
      <ellipse cx="12" cy="9"  rx="5"  ry="3" fill="#7a6e58" opacity="0.5" />
    </svg>
  </div>
);

/* ─── main component ────────────────────────────────────────── */

export const FortressResourceDistrict: React.FC = () => (
  <div className="coc-game-frame">

    {/* HUD */}
    <div className="coc-hud">
      {resources.map(r => (
        <div key={r.type} className="coc-hud-resource">
          <span className="coc-hud-icon">{r.hudIcon}</span>
          <div className="coc-hud-info">
            <span className="coc-hud-value">{r.hudValue}</span>
            <span className="coc-hud-label">{r.symbol}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Field */}
    <div className="coc-field">

      {/* Scattered trees — sit behind grid (z-index 2) */}
      <Tree style={{ left: '41%', top: '5%'   }} s={1.1} />
      <Tree style={{ left: '53%', top: '8%'   }} s={0.8} />
      <Tree style={{ left: '31%', top: '43%'  }} s={0.9} />
      <Tree style={{ right:'29%', top: '40%'  }} s={1.0} />
      <Tree style={{ left: '45%', bottom:'6%' }} s={0.95}/>
      <Tree style={{ right:'24%', bottom:'22%'}} s={0.8} />
      <Tree style={{ left: '22%', top: '22%'  }} s={0.75}/>
      <Rock style={{ left: '36%', top: '32%'  }} />
      <Rock style={{ right:'33%', bottom:'34%'}} />

      {/* 3×3 grid */}
      <div className="coc-base-grid">

        {/* Row 1 */}
        <div className="coc-cell"><ResourceBuilding {...resources[0]} /></div>
        <div className="coc-cell" />
        <div className="coc-cell"><ResourceBuilding {...resources[1]} /></div>

        {/* Row 2 — center fortress */}
        <div className="coc-cell" />
        <div className="coc-cell"><CentralFortress /></div>
        <div className="coc-cell" />

        {/* Row 3 */}
        <div className="coc-cell"><ResourceBuilding {...resources[2]} /></div>
        <div className="coc-cell" />
        <div className="coc-cell"><ResourceBuilding {...resources[3]} /></div>

      </div>
    </div>
  </div>
);

export default FortressResourceDistrict;
