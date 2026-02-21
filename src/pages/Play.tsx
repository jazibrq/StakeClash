import { useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/shared';
import { HostLobbyModal } from '@/components/modals/HostLobbyModal';
import { MatchOverlay } from '@/components/modals/MatchOverlay';

import { Leaderboard } from '@/components/home/Leaderboard';
import {
  Plus, Users, Filter, Search,
  ChevronDown, Swords, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

// Mock data
const lobbies = [
  { id: 1, host: '0x1a2b...3c4d', stake: '0.5', size: 4, minYield: 'Low', status: 'Open', players: 2 },
  { id: 2, host: '0x5e6f...7g8h', stake: '1.0', size: 2, minYield: 'Medium', status: 'Filling', players: 1 },
  { id: 3, host: '0x9i0j...1k2l', stake: '2.5', size: 8, minYield: 'High', status: 'Open', players: 5 },
  { id: 4, host: '0x3m4n...5o6p', stake: '0.25', size: 4, minYield: 'Low', status: 'Open', players: 1 },
  { id: 5, host: '0x7q8r...9s0t', stake: '5.0', size: 16, minYield: 'High', status: 'Filling', players: 12 },
  { id: 6, host: '0x1u2v...3w4x', stake: '1.5', size: 4, minYield: 'Medium', status: 'Open', players: 3 },
];

const lobbySizes = [2, 4, 8, 16];
const sortOptions = ['Most Recent', 'Highest Stake'];

const Play = () => {
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [matchOverlayOpen, setMatchOverlayOpen] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<typeof lobbies[0] | null>(null);
  const [sizeFilter, setSizeFilter] = useState<number | null>(null);
  const [minYieldFilter, setMinYieldFilter] = useState('');
  const [sortBy, setSortBy] = useState('Most Recent');
  const [activeSection, setActiveSection] = useState<'play' | 'leaderboard'>('play');

  const handleJoinLobby = (lobby: typeof lobbies[0]) => {
    setSelectedLobby(lobby);
    setMatchOverlayOpen(true);
  };

  const filteredLobbies = lobbies.filter((lobby) => {
    if (sizeFilter && lobby.size !== sizeFilter) return false;
    return true;
  });

  return (
    <PageLayout>

      <main className="relative z-10 pt-24 pb-12">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Play</h1>
              <p className="text-muted-foreground">Join a lobby or host your own match</p>
            </div>
            <Button
              onClick={() => setHostModalOpen(true)}
              className="btn-cyan-gradient gap-2"
            >
              <Plus className="w-4 h-4" />
              Host Lobby
            </Button>
          </div>

          {/* Section Toggle */}
          <div className="flex items-center gap-2 mb-8">
            <Button
              variant={activeSection === 'play' ? 'default' : 'outline'}
              onClick={() => setActiveSection('play')}
              className={cn(
                'gap-2',
                activeSection === 'play' ? 'btn-cyan-gradient px-6 py-3 text-base' : 'px-5 py-2.5'
              )}
            >
              Play
            </Button>
            <Button
              variant={activeSection === 'leaderboard' ? 'default' : 'outline'}
              onClick={() => setActiveSection('leaderboard')}
              className={cn(
                'gap-2',
                activeSection === 'leaderboard' ? 'btn-cyan-gradient px-6 py-3 text-base' : 'px-5 py-2.5'
              )}
            >
              Leaderboard
            </Button>
          </div>

          {activeSection === 'play' ? (
            <>
              {/* Filters */}
              <div className="card-surface p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by host address..." 
                      className="pl-10"
                    />
                  </div>

                  {/* Size Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Lobby Size:</span>
                    <div className="flex gap-1 bg-surface-2 p-1 rounded-lg">
                      <button
                        onClick={() => setSizeFilter(null)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded transition-all',
                          sizeFilter === null
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        All
                      </button>
                      {lobbySizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSizeFilter(size)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded transition-all',
                            sizeFilter === size
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Min Yield Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Min Yield ($):</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={minYieldFilter}
                      onChange={(e) => setMinYieldFilter(e.target.value)}
                      className="w-24"
                    />
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2 lg:ml-auto">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          {sortBy}
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {sortOptions.map((option) => (
                          <DropdownMenuItem 
                            key={option}
                            onClick={() => setSortBy(option)}
                          >
                            {option}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Lobby List */}
              {filteredLobbies.length === 0 ? (
                <EmptyState
                  icon={<Swords className="w-8 h-8" />}
                  title="No lobbies found"
                  description="Try adjusting your filters or host your own lobby to get started."
                  action={
                    <Button 
                      onClick={() => setHostModalOpen(true)}
                      className="btn-cyan-gradient"
                    >
                      Host Lobby
                    </Button>
                  }
                />
              ) : (
                <div className="card-surface overflow-hidden">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Host</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stake</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Size</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Min Yield</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLobbies.map((lobby, index) => (
                          <tr 
                            key={lobby.id} 
                            className="lobby-row-hover border-b border-border last:border-0 group cursor-pointer"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 transition-transform duration-200 group-hover:scale-110" />
                                <span className="font-mono text-sm">{lobby.host}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-mono text-sm text-primary transition-all duration-200 group-hover:text-shadow-glow">{lobby.stake} ETH</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{lobby.players}/{lobby.size}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded transition-all duration-200',
                                lobby.minYield === 'Low' && 'bg-emerald-500/10 text-emerald-400',
                                lobby.minYield === 'Medium' && 'bg-amber-500/10 text-amber-400',
                                lobby.minYield === 'High' && 'bg-red-500/10 text-red-400'
                              )}>
                                {lobby.minYield}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                'inline-flex items-center gap-1 text-xs font-medium',
                                lobby.status === 'Open' && 'text-emerald-400',
                                lobby.status === 'Filling' && 'text-amber-400',
                                lobby.status === 'Starting' && 'text-primary'
                              )}>
                                {lobby.status === 'Filling' && <Clock className="w-3 h-3" />}
                                {lobby.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Button 
                                size="sm"
                                onClick={() => handleJoinLobby(lobby)}
                                className="btn-cyan-gradient opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                Join
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-border">
                    {filteredLobbies.map((lobby, index) => (
                      <div 
                        key={lobby.id} 
                        className="p-4 lobby-row-hover group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-accent/50" />
                            <div>
                              <p className="font-mono text-sm">{lobby.host}</p>
                              <p className="text-xs text-muted-foreground">{lobby.players}/{lobby.size} players</p>
                            </div>
                          </div>
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded',
                            lobby.status === 'Open' && 'bg-emerald-500/10 text-emerald-400',
                            lobby.status === 'Filling' && 'bg-amber-500/10 text-amber-400'
                          )}>
                            {lobby.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-mono text-primary">{lobby.stake} ETH</span>
                            <span className={cn(
                              'text-xs font-medium',
                              lobby.minYield === 'Low' && 'text-emerald-400',
                              lobby.minYield === 'Medium' && 'text-amber-400',
                              lobby.minYield === 'High' && 'text-red-400'
                            )}>
                              {lobby.minYield} yield
                            </span>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleJoinLobby(lobby)}
                            className="btn-cyan-gradient"
                          >
                            Join
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4">
              <Leaderboard />
            </div>
          )}
        </div>
      </main>



      {/* Host Lobby Modal */}
      <HostLobbyModal
        open={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
      />

      {/* Match Overlay */}
      <MatchOverlay
        open={matchOverlayOpen}
        onClose={() => setMatchOverlayOpen(false)}
        lobby={selectedLobby ? {
          stake: selectedLobby.stake,
          size: selectedLobby.size,
          status: selectedLobby.status,
          players: [
            { address: selectedLobby.host, ready: true },
            { address: '0xYour...Addr', ready: false },
          ]
        } : undefined}
      />
    </PageLayout>
  );
};

export default Play;
