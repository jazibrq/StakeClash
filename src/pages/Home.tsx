import { useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { HeroSection } from '@/components/home/HeroSection';
import { PartnersBanner } from '@/components/home/PartnersBanner';
import { Footer } from '@/components/layout/Footer';

/* Module-level singleton — survives route changes so position is preserved */
const bgMusic = new Audio('/audio/ghost.mp3');
bgMusic.loop  = true;
bgMusic.volume = 0.4;

const Home = () => {
  useEffect(() => {
    bgMusic.play().catch(() => {
      /* autoplay blocked — resume on first user interaction */
      const resume = () => {
        bgMusic.play().catch(() => {});
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('keydown', resume);
      };
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    });

    return () => {
      bgMusic.pause();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <VideoBackground />
      <Navigation />

      <main className="relative z-10">
        <HeroSection />

        {/* Partners Banner */}
        <PartnersBanner className="mt-48" />

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
};

export default Home;
