import uniswapLogo from '@/assets/uniswap-logo.svg';
import usdcLogo from '@/assets/usdc-logo.png';
import aaveLogo from '@/assets/aave-logo.png';

// Inline SVG components for crypto logos
const ETHLogo = () => (
  <svg viewBox="0 0 32 32" className="w-auto h-6">
    <circle cx="16" cy="16" r="16" fill="#627EEA"/>
    <path d="M16.498 4v8.87l7.497 3.35z" fill="white" opacity="0.6"/>
    <path d="M16.498 4L9 16.22l7.498-3.35z" fill="white"/>
    <path d="M16.498 21.968v6.027L24 17.616z" fill="white" opacity="0.6"/>
    <path d="M16.498 27.995v-6.028L9 17.616z" fill="white"/>
    <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="white" opacity="0.2"/>
    <path d="M9 16.22l7.498 4.353v-7.701z" fill="white" opacity="0.6"/>
  </svg>
);

const RETHLogo = () => (
  <svg viewBox="0 0 32 32" className="w-auto h-6">
    <circle cx="16" cy="16" r="16" fill="#FF6B6B"/>
    <path d="M16.498 4v8.87l7.497 3.35z" fill="white" opacity="0.6"/>
    <path d="M16.498 4L9 16.22l7.498-3.35z" fill="white"/>
    <path d="M16.498 21.968v6.027L24 17.616z" fill="white" opacity="0.6"/>
    <path d="M16.498 27.995v-6.028L9 17.616z" fill="white"/>
    <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="white" opacity="0.2"/>
    <path d="M9 16.22l7.498 4.353v-7.701z" fill="white" opacity="0.6"/>
  </svg>
);

const SOLLogo = () => (
  <svg viewBox="0 0 32 32" className="w-auto h-6">
    <circle cx="16" cy="16" r="16" fill="#000"/>
    <defs>
      <linearGradient id="sol-grad" x1="4" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#9945FF"/>
        <stop offset="50%" stopColor="#19FB9B"/>
        <stop offset="100%" stopColor="#00D1FF"/>
      </linearGradient>
    </defs>
    <path d="M9.5 20.8h13.6l-2.4 2.4H7.1z" fill="url(#sol-grad)"/>
    <path d="M9.5 8.8l2.4-2.4h13.6l-2.4 2.4z" fill="url(#sol-grad)"/>
    <path d="M22.5 14.8H8.9l2.4-2.4H25z" fill="url(#sol-grad)"/>
  </svg>
);

const HederaLogo = () => (
  <svg viewBox="0 0 32 32" className="w-auto h-6">
    <circle cx="16" cy="16" r="16" fill="#000"/>
    <g fill="white">
      <rect x="10" y="8" width="2" height="16" rx="0.5"/>
      <rect x="20" y="8" width="2" height="16" rx="0.5"/>
      <rect x="12" y="13" width="8" height="2" rx="0.5"/>
      <rect x="12" y="17" width="8" height="2" rx="0.5"/>
    </g>
  </svg>
);

const partners = [
  { name: 'UniSwap', logo: uniswapLogo, height: 'h-5', isComponent: false },
  { name: 'Solana', logo: SOLLogo, height: 'h-6', isComponent: true },
  { name: 'Hedera', logo: HederaLogo, height: 'h-6', isComponent: true },
  { name: 'USDC', logo: usdcLogo, height: 'h-6', isComponent: false },
  { name: 'ETH', logo: ETHLogo, height: 'h-6', isComponent: true },
  { name: 'rETH', logo: RETHLogo, height: 'h-6', isComponent: true },
  { name: 'aUSDC', logo: aaveLogo, height: 'h-6', isComponent: false },
];

// Duplicate for seamless loop
const items = [...partners, ...partners, ...partners, ...partners];

export const PartnersBanner = ({ className = '' }: { className?: string }) => {
  return (
    <section className={`bg-black py-6 overflow-hidden ${className}`}>
      <div className="relative">
        <div className="flex animate-scroll-x gap-6 w-max">
          {items.map((partner, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm whitespace-nowrap shrink-0"
            >
              {partner.isComponent ? (
                <partner.logo />
              ) : (
                <img src={partner.logo} alt={partner.name} className={`${partner.height} w-auto`} />
              )}
              <span className="text-sm font-medium text-foreground">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
