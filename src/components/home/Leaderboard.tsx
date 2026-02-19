import { Trophy, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const topPlayers = [
  { rank: 1, address: '0x1a2b...3c4d', username: 'CryptoKing', totalAwards: '45.82', winRate: 78 },
  { rank: 2, address: '0x5e6f...7g8h', username: 'YieldHunter', totalAwards: '38.15', winRate: 72 },
  { rank: 3, address: '0x9i0j...1k2l', username: 'StackMaster', totalAwards: '31.47', winRate: 69 },
  { rank: 4, address: '0x3m4n...5o6p', username: 'DeFiPro', totalAwards: '28.33', winRate: 65 },
  { rank: 5, address: '0x7q8r...9s0t', username: 'VaultRunner', totalAwards: '24.91', winRate: 63 },
  { rank: 6, address: '0x1u2v...3w4x', username: 'EthWizard', totalAwards: '21.58', winRate: 61 },
  { rank: 7, address: '0x5y6z...7a8b', username: 'StakeNinja', totalAwards: '18.24', winRate: 58 },
  { rank: 8, address: '0x9c0d...1e2f', username: 'AwardSeeker', totalAwards: '15.67', winRate: 55 },
  { rank: 9, address: '0x3g4h...5i6j', username: 'GameTheory', totalAwards: '12.89', winRate: 53 },
  { rank: 10, address: '0x7k8l...9m0n', username: 'ChainPlayer', totalAwards: '10.43', winRate: 51 },
];

const PodiumCard = ({ player, position }: { player: typeof topPlayers[0]; position: 1 | 2 | 3 }) => {
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const icons = {
    1: <Trophy className="w-6 h-6" />,
    2: <Medal className="w-5 h-5" />,
    3: <Award className="w-5 h-5" />,
  };
  const colors = {
    1: 'from-amber-400 to-amber-600 text-amber-900',
    2: 'from-slate-300 to-slate-500 text-slate-900',
    3: 'from-amber-600 to-amber-800 text-amber-100',
  };

  return (
    <div className={cn('flex flex-col items-center', position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3')}>
      <div className="card-surface-elevated p-4 mb-2 text-center w-full max-w-[140px]">
        <div className={cn(
          'w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center bg-gradient-to-br',
          colors[position]
        )}>
          {icons[position]}
        </div>
        <p className="font-semibold text-sm mb-1">{player.username}</p>
        <p className="font-mono text-xs text-muted-foreground">{player.address}</p>
        <p className="font-bold text-primary">{player.totalAwards} ETH</p>
        <p className="text-xs text-muted-foreground">{player.winRate}% win</p>
      </div>
      <div className={cn(
        'w-20 rounded-t-lg bg-gradient-to-t from-surface-2 to-surface-3',
        heights[position]
      )} />
    </div>
  );
};

export const Leaderboard = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Top Players</h2>
          <p className="text-muted-foreground">The elite of SkillStack</p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-12">
          {topPlayers.slice(0, 3).map((player, i) => (
            <PodiumCard 
              key={player.rank} 
              player={player} 
              position={(i + 1) as 1 | 2 | 3} 
            />
          ))}
        </div>

        {/* Table */}
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Awards</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.slice(3).map((player) => (
                  <tr key={player.rank} className="row-hover border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">#{player.rank}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/50 to-accent/50" />
                        <span className="font-semibold text-sm">{player.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-muted-foreground">{player.address}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm text-primary">{player.totalAwards} ETH</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-muted-foreground">{player.winRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
