import { useState, useRef, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Button } from '@/components/ui/button';

import { Shield, Zap, Wind, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Animated sprite canvas ── */
const AnimatedSprite = ({
  src, frames, frameWidth, frameHeight, frameDuration = 150, size = 80,
}: {
  src: string; frames: number; frameWidth: number; frameHeight: number;
  frameDuration?: number; size?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const frameRef  = useRef(0);
  const timerRef  = useRef(0);
  const rafRef    = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const img = imgRef.current;
    if (!ctx || !img || !img.complete) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(
      img,
      frameRef.current * frameWidth, 0, frameWidth, frameHeight,
      0, 0, size, size,
    );
  }, [frameWidth, frameHeight, size]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => { imgRef.current = img; draw(); };
    imgRef.current = img;
  }, [src, draw]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      timerRef.current += dt;
      if (timerRef.current >= frameDuration) {
        timerRef.current -= frameDuration;
        frameRef.current = (frameRef.current + 1) % frames;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, frameDuration, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
};

const heroes = [
  {
    id: 1,
    name: 'Samurai Commander',
    class: 'Warrior',
    description: 'A master of the blade who leads from the front. Unmatched discipline forged through a thousand battles.',
    stats: { power: 85, defense: 78, speed: 72 },
    color: 'from-cyan-500/20 to-blue-600/10',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/30',
    abilities: ['Blade Rush', 'Fortify', 'Last Stand'],
    idleSprite: { src: '/heroes/Idle.png', frames: 6, frameWidth: 128, frameHeight: 128 },
  },
  {
    id: 2,
    name: 'Shadow Breaker',
    class: 'Rogue',
    description: 'Strikes from the darkness with lethal precision. No target escapes the shadows.',
    stats: { power: 88, defense: 42, speed: 97 },
    color: 'from-violet-500/20 to-purple-700/10',
    accent: 'text-violet-400',
    border: 'border-violet-500/30',
    abilities: ['Backstab', 'Vanish', 'Smoke Screen'],
    idleSprite: { src: '/heroes/Knight_3/Idle.png', frames: 4, frameWidth: 128, frameHeight: 128 },
  },
  {
    id: 3,
    name: 'Storm Caller',
    class: 'Mage',
    description: 'Wields the raw power of the storm. Devastates entire lobbies with arcane fury.',
    stats: { power: 98, defense: 35, speed: 62 },
    color: 'from-amber-500/20 to-orange-600/10',
    accent: 'text-amber-400',
    border: 'border-amber-500/30',
    abilities: ['Chain Lightning', 'Arcane Surge', 'Tempest'],
    idleSprite: { src: '/heroes/Lightning Mage/Idle.png', frames: 7, frameWidth: 128, frameHeight: 128 },
  },
  {
    id: 4,
    name: 'Gold Keeper',
    class: 'Strategist',
    description: 'Controls the economy of war. Outmaneuvers opponents through superior planning.',
    stats: { power: 55, defense: 68, speed: 58 },
    color: 'from-emerald-500/20 to-teal-600/10',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/30',
    abilities: ['Market Control', 'Yield Harvest', 'Grand Scheme'],
    idleSprite: { src: '/heroes/Minotaur_1/Idle.png', frames: 10, frameWidth: 128, frameHeight: 128 },
  },
  {
    id: 5,
    name: 'Void Hunter',
    class: 'Ranger',
    description: 'Patrols the edge of reality. A relentless tracker with unmatched ranged precision.',
    stats: { power: 80, defense: 54, speed: 83 },
    color: 'from-red-500/20 to-rose-700/10',
    accent: 'text-red-400',
    border: 'border-red-500/30',
    abilities: ["Void Arrow", "Mark Target", "Hunter's Instinct"],
    idleSprite: { src: '/heroes/Ninja_Peasant/Idle.png', frames: 6, frameWidth: 96, frameHeight: 96 },
  },
  {
    id: 6,
    name: 'Steel Forge',
    class: 'Engineer',
    description: 'Builds unstoppable war machines. Turns the tide of battle through superior technology.',
    stats: { power: 65, defense: 88, speed: 40 },
    color: 'from-slate-500/20 to-gray-700/10',
    accent: 'text-slate-300',
    border: 'border-slate-500/30',
    abilities: ['Deploy Turret', 'Iron Armor', 'Overclock'],
    idleSprite: { src: '/heroes/Wanderer Magican/Idle.png', frames: 8, frameWidth: 128, frameHeight: 128 },
  },
];

const statIcons: Record<string, React.ReactNode> = {
  power: <Swords className="w-3 h-3" />,
  defense: <Shield className="w-3 h-3" />,
  speed: <Wind className="w-3 h-3" />,
};

const StatBar = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {statIcons[label]}
        <span className="capitalize">{label}</span>
      </div>
      <span className={cn('text-xs font-mono font-medium', accent)}>{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, hsl(185 100% 50% / 0.5), hsl(185 100% 50%))`,
        }}
      />
    </div>
  </div>
);

const Hero = () => {
  const [selectedHero, setSelectedHero] = useState(heroes[0]);

  return (
    <div className="min-h-screen">
      <VideoBackground />
      <GrainOverlay />
      <Navigation />

      <main className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto max-w-7xl px-4">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-2">Hero</h1>
            <p className="text-muted-foreground">Choose your champion and enter the clash</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">

            {/* Hero Grid */}
            <div className="lg:col-span-2">
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {heroes.map((hero) => (
                  <button
                    key={hero.id}
                    onClick={() => setSelectedHero(hero)}
                    className={cn(
                      'relative text-left rounded-xl border p-5 transition-all duration-200 group',
                      'bg-gradient-to-br',
                      hero.color,
                      selectedHero.id === hero.id
                        ? cn(hero.border, 'shadow-lg scale-[1.02]')
                        : 'border-border/40 hover:border-border hover:scale-[1.01]'
                    )}
                  >
                    {/* Selected ring */}
                    {selectedHero.id === hero.id && (
                      <div
                        className="absolute inset-0 rounded-xl ring-1 ring-inset pointer-events-none"
                        style={{ ringColor: 'hsl(185 100% 50% / 0.3)' }}
                      />
                    )}

                    {/* Hero sprite / placeholder */}
                    <div className="w-full h-44 mb-3 flex items-center justify-center">
                      {hero.idleSprite ? (
                        <AnimatedSprite
                          src={hero.idleSprite.src}
                          frames={hero.idleSprite.frames}
                          frameWidth={hero.idleSprite.frameWidth}
                          frameHeight={hero.idleSprite.frameHeight}
                          size={170}
                        />
                      ) : (
                        <Shield
                          className={cn('w-12 h-12 opacity-20 group-hover:opacity-30 transition-opacity', hero.accent)}
                        />
                      )}
                    </div>

                    <h3 className="font-semibold text-sm mb-0.5">{hero.name}</h3>
                    <p className={cn('text-xs font-medium mb-3', hero.accent)}>{hero.class}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Hero Detail Panel */}
            <div className="space-y-4">
              <div className={cn('card-surface-elevated p-6 rounded-xl border', selectedHero.border)}>
                {/* Header */}
                <div className="mb-2">
                  <h2 className="text-xl font-bold">{selectedHero.name}</h2>
                  <p className={cn('text-sm font-medium', selectedHero.accent)}>{selectedHero.class}</p>
                </div>

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {selectedHero.description}
                </p>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stats</p>
                  {Object.entries(selectedHero.stats).map(([key, val]) => (
                    <StatBar key={key} label={key} value={val} accent={selectedHero.accent} />
                  ))}
                </div>

                {/* Abilities */}
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Abilities</p>
                  <div className="space-y-2">
                    {selectedHero.abilities.map((ability, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Zap className={cn('w-3.5 h-3.5', selectedHero.accent)} />
                        <span>{ability}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button className="w-full btn-cyan-gradient gap-2">
                  <Swords className="w-4 h-4" />
                  Enter Clash as {selectedHero.name}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
};

export default Hero;
