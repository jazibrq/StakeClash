import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { FortressResourceDistrict } from '@/components/FortressResourceDistrict';

const Fortress = () => {
  return (
    <div className="min-h-screen">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      <main className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Fortress</h1>
            <p className="text-muted-foreground">Build and upgrade your resource district</p>
          </div>

          <FortressResourceDistrict />
        </div>
      </main>
    </div>
  );
};

export default Fortress;
