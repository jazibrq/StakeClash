import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Wallet, ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import skillstackLogo from '@/assets/skillstack-logo.png';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Learn', path: '/learn' },
  { label: 'Fortress', path: '/fortress' },
  { label: 'Clash', path: '/clash' },
  { label: 'Hero', path: '/hero' },
];

export const Navigation = () => {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);

  const handleConnect = () => {
    setIsConnected(true);
  };

  // Update sliding indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return;
      const activeLink = navRef.current.querySelector(`a[href="${location.pathname}"]`) as HTMLElement;
      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();
        setIndicatorStyle({
          left: linkRect.left - navRect.left,
          width: linkRect.width,
        });
      }
    };
    
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [location.pathname]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
    >
        <div className="px-6">
          <div className="flex h-24 items-center">
            {/* Logo - Left */}
            <div className="flex-1 flex items-center">
              <Link to="/" className="flex items-center">
                <img
                  src={skillstackLogo}
                  alt="SkillStack"
                  className="h-20 w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation - Center */}
            <div ref={navRef} className="hidden md:flex flex-1 items-center justify-center gap-1 relative">
              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_hsl(185_100%_50%/0.5)] transition-all duration-300 ease-out"
                style={{
                  left: indicatorStyle.left + 16,
                  width: indicatorStyle.width - 32,
                  opacity: indicatorStyle.width > 0 ? 1 : 0
                }}
              />
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                  'px-4 py-2 text-lg font-medium transition-colors relative uppercase tracking-wide',
                    location.pathname === item.path
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Section - Right */}
          <div className="flex-1 flex items-center justify-end gap-4">
            {/* X (Twitter) Link */}
            <a
              href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-surface-2 transition-colors"
                aria-label="Follow us on X"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Connect Wallet / User Menu */}
              {isConnected ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default" className="gap-2 btn-outline-glow uppercase tracking-wide">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent" />
                      <span className="hidden sm:inline text-sm font-mono">0x1234...5678</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="uppercase tracking-wide">View Wallet</DropdownMenuItem>
                    <DropdownMenuItem className="uppercase tracking-wide">Transaction History</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsConnected(false)} className="uppercase tracking-wide">
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            ) : (
              <Button
                onClick={handleConnect}
                size="default"
                className="btn-cyan-gradient rounded-full px-6 uppercase tracking-wide"
              >
                <span className="hidden sm:inline">Connect Wallet</span>
              </Button>
            )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-black animate-slide-up">
          <div className="px-6 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-lg text-base font-medium transition-colors uppercase tracking-wide',
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
