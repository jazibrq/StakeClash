import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import RaidGame from '@/components/RaidGame';

const Clash = () => (
  <div className="min-h-screen">
    <VideoBackground />
    <GrainOverlay />
    <Navigation />

    <main className="relative z-10 pt-24 pb-12">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Clash</h1>
          <p className="text-muted-foreground text-sm">Survive the raid — 60 seconds, kill everything</p>
        </div>

        <RaidGame onReturn={() => {}} />
      </div>
    </main>
  </div>
);

export default Clash;
