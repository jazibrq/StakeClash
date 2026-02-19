import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { ScrollRoadmap } from '@/components/home/ScrollRoadmap';
import { ModelVisualizer } from '@/components/home/ModelVisualizer';
import { PartnersBanner } from '@/components/home/PartnersBanner';
import { Footer } from '@/components/layout/Footer';

const Learn = () => {
  return (
    <div className="min-h-screen">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />
      
      <main className="relative z-10 pt-16">
        <ScrollRoadmap />
        <ModelVisualizer />

        {/* Partners Banner */}
        <PartnersBanner className="mt-16" />

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
};

export default Learn;
