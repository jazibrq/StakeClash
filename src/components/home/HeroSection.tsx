import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/AnimatedBackground';
import skillstackLogo from '@/assets/skillstack-logo.png';

export const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="relative z-10 text-center">
          {/* Glass panel behind hero content - liquid-glass refraction effect */}
          <GlassPanel active glow variant="subtle" className="p-8 md:p-12">
          {/* Ambient glow behind logo */}
          <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
            <div 
              className="w-64 h-32 opacity-40"
              style={{
                background: 'radial-gradient(ellipse at center, hsla(185, 100%, 50%, 0.3) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />
          </div>
          
          {/* Logo Image */}
          <div className="mb-8 flex justify-center relative">
            <img 
              src={skillstackLogo} 
              alt="SkillStack" 
              className="h-32 md:h-40 lg:h-52 w-auto drop-shadow-[0_0_40px_rgba(0,212,255,0.4)]"
            />
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 tracking-wide relative">
            Stake. Compete. Earn.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
            <Button size="lg" className="btn-cyan-gradient text-base px-8 h-12 uppercase">
              CONNECT WALLET
            </Button>
            <Link to="/play">
              <Button size="lg" variant="outline" className="btn-outline-glow text-base px-8 h-12 uppercase">
                PLAY
              </Button>
            </Link>
          </div>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
};
