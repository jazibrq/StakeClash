import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent, ModalHeader } from '@/components/ui/modal';
import { Users, Clock, Swords, LogOut, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Player {
  address: string;
  ready: boolean;
}

interface MatchOverlayProps {
  open: boolean;
  onClose: () => void;
  lobby?: {
    stake: string;
    size: number;
    status: string;
    players: Player[];
  };
}

export const MatchOverlay = ({ open, onClose, lobby }: MatchOverlayProps) => {
  const [isReady, setIsReady] = useState(false);

  if (!lobby) return null;

  const emptySlots = lobby.size - lobby.players.length;

  return (
    <Modal open={open} onClose={onClose} fullscreen>
      <div className="w-full h-full bg-background/95 backdrop-blur-xl flex flex-col">
        {/* Aurora effect for overlay */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% 20%, rgba(0, 206, 209, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 80% 70%, rgba(100, 200, 220, 0.2) 0%, transparent 50%)
            `,
          }}
        />

        {/* Header */}
        <div className="relative border-b border-border p-4 sm:p-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-1">Match Lobby</h1>
              <p className="text-muted-foreground text-sm">Waiting for players...</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Swords className="w-4 h-4 text-primary" />
                <span className="font-mono text-primary">{lobby.stake} ETH</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{lobby.players.length}/{lobby.size}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono">02:45</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative flex-1 container mx-auto p-4 sm:p-6 grid lg:grid-cols-3 gap-6 overflow-auto">
          {/* Player List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Players</h2>
            <div className="space-y-2">
              {lobby.players.map((player, i) => (
                <div
                  key={i}
                  className={cn(
                    'card-surface p-4 flex items-center justify-between',
                    player.ready && 'border-emerald-500/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                    <span className="font-mono text-sm">{player.address}</span>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded',
                    player.ready 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {player.ready ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="card-surface p-4 flex items-center justify-center border-dashed"
                >
                  <span className="text-sm text-muted-foreground">Empty Slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Frame */}
          <div className="lg:col-span-2">
            <div className="card-surface-elevated h-full min-h-[300px] flex flex-col items-center justify-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                <Gamepad2 className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Game Loading Zone</h3>
              <p className="text-sm text-muted-foreground/60 text-center max-w-md">
                The competitive game will load here once all players are ready. 
                Stay focused and prepare for battle.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="relative border-t border-border p-4 sm:p-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="btn-outline-glow gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave Match
            </Button>
            <Button
              onClick={() => setIsReady(!isReady)}
              className={cn(
                'gap-2',
                isReady ? 'bg-emerald-600 hover:bg-emerald-700' : 'btn-cyan-gradient'
              )}
            >
              {isReady ? 'Ready!' : 'Mark Ready'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
