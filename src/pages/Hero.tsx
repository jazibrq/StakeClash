import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Button } from '@/components/ui/button';
import { PartnersBanner } from '@/components/home/PartnersBanner';
import { Footer } from '@/components/layout/Footer';
import { Shield, Zap, Wind, Brain, Star, Trophy, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

const heroes = [
  {
    id: 1,
    name: 'Iron Vanguard',
    class: 'Warrior',
    tier: 'S',
    description: 'An indomitable force on the battlefield. Commands the front line with unbreakable resolve.',
    stats: { power: 72, defense: 95, speed: 48, strategy: 61 },
    wins: 142,
    losses: 31,
    color: 'from-cyan-500/20 to-blue-600/10',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/30',
    abilities: ['Shield Bash', 'Fortify', 'Last Stand'],
  },
  {
    id: 2,
    name: 'Shadow Breaker',
    class: 'Rogue',
    tier: 'A',
    description: 'Strikes from the darkness with lethal precision. No target escapes the shadows.',
    stats: { power: 88, defense: 42, speed: 97, strategy: 74 },
    wins: 98,
    losses: 44,
    color: 'from-violet-500/20 to-purple-700/10',
    accent: 'text-violet-400',
    border: 'border-violet-500/30',
    abilities: ['Backstab', 'Vanish', 'Smoke Screen'],
  },
  {
    id: 3,
    name: 'Storm Caller',
    class: 'Mage',
    tier: 'S',
    description: 'Wields the raw power of the storm. Devastates entire lobbies with arcane fury.',
    stats: { power: 98, defense: 35, speed: 62, strategy: 88 },
    wins: 201,
    losses: 58,
    color: 'from-amber-500/20 to-orange-600/10',
    accent: 'text-amber-400',
    border: 'border-amber-500/30',
    abilities: ['Chain Lightning', 'Arcane Surge', 'Tempest'],
  },
  {
    id: 4,
    name: 'Gold Keeper',
    class: 'Strategist',
    tier: 'A',
    description: 'Controls the economy of war. Outmaneuvers opponents through superior planning.',
    stats: { power: 55, defense: 68, speed: 58, strategy: 99 },
    wins: 167,
    losses: 40,
    color: 'from-emerald-500/20 to-teal-600/10',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/30',
    abilities: ['Market Control', 'Yield Harvest', 'Grand Scheme'],
  },
  {
    id: 5,
    name: 'Void Hunter',
    class: 'Ranger',
    tier: 'B',
    description: 'Patrols the edge of reality. A relentless tracker with unmatched ranged precision.',
    stats: { power: 80, defense: 54, speed: 83, strategy: 66 },
    wins: 74,
    losses: 52,
    color: 'from-red-500/20 to-rose-700/10',
    accent: 'text-red-400',
    border: 'border-red-500/30',
    abilities: ["Void Arrow", "Mark Target", "Hunter's Instinct"],
  },
  {
    id: 6,
    name: 'Steel Forge',
    class: 'Engineer',
    tier: 'B',
    description: 'Builds unstoppable war machines. Turns the tide of battle through superior technology.',
    stats: { power: 65, defense: 88, speed: 40, strategy: 82 },
    wins: 55,
    losses: 38,
    color: 'from-slate-500/20 to-gray-700/10',
    accent: 'text-slate-300',
    border: 'border-slate-500/30',
    abilities: ['Deploy Turret', 'Iron Armor', 'Overclock'],
  },
];

const tierColor: Record<string, string> = {
  S: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  A: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  B: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
};

const statIcons: Record<string, React.ReactNode> = {
  power: <Swords className="w-3 h-3" />,
  defense: <Shield className="w-3 h-3" />,
  speed: <Wind className="w-3 h-3" />,
  strategy: <Brain className="w-3 h-3" />,
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

                    {/* Tier badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest',
                        tierColor[hero.tier]
                      )}>
                        Tier {hero.tier}
                      </span>
                      {selectedHero.id === hero.id && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                    </div>

                    {/* Hero silhouette placeholder */}
                    <div className="w-full h-20 mb-3 flex items-center justify-center">
                      <Shield
                        className={cn('w-12 h-12 opacity-20 group-hover:opacity-30 transition-opacity', hero.accent)}
                      />
                    </div>

                    <h3 className="font-semibold text-sm mb-0.5">{hero.name}</h3>
                    <p className={cn('text-xs font-medium mb-3', hero.accent)}>{hero.class}</p>

                    {/* Mini stats */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {Object.entries(hero.stats).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground capitalize">{key.slice(0, 3)}</span>
                          <span className={cn('text-[10px] font-mono', hero.accent)}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Hero Detail Panel */}
            <div className="space-y-4">
              <div className={cn('card-surface-elevated p-6 rounded-xl border', selectedHero.border)}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-bold">{selectedHero.name}</h2>
                    <p className={cn('text-sm font-medium', selectedHero.accent)}>{selectedHero.class}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-bold px-2.5 py-1 rounded border',
                    tierColor[selectedHero.tier]
                  )}>
                    {selectedHero.tier}
                  </span>
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

                {/* Win/Loss Record */}
                <div className="flex gap-4 mb-6 p-3 rounded-lg bg-surface-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Wins</p>
                      <p className="text-sm font-mono font-semibold text-emerald-400">{selectedHero.wins}</p>
                    </div>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Losses</p>
                      <p className="text-sm font-mono font-semibold text-red-400">{selectedHero.losses}</p>
                    </div>
                  </div>
                  <div className="w-px bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className={cn('text-sm font-mono font-semibold', selectedHero.accent)}>
                      {Math.round((selectedHero.wins / (selectedHero.wins + selectedHero.losses)) * 100)}%
                    </p>
                  </div>
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

      {/* Partners Banner */}
      <PartnersBanner className="mt-20 relative z-10" />

      {/* Footer */}
      <Footer className="relative z-10" />
    </div>
  );
};

export default Hero;
