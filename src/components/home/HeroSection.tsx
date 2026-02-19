import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import stakeclashLogo from '@/assets/stakeclashlogo.png';

export const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="relative z-10 text-center">

          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img
              src={stakeclashLogo}
              alt="StakeClash"
              className="h-32 md:h-40 lg:h-52 w-auto drop-shadow-[0_0_40px_rgba(239,68,68,0.35)]"
            />
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 tracking-wide font-ui">
            Stake. Compete. Earn.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="btn-cyan-gradient text-base px-8 h-12 uppercase">
              CONNECT WALLET
            </Button>
            <Link to="/clash">
              <Button size="lg" variant="outline" className="btn-outline-glow text-base px-8 h-12 uppercase">
                PLAY
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
