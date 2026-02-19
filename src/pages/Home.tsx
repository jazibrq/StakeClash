import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { HeroSection } from '@/components/home/HeroSection';
import { PartnersBanner } from '@/components/home/PartnersBanner';
import { Footer } from '@/components/layout/Footer';

const Home = () => {
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
