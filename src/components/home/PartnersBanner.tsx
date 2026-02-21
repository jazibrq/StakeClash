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

const HBARxLogo = () => (
  <svg viewBox="0 0 32 32" className="w-auto h-6">
    <circle cx="16" cy="16" r="16" fill="#0A0A0A" />
    <circle cx="16" cy="16" r="15" fill="none" stroke="#3BE6C6" strokeWidth="1.5" />
    <g fill="white">
      <rect x="9.5" y="7.5" width="2.4" height="17" rx="0.6" />
      <rect x="20.1" y="7.5" width="2.4" height="17" rx="0.6" />
      <rect x="11.9" y="12.7" width="8.2" height="2.2" rx="0.6" />
      <rect x="11.9" y="17.1" width="8.2" height="2.2" rx="0.6" />
    </g>
    <path d="M22.8 21.8l3.2 3.2m0-3.2l-3.2 3.2" stroke="#3BE6C6" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const partners = [
  { name: 'Hedera', logo: HederaLogo, height: 'h-6', isComponent: true },
  { name: 'HBARx', logo: HBARxLogo, height: 'h-6', isComponent: true },
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
